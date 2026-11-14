/* play.shareyourgroup.com/arcade: five small original games. Written for this site. Scores stay in this browser (localStorage). */
(function (root) {
  'use strict';
  /* ---------- pure logic (also tested in node) ---------- */
  // Join tiles: 4x4 board, slide and join equal tiles.
  function slideRow(row) {
    var a = row.filter(function (x) { return x; }), out = [], score = 0, i;
    for (i = 0; i < a.length; i++) {
      if (a[i + 1] === a[i]) { out.push(a[i] * 2); score += a[i] * 2; i++; } else out.push(a[i]);
    }
    while (out.length < row.length) out.push(0);
    return { row: out, score: score };
  }
  function moveBoard(b, dir) { // dir: 0 left, 1 right, 2 up, 3 down. returns {board, score, moved}
    var n = b.length, nb = [], score = 0, moved = false, i, j;
    for (i = 0; i < n; i++) nb.push(b[i].slice());
    function get(i) { var r = []; for (var k = 0; k < n; k++) r.push(dir < 2 ? nb[i][k] : nb[k][i]); return r; }
    function put(i, r) { for (var k = 0; k < n; k++) { if (dir < 2) nb[i][k] = r[k]; else nb[k][i] = r[k]; } }
    for (i = 0; i < n; i++) {
      var r = get(i), rev = (dir === 1 || dir === 3);
      if (rev) r.reverse();
      var s = slideRow(r);
      if (rev) s.row.reverse();
      for (j = 0; j < n; j++) if (s.row[j] !== get(i)[j]) moved = true;
      put(i, s.row); score += s.score;
    }
    return { board: nb, score: score, moved: moved };
  }
  function canMove(b) { for (var d = 0; d < 4; d++) if (moveBoard(b, d).moved) return true; return false; }
  // Safe squares: mine field
  function makeField(w, h, mines, safeR, safeC, rnd) {
    rnd = rnd || Math.random;
    var cells = [], i, r, c;
    for (i = 0; i < w * h; i++) cells.push(i);
    cells = cells.filter(function (x) { var rr = Math.floor(x / w), cc = x % w; return Math.abs(rr - safeR) > 1 || Math.abs(cc - safeC) > 1; });
    for (i = cells.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)), t = cells[i]; cells[i] = cells[j]; cells[j] = t; }
    var m = {}; cells.slice(0, mines).forEach(function (x) { m[x] = 1; });
    var near = [];
    for (r = 0; r < h; r++) { near.push([]); for (c = 0; c < w; c++) { var n = 0; for (var dr = -1; dr <= 1; dr++) for (var dc = -1; dc <= 1; dc++) { var rr = r + dr, cc = c + dc; if (rr >= 0 && rr < h && cc >= 0 && cc < w && m[rr * w + cc]) n++; } near[r].push(n); } }
    return { w: w, h: h, mine: m, near: near };
  }
  function reveal(f, open, r, c) { // returns list of opened cells; flood fill on zero
    var stack = [[r, c]], got = [];
    while (stack.length) {
      var p = stack.pop(), k = p[0] * f.w + p[1];
      if (p[0] < 0 || p[0] >= f.h || p[1] < 0 || p[1] >= f.w || open[k]) continue;
      open[k] = 1; got.push(k);
      if (!f.mine[k] && f.near[p[0]][p[1]] === 0) for (var dr = -1; dr <= 1; dr++) for (var dc = -1; dc <= 1; dc++) stack.push([p[0] + dr, p[1] + dc]);
    }
    return got;
  }
  // Noughts and crosses: minimax
  var LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
  function winner(b) { for (var i = 0; i < 8; i++) { var l = LINES[i]; if (b[l[0]] && b[l[0]] === b[l[1]] && b[l[1]] === b[l[2]]) return b[l[0]]; } return b.indexOf('') < 0 ? 'D' : ''; }
  function minimax(b, turn, me) {
    var w = winner(b); if (w) return w === 'D' ? 0 : (w === me ? 1 : -1);
    var best = turn === me ? -2 : 2;
    for (var i = 0; i < 9; i++) if (!b[i]) { b[i] = turn; var v = minimax(b, turn === 'X' ? 'O' : 'X', me); b[i] = ''; if (turn === me ? v > best : v < best) best = v; }
    return best;
  }
  function bestMove(b, me) {
    var best = -2, mv = [], i;
    for (i = 0; i < 9; i++) if (!b[i]) { b[i] = me; var v = minimax(b, me === 'X' ? 'O' : 'X', me); b[i] = ''; if (v > best) { best = v; mv = [i]; } else if (v === best) mv.push(i); }
    return mv[Math.floor(Math.random() * mv.length)];
  }
  var API = { slideRow: slideRow, moveBoard: moveBoard, canMove: canMove, makeField: makeField, reveal: reveal, winner: winner, bestMove: bestMove };
  if (typeof module !== 'undefined' && module.exports) { module.exports = API; return; }

  /* ---------- page ---------- */
  var d = document, LS = window.localStorage;
  function el(tag, cls, html) { var e = d.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function load(k, def) { try { var v = JSON.parse(LS.getItem(k)); return v == null ? def : v; } catch (e) { return def; } }
  function save(k, v) { try { LS.setItem(k, JSON.stringify(v)); } catch (e) { } }
  function best(game, v, low) { var b = load('arc-' + game, null); if (b == null || (low ? v < b : v > b)) { save('arc-' + game, v); return true; } return false; }
  function swipe(node, fn) {
    var sx, sy;
    node.addEventListener('touchstart', function (e) { var t = e.changedTouches[0]; sx = t.clientX; sy = t.clientY; }, { passive: true });
    node.addEventListener('touchend', function (e) { var t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy; if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return; e.preventDefault(); fn(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'r' : 'l') : (dy > 0 ? 'd' : 'u')); }, { passive: false });
  }
  function shareBtn(text) { return '<button class="btn sm ghost" type="button" data-share="' + text.replace(/"/g, '&quot;') + '">Share my score</button>'; }

  /* ---- snake ---- */
  function snake(box) {
    var N = 18, cvs = el('canvas', 'ar-cv'); cvs.width = cvs.height = 360; cvs.setAttribute('aria-label', 'Snake game board');
    box.innerHTML = '<p class="ar-s">Score <b id="sc">0</b> · Best <b id="bs">' + (load('arc-snake', 0)) + '</b></p>'; box.appendChild(cvs);
    box.appendChild(el('div', 'ar-pad', '<span></span><button type="button" data-d="u" aria-label="Up">▲</button><span></span><button type="button" data-d="l" aria-label="Left">◀</button><button type="button" data-d="p" aria-label="Pause or start">⏯</button><button type="button" data-d="r" aria-label="Right">▶</button><span></span><button type="button" data-d="d" aria-label="Down">▼</button><span></span>'));
    var g = cvs.getContext('2d'), sn, dir, nd, food, score, timer, over, running;
    var V = { u: [0, -1], d: [0, 1], l: [-1, 0], r: [1, 0] };
    function reset() { sn = [[9, 9], [8, 9], [7, 9]]; dir = nd = 'r'; score = 0; over = false; running = false; place(); box.querySelector('#sc').textContent = 0; draw('Press an arrow key or a button to start'); clearInterval(timer); }
    function place() { do { food = [Math.floor(Math.random() * N), Math.floor(Math.random() * N)]; } while (sn.some(function (s) { return s[0] === food[0] && s[1] === food[1]; })); }
    function draw(msg) {
      var s = 360 / N, st = getComputedStyle(d.documentElement);
      g.fillStyle = '#10161f'; g.fillRect(0, 0, 360, 360);
      g.fillStyle = '#e5484d'; g.beginPath(); g.arc((food[0] + .5) * s, (food[1] + .5) * s, s * .38, 0, 7); g.fill();
      sn.forEach(function (p, i) { g.fillStyle = i ? '#3ddc84' : '#b9f6ca'; g.fillRect(p[0] * s + 1, p[1] * s + 1, s - 2, s - 2); });
      if (msg) { g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(0, 150, 360, 60); g.fillStyle = '#fff'; g.font = '16px sans-serif'; g.textAlign = 'center'; g.fillText(msg, 180, 186); }
    }
    function tick() {
      dir = nd; var h = [sn[0][0] + V[dir][0], sn[0][1] + V[dir][1]];
      if (h[0] < 0 || h[1] < 0 || h[0] >= N || h[1] >= N || sn.some(function (s) { return s[0] === h[0] && s[1] === h[1]; })) { over = true; running = false; clearInterval(timer); var nb = best('snake', score); box.querySelector('#bs').textContent = load('arc-snake', 0); draw('Game over: ' + score + (nb ? ' (new best!)' : '') + '. Press a key to play again.'); return; }
      sn.unshift(h);
      if (h[0] === food[0] && h[1] === food[1]) { score++; box.querySelector('#sc').textContent = score; place(); clearInterval(timer); timer = setInterval(tick, Math.max(60, 140 - score * 4)); } else sn.pop();
      draw();
    }
    function go(k) {
      if (k === 'p') { if (!running && !over) { running = true; timer = setInterval(tick, 140); } else if (running) { running = false; clearInterval(timer); draw('Paused'); } return; }
      if (over) { reset(); }
      var o = { u: 'd', d: 'u', l: 'r', r: 'l' };
      if (o[k] !== dir || sn.length < 2) nd = k;
      if (!running) { running = true; timer = setInterval(tick, 140); }
    }
    d.addEventListener('keydown', function (e) { var m = { ArrowUp: 'u', ArrowDown: 'd', ArrowLeft: 'l', ArrowRight: 'r', w: 'u', s: 'd', a: 'l', d: 'r', ' ': 'p' }[e.key]; if (m && d.activeElement && /input|select|textarea/i.test(d.activeElement.tagName) === false) { e.preventDefault(); go(m); } });
    box.addEventListener('click', function (e) { var b = e.target.closest('[data-d]'); if (b) go(b.getAttribute('data-d')); });
    swipe(cvs, go); reset();
  }

  /* ---- memory ---- */
  function memory(box) {
    var SETS = ['🐶', '🐱', '🐭', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐸', '🐵', '🐔', '🐧', '🐢', '🐙', '🦋', '🐞'];
    box.innerHTML = '<div class="finder"><label for="msz">Board</label><select id="msz"><option value="4">Small: 4 by 4 (8 pairs)</option><option value="6">Large: 6 by 6 (18 pairs)</option></select> <button class="btn" type="button" id="mn">New game</button></div><p class="ar-s">Moves <b id="mm">0</b> · Pairs <b id="mp">0</b> · Best <b id="mb">–</b></p><div class="mem" id="mg"></div>';
    var grid = box.querySelector('#mg'), first = null, lock = false, moves = 0, pairs = 0, total = 0, size = 4;
    function nb() { var v = load('arc-mem' + size, null); box.querySelector('#mb').textContent = v == null ? '–' : v; }
    function newGame() {
      size = +box.querySelector('#msz').value; var n = size * size / 2, set = SETS.slice(0, n), deck = set.concat(set), i;
      for (i = deck.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = deck[i]; deck[i] = deck[j]; deck[j] = t; }
      grid.style.gridTemplateColumns = 'repeat(' + size + ',1fr)'; grid.innerHTML = ''; first = null; lock = false; moves = pairs = 0; total = n;
      box.querySelector('#mm').textContent = 0; box.querySelector('#mp').textContent = 0; nb();
      deck.forEach(function (c) { var b = el('button', 'mc', '<span class="bk">?</span><span class="fr">' + c + '</span>'); b.type = 'button'; b.setAttribute('data-c', c); b.setAttribute('aria-label', 'Hidden card'); grid.appendChild(b); });
    }
    grid.addEventListener('click', function (e) {
      var b = e.target.closest('.mc'); if (!b || lock || b.classList.contains('up') || b.classList.contains('ok')) return;
      b.classList.add('up'); b.setAttribute('aria-label', 'Card ' + b.getAttribute('data-c'));
      if (!first) { first = b; return; }
      moves++; box.querySelector('#mm').textContent = moves;
      if (first.getAttribute('data-c') === b.getAttribute('data-c')) {
        first.classList.add('ok'); b.classList.add('ok'); pairs++; box.querySelector('#mp').textContent = pairs; first = null;
        if (pairs === total) { var nbst = best('mem' + size, moves, true); nb(); grid.insertAdjacentHTML('afterend', '<p class="ar-win">All pairs found in ' + moves + ' moves' + (nbst ? ' (a new best!)' : '') + '. ' + shareBtn('I matched every pair in ' + moves + ' moves in this memory game. Can you beat it?') + '</p>'); }
      } else { lock = true; var f = first; first = null; setTimeout(function () { f.classList.remove('up'); b.classList.remove('up'); f.setAttribute('aria-label', 'Hidden card'); b.setAttribute('aria-label', 'Hidden card'); lock = false; }, 800); }
    });
    box.querySelector('#mn').addEventListener('click', function () { var w = box.querySelector('.ar-win'); if (w) w.remove(); newGame(); });
    box.querySelector('#msz').addEventListener('change', function () { var w = box.querySelector('.ar-win'); if (w) w.remove(); newGame(); });
    newGame();
  }

  /* ---- join tiles ---- */
  function tiles(box) {
    var b, score, over, N = 4;
    box.innerHTML = '<p class="ar-s">Score <b id="ts">0</b> · Best <b id="tb">' + load('arc-tiles', 0) + '</b> · <button class="btn sm ghost" type="button" id="tn">New game</button></p><div class="tl" id="tg" tabindex="0" aria-label="Tile board. Use the arrow keys or swipe."></div><p class="hint">Arrow keys or swipe. Equal tiles join into one.</p>';
    var grid = box.querySelector('#tg');
    function add() { var e = []; for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) if (!b[r][c]) e.push([r, c]); if (!e.length) return; var p = e[Math.floor(Math.random() * e.length)]; b[p[0]][p[1]] = Math.random() < 0.9 ? 2 : 4; }
    function draw() {
      grid.innerHTML = ''; var mx = 0;
      for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) { var v = b[r][c]; mx = Math.max(mx, v); grid.appendChild(el('div', 'tt t' + (v > 2048 ? 'x' : v), v ? v : '')); }
      box.querySelector('#ts').textContent = score; box.querySelector('#tb').textContent = load('arc-tiles', 0);
      if (!canMove(b)) { over = true; var nb = best('tiles', score); grid.insertAdjacentHTML('beforeend', '<div class="tov"><p>No moves left. Score ' + score + (nb ? ' (new best!)' : '') + '.</p>' + shareBtn('I scored ' + score + ' in this tile-joining game. Can you beat it?') + '</div>'); }
    }
    function start() { b = []; for (var i = 0; i < N; i++) b.push([0, 0, 0, 0]); score = 0; over = false; add(); add(); draw(); }
    function move(dir) { if (over) return; var m = moveBoard(b, dir); if (!m.moved) return; b = m.board; score += m.score; add(); draw(); best('tiles', score); box.querySelector('#tb').textContent = load('arc-tiles', 0); }
    d.addEventListener('keydown', function (e) { var k = { ArrowLeft: 0, ArrowRight: 1, ArrowUp: 2, ArrowDown: 3, a: 0, d: 1, w: 2, s: 3 }[e.key]; if (k != null && d.activeElement && /input|select|textarea/i.test(d.activeElement.tagName) === false) { e.preventDefault(); move(k); } });
    swipe(grid, function (s) { move({ l: 0, r: 1, u: 2, d: 3 }[s]); });
    box.querySelector('#tn').addEventListener('click', start); start();
  }

  /* ---- safe squares ---- */
  function squares(box) {
    var LV = { easy: [9, 9, 10], mid: [12, 12, 24], hard: [16, 14, 40] };
    box.innerHTML = '<div class="finder"><label for="ql">Level</label><select id="ql"><option value="easy">Easy: 9 by 9, 10 hidden pits</option><option value="mid">Medium: 12 by 12, 24 pits</option><option value="hard">Hard: 16 by 14, 40 pits</option></select> <button class="btn" type="button" id="qn">New game</button> <label class="tb-ck"><input type="checkbox" id="qf"> Flag mode (tap marks a pit)</label></div><p class="ar-s" id="qs"></p><div class="sq" id="qg"></div>';
    var grid = box.querySelector('#qg'), f, open, flag, over, w, h, nm, t0, timer;
    function newGame() { var l = LV[box.querySelector('#ql').value]; w = l[0]; h = l[1]; nm = l[2]; f = null; open = {}; flag = {}; over = false; clearInterval(timer); t0 = 0; draw(); status(); }
    function status() { var fl = Object.keys(flag).length; box.querySelector('#qs').textContent = 'Pits left to mark: ' + (nm - fl) + (t0 ? ' · Time: ' + Math.floor((Date.now() - t0) / 1000) + ' s' : ''); }
    function draw() {
      grid.style.gridTemplateColumns = 'repeat(' + w + ',1fr)'; grid.innerHTML = '';
      for (var r = 0; r < h; r++) for (var c = 0; c < w; c++) {
        var k = r * w + c, b = el('button', 'sc'), txt = '';
        b.type = 'button'; b.setAttribute('data-r', r); b.setAttribute('data-c', c);
        if (open[k]) { b.classList.add('o'); if (f && f.mine[k]) { b.classList.add('pit'); txt = '🕳️'; } else if (f.near[r][c]) { txt = f.near[r][c]; b.classList.add('n' + f.near[r][c]); } }
        else if (flag[k]) txt = '🚩';
        else if (over && f && f.mine[k]) { b.classList.add('o'); txt = '🕳️'; }
        b.textContent = txt; grid.appendChild(b);
      }
    }
    function end(win) {
      over = true; clearInterval(timer); var secs = Math.floor((Date.now() - t0) / 1000), lvl = box.querySelector('#ql').value;
      draw();
      var nb = win ? best('sq' + lvl, secs, true) : false;
      grid.insertAdjacentHTML('afterend', '<p class="ar-win">' + (win ? 'Cleared in ' + secs + ' seconds' + (nb ? ' (best time so far!)' : '') + '. ' + shareBtn('I cleared the ' + lvl + ' safe squares board in ' + secs + ' seconds.') : 'Oops! You fell into a pit. Press New game to try again.') + '</p>');
    }
    grid.addEventListener('click', function (e) {
      var b = e.target.closest('.sc'); if (!b || over) return; var r = +b.getAttribute('data-r'), c = +b.getAttribute('data-c'), k = r * w + c;
      var tip = box.querySelector('.ar-win'); if (tip) tip.remove();
      if (box.querySelector('#qf').checked) { if (!open[k]) { if (flag[k]) delete flag[k]; else flag[k] = 1; } draw(); status(); return; }
      if (flag[k] || open[k]) return;
      if (!f) { f = makeField(w, h, nm, r, c); t0 = Date.now(); timer = setInterval(status, 1000); }
      if (f.mine[k]) { open[k] = 1; end(false); return; }
      reveal(f, open, r, c); draw(); status();
      var openedSafe = Object.keys(open).length; if (openedSafe === w * h - nm) end(true);
    });
    grid.addEventListener('contextmenu', function (e) { var b = e.target.closest('.sc'); if (!b || over) return; e.preventDefault(); var k = +b.getAttribute('data-r') * w + +b.getAttribute('data-c'); if (!open[k]) { if (flag[k]) delete flag[k]; else flag[k] = 1; } draw(); status(); });
    box.querySelector('#qn').addEventListener('click', function () { var t = box.querySelector('.ar-win'); if (t) t.remove(); newGame(); });
    box.querySelector('#ql').addEventListener('change', function () { var t = box.querySelector('.ar-win'); if (t) t.remove(); newGame(); });
    newGame();
  }

  /* ---- noughts and crosses ---- */
  function ttt(box) {
    box.innerHTML = '<div class="finder"><div class="fields"><div><label for="gl">Computer level</label><select id="gl"><option value="easy">Easy: plays at random</option><option value="hard" selected>Hard: never loses</option></select></div><div><label for="gx">You play</label><select id="gx"><option value="X">X (go first)</option><option value="O">O (go second)</option></select></div></div><p><button class="btn" type="button" id="gn">New game</button></p></div><p class="ar-s" id="gst"></p><div class="ttt" id="gg"></div><p class="hint" id="gscore"></p>';
    var grid = box.querySelector('#gg'), b, me, cpu, over, tally = load('arc-ttt', { w: 0, l: 0, d: 0 });
    function sc() { box.querySelector('#gscore').textContent = 'Your record here: ' + tally.w + ' won, ' + tally.d + ' drawn, ' + tally.l + ' lost.'; }
    function draw() { grid.innerHTML = ''; for (var i = 0; i < 9; i++) { var c = el('button', 'tc', b[i]); c.type = 'button'; c.setAttribute('data-i', i); c.setAttribute('aria-label', 'Square ' + (i + 1) + (b[i] ? ', ' + b[i] : ', empty')); grid.appendChild(c); } }
    function check() { var w = winner(b); if (!w) return false; over = true; var m = w === 'D' ? 'A draw.' : (w === me ? 'You win!' : 'The computer wins.'); box.querySelector('#gst').textContent = m; if (w === 'D') tally.d++; else if (w === me) tally.w++; else tally.l++; save('arc-ttt', tally); sc(); return true; }
    function cpuMove() { if (over) return; var e = []; for (var i = 0; i < 9; i++) if (!b[i]) e.push(i); var mv = box.querySelector('#gl').value === 'hard' ? bestMove(b, cpu) : e[Math.floor(Math.random() * e.length)]; b[mv] = cpu; draw(); if (!check()) box.querySelector('#gst').textContent = 'Your turn.'; }
    function start() { b = ['', '', '', '', '', '', '', '', '']; over = false; me = box.querySelector('#gx').value; cpu = me === 'X' ? 'O' : 'X'; draw(); box.querySelector('#gst').textContent = 'Your turn.'; if (cpu === 'X') cpuMove(); sc(); }
    grid.addEventListener('click', function (e) { var c = e.target.closest('.tc'); if (!c || over) return; var i = +c.getAttribute('data-i'); if (b[i]) return; b[i] = me; draw(); if (!check()) setTimeout(cpuMove, 250); });
    box.querySelector('#gn').addEventListener('click', start); box.querySelector('#gx').addEventListener('change', start); start();
  }
  function init() {
    var m = { snake: snake, memory: memory, tiles: tiles, squares: squares, ttt: ttt };
    Array.prototype.forEach.call(d.querySelectorAll('[data-game]'), function (n) { var f = m[n.getAttribute('data-game')]; if (f) f(n); });
  }
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', init); else init();
})(this);
