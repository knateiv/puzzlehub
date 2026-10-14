/* Puzzle Hub – Onet (連連看) — không giới hạn thời gian
   Grid of paired emoji tiles. Connect matching pairs via a path with ≤2 turns.
   Infinite levels. Score based on pairs cleared. No timer. */
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

      // info bar — chỉ hiện màn và số cặp còn lại
      var topBar = h('div', { style: 'display:flex;justify-content:space-between;align-items:center;padding:4px 12px;font-size:0.9rem;color:var(--text);font-weight:600' });
      var levelEl = h('span', {});
      var pairsEl = h('span', {});
      topBar.appendChild(levelEl);
      topBar.appendChild(pairsEl);
      stage.insertBefore(topBar, cv.canvas);

      // power-ups
      frame.addPowerUp('💡', 'on_hint', 25, function () {
        hintPair = findHintPair();
        if (hintPair) { Sound.play('coin'); draw(); }
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
            if (checkWin()) { handleWin(); }
            else draw();
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

      function updateTopBar() {
        levelEl.textContent = T('on_level', level);
        var rem = 0;
        for (var r = 0; r < ROWS; r++)
          for (var c = 0; c < COLS; c++)
            if (grid[r][c] !== null) rem++;
        pairsEl.textContent = T('on_pairs', rem / 2 | 0);
      }

      // ── pathfinding: BFS với ≤2 lần rẽ, đi qua ô trống hoặc ngoài biên ──
      function findPath(r1, c1, r2, c2) {
        var dirs = [[-1,0],[1,0],[0,-1],[0,1]];
        var queue = [];
        dirs.forEach(function(d, di) {
          queue.push({r:r1, c:c1, dir:di, turns:0, path:[{r:r1,c:c1}]});
        });
        var visited = {};
        while (queue.length) {
          var cur = queue.shift();
          var nr = cur.r + dirs[cur.dir][0];
          var nc = cur.c + dirs[cur.dir][1];
          if (nr < -1 || nr > ROWS || nc < -1 || nc > COLS) continue;
          var key = nr+','+nc+','+cur.dir+','+cur.turns;
          if (visited[key]) continue;
          visited[key] = true;
          var isTarget = nr === r2 && nc === c2;
          var inBounds = nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS;
          if (inBounds && !isTarget && grid[nr][nc] !== null) continue;
          var newPath = cur.path.concat({r:nr, c:nc});
          if (isTarget) return newPath;
          if (cur.turns >= 2) continue;
          queue.push({r:nr, c:nc, dir:cur.dir, turns:cur.turns, path:newPath});
          dirs.forEach(function(d, di) {
            if (di !== cur.dir) queue.push({r:nr, c:nc, dir:di, turns:cur.turns+1, path:newPath});
          });
        }
        return null;
      }

      function findHintPair() {
        var cells = [];
        for (var r = 0; r < ROWS; r++)
          for (var c = 0; c < COLS; c++)
            if (grid[r][c] !== null) cells.push({r:r, c:c});
        PH.shuffle(cells);
        for (var i = 0; i < cells.length; i++) {
          for (var j = i+1; j < cells.length; j++) {
            var a = cells[i], b = cells[j];
            if (grid[a.r][a.c] === grid[b.r][b.c]) {
              if (findPath(a.r, a.c, b.r, b.c)) return [a, b];
            }
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

      // ── geometry ──────────────────────────────────────────────────
      function layout() {
        var topH = topBar.offsetHeight || 36;
        var margin = 8;
        var availW = cv.w - margin * 2;
        var availH = cv.h - topH - margin;
        var cellW = availW / COLS, cellH = availH / ROWS;
        var cell = Math.floor(Math.min(cellW, cellH, 58));
        var boardW = cell * COLS, boardH = cell * ROWS;
        return {
          ox: (cv.w - boardW) / 2,
          oy: topH + (cv.h - topH - boardH) / 2,
          cell: cell
        };
      }

      function cellAt(px, py) {
        if (!COLS) return null;
        var L = layout();
        var c = Math.floor((px - L.ox) / L.cell);
        var r = Math.floor((py - L.oy) / L.cell);
        if (r >= 0 && r < ROWS && c >= 0 && c < COLS) return {r:r, c:c};
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
            var isSelected = selected && selected.r === r && selected.c === c;
            var isHint = hintPair && hintPair.some(function(p){return p.r===r&&p.c===c;});
            ctx.fillStyle = isSelected ? '#4DABF7' : isHint ? '#FFE27A' : th.empty;
            rr(ctx, x + 2, y + 2, L.cell - 4, L.cell - 4, 8);
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

        // animation lines
        animPairs = animPairs.filter(function(ap) {
          ap.alpha -= 0.07;
          if (ap.alpha <= 0) return false;
          ctx.globalAlpha = ap.alpha;
          ctx.strokeStyle = '#69DB7C';
          ctx.lineWidth = 4;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ap.path.forEach(function(pt, i) {
            var px = L.ox + pt.c * L.cell + L.cell / 2;
            var py = L.oy + pt.r * L.cell + L.cell / 2;
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
          });
          ctx.stroke();
          ctx.globalAlpha = 1;
          return true;
        });
        if (animPairs.length) requestAnimationFrame(draw);
      }

      startLevel();
    }
  };
})();
