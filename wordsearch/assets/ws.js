/* play.shareyourgroup.com/wordsearch: make and play word searches. Written for this site. Runs in the browser; words you type are not sent anywhere. */
(function (root) {
  'use strict';
  var DIRS = { easy: [[0, 1], [1, 0]], medium: [[0, 1], [1, 0], [1, 1], [-1, 1]], hard: [[0, 1], [1, 0], [1, 1], [-1, 1], [0, -1], [-1, 0], [-1, -1], [1, -1]] };
  function clean(w) { return String(w).toUpperCase().replace(/[^A-Z]/g, ''); }
  function make(words, size, level, rnd) {
    rnd = rnd || Math.random;
    var list = words.map(clean).filter(function (w, i, a) { return w.length >= 3 && w.length <= size && a.indexOf(w) === i; });
    list.sort(function (a, b) { return b.length - a.length; });
    var dirs = DIRS[level] || DIRS.medium;
    for (var attempt = 0; attempt < 60; attempt++) {
      var g = [], r, c, placed = [], ok = true, i;
      for (r = 0; r < size; r++) { g.push([]); for (c = 0; c < size; c++) g[r].push(''); }
      for (i = 0; i < list.length && ok; i++) {
        var w = list[i], done = false;
        for (var t = 0; t < 400 && !done; t++) {
          var d = dirs[Math.floor(rnd() * dirs.length)], sr = Math.floor(rnd() * size), sc = Math.floor(rnd() * size), er = sr + d[0] * (w.length - 1), ec = sc + d[1] * (w.length - 1);
          if (er < 0 || er >= size || ec < 0 || ec >= size) continue;
          var fit = true, k;
          for (k = 0; k < w.length; k++) { var cell = g[sr + d[0] * k][sc + d[1] * k]; if (cell && cell !== w[k]) { fit = false; break; } }
          if (!fit) continue;
          for (k = 0; k < w.length; k++) g[sr + d[0] * k][sc + d[1] * k] = w[k];
          placed.push({ w: w, r: sr, c: sc, dr: d[0], dc: d[1] }); done = true;
        }
        if (!done) ok = false;
      }
      if (!ok) continue;
      var A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      for (r = 0; r < size; r++) for (c = 0; c < size; c++) if (!g[r][c]) g[r][c] = A.charAt(Math.floor(rnd() * 26));
      return { grid: g, placed: placed, size: size, skipped: words.length - list.length };
    }
    return null;
  }
  function check(p) { /* every placed word really reads out in the grid */
    for (var i = 0; i < p.placed.length; i++) {
      var q = p.placed[i], s = '';
      for (var k = 0; k < q.w.length; k++) s += p.grid[q.r + q.dr * k][q.c + q.dc * k];
      if (s !== q.w) return false;
    }
    return true;
  }
  var API = { make: make, check: check, clean: clean };
  if (typeof module !== 'undefined' && module.exports) { module.exports = API; return; }

  /* ---- the page ---- */
  var d = document;
  function el(tag, cls, html) { var e = d.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }
  function Game(box, words, opts) {
    opts = opts || {};
    var size = opts.size || 12, level = opts.level || 'medium', puzzle = null, found = {}, start = null, clues = opts.clues || {};
    function build() {
      puzzle = make(words, size, level);
      found = {};
      if (!puzzle) { box.querySelector('.ws-msg').textContent = 'Sorry, these words would not fit. Try a bigger grid or fewer words.'; return; }
      box.querySelector('.ws-msg').textContent = puzzle.skipped ? puzzle.skipped + ' word(s) left out (too short, too long for the grid, or repeated).' : '';
      draw();
    }
    function clueOn() { var c = box.querySelector('[data-clue]'); return c ? c.checked : !!opts.clueMode; }
    function cellAt(e) { var t = d.elementFromPoint(e.clientX, e.clientY); return t && t.getAttribute && t.getAttribute('data-r') != null ? t : null; }
    function draw() {
      var h = '<h2 class="ws-ptitle">' + esc((d.querySelector('h1') || {}).textContent || 'Word search') + '</h2><div class="ws-grid" style="grid-template-columns:repeat(' + size + ',1fr)" role="grid" aria-label="Word search grid">', r, c;
      for (r = 0; r < size; r++) for (c = 0; c < size; c++) h += '<span class="ws-c" data-r="' + r + '" data-c="' + c + '">' + puzzle.grid[r][c] + '</span>';
      h += '</div><ul class="ws-words">';
      puzzle.placed.slice().sort(function (a, b) { return a.w < b.w ? -1 : 1; }).forEach(function (p) { var co = clueOn() && clues[p.w]; h += '<li data-w="' + p.w + '"' + (found[p.w] ? ' class="ok"' : '') + '>' + (co && !found[p.w] ? esc(clues[p.w]) + ' <small>(' + p.w.length + ' letters)</small>' : p.w) + '</li>'; });
      h += '</ul>';
      box.querySelector('.ws-play').innerHTML = h;
      var total = puzzle.placed.length, n = Object.keys(found).length;
      box.querySelector('.ws-count').textContent = n + ' of ' + total + ' found' + (n === total ? '. Well done!' : '.');
      mark();
    }
    function mark() {
      var cells = box.querySelectorAll('.ws-c'), i;
      for (i = 0; i < cells.length; i++) cells[i].classList.remove('f');
      Object.keys(found).forEach(function (w) { cellsOf(found[w]).forEach(function (rc) { cells[rc[0] * size + rc[1]].classList.add('f'); }); });
    }
    function cellsOf(p) { var o = []; for (var k = 0; k < p.w.length; k++) o.push([p.r + p.dr * k, p.c + p.dc * k]); return o; }
    function line(a, b) { /* cells from a to b if straight, else null */
      var dr = b[0] - a[0], dc = b[1] - a[1], n = Math.max(Math.abs(dr), Math.abs(dc));
      if (!(dr === 0 || dc === 0 || Math.abs(dr) === Math.abs(dc))) return null;
      var sr = dr === 0 ? 0 : dr / Math.abs(dr), sc = dc === 0 ? 0 : dc / Math.abs(dc), o = [];
      for (var k = 0; k <= n; k++) o.push([a[0] + sr * k, a[1] + sc * k]);
      return o;
    }
    function sel(a, b, finish) {
      var cells = box.querySelectorAll('.ws-c'), i;
      for (i = 0; i < cells.length; i++) cells[i].classList.remove('s');
      var ln = line(a, b); if (!ln) return;
      ln.forEach(function (rc) { cells[rc[0] * size + rc[1]].classList.add('s'); });
      if (!finish) return;
      var s = ln.map(function (rc) { return puzzle.grid[rc[0]][rc[1]]; }).join(''), rs = s.split('').reverse().join('');
      puzzle.placed.forEach(function (p) {
        if (!found[p.w] && (p.w === s || p.w === rs)) { found[p.w] = p; draw(); }
      });
      for (i = 0; i < cells.length; i++) cells[i].classList.remove('s');
    }
    box.addEventListener('pointerdown', function (e) {
      var t = e.target.closest ? e.target.closest('.ws-c') : null; if (!t || !puzzle) return;
      start = [+t.getAttribute('data-r'), +t.getAttribute('data-c')]; e.preventDefault(); sel(start, start, false);
      try { box.setPointerCapture(e.pointerId); } catch (x) { }
    });
    box.addEventListener('pointermove', function (e) { if (!start) return; var t = cellAt(e); if (t) sel(start, [+t.getAttribute('data-r'), +t.getAttribute('data-c')], false); });
    box.addEventListener('pointerup', function (e) { if (!start) return; var t = cellAt(e); if (t) sel(start, [+t.getAttribute('data-r'), +t.getAttribute('data-c')], true); start = null; });
    box.addEventListener('pointercancel', function () { start = null; });
    box.querySelector('[data-new]').addEventListener('click', build);
    box.querySelector('[data-reveal]').addEventListener('click', function () { puzzle.placed.forEach(function (p) { found[p.w] = p; }); draw(); });
    box.querySelector('[data-print]').addEventListener('click', function () { window.print(); });
    var ck = box.querySelector('[data-clue]'); if (ck) ck.addEventListener('change', function () { if (puzzle) draw(); });
    var sz = box.querySelector('[data-size]'), lv = box.querySelector('[data-level]');
    if (sz) sz.addEventListener('change', function () { size = +sz.value; build(); });
    if (lv) lv.addEventListener('change', function () { level = lv.value; build(); });
    build();
    return { rebuild: function (w, s, l) { words = w; if (s) size = s; if (l) level = l; build(); } };
  }
  function shell(opts) {
    return '<div class="finder ws-bar"><div class="fields">' +
      (opts.size ? '<div><label for="wsz">Grid size</label><select id="wsz" data-size><option value="10">10 by 10</option><option value="12" selected>12 by 12</option><option value="15">15 by 15</option></select></div>' : '') +
      '<div><label for="wlv">Level</label><select id="wlv" data-level><option value="easy">Easy: across and down</option><option value="medium" selected>Medium: also diagonal</option><option value="hard">Hard: also backwards</option></select></div></div>' +
      (opts.clues ? '<p><label class="tb-ck"><input type="checkbox" data-clue> Clue mode: show a clue in place of each word (harder)</label></p>' : '') +
      '<p><button class="btn" type="button" data-new>New puzzle</button> <button class="btn ghost" type="button" data-reveal>Show answers</button> <button class="btn ghost" type="button" data-print>Print</button></p><p class="hint ws-count" aria-live="polite"></p><p class="cc-bad ws-msg"></p></div><div class="ws-play"></div>';
  }
  function init() {
    var t = d.querySelector('[data-ws=theme]');
    if (t) {
      var words = [], clues = {};
      try { var j = JSON.parse(t.getAttribute('data-words')); j.forEach(function (x) { words.push(x[0]); clues[clean(x[0])] = x[1]; }); } catch (e) { }
      t.innerHTML = shell({ size: true, clues: true });
      Game(t, words, { size: 12, level: 'medium', clues: clues, clueMode: t.hasAttribute('data-clues') });
    }
    var m = d.querySelector('[data-ws=maker]');
    if (m) {
      m.innerHTML = '<div class="finder"><label for="mw">Your words, one on each line (3 to 15 letters, at least 4 words)</label><textarea id="mw" rows="8" style="width:100%;font:inherit;padding:10px;border-radius:10px;border:1px solid var(--field-line);background:var(--field);color:var(--ink)" placeholder="mango&#10;banana&#10;papaya"></textarea><p><button class="btn" type="button" id="mgo">Make my word search</button></p><p class="hint">Only the letters A to Z are used, so spaces and accents are dropped: &quot;ice cream&quot; becomes ICECREAM.</p></div><div id="mbox"></div>';
      var mb = m.querySelector('#mbox'), game = null;
      m.querySelector('#mgo').addEventListener('click', function () {
        var w = m.querySelector('#mw').value.split('\n').map(function (x) { return x.trim(); }).filter(Boolean);
        if (w.filter(function (x) { return clean(x).length >= 3; }).length < 4) { mb.innerHTML = '<p class="cc-bad">Please type at least four words of three letters or more.</p>'; return; }
        var longest = Math.max.apply(null, w.map(function (x) { return clean(x).length; })), size = longest > 12 ? 15 : (w.length > 14 ? 15 : 12);
        mb.innerHTML = shell({ size: true });
        mb.querySelector('[data-size]').value = String(size);
        game = Game(mb, w, { size: size, level: 'medium' });
      });
    }
  }
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', init); else init();
})(this);
