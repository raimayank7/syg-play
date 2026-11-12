/* Tijori: the daily word-safe puzzle of play.shareyourgroup.com/wordgame. Our own game, written for this site.
   A secret word sits behind a row of dials. After each guess, every letter that is right AND in the right place locks into its dial;
   the other right letters are only counted ("2 more belong, elsewhere"). Everything is kept in this browser. Needs window.TJ (data). */
(function () {
  'use strict';
  var d = document, SYG = window.SYG || {}, TJ = window.TJ, LS = window.localStorage, DAY = 86400000;
  function $(s, r) { return (r || d).querySelector(s); }
  function load(k, def) { try { var v = JSON.parse(LS.getItem(k)); return v == null ? def : v; } catch (e) { return def; } }
  function save(k, v) { try { LS.setItem(k, JSON.stringify(v)); } catch (e) { } }
  function iso(t) { return t.getFullYear() + '-' + ('0' + (t.getMonth() + 1)).slice(-2) + '-' + ('0' + t.getDate()).slice(-2); }
  function fromIso(s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function dayNo(s, epoch) { return Math.round((fromIso(s) - fromIso(epoch)) / DAY); }
  function nice(s) { return fromIso(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); }
  function un(b) { return decodeURIComponent(escape(atob(b))).split(' '); }

  var TXT = {
    en: { ph: 'Type a five-letter word', short: 'Type all five letters first.', unknown: 'That word is not in our list. Try another.', again: 'You already tried that word.',
      none: 'None of these letters is in the word.', won: function (n, h) { return 'The safe is open! You found the word in ' + n + (n === 1 ? ' try' : ' tries') + (h ? ', with a hint' : '') + '.'; },
      lost: function (w) { return 'The safe stays shut today. The word was ' + w.toUpperCase() + '.'; }, more: function (n) { return n === 1 ? '+1 elsewhere' : '+' + n + ' elsewhere'; },
      locked: function (n) { return n + ' locked'; }, left: function (n) { return n + (n === 1 ? ' try left' : ' tries left'); }, hinted: 'One dial opened for you. This game will be marked "with a hint".', nohint: 'The hint is already used.',
      next: 'Next puzzle in ', mark: 'Tap letters to mark them: grey = not in the word, ringed = in the word.', loading: 'Loading the word list...' },
    hi: { ph: 'तीन अक्षर का शब्द लिखिए', short: 'पहले तीनों अक्षर लिखिए।', unknown: '', again: 'यह शब्द आप पहले आज़मा चुके हैं।',
      none: 'इनमें से कोई अक्षर शब्द में नहीं है।', won: function (n, h) { return 'तिजोरी खुल गई! आपने ' + n + ' बार में शब्द ढूँढ लिया' + (h ? ' (एक संकेत के साथ)' : '') + '।'; },
      lost: function (w) { return 'आज तिजोरी नहीं खुली। शब्द था: ' + w; }, more: function (n) { return '+' + n + ' और कहीं'; },
      locked: function (n) { return n + ' सही जगह'; }, left: function (n) { return n + ' मौके बाकी'; }, hinted: 'एक खाना आपके लिए खोल दिया गया है।', nohint: 'संकेत पहले ही लिया जा चुका है।',
      next: 'अगली पहेली ', mark: 'अक्षर दबाकर निशान लगाइए: धुंधला = शब्द में नहीं, घेरा = शब्द में है।', loading: '' }
  };
  /* Hindi: split a word into akshar units (a consonant or vowel with its matra and dots) */
  var MATRA = /[ा-ौँ-ः]/;
  function units(w, lang) {
    if (lang !== 'hi') return w.split('');
    var out = []; for (var i = 0; i < w.length; i++) { var ch = w[i]; if ((MATRA.test(ch) || ch === '़') && out.length) out[out.length - 1] += ch; else out.push(ch); } return out;
  }
  function base(u) { return u.replace(/[ा-ौँ-ः]/g, ''); }
  function judge(ans, g) {
    var n = ans.length, exact = [], cnt = {}, loose = 0, i;
    for (i = 0; i < n; i++) { exact[i] = g[i] === ans[i]; if (!exact[i]) cnt[base(ans[i])] = (cnt[base(ans[i])] || 0) + 1; }
    for (i = 0; i < n; i++) if (!exact[i] && cnt[base(g[i])] > 0) { loose++; cnt[base(g[i])]--; }
    return { exact: exact, loose: loose };
  }

  function Game(root) {
    var self = this, lang = this.lang = root.getAttribute('data-lang') || 'en', cfg = this.cfg = TJ[lang], t = this.t = TXT[lang];
    this.root = root; this.mode = root.getAttribute('data-mode') || 'daily'; this.n = cfg.n; this.max = cfg.tries; this.answers = un(cfg.answers);
    this.dials = $('.tj-dials', root); this.entry = $('.tj-entry', root); this.hist = $('.tj-hist', root); this.msg = $('.tj-msg', root); this.kb = $('.tj-kb', root); this.info = $('.tj-info', root);
    this.cur = []; this.marking = false; this.allowed = null;
    if (lang === 'en') fetch('/wordgame/data/five.txt').then(function (r) { return r.text(); }).then(function (x) { self.allowed = {}; x.split('\n').forEach(function (w) { self.allowed[w] = 1; }); }).catch(function () { });
    this.buildKb();
    root.addEventListener('click', function (e) {
      var b = e.target.closest('[data-act]'); if (!b) return; var a = b.getAttribute('data-act');
      if (a === 'hint') self.hint(); else if (a === 'mark') self.setMark(!self.marking); else if (a === 'new') self.start(true); else if (a === 'share') self.share();
    });
    var date = $('.tj-date', root);
    if (date) { date.min = cfg.epoch; date.max = iso(new Date()); date.value = iso(new Date(Date.now() - DAY)); if (date.value < cfg.epoch) date.value = cfg.epoch; date.addEventListener('change', function () { if (date.value >= date.min && date.value <= date.max) self.start(); }); this.dateEl = date; }
    d.addEventListener('keydown', function (e) {
      if (e.ctrlKey || e.metaKey || e.altKey || (e.target.closest && e.target.closest('input,textarea,select'))) return;
      if (e.key === 'Enter') { self.submit(); e.preventDefault(); } else if (e.key === 'Backspace') { self.back(); e.preventDefault(); }
      else if (lang === 'en' && /^[a-zA-Z]$/.test(e.key)) self.type(e.key.toLowerCase());
    });
    setInterval(function () { self.tick(); }, 1000);
    this.start();
  }
  var G = Game.prototype;
  G.buildKb = function () {
    var self = this, h = '';
    this.cfg.keys.forEach(function (row, ri) {
      h += '<div class="tj-row r' + ri + '">';
      if (self.lang === 'en' && ri === 2) h += '<button type="button" class="wide" data-k="enter">Enter</button>';
      row.split(' ').forEach(function (k) { h += '<button type="button" data-k="' + k + '"' + (MATRA.test(k) ? ' class="mt"' : '') + '>' + (MATRA.test(k) ? '◌' + k : k) + '</button>'; });
      if (self.lang === 'en' && ri === 2) h += '<button type="button" class="wide" data-k="back" aria-label="Delete">⌫</button>';
      h += '</div>';
    });
    if (this.lang === 'hi') h += '<div class="tj-row"><button type="button" class="wide" data-k="back">⌫ मिटाएँ</button><button type="button" class="wide go" data-k="enter">जाँचें</button></div>';
    this.kb.innerHTML = h;
    this.kb.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return; var k = b.getAttribute('data-k');
      if (k === 'enter') self.submit(); else if (k === 'back') self.back(); else if (self.marking && !MATRA.test(k)) self.cycle(k); else self.type(k);
    });
  };
  G.key = function () { return 'tj-' + this.lang + '-' + (this.mode === 'practice' ? 'practice' : this.day); };
  G.start = function (fresh) {
    var today = iso(new Date()), st;
    this.day = this.mode === 'archive' && this.dateEl ? this.dateEl.value : today;
    st = fresh ? null : load(this.key(), null);
    if (!st) {
      var idx = this.mode === 'practice' ? Math.floor(Math.random() * this.answers.length) : ((dayNo(this.day, this.cfg.epoch) % this.answers.length) + this.answers.length) % this.answers.length;
      st = { a: idx, g: [], marks: {}, hint: -1, done: 0 };
    }
    this.st = st; this.ans = units(this.answers[st.a], this.lang); this.cur = []; this.setMark(false);
    if (this.info) this.info.textContent = this.mode === 'practice' ? (this.lang === 'hi' ? 'अभ्यास पहेली' : 'Practice puzzle') : (this.lang === 'hi' ? 'तिजोरी ' : 'Tijori No. ') + (dayNo(this.day, this.cfg.epoch) + 1) + ' · ' + nice(this.day);
    this.say(st.done ? this.endText() : ''); this.paint(); this.store();
  };
  G.store = function () { save(this.key(), this.st); };
  G.say = function (x, html) { if (html) this.msg.innerHTML = x; else this.msg.textContent = x; };
  G.known = function () { var k = [], st = this.st, self = this; st.g.forEach(function (w) { var j = judge(self.ans, units(w, self.lang)); j.exact.forEach(function (e, i) { if (e) k[i] = self.ans[i]; }); }); if (st.hint >= 0) k[st.hint] = this.ans[st.hint]; return k; };
  G.type = function (k) {
    if (this.st.done) return;
    if (MATRA.test(k)) {
      var last = this.cur[this.cur.length - 1], isDot = /[ँ-ः]/.test(k); if (!last) return;
      if (!isDot && /[अ-औ]/.test(last[0])) return;
      if (isDot ? /[ँ-ः]/.test(last) : /[ा-ौ]/.test(last)) return;
      this.cur[this.cur.length - 1] = isDot ? last + k : last.replace(/([ँ-ः]*)$/, k + '$1');
    } else { if (this.cur.length >= this.n) return; this.cur.push(k); }
    this.say(''); this.paint();
  };
  G.back = function () {
    if (this.st.done || !this.cur.length) return;
    var last = this.cur[this.cur.length - 1];
    if (last.length > 1 && this.lang === 'hi' && MATRA.test(last[last.length - 1])) this.cur[this.cur.length - 1] = last.slice(0, -1); else this.cur.pop();
    this.paint();
  };
  G.submit = function () {
    var st = this.st, t = this.t, self = this; if (st.done) return;
    if (this.cur.length < this.n) { this.say(t.short); return; }
    var w = this.cur.join('');
    if (this.lang === 'en') {
      if (!this.allowed) { this.say(t.loading); return; }
      if (!this.allowed[w]) { this.say(t.unknown); this.entry.classList.add('shake'); setTimeout(function () { self.entry.classList.remove('shake'); }, 400); return; }
    }
    if (st.g.indexOf(w) >= 0) { this.say(t.again); return; }
    st.g.push(w);
    var j = judge(this.ans, this.cur), ex = j.exact.filter(Boolean).length;
    if (!ex && !j.loose) this.cur.forEach(function (u) { st.marks[base(u)] = 'out'; });
    this.cur = [];
    if (ex === this.n) { st.done = 1; this.finish(true); }
    else if (st.g.length >= this.max) { st.done = 2; this.finish(false); }
    else { var dot = this.lang === 'hi' ? '। ' : '. '; this.say((ex ? t.locked(ex) + dot : '') + (j.loose ? t.more(j.loose) + dot : '') + (!ex && !j.loose ? t.none + ' ' : '') + t.left(this.max - st.g.length) + dot.trim()); }
    this.paint(); this.store();
  };
  G.endText = function () { var st = this.st; return st.done === 1 ? this.t.won(st.g.length, st.hint >= 0) : this.t.lost(this.answers[st.a]); };
  G.finish = function (won) {
    var st = this.st;
    if (this.mode === 'daily') {
      var s = load('tj-stats-' + this.lang, { played: 0, won: 0, streak: 0, best: 0, dist: {}, last: '' });
      if (s.last !== this.day) {
        var y = iso(new Date(fromIso(this.day) - DAY + 3600000 * 2));
        s.played++; if (won) { s.won++; s.streak = s.lastWon === y || !s.lastWon ? s.streak + 1 : 1; s.lastWon = this.day; s.best = Math.max(s.best, s.streak); s.dist[st.g.length] = (s.dist[st.g.length] || 0) + 1; } else s.streak = 0;
        s.last = this.day; save('tj-stats-' + this.lang, s);
      }
    }
    this.say(this.endText()); stats();
  };
  G.hint = function () {
    var st = this.st; if (st.done) return;
    if (st.hint >= 0) { this.say(this.t.nohint); return; }
    var k = this.known(), open = []; for (var i = 0; i < this.n; i++) if (!k[i]) open.push(i);
    if (open.length < 2) { this.say(this.lang === 'hi' ? 'बस एक ही खाना बचा है, खुद कोशिश कीजिए।' : 'Only one dial is left. You can do this one.'); return; }
    st.hint = open[0]; this.say(this.t.hinted); this.paint(); this.store();
  };
  G.setMark = function (on) { this.marking = on; var b = $('[data-act=mark]', this.root); if (b) b.setAttribute('aria-pressed', on ? 'true' : 'false'); this.kb.classList.toggle('marking', on); if (on) this.say(this.t.mark); };
  G.cycle = function (k) { var m = this.st.marks, c = m[k]; if (c === 'out') m[k] = 'in'; else if (c === 'in') delete m[k]; else m[k] = 'out'; this.paint(); this.store(); };
  G.share = function () {
    var st = this.st, no = dayNo(this.day, this.cfg.epoch) + 1, t;
    if (this.lang === 'hi') t = 'तिजोरी ' + no + ' (' + nice(this.day) + '): ' + (st.done === 1 ? st.g.length + ' बार में खुल गई' + (st.hint >= 0 ? ', एक संकेत के साथ' : '') : 'आज नहीं खुली') + '। आप भी खोलकर देखिए:';
    else t = 'Tijori No. ' + no + ' (' + nice(this.day) + '): ' + (st.done === 1 ? 'I opened the safe in ' + st.g.length + ' of ' + this.max + ' tries' + (st.hint >= 0 ? ', with a hint' : '') : 'the safe beat me today') + '. Can you open it?';
    if (SYG.share) SYG.share(d.title, t, location.origin + location.pathname);
  };
  G.tick = function () {
    var el = $('.tj-next', this.root); if (!el) return;
    if (this.mode !== 'daily' || !this.st.done) { el.hidden = true; return; }
    if (iso(new Date()) !== this.day) { el.hidden = false; el.innerHTML = '<button class="btn sm" type="button" data-act="new">' + (this.lang === 'hi' ? 'आज की नई पहेली' : 'Play today\'s puzzle') + '</button>'; return; }
    var now = new Date(), mid = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1), s = Math.floor((mid - now) / 1000);
    el.hidden = false; el.textContent = this.t.next + Math.floor(s / 3600) + ':' + ('0' + Math.floor(s / 60) % 60).slice(-2) + ':' + ('0' + s % 60).slice(-2);
  };
  G.paint = function () {
    var st = this.st, self = this, k = this.known(), h = '', i;
    for (i = 0; i < this.n; i++) h += '<span class="tj-dial' + (k[i] ? ' on' : '') + (st.done === 2 && !k[i] ? ' rv' : '') + '">' + (k[i] || (st.done === 2 ? this.ans[i] : '?')) + '</span>';
    this.dials.innerHTML = h;
    h = ''; for (i = 0; i < this.n; i++) h += '<span class="' + (this.cur[i] ? 'f' : '') + (i === this.cur.length && !st.done ? ' at' : '') + '">' + (this.cur[i] || (k[i] ? '<i>' + k[i] + '</i>' : '')) + '</span>';
    this.entry.innerHTML = h; this.entry.hidden = !!st.done;
    h = '';
    st.g.forEach(function (w, n) {
      var u = units(w, self.lang), j = judge(self.ans, u), ex = j.exact.filter(Boolean).length;
      h += '<li><b>' + (n + 1) + '</b><span class="w">' + u.map(function (x, q) { return '<span' + (j.exact[q] ? ' class="lk"' : '') + '>' + x + '</span>'; }).join('') + '</span>' +
        '<span class="fb">' + (ex === self.n ? '<em class="ok">' + (self.lang === 'hi' ? 'खुल गई' : 'open') + '</em>' : (ex ? '<em class="lk">' + self.t.locked(ex) + '</em>' : '') + (j.loose ? '<em class="ls">' + self.t.more(j.loose) + '</em>' : '') + (!ex && !j.loose ? '<em class="no">0</em>' : '')) + '</span></li>';
    });
    this.hist.innerHTML = h;
    var set = {}; k.forEach(function (x) { if (x) set[base(x)] = 1; });
    [].forEach.call(this.kb.querySelectorAll('button[data-k]'), function (b) { var q = b.getAttribute('data-k'); b.classList.toggle('out', st.marks[q] === 'out'); b.classList.toggle('in', st.marks[q] === 'in' || !!set[q]); });
    var left = $('.tj-left', this.root); if (left) left.textContent = st.done ? '' : this.t.left(this.max - st.g.length);
    var end = $('.tj-end', this.root); if (end) end.hidden = !st.done;
    var again = $('.tj-again', this.root); if (again) again.hidden = !(st.done && this.mode === 'practice');
  };

  function stats() {
    [].forEach.call(d.querySelectorAll('[data-tj-stats]'), function (box) {
      var lang = box.getAttribute('data-tj-stats'), s = load('tj-stats-' + lang, null), hi = lang === 'hi', max = TJ[lang].tries;
      if (!s || !s.played) { box.innerHTML = '<p class="hint">' + (hi ? 'आपके खेल के आँकड़े यहाँ दिखेंगे। ये सिर्फ़ इसी ब्राउज़र में रहते हैं।' : 'Your results will appear here after your first daily puzzle. They are kept only in this browser.') + '</p>'; return; }
      var top = 1, rows = '', i; for (i = 1; i <= max; i++) top = Math.max(top, s.dist[i] || 0);
      for (i = 1; i <= max; i++) rows += '<div class="tj-bar"><span>' + i + '</span><i style="width:' + Math.max(4, Math.round((s.dist[i] || 0) * 100 / top)) + '%">' + (s.dist[i] || 0) + '</i></div>';
      box.innerHTML = '<dl class="tj-nums"><div><dt>' + (hi ? 'खेले' : 'Played') + '</dt><dd>' + s.played + '</dd></div><div><dt>' + (hi ? 'खोलीं' : 'Opened') + '</dt><dd>' + s.won + '</dd></div><div><dt>' + (hi ? 'लगातार' : 'Streak') + '</dt><dd>' + s.streak + '</dd></div><div><dt>' + (hi ? 'सबसे लंबा' : 'Best streak') + '</dt><dd>' + s.best + '</dd></div></dl>' +
        '<p class="hint">' + (hi ? 'कितनी बार में खुली:' : 'Tries needed:') + '</p>' + rows;
    });
  }
  function init() { [].forEach.call(d.querySelectorAll('[data-tj]'), function (r) { new Game(r); }); stats(); }
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', init); else init();
})();
