/* Kakuro and Futoshiki: generators with uniqueness checking, and the playing screens.
   data-futo="N:level:seed|free|today"  data-kakuro="R:C:seed|free|today" */
(function () {
  'use strict';
  function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function shuffle(a, rnd) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function bits(m) { var c = 0; while (m) { c += m & 1; m >>= 1; } return c; }

  // ================= Futoshiki
  // N x N, digits 1..N, no repeats in rows or columns; lt = list of [r1,c1,r2,c2] meaning cell1 < cell2; givens: N*N array (0 = empty)
  function fCount(N, givens, lt, limit) {
    var full = (1 << N) - 1, dom = [], i, count = 0, firstSol = null;
    for (i = 0; i < N * N; i++) dom.push(givens[i] ? (1 << (givens[i] - 1)) : full);
    var cons = []; for (i = 0; i < N * N; i++) cons.push([]);
    lt.forEach(function (c) { var a = c[0] * N + c[1], b = c[2] * N + c[3]; cons[a].push([b, 1]); cons[b].push([a, 0]); });
    function propagate(d, queue) {
      while (queue.length) {
        var x = queue.pop(), r = Math.floor(x / N), c = x % N, v = d[x], k;
        if (v === 0) return false;
        if (bits(v) === 1) {
          for (k = 0; k < N; k++) {
            var y = r * N + k, z = k * N + c;
            if (y !== x && (d[y] & v)) { d[y] &= ~v; if (!d[y]) return false; queue.push(y); }
            if (z !== x && (d[z] & v)) { d[z] &= ~v; if (!d[z]) return false; queue.push(z); }
          }
        }
        for (k = 0; k < cons[x].length; k++) {
          var o = cons[x][k][0], less = cons[x][k][1]; // less=1: x < o
          var lo = d[x] & -d[x], hi = 1 << (31 - Math.clz32(d[x])), nd;
          if (less) { nd = d[o] & ~((lo << 1) - 1); } else { nd = d[o] & ((hi) - 1); }
          if (less) { /* o must be greater than min of x */ }
          if (nd !== d[o]) { d[o] = nd; if (!nd) return false; queue.push(o); }
          // x itself bounded by o
          var olo = d[o] & -d[o], ohi = 1 << (31 - Math.clz32(d[o])), nx;
          if (less) nx = d[x] & ((ohi) - 1); else nx = d[x] & ~((olo << 1) - 1);
          if (nx !== d[x]) { d[x] = nx; if (!nx) return false; queue.push(x); }
        }
      }
      return true;
    }
    function rec(d) {
      if (count >= limit) return;
      var best = -1, bc = 99, x;
      for (x = 0; x < N * N; x++) { var b = bits(d[x]); if (b === 0) return; if (b > 1 && b < bc) { bc = b; best = x; } }
      if (best < 0) { count++; if (!firstSol) firstSol = d.map(function (m) { return 32 - Math.clz32(m); }); return; }
      for (var v = 0; v < N; v++) {
        if (!(d[best] & (1 << v))) continue;
        var nd = d.slice(); nd[best] = 1 << v;
        if (propagate(nd, [best])) rec(nd);
        if (count >= limit) return;
      }
    }
    var q = []; for (i = 0; i < N * N; i++) q.push(i);
    var d0 = dom.slice();
    if (!propagate(d0, q)) return { count: 0, sol: null };
    rec(d0);
    return { count: count, sol: firstSol };
  }
  function latin(N, rnd) {
    var g = [], i; for (i = 0; i < N * N; i++) g.push(0);
    function ok(p, v) { var r = Math.floor(p / N), c = p % N, k; for (k = 0; k < N; k++) if (g[r * N + k] === v || g[k * N + c] === v) return false; return true; }
    function rec(p) { if (p === N * N) return true; var vs = shuffle(Array.apply(null, { length: N }).map(function (_, i) { return i + 1; }), rnd); for (var i = 0; i < vs.length; i++) if (ok(p, vs[i])) { g[p] = vs[i]; if (rec(p + 1)) return true; g[p] = 0; } return false; }
    rec(0); return g;
  }
  function futoGenerate(N, level, seed) {
    var rnd = mulberry(seed), sol = latin(N, rnd), lt = [], r, c;
    for (r = 0; r < N; r++) for (c = 0; c < N; c++) {
      if (c + 1 < N) lt.push(sol[r * N + c] < sol[r * N + c + 1] ? [r, c, r, c + 1] : [r, c + 1, r, c]);
      if (r + 1 < N) lt.push(sol[r * N + c] < sol[(r + 1) * N + c] ? [r, c, r + 1, c] : [r + 1, c, r, c]);
    }
    var givens = sol.slice();
    // remove givens first, then inequalities, keeping the solution unique
    var order = shuffle(Array.apply(null, { length: N * N }).map(function (_, i) { return i; }), rnd), i;
    var keepG = level === 'easy' ? Math.round(N * N * 0.25) : level === 'medium' ? Math.round(N * N * 0.1) : 0;
    var kept = 0;
    for (i = 0; i < order.length; i++) {
      var save = givens[order[i]];
      if (kept < keepG) { kept++; continue; }
      givens[order[i]] = 0;
      if (fCount(N, givens, lt, 2).count !== 1) givens[order[i]] = save;
    }
    var lorder = shuffle(lt.map(function (_, i) { return i; }), rnd), alive = lt.map(function () { return true; });
    var minKeep = level === 'easy' ? Math.round(lt.length * 0.55) : level === 'medium' ? Math.round(lt.length * 0.35) : 0, left = lt.length;
    for (i = 0; i < lorder.length && left > minKeep; i++) {
      alive[lorder[i]] = false;
      var test = lt.filter(function (_, k) { return alive[k]; });
      if (fCount(N, givens, test, 2).count !== 1) alive[lorder[i]] = true; else left--;
    }
    lt = lt.filter(function (_, k) { return alive[k]; });
    var chk = fCount(N, givens, lt, 2);
    return { N: N, givens: givens, lt: lt, sol: sol, unique: chk.count === 1 };
  }

  // ================= Kakuro
  // layout: R x C grid, cell = 0 black, 1 white. Runs: horizontal and vertical sequences of >=2 white cells.
  function kRuns(R, C, w) {
    var runs = [], r, c, s;
    for (r = 0; r < R; r++) { c = 0; while (c < C) { if (w[r * C + c]) { s = c; while (c < C && w[r * C + c]) c++; if (c - s >= 2) runs.push({ dir: 'h', r: r, c: s, len: c - s, cells: Array.apply(null, { length: c - s }).map(function (_, i) { return r * C + s + i; }) }); } else c++; } }
    for (c = 0; c < C; c++) { r = 0; while (r < R) { if (w[r * C + c]) { s = r; while (r < R && w[r * C + c]) r++; if (r - s >= 2) runs.push({ dir: 'v', r: s, c: c, len: r - s, cells: Array.apply(null, { length: r - s }).map(function (_, i) { return (s + i) * C + c; }) }); } else r++; } }
    return runs;
  }
  // count solutions (up to limit) given runs with sums and givens
  function kCount(R, C, runs, givens, limit) {
    var cellRuns = {}, cells = [], count = 0, sol = null;
    runs.forEach(function (ru, ri) { ru.cells.forEach(function (x) { (cellRuns[x] = cellRuns[x] || []).push(ri); if (cells.indexOf(x) < 0) cells.push(x); }); });
    var val = {}; cells.forEach(function (x) { val[x] = givens[x] || 0; });
    var used = runs.map(function () { return 0; }), sum = runs.map(function () { return 0; }), filled = runs.map(function () { return 0; });
    var ok = true;
    cells.forEach(function (x) { if (val[x]) cellRuns[x].forEach(function (ri) { if (used[ri] & (1 << val[x])) ok = false; used[ri] |= 1 << val[x]; sum[ri] += val[x]; filled[ri]++; }); });
    if (!ok) return { count: 0 };
    function feasible(ri) { var ru = runs[ri], left = ru.len - filled[ri], rest = ru.sum - sum[ri]; if (left === 0) return rest === 0; if (rest <= 0) return false; var lo = 0, hi = 0, k, c1 = 0, c2 = 0; for (k = 1; k <= 9 && c1 < left; k++) if (!(used[ri] & (1 << k))) { lo += k; c1++; } for (k = 9; k >= 1 && c2 < left; k--) if (!(used[ri] & (1 << k))) { hi += k; c2++; } return c1 === left && rest >= lo && rest <= hi; }
    for (var i0 = 0; i0 < runs.length; i0++) if (!feasible(i0)) return { count: 0 };
    var free = cells.filter(function (x) { return !val[x]; });
    function rec(idx) {
      if (count >= limit) return;
      if (idx === free.length) { count++; if (!sol) sol = Object.assign({}, val); return; }
      // choose the free cell with fewest candidates
      var bi = -1, bc = 99, bl = null, k, j;
      for (j = idx; j < free.length; j++) {
        var x = free[j], cand = [];
        for (k = 1; k <= 9; k++) { var good = true; for (var q = 0; q < cellRuns[x].length; q++) { var ri = cellRuns[x][q]; if (used[ri] & (1 << k)) { good = false; break; } } if (good) cand.push(k); }
        if (cand.length < bc) { bc = cand.length; bi = j; bl = cand; if (bc <= 1) break; }
      }
      if (bc === 0) return;
      var t = free[idx]; free[idx] = free[bi]; free[bi] = t;
      var cx = free[idx];
      for (var m = 0; m < bl.length; m++) {
        var v = bl[m], good2 = true, rs = cellRuns[cx];
        rs.forEach(function (ri) { used[ri] |= 1 << v; sum[ri] += v; filled[ri]++; });
        for (var u = 0; u < rs.length; u++) if (!feasible(rs[u])) { good2 = false; break; }
        if (good2) { val[cx] = v; rec(idx + 1); val[cx] = 0; }
        rs.forEach(function (ri) { used[ri] &= ~(1 << v); sum[ri] -= v; filled[ri]--; });
        if (count >= limit) break;
      }
      t = free[idx]; free[idx] = free[bi]; free[bi] = t;
    }
    rec(0);
    return { count: count, sol: sol };
  }
  function kGenerate(R, C, seed) {
    var rnd = mulberry(seed), tries;
    for (tries = 0; tries < 400; tries++) {
      var w = [], r, c;
      for (r = 0; r < R; r++) for (c = 0; c < C; c++) w.push((r === 0 || c === 0) ? 0 : (rnd() < 0.72 ? 1 : 0));
      // remove isolated white cells (no run in either direction)
      var changed = true;
      while (changed) {
        changed = false; var runs0 = kRuns(R, C, w), inRun = {}; runs0.forEach(function (ru) { ru.cells.forEach(function (x) { inRun[x] = (inRun[x] || 0) + 1; }); });
        for (var x = 0; x < w.length; x++) if (w[x] && inRun[x] !== 2) { /* a white cell must be in a horizontal AND a vertical run */ w[x] = 0; changed = true; }
      }
      var runs = kRuns(R, C, w);
      if (runs.length < 4 || w.reduce(function (a, b) { return a + b; }, 0) < 12) continue;
      // check connectivity of white cells
      var whites = []; for (var i = 0; i < w.length; i++) if (w[i]) whites.push(i);
      var seen = {}, st = [whites[0]]; seen[whites[0]] = 1;
      while (st.length) { var p = st.pop(), pr = Math.floor(p / C), pc = p % C;[[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) { var rr = pr + d[0], cc = pc + d[1]; if (rr >= 0 && cc >= 0 && rr < R && cc < C && w[rr * C + cc] && !seen[rr * C + cc]) { seen[rr * C + cc] = 1; st.push(rr * C + cc); } }); }
      if (Object.keys(seen).length !== whites.length) continue;
      // fill with distinct digits per run by random backtracking
      var val = {}, cellRuns = {}; runs.forEach(function (ru, ri) { ru.cells.forEach(function (x) { (cellRuns[x] = cellRuns[x] || []).push(ri); }); });
      var usedSet = runs.map(function () { return {}; });
      function fill(k) { if (k === whites.length) return true; var x = whites[k], vs = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], rnd); for (var a = 0; a < 9; a++) { var v = vs[a], good = true; for (var q = 0; q < cellRuns[x].length; q++) if (usedSet[cellRuns[x][q]][v]) { good = false; break; } if (!good) continue; cellRuns[x].forEach(function (ri) { usedSet[ri][v] = 1; }); val[x] = v; if (fill(k + 1)) return true; delete val[x]; cellRuns[x].forEach(function (ri) { delete usedSet[ri][v]; }); } return false; }
      if (!fill(0)) continue;
      runs.forEach(function (ru) { ru.sum = ru.cells.reduce(function (s, x) { return s + val[x]; }, 0); });
      var givens = {}, chk = kCount(R, C, runs, givens, 2), guard = 0;
      // add starter digits until the solution is unique
      var order = shuffle(whites, rnd);
      while (chk.count !== 1 && guard < order.length) { givens[order[guard]] = val[order[guard]]; guard++; chk = kCount(R, C, runs, givens, 2); }
      if (chk.count !== 1) continue;
      if (guard > Math.max(3, Math.round(whites.length * 0.25))) continue; // too many starter digits: try another layout
      // trim starter digits that are not needed
      Object.keys(givens).forEach(function (k) { var sv = givens[k]; delete givens[k]; if (kCount(R, C, runs, givens, 2).count !== 1) givens[k] = sv; });
      return { R: R, C: C, white: w, runs: runs, givens: givens, sol: val, starters: Object.keys(givens).length, tries: tries + 1 };
    }
    return null;
  }

  var API = { fCount: fCount, futoGenerate: futoGenerate, kRuns: kRuns, kCount: kCount, kGenerate: kGenerate, mulberry: mulberry };
  if (typeof module !== 'undefined' && module.exports) { module.exports = API; return; }
  window.KK = API;
  function seedOf(mode) {
    if (mode === 'today') { var d = new Date(); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); }
    if (mode === 'free') return parseInt((location.hash || '').slice(1), 10) || Math.floor(Math.random() * 1e6) + 1;
    return +mode;
  }
  function futoUI(root) {
    var spec = root.getAttribute('data-futo').split(':'), N = +spec[0], level = spec[1], seed = seedOf(spec[2]);
    var P = futoGenerate(N, level, seed), st = P.givens.slice(), sel = -1, key = 'kk-futo-' + root.getAttribute('data-futo') + seed;
    try { var sv = JSON.parse(localStorage.getItem(key)); if (sv && sv.length === N * N) st = sv.map(function (v, i) { return P.givens[i] || v; }); } catch (e) { }
    var lt = {}; P.lt.forEach(function (c) { var a = c[0] * N + c[1], b = c[2] * N + c[3]; lt[a + '>' + b] = 1; });
    var html = '<div class="kk-wrap"><div class="kk-fg" style="grid-template-columns:repeat(' + (2 * N - 1) + ',auto)" id="fg">';
    for (var r = 0; r < 2 * N - 1; r++) for (var c = 0; c < 2 * N - 1; c++) {
      if (r % 2 === 0 && c % 2 === 0) html += '<button class="kk-c" data-i="' + ((r / 2) * N + c / 2) + '" aria-label="Row ' + (r / 2 + 1) + ' column ' + (c / 2 + 1) + '"></button>';
      else if (r % 2 === 0) { var a = (r / 2) * N + (c - 1) / 2, b = a + 1; html += '<span class="kk-s">' + (lt[a + '>' + b] ? '&lt;' : lt[b + '>' + a] ? '&gt;' : '') + '</span>'; }
      else if (c % 2 === 0) { var a2 = ((r - 1) / 2) * N + c / 2, b2 = a2 + N; html += '<span class="kk-s">' + (lt[a2 + '>' + b2] ? '&#8963;' : lt[b2 + '>' + a2] ? '&#8964;' : '') + '</span>'; }
      else html += '<span></span>';
    }
    html += '</div></div><div class="kk-pad" id="fp">';
    for (var d = 1; d <= N; d++) html += '<button class="btn ghost" data-d="' + d + '">' + d + '</button>';
    html += '<button class="btn ghost" data-d="0">Clear</button></div><div class="kk-top"><button class="btn" data-a="check">Check</button><button class="btn ghost" data-a="reset">Start again</button><button class="btn ghost" data-a="show">Show solution</button>' + (spec[2] === 'free' ? '<button class="btn" data-a="new">New puzzle</button>' : '') + '</div><p class="kk-msg" aria-live="polite" id="fm">Put 1 to ' + N + ' in every row and column once. A sign between two squares points at the smaller number: the left square is smaller when you see &lt;, and the upper square is smaller when you see an arrow pointing up.</p>';
    root.innerHTML = html;
    var cells = root.querySelectorAll('.kk-c'), msg = root.querySelector('#fm');
    function paint() {
      cells.forEach(function (b, i) {
        b.textContent = st[i] || ''; b.className = 'kk-c' + (P.givens[i] ? ' g' : '') + (i === sel ? ' sel' : '');
        var r = Math.floor(i / N), c = i % N, bad = false;
        if (st[i]) for (var k = 0; k < N; k++) { if (k !== c && st[r * N + k] === st[i]) bad = true; if (k !== r && st[k * N + c] === st[i]) bad = true; }
        P.lt.forEach(function (q) { var a = st[q[0] * N + q[1]], b2 = st[q[2] * N + q[3]]; if (a && b2 && a >= b2 && (q[0] * N + q[1] === i || q[2] * N + q[3] === i)) bad = true; });
        if (bad) b.className += ' bad';
      });
      try { localStorage.setItem(key, JSON.stringify(st)); } catch (e) { }
      if (st.every(function (v, i) { return v === P.sol[i]; })) msg.textContent = 'Solved! Every row, column and sign is right.';
    }
    function put(d) { if (sel < 0 || P.givens[sel]) return; st[sel] = d; paint(); }
    root.addEventListener('click', function (e) {
      var t = e.target; var i = t.getAttribute && t.getAttribute('data-i'), d = t.getAttribute && t.getAttribute('data-d'), a = t.getAttribute && t.getAttribute('data-a');
      if (i !== null && i !== undefined) { sel = +i; paint(); }
      if (d !== null && d !== undefined) put(+d);
      if (a === 'reset') { st = P.givens.slice(); msg.textContent = ''; paint(); }
      if (a === 'show') { st = P.sol.slice(); paint(); }
      if (a === 'check') { var wrong = 0, empty = 0; st.forEach(function (v, i) { if (!v) empty++; else if (v !== P.sol[i]) wrong++; }); msg.textContent = wrong ? wrong + ' cell' + (wrong > 1 ? 's are' : ' is') + ' wrong (marked in red where they clash).' : empty ? 'So far so good: no wrong digit. ' + empty + ' cell' + (empty > 1 ? 's' : '') + ' still empty.' : 'Solved!'; }
      if (a === 'new') { location.hash = String(Math.floor(Math.random() * 1e6) + 1); location.reload(); }
    });
    document.addEventListener('keydown', function (e) {
      if (/^[0-9]$/.test(e.key) && +e.key <= N) put(+e.key); else if (e.key === 'Backspace' || e.key === 'Delete') put(0);
      else if (sel >= 0) { var m = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -N, ArrowDown: N }[e.key]; if (m) { var n2 = sel + m; if (n2 >= 0 && n2 < N * N && !((e.key === 'ArrowLeft' && sel % N === 0) || (e.key === 'ArrowRight' && sel % N === N - 1))) { sel = n2; paint(); e.preventDefault(); } } }
    });
    paint();
  }
  function kakuroUI(root) {
    var spec = root.getAttribute('data-kakuro').split(':'), R = +spec[0], C = +spec[1], seed = seedOf(spec[2]);
    var P = kGenerate(R, C, seed);
    if (!P) { root.textContent = 'Could not make a puzzle. Please reload.'; return; }
    var key = 'kk-kak-' + root.getAttribute('data-kakuro') + seed, st = {}, sel = -1;
    Object.keys(P.givens).forEach(function (k) { st[k] = P.givens[k]; });
    try { var sv = JSON.parse(localStorage.getItem(key)); if (sv) Object.keys(sv).forEach(function (k) { if (!P.givens[k]) st[k] = sv[k]; }); } catch (e) { }
    var across = {}, down = {};
    P.runs.forEach(function (ru) { if (ru.dir === 'h') across[ru.r * C + ru.c - 1] = ru; else down[(ru.r - 1) * C + ru.c] = ru; });
    var html = '<div class="kk-wrap"><div class="kk-kg" style="grid-template-columns:repeat(' + C + ',auto)">';
    for (var i = 0; i < R * C; i++) {
      if (P.white[i]) html += '<button class="kk-c" data-i="' + i + '" aria-label="Row ' + (Math.floor(i / C) + 1) + ' column ' + (i % C + 1) + '"></button>';
      else html += '<span class="kk-b">' + (across[i] || down[i] ? '<i class="kk-d">' + (down[i] ? '<b class="dn">' + down[i].sum + '</b>' : '') + (across[i] ? '<b class="ac">' + across[i].sum + '</b>' : '') + '</i>' : '') + '</span>';
    }
    html += '</div></div><div class="kk-pad">';
    for (var d = 1; d <= 9; d++) html += '<button class="btn ghost" data-d="' + d + '">' + d + '</button>';
    html += '<button class="btn ghost" data-d="0">Clear</button></div><div class="kk-top"><button class="btn" data-a="check">Check</button><button class="btn ghost" data-a="reset">Start again</button><button class="btn ghost" data-a="show">Show solution</button>' + (spec[2] === 'free' ? '<button class="btn" data-a="new">New puzzle</button>' : '') + '</div><p class="kk-msg" aria-live="polite" id="km">Fill every white square with a digit from 1 to 9. The number at the top right of a dark square is the total of the squares to its right; the number at the bottom left is the total of the squares below it. A digit may not repeat within a total.</p>';
    root.innerHTML = html;
    var cells = root.querySelectorAll('.kk-c'), msg = root.querySelector('#km');
    function badSet() {
      var bad = {};
      P.runs.forEach(function (ru) { var seen = {}, sum = 0, n = 0; ru.cells.forEach(function (x) { var v = st[x]; if (v) { if (seen[v]) { bad[x] = 1; bad[seen[v]] = 1; } else seen[v] = x; sum += v; n++; } }); if ((n === ru.len && sum !== ru.sum) || sum > ru.sum) ru.cells.forEach(function (x) { bad[x] = 1; }); });
      return bad;
    }
    function paint() {
      var bad = badSet(), done = true;
      cells.forEach(function (b) { var i = +b.getAttribute('data-i'); b.textContent = st[i] || ''; b.className = 'kk-c' + (P.givens[i] ? ' g' : '') + (i === sel ? ' sel' : '') + (bad[i] ? ' bad' : ''); if (!st[i]) done = false; });
      try { localStorage.setItem(key, JSON.stringify(st)); } catch (e) { }
      if (done && !Object.keys(bad).length) msg.textContent = 'Solved! Every total is right and no digit repeats.';
    }
    function put(d) { if (sel < 0 || P.givens[sel]) return; if (d) st[sel] = d; else delete st[sel]; paint(); }
    root.addEventListener('click', function (e) {
      var t = e.target; var i = t.getAttribute && t.getAttribute('data-i'), d = t.getAttribute && t.getAttribute('data-d'), a = t.getAttribute && t.getAttribute('data-a');
      if (i !== null && i !== undefined) { sel = +i; paint(); }
      if (d !== null && d !== undefined) put(+d);
      if (a === 'reset') { st = {}; Object.keys(P.givens).forEach(function (k) { st[k] = P.givens[k]; }); msg.textContent = ''; paint(); }
      if (a === 'show') { st = Object.assign({}, P.sol); paint(); }
      if (a === 'check') { var wrong = 0, empty = 0; Object.keys(P.sol).forEach(function (k) { if (!st[k]) empty++; else if (st[k] !== P.sol[k]) wrong++; }); msg.textContent = wrong ? wrong + ' digit' + (wrong > 1 ? 's do' : ' does') + ' not match the solution.' : empty ? 'No wrong digit so far. ' + empty + ' square' + (empty > 1 ? 's' : '') + ' still empty.' : 'Solved!'; }
      if (a === 'new') { location.hash = String(Math.floor(Math.random() * 1e6) + 1); location.reload(); }
    });
    document.addEventListener('keydown', function (e) { if (/^[1-9]$/.test(e.key)) put(+e.key); else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') put(0); });
    paint();
  }
  function init() {
    var a = document.querySelectorAll('[data-futo]'), i; for (i = 0; i < a.length; i++) futoUI(a[i]);
    a = document.querySelectorAll('[data-kakuro]'); for (i = 0; i < a.length; i++) kakuroUI(a[i]);
  }
  if (document.readyState == 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
