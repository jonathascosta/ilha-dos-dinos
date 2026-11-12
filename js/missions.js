/* Ilha dos Dinos — missões e níveis: estrelas, ovos, construir pelo molde, bebé perdido. */
(function () {
  'use strict';
  var G = window.G, THREE = window.THREE, B = G.B;
  var rnd = Math.random;
  var M = (G.missions = { cur: null, level: 1, lastType: '', lastTemplate: '', phase: 'play', timer: 0, idle: 0 });
  var TYPES = ['stars', 'eggs', 'build', 'baby'];
  var NATURAL = {};
  [B.GRASS, B.SAND, B.DIRT, B.STONE, B.SNOW, B.BASALT].forEach(function (b) { NATURAL[b] = true; });

  // ---------- sítios em terra ----------
  // opts: any (aceita copas e telhados), avoid (lista de pontos {x,z}), min (distância mínima a esses pontos)
  function landSpot(ox, oz, rmin, rmax, opts) {
    opts = opts || {};
    for (var t = 0; t < 70; t++) {
      var a = rnd() * Math.PI * 2, r = rmin + rnd() * (rmax - rmin);
      var x = Math.floor(ox + Math.cos(a) * r), z = Math.floor(oz + Math.sin(a) * r);
      if (x < 5 || z < 5 || x > G.W - 6 || z > G.D - 6) continue;
      var gy = G.groundY(x, z);
      if (gy < G.SEA || gy > G.H - 12 || G.isWater(x, gy + 1, z)) continue;
      var top = G.blocks[G.idx(x, gy, z)];
      if (!opts.any && !NATURAL[top]) continue;
      if (top === B.GLOW) continue;
      var ok = true;
      if (opts.avoid) for (var i = 0; i < opts.avoid.length; i++) {
        var dx = opts.avoid[i].x - x, dz = opts.avoid[i].z - z;
        if (dx * dx + dz * dz < opts.min * opts.min) { ok = false; break; }
      }
      if (ok) return { x: x, y: gy + 1, z: z };
    }
    return null;
  }
  function spotNear(ox, oz, rmin, rmax, opts) {
    return landSpot(ox, oz, rmin, rmax, opts) || landSpot(ox, oz, 2, rmax + 15, opts) ||
      landSpot(G.spawn.x, G.spawn.z, 3, 30, { any: true }) || { x: Math.floor(G.spawn.x), y: Math.floor(G.spawn.y), z: Math.floor(G.spawn.z) + 3 };
  }
  M.landSpot = landSpot;

  // ---------- modelos auxiliares ----------
  var starGeo = null, matGlow = null, matGhost = null, matGhostLine = null, markerTex = null;
  function ensureAssets() {
    if (starGeo) return;
    var A = { p: [], c: [], i: [] };
    G.pushBox(A, 0.95, 0.3, 0.3, 0, 0, 0, 0xffd23c); G.pushBox(A, 0.3, 0.95, 0.3, 0, 0, 0, 0xffd23c);
    G.pushBox(A, 0.3, 0.3, 0.95, 0, 0, 0, 0xffd23c); G.pushBox(A, 0.5, 0.5, 0.5, 0, 0, 0, 0xfff4b0);
    starGeo = G.geomFrom(A);
    matGlow = new THREE.MeshBasicMaterial({ vertexColors: true, fog: false });
    matGhost = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.6, depthWrite: false, fog: false });
    matGhostLine = new THREE.LineBasicMaterial({ color: 0xffffff, fog: false, transparent: true, opacity: 0.95 });
    var cv = document.createElement('canvas'); cv.width = cv.height = 64;
    var g = cv.getContext('2d');
    g.fillStyle = '#ff5c8a'; g.strokeStyle = '#fff'; g.lineWidth = 5; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(32, 56); g.bezierCurveTo(4, 36, 6, 12, 20, 10); g.bezierCurveTo(27, 9, 31, 14, 32, 20);
    g.bezierCurveTo(33, 14, 37, 9, 44, 10); g.bezierCurveTo(58, 12, 60, 36, 32, 56); g.closePath(); g.stroke(); g.fill();
    markerTex = new THREE.CanvasTexture(cv);
  }
  function makeMarker() {
    var s = new THREE.Sprite(new THREE.SpriteMaterial({ map: markerTex, fog: false, depthTest: false, transparent: true }));
    s.scale.setScalar(1.1); s.renderOrder = 5;
    G.scene.add(s);
    return s;
  }

  // ================= ESTRELAS =================
  function startStars(level) {
    var P = G.player;
    var n = Math.min(10, 3 + Math.floor(level / 3));
    var R = Math.min(58, 9 + level * 1.4);
    var items = [];
    for (var i = 0; i < n; i++) {
      var tier = (level >= 12 && rnd() < 0.25) ? 'sky' : ((level >= 6 && rnd() < 0.3) ? 'high' : 'ground');
      var s = spotNear(P.x, P.z, 4, R, { any: tier !== 'ground', avoid: items, min: 4 });
      var y = s.y + 0.9 + (tier === 'sky' ? 4 + rnd() * 8 : 0);
      var mesh = new THREE.Mesh(starGeo, matGlow);
      mesh.position.set(s.x + 0.5, y, s.z + 0.5);
      G.scene.add(mesh);
      items.push({ x: s.x + 0.5, y: y, z: s.z + 0.5, mesh: mesh, got: false, ph: rnd() * 6 });
    }
    return { type: 'stars', total: n, done: 0, items: items, icon: 'star' };
  }
  function updateStars(c, dt) {
    var P = G.player, r = 1.45 + P.w;
    for (var i = 0; i < c.items.length; i++) {
      var it = c.items[i];
      if (it.got) continue;
      it.ph += dt;
      it.mesh.rotation.y += dt * 2.2; it.mesh.rotation.x = Math.sin(it.ph * 1.3) * 0.3;
      it.mesh.position.y = it.y + Math.sin(it.ph * 2) * 0.18;
      var dx = P.x - it.x, dz = P.z - it.z, dy = (P.y + P.h * 0.5) - it.y;
      if (dx * dx + dz * dz < r * r && Math.abs(dy) < P.h * 0.5 + 1.3) {
        it.got = true; G.scene.remove(it.mesh);
        c.done++;
        G.burst('confetti', it.x, it.y, it.z, 8);
        G.sound.star(c.done);
        progress();
      }
    }
  }

  // ================= OVOS =================
  function startEggs(level) {
    var P = G.player;
    var n = Math.min(6, 2 + Math.floor(level / 4));
    var R = Math.min(60, 12 + level * 1.6), rmin = Math.min(20, 5 + level * 0.5);
    var kinds = G.unlockedDinoKinds(level - 1);
    var items = [];
    for (var i = 0; i < n; i++) {
      var s = spotNear(P.x, P.z, rmin, R, { avoid: items, min: 6 });
      var egg = G.addCreature('egg', s.x + 0.5, s.y + 0.05, s.z + 0.5, {});
      egg.mission = true; egg.babyKind = kinds[Math.floor(rnd() * kinds.length)];
      items.push({ x: s.x + 0.5, y: s.y, z: s.z + 0.5, egg: egg });
    }
    return { type: 'eggs', total: n, done: 0, items: items, icon: 'egg' };
  }
  G.onEggHatched = function (egg) {
    var c = M.cur;
    if (c && c.type === 'eggs' && egg.mission && !c.finished) {
      c.done++;
      G.sound.play('hatch');
      progress();
    } else G.sound.play('hatch');
    G.saveDirty = true;
  };

  // ================= CONSTRUIR PELO MOLDE =================
  // letras: R vermelho, Y amarelo, B azul, G verde-lima, O laranja, P rosa, V roxo, W branco, K preto,
  //         S pedra, N tábuas, L folhas, A areia, T tijolo
  var LETTER = { R: B.RED, Y: B.YELLOW, B: B.BLUE, G: B.LIME, O: B.ORANGE, P: B.PINK, V: B.PURPLE, W: B.WHITE, K: B.BLACK,
    S: B.STONE, N: B.PLANKS, L: B.LEAVES, A: B.SAND, T: B.BRICK };
  var FALLBACK = {}; // enquanto a cor não está desbloqueada
  FALLBACK[B.LIME] = B.LEAVES; FALLBACK[B.ORANGE] = B.YELLOW; FALLBACK[B.PINK] = B.RED; FALLBACK[B.PURPLE] = B.BLUE; FALLBACK[B.BLACK] = B.STONE;
  var COLOR_LETTERS = 'RYBGOPV';
  var TEMPLATES = [
    { name: 'torre', rows: ['R', 'R', 'R'] },
    { name: 'quadrado', rows: ['YY', 'YY'] },
    { name: 'mais', rows: ['.B.', 'BBB', '.B.'] },
    { name: 'escada', rows: ['..R', '.RR', 'RRR'] },
    { name: 'arvorezinha', rows: ['.L.', 'LLL', '.N.', '.N.'] },
    { name: 'flor', rows: ['.R.', 'RYR', '.R.', '.L.', '.L.'] },
    { name: 'cubo', cells: [[0, 0, 0, 'Y'], [1, 0, 0, 'Y'], [0, 0, 1, 'Y'], [1, 0, 1, 'Y'], [0, 1, 0, 'Y'], [1, 1, 0, 'Y'], [0, 1, 1, 'Y'], [1, 1, 1, 'Y']] },
    { name: 'janela', rows: ['BBB', 'BWB', 'BBB'] },
    { name: 'coracaozinho', rows: ['R.R', 'RRR', 'RRR', '.R.'] },
    { name: 'piramide3d', cells: [[0, 0, 0, 'A'], [1, 0, 0, 'A'], [2, 0, 0, 'A'], [0, 0, 1, 'A'], [1, 0, 1, 'A'], [2, 0, 1, 'A'], [0, 0, 2, 'A'], [1, 0, 2, 'A'], [2, 0, 2, 'A'], [1, 1, 1, 'Y']] },
    { name: 'peixe', rows: ['O..OO.', 'OOOOWO', 'O..OO.'] },
    { name: 'arvore', rows: ['..L..', '.LLL.', 'LLLLL', '.LLL.', '..N..', '..N..'] },
    { name: 'foguetao', rows: ['.R.', 'RRR', 'WBW', 'WWW', 'WWW', 'R.R'] },
    { name: 'coracao', rows: ['.R.R.', 'RRRRR', 'RRRRR', '.RRR.', '..R..'] },
    { name: 'dino', rows: ['....GG.', '....GGG', 'G..GG..', 'GGGGG..', '.GGGG..', '.G..G..'] },
    { name: 'arco-iris', rows: ['.RRRRR.', 'RYYYYYR', 'RY...YR', 'RY...YR'] },
    { name: 'casa', rows: ['..T..', '.TTT.', 'TTTTT', 'NNNNN', 'NBNNN', 'NNN.N'] },
    { name: 'cara', rows: ['YYYYY', 'YKYKY', 'YYYYY', 'YRRRY', 'YYYYY'] },
    { name: 'estrela', rows: ['...Y...', '...Y...', 'YYYYYYY', '.YYYYY.', '..YYY..', '.YY.YY.', 'YY...YY'] },
    { name: 'piramide', rows: ['....A....', '...AAA...', '..AAAAA..', '.AAAAAAA.', 'AAAAAAAAA'] },
    { name: 'borboleta', rows: ['PP...PP', 'PVP.PVP', 'PPPKPPP', 'PVP.PVP', 'PP...PP'] },
    { name: 'coracao-grande', rows: ['.RR.RR.', 'RRRRRRR', 'RRRRRRR', '.RRRRR.', '..RRR..', '...R...'] },
    { name: 'castelo', rows: ['S.S.S.S', 'SSSSSSS', 'SSSSSSS', 'SSBSBSS', 'SSSSSSS', 'SSS.SSS'] },
    { name: 'flor-grande', rows: ['.PPP.', 'PPYPP', '.PPP.', '..L..', '.LL..', '..L..', '..L..'] },
    { name: 'barco', rows: ['...W...', '..WW...', '.WWW...', 'NNNNNNN', '.NNNNN.'] },
    { name: 'gato', rows: ['O...O', 'OOOOO', 'OWOWO', 'OOOOO', '.OOO.'] },
    { name: 'robo', rows: ['SSSSS', 'SBSBS', 'SSSSS', '.RRR.', '.RRR.', '.S.S.'] },
    { name: 'cogumelo', rows: ['.RRRRR.', 'RRWRWRR', 'RRRRRRR', '..WWW..', '..WWW..', '..WWW..'] }
  ];
  TEMPLATES.forEach(function (t) {
    if (!t.cells) {
      t.cells = [];
      for (var r = 0; r < t.rows.length; r++) for (var c = 0; c < t.rows[r].length; c++) {
        var ch = t.rows[r][c];
        if (ch !== '.') t.cells.push([c, t.rows.length - 1 - r, 0, ch]);
      }
    }
    t.size = t.cells.length;
  });
  M.TEMPLATES = TEMPLATES;

  function pickTemplate(level) {
    var target = Math.min(30, 3 + level * 0.9); // os moldes maiores têm cerca de 40 blocos
    var c = TEMPLATES.filter(function (t) { return t.size <= target * 1.3 && t.size >= target * 0.55 && t.name !== M.lastTemplate; });
    if (!c.length) {
      c = TEMPLATES.slice().sort(function (a, b) { return Math.abs(a.size - target) - Math.abs(b.size - target); })
        .filter(function (t) { return t.name !== M.lastTemplate; }).slice(0, 3);
    }
    return c[Math.floor(rnd() * c.length)];
  }

  function startBuild(level) {
    var P = G.player, t = pickTemplate(level);
    // mapa de cores (com troca de cores para variar a partir do nível 11)
    var avail = [B.RED, B.YELLOW, B.BLUE, B.LIME, B.ORANGE, B.PINK, B.PURPLE, B.CYAN].filter(function (b) { return G.HOTBAR.indexOf(b) >= 0; });
    var shift = level > 10 ? Math.floor(rnd() * avail.length) : 0, cmap = {};
    function blockFor(ch) {
      var id = LETTER[ch];
      if (shift && COLOR_LETTERS.indexOf(ch) >= 0) {
        if (cmap[ch] === undefined) { var base = avail.indexOf(id); cmap[ch] = avail[((base < 0 ? COLOR_LETTERS.indexOf(ch) : base) + shift) % avail.length]; }
        id = cmap[ch];
      }
      if (G.HOTBAR.indexOf(id) < 0) id = FALLBACK[id] || B.RED;
      return id;
    }
    var cells = null;
    for (var attempt = 0; attempt < 90 && !cells; attempt++) {
      var s = landSpot(P.x, P.z, 4, 14 + attempt * 0.35, {});
      if (!s) continue;
      var alongX = rnd() < 0.5, flip = rnd() < 0.5 ? -1 : 1, ok = true, list = [], seen = {};
      for (var i = 0; i < t.cells.length && ok; i++) {
        var q = t.cells[i];
        var x = s.x + (alongX ? q[0] * flip : q[2]), z = s.z + (alongX ? q[2] : q[0] * flip), y = s.y + q[1];
        if (x < 4 || z < 4 || x > G.W - 5 || z > G.D - 5 || y > G.H - 3) { ok = false; break; }
        var ck = x + ',' + z;
        if (!seen[ck]) {
          seen[ck] = true;
          var gy = G.groundY(x, z), top = G.blocks[G.idx(x, gy, z)];
          if (gy + 1 > s.y || s.y - (gy + 1) > 1 || !NATURAL[top] || G.isWater(x, gy + 1, z)) { ok = false; break; }
        }
        if (G.get(x, y, z) !== 0) { ok = false; break; }
        list.push({ x: x, y: y, z: z, id: blockFor(q[3]), done: false });
      }
      // não em cima do jogador
      if (ok) for (i = 0; i < list.length; i++) if (Math.abs(list[i].x + 0.5 - P.x) < 1.2 && Math.abs(list[i].z + 0.5 - P.z) < 1.2) ok = false;
      if (ok) cells = list;
    }
    if (!cells) return null;
    M.lastTemplate = t.name;
    var map = {}, cx = 0, cy = 0, cz = 0;
    cells.forEach(function (c) { map[G.idx(c.x, c.y, c.z)] = c; cx += c.x + 0.5; cy += c.y + 0.5; cz += c.z + 0.5; });
    var cur = { type: 'build', total: cells.length, done: 0, cells: cells, map: map, icon: 'build', exact: level >= 8,
      cx: cx / cells.length, cy: cy / cells.length, cz: cz / cells.length, mesh: null, ph: 0, template: t.name };
    rebuildGhost(cur);
    return cur;
  }
  function disposeGhost(c) {
    if (c.mesh) { G.scene.remove(c.mesh); c.mesh.geometry.dispose(); c.mesh = null; }
    if (c.lines) { G.scene.remove(c.lines); c.lines.geometry.dispose(); c.lines = null; }
  }
  function rebuildGhost(c) {
    disposeGhost(c);
    var A = { p: [], c: [], i: [] }, n = 0, L = [];
    var E = [[0, 0, 0, 1, 0, 0], [0, 1, 0, 1, 1, 0], [0, 0, 1, 1, 0, 1], [0, 1, 1, 1, 1, 1], [0, 0, 0, 0, 1, 0], [1, 0, 0, 1, 1, 0],
      [0, 0, 1, 0, 1, 1], [1, 0, 1, 1, 1, 1], [0, 0, 0, 0, 0, 1], [1, 0, 0, 1, 0, 1], [0, 1, 0, 0, 1, 1], [1, 1, 0, 1, 1, 1]];
    for (var i = 0; i < c.cells.length; i++) {
      var q = c.cells[i];
      if (q.done) continue;
      G.pushBox(A, 0.84, 0.84, 0.84, q.x + 0.5, q.y + 0.5, q.z + 0.5, G.BLOCK_COLORS[q.id][0]);
      for (var e = 0; e < 12; e++) {
        var s = E[e];
        L.push(q.x + 0.06 + s[0] * 0.88, q.y + 0.06 + s[1] * 0.88, q.z + 0.06 + s[2] * 0.88, q.x + 0.06 + s[3] * 0.88, q.y + 0.06 + s[4] * 0.88, q.z + 0.06 + s[5] * 0.88);
      }
      n++;
    }
    if (!n) return;
    c.mesh = new THREE.Mesh(G.geomFrom(A), matGhost);
    c.mesh.renderOrder = 3; c.mesh.frustumCulled = false;
    G.scene.add(c.mesh);
    var lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(L), 3));
    c.lines = new THREE.LineSegments(lg, matGhostLine);
    c.lines.renderOrder = 4; c.lines.frustumCulled = false;
    G.scene.add(c.lines);
  }
  function updateBuild(c, dt) {
    c.ph += dt;
    matGhost.opacity = 0.62 + Math.sin(c.ph * 3.2) * 0.16;
    var done = 0, changed = false;
    for (var i = 0; i < c.cells.length; i++) {
      var q = c.cells[i], ok = G.blocks[G.idx(q.x, q.y, q.z)] === q.id;
      if (ok !== q.done) { q.done = ok; changed = true; }
      if (ok) done++;
    }
    if (changed) {
      var up = done > c.done;
      c.done = done;
      rebuildGhost(c);
      if (up) progress();
      else G.ui.setMission(M.level, c);
    }
  }
  // célula do molde ainda por preencher nesta posição
  M.ghostCell = function (x, y, z) {
    var c = M.cur;
    if (!c || c.type !== 'build' || c.finished || !G.inBounds(x, y, z)) return null;
    var q = c.map[G.idx(x, y, z)];
    return q && !q.done ? q : null;
  };
  // primeira célula do molde atravessada pelo olhar (antes de bater num bloco)
  M.ghostRay = function (ox, oy, oz, dx, dy, dz, maxD) {
    var c = M.cur;
    if (!c || c.type !== 'build' || c.finished) return null;
    var x = Math.floor(ox), y = Math.floor(oy), z = Math.floor(oz);
    var sx = dx > 0 ? 1 : -1, sy = dy > 0 ? 1 : -1, sz = dz > 0 ? 1 : -1;
    var tdx = dx !== 0 ? Math.abs(1 / dx) : Infinity, tdy = dy !== 0 ? Math.abs(1 / dy) : Infinity, tdz = dz !== 0 ? Math.abs(1 / dz) : Infinity;
    var tmx = dx !== 0 ? (dx > 0 ? x + 1 - ox : ox - x) * tdx : Infinity;
    var tmy = dy !== 0 ? (dy > 0 ? y + 1 - oy : oy - y) * tdy : Infinity;
    var tmz = dz !== 0 ? (dz > 0 ? z + 1 - oz : oz - z) * tdz : Infinity;
    var t = 0;
    for (var i = 0; i < 60; i++) {
      if (tmx < tmy && tmx < tmz) { t = tmx; x += sx; tmx += tdx; }
      else if (tmy < tmz) { t = tmy; y += sy; tmy += tdy; }
      else { t = tmz; z += sz; tmz += tdz; }
      if (t > maxD) return null;
      if (!G.inBounds(x, y, z)) continue;
      var q = c.map[G.idx(x, y, z)];
      if (q && !q.done) return q;
      var b = G.blocks[G.idx(x, y, z)];
      if (b !== 0 && b !== B.WATER) return null;
    }
    return null;
  };
  // que bloco fica numa célula do molde: nos primeiros níveis qualquer bloco serve e fica da cor certa;
  // a partir do nível 8 é preciso escolher a cor certa (-1 = recusado)
  M.blockForGhost = function (cell, selected) {
    var c = M.cur;
    if (!c.exact) return cell.id;
    return selected === cell.id ? cell.id : -1;
  };

  // ================= BEBÉ PERDIDO =================
  function startBaby(level) {
    var P = G.player;
    var mums = G.creatures.filter(function (c) { return c.sp.dino && !c.sp.flies && !c.baby && !c.dead && !c.sp.egg; });
    if (!mums.length) return null;
    var free = mums.filter(function (c) { return !c.ridden; });
    var mum = (free.length ? free : mums)[Math.floor(rnd() * (free.length ? free.length : mums.length))];
    var n = 1 + (level >= 14 ? 1 : 0) + (level >= 30 ? 1 : 0);
    var dmin = Math.min(40, 12 + level * 0.8), dmax = Math.min(70, 20 + level * 1.5);
    var items = [];
    // bebés de missões anteriores que ficaram com as mães: só os 3 mais recentes
    var fam = G.creatures.filter(function (c) { return c.family; });
    for (var k = 0; k < fam.length - 2; k++) G.removeCreature(fam[k]);
    for (var i = 0; i < n; i++) {
      var s = null;
      for (var t = 0; t < 12 && !s; t++) {
        var q = landSpot(mum.x, mum.z, dmin, dmax, { avoid: items, min: 8 });
        if (q && (Math.abs(q.x - P.x) > 7 || Math.abs(q.z - P.z) > 7)) s = q;
      }
      if (!s) s = spotNear(mum.x, mum.z, 8, dmax, { avoid: items, min: 5 });
      var b = G.addCreature(mum.kind, s.x + 0.5, s.y + 0.05, s.z + 0.5, { scale: 0.38, baby: true, tint: mum.tint });
      b.lost = true; b.bigStep = true;
      items.push({ x: s.x + 0.5, z: s.z + 0.5, baby: b, found: false, home: false, marker: makeMarker() });
    }
    return { type: 'baby', total: n * 2, done: 0, items: items, mum: mum, icon: 'baby:' + mum.kind, mumMarker: null, ph: 0 };
  }
  function updateBaby(c, dt) {
    var P = G.player, mum = c.mum;
    c.ph += dt;
    var bob = Math.sin(c.ph * 3) * 0.15, anyFound = false;
    if (mum.dead) { finish(c); return; } // a ilha mudou: não prende a criança
    for (var i = 0; i < c.items.length; i++) {
      var it = c.items[i], b = it.baby;
      if (it.home) continue;
      if (!it.found) {
        it.marker.position.set(b.x, b.y + b.h + 1.0 + bob, b.z);
        var dx = P.x - b.x, dz = P.z - b.z, dy = P.y - b.y;
        if (dx * dx + dz * dz < 3.2 * 3.2 && Math.abs(dy) < 4) {
          it.found = true; b.lost = false; b.lead = true; b.followTarget = P; b.stopAt = 2.6 + i * 0.8; b.happy = 1;
          G.scene.remove(it.marker); it.marker = null;
          G.burst('heart', b.x, b.y + 1, b.z, 5);
          G.sound.play('hatch'); G.sound.voice(b.sp.voice, true, 1);
          c.done++; c.icon = 'mum:' + mum.kind;
          progress();
        }
      } else {
        anyFound = true;
        var mx = mum.x - b.x, mz = mum.z - b.z;
        var px = mum.x - P.x, pz = mum.z - P.z;
        if (mx * mx + mz * mz < 5 * 5 || px * px + pz * pz < 3.5 * 3.5) {
          it.home = true; b.lead = false; b.followTarget = mum; b.stopAt = 2.2 + i * 0.7; b.family = true; b.happy = 1.2;
          mum.happy = 1.2;
          G.burst('heart', mum.x, mum.y + mum.h + 0.5, mum.z, 6); G.burst('heart', b.x, b.y + 1, b.z, 4);
          G.sound.voice(mum.sp.voice, false, 1);
          c.done++;
          progress();
        }
      }
    }
    if (anyFound && !c.finished) {
      if (!c.mumMarker) c.mumMarker = makeMarker();
      c.mumMarker.position.set(mum.x, mum.y + mum.h + 1.4 + bob, mum.z);
      c.mumMarker.scale.setScalar(1.6);
    }
  }

  // ================= ciclo das missões =================
  function cleanup(c) {
    if (!c) return;
    if (c.type === 'stars') c.items.forEach(function (it) { if (!it.got) G.scene.remove(it.mesh); });
    if (c.type === 'eggs') c.items.forEach(function (it) { if (!it.egg.dead) G.removeCreature(it.egg); });
    if (c.type === 'build') disposeGhost(c);
    if (c.type === 'baby') {
      c.items.forEach(function (it) {
        if (it.marker) G.scene.remove(it.marker);
        if (!it.home && !it.baby.dead) G.removeCreature(it.baby); // missão saltada: o bebé volta para casa sozinho
      });
      if (c.mumMarker) G.scene.remove(c.mumMarker);
    }
  }

  function pickType(level, exclude) {
    if (level <= TYPES.length && !exclude) return TYPES[level - 1];
    var c = TYPES.filter(function (t) { return t !== exclude && t !== M.lastType; });
    if (!c.length) c = TYPES.filter(function (t) { return t !== exclude; });
    return c[Math.floor(rnd() * c.length)];
  }

  M.start = function (level, exclude) {
    ensureAssets();
    cleanup(M.cur);
    M.level = level; M.phase = 'play'; M.idle = 0;
    var type = pickType(level, exclude), cur = null;
    if (type === 'build') cur = startBuild(level);
    else if (type === 'baby') cur = startBaby(level);
    else if (type === 'eggs') cur = startEggs(level);
    if (!cur) { type = 'stars'; cur = startStars(level); }
    M.cur = cur; M.lastType = cur.type;
    G.ui.setMission(level, cur);
    G.ui.setCompass(null);
  };

  M.reset = function () { cleanup(M.cur); M.cur = null; M.phase = 'play'; G.ui.hideUnlock(); G.ui.hideLevelUp(); };

  M.skip = function () {
    if (M.phase !== 'play' || !M.cur) return;
    G.sound.play('fly');
    M.start(M.level, M.cur.type);
  };

  function progress() {
    var c = M.cur;
    M.idle = 0;
    G.ui.setCompass(null);
    G.ui.setMission(M.level, c, true);
    if (c.done >= c.total && !c.finished) finish(c);
  }
  function finish(c) {
    c.finished = true;
    if (c.type === 'baby' && c.mumMarker) { G.scene.remove(c.mumMarker); c.mumMarker = null; }
    M.phase = 'cheer'; M.timer = 3.0;
    G.sound.play('win');
    if (G.celebrate) G.celebrate(3.5);
    G.ui.levelUp(M.level + 1);
  }

  // o que se ganha ao concluir "done" níveis (ou null)
  M.unlockFor = function (done) {
    var blocks = G.blocksUnlockedAt(done);
    if (blocks.length) return { blocks: blocks };
    for (var i = 0; i < G.DINO_UNLOCKS.length; i++) if (G.DINO_UNLOCKS[i][0] === done) return { dino: G.DINO_UNLOCKS[i][1], tint: 0 };
    if (done >= G.VARIANT_FROM && (done - G.VARIANT_FROM) % 5 === 0) {
      var n = (done - G.VARIANT_FROM) / 5;
      if (n < G.VARIANT_MAX) { var v = G.variantFor(n); return { dino: v.kind, tint: v.tint }; }
    }
    return null;
  };
  function giveUnlock(u) {
    var P = G.player;
    if (u.blocks) {
      G.setUnlockedBlocks(M.level - 1);
      G.ui.refreshHotbar();
      G.ui.showUnlock(u.blocks.map(function (b) { return G.ui.blockIcon(b); }));
    } else {
      var s = spotNear(P.x, P.z, 3, 7, {});
      var c = G.addCreature(u.dino, s.x + 0.5, s.y + 0.05, s.z + 0.5, { tint: u.tint });
      c.happy = 1.5; c.state = 'idle'; c.timer = 8;
      G.burst('confetti', c.x, c.y + c.h, c.z, 20);
      G.sound.voice(c.sp.voice, false, 1);
      G.ui.showUnlock([G.thumbs[u.dino] || G.thumbs.star]);
    }
    G.sound.play('unlock');
  }

  M.update = function (dt) {
    var c = M.cur;
    if (!c) return;
    if (M.phase === 'cheer') {
      M.timer -= dt;
      if (M.timer <= 0) {
        M.level++;
        if (G.onLevelChanged) G.onLevelChanged(M.level);
        var u = M.unlockFor(M.level - 1);
        if (u) { giveUnlock(u); M.phase = 'gift'; M.timer = 3.4; }
        else M.start(M.level);
      }
      return;
    }
    if (M.phase === 'gift') {
      M.timer -= dt;
      if (M.timer <= 0) { G.ui.hideUnlock(); M.start(M.level); }
      return;
    }
    if (c.type === 'stars') updateStars(c, dt);
    else if (c.type === 'build') updateBuild(c, dt);
    else if (c.type === 'baby') updateBaby(c, dt);
    else if (c.type === 'eggs') {
      // um ovo que desapareça sem chocar (por exemplo ilha nova) não bloqueia a missão
      var alive = 0;
      for (var i = 0; i < c.items.length; i++) if (!c.items[i].egg.dead) alive++;
      if (alive === 0 && c.done < c.total && !c.finished) { c.done = c.total; progress(); }
    }
    // ajuda: se passar muito tempo sem progresso, uma seta aponta o caminho
    if (M.phase !== 'play' || c.finished) return;
    M.idle += dt;
    var wait = Math.min(60, 22 + M.level);
    if (M.idle > wait) {
      var t = M.nearest();
      if (t) {
        var P = G.player, dx = t.x - P.x, dz = t.z - P.z;
        var fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw), rx = Math.cos(P.yaw), rz = -Math.sin(P.yaw);
        G.ui.setCompass(Math.atan2(dx * rx + dz * rz, dx * fx + dz * fz), Math.sqrt(dx * dx + dz * dz) < 4);
      }
    }
  };

  // alvo mais próximo da missão atual (para a seta de ajuda)
  M.nearest = function () {
    var c = M.cur, P = G.player, best = null, bd = 1e9;
    if (!c) return null;
    function consider(x, z) { var d = (x - P.x) * (x - P.x) + (z - P.z) * (z - P.z); if (d < bd) { bd = d; best = { x: x, z: z }; } }
    if (c.type === 'stars') c.items.forEach(function (it) { if (!it.got) consider(it.x, it.z); });
    else if (c.type === 'eggs') c.items.forEach(function (it) { if (!it.egg.dead) consider(it.egg.x, it.egg.z); });
    else if (c.type === 'build') consider(c.cx, c.cz);
    else if (c.type === 'baby') {
      var carrying = false;
      c.items.forEach(function (it) { if (it.found && !it.home) carrying = true; });
      if (carrying) consider(c.mum.x, c.mum.z);
      else c.items.forEach(function (it) { if (!it.found) consider(it.baby.x, it.baby.z); });
    }
    return best;
  };

  // ---------- miniaturas dos modelos 3D para os cartões ----------
  G.thumbs = {};
  G.makeThumbs = function () {
    ensureAssets();
    var size = 128, r;
    try { r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); } catch (e) { return; }
    r.outputColorSpace = THREE.LinearSRGBColorSpace;
    r.setPixelRatio(1); r.setSize(size, size, false); r.setClearColor(0x000000, 0);
    var scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    function shot(obj, h, lookY) {
      scene.add(obj);
      cam.position.set(h * 1.25, lookY + h * 0.35, h * 1.75); cam.lookAt(0, lookY, 0.1);
      r.render(scene, cam);
      var url = r.domElement.toDataURL();
      scene.remove(obj);
      return url;
    }
    var old = G.matCreature.color.getHex();
    G.matCreature.color.setHex(0xffffff);
    var star = new THREE.Mesh(starGeo, matGlow); star.rotation.set(0.3, 0.6, 0.2);
    G.thumbs.star = shot(star, 1.15, 0);
    ['egg', 'rex', 'tricera', 'bronto', 'stego', 'spino', 'anky', 'para', 'ptero'].forEach(function (k) {
      var sp = G.SPECIES[k], m = G.buildModel(k, 1).root;
      m.rotation.y = -0.45;
      var h = sp.thumbH || Math.max(sp.h * 1.25, 1.1);
      G.thumbs[k] = shot(m, h, h * 0.45);
    });
    G.matCreature.color.setHex(old);
    r.dispose();
    try { r.forceContextLoss(); } catch (e) { /* opcional */ }
  };
})();
