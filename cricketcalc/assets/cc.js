/* play.shareyourgroup.com/cricketcalc: cricket calculators. Written for this site. Everything is worked out in the browser; nothing is sent anywhere. */
(function (root) {
  'use strict';
  /* ---- the arithmetic (also loaded by node for tests) ---- */
  function overs(s) { /* "18.4" = 18 overs 4 balls. Returns balls, or null if not valid */
    s = String(s == null ? '' : s).trim().replace(',', '.');
    if (!/^\d+(\.\d)?$/.test(s)) return null;
    var p = s.split('.'), o = parseInt(p[0], 10), b = p[1] ? parseInt(p[1], 10) : 0;
    if (b > 5) return null;
    return o * 6 + b;
  }
  function fmtOvers(balls) { return Math.floor(balls / 6) + (balls % 6 ? '.' + (balls % 6) : ''); }
  function nrr(rows, quota) {
    var rf = 0, bf = 0, ra = 0, ba = 0, i, r;
    for (i = 0; i < rows.length; i++) {
      r = rows[i];
      rf += r.rf; ra += r.ra;
      bf += r.outF ? quota * 6 : r.bf;
      ba += r.outA ? quota * 6 : r.ba;
    }
    if (!bf || !ba) return null;
    return { rf: rf, bf: bf, ra: ra, ba: ba, forRate: rf / (bf / 6), againstRate: ra / (ba / 6), nrr: rf / (bf / 6) - ra / (ba / 6) };
  }
  function rate(runs, balls) { return balls ? runs / (balls / 6) : null; }
  function rrr(target, scored, ballsLeft) { return ballsLeft > 0 ? (target - scored) / (ballsLeft / 6) : null; }
  var API = { overs: overs, fmtOvers: fmtOvers, nrr: nrr, rate: rate, rrr: rrr };
  if (typeof module !== 'undefined' && module.exports) { module.exports = API; return; }

  /* ---- the page ---- */
  var d = document;
  function el(tag, cls, html) { var e = d.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function f2(x) { return (Math.round(x * 100) / 100).toFixed(2); }
  function f3(x) { return (x >= 0 ? '+' : '-') + Math.abs(Math.round(x * 1000) / 1000).toFixed(3); }
  function num(v) { v = String(v).trim().replace(',', '.'); return v !== '' && isFinite(v) && +v >= 0 ? +v : null; }
  function field(label, id, ph, hint) {
    return '<div><label for="' + id + '">' + label + '</label><input type="text" inputmode="decimal" autocomplete="off" id="' + id + '" placeholder="' + (ph || '') + '">' + (hint ? '<p class="hint">' + hint + '</p>' : '') + '</div>';
  }
  function box(rootEl, html) { rootEl.innerHTML = html; }
  function out(rootEl) { var o = rootEl.querySelector('.cc-out'); return o; }
  function bad(o, msg) { o.className = 'cc-out cc-bad'; o.innerHTML = msg; }
  function good(o, html) { o.className = 'cc-out'; o.innerHTML = html; }
  function bind(rootEl, ids, fn) {
    var go = function () { fn(rootEl, out(rootEl)); };
    rootEl.addEventListener('input', go);
    rootEl.addEventListener('change', go);
    rootEl.querySelector('[data-calc]').addEventListener('click', go);
  }
  function share(rootEl, text) { return '<p class="acts"><button class="btn sm" type="button" data-wa="' + text.replace(/"/g, '&quot;') + '">WhatsApp</button><button class="btn sm ghost" type="button" data-copy="' + text.replace(/"/g, '&quot;') + '">Copy</button></p>'; }
  function q(rootEl, id) { return rootEl.querySelector('#' + id); }
  var T = {};

  T.strike = function (r) {
    box(r, '<div class="finder"><div class="fields">' + field('Runs scored', 'runs', '45') + field('Balls faced', 'balls', '30') + '</div><p><button class="btn" type="button" data-calc>Work it out</button></p><div class="cc-out" aria-live="polite"></div></div>');
    bind(r, 0, function (r, o) {
      var runs = num(q(r, 'runs').value), balls = num(q(r, 'balls').value);
      if (runs == null || !balls) return bad(o, 'Type the runs and the balls faced (balls cannot be zero).');
      var sr = runs / balls * 100, t = 'A batter who scored ' + runs + ' off ' + balls + ' balls has a strike rate of ' + f2(sr) + '.';
      good(o, '<p class="cc-big">' + f2(sr) + '</p><p>Strike rate = ' + runs + ' ÷ ' + balls + ' × 100. That is ' + f2(sr / 100) + ' runs a ball, or about ' + f2(sr * 6 / 100) + ' runs an over.</p>' + share(r, t));
    });
  };
  T.battingavg = function (r) {
    box(r, '<div class="finder"><div class="fields">' + field('Total runs', 'runs', '1250') + field('Innings played', 'inn', '30') + field('Not outs', 'no', '4') + '</div><p><button class="btn" type="button" data-calc>Work it out</button></p><div class="cc-out" aria-live="polite"></div></div>');
    bind(r, 0, function (r, o) {
      var runs = num(q(r, 'runs').value), inn = num(q(r, 'inn').value), no = num(q(r, 'no').value);
      if (no == null && q(r, 'no').value.trim() === '') no = 0;
      if (runs == null || !inn || no == null) return bad(o, 'Type the total runs, the innings and the not outs.');
      if (no > inn) return bad(o, 'Not outs cannot be more than the innings.');
      if (inn === no) return bad(o, 'The batter was never out, so the average cannot be worked out (it is undefined).');
      var av = runs / (inn - no), t = runs + ' runs in ' + inn + ' innings with ' + no + ' not outs: batting average ' + f2(av) + '.';
      good(o, '<p class="cc-big">' + f2(av) + '</p><p>Batting average = ' + runs + ' ÷ (' + inn + ' − ' + no + ') = ' + runs + ' ÷ ' + (inn - no) + ' dismissals.</p>' + share(r, t));
    });
  };
  T.economy = function (r) {
    box(r, '<div class="finder"><div class="fields">' + field('Runs conceded', 'runs', '32') + field('Overs bowled', 'ov', '4', 'Write 3.4 for 3 overs and 4 balls.') + '</div><p><button class="btn" type="button" data-calc>Work it out</button></p><div class="cc-out" aria-live="polite"></div></div>');
    bind(r, 0, function (r, o) {
      var runs = num(q(r, 'runs').value), b = overs(q(r, 'ov').value);
      if (runs == null || !b) return bad(o, 'Type the runs conceded and the overs bowled. Balls go after the dot and cannot be more than 5 (3.4 is fine, 3.7 is not).');
      var e = rate(runs, b), t = 'Bowled ' + fmtOvers(b) + ' overs for ' + runs + ': economy rate ' + f2(e) + '.';
      good(o, '<p class="cc-big">' + f2(e) + '</p><p>Economy rate = ' + runs + ' runs ÷ ' + f2(b / 6) + ' overs (' + fmtOvers(b) + ' is ' + b + ' balls, which is ' + f2(b / 6) + ' overs).</p>' + share(r, t));
    });
  };
  T.bowlavg = function (r) {
    box(r, '<div class="finder"><div class="fields">' + field('Runs conceded', 'runs', '420') + field('Wickets taken', 'wk', '15') + field('Balls bowled (optional)', 'balls', '540', 'Add it to get the bowling strike rate too.') + '</div><p><button class="btn" type="button" data-calc>Work it out</button></p><div class="cc-out" aria-live="polite"></div></div>');
    bind(r, 0, function (r, o) {
      var runs = num(q(r, 'runs').value), wk = num(q(r, 'wk').value), balls = num(q(r, 'balls').value);
      if (runs == null || !wk) return bad(o, 'Type the runs conceded and the wickets taken (at least one wicket).');
      var av = runs / wk, h = '<p class="cc-big">' + f2(av) + '</p><p>Bowling average = ' + runs + ' ÷ ' + wk + ' wickets.</p>', t = runs + ' runs for ' + wk + ' wickets: bowling average ' + f2(av) + '.';
      if (balls) { h += '<p>Bowling strike rate = ' + balls + ' ÷ ' + wk + ' = ' + f2(balls / wk) + ' balls per wicket. Economy rate = ' + f2(runs / (balls / 6)) + '.</p>'; }
      good(o, h + share(r, t));
    });
  };
  T.rrr = function (r) {
    box(r, '<div class="finder"><div class="fields">' + field('Target (runs to win)', 'tg', '165') + field('Runs scored so far', 'sc', '82') + field('Overs bowled so far', 'ov', '10', 'For example 10 or 10.3') + field('Total overs in the innings', 'tot', '20') + '</div><p><button class="btn" type="button" data-calc>Work it out</button></p><div class="cc-out" aria-live="polite"></div></div>');
    bind(r, 0, function (r, o) {
      var tg = num(q(r, 'tg').value), sc = num(q(r, 'sc').value), b = overs(q(r, 'ov').value), tot = num(q(r, 'tot').value);
      if (tg == null || sc == null || b == null || !tot) return bad(o, 'Fill all four boxes. Overs use balls after the dot: 10.3 means 10 overs and 3 balls.');
      var left = tot * 6 - b;
      if (left <= 0) return bad(o, 'No balls are left, so there is no required rate.');
      var need = tg - sc;
      if (need <= 0) return good(o, '<p class="cc-big">Won</p><p>The score is already at or above the target.</p>');
      var rq = rrr(tg, sc, left), crr = b ? rate(sc, b) : null, t = 'Need ' + need + ' from ' + left + ' balls: required rate ' + f2(rq) + '.';
      good(o, '<p class="cc-big">' + f2(rq) + '</p><p>Required rate = ' + need + ' runs ÷ ' + f2(left / 6) + ' overs (' + left + ' balls left). That is ' + f2(need / left) + ' runs a ball.' + (crr != null ? ' The current run rate is ' + f2(crr) + '.' : '') + '</p>' + share(r, t));
    });
  };
  T.runrate = function (r) {
    box(r, '<div class="finder"><div class="fields">' + field('Runs scored', 'sc', '54') + field('Overs bowled', 'ov', '6', '6.2 means 6 overs and 2 balls') + field('Total overs', 'tot', '20') + '</div><p><button class="btn" type="button" data-calc>Work it out</button></p><div class="cc-out" aria-live="polite"></div></div>');
    bind(r, 0, function (r, o) {
      var sc = num(q(r, 'sc').value), b = overs(q(r, 'ov').value), tot = num(q(r, 'tot').value);
      if (sc == null || !b || !tot) return bad(o, 'Type the runs, the overs bowled so far (more than zero) and the total overs.');
      if (b > tot * 6) return bad(o, 'The overs bowled cannot be more than the total overs.');
      var cr = rate(sc, b), proj = cr * tot, rows = [6, 7, 8, 9, 10, 12].map(function (x) { var rem = tot * 6 - b; return '<tr><td>' + x + ' an over</td><td>' + Math.round(sc + x * rem / 6) + '</td></tr>'; }).join('');
      good(o, '<p class="cc-big">' + f2(cr) + '</p><p>Current run rate = ' + sc + ' ÷ ' + f2(b / 6) + ' overs. At this rate the innings ends on about <b>' + Math.round(proj) + '</b>.</p>' +
        '<table class="cc-t"><caption>Final score if the rest of the innings goes at</caption><tbody>' + rows + '</tbody></table>' + share(r, sc + ' after ' + fmtOvers(b) + ' overs: run rate ' + f2(cr) + ', projected ' + Math.round(proj) + '.'));
    });
  };
  T.overs = function (r) {
    box(r, '<div class="finder"><div class="fields">' + field('Overs (like 12.4)', 'ov', '12.4') + field('or balls', 'bl', '76') + '</div><p><button class="btn" type="button" data-calc>Convert</button></p><div class="cc-out" aria-live="polite"></div></div>');
    bind(r, 0, function (r, o) {
      var ov = q(r, 'ov').value.trim(), bl = q(r, 'bl').value.trim();
      if (ov) {
        var b = overs(ov);
        if (b == null) return bad(o, 'Overs are written like 12.4 (12 overs and 4 balls). The digit after the dot is 0 to 5.');
        return good(o, '<p class="cc-big">' + b + ' balls</p><p>' + ov + ' overs is ' + Math.floor(b / 6) + ' × 6 + ' + (b % 6) + ' = ' + b + ' balls. As a decimal that is ' + f2(b / 6) + ' overs, the figure to use in a rate sum.</p>');
      }
      var n = num(bl);
      if (n == null || n !== Math.floor(n)) return bad(o, 'Type overs (12.4) or a whole number of balls (76).');
      good(o, '<p class="cc-big">' + fmtOvers(n) + ' overs</p><p>' + n + ' balls is ' + Math.floor(n / 6) + ' overs and ' + (n % 6) + ' balls, which is ' + f2(n / 6) + ' as a decimal.</p>');
    });
  };
  T.nrr = function (r) {
    var rows = [];
    function rowHtml(i) {
      return '<fieldset class="cc-row"><legend>Match ' + (i + 1) + '</legend><div class="fields">' +
        field('Runs scored', 'rf' + i, '180') + field('Overs faced', 'bf' + i, '20') + '<div class="cc-ck"><label><input type="checkbox" id="of' + i + '"> All out (the full quota counts)</label></div>' +
        field('Runs conceded', 'ra' + i, '165') + field('Overs bowled', 'ba' + i, '20') + '<div class="cc-ck"><label><input type="checkbox" id="oa' + i + '"> Opponents all out</label></div></div></fieldset>';
    }
    var n = 2;
    function draw() {
      var h = field('Overs in a full innings', 'quota', '20', '20 for T20, 50 for one-day matches') + '<div id="rows">';
      for (var i = 0; i < n; i++) h += rowHtml(i);
      h += '</div><p><button class="btn ghost" type="button" data-add>Add a match</button> <button class="btn" type="button" data-calc>Work out net run rate</button></p><div class="cc-out" aria-live="polite"></div>';
      var keep = {}; Array.prototype.forEach.call(r.querySelectorAll('input'), function (x) { keep[x.id] = x.type === 'checkbox' ? x.checked : x.value; });
      box(r, '<div class="finder">' + h + '</div>');
      Array.prototype.forEach.call(r.querySelectorAll('input'), function (x) { if (keep[x.id] != null) { if (x.type === 'checkbox') x.checked = keep[x.id]; else x.value = keep[x.id]; } });
      if (!r.querySelector('#quota').value) r.querySelector('#quota').value = '20';
      r.querySelector('[data-add]').addEventListener('click', function () { if (n < 14) { n++; draw(); } });
      r.querySelector('[data-calc]').addEventListener('click', calc);
    }
    function calc() {
      var o = out(r), quota = num(q(r, 'quota').value), list = [], i, a, b, c, e;
      if (!quota) return bad(o, 'Type the overs in a full innings (20 or 50).');
      for (i = 0; i < n; i++) {
        a = num(q(r, 'rf' + i).value); b = overs(q(r, 'bf' + i).value); c = num(q(r, 'ra' + i).value); e = overs(q(r, 'ba' + i).value);
        var of = q(r, 'of' + i).checked, oa = q(r, 'oa' + i).checked;
        if (a == null && q(r, 'rf' + i).value.trim() === '' && c == null && q(r, 'ra' + i).value.trim() === '') continue;
        if (a == null || c == null || (!of && !b) || (!oa && !e)) return bad(o, 'Match ' + (i + 1) + ' is not complete. Fill the runs and the overs, or tick "all out" for the side that was bowled out.');
        if ((b || 0) > quota * 6 || (e || 0) > quota * 6) return bad(o, 'Match ' + (i + 1) + ': overs cannot be more than ' + quota + '.');
        list.push({ rf: a, bf: b || 0, outF: of, ra: c, ba: e || 0, outA: oa });
      }
      if (!list.length) return bad(o, 'Fill in at least one match.');
      var x = nrr(list, quota);
      if (!x) return bad(o, 'Overs cannot be zero.');
      var txt = 'Net run rate after ' + list.length + (list.length === 1 ? ' match' : ' matches') + ': ' + f3(x.nrr) + ' (scored at ' + f2(x.forRate) + ', conceded at ' + f2(x.againstRate) + ').';
      good(o, '<p class="cc-big">' + f3(x.nrr) + '</p><p>Runs scored ' + x.rf + ' in ' + f2(x.bf / 6) + ' overs = ' + f2(x.forRate) + ' an over.<br>Runs conceded ' + x.ra + ' in ' + f2(x.ba / 6) + ' overs = ' + f2(x.againstRate) + ' an over.<br>Net run rate = ' + f2(x.forRate) + ' − ' + f2(x.againstRate) + ' = ' + f3(x.nrr) + '.</p>' + share(r, txt));
    }
    draw();
  };
  T.table = function (r) {
    var N = 6;
    function row(i) {
      return '<tr><td><input type="text" id="n' + i + '" aria-label="Team ' + (i + 1) + ' name" placeholder="Team ' + (i + 1) + '"></td>' +
        ['w', 'l', 't', 'nr'].map(function (k) { return '<td><input type="text" inputmode="numeric" id="' + k + i + '" aria-label="' + k + ' ' + (i + 1) + '" size="3"></td>'; }).join('') +
        ['rf', 'bf', 'ra', 'ba'].map(function (k) { return '<td><input type="text" inputmode="decimal" id="' + k + i + '" aria-label="' + k + ' ' + (i + 1) + '" size="5"></td>'; }).join('') + '</tr>';
    }
    var h = '<div class="finder"><p class="hint">Fill one line a team. Wins, losses, ties and no-results are whole numbers. For net run rate type the totals: runs scored, overs faced, runs conceded, overs bowled (use the full quota for an all-out innings).</p>' +
      '<div class="cc-scroll"><table class="cc-t cc-in"><thead><tr><th>Team</th><th>W</th><th>L</th><th>T</th><th>NR</th><th>Runs for</th><th>Overs faced</th><th>Runs against</th><th>Overs bowled</th></tr></thead><tbody>';
    for (var i = 0; i < N; i++) h += row(i);
    h += '</tbody></table></div><div class="fields">' + field('Points for a win', 'pw', '2') + field('Points for a tie or no result', 'pt', '1') + '</div><p><button class="btn" type="button" data-calc>Make the table</button></p><div class="cc-out" aria-live="polite"></div></div>';
    box(r, h); q(r, 'pw').value = '2'; q(r, 'pt').value = '1';
    r.querySelector('[data-calc]').addEventListener('click', function () {
      var o = out(r), pw = num(q(r, 'pw').value), pt = num(q(r, 'pt').value), teams = [], i, nm;
      if (pw == null || pt == null) return bad(o, 'Type the points for a win and for a tie or no result.');
      for (i = 0; i < N; i++) {
        nm = q(r, 'n' + i).value.trim();
        if (!nm) continue;
        var w = num(q(r, 'w' + i).value) || 0, l = num(q(r, 'l' + i).value) || 0, t = num(q(r, 't' + i).value) || 0, nr = num(q(r, 'nr' + i).value) || 0;
        var rf = num(q(r, 'rf' + i).value), bf = overs(q(r, 'bf' + i).value), ra = num(q(r, 'ra' + i).value), ba = overs(q(r, 'ba' + i).value), nv = null;
        if (rf != null && bf && ra != null && ba) nv = rf / (bf / 6) - ra / (ba / 6);
        teams.push({ nm: nm, p: w + l + t + nr, w: w, l: l, t: t, nr: nr, pts: w * pw + (t + nr) * pt, nrr: nv });
      }
      if (teams.length < 2) return bad(o, 'Type at least two team names.');
      teams.sort(function (a, b) { return b.pts - a.pts || b.w - a.w || (b.nrr == null ? -99 : b.nrr) - (a.nrr == null ? -99 : a.nrr); });
      var tx = 'Points table\n' + teams.map(function (t, i) { return (i + 1) + '. ' + t.nm + ' P' + t.p + ' W' + t.w + ' L' + t.l + ' Pts ' + t.pts + (t.nrr != null ? ' NRR ' + f3(t.nrr) : ''); }).join('\n');
      good(o, '<div class="cc-scroll"><table class="cc-t"><thead><tr><th>#</th><th>Team</th><th>P</th><th>W</th><th>L</th><th>T</th><th>NR</th><th>Pts</th><th>NRR</th></tr></thead><tbody>' +
        teams.map(function (t, i) { return '<tr><td>' + (i + 1) + '</td><td>' + t.nm.replace(/</g, '&lt;') + '</td><td>' + t.p + '</td><td>' + t.w + '</td><td>' + t.l + '</td><td>' + t.t + '</td><td>' + t.nr + '</td><td><b>' + t.pts + '</b></td><td>' + (t.nrr != null ? f3(t.nrr) : '–') + '</td></tr>'; }).join('') +
        '</tbody></table></div><p class="hint">Teams are ordered by points, then wins, then net run rate (the ICC and IPL order). Check your own tournament rules: some also use the result between the tied teams (head to head) before net run rate.</p>' + share(r, tx));
    });
  };

  function init() {
    Array.prototype.forEach.call(d.querySelectorAll('[data-cc]'), function (e) { var f = T[e.getAttribute('data-cc')]; if (f) f(e); });
  }
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', init); else init();
})(this);
