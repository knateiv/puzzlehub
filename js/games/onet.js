/* Puzzle Hub – Onet — không timer, tự xáo khi bế tắc */
(function () {
  'use strict';
  var PH = window.PH, T = PH.T, Store = PH.Store, Sound = PH.Sound;
  var h = PH.h, rr = PH.rr;

  var EMOJIS = ['🍎','🍊','🍋','🍇','🍓','🍒','🍑','🥝','🍍','🥭',
                '🌸','🌺','🌻','🌼','🌷','🍄','🌈','⭐','🎵','🎈',
                '🦁','🐯','🐻','🦊','🐼','🐧','🦋','🐢','🦀','🐬'];

  PH.games.onet = {
    start: function (frame) {
      frame.saveOnExit = true;

      var level = 1, score = 0;
      var COLS, ROWS, grid, selected, hintPair;
      var animPairs = [];

      var cv = frame.makeCanvas(null, function () { draw(); });
      var stage = frame.stage;

      // info bar — màn + số cặp
      var topBar = h('div', { style: 'display:flex;justify-content:space-between;align-items:center;padding:4px 12px;font-size:0.9rem;color:var(--text);font-weight:600' });
      var levelEl = h('span', {});
      var pairsEl = h('span', {});
      topBar.appendChild(levelEl);
      topBar.appendChild(pairsEl);
      stage.insertBefore(topBar, cv.canvas);

      // power-ups
      frame.addPowerUp('💡', 'on_hint', 25, function () {
        var pair = findHintPair();
        if (!pair) return;
        if (!frame.trySpend(25)) return;
        hintPair = pair;
        draw();
      });
      frame.finishButton();

      // canvas click
      cv.canvas.addEventListener('pointerdown', function (e) {
        var p = cv.pos(e);
        var cell = cellAt(p.x, p.y);
        if (!cell) return;
        if (grid[cell.r][cell.c] === null) return;
        Sound.play('tap');
        if (!selected) {
          selected = cell;
          hintPair = null;
          draw();
        } else {
          if (selected.r === cell.r && selected.c === cell.c) {
            selected = null; draw(); return;
          }
          if (grid[selected.r][selected.c] !== grid[cell.r][cell.c]) {
            selected = cell; draw(); return;
          }
          var path = findPath(selected.r, selected.c, cell.r, cell.c);
          if (path) {
            var r1 = selected.r, c1 = selected.c, r2 = cell.r, c2 = cell.c;
            animPairs.push({ path: path, alpha: 1 });
            grid[r1][c1] = null;
            grid[r2][c2] = null;
            selected = null;
            hintPair = null;
            score += 10 + level * 5;
            frame.setScore(score);
            frame.addCoins(1);
            Sound.play('clear');
            updateTopBar();
            if (checkWin()) {
              handleWin();
            } else {
              // Kiểm tra bế tắc — xáo bài nếu không còn nước đi
              checkDeadlock();
              draw();
            }
          } else {
            Sound.play('error');
            selected = cell;
            draw();
          }
        }
      });

      function startLevel() {
        COLS = Math.min(8, 4 + Math.floor(level / 2));
        ROWS = Math.min(7, 4 + Math.floor(level / 3));
        if ((COLS * ROWS) % 2 !== 0) COLS--;
        generateGrid();
        selected = null;
        hintPair = null;
        animPairs = [];
        updateTopBar();
        draw();
      }

      function generateGrid() {
        var total = COLS * ROWS;
        var types = Math.floor(total / 2);
        var emList = PH.shuffle(EMOJIS.slice()).slice(0, Math.min(types, EMOJIS.length));
        while (emList.length < types) emList = emList.concat(emList).slice(0, types);
        var cells = [];
        for (var i = 0; i < types; i++) cells.push(emList[i], emList[i]);
        PH.shuffle(cells);
        grid = [];
        var k = 0;
        for (var r = 0; r < ROWS; r++) {
          grid.push([]);
          for (var c = 0; c < COLS; c++) grid[r].push(cells[k++]);
        }
      }

      function checkDeadlock() {
        if (!findHintPair()) {
          // Bế tắc: xáo các ô còn lại
          shuffleRemaining();
        }
      }

      function shuffleRemaining() {
        var positions = [], values = [];
        for (var r = 0; r < ROWS; r++)
          for (var c = 0; c < COLS; c++)
            if (grid[r][c] !== null) { positions.push({r:r,c:c}); values.push(grid[r][c]); }
        if (positions.length === 0) return;
        // Xáo nhiều lần cho đến khi có nước đi hoặc hết lần thử
        var tries = 0;
        while (tries < 20) {
          PH.shuffle(values);
          positions.forEach(function(pos,i){ grid[pos.r][pos.c] = values[i]; });
          tries++;
          if (findHintPair()) break;
        }
        Sound.play('pop');
        frame.toast('on_solved'); // dùng toast "xáo bài" — dùng string available
        draw();
      }

      function updateTopBar() {
        levelEl.textContent = T('on_level', level);
        var rem = 0;
        for (var r = 0; r < ROWS; r++)
          for (var c = 0; c < COLS; c++)
            if (grid[r][c] !== null) rem++;
        pairsEl.textContent = T('on_pairs', rem / 2 | 0);
        if (frame.saveSession) {
          frame.saveSession({ level: level, score: score, grid: grid, COLS: COLS, ROWS: ROWS });
        }
      }

      // ── Thuật toán nối hình Onet chuẩn: tối đa 2 lần rẽ (3 đoạn thẳng) ──
      function isPassable(r, c) {
        if (r < -1 || r > ROWS || c < -1 || c > COLS) return false;
        if (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
          return grid[r][c] === null;
        }
        return true; // Mép ngoài bao quanh bàn cờ luôn trống
      }

      function lineClear(r1, c1, r2, c2) {
        if (r1 !== r2 && c1 !== c2) return false;
        if (r1 === r2) {
          var minC = Math.min(c1, c2), maxC = Math.max(c1, c2);
          for (var c = minC + 1; c < maxC; c++) {
            if (!isPassable(r1, c)) return false;
          }
          return true;
        } else {
          var minR = Math.min(r1, r2), maxR = Math.max(r1, r2);
          for (var r = minR + 1; r < maxR; r++) {
            if (!isPassable(r, c1)) return false;
          }
          return true;
        }
      }

      function makeLine(r1, c1, r2, c2) {
        var pts = [];
        if (r1 === r2) {
          var stepC = c1 <= c2 ? 1 : -1;
          for (var c = c1; c !== c2; c += stepC) pts.push({ r: r1, c: c });
          pts.push({ r: r2, c: c2 });
        } else {
          var stepR = r1 <= r2 ? 1 : -1;
          for (var r = r1; r !== r2; r += stepR) pts.push({ r: r, c: c1 });
          pts.push({ r: r2, c: c2 });
        }
        return pts;
      }

      function findPath(r1, c1, r2, c2) {
        if (r1 === r2 && c1 === c2) return null;

        // 1. Đường thẳng 0 lần rẽ (1 đoạn thẳng)
        if (lineClear(r1, c1, r2, c2)) {
          return makeLine(r1, c1, r2, c2);
        }

        // 2. Đường chữ L 1 lần rẽ (2 đoạn thẳng)
        // Góc cua 1: (r1, c2)
        if (isPassable(r1, c2) && lineClear(r1, c1, r1, c2) && lineClear(r1, c2, r2, c2)) {
          return makeLine(r1, c1, r1, c2).concat(makeLine(r1, c2, r2, c2).slice(1));
        }
        // Góc cua 2: (r2, c1)
        if (isPassable(r2, c1) && lineClear(r1, c1, r2, c1) && lineClear(r2, c1, r2, c2)) {
          return makeLine(r1, c1, r2, c1).concat(makeLine(r2, c1, r2, c2).slice(1));
        }

        // 3. Đường chữ Z / U 2 lần rẽ (3 đoạn thẳng)
        var bestPath = null;

        // Dạng 1: Ngang -> Dọc -> Ngang qua kênh cột c (cột từ -1 đến COLS)
        // (r1, c1) -> (r1, c) -> (r2, c) -> (r2, c2)
        for (var c = -1; c <= COLS; c++) {
          if (c === c1 && c === c2) continue;
          if (isPassable(r1, c) && isPassable(r2, c)) {
            if (lineClear(r1, c1, r1, c) && lineClear(r1, c, r2, c) && lineClear(r2, c, r2, c2)) {
              var p1 = makeLine(r1, c1, r1, c)
                .concat(makeLine(r1, c, r2, c).slice(1))
                .concat(makeLine(r2, c, r2, c2).slice(1));
              if (!bestPath || p1.length < bestPath.length) bestPath = p1;
            }
          }
        }

        // Dạng 2: Dọc -> Ngang -> Dọc qua kênh hàng r (hàng từ -1 đến ROWS)
        // (r1, c1) -> (r, c1) -> (r, c2) -> (r2, c2)
        for (var r = -1; r <= ROWS; r++) {
          if (r === r1 && r === r2) continue;
          if (isPassable(r, c1) && isPassable(r, c2)) {
            if (lineClear(r1, c1, r, c1) && lineClear(r, c1, r, c2) && lineClear(r, c2, r2, c2)) {
              var p2 = makeLine(r1, c1, r, c1)
                .concat(makeLine(r, c1, r, c2).slice(1))
                .concat(makeLine(r, c2, r2, c2).slice(1));
              if (!bestPath || p2.length < bestPath.length) bestPath = p2;
            }
          }
        }

        return bestPath;
      }

      function findHintPair() {
        var cells = [];
        for (var r = 0; r < ROWS; r++)
          for (var c = 0; c < COLS; c++)
            if (grid[r][c] !== null) cells.push({r:r,c:c});
        for (var i = 0; i < cells.length; i++) {
          for (var j = i+1; j < cells.length; j++) {
            var a = cells[i], b = cells[j];
            if (grid[a.r][a.c] === grid[b.r][b.c] && findPath(a.r,a.c,b.r,b.c)) return [a,b];
          }
        }
        return null;
      }

      function checkWin() {
        for (var r = 0; r < ROWS; r++)
          for (var c = 0; c < COLS; c++)
            if (grid[r][c] !== null) return false;
        return true;
      }

      function handleWin() {
        Sound.play('win');
        frame.toast('on_solved');
        score += level * 50;
        frame.setScore(score);
        level++;
        setTimeout(function () { startLevel(); }, 1000);
      }

      // ── geometry ─────────────────────────────────────────────────
      function layout() {
        var topH = topBar.offsetHeight || 36;
        var margin = 8;
        var availW = cv.w - margin * 2;
        var availH = cv.h - topH - margin;
        var cellW = availW / COLS, cellH = availH / ROWS;
        var cell = Math.floor(Math.min(cellW, cellH, 58));
        var boardW = cell * COLS, boardH = cell * ROWS;
        return { ox:(cv.w-boardW)/2, oy:topH+(cv.h-topH-boardH)/2, cell:cell };
      }

      function cellAt(px, py) {
        if (!COLS) return null;
        var L = layout();
        var c = Math.floor((px - L.ox) / L.cell);
        var r = Math.floor((py - L.oy) / L.cell);
        if (r >= 0 && r < ROWS && c >= 0 && c < COLS) return {r:r,c:c};
        return null;
      }

      // ── draw ─────────────────────────────────────────────────────
      function draw() {
        if (!cv || !COLS) return;
        var ctx = cv.ctx, W = cv.w, H = cv.h;
        var th = PH.theme();
        ctx.clearRect(0, 0, W, H);
        var L = layout();

        for (var r = 0; r < ROWS; r++) {
          for (var c = 0; c < COLS; c++) {
            var x = L.ox + c * L.cell, y = L.oy + r * L.cell;
            var isSel = selected && selected.r === r && selected.c === c;
            var isHint = hintPair && hintPair.some(function(p){return p.r===r&&p.c===c;});
            ctx.fillStyle = isSel ? '#4DABF7' : isHint ? '#FFE27A' : th.empty;
            rr(ctx, x+2, y+2, L.cell-4, L.cell-4, 8);
            ctx.fill();
            var em = grid[r][c];
            if (em) {
              ctx.font = Math.floor(L.cell * 0.5) + 'px sans-serif';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(em, x + L.cell / 2, y + L.cell / 2);
            }
          }
        }

        animPairs = animPairs.filter(function(ap) {
          ap.alpha -= 0.08;
          if (ap.alpha <= 0) return false;
          ctx.save();
          ctx.globalAlpha = ap.alpha;
          ctx.strokeStyle = '#69DB7C';
          ctx.lineWidth = 5;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.shadowColor = '#69DB7C';
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ap.path.forEach(function(pt, i) {
            var px = L.ox + pt.c * L.cell + L.cell / 2;
            var py2 = L.oy + pt.r * L.cell + L.cell / 2;
            px = Math.max(6, Math.min(W - 6, px));
            py2 = Math.max(6, Math.min(H - 6, py2));
            if (i === 0) ctx.moveTo(px, py2); else ctx.lineTo(px, py2);
          });
          ctx.stroke();
          ctx.restore();
          return true;
        });
        if (animPairs.length) requestAnimationFrame(draw);
      }

      var saved = frame.loadSession ? frame.loadSession() : null;
      if (saved && typeof saved.level === 'number' && Array.isArray(saved.grid)) {
        level = saved.level;
        score = saved.score || 0;
        frame.setScore(score);
        grid = saved.grid;
        COLS = saved.COLS;
        ROWS = saved.ROWS;
        selected = null;
        hintPair = null;
        animPairs = [];
        updateTopBar();
        draw();
      } else {
        startLevel();
      }
    }
  };
})();
