/* play.shareyourgroup.com/daily: a fresh puzzle every day (number, word, sequence, odd one out) with a streak counter. Written for this site.
   Everyone gets the same puzzles on the same date, because they are made from the date by our own generators. Nothing is sent anywhere. */
(function (root) {
  'use strict';
  /* ---- seeded random numbers ---- */
  function prng(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function ri(r, a, b) { return a + Math.floor(r() * (b - a + 1)); }
  function pick(r, arr) { return arr[Math.floor(r() * arr.length)]; }
  function shuffle(r, a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function dateKey(dt) { dt = dt || new Date(); return dt.getFullYear() * 10000 + (dt.getMonth() + 1) * 100 + dt.getDate(); }
  function level(dt) { dt = dt || new Date(); var d = dt.getDay(); return [5, 1, 2, 3, 3, 4, 5][d]; } // Sunday hard, Monday easy
  function seedFor(key, kind) { var h = key * 2654435761 >>> 0; for (var i = 0; i < kind.length; i++) h = Math.imul(h ^ kind.charCodeAt(i), 16777619) >>> 0; return h; }

  /* ---- number puzzle: make the target using every number once ---- */
  function numberPuzzle(key, lv) {
    var r = prng(seedFor(key, 'number')), n = lv <= 1 ? 3 : lv <= 3 ? 4 : 5, tries = 0;
    while (tries++ < 5000) {
      var nums = [], i; for (i = 0; i < n; i++) nums.push(ri(r, 1, lv <= 2 ? 9 : 12));
      var items = nums.map(function (x) { return { v: x, s: String(x) }; });
      var ok = true;
      while (items.length > 1 && ok) {
        var a = items.splice(ri(r, 0, items.length - 1), 1)[0], b = items.splice(ri(r, 0, items.length - 1), 1)[0], op = pick(r, ['+', '-', '*', '*', '+', '/']), v, s;
        if (op === '+') { v = a.v + b.v; s = '(' + a.s + ' + ' + b.s + ')'; }
        else if (op === '-') { if (a.v < b.v) { var t = a; a = b; b = t; } v = a.v - b.v; s = '(' + a.s + ' - ' + b.s + ')'; if (v <= 0) ok = false; }
        else if (op === '*') { v = a.v * b.v; s = '(' + a.s + ' x ' + b.s + ')'; }
        else { if (b.v === 0 || a.v % b.v !== 0) { ok = false; break; } v = a.v / b.v; s = '(' + a.s + ' / ' + b.s + ')'; }
        if (ok) items.push({ v: v, s: s });
      }
      if (ok && items[0].v >= 10 && items[0].v <= (lv <= 2 ? 60 : 120) && Number.isInteger(items[0].v)) { var sol = items[0].s; if (sol.charAt(0) === '(' && sol.charAt(sol.length - 1) === ')') sol = sol.slice(1, -1); return { nums: nums, target: items[0].v, solution: sol }; }
    }
    return { nums: [2, 3, 4, 5], target: 20, solution: '(2 + 3) x 4' };
  }
  function evalExpr(str) { // returns {value, used:[numbers]} or null; supports + - x * / ( ) with proper precedence
    var s = str.replace(/x|X|×/g, '*').replace(/÷/g, '/').replace(/\s+/g, ''), pos = 0, used = [];
    if (!/^[0-9+\-*\/().]+$/.test(s)) return null;
    function num() { var m = /^[0-9]+/.exec(s.slice(pos)); if (!m) throw 0; pos += m[0].length; used.push(+m[0]); return +m[0]; }
    function atom() { if (s[pos] === '(') { pos++; var v = expr(); if (s[pos] !== ')') throw 0; pos++; return v; } return num(); }
    function term() { var v = atom(); while (s[pos] === '*' || s[pos] === '/') { var o = s[pos++], w = atom(); v = o === '*' ? v * w : v / w; } return v; }
    function expr() { var v = term(); while (s[pos] === '+' || s[pos] === '-') { var o = s[pos++], w = term(); v = o === '+' ? v + w : v - w; } return v; }
    try { var v = expr(); if (pos !== s.length || !isFinite(v)) return null; return { value: v, used: used }; } catch (e) { return null; }
  }
  function checkNumber(p, str) {
    var e = evalExpr(str); if (!e) return 'I could not read that. Use numbers, + - x / and brackets.';
    var a = e.used.slice().sort(function (x, y) { return x - y; }).join(','), b = p.nums.slice().sort(function (x, y) { return x - y; }).join(',');
    if (a !== b) return 'Use each of the numbers ' + p.nums.join(', ') + ' exactly once.';
    if (Math.abs(e.value - p.target) > 1e-9) return 'That makes ' + (Math.round(e.value * 1000) / 1000) + ', not ' + p.target + '.';
    return '';
  }

  /* ---- sequence puzzle ---- */
  function seqPuzzle(key, lv) {
    var r = prng(seedFor(key, 'seq')), kinds = lv <= 1 ? ['arith', 'geo'] : lv <= 3 ? ['arith', 'geo', 'square', 'tri', 'fib'] : ['arith', 'geo', 'square', 'tri', 'fib', 'alt', 'cube', 'prime'], k = pick(r, kinds), seq = [], rule = '', a, d, i;
    if (k === 'arith') { a = ri(r, 1, 20); d = ri(r, 2, lv >= 4 ? 13 : 7) * (lv >= 4 && r() < .3 ? -1 : 1); if (d < 0) a += 60; for (i = 0; i < 6; i++) seq.push(a + d * i); rule = 'Each term is ' + (d > 0 ? 'the one before plus ' + d : 'the one before minus ' + (-d)) + '.'; }
    else if (k === 'geo') { a = ri(r, 1, 5); d = ri(r, 2, 3); for (i = 0; i < 6; i++) seq.push(a * Math.pow(d, i)); rule = 'Each term is the one before multiplied by ' + d + '.'; }
    else if (k === 'square') { a = ri(r, 1, 6); var c = lv >= 3 ? ri(r, 0, 5) : 0; for (i = 0; i < 6; i++) seq.push((a + i) * (a + i) + c); rule = 'These are the square numbers' + (c ? ' plus ' + c : '') + ': ' + (a) + ' squared, ' + (a + 1) + ' squared, and so on.'; }
    else if (k === 'tri') { a = ri(r, 1, 5); for (i = 0; i < 6; i++) { var m = a + i; seq.push(m * (m + 1) / 2); } rule = 'These are triangular numbers: 1, 3, 6, 10 and so on, added up one more each time. The gaps grow by 1.'; }
    else if (k === 'fib') { a = ri(r, 1, 4); d = ri(r, 1, 5); seq = [a, d]; for (i = 2; i < 6; i++) seq.push(seq[i - 1] + seq[i - 2]); rule = 'Each term is the sum of the two terms before it.'; }
    else if (k === 'alt') { a = ri(r, 5, 20); var x = ri(r, 2, 6), y = ri(r, 1, x - 1); seq = [a]; for (i = 1; i < 6; i++) seq.push(seq[i - 1] + (i % 2 ? x : -y)); rule = 'The terms alternate between adding ' + x + ' and subtracting ' + y + '.'; }
    else if (k === 'cube') { a = ri(r, 1, 4); for (i = 0; i < 6; i++) seq.push(Math.pow(a + i, 3)); rule = 'These are cube numbers: ' + a + ' cubed, ' + (a + 1) + ' cubed, and so on.'; }
    else { var P = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43]; a = ri(r, 0, 6); seq = P.slice(a, a + 6); rule = 'These are prime numbers in order, each divisible only by 1 and itself.'; }
    var shown = seq.slice(0, 5), ans = seq[5], opts = {}, cands = [ans + 1, ans - 1, ans + 2, ans - 2, ans + 10, ans * 2, ans + (seq[4] - seq[3]), ans - (seq[4] - seq[3]) + 1], list = [ans];
    opts[ans] = 1;
    shuffle(r, cands).forEach(function (c) { if (list.length < 4 && c > 0 && !opts[c]) { opts[c] = 1; list.push(c); } });
    var j = 100; while (list.length < 4) { if (!opts[ans + j]) { opts[ans + j] = 1; list.push(ans + j); } j++; }
    return { kind: k, shown: shown, answer: ans, options: shuffle(r, list), rule: rule };
  }

  /* ---- odd one out (picture) ---- */
  function oddPuzzle(key, lv) {
    var r = prng(seedFor(key, 'odd')), n = lv <= 2 ? 4 : lv <= 4 ? 5 : 6, mode = pick(r, ['shade', 'size', 'tilt']), hue = ri(r, 0, 359), odd = ri(r, 0, n * n - 1);
    var diff = { shade: [18, 14, 11, 8, 6][lv - 1], size: [20, 16, 13, 10, 8][lv - 1], tilt: [30, 24, 18, 14, 10][lv - 1] }[mode];
    return { n: n, mode: mode, hue: hue, odd: odd, diff: diff };
  }

  /* ---- word scramble ---- */
  function wordPuzzle(key, lv, words) {
    var r = prng(seedFor(key, 'word')), len = lv <= 1 ? [4, 5] : lv <= 3 ? [5, 6] : [6, 8], pool = words.filter(function (w) { return w.length >= len[0] && w.length <= len[1]; }), out = [], used = {};
    while (out.length < 5 && out.length < pool.length) { var w = pick(r, pool); if (used[w]) continue; used[w] = 1; var s = w, t = 0; do { s = shuffle(r, w.split('')).join(''); t++; } while (s === w && t < 20); out.push({ word: w, scrambled: s }); }
    return out;
  }
  function sortLetters(w) { return w.split('').sort().join(''); }
  var API = { prng: prng, dateKey: dateKey, level: level, numberPuzzle: numberPuzzle, evalExpr: evalExpr, checkNumber: checkNumber, seqPuzzle: seqPuzzle, oddPuzzle: oddPuzzle, wordPuzzle: wordPuzzle, sortLetters: sortLetters };
  if (typeof module !== 'undefined' && module.exports) { module.exports = API; return; }

  /* ---------- page ---------- */
  var d = document, LS = window.localStorage;
  function el(tag, cls, html) { var e = d.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }
  function load() { try { return JSON.parse(LS.getItem('dly-v1')) || { days: {} }; } catch (e) { return { days: {} }; } }
  function saveS(s) { try { LS.setItem('dly-v1', JSON.stringify(s)); } catch (e) { } }
  var KEY = dateKey(), LV = level(), WORDS = [];
  var LVN = ['', 'Very easy', 'Easy', 'Medium', 'Hard', 'Very hard'];
  function streak() {
    var s = load(), n = 0, dt = new Date();
    if (!(s.days[dateKey(dt)] || []).length) dt.setDate(dt.getDate() - 1);
    while ((s.days[dateKey(dt)] || []).length) { n++; dt.setDate(dt.getDate() - 1); }
    return n;
  }
  function done(kind) { var s = load(), k = String(KEY); s.days[k] = s.days[k] || []; if (s.days[k].indexOf(kind) < 0) s.days[k].push(kind); var keep = {}, ks = Object.keys(s.days).sort().slice(-400); ks.forEach(function (x) { keep[x] = s.days[x]; }); s.days = keep; saveS(s); status(); }
  function isDone(kind) { return (load().days[String(KEY)] || []).indexOf(kind) >= 0; }
  function status() { Array.prototype.forEach.call(d.querySelectorAll('[data-streak]'), function (n) { var s = streak(), t = (load().days[String(KEY)] || []).length; n.innerHTML = '<b>' + s + '</b> day' + (s === 1 ? '' : 's') + ' in a row · ' + t + ' of 4 solved today'; }); }
  function dateText() { return new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); }

  function numberUI(box) {
    var p = numberPuzzle(KEY, LV);
    box.innerHTML = '<div class="dl-card"><p class="dl-k">Number puzzle · ' + LVN[LV] + '</p><p class="dl-t">Make <b>' + p.target + '</b></p><p class="dl-nums">' + p.nums.map(function (x) { return '<span>' + x + '</span>'; }).join('') + '</p><p>Use every number once with + − x ÷ and brackets.</p>' +
      '<p><input type="text" id="ne" inputmode="text" autocomplete="off" placeholder="(3 + 4) x 5" aria-label="Your sum"> <button class="btn" type="button" id="nc">Check</button> <button class="btn ghost" type="button" id="ns">Show a solution</button></p><p class="dl-m" id="nm" aria-live="polite">' + (isDone('number') ? 'You solved this today.' : '') + '</p></div>';
    box.querySelector('#nc').addEventListener('click', function () {
      var m = checkNumber(p, box.querySelector('#ne').value), o = box.querySelector('#nm');
      if (m) { o.textContent = m; o.className = 'dl-m bad'; } else { o.textContent = 'Correct! ' + p.target + ' it is.'; o.className = 'dl-m good'; done('number'); }
    });
    box.querySelector('#ne').addEventListener('keydown', function (e) { if (e.key === 'Enter') box.querySelector('#nc').click(); });
    box.querySelector('#ns').addEventListener('click', function () { box.querySelector('#nm').textContent = 'One way: ' + p.solution.replace(/ x /g, ' × ') + ' = ' + p.target; });
  }
  function seqUI(box) {
    var p = seqPuzzle(KEY, LV);
    box.innerHTML = '<div class="dl-card"><p class="dl-k">Number sequence · ' + LVN[LV] + '</p><p class="dl-t">' + p.shown.join(', ') + ', <b>?</b></p><p>Which number comes next?</p><p class="dl-opts">' + p.options.map(function (o) { return '<button class="btn ghost" type="button" data-o="' + o + '">' + o + '</button>'; }).join(' ') + '</p><p class="dl-m" id="sm" aria-live="polite">' + (isDone('seq') ? 'You solved this today.' : '') + '</p></div>';
    box.addEventListener('click', function (e) { var b = e.target.closest('[data-o]'); if (!b) return; var o = box.querySelector('#sm'); if (+b.getAttribute('data-o') === p.answer) { o.textContent = 'Correct. ' + p.rule; o.className = 'dl-m good'; done('seq'); } else { o.textContent = 'Not that one. Look at the gaps between the numbers.'; o.className = 'dl-m bad'; } });
  }
  function oddUI(box) {
    var p = oddPuzzle(KEY, LV), cells = '', i, S = 56, W = p.n * S;
    for (i = 0; i < p.n * p.n; i++) {
      var odd = i === p.odd, sh = odd && p.mode === 'shade' ? p.diff : 0, sz = odd && p.mode === 'size' ? -p.diff : 0, tilt = odd && p.mode === 'tilt' ? p.diff : 0;
      var x = (i % p.n) * S + S / 2, y = Math.floor(i / p.n) * S + S / 2, rad = 21 + sz / 10 * 2;
      var fill = 'hsl(' + p.hue + ',65%,' + (50 + sh) + '%)';
      cells += '<g data-i="' + i + '" transform="rotate(' + tilt + ' ' + x + ' ' + y + ')" tabindex="0" role="button" aria-label="Shape ' + (i + 1) + '"><rect x="' + (x - S / 2) + '" y="' + (y - S / 2) + '" width="' + S + '" height="' + S + '" fill="transparent"></rect>' + (p.mode === 'tilt' ? '<path d="M' + x + ' ' + (y - 21) + ' L' + (x + 20) + ' ' + (y + 16) + ' L' + (x - 20) + ' ' + (y + 16) + ' Z" fill="' + fill + '"></path>' : '<circle cx="' + x + '" cy="' + y + '" r="' + rad + '" fill="' + fill + '"></circle>') + '</g>';
    }
    var hint = { shade: 'one shape is a slightly different shade', size: 'one shape is slightly bigger or smaller', tilt: 'one triangle is tilted a little' }[p.mode];
    box.innerHTML = '<div class="dl-card"><p class="dl-k">Odd one out · ' + LVN[LV] + '</p><p>Tap the shape that is different: ' + hint + '.</p><svg viewBox="0 0 ' + W + ' ' + W + '" class="dl-svg" role="group" aria-label="Grid of shapes">' + cells + '</svg><p class="dl-m" id="om" aria-live="polite">' + (isDone('odd') ? 'You solved this today.' : '') + '</p></div>';
    function pickIt(g) { var o = box.querySelector('#om'); if (+g.getAttribute('data-i') === p.odd) { o.textContent = 'Found it!'; o.className = 'dl-m good'; done('odd'); } else { o.textContent = 'Not that one. Look again.'; o.className = 'dl-m bad'; } }
    box.addEventListener('click', function (e) { var g = e.target.closest('g[data-i]'); if (g) pickIt(g); });
    box.addEventListener('keydown', function (e) { if ((e.key === 'Enter' || e.key === ' ') && e.target.getAttribute && e.target.getAttribute('data-i') != null) { e.preventDefault(); pickIt(e.target); } });
  }
  function wordUI(box) {
    var ps = wordPuzzle(KEY, LV, WORDS), got = 0, html = '';
    ps.forEach(function (p, i) { html += '<li><span class="dl-sc">' + p.scrambled.toUpperCase() + '</span><input type="text" data-w="' + i + '" maxlength="12" autocomplete="off" autocapitalize="off" aria-label="Unscramble ' + p.scrambled + '" placeholder="' + p.word.charAt(0) + '…"><span class="dl-ok" id="wo' + i + '"></span></li>'; });
    box.innerHTML = '<div class="dl-card"><p class="dl-k">Word scramble · ' + LVN[LV] + '</p><p>Unscramble the five words. The first letter is shown as a hint.</p><ol class="dl-w">' + html + '</ol><p class="dl-m" id="wm" aria-live="polite">' + (isDone('word') ? 'You solved this today.' : '') + '</p></div>';
    var okSet = {};
    box.addEventListener('input', function (e) {
      var inp = e.target; if (inp.getAttribute('data-w') == null) return; var i = +inp.getAttribute('data-w'), v = inp.value.trim().toLowerCase();
      if (v.length === ps[i].word.length && sortLetters(v) === sortLetters(ps[i].word) && (v === ps[i].word || WORDS.indexOf(v) >= 0)) { okSet[i] = 1; box.querySelector('#wo' + i).textContent = '✓'; inp.disabled = true; }
      if (Object.keys(okSet).length === ps.length) { var o = box.querySelector('#wm'); o.textContent = 'All five unscrambled!'; o.className = 'dl-m good'; done('word'); }
    });
  }
  function init() {
    var h = d.querySelector('[data-daily=head]'); if (h) h.innerHTML = '<p class="dl-date">' + dateText() + ' · today’s level: <b>' + LVN[LV] + '</b></p><p class="dl-streak" data-streak></p>';
    function go() {
      Array.prototype.forEach.call(d.querySelectorAll('[data-daily]'), function (n) { var k = n.getAttribute('data-daily'); ({ number: numberUI, seq: seqUI, odd: oddUI, word: wordUI })[k] && ({ number: numberUI, seq: seqUI, odd: oddUI, word: wordUI })[k](n); });
      status();
    }
    var need = d.querySelector('[data-daily=word]');
    if (need) { fetch(need.getAttribute('data-words')).then(function (r) { return r.text(); }).then(function (t) { WORDS = t.split(/\s+/).filter(Boolean); go(); }).catch(function () { need.innerHTML = '<p>The word list did not load. Please reload the page.</p>'; go(); }); } else go();
  }
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', init); else init();
})(this);
