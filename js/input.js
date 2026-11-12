/* Ilha dos Dinos — entrada: comando (Gamepad API), teclado e rato. */
(function () {
  'use strict';
  var G = window.G;
  G.isXbox = /Xbox/i.test(navigator.userAgent || '');

  var I = (G.input = {
    moveX: 0, moveZ: 0, lookX: 0, lookY: 0,
    jump: false, down: false, place: false, dig: false,
    placePressed: false, digPressed: false, nextPressed: false, prevPressed: false,
    flyPressed: false, interactPressed: false, menuPressed: false, jumpPressed: false,
    ui: { left: false, right: false, up: false, down: false, accept: false, back: false },
    acceptHeld: false,
    padSeen: false, padActive: false, lastDevice: G.isXbox ? 'pad' : 'keys', locked: false
  });

  var keys = {}, pressed = {}, mouseDX = 0, mouseDY = 0, mouseBtn = [false, false, false], mousePressed = [false, false, false];
  var wheel = 0, canvas = null, dragLook = false, dragMoved = 0, dragBtn = -1, lockFailed = false;

  G.initInput = function (cv) {
    canvas = cv;
    window.addEventListener('keydown', function (e) {
      var kc = e.keyCode || e.which || 0;
      if (kc >= 195 && kc <= 218) { // comando entregue como "teclas de comando" (VK_GAMEPAD_*)
        if (!vk[kc]) vkHit[kc] = true;
        vk[kc] = true; vkSeen = true;
        e.preventDefault();
        return;
      }
      var code = codeOf(e);
      if (!keys[code]) pressed[code] = true;
      keys[code] = true;
      if (!/^Arrow|^Enter$/.test(code)) I.lastDevice = 'keys'; // setas e Enter também vêm do comando na Xbox
      else I.arrowsUsed = true;
      if (G.state === 'play' && /^(Space|Arrow|Tab|Enter|Page|Key[WASDEFQR]|Digit)/.test(code)) e.preventDefault();
    });
    window.addEventListener('keyup', function (e) {
      var kc = e.keyCode || e.which || 0;
      if (kc >= 195 && kc <= 218) { vk[kc] = false; return; }
      keys[codeOf(e)] = false;
    });
    window.addEventListener('blur', function () { keys = {}; vk = {}; mouseBtn = [false, false, false]; });
    document.addEventListener('mousemove', function (e) {
      if (I.locked) { mouseDX += e.movementX || 0; mouseDY += e.movementY || 0; }
      else if (dragLook) { mouseDX += e.movementX || 0; mouseDY += e.movementY || 0; dragMoved += Math.abs(e.movementX || 0) + Math.abs(e.movementY || 0); }
    });
    canvas.addEventListener('mousedown', function (e) {
      if (G.isXbox) return; // na Xbox o "rato" é o cursor do comando
      if (G.state !== 'play') return;
      if (I.locked) { if (e.button < 3) { mouseBtn[e.button] = true; mousePressed[e.button] = true; } I.lastDevice = 'keys'; }
      else if (!lockFailed) G.requestLock();
      else { dragLook = true; dragMoved = 0; dragBtn = e.button; }
      e.preventDefault();
    });
    window.addEventListener('mouseup', function (e) {
      if (e.button < 3) mouseBtn[e.button] = false;
      if (dragLook) {
        dragLook = false;
        if (dragMoved < 6 && dragBtn >= 0 && dragBtn < 3) mousePressed[dragBtn] = true; // clique sem arrastar
      }
    });
    canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    window.addEventListener('wheel', function (e) { if (G.state === 'play') wheel += e.deltaY > 0 ? 1 : -1; }, { passive: true });
    document.addEventListener('pointerlockchange', function () {
      I.locked = document.pointerLockElement === canvas;
      if (!I.locked) { mouseBtn = [false, false, false]; if (G.onLockLost) G.onLockLost(); }
    });
    document.addEventListener('pointerlockerror', function () { lockFailed = true; });
    try { navigator.gamepadInputEmulation = 'gamepad'; } catch (e) { /* só existia no Edge antigo */ }
  };

  G.requestLock = function () {
    if (G.isXbox || !canvas || !canvas.requestPointerLock) { lockFailed = true; return; }
    try {
      var p = canvas.requestPointerLock();
      if (p && p.catch) p.catch(function () { lockFailed = true; });
    } catch (e) { lockFailed = true; }
  };

  // teclas sem "code" (acontece com teclas emuladas pelo comando): deduz pelo nome ou pelo número
  var KEYCODES = { 13: 'Enter', 27: 'Escape', 32: 'Space', 33: 'PageUp', 34: 'PageDown', 37: 'ArrowLeft', 38: 'ArrowUp', 39: 'ArrowRight', 40: 'ArrowDown' };
  function codeOf(e) {
    if (e.code) return e.code;
    var k = e.key || '';
    if (/^Arrow|^Enter$|^Escape$|^Page/.test(k)) return k;
    if (k === ' ') return 'Space';
    return KEYCODES[e.keyCode || e.which || 0] || ('Key' + k.toUpperCase());
  }
  var vk = {}, vkHit = {}, vkSeen = false;

  var prevB = [], prevAxis = { l: 0, r: 0, u: 0, d: 0 }, uiRepeat = 0;
  function dz(v) { var a = Math.abs(v); if (a < 0.2) return 0; return (v < 0 ? -1 : 1) * (a - 0.2) / 0.8; }
  function btn(gp, i) { var b = gp.buttons[i]; return !!b && (b.pressed || b.value > 0.4); }

  function findPad() {
    var pads;
    try { pads = navigator.getGamepads ? navigator.getGamepads() : []; } catch (e) { pads = []; }
    var best = null;
    for (var i = 0; i < pads.length; i++) {
      var p = pads[i];
      if (!p || p.connected === false || !p.buttons || p.buttons.length < 10) continue;
      if (p.mapping === 'standard') return p;
      if (!best) best = p;
    }
    return best;
  }

  G.pollInput = function (dt) {
    var ui = I.ui;
    ui.left = ui.right = ui.up = ui.down = ui.accept = ui.back = false;
    I.placePressed = I.digPressed = I.nextPressed = I.prevPressed = I.flyPressed = I.interactPressed = I.menuPressed = I.jumpPressed = false;

    // ----- teclado e rato -----
    var mx = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
    var mz = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0);
    var lx = 0, ly = 0;
    var SENS = 0.0024;
    lx -= mouseDX * SENS; ly -= mouseDY * SENS; mouseDX = mouseDY = 0;
    // setas: esquerda/direita rodam, cima/baixo andam. Assim joga-se só com um manípulo ou D-pad
    // quando o browser entrega o comando como setas (modo de navegação do Edge na Xbox).
    var ak = 1.9 * dt;
    if (!vkSeen) {
      if (keys.ArrowLeft) lx += ak; if (keys.ArrowRight) lx -= ak;
      if (keys.ArrowUp) mz = 1; if (keys.ArrowDown) mz = -1;
    }
    if (keys.PageUp) ly += ak * 0.7; if (keys.PageDown) ly -= ak * 0.7;
    var jump = !!(keys.Space || keys.Enter), down = !!(keys.ShiftLeft || keys.ShiftRight || keys.KeyC);
    var dig = mouseBtn[0] || !!keys.KeyZ, place = mouseBtn[2] || !!keys.KeyX;
    if (mousePressed[0] || pressed.KeyZ) I.digPressed = true;
    if (mousePressed[2] || pressed.KeyX) I.placePressed = true;
    if (pressed.Space || pressed.Enter) I.jumpPressed = true;
    if (pressed.KeyF) I.flyPressed = true;
    if (pressed.KeyE) I.interactPressed = true;
    if (pressed.Escape || pressed.KeyP) I.menuPressed = true;
    if (pressed.KeyR || wheel > 0) I.nextPressed = true;
    if (pressed.KeyQ || wheel < 0) I.prevPressed = true;
    I.digit = -1;
    for (var d = 1; d <= 9; d++) if (pressed['Digit' + d]) I.digit = d - 1;
    if (pressed.ArrowLeft || pressed.KeyA) ui.left = true;
    if (pressed.ArrowRight || pressed.KeyD) ui.right = true;
    if (pressed.ArrowUp || pressed.KeyW) ui.up = true;
    if (pressed.ArrowDown || pressed.KeyS) ui.down = true;
    if (pressed.Enter || pressed.Space) ui.accept = true;
    if (pressed.Escape) ui.back = true;
    var acceptHeld = !!(keys.Enter || keys.Space);
    pressed = {}; mousePressed = [false, false, false]; wheel = 0;

    // ----- comando -----
    var gp = findPad();
    I.padActive = false;
    var sx = 0, sy = 0, rx = 0, ry = 0, b = [], i;
    for (i = 0; i < 17; i++) b[i] = false;
    if (gp) {
      I.padSeen = true;
      var ax = gp.axes || [];
      sx = dz(ax[0] || 0); sy = dz(ax[1] || 0); rx = dz(ax[2] || 0); ry = dz(ax[3] || 0);
      for (i = 0; i < 17; i++) b[i] = btn(gp, i);
    }
    if (vkSeen) {
      // A B X Y RB LB LT RT | D-pad | Menu | cliques dos manípulos | manípulo esq. | manípulo dir.
      var VB = [[195, 0], [196, 1], [197, 2], [198, 3], [199, 5], [200, 4], [201, 6], [202, 7], [203, 12], [204, 13], [205, 14], [206, 15], [207, 9], [209, 10], [210, 11]];
      for (i = 0; i < VB.length; i++) if (vk[VB[i][0]]) b[VB[i][1]] = true;
      if (vk[211]) sy = -1; if (vk[212]) sy = 1; if (vk[213]) sx = 1; if (vk[214]) sx = -1;
      if (vk[215]) ry = -0.8; if (vk[216]) ry = 0.8; if (vk[217]) rx = 0.8; if (vk[218]) rx = -0.8;
      vkHit = {};
    }
    if (gp || vkSeen) {
      var any = sx || sy || rx || ry;
      for (i = 0; i < 17; i++) if (b[i]) any = true;
      if (any) { I.padActive = true; I.lastDevice = 'pad'; I.padUsed = true; }
      var pb = prevB;
      var hit = function (n) { return b[n] && !pb[n]; };
      if (Math.abs(sx) > Math.abs(mx)) mx = sx;
      if (Math.abs(sy) > Math.abs(mz)) mz = -sy;
      lx -= rx * Math.abs(rx) * 2.5 * dt;
      ly -= ry * Math.abs(ry) * 1.6 * dt;
      if (b[0]) jump = true;
      if (b[1] || b[13] || b[10]) down = true;
      if (b[6]) dig = true;
      if (b[7]) place = true;
      if (hit(6)) I.digPressed = true;
      if (hit(7)) I.placePressed = true;
      if (hit(0)) I.jumpPressed = true;
      if (hit(3)) I.flyPressed = true;
      if (hit(2)) I.interactPressed = true;
      if (hit(9)) I.menuPressed = true; // o botão Vista (8) fica de fora: no Edge da Xbox tira o foco à página
      if (hit(5) || hit(15)) I.nextPressed = true;
      if (hit(4) || hit(14)) I.prevPressed = true;
      // navegação nos menus (com repetição no manípulo)
      var L = b[14] || sx < -0.6, R = b[15] || sx > 0.6, U = b[12] || sy < -0.6, Dn = b[13] || sy > 0.6;
      if (L && !prevAxis.l) ui.left = true;
      if (R && !prevAxis.r) ui.right = true;
      if (U && !prevAxis.u) ui.up = true;
      if (Dn && !prevAxis.d) ui.down = true;
      prevAxis.l = L; prevAxis.r = R; prevAxis.u = U; prevAxis.d = Dn;
      if (hit(0)) ui.accept = true;
      if (hit(1) || hit(9)) ui.back = true;
      if (b[0]) acceptHeld = true;
      prevB = b;
    } else prevB = [];

    var m = Math.sqrt(mx * mx + mz * mz);
    if (m > 1) { mx /= m; mz /= m; }
    I.moveX = mx; I.moveZ = mz; I.lookX = lx; I.lookY = ly;
    I.jump = jump; I.down = down; I.dig = dig; I.place = place;
    I.acceptHeld = acceptHeld;
  };
})();
