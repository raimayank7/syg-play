/* Nonogram (picture logic) game and generator. Puzzles are accepted only when line logic alone solves them, so no guessing is needed.
   data-nono="random:W:H:SEED" or data-nono="pic:ROWS" (rows as strings of # and ., joined by '|'); data-daily marks the daily puzzle. */
(function () {
  'use strict';
  function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function clueOf(line) { var c = [], n = 0; line.forEach(function (v) { if (v) n++; else if (n) { c.push(n); n = 0; } }); if (n) c.push(n); return c.length ? c : [0]; }
  function clues(g) {
    var h = g.length, w = g[0].length, rows = g.map(clueOf), cols = [], x, y;
    for (x = 0; x < w; x++) { var col = []; for (y = 0; y < h; y++) col.push(g[y][x]); cols.push(clueOf(col)); }
    return { rows: rows, cols: cols };
  }
  // line solver: line has -1 unknown, 0 empty, 1 filled. Returns new line or null (contradiction)
  function lineFix(clue, line) {
    var n = line.length, blocks = clue[0] === 0 ? [] : clue, i, found = false, canF = [], canE = [], cur = [];
    for (i = 0; i < n; i++) { canF.push(false); canE.push(false); cur.push(0); }
    var suffix = [], total = 0; for (i = blocks.length - 1; i >= 0; i--) { total += blocks[i] + (i < blocks.length - 1 ? 1 : 0); suffix[i] = total; }
    function rec(b, pos) {
      var i, j;
      if (b === blocks.length) {
        for (i = pos; i < n; i++) if (line[i] === 1) return;
        found = true;
        for (i = 0; i < n; i++) { if (i < pos && cur[i]) canF[i] = true; else canE[i] = true; }
        return;
      }
      var len = blocks[b], last = n - suffix[b];
      for (var s = pos; s <= last; s++) {
        if (s > pos && line[s - 1] === 1) break; // a filled cell would be left behind the block
        var ok = true;
        for (j = s; j < s + len; j++) if (line[j] === 0) { ok = false; break; }
        if (!ok) continue;
        if (s + len < n && line[s + len] === 1) continue;
        for (j = pos; j < s; j++) cur[j] = 0;
        for (j = s; j < s + len; j++) cur[j] = 1;
        if (s + len < n) cur[s + len] = 0;
        rec(b + 1, Math.min(n, s + len + 1));
      }
    }
    rec(0, 0);
    if (!found) return null;
    return line.map(function (v, i) { return canF[i] && !canE[i] ? 1 : (!canF[i] && canE[i] ? 0 : v); });
  }
  // solve by repeated line passes; returns {grid, solved, passes} (grid cells -1 if undecided) or null when contradictory
  function solve(rows, cols, record) {
    var h = rows.length, w = cols.length, g = [], y, x, passes = 0, changed = true;
    for (y = 0; y < h; y++) g.push(new Array(w).fill(-1));
    while (changed) {
      changed = false; passes++;
      for (y = 0; y < h; y++) { var r = lineFix(rows[y], g[y]); if (!r) return null; for (x = 0; x < w; x++) if (r[x] !== g[y][x]) { g[y][x] = r[x]; changed = true; } }
      for (x = 0; x < w; x++) { var col = g.map(function (rw) { return rw[x]; }), c = lineFix(cols[x], col); if (!c) return null; for (y = 0; y < h; y++) if (c[y] !== g[y][x]) { g[y][x] = c[y]; changed = true; } }
      if (record && changed) record.push(g.map(function (r) { return r.slice(); }));
    }
    var solved = g.every(function (rw) { return rw.every(function (v) { return v !== -1; }); });
    return { grid: g, solved: solved, passes: passes - 1 };
  }
  function generate(w, h, seed, density) {
    var rnd = mulberry(seed), tries = 0;
    while (tries < 4000) {
      tries++;
      var g = [], y, x;
      for (y = 0; y < h; y++) { var row = []; for (x = 0; x < w; x++) row.push(rnd() < (density || 0.55) ? 1 : 0); g.push(row); }
      var c = clues(g);
      // reject lines that are completely empty or full (dull clues)
      var s = solve(c.rows, c.cols);
      if (s && s.solved) return { grid: g, rows: c.rows, cols: c.cols, passes: s.passes, tries: tries };
    }
    return null;
  }
  function fromPic(str) { return str.split('|').map(function (r) { return r.split('').map(function (ch) { return ch === '#' ? 1 : 0; }); }); }
  var API = { clueOf: clueOf, clues: clues, lineFix: lineFix, solve: solve, generate: generate, fromPic: fromPic };
  if (typeof module !== 'undefined' && module.exports) { module.exports = API; return; }
  window.NG = API;

  function init() {
    var els = document.querySelectorAll('[data-nono]'), e;
    for (e = 0; e < els.length; e++) (function (root) {
      var spec = root.getAttribute('data-nono').split(':'), P;
      if (spec[0] === 'random') { var sd = spec[3] === 'today' ? (function () { var d = new Date(); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); })() : spec[3] === 'free' ? (parseInt((location.hash || '').slice(1), 10) || Math.floor(Math.random() * 1e6) + 1) : +spec[3]; P = generate(+spec[1], +spec[2], sd); P && (P.seed = sd); } else { var g = fromPic(spec[1]), c = clues(g); P = { grid: g, rows: c.rows, cols: c.cols }; }
      if (!P) { root.textContent = 'Could not make a puzzle. Please reload.'; return; }
      var h = P.grid.length, w = P.grid[0].length, st = [], mode = 'fill', key = 'ng-' + root.getAttribute('data-nono') + (P.seed || ''), y, x;
      for (y = 0; y < h; y++) st.push(new Array(w).fill(0)); // 0 blank, 1 filled, 2 marked
      try { var sv = JSON.parse(localStorage.getItem(key)); if (sv && sv.length === h) st = sv; } catch (er) { }
      var mc = Math.max.apply(null, P.cols.map(function (c) { return c.length; })), mr = Math.max.apply(null, P.rows.map(function (c) { return c.length; }));
      var html = '<div class="ng-top"><button class="btn" data-m="fill" aria-pressed="true">Fill</button><button class="btn ghost" data-m="mark" aria-pressed="false">Mark empty (X)</button><button class="btn ghost" data-a="check">Check mistakes</button><button class="btn ghost" data-a="reset">Clear</button><button class="btn ghost" data-a="reveal">Show solution</button>' + (spec[0] === 'random' && spec[3] === 'free' ? '<button class="btn" data-a="new">New puzzle</button>' : '') + '</div><div class="ng-wrap"><table class="ng-t" role="grid"><tr><td></td>';
      for (x = 0; x < w; x++) html += '<th class="ng-ch">' + P.cols[x].map(function (v) { return '<span>' + v + '</span>'; }).join('') + '</th>';
      html += '</tr>';
      for (y = 0; y < h; y++) { html += '<tr><th class="ng-rh">' + P.rows[y].join(' ') + '</th>'; for (x = 0; x < w; x++) html += '<td class="ng-c' + ((x + 1) % 5 === 0 && x < w - 1 ? ' r5' : '') + (((y + 1) % 5 === 0 && y < h - 1) ? ' b5' : '') + '" data-x="' + x + '" data-y="' + y + '"></td>'; html += '</tr>'; }
      html += '</table></div><p class="ng-msg" aria-live="polite"></p>';
      root.innerHTML = html;
      var cells = root.querySelectorAll('.ng-c'), msg = root.querySelector('.ng-msg'), bad = [];
      function paint() {
        for (var i = 0; i < cells.length; i++) { var cx = +cells[i].getAttribute('data-x'), cy = +cells[i].getAttribute('data-y'), v = st[cy][cx]; cells[i].className = cells[i].className.replace(/ (on|mk|bad)/g, '') + (v === 1 ? ' on' : v === 2 ? ' mk' : '') + (bad.indexOf(cy * w + cx) >= 0 ? ' bad' : ''); cells[i].textContent = v === 2 ? '×' : ''; }
        try { localStorage.setItem(key, JSON.stringify(st)); } catch (er) { }
        var done = true; for (var yy = 0; yy < h; yy++) for (var xx = 0; xx < w; xx++) if ((st[yy][xx] === 1) !== (P.grid[yy][xx] === 1)) done = false;
        if (done) msg.textContent = 'Solved! Every clue is satisfied.'; else if (msg.textContent === 'Solved! Every clue is satisfied.') msg.textContent = '';
      }
      var paintVal = null, dragging = false;
      function apply(c) {
        var cx = +c.getAttribute('data-x'), cy = +c.getAttribute('data-y'), target = mode === 'fill' ? 1 : 2;
        if (paintVal === null) paintVal = st[cy][cx] === target ? 0 : target;
        if (st[cy][cx] !== paintVal) { st[cy][cx] = paintVal; bad = []; paint(); }
      }
      function cellAt(ev) { var el = document.elementFromPoint(ev.clientX, ev.clientY); return el && el.classList && el.classList.contains('ng-c') && root.contains(el) ? el : null; }
      root.addEventListener('pointerdown', function (ev) { var c = ev.target.classList && ev.target.classList.contains('ng-c') ? ev.target : null; if (!c) return; ev.preventDefault(); dragging = true; paintVal = null; apply(c); });
      root.addEventListener('pointermove', function (ev) { if (!dragging) return; var c = cellAt(ev); if (c) apply(c); });
      window.addEventListener('pointerup', function () { dragging = false; paintVal = null; });
      root.addEventListener('click', function (ev) {
        var m = ev.target.getAttribute && ev.target.getAttribute('data-m'), a = ev.target.getAttribute && ev.target.getAttribute('data-a');
        if (m) { mode = m; root.querySelectorAll('[data-m]').forEach(function (b) { var on = b.getAttribute('data-m') === m; b.className = 'btn' + (on ? '' : ' ghost'); b.setAttribute('aria-pressed', on); }); }
        if (a === 'reset') { st = st.map(function (r) { return r.map(function () { return 0; }); }); bad = []; msg.textContent = ''; paint(); }
        if (a === 'check') { bad = []; for (var yy = 0; yy < h; yy++) for (var xx = 0; xx < w; xx++) if (st[yy][xx] === 1 && !P.grid[yy][xx]) bad.push(yy * w + xx); msg.textContent = bad.length ? bad.length + ' filled square' + (bad.length > 1 ? 's are' : ' is') + ' wrong (shown in red).' : 'No filled square is wrong so far.'; paint(); }
        if (a === 'new') { location.hash = String(Math.floor(Math.random() * 1e6) + 1); location.reload(); }
        if (a === 'reveal') { st = P.grid.map(function (r) { return r.map(function (v) { return v ? 1 : 0; }); }); bad = []; paint(); }
      });
      paint();
    })(els[e]);
  }
  if (document.readyState == 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
