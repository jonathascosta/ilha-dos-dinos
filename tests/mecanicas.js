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
  const tap = async (i, ms=450) => { await p.evaluate(i => __btn(i, true), i); await p.waitForTimeout(ms); await p.evaluate(i => __btn(i, false), i); await p.waitForTimeout(350); };
  const P = () => p.evaluate(() => ({ x: G.player.x, y: G.player.y, z: G.player.z, yaw: G.player.yaw, pitch: G.player.pitch, fly: G.player.fly, sel: G.player.sel, ground: G.player.onGround, mount: G.player.mount && G.player.mount.kind, state: G.state }));

  console.log('fps probe', await p.evaluate(() => new Promise(r => { let n = 0; const t0 = performance.now(); function f() { n++; if (performance.now() - t0 > 2000) r(n / 2); else requestAnimationFrame(f); } requestAnimationFrame(f); })));
  await p.evaluate(() => { window.__standBy = (c, dist) => { const P = G.player; c.state = c.sp.flies ? 'perch' : 'idle'; c.timer = 99; P.fly = false; P.vx = P.vy = P.vz = 0;
    for (let k = 0; k < 16; k++) { const a = k * Math.PI / 8, x = c.x + Math.sin(a) * dist, z = c.z + Math.cos(a) * dist, y = G.groundY(Math.floor(x), Math.floor(z)) + 1.01;
      if (Math.abs(y - c.y) < 1.2 && !G.collides(x, y, z, 0.3, 1.7) && !G.isWater(Math.floor(x), Math.floor(y), Math.floor(z))) { P.x = x; P.y = y; P.z = z; P.yaw = Math.atan2(-(c.x - x), -(c.z - z)); P.pitch = 0; return true; } }
    return false; }; });
  // start with gamepad A
  await tap(0);
  let s = await P();
  assert(s.state === 'play', 'A no comando inicia o jogo');

  // left stick forward
  const p0 = await P();
  await p.evaluate(() => { __pad.axes[1] = -1; });
  await p.waitForTimeout(1000);
  await p.evaluate(() => { __pad.axes[1] = 0; });
  const p1 = await P();
  const moved = Math.hypot(p1.x - p0.x, p1.z - p0.z);
  assert(moved > 1.5, 'manípulo esquerdo anda (' + moved.toFixed(2) + ' blocos)');
  // right stick look
  await p.evaluate(() => { __pad.axes[2] = 1; });
  await p.waitForTimeout(500);
  await p.evaluate(() => { __pad.axes[2] = 0; });
  const p2 = await P();
  assert(Math.abs(p2.yaw - p1.yaw) > 0.5, 'manípulo direito roda a vista');

  // go to an open spot, look down, place and break
  await p.evaluate(() => { const P = G.player; P.x = 60.5; P.z = 68.5; P.y = G.groundY(60, 68) + 1.01; P.yaw = 0; P.pitch = -0.9; P.vx = P.vz = 0; });
  await p.waitForTimeout(300);
  const before = await p.evaluate(() => Object.keys(G.mods).length);
  await tap(7); // RT place
  const afterPlace = await p.evaluate(() => Object.keys(G.mods).length);
  assert(afterPlace >= before + 1, 'RT põe blocos (' + (afterPlace - before) + ' com o gatilho mantido)');
  await p.screenshot({ path: 'placed.png' });
  await tap(6); // LT dig
  const tgt = await p.evaluate(() => { const k = Object.keys(G.mods); return k.map(i => G.mods[i]); });
  assert(tgt.includes(0) || tgt.length === afterPlace, 'LT tira um bloco: ' + JSON.stringify(tgt));
  // cycle block
  const sel0 = (await P()).sel;
  await tap(5);
  assert((await P()).sel === sel0 + 1, 'RB escolhe o bloco seguinte');
  await tap(4); await tap(4);
  assert((await P()).sel === (sel0 + (await p.evaluate(() => G.HOTBAR.length)) - 1) % (await p.evaluate(() => G.HOTBAR.length)), 'LB escolhe o bloco anterior');
  // hold RT builds repeatedly while looking around
  // fly
  await tap(3);
  assert((await P()).fly === true, 'Y liga o voo');
  const y0 = (await P()).y;
  await p.evaluate(() => __btn(0, true)); await p.waitForTimeout(700); await p.evaluate(() => __btn(0, false));
  assert((await P()).y > y0 + 2, 'A sobe em voo');
  await p.evaluate(() => __btn(1, true)); await p.waitForTimeout(2500); await p.evaluate(() => __btn(1, false));
  s = await P();
  assert(s.fly === false, 'B desce e pousa (voo desliga ao tocar no chão)');

  // jump
  await p.waitForTimeout(400);
  const yj = (await P()).y;
  await p.evaluate(() => __btn(0, true)); await p.waitForTimeout(250); const ymid = (await P()).y; await p.evaluate(() => __btn(0, false));
  assert(ymid > yj + 0.5, 'A salta');
  await p.waitForTimeout(800);

  // mount a triceratops
  console.log('spot tricera', await p.evaluate(() => __standBy(G.creatures.find(c => c.kind === 'tricera'), 2.2)));
  await p.waitForTimeout(400);
  await p.screenshot({ path: 'dino.png' });
  await tap(2);
  s = await P();
  assert(s.mount === 'tricera', 'X monta o tricerátopo');
  await p.evaluate(() => { __pad.axes[1] = -1; });
  await p.waitForTimeout(1500);
  await p.evaluate(() => { __pad.axes[1] = 0; });
  await p.screenshot({ path: 'riding.png' });
  const s2 = await P();
  assert(Math.hypot(s2.x - s.x, s2.z - s.z) > 2, 'montado, anda com o dinossauro');
  await tap(2);
  assert((await P()).mount === null, 'X desmonta');

  // ptero
  console.log('spot ptero', await p.evaluate(() => { const c = G.creatures.find(c => c.kind === 'ptero' && c.state === 'perch') || G.creatures.find(c => c.kind === 'ptero'); const sp = G.missions.landSpot(64, 64, 6, 30, {}); c.x = sp.x + 0.5; c.z = sp.z + 0.5; c.y = sp.y + 0.05; c.target = null; c.vy = 0; return __standBy(c, 1.7); }));
  await p.waitForTimeout(300);
  await tap(2);
  s = await P();
  assert(s.mount === 'ptero' && s.fly, 'monta o pterossauro e voa');
  await p.evaluate(() => { __btn(0, true); __pad.axes[1] = -1; }); await p.waitForTimeout(1500); await p.evaluate(() => { __btn(0, false); __pad.axes[1] = 0; });
  await p.screenshot({ path: 'ptero.png' });
  await tap(2);
  await p.waitForTimeout(2500);

  // pause menu
  await tap(9);
  assert((await P()).state === 'pause', '☰ abre o menu');
  await p.waitForTimeout(400);
  await p.screenshot({ path: 'pause.png' });
  await tap(15); // right -> home
  await tap(0);
  s = await P();
  assert(s.state === 'play' && Math.abs(s.x - 61.5) < 0.5, 'menu: casa leva de volta à cabana');

  // save + reload
  await p.evaluate(() => G.save());
  const saved = await p.evaluate(() => ({ mods: Object.keys(G.mods).length, level: G.level, seed: G.seed }));
  await p.reload();
  await p.waitForTimeout(1500);
  const re = await p.evaluate(() => ({ mods: Object.keys(G.mods).length, level: G.level, seed: G.seed }));
  assert(re.mods === saved.mods && re.level === saved.level && re.seed === saved.seed, 'gravação automática sobrevive a recarregar: ' + JSON.stringify(re));

  // keyboard
  await p.click('#play', { force: true });
  await p.waitForTimeout(300);
  const k0 = await P();
  await p.keyboard.down('KeyW'); await p.waitForTimeout(700); await p.keyboard.up('KeyW');
  const k1 = await P();
  assert(Math.hypot(k1.x - k0.x, k1.z - k0.z) > 1, 'teclado: W anda');

  // new island (hold A)
  await p.keyboard.press('KeyP');
  await p.waitForTimeout(500);
  await tap(14); // left wraps to "new"
  await p.evaluate(() => __btn(0, true)); await p.waitForTimeout(2300); await p.evaluate(() => __btn(0, false));
  const ni = await p.evaluate(() => ({ seed: G.seed, mods: Object.keys(G.mods).length, level: G.level, state: G.state }));
  assert(ni.seed !== saved.seed && ni.mods === 0 && ni.level === saved.level && ni.state === 'play', 'ilha nova (manter A) cria um mundo novo');
  await p.waitForTimeout(600);
  await p.screenshot({ path: 'newisland.png' });

  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'no console errors');
  if (errs.length) process.exitCode = 1;
  await b.close();
})();
