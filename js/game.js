/* Ilha dos Dinos — ciclo principal: jogador, câmara, ações, gravação. */
(function () {
  'use strict';
  var G = window.G, THREE = window.THREE, UI = G.ui, I = G.input;
  var SAVE_KEY = 'ilha-dos-dinos-v1';
  var FIRST_SEED = 20261112;
  var canvas = document.getElementById('game');
  var REACH = 6.5, EYE = 1.55, WALK = 4.4, FLY = 9;

  var P = (G.player = {
    x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, w: 0.3, h: 1.7,
    yaw: 0, pitch: 0, fly: false, onGround: false, inWater: false, autoStep: true, bigStep: true, swimUp: false,
    sel: 0, mount: null
  });
  G.state = 'start';
  G.level = 1;
  G.saveDirty = false;
  var kidModel = null, target = null, digT = 0, placeT = 0, saveT = 0, posSaveT = 0, winT = 0, winBurstT = 0, ghostTarget = null;
  var pauseCooldown = 0, startT = 0;

  // ---------- gravação ----------
  function loadSave() {
    try { var s = window.localStorage.getItem(SAVE_KEY); return s ? JSON.parse(s) : null; } catch (e) { return null; }
  }
  function save() {
    G.saveDirty = false;
    try {
      window.localStorage.setItem(SAVE_KEY, JSON.stringify({
        v: 2, seed: G.seed, mods: G.mods, level: G.level,
        babies: G.babies.filter(function (b) { return !b.dead; }).map(function (b) { return b.kind; }),
        player: { x: +P.x.toFixed(2), y: +P.y.toFixed(2), z: +P.z.toFixed(2), yaw: +P.yaw.toFixed(3), pitch: +P.pitch.toFixed(3), fly: P.mount ? false : P.fly },
        sel: P.sel, time: +G.dayTime.toFixed(4), sound: G.sound.enabled
      }));
    } catch (e) { /* sem armazenamento: joga-se na mesma */ }
  }
  G.save = save;

  function startWorld(seed, data) {
    if (P.mount) dismount(true);
    G.missions.reset();
    G.seed = seed;
    G.generate(seed);
    if (data && data.mods) G.applyMods(data.mods); else G.mods = {};
    G.rebuildAll();
    G.level = data && data.level >= 1 ? Math.floor(data.level) : 1;
    G.setUnlockedBlocks(G.level - 1);
    UI.refreshHotbar();
    var babyKinds = (data && data.babies) || [];
    if (data && data.v === 1 && data.eggs) { // gravações da primeira versão: ovos já chocados passam a bebés
      var bk = ['rex', 'tricera', 'bronto', 'stego'];
      data.eggs.forEach(function (f, i) { if (f) babyKinds.push(bk[i % 4]); });
    }
    var sp = (data && data.player) || G.spawn;
    P.x = sp.x; P.y = sp.y; P.z = sp.z; P.yaw = sp.yaw || 0; P.pitch = sp.pitch || 0;
    P.vx = P.vy = P.vz = 0; P.fly = !!sp.fly; P.w = 0.3; P.h = 1.7;
    if (!(P.x > 1 && P.x < G.W - 1 && P.z > 1 && P.z < G.D - 1 && P.y > 0 && P.y < G.H + 20)) { P.x = G.spawn.x; P.y = G.spawn.y; P.z = G.spawn.z; }
    G.unstick(P);
    P.sel = data && data.sel >= 0 && data.sel < G.HOTBAR.length ? data.sel : 0;
    if (data && typeof data.time === 'number') G.dayTime = data.time;
    UI.setHotbar(P.sel);
    UI.setFly(P.fly);
    winT = 0;
    G.populate(G.level - 1, babyKinds);
    G.missions.start(G.level);
  }

  G.celebrate = function (sec) { winT = sec; winBurstT = 0; };
  G.onLevelChanged = function (level) { G.level = level; save(); };

  // ---------- montar dinossauros ----------
  function mount(c) {
    P.mount = c; c.ridden = true;
    P.x = c.x; P.y = c.y; P.z = c.z; P.w = Math.min(c.w, 0.45); P.h = c.h;
    P.vx = P.vy = P.vz = 0;
    P.fly = !!c.sp.flies;
    if (P.fly) { P.y += 0.6; c.flapping = true; }
    G.unstick(P);
    if (!kidModel) kidModel = G.buildModel('kid', 1).root;
    kidModel.position.set(0, c.sp.riderY, c.sp.riderZ || 0);
    c.inner.add(kidModel);
    if (P.pitch > -0.2) P.pitch = -0.38;
    G.sound.play('mount');
    G.burst('heart', c.x, c.y + c.h + 0.6, c.z, 3);
    UI.setRiding(true); UI.setFly(false);
  }
  function dismount(silent) {
    var c = P.mount;
    if (!c) return;
    P.mount = null; c.ridden = false;
    if (kidModel && kidModel.parent) kidModel.parent.remove(kidModel);
    c.x = P.x; c.y = P.y; c.z = P.z;
    c.homeX = c.x; c.homeZ = c.z; c.vx = c.vz = 0; c.moving = 0;
    if (c.sp.flies) { c.state = 'fly'; c.hopsLeft = 0; c.target = null; c.fly = true; }
    else { c.state = 'idle'; c.timer = 3; c.fly = false; }
    P.w = 0.3; P.h = 1.7; P.fly = false;
    var rx = Math.cos(P.yaw), rz = -Math.sin(P.yaw), d = c.w + 0.8;
    var opts = [[rx * d, rz * d], [-rx * d, -rz * d], [Math.sin(P.yaw) * d, Math.cos(P.yaw) * d]];
    var placed = false;
    for (var i = 0; i < opts.length && !placed; i++) {
      var nx = c.x + opts[i][0], nz = c.z + opts[i][1];
      if (!G.collides(nx, c.y + 0.05, nz, P.w, P.h)) { P.x = nx; P.z = nz; P.y = c.y + 0.05; placed = true; }
    }
    if (!placed) P.y = c.y + c.h + 0.1;
    G.unstick(P);
    P.vx = P.vy = P.vz = 0;
    if (!silent) G.sound.play('land');
    UI.setRiding(false);
  }

  function findInteract() {
    var best = null, bd = 1e9;
    var fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw);
    for (var i = 0; i < G.creatures.length; i++) {
      var c = G.creatures[i];
      if (c.sp.egg || c.dead) continue;
      var dx = c.x - P.x, dz = c.z - P.z, dy = (c.y + c.h * 0.5) - (P.y + 1);
      var d = Math.sqrt(dx * dx + dz * dz);
      var reach = 2.7 + c.w;
      if (d > reach || Math.abs(dy) > 3.2) continue;
      if (d > 1.2 && (dx * fx + dz * fz) / d < 0.15) continue;
      if (d < bd) { bd = d; best = c; }
    }
    return best;
  }

  // ---------- jogador ----------
  function updatePlayer(dt) {
    var c = P.mount;
    P.yaw += I.lookX;
    P.pitch += I.lookY;
    var pmin = c ? -1.25 : -1.5, pmax = c ? 0.7 : 1.5;
    if (P.pitch < pmin) P.pitch = pmin; if (P.pitch > pmax) P.pitch = pmax;
    if (P.yaw > Math.PI * 2) P.yaw -= Math.PI * 2; if (P.yaw < -Math.PI * 2) P.yaw += Math.PI * 2;

    if (I.flyPressed && !c) {
      P.fly = !P.fly;
      if (P.fly) { P.vy = 0; if (P.onGround) P.y += 0.15; }
      G.sound.play(P.fly ? 'fly' : 'land');
      UI.setFly(P.fly);
    }
    var speed = c ? (c.sp.flies ? 9 : c.sp.speed * 2.4) : (P.fly ? FLY : WALK);
    var fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw), rx = Math.cos(P.yaw), rz = -Math.sin(P.yaw);
    var tvx = (fx * I.moveZ + rx * I.moveX) * speed, tvz = (fz * I.moveZ + rz * I.moveX) * speed;
    var k = Math.min(1, dt * (P.fly ? 6 : 12));
    P.vx += (tvx - P.vx) * k; P.vz += (tvz - P.vz) * k;
    if (P.fly) {
      var tvy = ((I.jump ? 1 : 0) - (I.down ? 1 : 0)) * 7;
      P.vy += (tvy - P.vy) * Math.min(1, dt * 8);
    } else {
      if (I.jump && P.onGround) { P.vy = G.JUMP_V; P.onGround = false; }
      P.swimUp = I.jump;
    }
    var wasFlyDown = P.fly && I.down;
    G.moveBody(P, dt);
    // pousar: a descer em voo e tocou no chão
    if (wasFlyDown && !c && G.collides(P.x, P.y - 0.08, P.z, P.w, P.h)) { P.fly = false; UI.setFly(false); G.sound.play('land'); }
    if (G.collides(P.x, P.y, P.z, P.w, P.h)) G.unstick(P);

    if (c) {
      c.x = P.x; c.y = P.y; c.z = P.z;
      var sp2 = Math.sqrt(P.vx * P.vx + P.vz * P.vz);
      if (sp2 > 0.3) c.yaw = G.turnToward(c.yaw, Math.atan2(P.vx, P.vz), dt * 6);
      c.moving = c.sp.flies ? 0.5 : Math.min(1, sp2 / speed);
      c.flapping = !!c.sp.flies;
    }
  }

  var fwd = new THREE.Vector3();
  function updateCamera() {
    var cam = G.camera, c = P.mount;
    var cp = Math.cos(P.pitch);
    fwd.set(-Math.sin(P.yaw) * cp, Math.sin(P.pitch), -Math.cos(P.yaw) * cp);
    cam.rotation.set(P.pitch, P.yaw, 0);
    if (!c) { cam.position.set(P.x, P.y + EYE, P.z); return; }
    var tx = P.x, ty = P.y + c.h * 0.8 + 1.5, tz = P.z;
    var dist = c.sp.flies ? 6.5 : 5.5 + c.h * 1.3, d = 0.4, ok = 0.4;
    for (; d <= dist; d += 0.4) {
      var qx = Math.floor(tx - fwd.x * d), qy = Math.floor(ty - fwd.y * d), qz = Math.floor(tz - fwd.z * d);
      var qb = G.get(qx, qy, qz);
      if (qb !== 0 && qb !== G.B.WATER && qb !== G.B.LEAVES && qb !== G.B.PALM && qb !== -1) break; // as folhas não tapam a câmara
      ok = d;
    }
    cam.position.set(tx - fwd.x * ok, ty - fwd.y * ok, tz - fwd.z * ok);
  }

  function overlapsPlayer(bx, by, bz) {
    return bx + 1 > P.x - P.w && bx < P.x + P.w && bz + 1 > P.z - P.w && bz < P.z + P.w && by + 1 > P.y && by < P.y + P.h;
  }
  function waterNear(x, y, z) {
    return G.isWater(x + 1, y, z) && x + 1 < G.W || G.isWater(x - 1, y, z) && x > 0 || G.isWater(x, y, z + 1) && z + 1 < G.D || G.isWater(x, y, z - 1) && z > 0 || G.isWater(x, y + 1, z);
  }

  function updateActions(dt) {
    // escolher bloco
    var n = G.HOTBAR.length, old = P.sel;
    if (I.nextPressed) P.sel = (P.sel + 1) % n;
    if (I.prevPressed) P.sel = (P.sel + n - 1) % n;
    if (I.digit >= 0 && I.digit < n) P.sel = I.digit;
    if (P.sel !== old) { UI.setHotbar(P.sel); G.sound.play('select'); G.saveDirty = true; }

    // festinhas / montar
    var near = P.mount ? null : findInteract();
    UI.showHint(P.mount ? 'off' : (near ? ((near.sp.ride && !near.baby) ? 'ride' : 'pet') : null));
    if (I.interactPressed) {
      if (P.mount) dismount();
      else if (near) { if (near.sp.ride && !near.baby) mount(near); else near.pet(); }
    }

    // mira e blocos (só a pé)
    target = null;
    if (!P.mount) {
      var cam = G.camera.position;
      target = G.raycast(cam.x, cam.y, cam.z, fwd.x, fwd.y, fwd.z, REACH);
    }
    ghostTarget = null;
    if (!P.mount) {
      var cam2 = G.camera.position;
      ghostTarget = G.missions.ghostRay(cam2.x, cam2.y, cam2.z, fwd.x, fwd.y, fwd.z, target ? Math.min(REACH, target.t) : REACH);
    }
    var hl = ghostTarget || target;
    if (hl) {
      G.highlight.visible = G.highlight2.visible = true;
      G.highlight.position.set(hl.x + 0.5, hl.y + 0.5, hl.z + 0.5);
      G.highlight2.position.copy(G.highlight.position);
    } else G.highlight.visible = G.highlight2.visible = false;

    digT -= dt; placeT -= dt;
    if (P.mount) return;
    if (I.digPressed || (I.dig && digT <= 0)) {
      digT = 0.26;
      if (target && target.y > 0) {
        var col = G.BLOCK_COLORS[target.id][1];
        var fill = (waterNear(target.x, target.y, target.z)) ? G.B.WATER : G.B.AIR;
        if (G.setBlock(target.x, target.y, target.z, fill)) {
          G.sound.play('break');
          G.burst('chip', target.x + 0.5, target.y + 0.5, target.z + 0.5, 7, col);
        }
      }
    }
    if (I.placePressed || (I.place && placeT <= 0)) {
      placeT = 0.26;
      if (ghostTarget) placeAt(ghostTarget.x, ghostTarget.y, ghostTarget.z);
      else if (target) placeAt(target.px, target.py, target.pz);
    }
  }

  // põe o bloco escolhido numa célula; nas células do molde aplica a regra da missão
  function placeAt(px, py, pz) {
    var cur = G.inBounds(px, py, pz) ? G.blocks[G.idx(px, py, pz)] : -1;
    var id = G.HOTBAR[P.sel];
    var cell = G.missions.ghostCell(px, py, pz);
    if (cell) id = G.missions.blockForGhost(cell, id);
    if (id >= 0 && (cur === 0 || cur === G.B.WATER) && py < G.H - 1 && !overlapsPlayer(px, py, pz) && G.setBlock(px, py, pz, id)) {
      G.sound.play('place');
      return true;
    }
    G.sound.play('nope');
    return false;
  }
  G.placeAt = placeAt;

  // ---------- resolução adaptativa ----------
  var frames = 0, acc = 0, cool = 0, upPenalty = 8, fpsShown = 0, showFps = /fps/.test(window.location.hash || '');
  function adapt(rawDt) {
    frames++; acc += rawDt; cool -= rawDt;
    if (acc < 2) return;
    var avg = acc / frames * 1000;
    fpsShown = Math.round(1000 / avg);
    frames = 0; acc = 0;
    if (avg > 36 && G.renderScale > 0.62) {
      G.renderScale = Math.max(0.62, G.renderScale * 0.85);
      cool = upPenalty; upPenalty = Math.min(120, upPenalty * 2);
      G.resize();
    } else if (avg > 36 && G.detail > 0) {
      G.setDetail(G.detail - 1); // já no mínimo de resolução: reduz a distância de visão
      cool = 30;
    } else if (avg < 18.5 && G.renderScale < 1 && cool <= 0) {
      G.renderScale = Math.min(1, G.renderScale * 1.12);
      cool = 6;
      G.resize();
    }
    if (showFps) UI.setFps(fpsShown + ' fps\nescala ' + G.renderScale.toFixed(2) + ' detalhe ' + G.detail + '\n' + G.renderer.info.render.calls + ' draws');
  }

  // ---------- estados ----------
  function goFullscreen() {
    try {
      var el = document.documentElement;
      var fn = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
      if (fn && !document.fullscreenElement) { var p = fn.call(el); if (p && p.catch) p.catch(function () { }); }
    } catch (e) { /* opcional */ }
  }
  function startGame() {
    if (G.state !== 'start') return;
    G.sound.init();
    goFullscreen();
    G.state = 'play';
    UI.showStart(false); UI.showHud(true);
    if (!G.isXbox && I.lastDevice !== 'pad') G.requestLock();
    try { canvas.focus(); } catch (e) { /* opcional */ }
  }
  function pause() {
    if (G.state !== 'play') return;
    G.state = 'pause';
    pauseCooldown = 0.3;
    UI.openPause();
    save();
    try { if (document.pointerLockElement) document.exitPointerLock(); } catch (e) { /* opcional */ }
  }
  function resume(fromGesture) {
    if (G.state !== 'pause') return;
    G.state = 'play';
    UI.closePause();
    G.sound.resume();
    if (I.lastDevice !== 'pad' || fromGesture) G.requestLock();
  }
  G.onLockLost = function () { if (G.state === 'play') pause(); };
  G.onMenu = function (act) {
    G.sound.play('menu');
    if (act === 'resume') resume();
    else if (act === 'home') {
      if (P.mount) dismount(true);
      P.x = G.spawn.x; P.y = G.spawn.y; P.z = G.spawn.z; P.yaw = G.spawn.yaw; P.pitch = 0; P.vx = P.vy = P.vz = 0;
      P.fly = false; UI.setFly(false);
      G.unstick(P);
      resume();
    } else if (act === 'sound') {
      G.sound.setEnabled(!G.sound.enabled);
      UI.setSound(G.sound.enabled);
      save();
    } else if (act === 'skip') {
      G.missions.skip();
      resume();
    } else if (act === 'new') {
      // ilha nova: o nível e os bebés mantêm-se
      startWorld((Math.random() * 2147483647) | 0, { level: G.level, babies: G.babies.map(function (b) { return b.kind; }), sel: P.sel });
      G.sound.play('hatch');
      save();
      resume();
    }
  };

  // ---------- ciclo ----------
  var lastT = 0;
  function frame(t) {
    window.requestAnimationFrame(frame);
    var raw = (t - lastT) / 1000;
    lastT = t;
    if (!(raw > 0)) return;
    if (raw > 0.5) raw = 0.5;
    var dt = Math.min(raw, 0.05);
    G.pollInput(dt);
    UI.setDevice();

    if (G.state === 'start') {
      startT += dt;
      var a = startT * 0.12 + 0.6;
      G.camera.position.set(G.W / 2 + Math.cos(a) * 62, G.SEA + 30, G.D / 2 + Math.sin(a) * 62);
      G.camera.lookAt(G.W / 2, G.SEA + 7, G.D / 2);
      updateCreatures(dt);
      if (I.ui.accept) startGame();
    } else if (G.state === 'play') {
      if (I.menuPressed) pause();
      else {
        updatePlayer(dt);
        updateCamera();
        updateActions(dt);
        updateCreatures(dt);
        G.missions.update(dt);
        if (winT > 0) {
          winT -= dt; winBurstT -= dt;
          if (winBurstT <= 0) {
            winBurstT = 0.35;
            G.burst('confetti', P.x + fwd.x * 3 + (Math.random() - 0.5) * 4, P.y + 2.5, P.z + fwd.z * 3 + (Math.random() - 0.5) * 4, 10);
          }
        }
        UI.setXboxTip(G.isXbox && !I.padUsed);
        var cp = G.camera.position;
        UI.setWater(G.isWater(Math.floor(cp.x), Math.floor(cp.y + 0.1), Math.floor(cp.z)));
        saveT += dt; posSaveT += dt;
        if ((G.saveDirty && saveT > 4) || posSaveT > 15) { saveT = 0; posSaveT = 0; save(); }
      }
    } else if (G.state === 'pause') {
      pauseCooldown -= raw;
      if (pauseCooldown <= 0) UI.updatePause(Math.min(raw, 0.25));
    }

    if (G.state !== 'pause') {
      G.updateParticles(dt);
      G.updateSky(dt, G.camera.position);
      G.sound.updateMusic();
    }
    G.rebuildDirty(2);
    G.renderer.render(G.scene, G.camera);
    adapt(raw);
  }
  function updateCreatures(dt) {
    var list = G.creatures;
    for (var i = list.length - 1; i >= 0; i--) { if (i < list.length && !list[i].dead) list[i].update(dt, P); }
  }

  // ---------- arranque ----------
  function boot() {
    G.initRenderer(canvas);
    G.initParticles();
    G.initInput(canvas);
    UI.init();
    if (G.isXbox) { G.maxRenderHeight = 900; }
    G.resize();
    var data = loadSave();
    var want = /nivel=(\d+)/.exec(window.location.hash || '');
    if (want) {
      data = (data && typeof data.seed === 'number') ? data : { v: 2, seed: FIRST_SEED };
      data.level = Math.max(1, Math.min(9999, parseInt(want[1], 10)));
    }
    G.makeThumbs();
    if (data && (data.v === 1 || data.v === 2) && typeof data.seed === 'number') {
      if (data.sound === false) G.sound.setEnabled(false);
      startWorld(data.seed, data);
    } else startWorld(FIRST_SEED, null);
    UI.setSound(G.sound.enabled);

    document.getElementById('play').addEventListener('click', function () { startGame(); });
    ['mousedown', 'keydown', 'touchstart'].forEach(function (ev) { window.addEventListener(ev, function () { if (G.state !== 'start') { G.sound.init(); } }, true); });
    window.addEventListener('resize', G.resize);
    document.addEventListener('fullscreenchange', G.resize);
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { if (G.state !== 'start') save(); G.sound.suspend(); }
      else if (G.state === 'play') G.sound.resume();
    });
    window.addEventListener('pagehide', function () { if (G.state !== 'start') save(); });
    window.addEventListener('keydown', function (e) { if (e.code === 'F3') { showFps = !showFps; if (!showFps) UI.setFps(''); e.preventDefault(); } });
    // o botão "voltar" do browser (B na Xbox em modo cursor) não deve sair do jogo
    try {
      window.history.pushState({ g: 1 }, '');
      window.addEventListener('popstate', function () { try { window.history.pushState({ g: 1 }, ''); } catch (e) { /* opcional */ } });
    } catch (e) { /* opcional */ }
    window.requestAnimationFrame(frame);
  }

  if (!window.THREE) {
    document.body.insertAdjacentHTML('beforeend', '<p style="position:fixed;inset:auto 0 0 0;padding:16px;background:#1d2b4a;color:#fff;font:16px sans-serif">Não foi possível carregar o motor gráfico (vendor/three.min.js).</p>');
  } else {
    try { boot(); } catch (err) {
      document.body.insertAdjacentHTML('beforeend', '<p style="position:fixed;inset:auto 0 0 0;padding:16px;background:#1d2b4a;color:#fff;font:16px sans-serif">Este browser não conseguiu iniciar os gráficos 3D (WebGL). ' + String(err && err.message || err) + '</p>');
      throw err;
    }
  }
})();
