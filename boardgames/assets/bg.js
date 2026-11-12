/* play.shareyourgroup.com/boardgames: game search on the home page, dice and cowrie roller, print one board. */
(function () {
  'use strict';
  var d = document;
  function $(s) { return d.querySelector(s); }
  function rnd(n) {   // fair whole number 0..n-1 from the browser's secure random source
    var c = window.crypto || window.msCrypto, a, lim = Math.floor(256 / n) * n;
    if (!c || !c.getRandomValues) return Math.floor(Math.random() * n);
    do { a = new Uint8Array(1); c.getRandomValues(a); } while (a[0] >= lim);
    return a[0] % n;
  }
  var PIPS = { 1: [5], 2: [1, 9], 3: [1, 5, 9], 4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9] };
  function die(v) { var h = '<span class="die" role="img" aria-label="' + v + '">'; for (var i = 1; i <= 9; i++) h += PIPS[v].indexOf(i) >= 0 ? '<i></i>' : '<span></span>'; return h + '</span>'; }
  function init() {
    var q = $('#bq');
    if (q) q.addEventListener('input', function () {
      var v = q.value.trim().toLowerCase(), n = 0;
      [].forEach.call(d.querySelectorAll('#blist li'), function (li) { var on = !v || (li.getAttribute('data-t') + ' ' + li.textContent.toLowerCase()).indexOf(v) >= 0; li.hidden = !on; if (on) n++; });
      $('#bnone').hidden = n > 0;
    });
    var roll = $('#droll');
    if (roll) {
      var go = function () { var n = +$('#dn').value, h = '', sum = 0, vals = []; for (var i = 0; i < n; i++) { var v = rnd(6) + 1; vals.push(v); sum += v; h += die(v); } $('#dout').innerHTML = h; $('#dsum').textContent = n > 1 ? 'You rolled ' + vals.join(', ') + '. Total: ' + sum + '.' : 'You rolled a ' + sum + '.'; };
      roll.addEventListener('click', go);
      $('#croll').addEventListener('click', function () { var n = +$('#cn').value, h = '', up = 0; for (var i = 0; i < n; i++) { var u = rnd(2); up += u; h += '<span class="cowrie' + (u ? ' up' : '') + '" role="img" aria-label="' + (u ? 'mouth up' : 'mouth down') + '"></span>'; } $('#cout').innerHTML = h; $('#csum').textContent = up + ' of ' + n + ' cowries landed mouth up' + (up === 0 ? ' (all down).' : up === n ? ' (all up).' : '.'); });
    }
    d.addEventListener('click', function (e) {
      var b = e.target.closest('[data-print]'); if (!b) return;
      var f = d.getElementById(b.getAttribute('data-print')); if (!f) return;
      [].forEach.call(d.querySelectorAll('.fig.printing'), function (x) { x.classList.remove('printing'); });
      f.classList.add('printing'); d.body.classList.add('print-one'); window.print();
      setTimeout(function () { d.body.classList.remove('print-one'); f.classList.remove('printing'); }, 500);
    });
  }
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', init); else init();
})();
