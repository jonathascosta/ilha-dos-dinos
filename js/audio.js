/* Ilha dos Dinos — sons sintetizados (sem ficheiros de áudio). */
(function () {
  'use strict';
  var G = window.G;
  var ctx = null, master = null, musicGain = null, noiseBuf = null;
  var S = (G.sound = { enabled: true, musicOn: true });

  S.init = function () {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = S.enabled ? 0.5 : 0; master.connect(ctx.destination);
      musicGain = ctx.createGain(); musicGain.gain.value = 0.16; musicGain.connect(master);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
      var d = noiseBuf.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { ctx = null; }
  };
  S.setEnabled = function (on) {
    S.enabled = on;
    if (master) master.gain.value = on ? 0.5 : 0;
  };
  S.suspend = function () { if (ctx && ctx.state === 'running') ctx.suspend(); };
  S.resume = function () { if (ctx && ctx.state === 'suspended') ctx.resume(); };

  function tone(type, f0, f1, dur, vol, delay, dest) {
    if (!ctx) return;
    var t = ctx.currentTime + (delay || 0);
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.02, dur * 0.3));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || master);
    o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, vol, freq, delay) {
    if (!ctx) return;
    var t = ctx.currentTime + (delay || 0);
    var s = ctx.createBufferSource(); s.buffer = noiseBuf;
    var f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq;
    var g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(master);
    s.start(t); s.stop(t + dur + 0.02);
  }

  S.play = function (name) {
    if (!ctx || !S.enabled) return;
    switch (name) {
      case 'place': tone('sine', 420, 760, 0.09, 0.5); break;
      case 'break': noise(0.14, 0.5, 1400); tone('triangle', 300, 110, 0.12, 0.35); break;
      case 'select': tone('sine', 880, 990, 0.05, 0.2); break;
      case 'fly': tone('sine', 400, 900, 0.22, 0.3); break;
      case 'land': tone('sine', 700, 350, 0.18, 0.3); break;
      case 'mount': tone('triangle', 392, 392, 0.1, 0.4); tone('triangle', 523, 523, 0.1, 0.4, 0.1); tone('triangle', 659, 659, 0.16, 0.4, 0.2); break;
      case 'crack': noise(0.07, 0.5, 3000); noise(0.07, 0.5, 3000, 0.25); noise(0.07, 0.5, 3000, 0.55); break;
      case 'hatch': [523, 659, 784, 1047].forEach(function (f, i) { tone('triangle', f, f, 0.16, 0.45, i * 0.11); }); break;
      case 'win': [523, 659, 784, 1047, 784, 1047, 1319].forEach(function (f, i) { tone('triangle', f, f, 0.22, 0.45, i * 0.16); tone('sine', f / 2, f / 2, 0.22, 0.3, i * 0.16); }); break;
      case 'menu': tone('sine', 660, 660, 0.06, 0.25); break;
      case 'unlock': [392, 523, 659, 784, 1047, 1319].forEach(function (f, i) { tone('triangle', f, f, 0.2, 0.42, i * 0.09); }); tone('sine', 1568, 1568, 0.5, 0.25, 0.6); break;
      case 'nope': tone('sine', 220, 180, 0.12, 0.25); break;
    }
  };

  // cada estrela apanhada soa um pouco mais aguda
  S.star = function (n) {
    if (!ctx || !S.enabled) return;
    var f = 660 * Math.pow(1.122, Math.min(12, n - 1));
    tone('triangle', f, f, 0.12, 0.4); tone('triangle', f * 1.5, f * 1.5, 0.2, 0.4, 0.09);
  };

  S.voice = function (kind, baby, vol) {
    if (!ctx || !S.enabled) return;
    var k = baby ? 2.4 : 1, v = (vol === undefined ? 1 : vol);
    switch (kind) {
      case 'roar':
        if (baby) { tone('sawtooth', 520, 380, 0.22, 0.25 * v); tone('square', 540, 400, 0.22, 0.08 * v); }
        else { tone('sawtooth', 130, 62, 0.75, 0.42 * v); tone('sawtooth', 97, 50, 0.75, 0.3 * v); noise(0.6, 0.28 * v, 500); }
        break;
      case 'grunt': tone('sawtooth', 150 * k, 105 * k, 0.28, 0.3 * v); tone('sawtooth', 160 * k, 100 * k, 0.24, 0.3 * v, 0.34); break;
      case 'moo': tone('triangle', 170 * k, 220 * k, 0.5, 0.4 * v); tone('sawtooth', 85 * k, 110 * k, 0.5, 0.14 * v); break;
      case 'screech': tone('sawtooth', 900, 1500, 0.16, 0.2 * v); tone('sawtooth', 1500, 800, 0.22, 0.2 * v, 0.16); break;
      case 'squeak': tone('sine', 1000, 1500, 0.09, 0.3 * v); tone('sine', 1200, 1700, 0.09, 0.3 * v, 0.13); break;
      case 'quack': tone('square', 420, 330, 0.11, 0.16 * v); tone('square', 420, 310, 0.14, 0.16 * v, 0.17); break;
      case 'bark': tone('square', 520, 300, 0.09, 0.2 * v); noise(0.07, 0.2 * v, 1800); tone('square', 560, 320, 0.1, 0.2 * v, 0.2); noise(0.07, 0.2 * v, 1800, 0.2); break;
    }
  };

  // música ambiente: notas suaves numa escala pentatónica
  var SCALE = [261.6, 293.7, 329.6, 392.0, 440.0, 523.3, 587.3, 659.3, 784.0];
  var nextNote = 0, last = 4;
  S.updateMusic = function () {
    if (!ctx || !S.enabled || !S.musicOn || ctx.state !== 'running') return;
    var now = ctx.currentTime;
    if (nextNote < now) nextNote = now + 0.1;
    while (nextNote < now + 0.6) {
      last = Math.max(0, Math.min(SCALE.length - 1, last + Math.floor(Math.random() * 5) - 2));
      var f = SCALE[last], d = nextNote - now;
      tone('sine', f, f, 1.6, 0.5, d, musicGain);
      if (Math.random() < 0.35) tone('triangle', f / 2, f / 2, 2.2, 0.35, d, musicGain);
      nextNote += [0.45, 0.9, 0.9, 1.35, 1.8][Math.floor(Math.random() * 5)];
    }
  };
})();
