const { chromium } = require('playwright');
const assert = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: 800, height: 450 } });
  await ctx.addInitScript(() => {
    window.__pad = { axes: [0,0,0,0], buttons: Array.from({length:17}, () => ({pressed:false, value:0})), mapping:'standard', connected:true, id:'fake' };
    navigator.getGamepads = () => [window.__pad];
    window.__btn = (i, on) => { window.__pad.buttons[i] = { pressed: !!on, value: on ? 1 : 0 }; };
  });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message + '\n' + e.stack));
  await p.goto('http://localhost:8123/');
  await p.waitForTimeout(1500);
  const tap = async (i, ms = 450) => { await p.evaluate(i => __btn(i, true), i); await p.waitForTimeout(ms); await p.evaluate(i => __btn(i, false), i); await p.waitForTimeout(350); };
  const S = () => p.evaluate(() => { const c = G.missions.cur; return { level: G.level, mlevel: G.missions.level, type: c && c.type, done: c && c.done, total: c && c.total, phase: G.missions.phase, state: G.state, hotbar: G.HOTBAR.length, creatures: G.creatures.length, babies: G.babies.length }; });
  const waitLevel = async (n) => { for (let i = 0; i < 60; i++) { const s = await S(); if (s.mlevel >= n && s.phase === 'play') return s; await p.waitForTimeout(250); } return await S(); };
  await tap(0);
  let s = await S();
  assert(s.state === 'play' && s.level === 1 && s.type === 'stars' && s.total === 3, 'nível 1 começa com 3 estrelas: ' + JSON.stringify(s));
  await p.waitForTimeout(400);
  await p.screenshot({ path: 'ms_1stars.png' });

  // ---- estrelas: ir a cada uma ----
  for (let i = 0; i < 3; i++) {
    await p.evaluate(() => { const it = G.missions.cur.items.find(i => !i.got); const P = G.player; P.fly = true; P.x = it.x; P.z = it.z; P.y = it.y - 0.8; P.vx = P.vy = P.vz = 0; });
    await p.waitForTimeout(350);
  }
  await p.waitForTimeout(600);
  await p.screenshot({ path: 'ms_levelup.png' });
  s = await waitLevel(2);
  assert(s.level === 2 && s.type === 'eggs', 'apanhar as estrelas sobe para o nível 2 (ovos): ' + JSON.stringify(s));

  // ---- ovos ----
  await p.evaluate(() => { G.player.fly = false; });
  for (let i = 0; i < s.total; i++) {
    await p.evaluate(() => { const it = G.missions.cur.items.find(i => !i.egg.dead); const P = G.player; P.x = it.egg.x + 1.2; P.z = it.egg.z; P.y = it.egg.y + 0.3; P.vx = P.vy = P.vz = 0; G.unstick(P); });
    await p.waitForTimeout(i === 0 ? 700 : 100);
    if (i === 0) await p.screenshot({ path: 'ms_2egg.png' });
    await p.waitForTimeout(2600);
  }
  s = await waitLevel(3);
  assert(s.level === 3 && s.type === 'build' && s.babies === 2, 'chocar os ovos sobe para o nível 3 (construir) e os bebés seguem: ' + JSON.stringify(s));

  // ---- construir: uma célula a apontar com o comando, o resto pela regra do jogo ----
  const aim = await p.evaluate(() => {
    const c = G.missions.cur, P = G.player; P.fly = true;
    const q = c.cells.slice().sort((a, b) => a.y - b.y)[0];
    // fica a 3 blocos, do lado livre, a olhar para o centro da célula
    for (const [ox, oz] of [[3, 0], [-3, 0], [0, 3], [0, -3]]) {
      const x = q.x + 0.5 + ox, z = q.z + 0.5 + oz, y = q.y + 0.2;
      if (G.collides(x, y, z, 0.3, 1.7)) continue;
      P.x = x; P.y = y; P.z = z; P.vx = P.vy = P.vz = 0;
      const dx = q.x + 0.5 - x, dy = q.y + 0.5 - (y + 1.55), dz = q.z + 0.5 - z, d = Math.hypot(dx, dz);
      P.yaw = Math.atan2(-dx, -dz); P.pitch = Math.atan2(dy, d);
      return { cells: c.total, template: c.template, exact: c.exact };
    }
    return null;
  });
  await p.waitForTimeout(500);
  await p.screenshot({ path: 'ms_3build.png' });
  await p.evaluate(() => { const i = G.HOTBAR.indexOf(G.B.STONE); G.player.sel = i; }); // bloco "errado": no nível 3 fica da cor certa na mesma
  await tap(7, 200);
  s = await S();
  assert(s.done >= 1, 'RT a apontar para o bloco fantasma preenche-o (' + s.done + '/' + s.total + ', molde ' + (aim && aim.template) + ')');
  const colorOk = await p.evaluate(() => G.missions.cur.cells.filter(q => q.done).every(q => G.blocks[G.idx(q.x, q.y, q.z)] === q.id));
  assert(colorOk, 'nos primeiros níveis o bloco fica da cor do molde');
  await p.evaluate(() => { G.player.x += 4; G.missions.cur.cells.forEach(q => { if (!q.done) G.placeAt(q.x, q.y, q.z); }); });
  await p.waitForTimeout(500);
  await p.screenshot({ path: 'ms_3built.png' });
  s = await waitLevel(4);
  assert(s.level === 4 && s.type === 'baby' && s.total === 2, 'acabar o molde sobe para o nível 4 (bebé perdido): ' + JSON.stringify(s));

  // ---- bebé perdido ----
  await p.evaluate(() => { const it = G.missions.cur.items[0], P = G.player; P.fly = false; P.x = it.baby.x + 5; P.z = it.baby.z; P.y = it.baby.y + 0.5; G.unstick(P); P.yaw = Math.PI / 2; P.pitch = 0; });
  await p.waitForTimeout(600);
  await p.screenshot({ path: 'ms_4baby.png' });
  await p.evaluate(() => { const it = G.missions.cur.items[0], P = G.player; P.x = it.baby.x + 1.5; P.z = it.baby.z; P.y = it.baby.y + 0.5; G.unstick(P); });
  await p.waitForTimeout(700);
  s = await S();
  assert(s.done === 1, 'chegar ao bebé conta como encontrado (1/2)');
  const follow = await p.evaluate(() => { const b = G.missions.cur.items[0].baby; return { lead: b.lead, target: b.followTarget === G.player }; });
  assert(follow.lead && follow.target, 'o bebé passa a seguir a criança');
  // andar para longe: o bebé reaparece ao pé
  await p.evaluate(() => { const m = G.missions.cur.mum, P = G.player; P.fly = true; P.x = m.x + 9; P.z = m.z; P.y = m.y + 3; });
  await p.waitForTimeout(1200);
  const dist = await p.evaluate(() => { const b = G.missions.cur.items[0].baby, P = G.player; return Math.hypot(b.x - P.x, b.z - P.z); });
  assert(dist < 23, 'o bebé não fica para trás (a ' + dist.toFixed(1) + ' blocos)');
  await p.evaluate(() => { const m = G.missions.cur.mum, P = G.player; P.x = m.x + 2; P.z = m.z; P.y = m.y + 1; });
  await p.waitForTimeout(600);
  await p.screenshot({ path: 'ms_4mum.png' });
  s = await waitLevel(5);
  assert(s.level === 5, 'entregar o bebé à mãe sobe para o nível 5: ' + JSON.stringify(s));
  const fam = await p.evaluate(() => G.creatures.filter(c => c.family).length);
  assert(fam === 1, 'o bebé fica com a mãe');

  // ---- saltar missão ----
  const before = await S();
  await tap(9);
  await p.waitForTimeout(400);
  await p.screenshot({ path: 'ms_pause.png' });
  await tap(15); await tap(15); await tap(15); // continuar -> casa -> som -> saltar
  await tap(0);
  s = await S();
  assert(s.state === 'play' && s.level === before.level && s.type !== before.type, 'saltar troca a missão sem mudar o nível: ' + before.type + ' -> ' + s.type);

  // ---- desbloqueio ao concluir o nível 5 ----
  await p.evaluate(() => { const c = G.missions.cur; c.done = c.total; if (c.type === 'stars') c.items.forEach(i => { if (!i.got) { i.got = true; G.scene.remove(i.mesh); } }); G.ui.setMission(G.missions.level, c); });
  await p.evaluate(() => { const M = G.missions; M.cur.finished = true; M.phase = 'cheer'; M.timer = 0.3; });
  await p.waitForTimeout(1500);
  await p.screenshot({ path: 'ms_unlock.png' });
  s = await waitLevel(6);
  assert(s.level === 6 && s.hotbar === 17, 'ao concluir o nível 5 ganham-se 4 blocos novos (barra com ' + s.hotbar + ')');

  // ---- gravação ----
  await p.evaluate(() => G.save());
  await p.reload();
  await p.waitForTimeout(1500);
  s = await S();
  assert(s.level === 6 && s.hotbar === 17 && s.babies === 2, 'o nível, os blocos e os bebés ficam gravados: ' + JSON.stringify(s));

  // ---- ilha nova mantém o nível ----
  await tap(0);
  await p.evaluate(() => G.onMenu('new'));
  await p.waitForTimeout(600);
  s = await S();
  assert(s.level === 6 && s.babies === 2 && s.type, 'ilha nova mantém o nível e os bebés: ' + JSON.stringify(s));

  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'no console errors');
  if (errs.length) process.exitCode = 1;
  await b.close();
})();
