/* Two-jug puzzle: data-jug="a,b,target". Buttons fill, empty and pour; counts moves; says when the target is reached. */
(function () {
  'use strict';
  function pour(x, y, cap) { var m = Math.min(x, cap - y); return [x - m, y + m]; }
  var API = { pour: pour };
  if (typeof module !== 'undefined' && module.exports) { module.exports = API; return; }
  function init() {
    var els = document.querySelectorAll('[data-jug]');
    for (var i = 0; i < els.length; i++) (function (root) {
      var p = root.getAttribute('data-jug').split(',').map(Number), A = p[0], B = p[1], T = p[2];
      var x = 0, y = 0, n = 0;
      root.innerHTML = '<div class="bt-jugs"><div><b>Jug A</b> (holds ' + A + ')<div class="bt-j" style="height:' + (40 + A * 14) + 'px"><i id="ja" style="height:0"></i><span id="jat">0</span></div></div><div><b>Jug B</b> (holds ' + B + ')<div class="bt-j" style="height:' + (40 + B * 14) + 'px"><i id="jb" style="height:0"></i><span id="jbt">0</span></div></div></div>' +
        '<div class="bt-btns"><button class="btn ghost" data-m="fa">Fill A</button><button class="btn ghost" data-m="fb">Fill B</button><button class="btn ghost" data-m="ea">Empty A</button><button class="btn ghost" data-m="eb">Empty B</button><button class="btn ghost" data-m="ab">Pour A into B</button><button class="btn ghost" data-m="ba">Pour B into A</button><button class="btn" data-m="r">Start again</button></div>' +
        '<p class="bt-s" id="js" aria-live="polite"></p>';
      function draw() {
        root.querySelector('#ja').style.height = (x / A * 100) + '%'; root.querySelector('#jb').style.height = (y / B * 100) + '%';
        root.querySelector('#jat').textContent = x; root.querySelector('#jbt').textContent = y;
        var ok = x == T || y == T;
        root.querySelector('#js').textContent = ok ? 'Solved: ' + T + ' litres in ' + n + ' moves.' : 'Goal: measure exactly ' + T + ' litres. Moves so far: ' + n + '.';
      }
      root.onclick = function (e) {
        var m = e.target.getAttribute && e.target.getAttribute('data-m'); if (!m) return;
        if (m == 'r') { x = y = n = 0; } else {
          if (m == 'fa') x = A; else if (m == 'fb') y = B; else if (m == 'ea') x = 0; else if (m == 'eb') y = 0;
          else if (m == 'ab') { var r = pour(x, y, B); x = r[0]; y = r[1]; } else if (m == 'ba') { var r2 = pour(y, x, A); y = r2[0]; x = r2[1]; }
          n++;
        }
        draw();
      };
      draw();
    })(els[i]);
  }
  if (document.readyState == 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
