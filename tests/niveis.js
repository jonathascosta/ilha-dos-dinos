// corre 120 níveis: gera cada missão, conclui-a "à mão" pelas regras do jogo e mede o estado
const { chromium } = require('playwright');
const assert = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 480, height: 270 } });
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message + '\n' + e.stack));
  await p.goto('http://localhost:8123/');
  await p.waitForTimeout(1000);
  await p.click('#play', { force: true });
  await p.waitForTimeout(300);
  const res = await p.evaluate(async () => {
    const M = G.missions, P = G.player, log = [], types = {}, templates = {}, unlocks = [];
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    let maxCreatures = 0, maxCalls = 0, problems = [], exactRefused = null, fallbackStars = 0;
    for (let n = 0; n < 120; n++) {
      const level = M.level, c = M.cur;
      if (!c) { problems.push('sem missão no nível ' + level); break; }
      types[c.type] = (types[c.type] || 0) + 1;
      if (c.total < 1 || c.total > 60) problems.push('total estranho ' + c.total + ' no nível ' + level);
      // de vez em quando anda para outro sítio da ilha, como uma criança faria
      if (n % 3 === 0) { const s = M.landSpot(64, 64, 5, 45, {}); if (s) { P.x = s.x + 0.5; P.z = s.z + 0.5; P.y = s.y + 0.1; } }
      if (c.type === 'stars') {
        for (const it of c.items) { if (it.y > G.H + 16 || it.y < G.SEA) problems.push('estrela fora de sítio y=' + it.y); P.fly = true; for (let w = 0; w < 40 && !it.got; w++) { P.x = it.x; P.z = it.z; P.y = it.y - 0.8; await sleep(35); } }
      } else if (c.type === 'eggs') {
        for (const it of c.items) { P.fly = false; P.x = it.egg.x + 1; P.z = it.egg.z; P.y = it.egg.y + 0.2; G.unstick(P); it.egg.wobble = 1.4; for (let w = 0; w < 40 && !it.egg.dead; w++) await sleep(35); }
      } else if (c.type === 'build') {
        templates[c.template] = (templates[c.template] || 0) + 1;
        P.fly = true; P.x = c.cx + 6; P.z = c.cz + 6; P.y = c.cy + 4;
        if (c.exact && exactRefused === null) {
          const q = c.cells[0], wrong = G.HOTBAR.findIndex(id => id !== q.id);
          P.sel = wrong; exactRefused = !G.placeAt(q.x, q.y, q.z) && G.blocks[G.idx(q.x, q.y, q.z)] === 0;
        }
        for (const q of c.cells) { P.sel = G.HOTBAR.indexOf(q.id); if (P.sel < 0) problems.push('molde pede bloco bloqueado ' + q.id + ' no nível ' + level); else G.placeAt(q.x, q.y, q.z); }
        await sleep(80);
      } else if (c.type === 'baby') {
        for (const it of c.items) { P.fly = true; for (let w = 0; w < 40 && !it.found; w++) { P.x = it.baby.x; P.z = it.baby.z; P.y = it.baby.y + 0.6; await sleep(40); } if (!it.found) problems.push('bebé não registado no nível ' + level); }
        for (let w = 0; w < 60 && c.items.some(it => !it.home); w++) { P.x = c.mum.x + 1.5; P.z = c.mum.z; P.y = c.mum.y + 0.5; await sleep(40); }
      }
      // espera a festa e o prémio (acelerados)
      for (let w = 0; w < 80 && (M.level === level || M.phase !== 'play'); w++) { if (M.phase !== 'play') M.timer = Math.min(M.timer, 0.05); await sleep(40); }
      if (M.level === level) { problems.push('nível ' + level + ' (' + c.type + ') não concluiu: ' + c.done + '/' + c.total); M.cur.done = M.cur.total; break; }
      const u = M.unlockFor(M.level - 1); if (u) unlocks.push((M.level - 1) + ':' + (u.blocks ? u.blocks.length + ' blocos' : u.dino + (u.tint ? '#' + u.tint : '')));
      maxCreatures = Math.max(maxCreatures, G.creatures.length);
      maxCalls = Math.max(maxCalls, G.renderer.info.render.calls);
    }
    return { level: M.level, types, templates, unlocks, maxCreatures, maxCalls, problems, exactRefused, hotbar: G.HOTBAR.length, babies: G.babies.length, family: G.creatures.filter(c => c.family).length, kinds: [...new Set(G.creatures.map(c => c.kind + (c.tint ? '#' + c.tint : '')))].join(' ') };
  });
  console.log(JSON.stringify(res, null, 1));
  assert(res.level === 121 && res.problems.length === 0, '120 níveis seguidos sem problemas');
  assert(res.exactRefused === true, 'a partir do nível 8 um bloco da cor errada é recusado no molde');
  assert(res.hotbar === 22, 'todos os 22 blocos desbloqueados');
  // gravação e recarga a nível alto
  await p.evaluate(() => G.save());
  await p.reload(); await p.waitForTimeout(1500);
  const re = await p.evaluate(() => ({ level: G.level, creatures: G.creatures.length, hotbar: G.HOTBAR.length, type: G.missions.cur.type, calls: G.renderer.info.render.calls }));
  assert(re.level === 121 && re.hotbar === 22, 'recarregar no nível 121: ' + JSON.stringify(re));
  console.log(errs.length ? 'ERRORS:\n' + errs.slice(0, 6).join('\n') : 'no console errors');
  if (errs.length) process.exitCode = 1;
  await b.close();
})();
