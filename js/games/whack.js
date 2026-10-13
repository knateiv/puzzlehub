/* Đập Chuột - bản web: lưới 3x3 hố, 30 giây, chuột vàng +3, bom -2 giây, combo. */
(function () {
  'use strict';
  var PH = window.PH, h = PH.h, T = PH.T, PAL = PH.PALETTE, Sound = PH.Sound, Haptics = PH.Haptics;
  var NONE = 0, NORMAL = 1, GOLD = 2, BOMB = 3, ROUND_MS = 30000, COST_TIME = 30;

  PH.games.whack = {
    start: function (frame) {
      var type = [], born = [], die = [], floats = [];
      for (var i = 0; i < 9; i++) { type.push(NONE); born.push(0); die.push(0); }
      var running = false, finished = false, timeLeft = ROUND_MS, elapsed = 0, last = 0, spawnTimer = 0;
      var score = 0, combo = 0, lastSec = -1, cell = 0, left = 0, top = 0;

      var timeText = h('div', { class: 'hl', style: 'color:var(--accent-dark);padding-bottom:0', text: T('wm_time', 30) });
      var hint = h('div', { class: 'subtle', text: T('wm_instruction') });
      var cv = frame.makeCanvas(null, function (o) {
        cell = Math.min(o.w / 3, o.h / 3); left = (o.w - cell * 3) / 2; top = (o.h - cell * 3) / 2;
      });
      var startBtn = PH.UI.button(T('wm_start'), 'primary', function () { startBtn.classList.add('gone'); start(); });
      frame.stage.insertBefore(timeText, cv.canvas);
      frame.stage.insertBefore(hint, cv.canvas);
      frame.stage.appendChild(startBtn);

      frame.addPowerUp('⏳', 'wm_plus_time', COST_TIME, function () {
        if (!running) return;
        if (frame.trySpend(COST_TIME)) timeLeft += 10000;
      });

      function start() {
        for (var k = 0; k < 9; k++) type[k] = NONE;
        score = 0; combo = 0; timeLeft = ROUND_MS; elapsed = 0; spawnTimer = 400; finished = false;
        running = true; lastSec = -1; last = performance.now();
        frame.setScore(0);
      }

      function spawn(now) {
        var active = type.filter(function (t) { return t !== NONE; }).length;
        var maxActive = Math.min(3, 1 + Math.floor(elapsed / 9000));
        if (active >= maxActive) return;
        var free = [];
        for (var k = 0; k < 9; k++) if (type[k] === NONE) free.push(k);
        if (!free.length) return;
        var hole = free[PH.rnd(free.length)], roll = PH.rnd(100);
        type[hole] = roll < 12 ? GOLD : (roll < 27 ? BOMB : NORMAL);
        born[hole] = now;
        die[hole] = now + Math.max(650, 1250 - elapsed / 45);
      }

      function finish() {
        running = false; finished = true;
        for (var k = 0; k < 9; k++) type[k] = NONE;
        Sound.play('win');
        frame.endGame(score, Math.floor(score / 5));
      }

      function hit(hole) {
        var t = type[hole];
        type[hole] = NONE;
        var cx = left + (hole % 3 + 0.5) * cell, cy = top + (Math.floor(hole / 3) + 0.5) * cell;
        if (t === BOMB) {
          timeLeft = Math.max(0, timeLeft - 2000); combo = 0;
          floats.push({ text: '💥 -2s', x: cx, y: cy, color: '#F0707A', start: performance.now() });
          Sound.play('lose'); Haptics.heavy();
          return;
        }
        var base = t === GOLD ? 3 : 1, gain = base * (1 + Math.floor(combo / 5));
        combo++; score += gain;
        floats.push({
          text: '+' + gain + (combo >= 5 ? '  x' + (1 + Math.floor(combo / 5)) : ''), x: cx, y: cy,
          color: t === GOLD ? '#FFC94D' : PAL[0], start: performance.now()
        });
        Sound.play(t === GOLD ? 'combo' : 'pop'); Haptics.light();
        frame.setScore(score);
      }

      cv.canvas.addEventListener('pointerdown', function (e) {
        Sound.unlock();
        if (!running) return;
        var p = cv.pos(e);
        var c = Math.floor((p.x - left) / cell), r = Math.floor((p.y - top) / cell);
        if (c < 0 || c > 2 || r < 0 || r > 2) return;
        var hole = r * 3 + c;
        if (type[hole] === NONE) { combo = 0; Sound.play('error'); return; }
        hit(hole);
      });

      // Tạm dừng khi chuyển tab/ứng dụng
      var pausedAt = 0;
      function onVis() {
        if (document.hidden) {
          if (running) { running = false; pausedAt = performance.now(); frame._paused = true; }
        } else if (frame._paused && !finished) {
          var shift = performance.now() - pausedAt;
          for (var k = 0; k < 9; k++) { born[k] += shift; die[k] += shift; }
          frame._paused = false; running = true; last = performance.now();
        }
      }
      document.addEventListener('visibilitychange', onVis);
      frame.onDestroy(function () { document.removeEventListener('visibilitychange', onVis); running = false; });

      frame.loop(function (now) {
        if (running) {
          var dt = Math.min(100, now - last);
          last = now; timeLeft -= dt; elapsed += dt;
          if (timeLeft <= 0) {
            timeLeft = 0;
            timeText.textContent = T('wm_time', 0);
            finish();
          } else {
            for (var k = 0; k < 9; k++) {
              if (type[k] !== NONE && now >= die[k]) { if (type[k] !== BOMB) combo = 0; type[k] = NONE; }
            }
            spawnTimer -= dt;
            if (spawnTimer <= 0) { spawn(now); spawnTimer = Math.max(380, 850 - elapsed / 55); }
            var sec = Math.ceil(timeLeft / 1000);
            if (sec !== lastSec) { lastSec = sec; timeText.textContent = T('wm_time', sec); }
          }
        }

        var ctx = cv.ctx, th = PH.theme();
        ctx.clearRect(0, 0, cv.w, cv.h);
        if (!cell) return;
        ctx.font = (cell * 0.62) + 'px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
        for (var i2 = 0; i2 < 9; i2++) {
          var cx = left + (i2 % 3 + 0.5) * cell, cy = top + (Math.floor(i2 / 3) + 0.62) * cell;
          var hw = cell * 0.40, hh = cell * 0.15;
          ctx.fillStyle = th.board;
          ctx.beginPath(); ctx.ellipse(cx, cy, hw, hh, 0, 0, Math.PI * 2); ctx.fill();
          if (type[i2] !== NONE) {
            var age = now - born[i2];
            var rise = Math.min(1, age / 140), sink = Math.min(1, Math.max(0, (die[i2] - now) / 140));
            var k2 = Math.min(rise, sink);
            var my = cy - cell * 0.1 + (1 - k2) * cell * 0.55;
            ctx.save();
            ctx.beginPath(); ctx.rect(cx - cell / 2, cy - cell, cell, cell); ctx.clip();
            if (type[i2] === GOLD) {
              ctx.fillStyle = PH.alpha('#FFC94D', 0.55);
              ctx.beginPath(); ctx.arc(cx, my - cell * 0.18, cell * 0.36, 0, Math.PI * 2); ctx.fill();
            }
            ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = '#000';
            ctx.fillText(type[i2] === BOMB ? '💣' : (type[i2] === GOLD ? '🐹' : '🐭'), cx, my);
            ctx.restore();
          }
          ctx.lineWidth = 4; ctx.strokeStyle = th.line;
          ctx.beginPath(); ctx.ellipse(cx, cy, hw, hh, 0, 0, Math.PI); ctx.stroke();
        }
        floats = floats.filter(function (f) { return now - f.start < 800; });
        floats.forEach(function (f) {
          var t = (now - f.start) / 800;
          ctx.font = '800 20px -apple-system, Arial, sans-serif'; ctx.textAlign = 'center';
          ctx.fillStyle = PH.alpha(f.color, 1 - t);
          ctx.fillText(f.text, f.x, f.y - cell * 0.5 - cell * 0.5 * t);
        });
      });
    }
  };
})();
