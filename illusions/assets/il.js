/* Illusions: toggle buttons show or hide parts of the drawing; afterimage timer. */
(function () {
  'use strict';
  function init() {
    document.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-tog]'); if (!b) return;
      var fig = b.closest('.il-fig'), ids = b.getAttribute('data-tog').split(' '), on = b.getAttribute('aria-pressed') === 'true';
      ids.forEach(function (id) { var el = fig.querySelector('#' + id); if (el) el.style.display = on ? 'none' : ''; });
      b.setAttribute('aria-pressed', on ? 'false' : 'true');
      var lab = on ? b.getAttribute('data-off') : b.getAttribute('data-on'); if (lab) b.textContent = lab;
    });
    var af = document.querySelector('[data-after]');
    if (af) {
      var btn = af.querySelector('#af-go'), pic = af.querySelector('#af-pic'), msg = af.querySelector('#af-msg'), t = null, state = 'idle';
      btn.addEventListener('click', function () {
        if (state === 'white') { state = 'idle'; pic.setAttribute('data-state', 'idle'); msg.textContent = ''; btn.textContent = 'Start the 20 second stare'; return; }
        if (state !== 'idle') return;
        var n = 20; state = 'stare'; pic.setAttribute('data-state', 'stare'); msg.textContent = 'Stare at the black dot without moving your eyes: ' + n + ' seconds.'; btn.disabled = true;
        t = setInterval(function () {
          n--; if (n > 0) { msg.textContent = 'Stare at the black dot without moving your eyes: ' + n + ' seconds.'; return; }
          clearInterval(t); state = 'white'; pic.setAttribute('data-state', 'white');
          msg.textContent = 'Now look at the dot on the white panel. Blink once. What colour do you see around it?'; btn.disabled = false; btn.textContent = 'Try again';
        }, 1000);
      });
    }
  }
  if (document.readyState == 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
