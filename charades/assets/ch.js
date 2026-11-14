/* play.shareyourgroup.com/charades: a charades / guess-the-word game and an antakshari letter picker. Written for this site. Nothing is sent anywhere. */
(function () {
  'use strict';
  var d = document;
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function beep() { try { var C = window.AudioContext || window.webkitAudioContext, c = new C(), o = c.createOscillator(), g = c.createGain(); o.connect(g); g.connect(c.destination); o.frequency.value = 660; g.gain.setValueAtTime(0.25, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.4); o.start(); o.stop(c.currentTime + 0.4); } catch (e) { } }

  /* ---- the word game ---- */
  function game(box) {
    var cats = {}; try { cats = JSON.parse(box.getAttribute('data-cats')); } catch (e) { }
    var preset = ''; try { preset = new URLSearchParams(location.search).get('c') || ''; } catch (e) { }
    var keys = Object.keys(cats);
    var deck = [], ok = [], skip = [], timer = null, left = 0, cur = '', running = false;
    box.innerHTML = '<div class="finder"><div class="fields"><div><label for="gc">Category</label><select id="gc"></select></div><div><label for="gt">Time for one turn</label><select id="gt"><option value="30">30 seconds</option><option value="60" selected>60 seconds</option><option value="90">90 seconds</option><option value="120">2 minutes</option></select></div></div>' +
      '<p><button class="btn" type="button" id="gs">Start a turn</button></p><p class="hint">Pass the phone to the person who acts. Everyone else guesses. Tap Got it when they get it right, Pass to skip.</p></div><div id="ga" aria-live="polite"></div>';
    var sel = box.querySelector('#gc');
    keys.forEach(function (k) { var o = d.createElement('option'); o.value = k; o.textContent = cats[k].name + ' (' + cats[k].words.length + ')'; sel.appendChild(o); });
    if (preset && cats[preset]) sel.value = preset;
    var out = box.querySelector('#ga');
    function show() {
      out.innerHTML = '<div class="ch-card"><p class="ch-t" id="gtm">' + left + '</p><p class="ch-w" id="gw">' + esc(cur) + '</p><p class="ch-s">Got it: ' + ok.length + ' · Passed: ' + skip.length + '</p>' +
        '<p><button class="btn" type="button" id="gok">Got it</button> <button class="btn ghost" type="button" id="gpa">Pass</button></p></div>';
      out.querySelector('#gok').addEventListener('click', function () { ok.push(cur); next(); });
      out.querySelector('#gpa').addEventListener('click', function () { skip.push(cur); next(); });
    }
    function next() {
      if (!deck.length) { deck = shuffle(cats[sel.value].words.filter(function (w) { return ok.indexOf(w) < 0 && skip.indexOf(w) < 0; })); if (!deck.length) { end(); return; } }
      cur = deck.pop(); var w = out.querySelector('#gw'); if (w) w.textContent = cur; var s = out.querySelector('.ch-s'); if (s) s.textContent = 'Got it: ' + ok.length + ' · Passed: ' + skip.length;
    }
    function end() {
      running = false; clearInterval(timer); beep();
      var txt = 'Charades (' + cats[sel.value].name + '): ' + ok.length + ' right in ' + box.querySelector('#gt').value + ' seconds!';
      out.innerHTML = '<div class="ch-card"><p class="ch-t">Time!</p><p class="ch-w">' + ok.length + ' right</p><p>' + (ok.length ? '<b>Got it:</b> ' + ok.map(esc).join(', ') : 'No words guessed this time.') + '</p><p>' + (skip.length ? '<b>Passed:</b> ' + skip.map(esc).join(', ') : '') + '</p>' +
        '<p class="acts"><button class="btn" type="button" id="gag">Next turn</button><button class="btn sm ghost" type="button" data-wa="' + esc(txt) + '">WhatsApp</button><button class="btn sm ghost" type="button" data-copy="' + esc(txt) + '">Copy</button></p></div>';
      out.querySelector('#gag').addEventListener('click', start);
    }
    function start() {
      clearInterval(timer); ok = []; skip = []; deck = shuffle(cats[sel.value].words); left = +box.querySelector('#gt').value; cur = deck.pop(); running = true; show();
      timer = setInterval(function () { left--; var t = out.querySelector('#gtm'); if (t) t.textContent = left; if (left <= 0) end(); }, 1000);
    }
    box.querySelector('#gs').addEventListener('click', start);
  }

  /* ---- antakshari letter picker ---- */
  function anta(box) {
    var HI = 'अ आ इ ई उ ऊ ए ऐ ओ औ क ख ग घ च छ ज झ ट ठ ड ढ त थ द ध न प फ ब भ म य र ल व श स ह'.split(' '), EN = 'ABCDEFGHIJKLMNOPQRSTUVWY'.split('');
    var t = [0, 0], timer = null, left = 0;
    box.innerHTML = '<div class="finder"><div class="fields"><div><label for="al">Letters</label><select id="al"><option value="hi">Hindi letters (देवनागरी)</option><option value="en">English letters</option></select></div><div><label for="at">Seconds to start a song</label><select id="at"><option>10</option><option selected>15</option><option>20</option><option>30</option></select></div></div>' +
      '<p><button class="btn" type="button" id="ap">Pick a letter</button></p></div><div class="ch-card"><p class="ch-w ch-l" id="aw" lang="hi">–</p><p class="ch-t" id="ac">&nbsp;</p>' +
      '<div class="ch-teams"><div><b>Team A</b><p class="ch-s" id="s0">0</p><button class="btn sm" type="button" data-p="0">+1</button> <button class="btn sm ghost" type="button" data-m="0">−1</button></div><div><b>Team B</b><p class="ch-s" id="s1">0</p><button class="btn sm" type="button" data-p="1">+1</button> <button class="btn sm ghost" type="button" data-m="1">−1</button></div></div>' +
      '<p><button class="btn ghost sm" type="button" id="ar">Reset scores</button></p></div>';
    function sc() { box.querySelector('#s0').textContent = t[0]; box.querySelector('#s1').textContent = t[1]; }
    box.querySelector('#ap').addEventListener('click', function () {
      var set = box.querySelector('#al').value === 'hi' ? HI : EN, w = box.querySelector('#aw');
      w.textContent = set[Math.floor(Math.random() * set.length)]; w.lang = set === HI ? 'hi' : 'en';
      clearInterval(timer); left = +box.querySelector('#at').value; box.querySelector('#ac').textContent = left;
      timer = setInterval(function () { left--; box.querySelector('#ac').textContent = left > 0 ? left : 'Time!'; if (left <= 0) { clearInterval(timer); beep(); } }, 1000);
    });
    box.addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; if (b.hasAttribute('data-p')) { t[+b.getAttribute('data-p')]++; sc(); } else if (b.hasAttribute('data-m')) { t[+b.getAttribute('data-m')]--; sc(); } });
    box.querySelector('#ar').addEventListener('click', function () { t = [0, 0]; sc(); });
  }
  function init() { var g = d.querySelector('[data-ch=game]'), a = d.querySelector('[data-ch=anta]'); if (g) game(g); if (a) anta(a); }
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', init); else init();
})();
