/* Ilha dos Dinos — renderização: cena, malhas dos blocos, céu. */
(function () {
  'use strict';
  var G = window.G, THREE = window.THREE;
  var W = G.W, D = G.D, H = G.H, CH = G.CH, SEA = G.SEA;
  THREE.ColorManagement.enabled = false; // cores tal como escritas, sem conversões

  // faces: normal n, tangentes u, v (u × v = n)
  var FACES = [
    { n: [1, 0, 0], u: [0, 1, 0], v: [0, 0, 1], shade: 0.82, ci: 1 },
    { n: [-1, 0, 0], u: [0, 0, 1], v: [0, 1, 0], shade: 0.82, ci: 1 },
    { n: [0, 1, 0], u: [0, 0, 1], v: [1, 0, 0], shade: 1.0, ci: 0 },
    { n: [0, -1, 0], u: [1, 0, 0], v: [0, 0, 1], shade: 0.55, ci: 2 },
    { n: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0], shade: 0.68, ci: 1 },
    { n: [0, 0, -1], u: [0, 1, 0], v: [1, 0, 0], shade: 0.68, ci: 1 }
  ];
  var CORNERS = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  var AO_LEVEL = [0.52, 0.7, 0.86, 1.0];

  var COLRGB = G.BLOCK_COLORS.map(function (c) {
    return c.map(function (hex) { return [((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255]; });
  });

  function occl(x, y, z) { // conta para a oclusão ambiente?
    if (y < 0) return 1;
    if (y >= H) return 0;
    if (x < 0 || z < 0 || x >= W || z >= D) return 0;
    var b = G.blocks[(((x << 7) | z) << 6) | y];
    return (b !== 0 && b !== 5) ? 1 : 0;
  }

  // arrays de trabalho reutilizados
  var P = [], C = [], U = [], I = [];
  var WP = [], WC = [], WU = [], WI = [];

  function buildChunkArrays(cx, cz) {
    P.length = C.length = U.length = I.length = 0;
    WP.length = WC.length = WU.length = WI.length = 0;
    var blocks = G.blocks, colTop = G.colTop, get = G.get, hash3 = G.hash3;
    var x0 = cx * CH, z0 = cz * CH;
    var ao = [0, 0, 0, 0];
    for (var x = x0; x < x0 + CH; x++) {
      for (var z = z0; z < z0 + CH; z++) {
        var top = colTop[(x << 7) | z];
        var base = ((x << 7) | z) << 6;
        for (var y = 0; y <= top; y++) {
          var b = blocks[base | y];
          if (b === 0) continue;
          var water = b === 5;
          var jit = water ? 1 : 0.955 + hash3(x, y, z) * 0.09;
          for (var f = 0; f < 6; f++) {
            var F = FACES[f], n = F.n;
            var nb = get(x + n[0], y + n[1], z + n[2]);
            if (water) { if (nb !== 0) continue; }
            else if (!(nb === 0 || nb === 5)) continue;
            var u = F.u, v = F.v;
            var col = COLRGB[b][F.ci];
            var px = x + 0.5 + n[0] * 0.5, py = y + 0.5 + n[1] * 0.5, pz = z + 0.5 + n[2] * 0.5;
            var AP = water ? WP : P, AC = water ? WC : C, AU = water ? WU : U, AI = water ? WI : I;
            var vi = AP.length / 3;
            var drop = (water && f === 2) ? 0.12 : 0;
            for (var c = 0; c < 4; c++) {
              var su = CORNERS[c][0], sv = CORNERS[c][1];
              var a = 3;
              if (!water) {
                var bx = x + n[0], by = y + n[1], bz = z + n[2];
                var s1 = occl(bx + su * u[0], by + su * u[1], bz + su * u[2]);
                var s2 = occl(bx + sv * v[0], by + sv * v[1], bz + sv * v[2]);
                var cr = occl(bx + su * u[0] + sv * v[0], by + su * u[1] + sv * v[1], bz + su * u[2] + sv * v[2]);
                a = (s1 && s2) ? 0 : 3 - (s1 + s2 + cr);
              }
              ao[c] = a;
              var sh = F.shade * AO_LEVEL[a] * jit;
              AP.push(px + 0.5 * (su * u[0] + sv * v[0]), py + 0.5 * (su * u[1] + sv * v[1]) - drop, pz + 0.5 * (su * u[2] + sv * v[2]));
              AC.push(col[0] * sh, col[1] * sh, col[2] * sh);
              AU.push((su + 1) / 2, (sv + 1) / 2);
            }
            if (ao[0] + ao[2] > ao[1] + ao[3]) AI.push(vi, vi + 1, vi + 2, vi, vi + 2, vi + 3);
            else AI.push(vi + 1, vi + 2, vi + 3, vi + 1, vi + 3, vi);
          }
        }
      }
    }
  }

  function makeGeometry(p, c, u, i) {
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(p), 3));
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(c), 3));
    g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(u), 2));
    g.setIndex(new THREE.BufferAttribute(p.length / 3 > 65535 ? new Uint32Array(i) : new Uint16Array(i), 1));
    g.computeBoundingSphere();
    return g;
  }

  var chunks = {}; // "cx,cz" -> {solid, water}
  G.rebuildChunk = function (cx, cz) {
    var key = cx + ',' + cz;
    var ch = chunks[key] || (chunks[key] = { solid: null, water: null });
    buildChunkArrays(cx, cz);
    if (ch.solid) { G.scene.remove(ch.solid); ch.solid.geometry.dispose(); ch.solid = null; }
    if (ch.water) { G.scene.remove(ch.water); ch.water.geometry.dispose(); ch.water = null; }
    if (I.length) {
      ch.solid = new THREE.Mesh(makeGeometry(P, C, U, I), G.matSolid);
      ch.solid.matrixAutoUpdate = false;
      G.scene.add(ch.solid);
    }
    if (WI.length) {
      ch.water = new THREE.Mesh(makeGeometry(WP, WC, WU, WI), G.matWater);
      ch.water.matrixAutoUpdate = false;
      ch.water.renderOrder = 2;
      G.scene.add(ch.water);
    }
  };
  G.rebuildAll = function () {
    for (var cx = 0; cx < W / CH; cx++) for (var cz = 0; cz < D / CH; cz++) G.rebuildChunk(cx, cz);
    G.dirtyChunks = {};
  };
  G.rebuildDirty = function (max) {
    var n = 0;
    for (var k in G.dirtyChunks) {
      var p = k.split(',');
      var cx = +p[0], cz = +p[1];
      delete G.dirtyChunks[k];
      if (cx < 0 || cz < 0 || cx >= W / CH || cz >= D / CH) continue;
      G.rebuildChunk(cx, cz);
      if (++n >= max) break;
    }
  };

  // textura de "bloco de brinquedo": bordo ligeiramente escuro, brilho no canto
  function makeBevelTexture() {
    var s = 64, cv = document.createElement('canvas');
    cv.width = cv.height = s;
    var g = cv.getContext('2d');
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, s, s);
    g.fillStyle = 'rgba(0,0,0,0.16)'; g.fillRect(0, 0, s, s);
    g.fillStyle = '#ffffff'; g.fillRect(3, 3, s - 6, s - 6);
    var grd = g.createLinearGradient(0, 0, s, s);
    grd.addColorStop(0, 'rgba(0,0,0,0)'); grd.addColorStop(1, 'rgba(0,0,0,0.07)');
    g.fillStyle = grd; g.fillRect(3, 3, s - 6, s - 6);
    var t = new THREE.CanvasTexture(cv);
    t.magFilter = THREE.LinearFilter;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.generateMipmaps = true;
    return t;
  }

  var SKY_DAY = new THREE.Color(0x58b4ff), SKY_DUSK = new THREE.Color(0xff9a76), SKY_NIGHT = new THREE.Color(0x24347e);
  var tmpColor = new THREE.Color();

  G.initRenderer = function (canvas) {
    THREE.ColorManagement.enabled = false;
    var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: false, powerPreference: 'high-performance', alpha: false, stencil: false });
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    G.renderer = renderer;
    G.scene = new THREE.Scene();
    G.scene.background = SKY_DAY.clone();
    G.scene.fog = new THREE.Fog(0x58b4ff, 45, 135);
    G.camera = new THREE.PerspectiveCamera(72, 16 / 9, 0.12, 400);
    G.camera.rotation.order = 'YXZ';

    var tex = makeBevelTexture();
    try { tex.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy()); } catch (e) { /* opcional */ }
    G.matSolid = new THREE.MeshBasicMaterial({ vertexColors: true, map: tex });
    G.matWater = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.72, depthWrite: false });
    G.matCreature = new THREE.MeshBasicMaterial({ vertexColors: true });

    // mar à volta da ilha (anel de 4 retângulos)
    var seaMat = new THREE.MeshBasicMaterial({ color: 0x3aa8f0, transparent: true, opacity: 0.72, depthWrite: false });
    var R = 600, ySea = SEA + 1 - 0.12;
    function seaRect(x1, z1, x2, z2) {
      var g = new THREE.PlaneGeometry(x2 - x1, z2 - z1);
      g.rotateX(-Math.PI / 2);
      var m = new THREE.Mesh(g, seaMat);
      m.position.set((x1 + x2) / 2, ySea, (z1 + z2) / 2);
      m.renderOrder = 1;
      G.scene.add(m);
    }
    seaRect(-R, -R, W + R, 0); seaRect(-R, D, W + R, D + R); seaRect(-R, 0, 0, D); seaRect(W, 0, W + R, D);
    // fundo do mar exterior
    var floor = new THREE.Mesh(new THREE.PlaneGeometry(W + 2 * R, D + 2 * R).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xd9c98a }));
    floor.position.set(W / 2, SEA - 5.5, D / 2);
    G.scene.add(floor);
    G.seaFloor = floor;

    // sol e nuvens
    var sun = new THREE.Mesh(new THREE.BoxGeometry(22, 22, 22), new THREE.MeshBasicMaterial({ color: 0xfff2a0, fog: false }));
    G.scene.add(sun); G.sun = sun;
    var moon = new THREE.Mesh(new THREE.BoxGeometry(14, 14, 14), new THREE.MeshBasicMaterial({ color: 0xf4f6ff, fog: false }));
    G.scene.add(moon); G.moon = moon;
    G.clouds = [];
    var cloudMat = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false, transparent: true, opacity: 0.92 });
    var rnd = G.mulberry32(77);
    for (var i = 0; i < 14; i++) {
      var grp = new THREE.Group();
      var parts = 2 + Math.floor(rnd() * 3);
      for (var p = 0; p < parts; p++) {
        var bx = new THREE.Mesh(new THREE.BoxGeometry(10 + rnd() * 12, 3 + rnd() * 2, 8 + rnd() * 8), cloudMat);
        bx.position.set((rnd() - 0.5) * 14, rnd() * 2, (rnd() - 0.5) * 10);
        grp.add(bx);
      }
      grp.position.set(-150 + rnd() * 430, 72 + rnd() * 16, -150 + rnd() * 430);
      G.scene.add(grp); G.clouds.push(grp);
    }

    // contorno do bloco apontado
    var hg = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.012, 1.012, 1.012));
    G.highlight = new THREE.LineSegments(hg, new THREE.LineBasicMaterial({ color: 0xffffff, fog: false }));
    G.highlight.visible = false;
    G.scene.add(G.highlight);
    var hg2 = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.03, 1.03, 1.03));
    G.highlight2 = new THREE.LineSegments(hg2, new THREE.LineBasicMaterial({ color: 0x20304a, fog: false }));
    G.highlight2.visible = false;
    G.scene.add(G.highlight2);
  };

  // menos distância de visão quando a máquina não aguenta (menos blocos desenhados)
  G.detail = 2;
  G.setDetail = function (level) {
    G.detail = level;
    var far = level >= 2 ? 135 : (level === 1 ? 90 : 62);
    G.scene.fog.near = far * 0.34; G.scene.fog.far = far;
    G.camera.far = level >= 2 ? 400 : far + 12;
    G.camera.updateProjectionMatrix();
    for (var i = 0; i < G.clouds.length; i++) G.clouds[i].visible = level >= 2;
    G.sun.visible = G.moon.visible = level >= 2;
    G.viewDist = far;
  };
  G.viewDist = 135;

  // escala de resolução adaptativa
  G.renderScale = 1;
  G.resize = function () {
    var w = window.innerWidth || 1280, h = window.innerHeight || 720;
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    var maxH = G.maxRenderHeight || 1080;
    var scale = G.renderScale * dpr;
    if (h * scale > maxH) scale = maxH / h;
    G.renderer.setPixelRatio(scale);
    G.renderer.setSize(w, h, false);
    G.camera.aspect = w / h;
    G.camera.updateProjectionMatrix();
  };

  // ciclo de dia suave (nunca fica escuro)
  G.dayTime = 0.12; // 0..1
  G.DAY_LENGTH = 420; // segundos
  G.updateSky = function (dt, camPos) {
    G.dayTime = (G.dayTime + dt / G.DAY_LENGTH) % 1;
    var ang = G.dayTime * Math.PI * 2;
    var sunH = Math.sin(ang); // -1..1
    var day = Math.max(0, Math.min(1, (sunH + 0.25) / 0.5));
    var dusk = Math.max(0, 1 - Math.abs(sunH) / 0.3);
    tmpColor.copy(SKY_NIGHT).lerp(SKY_DAY, day).lerp(SKY_DUSK, dusk * 0.55);
    G.scene.background.copy(tmpColor);
    G.scene.fog.color.copy(tmpColor);
    var light = 0.62 + 0.38 * day;
    G.matSolid.color.setRGB(light, light, Math.min(1, light + (1 - day) * 0.12));
    G.matWater.color.copy(G.matSolid.color);
    G.matCreature.color.setRGB(0.7 + 0.3 * day, 0.7 + 0.3 * day, 0.75 + 0.25 * day);
    G.sun.position.set(camPos.x + Math.cos(ang) * 300, camPos.y + sunH * 300, camPos.z + 60);
    G.moon.position.set(camPos.x - Math.cos(ang) * 300, camPos.y - sunH * 300, camPos.z - 60);
    for (var i = 0; i < G.clouds.length; i++) {
      var c = G.clouds[i];
      c.position.x += dt * 1.1;
      if (c.position.x > 290) c.position.x = -160;
    }
    G.seaFloor.position.x = W / 2; // estático
  };
})();
