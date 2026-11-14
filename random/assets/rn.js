/* Random tools for ShareYourGroup: dice, coin, number, card, team picker, yes/no, giveaway draw.
   Randomness: crypto.getRandomValues with rejection sampling (no modulo bias), falls back to Math.random only if crypto is missing. */
(function () {
  'use strict';
  function u32() {
    var c = (typeof window !== 'undefined' && window.crypto) || (typeof require !== 'undefined' && require('crypto').webcrypto);
    if (c && c.getRandomValues) { var a = new Uint32Array(1); c.getRandomValues(a); return a[0]; }
    return Math.floor(Math.random() * 4294967296);
  }
  // uniform integer in [0, n)
  function below(n) {
    if (n <= 1) return 0;
    var lim = 4294967296 - (4294967296 % n), x;
    do { x = u32(); } while (x >= lim);
    return x % n;
  }
  function between(lo, hi) { return lo + below(hi - lo + 1); }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = below(i + 1), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function roll(n, sides) { var r = []; for (var i = 0; i < n; i++) r.push(1 + below(sides)); return r; }
  function teams(names, k) { var s = shuffle(names), t = []; for (var i = 0; i < k; i++) t.push([]); s.forEach(function (x, i) { t[i % k].push(x); }); return t; }
  function winners(names, k) { return shuffle(names).slice(0, Math.min(k, names.length)); }
  function deck() { var d = [], S = ['♠', '♥', '♦', '♣'], R = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']; S.forEach(function (s) { R.forEach(function (r) { d.push({ r: r, s: s }); }); }); return d; }
  function lines(t) { var seen = {}, out = []; t.split(/\r?\n/).forEach(function (l) { l = l.trim(); if (l && !seen[l.toLowerCase()]) { seen[l.toLowerCase()] = 1; out.push(l); } }); return out; }
  var API = { below: below, between: between, shuffle: shuffle, roll: roll, teams: teams, winners: winners, deck: deck, lines: lines };
  if (typeof module !== 'undefined' && module.exports) { module.exports = API; return; }
  window.RN = API;

  function $(id) { return document.getElementById(id); }
  var PIPS = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
  var T = {
    dice: function (root) {
      root.innerHTML = '<div class="rn-row"><label>Dice <select id="dn">' + [1, 2, 3, 4, 5, 6, 8, 10].map(function (n) { return '<option>' + n + '</option>'; }).join('') + '</select></label> <label>Sides <select id="ds">' + [4, 6, 8, 10, 12, 20, 100].map(function (n) { return '<option' + (n == 6 ? ' selected' : '') + '>' + n + '</option>'; }).join('') + '</select></label> <button class="btn" id="dg">Roll</button></div><div class="rn-out" id="do" aria-live="polite">Press Roll</div><p class="rn-note" id="dh"></p>';
      var hist = [];
      $('dg').onclick = function () {
        var n = +$('dn').value, s = +$('ds').value, r = roll(n, s), sum = r.reduce(function (a, b) { return a + b; }, 0);
        $('do').innerHTML = '<div class="rn-dice">' + r.map(function (v) { return '<span class="rn-d">' + (s == 6 ? PIPS[v] : v) + '</span>'; }).join('') + '</div><div class="rn-big">Total ' + sum + '</div>';
        hist.unshift(n + 'd' + s + ': ' + r.join(' + ') + ' = ' + sum); hist = hist.slice(0, 8);
        $('dh').textContent = 'Last rolls: ' + hist.join('  |  ');
      };
    },
    coin: function (root) {
      root.innerHTML = '<div class="rn-row"><button class="btn" id="cg">Flip the coin</button> <button class="btn ghost" id="cr">Reset count</button></div><div class="rn-out" id="co" aria-live="polite">Press Flip</div><p class="rn-note" id="ch"></p>';
      var h = 0, t = 0, streak = 0, last = '';
      $('cg').onclick = function () { var r = below(2) ? 'Heads' : 'Tails'; if (r == 'Heads') h++; else t++; streak = r == last ? streak + 1 : 1; last = r; $('co').innerHTML = '<div class="rn-big">' + r + '</div>'; $('ch').textContent = 'Heads ' + h + ', Tails ' + t + ' (' + (h + t) + ' flips). Current run: ' + streak + ' ' + r.toLowerCase() + '.'; };
      $('cr').onclick = function () { h = t = streak = 0; last = ''; $('co').textContent = 'Press Flip'; $('ch').textContent = ''; };
    },
    number: function (root) {
      root.innerHTML = '<div class="rn-row"><label>From <input id="nl" type="number" value="1"></label> <label>To <input id="nh" type="number" value="100"></label> <label>How many <input id="nk" type="number" value="1" min="1" max="100"></label> <label class="tb-ck"><input type="checkbox" id="nu"> no repeats</label> <button class="btn" id="ng">Pick</button></div><div class="rn-out" id="no" aria-live="polite">Press Pick</div>';
      $('ng').onclick = function () {
        var lo = Math.floor(+$('nl').value), hi = Math.floor(+$('nh').value), k = Math.max(1, Math.min(100, Math.floor(+$('nk').value) || 1)), u = $('nu').checked;
        if (isNaN(lo) || isNaN(hi) || hi < lo) { $('no').textContent = 'The second number must not be smaller than the first.'; return; }
        if (hi - lo > 1e9) { $('no').textContent = 'Please keep the range under a billion.'; return; }
        var out = [];
        if (u) { if (k > hi - lo + 1) { $('no').textContent = 'You asked for ' + k + ' different numbers but the range holds only ' + (hi - lo + 1) + '.'; return; } var seen = {}; while (out.length < k) { var v = between(lo, hi); if (!seen[v]) { seen[v] = 1; out.push(v); } } }
        else for (var i = 0; i < k; i++) out.push(between(lo, hi));
        $('no').innerHTML = '<div class="rn-big">' + out.join(', ') + '</div>';
      };
    },
    card: function (root) {
      root.innerHTML = '<div class="rn-row"><label>Draw <input id="kn" type="number" value="1" min="1" max="52"></label> <button class="btn" id="kg">Draw</button> <button class="btn ghost" id="ks">New shuffled deck</button></div><div class="rn-out" id="ko" aria-live="polite">Press Draw</div><p class="rn-note" id="kh"></p>';
      var d = shuffle(deck());
      function show(c) { var red = c.s == '♥' || c.s == '♦'; return '<span class="rn-card' + (red ? ' red' : '') + '">' + c.r + c.s + '</span>'; }
      $('kg').onclick = function () { var k = Math.max(1, Math.min(52, Math.floor(+$('kn').value) || 1)); if (d.length < k) { $('ko').textContent = 'Only ' + d.length + ' cards are left. Press New shuffled deck.'; return; } var got = d.splice(0, k); $('ko').innerHTML = got.map(show).join(' '); $('kh').textContent = d.length + ' cards left in the deck.'; };
      $('ks').onclick = function () { d = shuffle(deck()); $('ko').textContent = 'New deck shuffled'; $('kh').textContent = '52 cards in the deck.'; };
    },
    team: function (root) {
      root.innerHTML = '<label for="tl">Names, one per line</label><textarea id="tl" rows="8" placeholder="Asha&#10;Bilal&#10;Chen&#10;Dev&#10;Esha&#10;Farid"></textarea><div class="rn-row"><label>Teams <input id="tk" type="number" value="2" min="2" max="20"></label> <button class="btn" id="tg">Make teams</button></div><div class="rn-out" id="to" aria-live="polite"></div>';
      $('tg').onclick = function () {
        var names = lines($('tl').value), k = Math.max(2, Math.min(20, Math.floor(+$('tk').value) || 2));
        if (names.length < k) { $('to').textContent = 'Add at least ' + k + ' different names (you have ' + names.length + ').'; return; }
        $('to').innerHTML = teams(names, k).map(function (t, i) { return '<div class="rn-team"><b>Team ' + (i + 1) + ' (' + t.length + ')</b><br>' + t.map(function (x) { return x.replace(/</g, '&lt;'); }).join('<br>') + '</div>'; }).join('');
      };
    },
    yesno: function (root) {
      root.innerHTML = '<div class="rn-row"><button class="btn" id="yg">Yes or no?</button></div><div class="rn-out" id="yo" aria-live="polite">Think of a question, then press the button</div>';
      $('yg').onclick = function () { $('yo').innerHTML = '<div class="rn-big">' + (below(2) ? 'Yes' : 'No') + '</div>'; };
    },
    draw: function (root) {
      root.innerHTML = '<label for="wl">Entries, one per line (a name, a comment link or a ticket number)</label><textarea id="wl" rows="8" placeholder="Entry 1&#10;Entry 2&#10;Entry 3"></textarea><div class="rn-row"><label>Winners <input id="wk" type="number" value="1" min="1" max="50"></label> <button class="btn" id="wg">Draw winners</button></div><div class="rn-out" id="wo" aria-live="polite"></div><p class="rn-note" id="wh"></p>';
      var n = 0;
      $('wg').onclick = function () {
        var names = lines($('wl').value), k = Math.max(1, Math.min(50, Math.floor(+$('wk').value) || 1));
        if (!names.length) { $('wo').textContent = 'Add at least one entry first.'; return; }
        var w = winners(names, k); n++;
        $('wo').innerHTML = '<ol class="rn-win">' + w.map(function (x) { return '<li>' + x.replace(/</g, '&lt;') + '</li>'; }).join('') + '</ol>';
        $('wh').textContent = 'Draw ' + n + ' at ' + new Date().toLocaleTimeString() + ' from ' + names.length + ' different entries (duplicate lines are counted once). Screenshot this page to keep a record.';
      };
    }
  };
  function init() { var r = document.querySelectorAll('[data-tool]'); for (var i = 0; i < r.length; i++) { var f = T[r[i].getAttribute('data-tool')]; if (f) { r[i].innerHTML = ''; f(r[i]); } } }
  if (document.readyState == 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
