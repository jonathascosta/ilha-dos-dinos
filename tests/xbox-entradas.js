const { chromium } = require('playwright');
const assert = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
  // user agent do Edge da Xbox One, sem Gamepad API a entregar nada (modo de navegação)
  const ctx = await b.newContext({ viewport: { width: 960, height: 540 }, userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; Xbox; Xbox One) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0' });
  await ctx.addInitScript(() => { navigator.getGamepads = () => [null, null, null, null]; });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  await p.goto('http://localhost:8123/');
  await p.waitForTimeout(1200);
  await p.click('#play', { force: true });
  await p.waitForTimeout(500);
  const P = () => p.evaluate(() => ({ x: G.player.x, z: G.player.z, y: G.player.y, yaw: G.player.yaw, pitch: G.player.pitch, tip: !document.getElementById('xboxtip').hidden, locked: G.input.locked, state: G.state }));
  let s0 = await P();
  assert(s0.state === 'play' && s0.tip && !s0.locked, 'na Xbox, sem comando entregue: jogo arranca, aviso visível, sem capturar o cursor');
  await p.screenshot({ path: 'x_tip.png' });
  // setas (D-pad / manípulo emulados): cima anda, esquerda roda
  await p.keyboard.down('ArrowUp'); await p.waitForTimeout(800); await p.keyboard.up('ArrowUp');
  let s1 = await P();
  assert(Math.hypot(s1.x - s0.x, s1.z - s0.z) > 1 && Math.abs(s1.pitch - s0.pitch) < 0.01, 'seta para cima anda para a frente (' + Math.hypot(s1.x - s0.x, s1.z - s0.z).toFixed(2) + ' blocos)');
  await p.keyboard.down('ArrowLeft'); await p.waitForTimeout(500); await p.keyboard.up('ArrowLeft');
  let s2 = await P();
  assert(Math.abs(s2.yaw - s1.yaw) > 0.4, 'seta para a esquerda roda a vista');
  await p.waitForTimeout(400);
  const y0 = (await P()).y;
  await p.keyboard.down('Enter'); await p.waitForTimeout(250); const ym = (await P()).y; await p.keyboard.up('Enter');
  assert(ym > y0 + 0.4, 'Enter (botão A emulado) salta');
  assert((await P()).tip, 'o aviso continua enquanto o comando não chega a sério');
  await p.waitForTimeout(700);
  // teclas de comando 195–218 (VK_GAMEPAD_*)
  const vk = (kc, type) => p.evaluate(([kc, type]) => { const e = new KeyboardEvent(type, { bubbles: true, cancelable: true }); Object.defineProperty(e, 'keyCode', { get: () => kc }); window.dispatchEvent(e); }, [kc, type]);
  const s3 = await P();
  await vk(211, 'keydown'); await p.waitForTimeout(800); await vk(211, 'keyup');
  const s4 = await P();
  assert(Math.hypot(s4.x - s3.x, s4.z - s3.z) > 1, 'tecla de comando 211 (manípulo esquerdo para cima) anda');
  await vk(217, 'keydown'); await p.waitForTimeout(500); await vk(217, 'keyup');
  const s5 = await P();
  assert(Math.abs(s5.yaw - s4.yaw) > 0.4, 'tecla de comando 217 (manípulo direito) roda');
  await vk(198, 'keydown'); await p.waitForTimeout(250); await vk(198, 'keyup'); await p.waitForTimeout(200);
  assert(await p.evaluate(() => G.player.fly), 'tecla de comando 198 (Y) liga o voo');
  assert(!(await P()).tip, 'com teclas de comando o aviso desaparece');
  // página de diagnóstico
  await p.goto('http://localhost:8123/diag.html');
  await p.keyboard.press('ArrowLeft');
  await p.mouse.move(200, 200);
  await p.waitForTimeout(400);
  const verdict = await p.textContent('#verdict');
  assert(/setas/.test(verdict) && /Xbox/.test(await p.textContent('#env')), 'diag.html regista as entradas: ' + verdict);
  await p.screenshot({ path: 'x_diag.png' });
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'no console errors');
  if (errs.length) process.exitCode = 1;
  await b.close();
})();
