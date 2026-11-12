/* Ilha dos Dinos — interface: barra de blocos, ovos, dicas e menu de pausa. */
(function () {
  'use strict';
  var G = window.G;
  var $ = function (id) { return document.getElementById(id); };
  var UI = (G.ui = {});
  var icons = {};

  function hexCss(hex, k) {
    var r = Math.round(((hex >> 16) & 255) * k), g = Math.round(((hex >> 8) & 255) * k), b = Math.round((hex & 255) * k);
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }
  function blockIcon(id) {
    var cv = document.createElement('canvas'); cv.width = cv.height = 96;
    var g = cv.getContext('2d'), c = G.BLOCK_COLORS[id];
    function poly(pts, fill) {
      g.beginPath(); g.moveTo(pts[0], pts[1]);
      for (var i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
      g.closePath(); g.fillStyle = fill; g.fill();
      g.lineWidth = 3; g.lineJoin = 'round'; g.strokeStyle = 'rgba(29,43,74,0.55)'; g.stroke();
    }
    if (id === G.B.WATER) g.globalAlpha = 0.8;
    poly([8, 28, 48, 48, 48, 92, 8, 72], hexCss(c[1], 0.84));
    poly([88, 28, 48, 48, 48, 92, 88, 72], hexCss(c[1], 0.66));
    poly([48, 8, 88, 28, 48, 48, 8, 28], hexCss(c[0], 1));
    return cv.toDataURL();
  }
  function ghostIcon() { // cubo tracejado: "constrói aqui"
    var cv = document.createElement('canvas'); cv.width = cv.height = 96;
    var g = cv.getContext('2d');
    g.lineWidth = 5; g.lineJoin = 'round'; g.setLineDash([9, 7]); g.strokeStyle = '#fff'; g.fillStyle = 'rgba(255,210,60,0.55)';
    [[8, 28, 48, 48, 48, 92, 8, 72], [88, 28, 48, 48, 48, 92, 88, 72], [48, 8, 88, 28, 48, 48, 8, 28]].forEach(function (pts) {
      g.beginPath(); g.moveTo(pts[0], pts[1]);
      for (var i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
      g.closePath(); g.fill(); g.stroke();
    });
    return cv.toDataURL();
  }

  var HINT_ICONS = {
    pet: '<svg viewBox="0 0 32 32"><path d="M16 28C4 19 2 12 6 7c3-3 8-2 10 2 2-4 7-5 10-2 4 5 2 12-10 21z" fill="#ff5c8a" stroke="#fff" stroke-width="2"/></svg>',
    ride: '<svg viewBox="0 0 32 32"><path d="M16 4 28 17h-7v11H11V17H4z" fill="#8ff06a" stroke="#fff" stroke-width="2" stroke-linejoin="round"/></svg>',
    off: '<svg viewBox="0 0 32 32"><path d="M16 28 4 15h7V4h10v11h7z" fill="#ffd23c" stroke="#fff" stroke-width="2" stroke-linejoin="round"/></svg>'
  };

  UI.init = function () {
    G.BLOCK_ORDER.forEach(function (b) { icons[b[0]] = blockIcon(b[0]); });
    icons.build = ghostIcon();
    // menu de pausa
    UI.buttons = Array.prototype.slice.call(document.querySelectorAll('#pause button'));
    UI.buttons.forEach(function (b, i) {
      b.addEventListener('mouseenter', function () { UI.pauseSel = i; UI.paintPause(); });
      b.addEventListener('click', function () { if (b.dataset.act !== 'new') UI.activate(b.dataset.act); });
      if (b.dataset.act === 'new') {
        b.addEventListener('mousedown', function () { UI.mouseHold = true; });
        b.addEventListener('mouseup', function () { UI.mouseHold = false; });
        b.addEventListener('mouseleave', function () { UI.mouseHold = false; });
      }
    });
    UI.pauseSel = 0; UI.hold = 0; UI.mouseHold = false;
  };

  var lastSel = -1;
  UI.setHotbar = function (sel) {
    if (sel === lastSel) return;
    lastSel = sel;
    var bar = $('hotbar'), n = G.HOTBAR.length, html = '';
    for (var o = -3; o <= 3; o++) {
      var k = ((sel + o) % n + n) % n;
      var cls = o === 0 ? 'slot sel' : (Math.abs(o) === 3 ? 'slot far' : (Math.abs(o) === 2 ? 'slot mid' : 'slot'));
      html += '<div class="' + cls + '"><img alt="" src="' + icons[G.HOTBAR[k]] + '"></div>';
    }
    bar.innerHTML = html;
  };

  UI.blockIcon = function (id) { return icons[id]; };
  UI.refreshHotbar = function () {
    var P = G.player;
    if (P && P.sel >= G.HOTBAR.length) P.sel = 0;
    lastSel = -1;
    if (P) UI.setHotbar(P.sel);
  };

  // cartão da missão: número do nível, desenho do objetivo e bolinhas de progresso
  var lastIcon = '';
  UI.setMission = function (level, m, pop) {
    $('lvlnum').textContent = String(level);
    if (m.icon !== lastIcon) {
      lastIcon = m.icon;
      var parts = m.icon.split(':'), img = $('micon');
      img.src = parts[0] === 'build' ? icons.build : (G.thumbs[parts[1] || parts[0]] || icons.build);
      img.className = parts[0];
    }
    var box = $('mdots');
    if (m.total <= 10) {
      var html = '';
      for (var i = 0; i < m.total; i++) html += '<i class="' + (i < m.done ? 'on' : '') + (pop && i === m.done - 1 ? ' pop' : '') + '"></i>';
      box.className = 'dots'; box.innerHTML = html;
    } else {
      box.className = 'bar';
      box.innerHTML = '<b style="width:' + Math.round(100 * m.done / m.total) + '%"></b>';
    }
  };
  // seta de ajuda (ângulo em radianos relativo à frente do jogador; null esconde)
  var compassOn = false;
  UI.setCompass = function (angle, near) {
    var el = $('compass');
    if (angle === null || angle === undefined) { if (compassOn) { el.hidden = true; compassOn = false; } return; }
    if (!compassOn) { el.hidden = false; compassOn = true; }
    el.classList.toggle('near', !!near);
    $('compassarrow').style.transform = 'rotate(' + (angle * 180 / Math.PI).toFixed(0) + 'deg)';
  };
  var luTimer = 0;
  UI.levelUp = function (n) {
    var el = $('levelup');
    $('lunum').textContent = String(n);
    el.hidden = false;
    el.classList.remove('go'); void el.offsetWidth; el.classList.add('go');
    window.clearTimeout(luTimer);
    luTimer = window.setTimeout(function () { el.hidden = true; }, 2900);
  };
  UI.hideLevelUp = function () { window.clearTimeout(luTimer); $('levelup').hidden = true; };
  UI.showUnlock = function (urls) {
    var el = $('unlock');
    $('unlockicons').innerHTML = urls.map(function (u) { return '<img alt="" src="' + u + '">'; }).join('');
    el.hidden = false;
    el.classList.remove('go'); void el.offsetWidth; el.classList.add('go');
  };
  UI.hideUnlock = function () { $('unlock').hidden = true; };

  var lastHint = '';
  UI.showHint = function (kind) { // 'pet' | 'ride' | 'off' | null
    var key = (kind || '') + (G.input.lastDevice === 'pad' ? 'p' : 'k');
    if (key === lastHint) return;
    lastHint = key;
    var el = $('hint');
    if (!kind) { el.hidden = true; return; }
    el.hidden = false;
    $('hintkey').textContent = G.input.lastDevice === 'pad' ? 'X' : 'E';
    $('hinticon').innerHTML = HINT_ICONS[kind];
  };
  var lastDev = '';
  UI.setDevice = function () {
    var d = G.input.lastDevice;
    if (d === lastDev) return;
    lastDev = d;
    $('keyDig').textContent = d === 'pad' ? 'LT' : 'rato esq.';
    $('keyPlace').textContent = d === 'pad' ? 'RT' : 'rato dir.';
  };
  UI.setFly = function (on) { $('flybadge').hidden = !on; };
  UI.setRiding = function (on) { $('hud').classList.toggle('riding', !!on); };
  UI.setWater = function (on) { $('water').hidden = !on; };
  UI.setXboxTip = function (on) { $('xboxtip').hidden = !on; };
  UI.setFps = function (txt) { var f = $('fps'); f.hidden = !txt; if (txt) f.textContent = txt; };

  UI.showStart = function (on) { $('start').hidden = !on; };
  UI.showHud = function (on) { $('hud').hidden = !on; document.body.classList.toggle('playing', !!on); };

  UI.setSound = function (on) {
    var b = document.querySelector('#pause button[data-act="sound"]');
    b.classList.toggle('off', !on);
    var w = $('soundwaves'), x = $('soundoff');
    if (on) { w.removeAttribute('hidden'); x.setAttribute('hidden', ''); }
    else { w.setAttribute('hidden', ''); x.removeAttribute('hidden'); }
  };

  UI.paintPause = function () {
    UI.buttons.forEach(function (b, i) { b.classList.toggle('sel', i === UI.pauseSel); });
  };
  UI.openPause = function () { $('pause').hidden = false; UI.pauseSel = 0; UI.hold = 0; UI.mouseHold = false; UI.paintPause(); UI.setRing(0); };
  UI.closePause = function () { $('pause').hidden = true; };
  UI.setRing = function (p) {
    var ring = document.querySelector('#pause .ring');
    ring.setAttribute('stroke-dashoffset', String(289 * (1 - p)));
  };
  UI.activate = function (act) { if (G.onMenu) G.onMenu(act); };

  // navegação do menu com comando/teclado; "ilha nova" exige manter premido
  UI.updatePause = function (dt) {
    var ui = G.input.ui, n = UI.buttons.length;
    if (ui.left || ui.up) { UI.pauseSel = (UI.pauseSel + n - 1) % n; UI.paintPause(); G.sound.play('menu'); }
    if (ui.right || ui.down) { UI.pauseSel = (UI.pauseSel + 1) % n; UI.paintPause(); G.sound.play('menu'); }
    var act = UI.buttons[UI.pauseSel].dataset.act;
    var holding = UI.mouseHold || (act === 'new' && G.input.acceptHeld);
    if (holding) {
      UI.hold += dt;
      UI.setRing(Math.min(1, UI.hold / 1.8));
      if (UI.hold >= 1.8) { UI.hold = 0; UI.mouseHold = false; UI.setRing(0); UI.activate('new'); return; }
    } else if (UI.hold > 0) { UI.hold = 0; UI.setRing(0); }
    if (ui.accept && act !== 'new') UI.activate(act);
    else if (ui.back) UI.activate('resume');
  };
})();
