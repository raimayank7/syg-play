/* Colour vision game: dot-plate numbers generated here, and a colour-blindness simulator.
   This is a game and a design aid, not a medical test. Simulation: Machado, Oliveira and Fernandes (2009) matrices at full severity, applied in linear RGB. */
(function () {
  'use strict';
  var M = {
    protan: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
    deutan: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.011820, 0.042940, 0.968881]],
    tritan: [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.303900]]
  };
  function lin(v) { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
  function gam(v) { v = Math.max(0, Math.min(1, v)); return Math.round(255 * (v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055)); }
  function simulate(rgb, type) {
    if (type === 'none') return rgb.slice();
    if (type === 'achroma') { var y = 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]), g = gam(y); return [g, g, g]; }
    var m = M[type], l = [lin(rgb[0]), lin(rgb[1]), lin(rgb[2])];
    return [0, 1, 2].map(function (i) { return gam(m[i][0] * l[0] + m[i][1] * l[1] + m[i][2] * l[2]); });
  }
  function lum(rgb) { return 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]); }
  function contrast(a, b) { var x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
  function hex(rgb) { return '#' + rgb.map(function (v) { return ('0' + v.toString(16)).slice(-2); }).join(''); }
  function parseHex(h) { h = h.replace('#', ''); if (h.length === 3) h = h.replace(/(.)/g, '$1$1'); return [0, 2, 4].map(function (i) { return parseInt(h.substr(i, 2), 16); }); }
  // distance between colours as seen by a simulated viewer (plain distance in linear RGB scaled; enough to compare)
  function dist(a, b) { var d = [0, 1, 2].map(function (i) { return lin(a[i]) - lin(b[i]); }); return Math.sqrt(d[0] * d[0] + d[1] * d[1] + d[2] * d[2]); }
  // colour from hue (deg), saturation 0..1 and target relative luminance Y, by bisection on value
  function hsv(h, s, v) { var c = v * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = v - c, r, g, b; h = ((h % 360) + 360) % 360; if (h < 60) { r = c; g = x; b = 0; } else if (h < 120) { r = x; g = c; b = 0; } else if (h < 180) { r = 0; g = c; b = x; } else if (h < 240) { r = 0; g = x; b = c; } else if (h < 300) { r = x; g = 0; b = c; } else { r = c; g = 0; b = x; } return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)]; }
  function colorY(h, s, Y) { var lo = 0, hi = 1, i, c; for (i = 0; i < 24; i++) { var mid = (lo + hi) / 2; c = hsv(h, s, mid); if (lum(c) < Y) lo = mid; else hi = mid; } return hsv(h, s, hi); }
  var SCHEMES = {
    control: { fig: [[210, 0.05, 0.05], [220, 0.05, 0.08]], bg: [[40, 0.35, 0.55], [30, 0.4, 0.62]], name: 'clear' },
    redgreen: { fig: [[85, 0.55, 0.3], [95, 0.6, 0.3], [105, 0.5, 0.3]], bg: [[20, 0.62, 0.3], [30, 0.6, 0.3], [12, 0.55, 0.3]], name: 'red-green' },
    redgreen2: { fig: [[75, 0.5, 0.3], [100, 0.45, 0.3]], bg: [[10, 0.5, 0.3], [25, 0.55, 0.3], [345, 0.4, 0.3]], name: 'red-green' },
    bluegreen: { fig: [[210, 0.5, 0.3], [218, 0.5, 0.3]], bg: [[160, 0.5, 0.3], [152, 0.5, 0.3], [168, 0.5, 0.3]], name: 'blue-green' }
  };
  function paletteColors(list) { return list.map(function (a) { return colorY(a[0], a[1], a[2]); }); }
  function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  var API = { simulate: simulate, contrast: contrast, hex: hex, parseHex: parseHex, dist: dist, colorY: colorY, lum: lum, SCHEMES: SCHEMES, paletteColors: paletteColors, mulberry: mulberry, M: M };
  if (typeof module !== 'undefined' && module.exports) { module.exports = API; return; }
  window.CB = API;

  // ---------- plate drawing
  function drawPlate(cv, digit, scheme, seed) {
    var S = cv.width, ctx = cv.getContext('2d'), rnd = mulberry(seed), off = document.createElement('canvas'), o;
    off.width = off.height = S; o = off.getContext('2d');
    o.fillStyle = '#000'; o.fillRect(0, 0, S, S); o.fillStyle = '#fff'; o.font = '900 ' + Math.round(S * 0.78) + 'px Arial, Helvetica, sans-serif'; o.textAlign = 'center'; o.textBaseline = 'middle'; o.fillText(String(digit), S / 2, S * 0.54);
    var data = o.getImageData(0, 0, S, S).data;
    function inside(x, y) { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= S || y >= S) return false; return data[(y * S + x) * 4] > 128; }
    var sc = SCHEMES[scheme], fig = paletteColors(sc.fig), bg = paletteColors(sc.bg);
    ctx.clearRect(0, 0, S, S); ctx.fillStyle = '#f2efe6'; ctx.beginPath(); ctx.arc(S / 2, S / 2, S / 2, 0, 7); ctx.fill();
    var circles = [], tries = 0, R = S / 2 - 3;
    while (tries < 12000 && circles.length < 900) {
      tries++;
      var r = 4 + rnd() * (S / 40 + 4), a = rnd() * 6.2832, d = Math.sqrt(rnd()) * (R - r - 1), x = S / 2 + Math.cos(a) * d, y = S / 2 + Math.sin(a) * d, ok = true, i;
      for (i = 0; i < circles.length; i++) { var c = circles[i], dx = c.x - x, dy = c.y - y, rr = c.r + r + 1.2; if (dx * dx + dy * dy < rr * rr) { ok = false; break; } }
      if (ok) circles.push({ x: x, y: y, r: r });
    }
    circles.forEach(function (c) {
      var inFig = inside(c.x, c.y), pal = inFig ? fig : bg, col = pal[Math.floor(rnd() * pal.length)];
      var j = (rnd() - 0.5) * 0.06, rgb = col.map(function (v) { return Math.max(0, Math.min(255, Math.round(v * (1 + j)))); });
      ctx.fillStyle = hex(rgb); ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, 7); ctx.fill();
    });
  }
  function gameInit(root) {
    var seq = [['control', 'clear'], ['redgreen', 'red-green'], ['redgreen2', 'red-green'], ['redgreen', 'red-green'], ['bluegreen', 'blue-green'], ['redgreen2', 'red-green']];
    var rnd = mulberry(Date.now() & 0xffffff), digs = [], i, used = {};
    while (digs.length < seq.length) { var d = Math.floor(rnd() * 8) + 2; if (!used[d]) { used[d] = 1; digs.push(d); } }
    var idx = 0, ans = [];
    function show() {
      if (idx >= seq.length) return result();
      var h = '<p class="cb-q">Plate ' + (idx + 1) + ' of ' + seq.length + ': which number do you see?</p><canvas class="cb-pl" width="320" height="320" role="img" aria-label="A circle of coloured dots hiding a number"></canvas><div class="cb-btns">';
      for (var k = 0; k <= 9; k++) h += '<button class="btn ghost" data-d="' + k + '">' + k + '</button>';
      h += '<button class="btn" data-d="x">I see no number</button></div>';
      root.innerHTML = h; drawPlate(root.querySelector('canvas'), digs[idx], seq[idx][0], 1000 + digs[idx] * 7 + idx * 131 + (Date.now() % 97));
    }
    function result() {
      var kind = {}, tot = {};
      seq.forEach(function (s, k) { tot[s[1]] = (tot[s[1]] || 0) + 1; if (ans[k] === digs[k]) kind[s[1]] = (kind[s[1]] || 0) + 1; });
      var rg = kind['red-green'] || 0, by = kind['blue-green'] || 0, ct = kind['clear'] || 0, msg;
      if (!ct) msg = 'You did not read the clear plate. Check that your screen is bright and not in a night or colour-filter mode, then try again before reading anything into the other plates.';
      else if (rg === tot['red-green'] && by === tot['blue-green']) msg = 'You read every plate. Nothing here suggests a colour difference, though this game cannot rule one out.';
      else if (rg < tot['red-green']) msg = 'You missed some of the red-green plates. Screens and lighting vary a lot, so this does not mean you have a colour vision difference. If you often confuse reds, greens, browns and oranges, ask an optician for a proper test.';
      else msg = 'You read the red-green plates but not the blue-green one. That is common on some screens and not a conclusion. An optician can test properly if you are concerned.';
      root.innerHTML = '<div class="cb-res"><h2>Your result</h2><ul><li>Clear plate: ' + ct + ' of ' + tot['clear'] + ' right</li><li>Red-green plates: ' + rg + ' of ' + tot['red-green'] + ' right</li><li>Blue-green plate: ' + by + ' of ' + tot['blue-green'] + ' right</li></ul><p>' + msg + '</p><p class="cb-warn"><b>This is a game, not a medical test.</b> Colours on a screen change with brightness, night mode and the device.</p><button class="btn" data-d="r">Play again</button></div>';
    }
    root.addEventListener('click', function (e) { var d = e.target.getAttribute && e.target.getAttribute('data-d'); if (d === null || d === undefined) return; if (d === 'r') { location.reload(); return; } ans.push(d === 'x' ? -1 : +d); idx++; show(); });
    show();
  }
  function simInit(root) {
    var types = [['none', 'Normal vision'], ['protan', 'Protanopia (red-blind)'], ['deutan', 'Deuteranopia (green-blind)'], ['tritan', 'Tritanopia (blue-blind)'], ['achroma', 'No colour (greyscale)']];
    root.innerHTML = '<div class="cb-row"><label>Colour A <input type="color" id="ca" value="#d9382b"></label><label>Colour B <input type="color" id="cb2" value="#2e8b3d"></label></div><div class="cb-grid" id="cg"></div><p class="cb-n" id="cn"></p>';
    function draw() {
      var a = parseHex(root.querySelector('#ca').value), b = parseHex(root.querySelector('#cb2').value), h = '';
      types.forEach(function (t) { var x = simulate(a, t[0]), y = simulate(b, t[0]), c = contrast(x, y); h += '<div class="cb-cell"><b>' + t[1] + '</b><div class="cb-sw"><span style="background:' + hex(x) + '"></span><span style="background:' + hex(y) + '"></span></div><small>Contrast between the two: ' + c.toFixed(2) + ' to 1</small></div>'; });
      root.querySelector('#cg').innerHTML = h;
      root.querySelector('#cn').textContent = 'A contrast of 3 to 1 or more helps most people tell two colours apart as shapes; 4.5 to 1 is the usual target for text. Simulations are approximate: real colour vision varies.';
    }
    root.addEventListener('input', draw); draw();
  }
  function init() {
    var g = document.querySelector('[data-cbgame]'); if (g) gameInit(g);
    var s = document.querySelector('[data-cbsim]'); if (s) simInit(s);
  }
  if (document.readyState == 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
