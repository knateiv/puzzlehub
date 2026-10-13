/* Fruit Merge - bản web: thả trái cây vào cột, trái giống nhau kề nhau gộp thành trái lớn hơn. */
(function () {
  'use strict';
  var PH = window.PH, h = PH.h, T = PH.T, rr = PH.rr, PAL = PH.PALETTE, Sound = PH.Sound, Haptics = PH.Haptics;
  var COLS = 5, ROWS = 7, MAX_LEVEL = 9, COST_SWAP = 20, COST_HAMMER = 40;
  var FRUITS = ['', '🍒', '🍓', '🍇', '🍊', '🍎', '🍐', '🍑', '🍍', '🍉'];

  PH.games.fruitmerge = {
    start: function (frame) {
      var grid = [], animFrom = [], popAt = [], floats = [];
      var score = 0, next = 1, afterNext = 1, busy = false, over = false, hammer = false, hover = -1, fallStart = 0;
      var cell = 0, boardLeft = 0, boardTop = 0, headerH = 0, timers = [];
      var hammerBtn;

      var hint = h('div', { class: 'subtle', text: T('fm_instruction') });
      var cv = frame.makeCanvas(null, function (o) {
        cell = Math.min(o.w / COLS, o.h / (ROWS + 1.85));
        headerH = cell * 1.6;
        boardLeft = (o.w - cell * COLS) / 2;
        boardTop = headerH + cell * 0.08;
      });
      frame.stage.insertBefore(hint, cv.canvas);

      function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
      frame.onDestroy(function () { timers.forEach(clearTimeout); });

      function randomFruit() {
        var r = PH.rnd(100);
        return r < 35 ? 1 : r < 65 ? 2 : r < 85 ? 3 : 4;
      }
      function newGame() {
        grid = []; animFrom = []; popAt = [];
        for (var r = 0; r < ROWS; r++) {
          grid.push([]); animFrom.push([]); popAt.push([]);
          for (var c = 0; c < COLS; c++) { grid[r].push(0); animFrom[r].push(r); popAt[r].push(0); }
        }
        score = 0; busy = false; over = false; hammer = false;
        next = randomFruit(); afterNext = randomFruit();
        frame.setScore(0);
      }

      frame.addPowerUp('🔀', 'fm_swap', COST_SWAP, function () {
        if (over || busy) return;
        if (!frame.trySpend(COST_SWAP)) return;
        next = randomFruit(); Sound.play('pop');
      });
      hammerBtn = frame.addPowerUp('🔨', 'fm_hammer', COST_HAMMER, function () {
        if (over || busy) return;
        hammer = !hammer;
        frame.setPowerUpActive(hammerBtn, hammer);
        if (hammer) frame.toast('fm_hint_hammer');
      });

      function resetAnim() {
        for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) animFrom[r][c] = r;
      }
      function drop(col) {
        if (busy || over) return;
        var row = -1;
        for (var r = ROWS - 1; r >= 0; r--) if (!grid[r][col]) { row = r; break; }
        if (row < 0) { Sound.play('error'); return; }
        resetAnim();
        grid[row][col] = next; animFrom[row][col] = -1; fallStart = performance.now();
        next = afterNext; afterNext = randomFruit();
        Sound.play('place'); Haptics.light();
        busy = true;
        later(function () { resolve(1); }, 280);
      }

      function flood(r, c, level, seen, out) {
        if (r < 0 || r >= ROWS || c < 0 || c >= COLS || seen[r][c] || grid[r][c] !== level) return;
        seen[r][c] = true; out.push([r, c]);
        flood(r + 1, c, level, seen, out); flood(r - 1, c, level, seen, out);
        flood(r, c + 1, level, seen, out); flood(r, c - 1, level, seen, out);
      }

      function gravity() {
        fallStart = performance.now();
        for (var c = 0; c < COLS; c++) {
          var write = ROWS - 1, r;
          for (r = ROWS - 1; r >= 0; r--) {
            if (grid[r][c]) {
              if (r !== write) { grid[write][c] = grid[r][c]; popAt[write][c] = popAt[r][c]; grid[r][c] = 0; }
              animFrom[write][c] = r;
              write--;
            }
          }
          for (r = write; r >= 0; r--) animFrom[r][c] = r;
        }
      }

      function mergeGroup(group, chain) {
        var level = grid[group[0][0]][group[0][1]];
        var target = group[0];
        group.forEach(function (g) { if (g[0] > target[0]) target = g; });
        group.forEach(function (g) { grid[g[0]][g[1]] = 0; });
        var nl = level + 1, points;
        if (nl > MAX_LEVEL) { points = 500 * chain; Sound.play('win'); }
        else {
          grid[target[0]][target[1]] = nl; popAt[target[0]][target[1]] = performance.now();
          points = nl * 10 * (group.length - 1) * chain;
          Sound.play(chain >= 2 ? 'combo' : 'clear');
        }
        Haptics.medium();
        floats.push({
          text: '+' + points + (chain >= 2 ? '  x' + chain : ''),
          x: boardLeft + (target[1] + 0.5) * cell, y: boardTop + (target[0] + 0.3) * cell,
          color: PAL[Math.min(7, nl - 1)], start: performance.now()
        });
        score += points; frame.setScore(score);
      }

      function resolve(chain) {
        var seen = [];
        for (var i = 0; i < ROWS; i++) { seen.push([]); for (var j = 0; j < COLS; j++) seen[i].push(false); }
        for (var r = ROWS - 1; r >= 0; r--) {
          for (var c = 0; c < COLS; c++) {
            if (!grid[r][c] || seen[r][c]) continue;
            var group = [];
            flood(r, c, grid[r][c], seen, group);
            if (group.length < 2) continue;
            mergeGroup(group, chain);
            gravity();
            later(function () { resolve(chain + 1); }, 320);
            return;
          }
        }
        busy = false;
        for (c = 0; c < COLS; c++) {
          if (grid[0][c]) {
            over = true; Sound.play('lose');
            frame.endGame(score, Math.floor(score / 80));
            return;
          }
        }
      }

      function useHammer(row, col) {
        if (row < 0 || row >= ROWS || !grid[row][col]) { hammer = false; frame.setPowerUpActive(hammerBtn, false); return; }
        if (!frame.trySpend(COST_HAMMER)) { hammer = false; frame.setPowerUpActive(hammerBtn, false); return; }
        grid[row][col] = 0; hammer = false; frame.setPowerUpActive(hammerBtn, false);
        Sound.play('clear'); Haptics.heavy();
        resetAnim(); gravity(); busy = true;
        later(function () { resolve(1); }, 320);
      }

      function pointerCol(e) {
        var p = cv.pos(e);
        var col = Math.floor((p.x - boardLeft) / cell), row = Math.floor((p.y - boardTop) / cell);
        return { col: col, row: row };
      }
      cv.canvas.addEventListener('pointerdown', function (e) {
        Sound.unlock();
        if (over || busy) return;
        cv.canvas.setPointerCapture(e.pointerId);
        var q = pointerCol(e);
        hover = q.col >= 0 && q.col < COLS ? q.col : -1;
      });
      cv.canvas.addEventListener('pointermove', function (e) {
        if (hover === -1 && !e.buttons) return;
        var q = pointerCol(e);
        hover = q.col >= 0 && q.col < COLS ? q.col : -1;
      });
      cv.canvas.addEventListener('pointerup', function (e) {
        if (over || busy) { hover = -1; return; }
        var q = pointerCol(e);
        hover = -1;
        if (q.col < 0 || q.col >= COLS) return;
        if (hammer) useHammer(q.row, q.col); else drop(q.col);
      });
      cv.canvas.addEventListener('pointercancel', function () { hover = -1; });

      function drawFruit(ctx, level, cx, cy, radius, a) {
        ctx.globalAlpha = a;
        ctx.fillStyle = PAL[Math.min(7, level - 1)];
        ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.31)';
        ctx.beginPath(); ctx.arc(cx - radius * 0.25, cy - radius * 0.3, radius * 0.55, 0, Math.PI * 2); ctx.fill();
        ctx.font = (radius * 1.15) + 'px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = '#000';
        ctx.fillText(FRUITS[level], cx, cy + radius * 0.06);
        ctx.globalAlpha = 1;
      }

      frame.loop(function (now) {
        var ctx = cv.ctx, th = PH.theme();
        ctx.clearRect(0, 0, cv.w, cv.h);
        if (!cell) return;
        var gap = cell * 0.05, r, c;

        ctx.fillStyle = th.text2; ctx.font = '700 12px -apple-system, Arial, sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
        ctx.fillText(T('fm_next'), boardLeft + cell * 0.9, headerH * 0.28);
        drawFruit(ctx, next, boardLeft + cell * 0.9, headerH * 0.68, cell * 0.38, 1);
        drawFruit(ctx, afterNext, boardLeft + cell * 1.85, headerH * 0.72, cell * 0.24, 0.7);
        if (hover >= 0 && !hammer) drawFruit(ctx, next, boardLeft + (hover + 0.5) * cell, headerH * 0.62, cell * 0.4, 1);

        ctx.fillStyle = th.board;
        rr(ctx, boardLeft - gap * 2, boardTop - gap * 2, cell * COLS + gap * 4, cell * ROWS + gap * 4, cell * 0.25); ctx.fill();
        for (r = 0; r < ROWS; r++) for (c = 0; c < COLS; c++) {
          ctx.fillStyle = c === hover ? PH.alpha(PAL[0], 0.28) : th.empty;
          rr(ctx, boardLeft + c * cell + gap, boardTop + r * cell + gap, cell - 2 * gap, cell - 2 * gap, cell * 0.2); ctx.fill();
        }
        ctx.fillStyle = 'rgba(240,112,122,0.28)';
        ctx.fillRect(boardLeft, boardTop, cell * COLS, cell * 0.08);

        var fk = Math.min(1, (now - fallStart) / 260), ease = 1 - (1 - fk) * (1 - fk);
        for (r = 0; r < ROWS; r++) for (c = 0; c < COLS; c++) {
          var lv = grid[r][c];
          if (!lv) continue;
          var rowPos = animFrom[r][c] + (r - animFrom[r][c]) * ease;
          var pop = 1, age = now - popAt[r][c];
          if (age >= 0 && age < 300) pop = 1 + 0.28 * Math.sin(Math.PI * age / 300);
          drawFruit(ctx, lv, boardLeft + (c + 0.5) * cell, boardTop + (rowPos + 0.5) * cell, cell * 0.43 * pop, 1);
        }

        floats = floats.filter(function (f) { return now - f.start < 900; });
        floats.forEach(function (f) {
          var t = (now - f.start) / 900;
          ctx.font = '800 20px -apple-system, Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
          ctx.shadowColor = 'rgba(61,58,92,' + 0.6 * (1 - t) + ')'; ctx.shadowBlur = 4; ctx.shadowOffsetY = 2;
          ctx.fillStyle = PH.alpha(f.color, 1 - t * t);
          ctx.fillText(f.text, f.x, f.y - cell * 0.9 * t);
          ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
        });
      });

      newGame();
    }
  };
})();
