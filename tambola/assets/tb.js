/* play.shareyourgroup.com/tambola: ticket strips, number caller, bingo cards. Written for this site. Runs in the browser; nothing is sent anywhere. */
(function (root) {
  'use strict';
  /* ---- a full strip: 6 tickets, each 3 rows x 9 columns, 15 numbers, together using 1..90 once ---- */
  function shuffle(a, rnd) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function counts(rnd) { /* 6 x 9 matrix, entries 1..3, row sums 15, column sums = column sizes */
    var size = [9, 10, 10, 10, 10, 10, 10, 10, 11];
    for (var tries = 0; tries < 500; tries++) {
      var m = [], need = [6, 6, 6, 6, 6, 6], ok = true, t, c;
      for (t = 0; t < 6; t++) { m.push([1, 1, 1, 1, 1, 1, 1, 1, 1]); }
      var order = shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8], rnd);
      for (var oi = 0; oi < 9 && ok; oi++) {
        c = order[oi];
        var extra = size[c] - 6, cand = [0, 1, 2, 3, 4, 5].filter(function (x) { return need[x] > 0; });
        /* give each extra to a ticket that still needs some, at most 2 extras per ticket in a column */
        var given = [0, 0, 0, 0, 0, 0];
        for (var e = 0; e < extra; e++) {
          var pool = cand.filter(function (x) { return need[x] > 0 && given[x] < 2; });
          if (!pool.length) { ok = false; break; }
          var tot = 0; pool.forEach(function (x) { tot += need[x] * need[x]; });
          var r = rnd() * tot, pick = pool[0];
          for (var k = 0; k < pool.length; k++) { r -= need[pool[k]] * need[pool[k]]; if (r <= 0) { pick = pool[k]; break; } }
          given[pick]++; need[pick]--; m[pick][c]++;
        }
      }
      if (ok && need.every(function (x) { return x === 0; })) return m;
    }
    return null;
  }
  function layout(cnt, rnd) { /* cnt: 9 counts (sum 15) -> 3x9 booleans with 5 per row, or null */
    var cols = [0, 1, 2, 3, 4, 5, 6, 7, 8].sort(function (a, b) { return cnt[b] - cnt[a] || (rnd() - 0.5); });
    var rowN = [0, 0, 0], g = [[], [], []], i;
    for (i = 0; i < 3; i++) for (var c = 0; c < 9; c++) g[i][c] = false;
    function subsets(k) { return k === 1 ? [[0], [1], [2]] : k === 2 ? [[0, 1], [0, 2], [1, 2]] : [[0, 1, 2]]; }
    function go(ix) {
      if (ix === 9) return rowN[0] === 5 && rowN[1] === 5 && rowN[2] === 5;
      var col = cols[ix], opts = shuffle(subsets(cnt[col]).slice(), rnd);
      for (var o = 0; o < opts.length; o++) {
        var s = opts[o], fits = s.every(function (r) { return rowN[r] < 5; });
        if (!fits) continue;
        s.forEach(function (r) { rowN[r]++; g[r][col] = true; });
        if (go(ix + 1)) return true;
        s.forEach(function (r) { rowN[r]--; g[r][col] = false; });
      }
      return false;
    }
    return go(0) ? g : null;
  }
  function strip(rnd) {
    rnd = rnd || Math.random;
    for (var tries = 0; tries < 200; tries++) {
      var m = counts(rnd); if (!m) continue;
      var grids = [], ok = true, t;
      for (t = 0; t < 6; t++) { var g = layout(m[t], rnd); if (!g) { ok = false; break; } grids.push(g); }
      if (!ok) continue;
      var pools = [];
      for (var c = 0; c < 9; c++) { var lo = c === 0 ? 1 : c * 10, hi = c === 8 ? 90 : c * 10 + 9, a = []; for (var n = lo; n <= hi; n++) a.push(n); pools.push(shuffle(a, rnd)); }
      var out = [];
      for (t = 0; t < 6; t++) {
        var tk = [[], [], []];
        for (c = 0; c < 9; c++) {
          var take = pools[c].splice(0, m[t][c]).sort(function (x, y) { return x - y; }), ix = 0;
          for (var r = 0; r < 3; r++) tk[r][c] = grids[t][r][c] ? take[ix++] : 0;
        }
        out.push(tk);
      }
      return out;
    }
    return null;
  }
  function validStrip(s) {
    if (!s || s.length !== 6) return false;
    var seen = {}, t, r, c;
    for (t = 0; t < 6; t++) {
      var tk = s[t], total = 0;
      for (r = 0; r < 3; r++) { var rc = 0; for (c = 0; c < 9; c++) if (tk[r][c]) rc++; if (rc !== 5) return false; total += rc; }
      if (total !== 15) return false;
      for (c = 0; c < 9; c++) {
        var prev = 0, any = 0;
        for (r = 0; r < 3; r++) {
          var v = tk[r][c]; if (!v) continue; any++;
          var lo = c === 0 ? 1 : c * 10, hi = c === 8 ? 90 : c * 10 + 9;
          if (v < lo || v > hi || v <= prev || seen[v]) return false;
          prev = v; seen[v] = 1;
        }
        if (!any) return false;
      }
    }
    return Object.keys(seen).length === 90;
  }
  var API = { strip: strip, validStrip: validStrip };
  if (typeof module !== 'undefined' && module.exports) { module.exports = API; return; }

  /* ---- the page ---- */
  var d = document, LS = window.localStorage;
  function el(tag, cls, html) { var e = d.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }
  function ticketHtml(tk, label) {
    var h = '<table class="tb-tk"><caption>' + label + '</caption><tbody>';
    for (var r = 0; r < 3; r++) { h += '<tr>'; for (var c = 0; c < 9; c++) h += tk[r][c] ? '<td>' + tk[r][c] + '</td>' : '<td class="e"></td>'; h += '</tr>'; }
    return h + '</tbody></table>';
  }
  function stripHtml(s, n) {
    var h = '<div class="tb-strip">';
    for (var i = 0; i < 6; i++) h += ticketHtml(s[i], 'Ticket ' + (n * 6 + i + 1));
    return h + '</div>';
  }
  function maker(box) {
    box.innerHTML = '<div class="finder"><div class="fields"><div><label for="tn">Name on the tickets (optional)</label><input type="text" id="tn" maxlength="40" placeholder="Sharma Family Tambola"></div>' +
      '<div><label for="ts">How many strips? (6 tickets each)</label><select id="ts"><option>1</option><option>2</option><option>3</option><option selected>4</option><option>5</option><option>6</option><option>8</option></select></div></div>' +
      '<p><button class="btn" type="button" id="tg">Make tickets</button> <button class="btn ghost" type="button" id="tp">Print</button></p><p class="hint">Each strip has 6 tickets that together use every number from 1 to 90 exactly once, so every number called is on one ticket of the strip. Hand out tickets from the same strip to different players.</p></div><div id="tout" aria-live="polite"></div>';
    function make() {
      var n = +box.querySelector('#ts').value, name = box.querySelector('#tn').value.trim(), h = name ? '<h2 class="tb-name">' + esc(name) + '</h2>' : '', i, s, bad = 0;
      for (i = 0; i < n; i++) { s = strip(); if (!validStrip(s)) { bad++; continue; } h += stripHtml(s, i); }
      box.querySelector('#tout').innerHTML = bad ? '<p class="cc-bad">Something went wrong. Please press Make tickets again.</p>' : h;
    }
    box.querySelector('#tg').addEventListener('click', make);
    box.querySelector('#tp').addEventListener('click', function () { if (!box.querySelector('.tb-tk')) make(); window.print(); });
    make();
  }
  /* ---- number caller ---- */
  function caller(box) {
    var calls = {}; try { calls = JSON.parse(box.getAttribute('data-calls') || '{}'); } catch (e) { }
    var pool, hist, saved = null;
    try { saved = JSON.parse(LS.getItem('tb-game')); } catch (e) { }
    if (saved && saved.hist && saved.hist.length < 90) { hist = saved.hist; } else hist = [];
    function fresh() { pool = []; for (var i = 1; i <= 90; i++) if (hist.indexOf(i) < 0) pool.push(i); }
    fresh();
    box.innerHTML = '<div class="tb-call"><p class="tb-n" id="cn" aria-live="assertive">–</p><p class="tb-ph" id="cp">Press Call a number to start.</p>' +
      '<p><button class="btn" type="button" id="cb">Call a number</button> <button class="btn ghost" type="button" id="cu">Undo last</button> <button class="btn ghost" type="button" id="cr">New game</button></p>' +
      '<label class="tb-ck"><input type="checkbox" id="cv"> Say the number aloud</label><p class="hint" id="cvn" aria-live="polite"></p></div><div class="tb-board" id="bd"></div><p class="hint" id="cc"></p>';
    var bd = box.querySelector('#bd'), i;
    for (i = 1; i <= 90; i++) bd.appendChild(el('span', '', i));
    function draw() {
      Array.prototype.forEach.call(bd.children, function (s, ix) { var on = hist.indexOf(ix + 1) >= 0; s.className = on ? 'on' : ''; if (hist.length && hist[hist.length - 1] === ix + 1) s.className = 'on last'; });
      var last = hist[hist.length - 1];
      box.querySelector('#cn').textContent = last || '–';
      box.querySelector('#cp').textContent = last ? (calls[last] || '') : 'Press Call a number to start.';
      box.querySelector('#cc').textContent = hist.length + ' called, ' + (90 - hist.length) + ' left.' + (hist.length > 1 ? ' Earlier: ' + hist.slice(0, -1).slice(-8).reverse().join(', ') + '.' : '');
      try { LS.setItem('tb-game', JSON.stringify({ hist: hist })); } catch (e) { }
    }
    var cv = box.querySelector('#cv'), cvn = box.querySelector('#cvn'), canSpeak = !!(window.speechSynthesis && typeof window.SpeechSynthesisUtterance !== 'undefined');
    if (!canSpeak) { cv.disabled = true; cvn.textContent = 'This browser cannot read the numbers aloud, so please read them from the screen.'; }
    cv.addEventListener('change', function () { cvn.textContent = ''; if (cv.checked && canSpeak && window.speechSynthesis.getVoices && !window.speechSynthesis.getVoices().length) setTimeout(function () { if (!window.speechSynthesis.getVoices().length) cvn.textContent = 'No voice was found on this device. If you hear nothing, please read the numbers from the screen.'; }, 1500); });
    function say(n) {
      if (!cv.checked || !canSpeak) return;
      var tens = Math.floor(n / 10), ones = n % 10, t = String(n) + (n > 9 ? ', ' + (tens + ' ' + ones) : '');
      try { var u = new SpeechSynthesisUtterance(t); u.lang = 'en-IN'; u.onerror = function () { cvn.textContent = 'The voice could not speak. Please read the numbers from the screen.'; }; window.speechSynthesis.cancel(); window.speechSynthesis.speak(u); } catch (e) { cvn.textContent = 'The voice could not speak. Please read the numbers from the screen.'; }
    }
    box.querySelector('#cb').addEventListener('click', function () {
      if (!pool.length) { box.querySelector('#cp').textContent = 'All 90 numbers have been called.'; return; }
      var ix = Math.floor(Math.random() * pool.length), n = pool.splice(ix, 1)[0]; hist.push(n); draw(); say(n);
    });
    box.querySelector('#cu').addEventListener('click', function () { if (hist.length) { pool.push(hist.pop()); draw(); } });
    box.querySelector('#cr').addEventListener('click', function () { hist = []; fresh(); draw(); });
    draw();
  }
  /* ---- bingo card (5x5, own words or numbers) ---- */
  function bingo(box) {
    box.innerHTML = '<div class="finder"><label for="bw">Your words, one on each line (at least 24)</label><textarea id="bw" rows="8" style="width:100%;font:inherit;padding:10px;border-radius:10px;border:1px solid var(--field-line);background:var(--field);color:var(--ink)" placeholder="Someone says &quot;as I was saying&quot;&#10;Phone rings in the middle of a speech&#10;..."></textarea>' +
      '<div class="fields"><div><label for="bn">How many cards?</label><select id="bn"><option>1</option><option>2</option><option selected>4</option><option>6</option><option>8</option><option>10</option></select></div><div><label for="bt">Title</label><input type="text" id="bt" maxlength="30" placeholder="Wedding Bingo"></div></div>' +
      '<p><button class="btn" type="button" id="bg">Make cards</button> <button class="btn ghost" type="button" id="bs">Fill with numbers 1 to 75</button> <button class="btn ghost" type="button" id="bp">Print</button></p><p class="hint">The centre square is free. Every card shuffles your words differently.</p></div><div id="bout"></div>';
    function make(words) {
      var n = +box.querySelector('#bn').value, title = box.querySelector('#bt').value.trim() || 'Bingo', h = '', i, k;
      if (words.length < 24) { box.querySelector('#bout').innerHTML = '<p class="cc-bad">Please give at least 24 different words or lines (you have ' + words.length + ').</p>'; return; }
      for (i = 0; i < n; i++) {
        var w = shuffle(words.slice(), Math.random).slice(0, 24); w.splice(12, 0, 'FREE');
        h += '<table class="tb-bg"><caption>' + esc(title) + '</caption><tbody>';
        for (k = 0; k < 25; k++) { if (k % 5 === 0) h += '<tr>'; h += '<td' + (w[k] === 'FREE' ? ' class="f"' : '') + '>' + esc(w[k]) + '</td>'; if (k % 5 === 4) h += '</tr>'; }
        h += '</tbody></table>';
      }
      box.querySelector('#bout').innerHTML = '<div class="tb-bgs">' + h + '</div>';
    }
    function words() { var seen = {}, out = []; box.querySelector('#bw').value.split('\n').forEach(function (l) { l = l.trim(); if (l && !seen[l.toLowerCase()]) { seen[l.toLowerCase()] = 1; out.push(l); } }); return out; }
    box.querySelector('#bg').addEventListener('click', function () { make(words()); });
    box.querySelector('#bs').addEventListener('click', function () { var a = []; for (var i = 1; i <= 75; i++) a.push(String(i)); make(a); });
    box.querySelector('#bp').addEventListener('click', function () { if (!box.querySelector('.tb-bg')) make(words()); if (box.querySelector('.tb-bg')) window.print(); });
  }
  function init() {
    var m = d.querySelector('[data-tb=maker]'), c = d.querySelector('[data-tb=caller]'), b = d.querySelector('[data-tb=bingo]');
    if (m) maker(m); if (c) caller(c); if (b) bingo(b);
  }
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', init); else init();
})(this);
