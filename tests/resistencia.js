const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: 480, height: 270 } });
  await ctx.addInitScript(() => {
    window.__pad = { axes: [0,0,0,0], buttons: Array.from({length:17}, () => ({pressed:false, value:0})), mapping:'standard', connected:true, id:'fake' };
    navigator.getGamepads = () => [window.__pad];
  });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message + '\n' + e.stack));
  await p.goto('http://localhost:8123/');
  await p.waitForTimeout(1000);
  // criança a carregar em tudo: botões e manípulos aleatórios, com passo de simulação acelerado
  const res = await p.evaluate(async () => {
    let seed = 12345; const r = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
    const stats = { frames: 0, mounts: 0, pauses: 0, maxMods: 0, bad: 0, skips: 0 };
    const t0 = performance.now();
    while (performance.now() - t0 < 45000) {
      for (let i = 0; i < 4; i++) __pad.axes[i] = r() < 0.2 ? 0 : (r() * 2 - 1);
      for (let i = 0; i < 17; i++) { const on = r() < (i === 9 || i === 8 ? 0.03 : 0.22); __pad.buttons[i] = { pressed: on, value: on ? 1 : 0 }; }
      // de vez em quando teleporta para junto de uma criatura ou ovo
      if (r() < 0.05 && G.state === 'play' && !G.player.mount) { const c = G.creatures[Math.floor(r() * G.creatures.length)]; G.player.x = c.x + 1; G.player.z = c.z + 1; G.player.y = c.y + 1; }
      if (r() < 0.04 && G.state === 'play') { G.missions.skip(); stats.skips++; }
      if (r() < 0.12 && G.state === 'play' && !G.player.mount) { const t = G.missions.nearest(); if (t) { G.player.x = t.x + 0.6; G.player.z = t.z; G.player.y = G.groundY(Math.floor(t.x), Math.floor(t.z)) + 1.2; } }
      await new Promise(q => setTimeout(q, 60 + r() * 200));
      stats.frames++;
      const P = G.player;
      if (!isFinite(P.x + P.y + P.z + P.yaw + P.pitch) || P.x < 0 || P.x > G.W || P.z < 0 || P.z > G.D || P.y < 0) stats.bad++;
      if (P.mount) stats.mounts++;
      if (G.state === 'pause') stats.pauses++;
      for (const c of G.creatures) if (!isFinite(c.x + c.y + c.z) || c.y < 0) stats.bad++;
      stats.maxMods = Math.max(stats.maxMods, Object.keys(G.mods).length);
    }
    stats.level = G.level; stats.mission = G.missions.cur && G.missions.cur.type; stats.babies = G.babies.length; stats.state = G.state; stats.creatures = G.creatures.length; stats.seed = G.seed;
    return stats;
  });
  console.log(JSON.stringify(res));
  console.log(errs.length ? 'ERRORS:\n' + errs.slice(0, 8).join('\n') : 'no console errors');
  await b.close();
})();
