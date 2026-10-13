/* Block Blast - bản web. Bảng 8x8, kéo thả 3 khối, phá hàng/cột, Combo, quyền trợ giúp. */
(function () {
  'use strict';
  var PH = window.PH, T = PH.T, rr = PH.rr, PAL = PH.PALETTE, Sound = PH.Sound, Haptics = PH.Haptics, Store = PH.Store;
  var N = 8;
  var COST_ROTATE = 15, COST_REROLL = 30, COST_BOMB = 50;

  var SHAPES = [
    ['X'], ['XX'], ['XXX'], ['XXXX'], ['XXXXX'],
    ['X', 'X'], ['X', 'X', 'X'], ['X', 'X', 'X', 'X'], ['X', 'X', 'X', 'X', 'X'],
    ['XX', 'XX'], ['XXX', 'XXX', 'XXX'],
    ['XX', 'X.'], ['XX', '.X'], ['X.', 'XX'], ['.X', 'XX'],
    ['X..', 'X..', 'XXX'], ['..X', '..X', 'XXX'], ['XXX', 'X..', 'X..'], ['XXX', '..X', '..X'],
    ['XX', 'XX', 'XX'], ['XXX', 'XXX'],
    ['XXX', '.X.'], ['.X.', 'XXX'], ['X.', 'XX', 'X.'], ['.X', 'XX', '.X'],
    ['XX.', '.XX'], ['.XX', 'XX.'], ['X.', 'XX', '.X'], ['.X', 'XX', 'X.'],
    ['X.', 'X.', 'XX'], ['.X', '.X', 'XX'], ['XX', 'X.', 'X.'], ['XX', '.X', '.X'],
    ['XXX', 'X..'], ['XXX', '..X'], ['X..', 'XXX'], ['..X', 'XXX']
  ];

  function makePiece(cells, color) {
    var w = 0, hh = 0;
    cells.forEach(function (c) { hh = Math.max(hh, c[0] + 1); w = Math.max(w, c[1] + 1); });
    return { cells: cells, w: w, h: hh, color: color };
  }
  function rotated(p) {
    return makePiece(p.cells.map(function (c) { return [c[1], p.h - 1 - c[0]]; }), p.color);
  }
  function cellCount(shape) {
    var n = 0;
    shape.forEach(function (row) { for (var i = 0; i < row.length; i++) if (row[i] === 'X') n++; });
    return n;
  }
  function randomPiece(maxCells) {
    var shape;
    do { shape = SHAPES[PH.rnd(SHAPES.length)]; } while (cellCount(shape) > maxCells);
    var cells = [];
    shape.forEach(function (row, r) {
      for (var c = 0; c < row.length; c++) if (row[c] === 'X') cells.push([r, c]);
    });
    return makePiece(cells, 1 + PH.rnd(8));
  }

  // ---- logic bảng (dùng cho cả mô phỏng kiểm tra khả năng đặt) ----
  function newGrid() {
    var g = [];
    for (var r = 0; r < N; r++) { g.push([]); for (var c = 0; c < N; c++) g[r].push(0); }
    return g;
  }
  function copyGrid(g) { return g.map(function (row) { return row.slice(); }); }
  function canPlaceOn(b, p, r0, c0) {
    for (var i = 0; i < p.cells.length; i++) {
      var r = r0 + p.cells[i][0], c = c0 + p.cells[i][1];
      if (r < 0 || r >= N || c < 0 || c >= N || b[r][c] !== 0) return false;
    }
    return true;
  }
  function fullLines(b) {
    var rows = [], cols = [], count = 0, r, c;
    for (r = 0; r < N; r++) {
      var f = true;
      for (c = 0; c < N; c++) if (b[r][c] === 0) f = false;
      rows.push(f); if (f) count++;
    }
    for (c = 0; c < N; c++) {
      var f2 = true;
      for (r = 0; r < N; r++) if (b[r][c] === 0) f2 = false;
      cols.push(f2); if (f2) count++;
    }
    return { rows: rows, cols: cols, count: count };
  }
  function clearFull(b) {
    var fl = fullLines(b);
    for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) if (fl.rows[r] || fl.cols[c]) b[r][c] = 0;
  }
  function solvable(board, rest) {
    if (!rest.length) return true;
    for (var i = 0; i < rest.length; i++) {
      var p = rest[i];
      var next = rest.slice(); next.splice(i, 1);
      for (var r = 0; r < N; r++) {
        for (var c = 0; c < N; c++) {
          if (!canPlaceOn(board, p, r, c)) continue;
          var nb = copyGrid(board);
          p.cells.forEach(function (cl) { nb[r + cl[0]][c + cl[1]] = p.color; });
          clearFull(nb);
          if (solvable(nb, next)) return true;
        }
      }
    }
    return false;
  }
  /** 3 khối được phát luôn đặt được hết lên bảng hiện tại (theo một thứ tự/vị trí nào đó). */
  function generateTray(grid) {
    var a, t;
    for (a = 0; a < 80; a++) {
      t = [randomPiece(99), randomPiece(99), randomPiece(99)];
      if (solvable(copyGrid(grid), t.slice())) return t;
    }
    var limits = [5, 3, 2, 1];
    for (var li = 0; li < limits.length; li++) {
      for (a = 0; a < 40; a++) {
        t = [randomPiece(limits[li]), randomPiece(limits[li]), randomPiece(limits[li])];
        if (solvable(copyGrid(grid), t.slice())) return t;
      }
    }
    return [randomPiece(1), randomPiece(1), randomPiece(1)];
  }

  PH.games.block_blast = {
    start: function (frame) {
      var grid = newGrid(), clearing = newGrid();
      var tray = [null, null, null];
      var score = 0, combo = 0, sinceClear = 0;
      var over = false, animating = false, pendingRefill = false, mode = 0;   // 0 không, 1 xoay, 2 bom
      var clearStart = 0;
      var drag = -1, dragX = 0, dragY = 0, ghostR = 0, ghostC = 0, ghostValid = false;
      var prevRows = [], prevCols = [];
      var particles = [], floats = [];
      var cell = 0, boardLeft = 0, boardTop = 0, boardSize = 0, trayTop = 0, trayHeight = 0;
      var timers = [];
      var rotateBtn, bombBtn;

      var cv = frame.makeCanvas(null, layout);
      var canvas = cv.canvas;

      function layout(o) {
        var pad = 4;
        boardSize = Math.min(o.w - 2 * pad, o.h * 0.70);
        cell = boardSize / N;
        boardLeft = (o.w - boardSize) / 2;
        boardTop = pad;
        trayTop = boardTop + boardSize + 10;
        trayHeight = o.h - trayTop;
      }

      function later(fn, ms) {
        var id = setTimeout(fn, ms);
        timers.push(id);
      }

      // ------------------------------------------------------------ luật chơi
      function newGame() {
        grid = newGrid(); clearing = newGrid();
        score = 0; combo = 0; sinceClear = 0; over = false; animating = false; pendingRefill = false; mode = 0;
        tray = generateTray(grid);
        frame.setScore(0);
      }
      function canPlace(p, r, c) { return canPlaceOn(grid, p, r, c); }
      function fitsAnywhere(p) {
        for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) if (canPlace(p, r, c)) return true;
        return false;
      }
      function anyFits() {
        for (var i = 0; i < 3; i++) if (tray[i] && fitsAnywhere(tray[i])) return true;
        return false;
      }
      function addScore(n) { score += n; frame.setScore(score); }
      function addFloat(text, x, y, color, size) {
        floats.push({ text: text, x: x, y: y, color: color, size: size, start: performance.now() });
      }
      function spawnParticles() {
        var now = performance.now();
        for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) {
          if (!clearing[r][c]) continue;
          for (var k = 0; k < 3; k++) {
            particles.push({
              x: boardLeft + (c + 0.5) * cell, y: boardTop + (r + 0.5) * cell,
              vx: (Math.random() - 0.5) * cell * 6, vy: (Math.random() - 0.8) * cell * 6,
              color: PAL[Math.max(0, grid[r][c] - 1)], start: now
            });
          }
        }
      }

      function place(idx, r0, c0) {
        var p = tray[idx];
        p.cells.forEach(function (cl) { grid[r0 + cl[0]][c0 + cl[1]] = p.color; });
        tray[idx] = null;
        Sound.play('place'); Haptics.light();
        var gained = p.cells.length;
        var fl = fullLines(grid);
        var cx = boardLeft + (c0 + p.w / 2) * cell, cy = boardTop + (r0 + p.h / 2) * cell;
        if (fl.count > 0) {
          combo++; sinceClear = 0;
          var pts = 10 * fl.count * fl.count * Math.max(1, combo);
          gained += pts;
          clearStart = performance.now();
          for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) if (fl.rows[r] || fl.cols[c]) clearing[r][c] = true;
          frame.addCoins(fl.count * 2);
          addFloat('+' + pts, cx, cy, '#FFC94D', 26);
          if (combo >= 2) {
            addFloat(T('bb_combo', combo), cx, cy - cell * 0.9, PAL[0], 22);
            Sound.play('combo'); Haptics.heavy();
          } else { Sound.play('clear'); Haptics.medium(); }
          spawnParticles();
          animating = true;
        } else {
          sinceClear++;
          if (sinceClear >= 3) combo = 0;     // combo giữ trong 3 lượt đặt khối
        }
        addScore(gained);
        if (!tray[0] && !tray[1] && !tray[2]) {
          if (animating) pendingRefill = true; else tray = generateTray(grid);
        }
        if (animating) later(finishClear, 360); else checkOver();
      }

      function finishClear() {
        for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) {
          if (clearing[r][c]) { grid[r][c] = 0; clearing[r][c] = false; }
        }
        animating = false;
        if (pendingRefill) { pendingRefill = false; tray = generateTray(grid); }
        var empty = true;
        for (r = 0; r < N && empty; r++) for (c = 0; c < N; c++) if (grid[r][c]) { empty = false; break; }
        if (empty) {
          addScore(100); frame.addCoins(5);
          addFloat(T('bb_perfect'), boardLeft + boardSize / 2, boardTop + boardSize / 2, '#FF8FAB', 34);
          Sound.play('win'); Haptics.heavy();
        }
        checkOver();
      }

      function checkOver() {
        if (over || anyFits()) return;
        over = true;
        Store.putString('bb_state', '');
        frame.endGame(score, Math.floor(score / 100));
      }

      // ------------------------------------------------------------ quyền trợ giúp
      function updateModeButtons() {
        frame.setPowerUpActive(rotateBtn, mode === 1);
        frame.setPowerUpActive(bombBtn, mode === 2);
      }
      function toggleMode(m) {
        if (over || animating) return;
        if (mode === m) mode = 0;
        else { mode = m; frame.toast(m === 1 ? 'bb_hint_rotate' : 'bb_hint_bomb'); }
        updateModeButtons();
      }
      function cancelMode() { mode = 0; updateModeButtons(); }
      rotateBtn = frame.addPowerUp('🔄', 'bb_rotate', COST_ROTATE, function () { toggleMode(1); });
      frame.addPowerUp('🎲', 'bb_reroll', COST_REROLL, function () {
        if (over || animating) return;
        if (!frame.trySpend(COST_REROLL)) return;
        tray = generateTray(grid);
        Sound.play('pop');
        checkOver();
      });
      bombBtn = frame.addPowerUp('💣', 'bb_bomb', COST_BOMB, function () { toggleMode(2); });

      function rotatePiece(i) {
        if (!tray[i]) return;
        if (!frame.trySpend(COST_ROTATE)) { cancelMode(); return; }
        tray[i] = rotated(tray[i]);
        Sound.play('pop');
        cancelMode();
      }
      function useBomb(r0, c0) {
        if (!frame.trySpend(COST_BOMB)) { cancelMode(); return; }
        var removed = 0;
        clearStart = performance.now();
        for (var r = r0 - 1; r <= r0 + 1; r++) for (var c = c0 - 1; c <= c0 + 1; c++) {
          if (r >= 0 && r < N && c >= 0 && c < N && grid[r][c]) { clearing[r][c] = true; removed++; }
        }
        cancelMode();
        Sound.play('clear'); Haptics.heavy();
        if (removed > 0) {
          addScore(removed * 2);
          addFloat('💥 +' + removed * 2, boardLeft + (c0 + 0.5) * cell, boardTop + (r0 + 0.5) * cell, '#FF8FAB', 24);
          spawnParticles();
          animating = true;
          later(finishClear, 360);
        }
      }

      // ------------------------------------------------------------ cảm ứng
      function trayCellFor(p, slotW) {
        var pad = 14;
        return Math.min(cell * 0.8, Math.min((slotW - pad) / p.w, (trayHeight - pad) / p.h));
      }
      function slotAt(x, y) {
        if (y < trayTop - cell * 0.3) return -1;
        var i = Math.floor(x / (cv.w / 3));
        return i >= 0 && i < 3 ? i : -1;
      }
      function dragLift() { return cell * 2.3; }
      function updateGhost() {
        var p = tray[drag];
        var left = dragX - p.w * cell / 2, top = dragY - dragLift() - p.h * cell / 2;
        ghostC = Math.round((left - boardLeft) / cell);
        ghostR = Math.round((top - boardTop) / cell);
        ghostValid = canPlace(p, ghostR, ghostC);
        prevRows = []; prevCols = [];
        if (ghostValid) {
          p.cells.forEach(function (cl) { grid[ghostR + cl[0]][ghostC + cl[1]] = p.color; });
          var fl = fullLines(grid);
          prevRows = fl.rows; prevCols = fl.cols;
          p.cells.forEach(function (cl) { grid[ghostR + cl[0]][ghostC + cl[1]] = 0; });
        }
      }

      canvas.addEventListener('pointerdown', function (e) {
        Sound.unlock();
        if (over || animating) return;
        var pt = cv.pos(e);
        canvas.setPointerCapture(e.pointerId);
        if (mode === 2) {
          var r = Math.floor((pt.y - boardTop) / cell), c = Math.floor((pt.x - boardLeft) / cell);
          if (r >= 0 && r < N && c >= 0 && c < N) useBomb(r, c); else cancelMode();
          return;
        }
        var idx = slotAt(pt.x, pt.y);
        if (idx >= 0 && tray[idx]) {
          if (mode === 1) { rotatePiece(idx); return; }
          drag = idx; dragX = pt.x; dragY = pt.y;
          Sound.play('tap');
          updateGhost();
        } else if (mode === 1) cancelMode();
      });
      canvas.addEventListener('pointermove', function (e) {
        if (drag < 0) return;
        var pt = cv.pos(e);
        dragX = pt.x; dragY = pt.y;
        updateGhost();
      });
      function endDrag(commit) {
        if (drag < 0) return;
        var i = drag;
        drag = -1;
        if (commit && ghostValid) place(i, ghostR, ghostC);
        else if (commit) Sound.play('error');
        ghostValid = false;
      }
      canvas.addEventListener('pointerup', function () { endDrag(true); });
      canvas.addEventListener('pointercancel', function () { endDrag(false); });

      // ------------------------------------------------------------ lưu / khôi phục
      function saveState() {
        var s = score + ';' + combo + ';' + sinceClear + ';';
        for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) s += grid[r][c];
        s += ';';
        s += tray.map(function (p) {
          if (!p) return 'x';
          return p.color + ':' + p.cells.map(function (cl) { return '' + cl[0] + cl[1]; }).join(',');
        }).join('/');
        return s;
      }
      function restoreState(s) {
        try {
          var parts = s.split(';');
          if (parts.length < 5 || parts[3].length !== N * N) return false;
          var ng = newGrid();
          for (var i = 0; i < N * N; i++) ng[Math.floor(i / N)][i % N] = parseInt(parts[3][i], 10);
          var nt = parts[4].split('/').map(function (t) {
            if (t === 'x') return null;
            var cp = t.split(':');
            return makePiece(cp[1].split(',').map(function (q) { return [parseInt(q[0], 10), parseInt(q[1], 10)]; }),
              parseInt(cp[0], 10));
          });
          grid = ng; tray = nt;
          var fl = fullLines(grid);
          for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) if (fl.rows[r] || fl.cols[c]) grid[r][c] = 0;
          score = parseInt(parts[0], 10); combo = parseInt(parts[1], 10); sinceClear = parseInt(parts[2], 10);
          if (!tray[0] && !tray[1] && !tray[2]) tray = generateTray(grid);
          frame.setScore(score);
          return true;
        } catch (e) { return false; }
      }
      function persist() {
        if (!over && !frame.isEnded()) Store.putString('bb_state', saveState());
      }
      document.addEventListener('visibilitychange', persist);
      window.addEventListener('pagehide', persist);
      frame.onDestroy(function () {
        persist();
        document.removeEventListener('visibilitychange', persist);
        window.removeEventListener('pagehide', persist);
        timers.forEach(clearTimeout);
      });

      var saved = Store.getString('bb_state', '');
      if (!(saved && restoreState(saved))) newGame();

      // ------------------------------------------------------------ vẽ
      function mix(hex, m) {
        var n = parseInt(hex.slice(1), 16);
        var r = Math.round((n >> 16 & 255) * (1 - m) + 255 * m);
        var g = Math.round((n >> 8 & 255) * (1 - m) + 255 * m);
        var b = Math.round((n & 255) * (1 - m) + 255 * m);
        return 'rgb(' + r + ',' + g + ',' + b + ')';
      }
      function drawBlock(ctx, x, y, s, radius, hex, whiteMix, a) {
        ctx.globalAlpha = a === undefined ? 1 : a;
        ctx.fillStyle = whiteMix ? mix(hex, whiteMix) : hex;
        rr(ctx, x, y, s, s, radius); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.33)';
        rr(ctx, x + s * 0.12, y + s * 0.10, s * 0.76, s * 0.32, radius * 0.7); ctx.fill();
        ctx.globalAlpha = 1;
      }

      frame.loop(function (now) {
        var ctx = cv.ctx, th = PH.theme();
        ctx.clearRect(0, 0, cv.w, cv.h);
        if (!cell) return;
        var gap = Math.max(1.5, cell * 0.045), radius = cell * 0.2;

        ctx.fillStyle = th.board;
        rr(ctx, boardLeft - gap * 2, boardTop - gap * 2, boardSize + gap * 4, boardSize + gap * 4, radius * 1.4);
        ctx.fill();

        var r, c;
        for (r = 0; r < N; r++) for (c = 0; c < N; c++) {
          var l = boardLeft + c * cell + gap, t = boardTop + r * cell + gap, s = cell - 2 * gap;
          ctx.fillStyle = th.empty;
          rr(ctx, l, t, s, s, radius); ctx.fill();
          if (!grid[r][c]) continue;
          if (clearing[r][c]) {
            var k = Math.min(1, (now - clearStart) / 340);
            var sz = s * (1 - 0.85 * k), off = (s - sz) / 2;
            drawBlock(ctx, l + off, t + off, sz, radius * (sz / s), PAL[grid[r][c] - 1],
              0.25 + 0.6 * (1 - Math.abs(2 * k - 1)));
          } else drawBlock(ctx, l, t, s, radius, PAL[grid[r][c] - 1], 0);
        }

        if (drag >= 0 && ghostValid) {
          for (r = 0; r < N; r++) for (c = 0; c < N; c++) {
            if (prevRows[r] || prevCols[c]) {
              ctx.fillStyle = 'rgba(255,255,255,0.4)';
              rr(ctx, boardLeft + c * cell + gap, boardTop + r * cell + gap, cell - 2 * gap, cell - 2 * gap, radius);
              ctx.fill();
            }
          }
          var gp = tray[drag];
          gp.cells.forEach(function (cl) {
            drawBlock(ctx, boardLeft + (ghostC + cl[1]) * cell + gap, boardTop + (ghostR + cl[0]) * cell + gap,
              cell - 2 * gap, radius, PAL[gp.color - 1], 0, 0.45);
          });
        }

        var slotW = cv.w / 3;
        for (var i = 0; i < 3; i++) {
          var p = tray[i];
          if (!p || i === drag) continue;
          var tc = trayCellFor(p, slotW), pw = p.w * tc, ph = p.h * tc;
          var ox = slotW * i + (slotW - pw) / 2, oy = trayTop + (trayHeight - ph) / 2, tg = Math.max(1, tc * 0.05);
          p.cells.forEach(function (cl) {
            drawBlock(ctx, ox + cl[1] * tc + tg, oy + cl[0] * tc + tg, tc - 2 * tg, tc * 0.2, PAL[p.color - 1], 0);
          });
        }

        if (drag >= 0 && tray[drag]) {
          var dp = tray[drag];
          var left = dragX - dp.w * cell / 2, top = dragY - dragLift() - dp.h * cell / 2;
          dp.cells.forEach(function (cl) {
            drawBlock(ctx, left + cl[1] * cell + gap, top + cl[0] * cell + gap, cell - 2 * gap, radius, PAL[dp.color - 1], 0);
          });
        }

        particles = particles.filter(function (q) { return now - q.start < 600; });
        particles.forEach(function (q) {
          var t = (now - q.start) / 600;
          var px = q.x + q.vx * t, py = q.y + q.vy * t + cell * 6 * t * t;
          ctx.fillStyle = PH.alpha(q.color, 1 - t);
          var sz = cell * 0.16 * (1 - t * 0.5);
          ctx.fillRect(px - sz, py - sz, sz * 2, sz * 2);
        });

        floats = floats.filter(function (f) { return now - f.start < 900; });
        ctx.textAlign = 'center';
        floats.forEach(function (f) {
          var t = (now - f.start) / 900;
          ctx.font = '800 ' + f.size + 'px -apple-system, Arial, sans-serif';
          ctx.shadowColor = 'rgba(61,58,92,' + 0.6 * (1 - t) + ')'; ctx.shadowBlur = 4; ctx.shadowOffsetY = 2;
          ctx.fillStyle = PH.alpha(f.color, 1 - t * t);
          ctx.fillText(f.text, f.x, f.y - cell * 1.2 * t);
          ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
        });
      });
    }
  };
})();
