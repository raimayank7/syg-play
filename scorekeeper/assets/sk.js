/* Scorekeeper: round-by-round sheet (data-sheet="high|low,limit,mode"), darts counter (data-darts), ten-pin bowling scorer (data-bowl).
   Pure functions are exported for node tests. Everything stays in the browser. */
(function () {
  'use strict';
  // ----- ten-pin bowling: rolls is an array of pins knocked down per roll. Returns {frames:[{rolls,score|null}], total}
  function bowl(rolls) {
    var frames = [], i = 0, run = 0, f;
    for (f = 0; f < 10; f++) {
      if (i >= rolls.length) { frames.push({ r: [], s: null }); continue; }
      var a = rolls[i], b = rolls[i + 1], c = rolls[i + 2], fr;
      if (f < 9) {
        if (a === 10) { fr = { r: [a], s: (b !== undefined && c !== undefined) ? 10 + b + c : null }; i += 1; }
        else if (b === undefined) { fr = { r: [a], s: null }; i += 1; }
        else if (a + b === 10) { fr = { r: [a, b], s: c !== undefined ? 10 + c : null }; i += 2; }
        else { fr = { r: [a, b], s: a + b }; i += 2; }
      } else {
        var rr = rolls.slice(i, i + 3), need = (a === 10 || (b !== undefined && a + b === 10)) ? 3 : 2;
        fr = { r: rr, s: rr.length >= need ? rr.reduce(function (x, y) { return x + y; }, 0) : null };
        i += rr.length;
      }
      frames.push(fr);
    }
    run = 0; frames.forEach(function (x) { if (x.s !== null && run !== null) { run += x.s; x.t = run; } else { run = null; x.t = null; } });
    return { frames: frames, total: frames.reduce(function (t, x) { return x.s === null ? t : t + x.s; }, 0) };
  }
  // pins still standing for next roll, and whether the game is over
  function bowlNext(rolls) {
    var i = 0, f;
    for (f = 0; f < 9; f++) {
      if (i >= rolls.length) return { max: 10, over: false };
      if (rolls[i] === 10) { i++; continue; }
      if (i + 1 >= rolls.length) return { max: 10 - rolls[i], over: false };
      i += 2;
    }
    var t = rolls.slice(i);
    if (t.length === 0) return { max: 10, over: false };
    if (t.length === 1) return { max: t[0] === 10 ? 10 : 10 - t[0], over: false };
    if (t.length === 2) { if (t[0] === 10) return { max: t[1] === 10 ? 10 : 10 - t[1], over: false }; if (t[0] + t[1] === 10) return { max: 10, over: false }; return { max: 0, over: true }; }
    return { max: 0, over: true };
  }
  // ----- darts checkout: best route of up to 3 darts ending on a double (or bull), fewest darts, highest early darts first
  var DARTS = (function () {
    var all = [], i; for (i = 1; i <= 20; i++) { all.push({ n: 'S' + i, v: i }); all.push({ n: 'D' + i, v: 2 * i, d: 1 }); all.push({ n: 'T' + i, v: 3 * i }); }
    all.push({ n: '25', v: 25 }); all.push({ n: 'Bull', v: 50, d: 1 });
    return all.sort(function (a, b) { return b.v - a.v; });
  })();
  function checkout(n) {
    var best = null, a, b, c, rest;
    if (n < 2 || n > 170) return null;
    DARTS.forEach(function (x) { if (x.d && x.v === n) { var r = [x.n]; if (!best || r.length < best.length) best = r; } });
    if (best) return best;
    for (a = 0; a < DARTS.length; a++) { rest = n - DARTS[a].v; if (rest < 2) continue; for (b = 0; b < DARTS.length; b++) if (DARTS[b].d && DARTS[b].v === rest) return [DARTS[a].n, DARTS[b].n]; }
    for (a = 0; a < DARTS.length; a++) for (b = 0; b < DARTS.length; b++) { rest = n - DARTS[a].v - DARTS[b].v; if (rest < 2) continue; for (c = 0; c < DARTS.length; c++) if (DARTS[c].d && DARTS[c].v === rest) return [DARTS[a].n, DARTS[b].n, DARTS[c].n]; }
    return null;
  }
  var API = { bowl: bowl, bowlNext: bowlNext, checkout: checkout };
  if (typeof module !== 'undefined' && module.exports) { module.exports = API; return; }
  window.SK = API;
  function $(r, s) { return r.querySelector(s); }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function load(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v || d; } catch (e) { return d; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }

  function sheet(root) {
    var cfg = root.getAttribute('data-sheet').split(','), dir = cfg[0], limit = +cfg[1] || 0, out = cfg[2] === 'out', key = 'sk-sheet-' + (root.getAttribute('data-key') || 'x');
    var S = load(key, { names: ['Player 1', 'Player 2', 'Player 3'], rounds: [] });
    root.innerHTML = '<div class="sk-top"><button class="btn ghost" id="sa">Add player</button><button class="btn ghost" id="sr">Remove last player</button><button class="btn ghost" id="sn">New game</button><button class="btn" id="sp">Print sheet</button></div><div class="sk-wrap"><table class="sk-t" id="st"></table></div><p class="sk-n" id="sm" aria-live="polite"></p>';
    function tot(i) { return S.rounds.reduce(function (t, r) { return t + (+r[i] || 0); }, 0); }
    function draw() {
      var n = S.names.length, h = '<tr><th>Round</th>' + S.names.map(function (x, i) { return '<th><input class="sk-nm" data-i="' + i + '" value="' + esc(x) + '" aria-label="Player ' + (i + 1) + ' name"></th>'; }).join('') + '</tr>';
      S.rounds.forEach(function (r, ri) { h += '<tr><td>' + (ri + 1) + '</td>' + S.names.map(function (x, i) { return '<td><input class="sk-sc" type="number" inputmode="numeric" data-r="' + ri + '" data-i="' + i + '" value="' + (r[i] === undefined ? '' : r[i]) + '" aria-label="Round ' + (ri + 1) + ' ' + esc(x) + '"></td>'; }).join('') + '</tr>'; });
      h += '<tr class="sk-tot"><th>Total</th>' + S.names.map(function (x, i) { var t = tot(i); return '<th class="' + (out && limit && t > limit ? 'sk-out' : '') + '">' + t + (out && limit && t > limit ? ' (out)' : '') + '</th>'; }).join('') + '</tr>';
      h += '<tr><td><button class="btn" id="srd">Add round</button></td>' + S.names.map(function () { return '<td></td>'; }).join('') + '</tr>';
      $(root, '#st').innerHTML = h;
      var totals = S.names.map(function (x, i) { return tot(i); }), msg = '';
      if (S.rounds.length) {
        var alive = out && limit ? totals.map(function (t, i) { return t <= limit ? i : -1; }).filter(function (i) { return i >= 0; }) : S.names.map(function (x, i) { return i; });
        if (alive.length) { var best = alive.reduce(function (b, i) { return (dir === 'low' ? totals[i] < totals[b] : totals[i] > totals[b]) ? i : b; }, alive[0]);
          var tie = alive.filter(function (i) { return totals[i] === totals[best]; });
          msg = (tie.length > 1 ? 'Level at the top: ' + tie.map(function (i) { return S.names[i]; }).join(', ') : 'Leader: ' + S.names[best]) + ' on ' + totals[best] + '.'; }
        if (!out && limit) { var hit = totals.some(function (t) { return t >= limit; }); if (hit) msg += ' A player has reached ' + limit + ': the game is over.'; }
        if (out && limit && alive.length === 1 && n > 1) msg += ' Only one player is left in.';
      }
      $(root, '#sm').textContent = msg;
      save(key, S);
    }
    root.addEventListener('input', function (e) {
      var t = e.target;
      if (t.classList.contains('sk-nm')) { S.names[+t.getAttribute('data-i')] = t.value; save(key, S); }
      else if (t.classList.contains('sk-sc')) { S.rounds[+t.getAttribute('data-r')][+t.getAttribute('data-i')] = t.value === '' ? undefined : +t.value; var keep = document.activeElement; var p = t.getAttribute('data-r') + ',' + t.getAttribute('data-i'); draw(); var q = root.querySelector('[data-r="' + p.split(',')[0] + '"][data-i="' + p.split(',')[1] + '"]'); if (q) { q.focus(); q.setSelectionRange && 0; } }
    });
    root.addEventListener('click', function (e) {
      var id = e.target.id;
      if (id === 'sa' && S.names.length < 8) { S.names.push('Player ' + (S.names.length + 1)); draw(); }
      else if (id === 'sr' && S.names.length > 1) { S.names.pop(); S.rounds.forEach(function (r) { r.length = S.names.length; }); draw(); }
      else if (id === 'sn') { S.rounds = []; draw(); }
      else if (id === 'srd') { S.rounds.push(S.names.map(function () { return undefined; })); draw(); var f = root.querySelector('[data-r="' + (S.rounds.length - 1) + '"][data-i="0"]'); if (f) f.focus(); }
      else if (id === 'sp') window.print();
    });
    draw();
  }

  function darts(root) {
    var start = +root.getAttribute('data-darts') || 501, N = 2, st;
    function fresh() { st = { left: [], names: ['Player 1', 'Player 2'], turn: 0, hist: [] }; for (var i = 0; i < N; i++) st.left.push(start); }
    fresh();
    root.innerHTML = '<div class="sk-top"><label class="tb-ck"><input type="checkbox" id="dd" checked> double to finish</label><button class="btn ghost" id="dn">New game</button><button class="btn ghost" id="du">Undo</button></div><div id="dp" class="sk-dp"></div><div class="sk-top"><label>Score for this visit (3 darts) <input type="number" id="ds" min="0" max="180" inputmode="numeric"></label><button class="btn" id="dg">Enter</button></div><p class="sk-n" id="dm" aria-live="polite"></p>';
    function draw(msg) {
      $(root, '#dp').innerHTML = st.names.map(function (n, i) { var c = st.left[i] <= 170 ? checkout(st.left[i]) : null; return '<div class="sk-pl' + (i === st.turn ? ' on' : '') + '"><input class="sk-nm" data-i="' + i + '" value="' + esc(n) + '" aria-label="Player ' + (i + 1) + ' name"><div class="sk-big">' + st.left[i] + '</div><small>' + (c ? 'Finish: ' + c.join(', ') : '') + '</small></div>'; }).join('');
      $(root, '#dm').textContent = msg || (st.left.indexOf(0) >= 0 ? '' : st.names[st.turn] + ' to throw.');
    }
    root.addEventListener('input', function (e) { if (e.target.classList.contains('sk-nm')) st.names[+e.target.getAttribute('data-i')] = e.target.value; });
    root.addEventListener('click', function (e) {
      var id = e.target.id;
      if (id === 'dn') { fresh(); draw(); }
      else if (id === 'du') { var h = st.hist.pop(); if (h) { st.left[h.i] = h.was; st.turn = h.i; draw(); } }
      else if (id === 'dg') {
        if (st.left.indexOf(0) >= 0) return;
        var v = Math.floor(+$(root, '#ds').value), i = st.turn, de = $(root, '#dd').checked;
        if (isNaN(v) || v < 0 || v > 180) { draw('A visit of three darts scores between 0 and 180.'); return; }
        var was = st.left[i], now = was - v, bust = now < 0 || (de && now === 1);
        st.hist.push({ i: i, was: was });
        if (bust) { draw('Bust: ' + st.names[i] + ' stays on ' + was + '.'); st.turn = (i + 1) % N; return; }
        st.left[i] = now; $(root, '#ds').value = '';
        if (now === 0) { draw(st.names[i] + ' wins the leg!'); return; }
        st.turn = (i + 1) % N; draw();
      }
    });
    draw();
  }

  function bowling(root) {
    var rolls = [];
    function draw() {
      var r = bowl(rolls), nx = bowlNext(rolls), h = '<div class="sk-wrap"><table class="sk-t sk-b"><tr>';
      for (var i = 0; i < 10; i++) h += '<th>' + (i + 1) + '</th>'; h += '</tr><tr>';
      r.frames.forEach(function (f, i) { var s = f.r.map(function (x, k) { var prev = f.r[k - 1]; if (x === 10 && (i === 9 || k === 0)) return 'X'; if (k > 0 && prev !== undefined && prev !== 10 && prev + x === 10) return '/'; return x === 0 ? '-' : x; }).join(' '); h += '<td>' + (s || '&nbsp;') + '</td>'; });
      h += '</tr><tr>'; r.frames.forEach(function (f) { h += '<td><b>' + (f.t === null || f.t === undefined ? '' : f.t) + '</b></td>'; });
      h += '</tr></table></div><div class="sk-top">';
      if (!nx.over) for (var p = 0; p <= nx.max; p++) h += '<button class="btn ghost" data-p="' + p + '">' + p + '</button>';
      h += '<button class="btn" data-p="u">Undo</button><button class="btn" data-p="n">New game</button></div><p class="sk-n" aria-live="polite">' + (nx.over ? 'Game over. Final score: ' + r.total + '.' : 'Score so far: ' + r.total + '. Tap the pins knocked down on the next roll.') + '</p>';
      root.innerHTML = h;
    }
    root.addEventListener('click', function (e) { var p = e.target.getAttribute && e.target.getAttribute('data-p'); if (p === null || p === undefined) return; if (p === 'u') rolls.pop(); else if (p === 'n') rolls = []; else rolls.push(+p); draw(); });
    draw();
  }
  function init() {
    var a = document.querySelectorAll('[data-sheet]'), i;
    for (i = 0; i < a.length; i++) sheet(a[i]);
    a = document.querySelectorAll('[data-darts]'); for (i = 0; i < a.length; i++) darts(a[i]);
    a = document.querySelectorAll('[data-bowl]'); for (i = 0; i < a.length; i++) bowling(a[i]);
  }
  if (document.readyState == 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
