const { chromium } = require('playwright');
const assert = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
  const run = async (ua) => {
    const ctx = await b.newContext({ viewport: { width: 800, height: 450 }, ...(ua ? { userAgent: ua } : {}) });
    const p = await ctx.newPage();
    await p.goto('http://localhost:8123/');
    await p.waitForTimeout(1000);
    await p.click('#play', { force: true });
    await p.waitForTimeout(400);
    // pedido de menu de contexto sem clique direito (como manter ☰ premido na Xbox)
    const held = await p.evaluate(() => { const e = new MouseEvent('contextmenu', { bubbles: true, cancelable: true }); document.getElementById('game').dispatchEvent(e); return e.defaultPrevented; });
    // tecla Menu do comando
    const menuKey = await p.evaluate(() => { const e = new KeyboardEvent('keydown', { bubbles: true, cancelable: true }); Object.defineProperty(e, 'keyCode', { get: () => 207 }); window.dispatchEvent(e); return e.defaultPrevented; });
    // clique direito a sério
    const right = await p.evaluate(() => { const c = document.getElementById('game'); c.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 2 })); const e = new MouseEvent('contextmenu', { bubbles: true, cancelable: true, button: 2 }); c.dispatchEvent(e); return e.defaultPrevented; });
    await ctx.close();
    return { held, menuKey, right };
  };
  const xbox = await run('Mozilla/5.0 (Windows NT 10.0; Win64; x64; Xbox; Xbox One) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0');
  assert(!xbox.held && !xbox.menuKey && !xbox.right, 'Xbox: o jogo não bloqueia o menu de contexto nem a tecla Menu: ' + JSON.stringify(xbox));
  const pc = await run(null);
  assert(!pc.held && pc.right, 'PC: só o clique direito a sério é bloqueado: ' + JSON.stringify(pc));
  await b.close();
})();
