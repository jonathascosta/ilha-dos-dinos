/* Ilha dos Dinos — dinossauros, animais, ovos e partículas. */
(function () {
  'use strict';
  var G = window.G, THREE = window.THREE;

  // ---------- construção de modelos com caixas ----------
  var SHADE = [0.9, 0.9, 1.0, 0.68, 0.83, 0.83]; // +x -x +y -y +z -z
  function pushBox(A, sx, sy, sz, cx, cy, cz, hex) {
    var r = ((hex >> 16) & 255) / 255, g = ((hex >> 8) & 255) / 255, b = (hex & 255) / 255;
    var hx = sx / 2, hy = sy / 2, hz = sz / 2;
    var faces = [
      [[1, -1, 1], [1, -1, -1], [1, 1, -1], [1, 1, 1]],
      [[-1, -1, -1], [-1, -1, 1], [-1, 1, 1], [-1, 1, -1]],
      [[-1, 1, 1], [1, 1, 1], [1, 1, -1], [-1, 1, -1]],
      [[-1, -1, -1], [1, -1, -1], [1, -1, 1], [-1, -1, 1]],
      [[-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]],
      [[1, -1, -1], [-1, -1, -1], [-1, 1, -1], [1, 1, -1]]
    ];
    for (var f = 0; f < 6; f++) {
      var vi = A.p.length / 3, s = SHADE[f];
      for (var c = 0; c < 4; c++) {
        var v = faces[f][c];
        A.p.push(cx + v[0] * hx, cy + v[1] * hy, cz + v[2] * hz);
        A.c.push(r * s, g * s, b * s);
      }
      A.i.push(vi, vi + 1, vi + 2, vi, vi + 2, vi + 3);
    }
  }
  function geomFrom(A) {
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(A.p), 3));
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(A.c), 3));
    g.setIndex(new THREE.BufferAttribute(new Uint16Array(A.i), 1));
    g.computeBoundingSphere();
    return g;
  }

  G.pushBox = pushBox; G.geomFrom = geomFrom;

  var WHITE = 0xffffff, BLACK = 0x1c1c22;
  function eyes(parts, x, y, z, s) { // olhos dos dois lados da cabeça
    s = s || 1;
    parts.push([0.05, 0.2 * s, 0.2 * s, x, y, z, WHITE], [0.05, 0.2 * s, 0.2 * s, -x, y, z, WHITE]);
    parts.push([0.04, 0.1 * s, 0.1 * s, x + 0.03, y, z + 0.04 * s, BLACK], [0.04, 0.1 * s, 0.1 * s, -x - 0.03, y, z + 0.04 * s, BLACK]);
  }

  // parte: [sx,sy,sz, x,y,z, cor, grupo?]
  var SPECIES = {};

  (function () { // REX
    var c = 0x4fb04a, d = 0x3a8c3c, belly = 0xcfe8a0;
    var p = [
      [0.85, 0.9, 1.5, 0, 1.35, 0, c], [0.6, 0.16, 1.2, 0, 0.88, 0.05, belly],
      [0.6, 0.7, 0.5, 0, 1.95, 0.75, c],
      [0.75, 0.62, 1.0, 0, 2.48, 1.15, c], [0.62, 0.2, 0.85, 0, 2.08, 1.18, belly],
      [0.5, 0.08, 0.05, 0, 2.2, 1.66, WHITE],
      [0.14, 0.35, 0.14, 0.46, 1.5, 0.62, d], [0.14, 0.35, 0.14, -0.46, 1.5, 0.62, d],
      [0.12, 0.14, 0.26, 0, 1.87, -0.45, d], [0.12, 0.14, 0.26, 0, 1.87, 0.05, d], [0.12, 0.14, 0.26, 0, 1.87, 0.5, d],
      [0.38, 0.9, 0.45, 0.3, 0.5, 0, d, 'legL'], [0.42, 0.14, 0.62, 0.3, 0.07, 0.1, d, 'legL'],
      [0.38, 0.9, 0.45, -0.3, 0.5, 0, d, 'legR'], [0.42, 0.14, 0.62, -0.3, 0.07, 0.1, d, 'legR'],
      [0.6, 0.6, 0.8, 0, 1.4, -1.1, c, 'tail'], [0.36, 0.36, 0.8, 0, 1.38, -1.85, c, 'tail']
    ];
    eyes(p, 0.38, 2.6, 1.2);
    SPECIES.rex = { parts: p, pivots: { legL: [0.3, 0.95, 0, 'A'], legR: [-0.3, 0.95, 0, 'B'], tail: [0, 1.4, -0.7, 'tail'] },
      w: 0.6, h: 2.6, speed: 2.4, ride: true, riderY: 1.8, riderZ: -0.1, voice: 'roar', dino: true, thumbH: 3.0 };
  })();

  (function () { // TRICERATOPS
    var c = 0xf0a040, d = 0xd88428, fr = 0xe0603a;
    var p = [
      [1.0, 0.8, 1.7, 0, 1.0, 0, c],
      [0.7, 0.6, 0.7, 0, 1.05, 1.15, c], [1.25, 1.0, 0.14, 0, 1.42, 0.82, fr],
      [0.2, 0.2, 0.05, 0.4, 1.7, 0.9, 0xffd060], [0.2, 0.2, 0.05, -0.4, 1.7, 0.9, 0xffd060], [0.2, 0.2, 0.05, 0, 1.75, 0.9, 0xffd060],
      [0.36, 0.3, 0.26, 0, 0.92, 1.6, d],
      [0.1, 0.1, 0.5, 0.22, 1.42, 1.48, WHITE], [0.1, 0.1, 0.5, -0.22, 1.42, 1.48, WHITE], [0.1, 0.24, 0.1, 0, 1.2, 1.62, WHITE],
      [0.32, 0.62, 0.32, 0.38, 0.31, 0.6, d, 'fl'], [0.32, 0.62, 0.32, -0.38, 0.31, 0.6, d, 'fr'],
      [0.32, 0.62, 0.32, 0.38, 0.31, -0.6, d, 'bl'], [0.32, 0.62, 0.32, -0.38, 0.31, -0.6, d, 'br'],
      [0.4, 0.36, 0.7, 0, 0.95, -1.15, c, 'tail']
    ];
    eyes(p, 0.36, 1.14, 1.32, 0.8);
    SPECIES.tricera = { parts: p, pivots: { fl: [0.38, 0.62, 0.6, 'A'], br: [-0.38, 0.62, -0.6, 'A'], fr: [-0.38, 0.62, 0.6, 'B'], bl: [0.38, 0.62, -0.6, 'B'], tail: [0, 0.95, -0.85, 'tail'] },
      w: 0.65, h: 1.6, speed: 2.0, ride: true, riderY: 1.4, riderZ: -0.1, voice: 'grunt', dino: true };
  })();

  (function () { // BRONTO (pescoço comprido)
    var c = 0x5a9ae0, d = 0x4680c8, belly = 0xbfe0ff;
    var p = [
      [1.3, 1.1, 2.2, 0, 1.45, 0, c], [1.0, 0.14, 1.8, 0, 0.86, 0, belly],
      [0.6, 0.8, 0.6, 0, 2.1, 1.1, c], [0.5, 0.8, 0.5, 0, 2.8, 1.4, c], [0.45, 0.8, 0.45, 0, 3.5, 1.65, c], [0.42, 0.6, 0.42, 0, 4.1, 1.85, c],
      [0.55, 0.45, 0.8, 0, 4.55, 2.15, c], [0.5, 0.05, 0.5, 0, 4.36, 2.3, d],
      [0.45, 0.92, 0.45, 0.45, 0.46, 0.75, d, 'fl'], [0.45, 0.92, 0.45, -0.45, 0.46, 0.75, d, 'fr'],
      [0.45, 0.92, 0.45, 0.45, 0.46, -0.75, d, 'bl'], [0.45, 0.92, 0.45, -0.45, 0.46, -0.75, d, 'br'],
      [0.7, 0.6, 0.9, 0, 1.45, -1.5, c, 'tail'], [0.45, 0.4, 0.9, 0, 1.3, -2.3, c, 'tail'], [0.25, 0.25, 0.8, 0, 1.15, -3.1, c, 'tail']
    ];
    eyes(p, 0.28, 4.62, 2.3, 0.8);
    SPECIES.bronto = { parts: p, pivots: { fl: [0.45, 0.92, 0.75, 'A'], br: [-0.45, 0.92, -0.75, 'A'], fr: [-0.45, 0.92, 0.75, 'B'], bl: [0.45, 0.92, -0.75, 'B'], tail: [0, 1.5, -1.1, 'tail'] },
      w: 0.8, h: 2.1, speed: 1.6, ride: true, riderY: 2.0, riderZ: 0, voice: 'moo', dino: true, thumbH: 5.0 };
  })();

  (function () { // STEGO
    var c = 0x40b8a8, d = 0x2e9888, pl = 0xffc840;
    var p = [
      [0.95, 0.85, 1.6, 0, 0.95, 0, c], [0.8, 0.3, 0.9, 0, 1.5, -0.05, c],
      [0.45, 0.4, 0.65, 0, 0.82, 1.1, c],
      [0.1, 0.42, 0.34, 0, 1.86, -0.38, pl], [0.1, 0.5, 0.34, 0, 1.9, 0.05, pl],
      [0.1, 0.34, 0.3, 0, 1.54, 0.62, pl], [0.1, 0.34, 0.3, 0, 1.54, -0.72, pl],
      [0.3, 0.56, 0.3, 0.36, 0.28, 0.5, d, 'fl'], [0.3, 0.56, 0.3, -0.36, 0.28, 0.5, d, 'fr'],
      [0.3, 0.56, 0.3, 0.36, 0.28, -0.5, d, 'bl'], [0.3, 0.56, 0.3, -0.36, 0.28, -0.5, d, 'br'],
      [0.5, 0.45, 0.8, 0, 0.9, -1.15, c, 'tail'], [0.3, 0.28, 0.7, 0, 0.8, -1.85, c, 'tail'],
      [0.1, 0.24, 0.24, 0, 1.2, -1.2, pl, 'tail'],
      [0.6, 0.08, 0.08, 0, 0.84, -2.0, WHITE, 'tail'], [0.08, 0.34, 0.08, 0, 0.98, -2.08, WHITE, 'tail']
    ];
    eyes(p, 0.23, 0.9, 1.22, 0.7);
    SPECIES.stego = { parts: p, pivots: { fl: [0.36, 0.56, 0.5, 'A'], br: [-0.36, 0.56, -0.5, 'A'], fr: [-0.36, 0.56, 0.5, 'B'], bl: [0.36, 0.56, -0.5, 'B'], tail: [0, 0.95, -0.8, 'tail'] },
      w: 0.6, h: 1.7, speed: 1.8, ride: true, riderY: 1.5, riderZ: 0.5, voice: 'grunt', dino: true };
  })();

  (function () { // PTERO (voa)
    var c = 0xe86a4a, wg = 0xf0b060, bk = 0xffd94a;
    var p = [
      [0.4, 0.35, 0.9, 0, 0.32, 0, c], [0.3, 0.3, 0.42, 0, 0.52, 0.6, c],
      [0.14, 0.12, 0.6, 0, 0.47, 1.06, bk], [0.1, 0.14, 0.5, 0, 0.7, 0.36, 0xc04a30],
      [0.12, 0.1, 0.4, 0, 0.3, -0.62, c],
      [0.08, 0.16, 0.08, 0.1, 0.08, -0.1, bk], [0.08, 0.16, 0.08, -0.1, 0.08, -0.1, bk],
      [1.5, 0.06, 0.7, 0.95, 0.44, 0, wg, 'wingL'], [0.5, 0.06, 0.4, 1.9, 0.44, -0.1, wg, 'wingL'],
      [1.5, 0.06, 0.7, -0.95, 0.44, 0, wg, 'wingR'], [0.5, 0.06, 0.4, -1.9, 0.44, -0.1, wg, 'wingR']
    ];
    eyes(p, 0.16, 0.56, 0.7, 0.6);
    SPECIES.ptero = { parts: p, pivots: { wingL: [0.2, 0.44, 0, 'wingL'], wingR: [-0.2, 0.44, 0, 'wingR'] },
      w: 0.45, h: 0.8, speed: 6, ride: true, riderY: 0.45, riderZ: -0.05, voice: 'screech', dino: true, flies: true };
  })();

  (function () { // SPINO (vela nas costas)
    var c = 0xd9534a, d = 0xb23a34, belly = 0xffd9a8, sail = 0xffb347;
    var p = [
      [0.8, 0.8, 1.8, 0, 1.25, 0, c], [0.56, 0.14, 1.4, 0, 0.84, 0, belly],
      [0.08, 0.7, 1.0, 0, 2.0, -0.25, sail], [0.08, 0.34, 0.6, 0, 2.5, -0.25, sail],
      [0.5, 0.6, 0.5, 0, 1.78, 0.98, c],
      [0.5, 0.4, 1.15, 0, 2.14, 1.5, c], [0.42, 0.14, 0.95, 0, 1.88, 1.52, belly], [0.36, 0.07, 0.05, 0, 1.97, 2.06, WHITE],
      [0.14, 0.4, 0.14, 0.44, 1.02, 0.62, d], [0.14, 0.4, 0.14, -0.44, 1.02, 0.62, d],
      [0.36, 0.86, 0.42, 0.28, 0.47, -0.1, d, 'legL'], [0.4, 0.14, 0.58, 0.28, 0.07, 0, d, 'legL'],
      [0.36, 0.86, 0.42, -0.28, 0.47, -0.1, d, 'legR'], [0.4, 0.14, 0.58, -0.28, 0.07, 0, d, 'legR'],
      [0.55, 0.55, 0.9, 0, 1.28, -1.3, c, 'tail'], [0.32, 0.32, 0.9, 0, 1.24, -2.1, c, 'tail']
    ];
    eyes(p, 0.255, 2.24, 1.42, 0.8);
    SPECIES.spino = { parts: p, pivots: { legL: [0.28, 0.9, -0.1, 'A'], legR: [-0.28, 0.9, -0.1, 'B'], tail: [0, 1.3, -0.85, 'tail'] },
      w: 0.6, h: 2.4, speed: 2.6, ride: true, riderY: 1.65, riderZ: 0.55, voice: 'roar', dino: true, thumbH: 3.0 };
  })();

  (function () { // ANKY (couraça e maça na cauda)
    var c = 0xa8854f, d = 0x86683a, ar = 0xe0cc88;
    var p = [
      [1.2, 0.6, 1.7, 0, 0.76, 0, c], [1.0, 0.16, 1.4, 0, 1.13, 0, ar],
      [0.16, 0.14, 0.16, 0.3, 1.27, 0.42, d], [0.16, 0.14, 0.16, -0.3, 1.27, 0.42, d], [0.16, 0.14, 0.16, 0, 1.27, 0, d],
      [0.16, 0.14, 0.16, 0.3, 1.27, -0.42, d], [0.16, 0.14, 0.16, -0.3, 1.27, -0.42, d],
      [0.14, 0.14, 0.14, 0.66, 0.8, 0.4, ar], [0.14, 0.14, 0.14, -0.66, 0.8, 0.4, ar], [0.14, 0.14, 0.14, 0.66, 0.8, -0.4, ar], [0.14, 0.14, 0.14, -0.66, 0.8, -0.4, ar],
      [0.56, 0.42, 0.5, 0, 0.72, 1.06, c], [0.3, 0.2, 0.14, 0, 0.62, 1.36, d],
      [0.3, 0.46, 0.3, 0.42, 0.23, 0.55, d, 'fl'], [0.3, 0.46, 0.3, -0.42, 0.23, 0.55, d, 'fr'],
      [0.3, 0.46, 0.3, 0.42, 0.23, -0.55, d, 'bl'], [0.3, 0.46, 0.3, -0.42, 0.23, -0.55, d, 'br'],
      [0.3, 0.25, 0.9, 0, 0.72, -1.28, c, 'tail'], [0.52, 0.4, 0.42, 0, 0.72, -1.9, ar, 'tail']
    ];
    eyes(p, 0.285, 0.8, 1.16, 0.7);
    SPECIES.anky = { parts: p, pivots: { fl: [0.42, 0.46, 0.55, 'A'], br: [-0.42, 0.46, -0.55, 'A'], fr: [-0.42, 0.46, 0.55, 'B'], bl: [0.42, 0.46, -0.55, 'B'], tail: [0, 0.72, -0.85, 'tail'] },
      w: 0.65, h: 1.35, speed: 1.7, ride: true, riderY: 1.2, riderZ: 0.1, voice: 'grunt', dino: true };
  })();

  (function () { // PARA (crista comprida)
    var c = 0x8e6fd8, d = 0x7256b8, belly = 0xffe9a0, cr = 0xffd94a;
    var p = [
      [0.8, 0.85, 1.6, 0, 1.2, 0, c], [0.56, 0.14, 1.2, 0, 0.78, 0, belly],
      [0.4, 0.7, 0.4, 0, 1.88, 0.8, c],
      [0.42, 0.4, 0.8, 0, 2.3, 1.05, c], [0.36, 0.14, 0.3, 0, 2.16, 1.5, belly],
      [0.16, 0.18, 0.9, 0, 2.56, 0.45, cr], [0.14, 0.14, 0.4, 0, 2.68, -0.05, cr],
      [0.34, 0.8, 0.4, 0.28, 0.4, -0.3, d, 'legL'], [0.34, 0.8, 0.4, -0.28, 0.4, -0.3, d, 'legR'],
      [0.18, 0.62, 0.18, 0.3, 0.52, 0.55, d, 'fl'], [0.18, 0.62, 0.18, -0.3, 0.52, 0.55, d, 'fr'],
      [0.5, 0.5, 0.9, 0, 1.2, -1.2, c, 'tail'], [0.28, 0.28, 0.9, 0, 1.12, -2.0, c, 'tail']
    ];
    eyes(p, 0.215, 2.38, 1.1, 0.75);
    SPECIES.para = { parts: p, pivots: { legL: [0.28, 0.8, -0.3, 'A'], legR: [-0.28, 0.8, -0.3, 'B'], fl: [0.3, 0.82, 0.55, 'B'], fr: [-0.3, 0.82, 0.55, 'A'], tail: [0, 1.2, -0.8, 'tail'] },
      w: 0.55, h: 2.2, speed: 2.6, ride: true, riderY: 1.63, riderZ: 0, voice: 'moo', dino: true, thumbH: 2.9 };
  })();

  (function () { // COELHO
    var c = 0xf4f0ea, pk = 0xffa8c8;
    var p = [
      [0.34, 0.3, 0.5, 0, 0.25, 0, c], [0.3, 0.28, 0.28, 0, 0.47, 0.3, c],
      [0.08, 0.3, 0.06, 0.09, 0.74, 0.26, c], [0.08, 0.3, 0.06, -0.09, 0.74, 0.26, c],
      [0.04, 0.2, 0.02, 0.09, 0.74, 0.3, pk], [0.04, 0.2, 0.02, -0.09, 0.74, 0.3, pk],
      [0.14, 0.14, 0.14, 0, 0.32, -0.3, WHITE], [0.08, 0.06, 0.04, 0, 0.45, 0.45, pk],
      [0.03, 0.08, 0.08, 0.155, 0.52, 0.36, BLACK], [0.03, 0.08, 0.08, -0.155, 0.52, 0.36, BLACK],
      [0.1, 0.1, 0.22, 0.12, 0.05, 0.05, c], [0.1, 0.1, 0.22, -0.12, 0.05, 0.05, c]
    ];
    SPECIES.bunny = { parts: p, pivots: {}, w: 0.22, h: 0.6, speed: 2.2, hops: true, voice: 'squeak' };
  })();

  (function () { // PATO
    var c = 0xffd94a, d = 0xf0c030, o = 0xff9030;
    var p = [
      [0.34, 0.3, 0.5, 0, 0.3, 0, c], [0.24, 0.24, 0.24, 0, 0.58, 0.2, c],
      [0.16, 0.07, 0.18, 0, 0.55, 0.4, o], [0.2, 0.12, 0.14, 0, 0.44, -0.3, c],
      [0.04, 0.2, 0.34, 0.19, 0.32, 0, d], [0.04, 0.2, 0.34, -0.19, 0.32, 0, d],
      [0.03, 0.07, 0.07, 0.125, 0.62, 0.26, BLACK], [0.03, 0.07, 0.07, -0.125, 0.62, 0.26, BLACK],
      [0.07, 0.16, 0.07, 0.09, 0.08, 0, o], [0.07, 0.16, 0.07, -0.09, 0.08, 0, o]
    ];
    SPECIES.duck = { parts: p, pivots: {}, w: 0.22, h: 0.6, speed: 1.4, swims: true, voice: 'quack' };
  })();

  (function () { // TARTARUGA
    var sh = 0x3f9a5a, sh2 = 0x57b872, sk = 0xb8e07a;
    var p = [
      [0.7, 0.28, 0.8, 0, 0.3, 0, sh], [0.5, 0.12, 0.6, 0, 0.5, 0, sh2],
      [0.24, 0.2, 0.3, 0, 0.26, 0.54, sk],
      [0.03, 0.07, 0.07, 0.125, 0.3, 0.6, BLACK], [0.03, 0.07, 0.07, -0.125, 0.3, 0.6, BLACK],
      [0.22, 0.1, 0.26, 0.42, 0.1, 0.3, sk], [0.22, 0.1, 0.26, -0.42, 0.1, 0.3, sk],
      [0.22, 0.1, 0.26, 0.42, 0.1, -0.3, sk], [0.22, 0.1, 0.26, -0.42, 0.1, -0.3, sk],
      [0.1, 0.08, 0.16, 0, 0.2, -0.46, sk]
    ];
    SPECIES.turtle = { parts: p, pivots: {}, w: 0.36, h: 0.56, speed: 0.6, swims: true, voice: 'squeak' };
  })();

  (function () { // CACHORRO
    var c = 0xb8804a, d = 0x7a4e28, w = 0xf4ead8;
    var p = [
      [0.36, 0.34, 0.7, 0, 0.44, 0, c], [0.34, 0.32, 0.34, 0, 0.7, 0.42, c],
      [0.18, 0.14, 0.14, 0, 0.63, 0.64, w], [0.08, 0.06, 0.04, 0, 0.68, 0.72, BLACK],
      [0.08, 0.22, 0.16, 0.2, 0.72, 0.4, d], [0.08, 0.22, 0.16, -0.2, 0.72, 0.4, d],
      [0.03, 0.08, 0.08, 0.175, 0.76, 0.52, BLACK], [0.03, 0.08, 0.08, -0.175, 0.76, 0.52, BLACK],
      [0.14, 0.04, 0.02, 0, 0.5, 0.36, 0xe04848],
      [0.12, 0.28, 0.12, 0.12, 0.14, 0.25, d, 'fl'], [0.12, 0.28, 0.12, -0.12, 0.14, 0.25, d, 'fr'],
      [0.12, 0.28, 0.12, 0.12, 0.14, -0.25, d, 'bl'], [0.12, 0.28, 0.12, -0.12, 0.14, -0.25, d, 'br'],
      [0.08, 0.08, 0.3, 0, 0.62, -0.46, d, 'tail']
    ];
    SPECIES.puppy = { parts: p, pivots: { fl: [0.12, 0.28, 0.25, 'A'], br: [-0.12, 0.28, -0.25, 'A'], fr: [-0.12, 0.28, 0.25, 'B'], bl: [0.12, 0.28, -0.25, 'B'], tail: [0, 0.62, -0.32, 'wag'] },
      w: 0.25, h: 0.8, speed: 3.6, follows: true, voice: 'bark' };
  })();

  (function () { // OVO
    var c = 0xfff4dc;
    var p = [
      [0.44, 0.2, 0.44, 0, 0.1, 0, c], [0.6, 0.4, 0.6, 0, 0.36, 0, c], [0.48, 0.24, 0.48, 0, 0.66, 0, c], [0.3, 0.14, 0.3, 0, 0.84, 0, c],
      [0.14, 0.14, 0.02, 0.12, 0.42, 0.3, 0x5ac8ff], [0.1, 0.1, 0.02, -0.14, 0.3, 0.3, 0xff8cc8],
      [0.02, 0.14, 0.14, 0.3, 0.4, -0.08, 0xffc840], [0.02, 0.1, 0.1, -0.3, 0.34, 0.1, 0x9be03c],
      [0.12, 0.12, 0.02, -0.05, 0.44, -0.3, 0xa45ce8], [0.1, 0.02, 0.1, 0.06, 0.915, 0.02, 0x5ac8ff]
    ];
    SPECIES.egg = { parts: p, pivots: {}, w: 0.3, h: 0.9, speed: 0, egg: true };
  })();

  (function () { // CRIANÇA (aparece a montar um dinossauro)
    var skin = 0xf2c9a0, shirt = 0xf04848, pants = 0x3a5ad0, cap = 0xffd23c;
    var p = [
      [0.4, 0.46, 0.26, 0, 0.45, 0, shirt], [0.36, 0.36, 0.36, 0, 0.88, 0, skin],
      [0.4, 0.12, 0.4, 0, 1.1, 0, cap], [0.3, 0.05, 0.2, 0, 1.06, 0.28, cap],
      [0.16, 0.16, 0.44, 0.16, 0.2, 0.16, pants], [0.16, 0.16, 0.44, -0.16, 0.2, 0.16, pants],
      [0.12, 0.34, 0.12, 0.27, 0.48, 0.08, skin], [0.12, 0.34, 0.12, -0.27, 0.48, 0.08, skin],
      [0.06, 0.06, 0.02, 0.09, 0.9, 0.185, BLACK], [0.06, 0.06, 0.02, -0.09, 0.9, 0.185, BLACK]
    ];
    SPECIES.kid = { parts: p, pivots: {}, w: 0.3, h: 1.2, speed: 0 };
  })();

  G.SPECIES = SPECIES;

  // variantes de cor: roda o tom das cores vivas (branco, preto e cinzentos ficam iguais)
  var TINTS = [0, 150, 285, 60, 215];
  function tintHex(hex, deg) {
    var r = ((hex >> 16) & 255) / 255, g = ((hex >> 8) & 255) / 255, b = (hex & 255) / 255;
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
    if (d < 0.12) return hex;
    var sat = d / (1 - Math.abs(2 * l - 1) || 1), h;
    if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4;
    h = (h * 60 + deg + 720) % 360;
    var c = (1 - Math.abs(2 * l - 1)) * sat, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2, q;
    if (h < 60) q = [c, x, 0]; else if (h < 120) q = [x, c, 0]; else if (h < 180) q = [0, c, x];
    else if (h < 240) q = [0, x, c]; else if (h < 300) q = [x, 0, c]; else q = [c, 0, x];
    return (Math.round((q[0] + m) * 255) << 16) | (Math.round((q[1] + m) * 255) << 8) | Math.round((q[2] + m) * 255);
  }

  // geometrias por espécie (partilhadas)
  var geoCache = {};
  function speciesGeoms(name, tint) {
    var key = name + '|' + (tint || 0);
    if (geoCache[key]) return geoCache[key];
    var sp = SPECIES[name], groups = { _static: { p: [], c: [], i: [] } };
    var deg = TINTS[(tint || 0) % TINTS.length];
    sp.parts.forEach(function (q) {
      var gname = q[7] || '_static';
      var A = groups[gname] || (groups[gname] = { p: [], c: [], i: [] });
      var pv = q[7] ? sp.pivots[q[7]] : [0, 0, 0];
      pushBox(A, q[0], q[1], q[2], q[3] - pv[0], q[4] - pv[1], q[5] - pv[2], deg ? tintHex(q[6], deg) : q[6]);
    });
    var out = {};
    for (var k in groups) out[k] = geomFrom(groups[k]);
    geoCache[key] = out;
    return out;
  }

  function buildModel(name, scale, tint) {
    var sp = SPECIES[name], geos = speciesGeoms(name, tint);
    var root = new THREE.Group();
    var inner = new THREE.Group(); // escala + inclinação
    inner.scale.setScalar(scale || 1);
    root.add(inner);
    var anim = [];
    for (var k in geos) {
      var m = new THREE.Mesh(geos[k], G.matCreature);
      if (k !== '_static') {
        var pv = sp.pivots[k];
        m.position.set(pv[0], pv[1], pv[2]);
        anim.push({ mesh: m, kind: pv[3] });
      }
      inner.add(m);
    }
    return { root: root, inner: inner, anim: anim };
  }
  G.buildModel = buildModel;

  // ---------- criaturas ----------
  G.creatures = [];
  var rnd = Math.random;

  function Creature(kind, x, y, z, opts) {
    opts = opts || {};
    var sp = SPECIES[kind];
    this.kind = kind; this.sp = sp;
    this.scale = opts.scale || 1;
    this.baby = !!opts.baby;
    this.tint = opts.tint || 0;
    this.followTarget = null; this.stopAt = 2.4; this.lead = false; this.lost = false;
    this.x = x; this.y = y; this.z = z;
    this.vx = 0; this.vy = 0; this.vz = 0;
    this.w = sp.w * this.scale; this.h = sp.h * this.scale;
    this.autoStep = true; this.onGround = false; this.inWater = false; this.fly = false;
    this.yaw = rnd() * Math.PI * 2;
    this.heading = this.yaw;
    this.homeX = x; this.homeZ = z;
    this.state = 'idle'; this.timer = 1 + rnd() * 3;
    this.phase = rnd() * 6; this.moving = 0;
    this.voiceT = 6 + rnd() * 14;
    this.happy = 0; this.wobble = 0; this.ridden = false; this.dead = false;
    this.hops = 0;
    var m = buildModel(kind, this.scale, this.tint);
    this.model = m.root; this.inner = m.inner; this.anim = m.anim;
    G.scene.add(this.model);
    if (sp.flies) { this.fly = true; this.state = 'perch'; this.timer = 4 + rnd() * 10; this.target = null; }
  }
  G.Creature = Creature;

  Creature.prototype.remove = function () { this.dead = true; G.scene.remove(this.model); };

  function turnToward(cur, target, maxStep) {
    var d = target - cur;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    if (d > maxStep) d = maxStep; if (d < -maxStep) d = -maxStep;
    return cur + d;
  }
  G.turnToward = turnToward;

  // o modelo aponta para +Z; yaw=0 -> anda para +Z
  Creature.prototype.update = function (dt, player) {
    var sp = this.sp;
    if (sp.egg) { this.updateEgg(dt, player); return; }
    var dxp = player.x - this.x, dzp = player.z - this.z;
    var distP = Math.sqrt(dxp * dxp + dzp * dzp);
    this.model.visible = distP < G.viewDist - 8;

    if (this.ridden) {
      // posição controlada pelo jogador (ver game.js)
    } else if (distP < 70 || this.lead) {
      if (sp.flies) this.aiFly(dt, player);
      else this.aiWalk(dt, player, distP, dxp, dzp);
    }

    // animação
    this.phase += dt * (3 + this.moving * 7) * (this.baby ? 1.5 : 1);
    var sw = Math.sin(this.phase) * 0.6 * this.moving;
    for (var i = 0; i < this.anim.length; i++) {
      var a = this.anim[i];
      if (a.kind === 'A') a.mesh.rotation.x = sw;
      else if (a.kind === 'B') a.mesh.rotation.x = -sw;
      else if (a.kind === 'tail') a.mesh.rotation.y = Math.sin(this.phase * 0.5) * (0.15 + 0.2 * this.moving);
      else if (a.kind === 'wag') a.mesh.rotation.y = Math.sin(this.phase * 3) * 0.6;
      else if (a.kind === 'wingL' || a.kind === 'wingR') {
        var flap = this.flapping ? Math.sin(this.phase * 1.6) * 0.55 : -0.9;
        a.mesh.rotation.z = a.kind === 'wingL' ? flap : -flap;
      }
    }
    var bob = 0;
    if (this.happy > 0) { this.happy -= dt; bob = Math.abs(Math.sin(this.happy * 12)) * 0.25 * this.scale; }
    this.model.position.set(this.x, this.y + bob, this.z);
    this.model.rotation.y = this.yaw;

    // voz ocasional quando o jogador está perto
    this.voiceT -= dt;
    if (this.voiceT <= 0) {
      this.voiceT = 9 + rnd() * 16;
      var vr = this.lost ? 34 : 14;
      if (distP < vr && !this.ridden && G.sound) G.sound.voice(sp.voice, this.baby, Math.max(0.15, 1 - distP / vr));
    }
  };

  Creature.prototype.aiWalk = function (dt, player, distP, dxp, dzp) {
    var sp = this.sp;
    this.timer -= dt;
    var speed = 0;
    var ft = this.followTarget, follow = false, fdx = 0, fdz = 0, fd = 0;
    if (ft && !ft.dead && !this.lost) {
      fdx = ft.x - this.x; fdz = ft.z - this.z; fd = Math.sqrt(fdx * fdx + fdz * fdz);
      follow = this.lead || fd < (sp.follows ? 30 : 18);
    }
    if (this.lost) {
      // bebé perdido: fica quieto a chamar
      this.state = 'idle'; this.timer = 1;
      if (distP < 8) this.heading = Math.atan2(dxp, dzp);
      if (this.voiceT > 3.5) this.voiceT = 2 + rnd() * 1.5;
    } else if (follow) {
      this.heading = Math.atan2(fdx, fdz);
      if (fd > this.stopAt) { speed = (this.lead ? 6.4 : sp.speed * (this.baby ? 1.5 : 1)) * (fd > 7 ? 1.25 : 0.8); this.state = 'walk'; }
      else this.state = 'idle';
      if (this.lead && fd > 22) { // ficou para trás: reaparece ao pé do alvo
        var bx = ft.x - Math.sin(this.heading) * 3, bz = ft.z - Math.cos(this.heading) * 3;
        this.x = Math.max(2, Math.min(G.W - 2, bx)); this.z = Math.max(2, Math.min(G.D - 2, bz));
        this.y = G.groundY(Math.floor(this.x), Math.floor(this.z)) + 1.05; this.vy = 0;
      }
    } else if (this.state === 'idle') {
      if (this.timer <= 0) { this.state = 'walk'; this.timer = 2 + rnd() * 4; this.heading = rnd() * Math.PI * 2; }
      // olha para o jogador se estiver perto
      if (distP < 6) this.heading = Math.atan2(dxp, dzp);
    } else {
      speed = sp.speed * (this.baby ? 1.3 : 1);
      if (this.timer <= 0) { this.state = 'idle'; this.timer = 1.5 + rnd() * 4; }
      var hx = this.homeX - this.x, hz = this.homeZ - this.z;
      if (hx * hx + hz * hz > 20 * 20) this.heading = Math.atan2(hx, hz);
    }
    this.yaw = turnToward(this.yaw, this.heading, dt * 3.5);
    var dirx = Math.sin(this.yaw), dirz = Math.cos(this.yaw);
    if (speed > 0) {
      // não entra na água nem cai de sítios altos
      var ax = Math.floor(this.x + dirx * (this.w + 0.9)), az = Math.floor(this.z + dirz * (this.w + 0.9));
      var fy = Math.floor(this.y + 0.2);
      var gy = G.groundY(ax, az);
      var waterAhead = G.isWater(ax, gy + 1, az);
      if (!this.inWater && ((waterAhead && !sp.swims) || (fy - gy > 4 && !G.isSolid(ax, fy, az) && !G.isSolid(ax, fy - 1, az) && !G.isSolid(ax, fy - 2, az) && !G.isSolid(ax, fy - 3, az)))) {
        if (!follow) this.heading += Math.PI * (0.6 + rnd() * 0.8);
        speed = 0;
      }
    }
    this.vx = dirx * speed; this.vz = dirz * speed;
    if (sp.hops && speed > 0 && this.onGround) { this.vy = 4.6; }
    G.moveBody(this, dt);
    if (this.hitWall && speed > 0 && this.onGround && this.vy <= 0) {
      this.stuck = (this.stuck || 0) + dt;
      if (this.stuck > 0.6 && !follow) { this.heading += Math.PI * (0.5 + rnd()); this.stuck = 0; }
    } else this.stuck = 0;
    if (G.collides(this.x, this.y, this.z, this.w, this.h)) G.unstick(this);
    this.moving = speed > 0 ? Math.min(1, speed / sp.speed) : 0;
  };

  Creature.prototype.aiFly = function (dt, player) {
    var sp = this.sp;
    this.timer -= dt;
    if (this.state === 'perch') {
      this.flapping = false; this.moving = 0;
      // assenta no chão
      this.fly = false; this.vx = 0; this.vz = 0;
      G.moveBody(this, dt);
      if (G.collides(this.x, this.y, this.z, this.w, this.h)) G.unstick(this);
      var dx = player.x - this.x, dz = player.z - this.z;
      if (dx * dx + dz * dz < 64) { this.yaw = turnToward(this.yaw, Math.atan2(dx, dz), dt * 2); if (this.timer < 6) this.timer = 6; }
      if (this.timer <= 0) { this.state = 'fly'; this.hopsLeft = 3 + Math.floor(rnd() * 3); this.target = null; this.fly = true; }
      return;
    }
    this.flapping = true; this.moving = 0.4; this.fly = true;
    if (!this.target) {
      var tx, tz, ty, n = 0;
      do {
        tx = 12 + rnd() * (G.W - 24); tz = 12 + rnd() * (G.D - 24);
      } while (n++ < 20 && G.groundY(Math.floor(tx), Math.floor(tz)) < G.SEA && this.hopsLeft <= 0);
      var gy = Math.max(G.SEA, G.colTop[(Math.floor(tx) << 7) | Math.floor(tz)]);
      ty = this.hopsLeft > 0 ? Math.min(G.H + 6, gy + 10 + rnd() * 10) : gy + 1.05;
      this.target = { x: tx, y: ty, z: tz, land: this.hopsLeft <= 0 };
    }
    var t = this.target;
    var ddx = t.x - this.x, ddy = t.y - this.y, ddz = t.z - this.z;
    var dist = Math.sqrt(ddx * ddx + ddy * ddy + ddz * ddz);
    if (dist < 1.2) {
      if (t.land) { this.state = 'perch'; this.timer = 18 + rnd() * 20; this.vy = 0; }
      else this.hopsLeft--;
      this.target = null;
      return;
    }
    this.yaw = turnToward(this.yaw, Math.atan2(ddx, ddz), dt * 2.2);
    var hs = sp.speed * Math.min(1, Math.sqrt(ddx * ddx + ddz * ddz) / 2 + 0.2);
    var nx = this.x + Math.sin(this.yaw) * hs * dt, nz = this.z + Math.cos(this.yaw) * hs * dt;
    var vyy = Math.max(-3.5, Math.min(3.5, ddy * 1.2));
    var ny = this.y + vyy * dt;
    // evita atravessar blocos: sobe se houver obstáculo
    if (G.collides(nx, ny, nz, this.w, this.h)) { ny = this.y + 4 * dt; if (G.collides(nx, ny, nz, this.w, this.h)) { nx = this.x; nz = this.z; } }
    this.x = nx; this.y = ny; this.z = nz;
  };

  Creature.prototype.updateEgg = function (dt, player) {
    var dx = player.x - this.x, dy = player.y - this.y, dz = player.z - this.z;
    var d2 = dx * dx + dz * dz;
    this.model.visible = d2 < (G.viewDist - 8) * (G.viewDist - 8);
    // assenta no chão se o bloco de baixo desaparecer
    this.vx = 0; this.vz = 0;
    G.moveBody(this, dt);
    if (G.collides(this.x, this.y, this.z, this.w, this.h)) G.unstick(this);
    this.phase += dt;
    var tilt = Math.sin(this.phase * 1.3) * 0.05;
    if (this.wobble > 0) {
      this.wobble += dt;
      tilt = Math.sin(this.wobble * 22) * 0.28 * Math.min(1, this.wobble);
      if (this.wobble > 1.5) { G.hatchEgg(this); return; }
    } else if (d2 < 2.6 * 2.6 && Math.abs(dy) < 3.5) {
      this.wobble = 0.001;
      if (G.sound) G.sound.play('crack');
    }
    this.model.position.set(this.x, this.y, this.z);
    this.model.rotation.set(0, this.yaw, tilt);
  };

  Creature.prototype.pet = function () {
    this.happy = 0.8;
    G.burst('heart', this.x, this.y + this.h + 0.3, this.z, 5);
    if (G.sound) G.sound.voice(this.sp.voice, this.baby, 1);
  };

  // ---------- partículas (sprites) ----------
  var POOL = 48, parts = [], texs = {};
  function makeTex(draw) {
    var cv = document.createElement('canvas'); cv.width = cv.height = 32;
    var g = cv.getContext('2d'); draw(g);
    var t = new THREE.CanvasTexture(cv); t.magFilter = THREE.NearestFilter; return t;
  }
  G.initParticles = function () {
    texs.heart = makeTex(function (g) {
      g.fillStyle = '#ff5c8a';
      var px = ['.XX..XX.', 'XXXXXXXX', 'XXXXXXXX', 'XXXXXXXX', '.XXXXXX.', '..XXXX..', '...XX...'];
      for (var r = 0; r < px.length; r++) for (var c = 0; c < 8; c++) if (px[r][c] === 'X') g.fillRect(c * 4, 2 + r * 4, 4, 4);
    });
    texs.square = makeTex(function (g) { g.fillStyle = '#fff'; g.fillRect(4, 4, 24, 24); g.fillStyle = 'rgba(0,0,0,0.15)'; g.fillRect(4, 22, 24, 6); });
    texs.star = makeTex(function (g) {
      g.fillStyle = '#fff';
      g.fillRect(12, 0, 8, 32); g.fillRect(0, 12, 32, 8); g.fillRect(8, 8, 16, 16);
    });
    for (var i = 0; i < POOL; i++) {
      var s = new THREE.Sprite(new THREE.SpriteMaterial({ map: texs.square, fog: false, depthWrite: false }));
      s.visible = false; G.scene.add(s);
      parts.push({ s: s, life: 0, vx: 0, vy: 0, vz: 0, g: 0, size: 0.2 });
    }
  };
  var pNext = 0;
  var CONFETTI = [0xff5c8a, 0xffd23c, 0x5ac8ff, 0x9be03c, 0xa45ce8, 0xff9838];
  G.burst = function (type, x, y, z, n, color) {
    for (var i = 0; i < n; i++) {
      var p = parts[pNext]; pNext = (pNext + 1) % POOL;
      var m = p.s.material;
      p.s.visible = true;
      p.s.position.set(x + (rnd() - 0.5) * 0.5, y + (rnd() - 0.5) * 0.3, z + (rnd() - 0.5) * 0.5);
      if (type === 'heart') {
        m.map = texs.heart; m.color.setHex(0xffffff);
        p.vx = (rnd() - 0.5) * 0.8; p.vz = (rnd() - 0.5) * 0.8; p.vy = 1.2 + rnd(); p.g = 0; p.life = 1.1 + rnd() * 0.5; p.size = 0.42;
      } else if (type === 'confetti') {
        m.map = rnd() < 0.3 ? texs.star : texs.square; m.color.setHex(CONFETTI[Math.floor(rnd() * CONFETTI.length)]);
        p.vx = (rnd() - 0.5) * 5; p.vz = (rnd() - 0.5) * 5; p.vy = 3 + rnd() * 4; p.g = 9; p.life = 1.4 + rnd() * 0.8; p.size = 0.26;
      } else { // pedaços de bloco
        m.map = texs.square; m.color.setHex(color || 0xffffff);
        p.vx = (rnd() - 0.5) * 3.2; p.vz = (rnd() - 0.5) * 3.2; p.vy = 1.5 + rnd() * 2.5; p.g = 14; p.life = 0.45 + rnd() * 0.3; p.size = 0.16 + rnd() * 0.08;
      }
      p.max = p.life;
      m.opacity = 1; m.transparent = true;
      p.s.scale.setScalar(p.size);
    }
  };
  G.updateParticles = function (dt) {
    for (var i = 0; i < POOL; i++) {
      var p = parts[i];
      if (p.life <= 0) continue;
      p.life -= dt;
      if (p.life <= 0) { p.s.visible = false; continue; }
      p.vy -= p.g * dt;
      p.s.position.x += p.vx * dt; p.s.position.y += p.vy * dt; p.s.position.z += p.vz * dt;
      p.s.material.opacity = Math.min(1, p.life / (p.max * 0.4));
    }
  };

  // ---------- povoar a ilha ----------
  // nível concluído que traz cada dinossauro novo; depois disso, amigos coloridos
  G.DINO_UNLOCKS = [[10, 'spino'], [20, 'anky'], [30, 'para']];
  var VARIANT_KINDS = ['tricera', 'rex', 'stego', 'bronto', 'spino', 'anky', 'para'];
  G.VARIANT_FROM = 35; G.VARIANT_MAX = 4;
  G.variantFor = function (n) { return { kind: VARIANT_KINDS[n % VARIANT_KINDS.length], tint: 1 + (n % 4) }; };
  G.unlockedDinoKinds = function (done) {
    var k = ['rex', 'tricera', 'bronto', 'stego'];
    G.DINO_UNLOCKS.forEach(function (u) { if (done >= u[0]) k.push(u[1]); });
    return k;
  };
  G.babies = [];

  G.addCreature = function (kind, x, y, z, opts) {
    var c = new Creature(kind, x, y, z, opts);
    G.creatures.push(c); return c;
  };
  G.removeCreature = function (c) {
    c.remove();
    var i = G.creatures.indexOf(c); if (i >= 0) G.creatures.splice(i, 1);
    i = G.babies.indexOf(c); if (i >= 0) G.babies.splice(i, 1);
  };

  // bebés: os 4 mais recentes seguem a criança, os outros ficam a viver perto da cabana
  G.MAX_FOLLOW = 4; G.MAX_BABIES = 8;
  G.addBaby = function (kind, x, y, z) {
    var b = G.addCreature(kind, x, y, z, { scale: 0.38, baby: true });
    G.babies.push(b);
    G.arrangeBabies();
    return b;
  };
  G.arrangeBabies = function () {
    var P = G.player, list = G.babies;
    while (list.length > G.MAX_BABIES) {
      // o mais antigo vai-se embora (só quando está longe da vista)
      var old = list[0], dx = old.x - P.x, dz = old.z - P.z;
      if (dx * dx + dz * dz < 30 * 30) break;
      G.removeCreature(old);
    }
    var first = Math.max(0, list.length - G.MAX_FOLLOW);
    for (var i = 0; i < list.length; i++) {
      var b = list[i];
      if (i >= first) { b.followTarget = P; b.stopAt = 3 + (i - first) * 0.7; }
      else if (b.followTarget === P) { b.followTarget = null; b.homeX = G.spawn.x - 3 + (i % 3) * 2; b.homeZ = G.spawn.z + 4 + (i % 2) * 2; }
    }
  };

  G.populate = function (done, babyKinds) {
    G.creatures.forEach(function (c) { c.remove(); });
    G.creatures = []; G.babies = [];
    var spots = G.spots.slice();
    var grass = spots.filter(function (s) { return !s.sand; });
    var sand = spots.filter(function (s) { return s.sand; });
    function take(list, pred) {
      for (var i = 0; i < list.length; i++) if (!pred || pred(list[i])) return list.splice(i, 1)[0];
      return list.length ? list.shift() : (spots.length ? spots[0] : { x: G.W / 2, y: G.SEA + 6, z: G.D / 2 });
    }
    function add(kind, s, opts) { return G.addCreature(kind, s.x + 0.5, s.y + 0.05, s.z + 0.5, opts); }
    var near = function (s) { return s.d < 30; };
    // perto da cabana: um dinossauro manso e o cachorro
    add('tricera', take(grass, function (s) { return s.d < 22; }));
    add('puppy', { x: Math.floor(G.spawn.x) - 2, y: Math.floor(G.spawn.y), z: Math.floor(G.spawn.z) + 2 }).followTarget = G.player;
    add('rex', take(grass, near));
    add('bronto', take(grass, near));
    add('stego', take(grass));
    add('stego', take(grass));
    add('tricera', take(grass));
    add('bronto', take(grass));
    add('bunny', take(grass, near)); add('bunny', take(grass)); add('bunny', take(grass));
    add('duck', take(sand)); add('duck', take(sand));
    add('turtle', take(sand)); add('turtle', take(sand));
    add('ptero', take(grass, near)); add('ptero', take(grass));
    // desbloqueados por nível
    G.DINO_UNLOCKS.forEach(function (u) { if (done >= u[0]) add(u[1], take(grass, near)); });
    var nv = Math.min(G.VARIANT_MAX, done >= G.VARIANT_FROM ? Math.floor((done - G.VARIANT_FROM) / 5) + 1 : 0);
    for (var v = 0; v < nv; v++) { var vv = G.variantFor(v); add(vv.kind, take(grass), { tint: vv.tint }); }
    // bebés guardados
    (babyKinds || []).slice(-G.MAX_BABIES).forEach(function (k, i) {
      if (!SPECIES[k] || !SPECIES[k].dino) return;
      G.addBaby(k, G.spawn.x - 2 + (i % 4) * 1.2, G.spawn.y + 0.1, G.spawn.z + 3 + Math.floor(i / 4) * 1.2);
    });
  };

  G.hatchEgg = function (egg) {
    var kind = egg.babyKind || 'rex';
    G.removeCreature(egg);
    var baby = G.addBaby(kind, egg.x, egg.y, egg.z);
    baby.happy = 1.2;
    G.burst('confetti', egg.x, egg.y + 0.6, egg.z, 18);
    G.burst('heart', egg.x, egg.y + 1, egg.z, 3);
    if (G.onEggHatched) G.onEggHatched(egg, baby);
  };
})();
