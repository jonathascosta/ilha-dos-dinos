/* Ilha dos Dinos — mundo de blocos: tipos, geração e acesso. */
(function () {
  'use strict';
  var G = (window.G = window.G || {});

  // ---------- dimensões ----------
  var W = 128, D = 128, H = 64, SEA = 12, CH = 16;
  G.W = W; G.D = D; G.H = H; G.SEA = SEA; G.CH = CH;

  // ---------- tipos de bloco ----------
  var B = {
    AIR: 0, GRASS: 1, DIRT: 2, STONE: 3, SAND: 4, WATER: 5, WOOD: 6, LEAVES: 7,
    PLANKS: 8, BRICK: 9, SNOW: 10, GLOW: 11, RED: 12, ORANGE: 13, YELLOW: 14,
    LIME: 15, BLUE: 16, PURPLE: 17, PINK: 18, WHITE: 19, BASALT: 20, PALM: 21,
    BLACK: 22, CYAN: 23, GOLD: 24
  };
  G.B = B;

  // cores [topo, lado, fundo]
  var COLORS = [];
  function def(id, top, side, bottom) { COLORS[id] = [top, side === undefined ? top : side, bottom === undefined ? (side === undefined ? top : side) : bottom]; }
  def(B.AIR, 0);
  def(B.GRASS, 0x6fcf4a, 0x9b7448, 0x8a6238);
  def(B.DIRT, 0x9b7448);
  def(B.STONE, 0x9aa3ad);
  def(B.SAND, 0xf3df9b);
  def(B.WATER, 0x3aa8f0);
  def(B.WOOD, 0xc49a5c, 0x8a5a33, 0xc49a5c);
  def(B.LEAVES, 0x3fae52);
  def(B.PLANKS, 0xe0b574);
  def(B.BRICK, 0xc9553f);
  def(B.SNOW, 0xf6fbff);
  def(B.GLOW, 0xffa01e, 0xff7a12, 0xff7a12);
  def(B.RED, 0xf04848);
  def(B.ORANGE, 0xff9838);
  def(B.YELLOW, 0xffdc3c);
  def(B.LIME, 0x9be03c);
  def(B.BLUE, 0x4878f0);
  def(B.PURPLE, 0xa45ce8);
  def(B.PINK, 0xff8cc8);
  def(B.WHITE, 0xf4f4f0);
  def(B.BASALT, 0x5a5560);
  def(B.PALM, 0x7ed05a);
  def(B.BLACK, 0x33333c);
  def(B.CYAN, 0x4fe0e0);
  def(B.GOLD, 0xffc61e, 0xf0a800, 0xd89400);
  G.BLOCK_COLORS = COLORS;

  // blocos que a criança pode colocar (ordem da barra) e nível concluído que os desbloqueia
  var BLOCK_ORDER = [
    [B.GRASS, 0], [B.DIRT, 0], [B.STONE, 0], [B.SAND, 0], [B.WOOD, 0], [B.PLANKS, 0], [B.BRICK, 0], [B.LEAVES, 0], [B.SNOW, 0],
    [B.RED, 0], [B.ORANGE, 5], [B.YELLOW, 0], [B.LIME, 5], [B.BLUE, 0], [B.CYAN, 25], [B.PURPLE, 5], [B.PINK, 5], [B.WHITE, 0],
    [B.BLACK, 25], [B.GOLD, 25], [B.GLOW, 15], [B.WATER, 15]
  ];
  G.BLOCK_ORDER = BLOCK_ORDER;
  G.HOTBAR = [];
  // "done" = número de níveis concluídos
  G.setUnlockedBlocks = function (done) {
    G.HOTBAR = BLOCK_ORDER.filter(function (b) { return b[1] <= done; }).map(function (b) { return b[0]; });
  };
  G.setUnlockedBlocks(0);
  G.blocksUnlockedAt = function (done) {
    return BLOCK_ORDER.filter(function (b) { return b[1] === done; }).map(function (b) { return b[0]; });
  };

  // ---------- aleatório com semente ----------
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  G.mulberry32 = mulberry32;

  function hash2(x, z, seed) {
    var h = Math.imul(x | 0, 374761393) + Math.imul(z | 0, 668265263) + Math.imul(seed | 0, 1442695041);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }
  G.hash3 = function (x, y, z) {
    var h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(z | 0, 2147483647);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };

  function vnoise(x, z, seed) {
    var x0 = Math.floor(x), z0 = Math.floor(z);
    var fx = x - x0, fz = z - z0;
    fx = fx * fx * (3 - 2 * fx); fz = fz * fz * (3 - 2 * fz);
    var a = hash2(x0, z0, seed), b = hash2(x0 + 1, z0, seed);
    var c = hash2(x0, z0 + 1, seed), d = hash2(x0 + 1, z0 + 1, seed);
    return a + (b - a) * fx + (c - a) * fz + (a - b - c + d) * fx * fz;
  }
  function fbm(x, z, seed) {
    return (vnoise(x, z, seed) * 0.55 + vnoise(x * 2.1, z * 2.1, seed + 17) * 0.3 + vnoise(x * 4.3, z * 4.3, seed + 31) * 0.15);
  }
  function smooth(a, b, t) { t = Math.max(0, Math.min(1, (t - a) / (b - a))); return t * t * (3 - 2 * t); }

  // ---------- armazenamento ----------
  var blocks = new Uint8Array(W * D * H);
  var colTop = new Uint8Array(W * D); // y mais alto não vazio por coluna
  G.blocks = blocks; G.colTop = colTop;

  function idx(x, y, z) { return (((x << 7) | z) << 6) | y; }
  G.idx = idx;

  // leitura com limites: fora do mapa na horizontal = pedra abaixo do mar / ar acima
  function get(x, y, z) {
    if (y < 0) return B.STONE;
    if (y >= H) return B.AIR;
    if (x < 0 || z < 0 || x >= W || z >= D) return -1;
    return blocks[(((x << 7) | z) << 6) | y];
  }
  G.get = get;
  G.inBounds = function (x, y, z) { return x >= 0 && z >= 0 && x < W && z < D && y >= 0 && y < H; };

  G.isSolid = function (x, y, z) {
    if (y < 0) return true;
    if (y >= H) return false;
    if (x < 0 || z < 0 || x >= W || z >= D) return true; // paredes invisíveis
    var b = blocks[(((x << 7) | z) << 6) | y];
    return b !== 0 && b !== 5;
  };
  G.isWater = function (x, y, z) {
    if (y < 0 || y >= H) return false;
    if (x < 0 || z < 0 || x >= W || z >= D) return y <= SEA;
    return blocks[(((x << 7) | z) << 6) | y] === 5;
  };

  function rawSet(x, y, z, id) {
    if (x < 0 || z < 0 || x >= W || z >= D || y < 0 || y >= H) return;
    blocks[idx(x, y, z)] = id;
  }
  function recomputeTop(x, z) {
    var base = ((x << 7) | z) << 6, y = H - 1;
    while (y > 0 && blocks[base | y] === 0) y--;
    colTop[(x << 7) | z] = y;
  }
  G.recomputeTop = recomputeTop;

  // altura do chão sólido (topo) numa coluna
  G.groundY = function (x, z) {
    x |= 0; z |= 0;
    if (x < 0 || z < 0 || x >= W || z >= D) return 0;
    var base = ((x << 7) | z) << 6, y = colTop[(x << 7) | z];
    while (y > 0) { var b = blocks[base | y]; if (b !== 0 && b !== 5) break; y--; }
    return y;
  };

  // ---------- geração ----------
  G.generate = function (seed) {
    blocks.fill(0);
    var rnd = mulberry32(seed);
    var cx = W / 2, cz = D / 2;
    var vx = cx + 26, vz = cz - 22, VR = 13; // vulcão
    var heights = new Int16Array(W * D);
    var x, z, y;

    for (x = 0; x < W; x++) {
      for (z = 0; z < D; z++) {
        var dx = (x - cx) / 66, dz = (z - cz) / 66;
        var d = Math.sqrt(dx * dx + dz * dz) + (vnoise(x / 14, z / 14, seed + 5) - 0.5) * 0.22;
        var mask = 1 - smooth(0.45, 1.0, d);
        var e = fbm(x / 44, z / 44, seed);
        var hills = e * e * 26;
        var h = SEA - 6 + mask * (8.5 + hills);
        // planície junto ao ponto de partida
        var sd = Math.sqrt((x - cx) * (x - cx) + (z - cz) * (z - cz));
        var flat = 1 - smooth(6, 16, sd);
        h = h * (1 - flat) + (SEA + 4) * flat;
        var vol = 0;
        var vd = Math.sqrt((x - vx) * (x - vx) + (z - vz) * (z - vz));
        if (vd < VR) {
          var cone = SEA + 3 + (VR - vd) * 1.9;
          if (cone > 34) cone = 34;
          if (vd < 3.2) cone = 29;
          if (cone > h) { h = cone; vol = vd < 3.2 ? 2 : 1; }
        }
        h = Math.max(2, Math.min(H - 16, Math.round(h)));
        heights[x * D + z] = h;
        var top, under;
        if (vol === 2) { top = B.GLOW; under = B.GLOW; }
        else if (vol === 1) { top = (vd < 10 && vd > 3.2 && vnoise(Math.atan2(z - vz, x - vx) * 2.4, vd * 0.08, seed + 9) > 0.78) ? B.GLOW : B.BASALT; under = B.BASALT; }
        else if (h <= SEA + 1) { top = B.SAND; under = B.SAND; }
        else if (h > SEA + 25) { top = B.SNOW; under = B.STONE; }
        else if (h > SEA + 19) { top = B.STONE; under = B.STONE; }
        else { top = B.GRASS; under = B.DIRT; }
        var base = ((x << 7) | z) << 6;
        for (y = 0; y <= h; y++) {
          blocks[base | y] = y === h ? top : (y >= h - 3 ? under : B.STONE);
        }
        for (y = h + 1; y <= SEA; y++) blocks[base | y] = B.WATER;
      }
    }

    function hAt(px, pz) { return heights[px * D + pz]; }
    function topIs(px, pz, id) { return blocks[idx(px, hAt(px, pz), pz)] === id; }

    // ---------- árvores ----------
    var trees = [];
    function farFromTrees(px, pz, min) {
      for (var i = 0; i < trees.length; i++) {
        var ddx = trees[i][0] - px, ddz = trees[i][1] - pz;
        if (ddx * ddx + ddz * ddz < min * min) return false;
      }
      return true;
    }
    function leaf(px, py, pz, id) { if (get(px, py, pz) === 0) rawSet(px, py, pz, id); }
    var tries = 0;
    while (trees.length < 95 && tries++ < 5000) {
      var tx = 6 + Math.floor(rnd() * (W - 12)), tz = 6 + Math.floor(rnd() * (D - 12));
      var th = hAt(tx, tz);
      var sdist = Math.sqrt((tx - cx) * (tx - cx) + (tz - cz) * (tz - cz));
      if (sdist < 9) continue;
      if (!farFromTrees(tx, tz, 5)) continue;
      if (topIs(tx, tz, B.GRASS)) {
        var hgt = 4 + Math.floor(rnd() * 3);
        var kind = rnd();
        for (y = 1; y <= hgt; y++) rawSet(tx, th + y, tz, B.WOOD);
        var ty = th + hgt;
        if (kind < 0.7) { // copa redonda
          for (var ax = -2; ax <= 2; ax++) for (var az = -2; az <= 2; az++) for (var ay = -1; ay <= 2; ay++) {
            var r2 = ax * ax + az * az + ay * ay * 1.6;
            if (r2 <= 5.2) leaf(tx + ax, ty + ay, tz + az, B.LEAVES);
          }
        } else { // pinheiro
          for (var lay = 0; lay < 4; lay++) {
            var rad = lay < 2 ? 2 : 1;
            for (ax = -rad; ax <= rad; ax++) for (az = -rad; az <= rad; az++) {
              if (Math.abs(ax) + Math.abs(az) <= rad + (lay % 2 === 0 ? 1 : 0)) leaf(tx + ax, ty - 2 + lay, tz + az, B.LEAVES);
            }
          }
          leaf(tx, ty + 2, tz, B.LEAVES);
        }
        trees.push([tx, tz]);
      } else if (topIs(tx, tz, B.SAND) && th >= SEA && rnd() < 0.45) { // palmeira
        var ph = 5 + Math.floor(rnd() * 2);
        for (y = 1; y <= ph; y++) rawSet(tx, th + y, tz, B.WOOD);
        var py = th + ph;
        for (var k = 1; k <= 3; k++) {
          leaf(tx + k, py + (k === 3 ? -1 : 0), tz, B.PALM); leaf(tx - k, py + (k === 3 ? -1 : 0), tz, B.PALM);
          leaf(tx, py + (k === 3 ? -1 : 0), tz + k, B.PALM); leaf(tx, py + (k === 3 ? -1 : 0), tz - k, B.PALM);
        }
        leaf(tx, py + 1, tz, B.PALM);
        leaf(tx + 1, py, tz + 1, B.PALM); leaf(tx - 1, py, tz - 1, B.PALM);
        leaf(tx + 1, py, tz - 1, B.PALM); leaf(tx - 1, py, tz + 1, B.PALM);
        trees.push([tx, tz]);
      }
    }

    // ---------- cabana junto ao ponto de partida ----------
    var hx = cx + 5, hz = cz - 2, hy = SEA + 4;
    for (x = -3; x <= 3; x++) for (z = -3; z <= 3; z++) {
      var gx = hx + x, gz = hz + z;
      for (y = hy + 1; y < hy + 9; y++) rawSet(gx, y, gz, B.AIR);
      rawSet(gx, hy, gz, (Math.abs(x) <= 2 && Math.abs(z) <= 2) ? B.PLANKS : B.GRASS);
      for (y = hy - 3; y < hy; y++) if (get(gx, y, gz) === 0 || get(gx, y, gz) === B.WATER) rawSet(gx, y, gz, B.DIRT);
    }
    for (x = -2; x <= 2; x++) for (z = -2; z <= 2; z++) {
      var edge = Math.abs(x) === 2 || Math.abs(z) === 2;
      if (edge) {
        for (y = 1; y <= 3; y++) {
          var isDoor = (x === -2 && z === 0 && y <= 2);
          var isWin = (y === 2 && ((z === 2 && x === 0) || (z === -2 && x === 0) || (x === 2 && z === 0)));
          if (!isDoor && !isWin) rawSet(hx + x, hy + y, hz + z, (Math.abs(x) === 2 && Math.abs(z) === 2) ? B.WOOD : B.PLANKS);
        }
      }
    }
    for (x = -3; x <= 3; x++) for (z = -3; z <= 3; z++) rawSet(hx + x, hy + 4, hz + z, B.BRICK);
    for (x = -2; x <= 2; x++) for (z = -2; z <= 2; z++) rawSet(hx + x, hy + 5, hz + z, B.BRICK);
    for (x = -1; x <= 1; x++) for (z = -1; z <= 1; z++) rawSet(hx + x, hy + 6, hz + z, B.BRICK);

    for (x = 0; x < W; x++) for (z = 0; z < D; z++) recomputeTop(x, z);

    G.spawn = { x: cx - 2.5, y: SEA + 5.01, z: cz + 0.5, yaw: -Math.PI / 2 };
    G.volcano = { x: vx, z: vz };

    // ---------- locais para ovos e criaturas (determinísticos) ----------
    var spots = [], guard = 0;
    while (spots.length < 60 && guard++ < 8000) {
      var qx = 8 + Math.floor(rnd() * (W - 16)), qz = 8 + Math.floor(rnd() * (D - 16));
      var qy = G.groundY(qx, qz);
      var tb = blocks[idx(qx, qy, qz)];
      if (tb !== B.GRASS && tb !== B.SAND) continue;
      if (qy < SEA) continue;
      if (get(qx, qy + 1, qz) !== 0 || get(qx, qy + 2, qz) !== 0) continue;
      var qd = Math.sqrt((qx - cx) * (qx - cx) + (qz - cz) * (qz - cz));
      if (qd < 10) continue;
      var ok = true;
      for (var s = 0; s < spots.length; s++) {
        var sx = spots[s].x - qx, sz = spots[s].z - qz;
        if (sx * sx + sz * sz < 81) { ok = false; break; }
      }
      if (ok) spots.push({ x: qx, y: qy + 1, z: qz, d: qd, sand: tb === B.SAND });
    }
    G.spots = spots;
  };

  // ---------- alterações do jogador ----------
  G.mods = {}; // índice -> id
  G.dirtyChunks = {};
  function markDirty(x, z) {
    var cxk = x >> 4, czk = z >> 4;
    G.dirtyChunks[cxk + ',' + czk] = true;
    var lx = x & 15, lz = z & 15;
    if (lx === 0 && cxk > 0) G.dirtyChunks[(cxk - 1) + ',' + czk] = true;
    if (lx === 15 && cxk < W / CH - 1) G.dirtyChunks[(cxk + 1) + ',' + czk] = true;
    if (lz === 0 && czk > 0) G.dirtyChunks[cxk + ',' + (czk - 1)] = true;
    if (lz === 15 && czk < D / CH - 1) G.dirtyChunks[cxk + ',' + (czk + 1)] = true;
    // cantos (oclusão ambiente)
    if (lx === 0 && lz === 0 && cxk > 0 && czk > 0) G.dirtyChunks[(cxk - 1) + ',' + (czk - 1)] = true;
    if (lx === 15 && lz === 15) G.dirtyChunks[(cxk + 1) + ',' + (czk + 1)] = true;
    if (lx === 0 && lz === 15 && cxk > 0) G.dirtyChunks[(cxk - 1) + ',' + (czk + 1)] = true;
    if (lx === 15 && lz === 0 && czk > 0) G.dirtyChunks[(cxk + 1) + ',' + (czk - 1)] = true;
  }
  G.setBlock = function (x, y, z, id, silent) {
    if (!G.inBounds(x, y, z)) return false;
    if (y === 0) return false; // o fundo do mundo não se parte
    var i = idx(x, y, z);
    if (blocks[i] === id) return false;
    blocks[i] = id;
    if (!silent) { G.mods[i] = id; G.saveDirty = true; }
    recomputeTop(x, z);
    markDirty(x, z);
    return true;
  };
  G.applyMods = function (mods) {
    G.mods = {};
    for (var k in mods) {
      var i = +k, id = mods[k] | 0;
      if (i >= 0 && i < blocks.length && id >= 0 && id < COLORS.length) { blocks[i] = id; G.mods[i] = id; }
    }
    for (var x = 0; x < W; x++) for (var z = 0; z < D; z++) recomputeTop(x, z);
  };
})();
