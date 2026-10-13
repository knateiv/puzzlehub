/* Block Blast - bản web. Bảng 8x8, kéo thả 3 khối, phá hàng/cột.
   CHUỖI PHÁ: mỗi lần đặt khối phá được hàng/cột thì chuỗi tăng (x1, x2, x3...), điểm phá hàng nhân với chuỗi.
   Chuỗi giữ được nếu trong 3 lượt đặt khối liên tiếp có ít nhất một lần phá hàng.
   Kéo thả: khối đi nhanh hơn ngón tay (x1.35), tự hút vào ô hợp lệ gần nhất, không bị khóa khi đang phá hàng. */
(function () {
  'use strict';
  var PH = window.PH, T = PH.T, rr = PH.rr, PAL = PH.PALETTE, Sound = PH.Sound, Haptics = PH.Haptics, Store = PH.Store;
  var N = 8;
  var COST_ROTATE = 15, COST_REROLL = 30, COST_BOMB = 50;
  var STREAK_WINDOW = 3;      // số lượt đặt khối được phép không phá hàng mà vẫn giữ chuỗi
  var DRAG_GAIN = 1.35;       // khối di chuyển nhanh hơn ngón tay => kéo nhanh, đỡ mỏi tay
  var CLEAR_MS = 320, LIFT_MS = 110, PLACE_POP_MS = 150;
  var STREAK_COLORS = ['#FF8FAB', '#FF8FAB', '#FF7A9A', '#FF6B6B', '#FF6B35', '#FF4D2E'];

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

  function easeOut(t) { return 1 - (1 - t) * (1 - t); }

  PH.games.block_blast = {
    start: function (frame) {
      var grid = newGrid(), tray = [null, null, null];
      var score = 0, streak = 0, sinceClear = 0, over = false, mode = 0;   // mode: 0 không, 1 xoay, 2 bom
      var clearing = [], clearStart = 0, placed = [], placedAt = 0;
      var drag = -1, startX = 0, startY = 0, dragX = 0, dragY = 0, pieceX0 = 0, pieceY0 = 0;
      var liftFrom = null, liftStart = 0;
      var ghostR = 0, ghostC = 0, ghostValid = false, prevRows = [], prevCols = [];
      var particles = [], floats = [];
      var cell = 0, boardLeft = 0, boardTop = 0, boardSize = 0, trayTop = 0, trayHeight = 0;
      var rotateBtn, bombBtn;

      // ---- thanh "Chuỗi phá" phía trên bảng
      var streakText = PH.h('span', { class: 'txt' });
      var streakDots = PH.h('span', { class: 'dots' });
      var streakBar = PH.h('div', { class: 'streakbar' }, [streakText, streakDots]);
      var cv = frame.makeCanvas(null, layout);
      var canvas = cv.canvas;
      frame.stage.insertBefore(streakBar, canvas);

      function layout(o) {
        var pad = 4;
        boardSize = Math.min(o.w - 2 * pad, o.h * 0.70);
        cell = boardSize / N;
        boardLeft = (o.w - boardSize) / 2;
        boardTop = pad;
        trayTop = boardTop + boardSize + 10;
        trayHeight = o.h - trayTop;
      }

      function updateStreakBar(bump) {
        if (streak > 0) {
          streakBar.classList.add('on');
          streakBar.classList.toggle('hot', streak >= 4);
          streakText.textContent = '🔥 ' + T('bb_streak', streak);
          var left = STREAK_WINDOW - sinceClear, dots = '';
          for (var i = 0; i < STREAK_WINDOW; i++) dots += i < left ? '●' : '○';
          streakDots.textContent = dots;
          if (bump) {
            streakBar.classList.remove('bump');
            void streakBar.offsetWidth;          // khởi động lại hiệu ứng nảy
            streakBar.classList.add('bump');
          }
        } else {
          streakBar.classList.remove('on', 'hot', 'bump');
        }
      }

      // ------------------------------------------------------------ luật chơi
      function newGame() {
        grid = newGrid(); clearing = []; placed = [];
        score = 0; streak = 0; sinceClear = 0; over = false; mode = 0;
        tray = generateTray(grid);
        frame.setScore(0);
        updateStreakBar(false);
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
      function boardEmpty() {
        for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) if (grid[r][c]) return false;
        return true;
      }
      function addScore(n) { score += n; frame.setScore(score); }
      function addFloat(text, x, y, color, size) {
        var margin = Math.min(boardSize / 2, size * 2.2);
        x = PH.clamp(x, boardLeft + margin, boardLeft + boardSize - margin);
        floats.push({ text: text, x: x, y: y, color: color, size: size, start: performance.now() });
      }

      /** Xóa ngay các ô khỏi bảng (để kéo khối tiếp không phải chờ), giữ lại bản sao để vẽ hiệu ứng vỡ. */
      function removeCells(list) {
        var now = performance.now();
        clearStart = now;
        clearing = list.map(function (q) { return { r: q[0], c: q[1], color: grid[q[0]][q[1]] }; });
        clearing.forEach(function (q) {
          for (var k = 0; k < 3; k++) {
            particles.push({
              x: boardLeft + (q.c + 0.5) * cell, y: boardTop + (q.r + 0.5) * cell,
              vx: (Math.random() - 0.5) * cell * 6, vy: (Math.random() - 0.8) * cell * 6,
              color: PAL[Math.max(0, q.color - 1)], start: now
            });
          }
          grid[q.r][q.c] = 0;
        });
      }

      function place(idx, r0, c0) {
        var p = tray[idx];
        p.cells.forEach(function (cl) { grid[r0 + cl[0]][c0 + cl[1]] = p.color; });
        tray[idx] = null;
        placed = p.cells.map(function (cl) { return [r0 + cl[0], c0 + cl[1]]; });
        placedAt = performance.now();
        Sound.play('place'); Haptics.light();

        var gained = p.cells.length;
        var fl = fullLines(grid);
        var cx = boardLeft + (c0 + p.w / 2) * cell, cy = boardTop + (r0 + p.h / 2) * cell;
        if (fl.count > 0) {
          streak++; sinceClear = 0;
          var pts = 20 * fl.count * fl.count * streak;      // 1 hàng 20, 2 hàng 80, 3 hàng 180... nhân chuỗi phá
          gained += pts;
          var list = [];
          for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) if (fl.rows[r] || fl.cols[c]) list.push([r, c]);
          removeCells(list);
          frame.addCoins(fl.count * 2);
          var col = STREAK_COLORS[Math.min(streak, STREAK_COLORS.length - 1)];
          addFloat('+' + pts, cx, cy, '#FFC94D', 30);
          addFloat(T('bb_streak', streak), boardLeft + boardSize / 2, boardTop + boardSize * 0.36,
            col, Math.min(40, 24 + streak * 2));
          if (fl.count >= 2) addFloat(T('bb_lines', fl.count), cx, cy + cell * 1.0, PAL[4], 22);
          if (streak % 5 === 0) {
            frame.addCoins(5);
            addFloat('🪙 +5', boardLeft + boardSize / 2, boardTop + boardSize * 0.80, '#FFC94D', 24);
          }
          if (streak >= 2) { Sound.play('combo'); Haptics.heavy(); } else { Sound.play('clear'); Haptics.medium(); }
          if (boardEmpty()) {
            gained += 300;
            frame.addCoins(5);
            addFloat(T('bb_perfect') + ' +300', boardLeft + boardSize / 2, boardTop + boardSize * 0.62, '#FF8FAB', 30);
            Sound.play('win');
          }
          updateStreakBar(true);
        } else {
          sinceClear++;
          if (streak > 0 && sinceClear >= STREAK_WINDOW) {
            streak = 0;
            addFloat(T('bb_streak_lost'), boardLeft + boardSize / 2, boardTop + boardSize / 2, '#A9A5C7', 22);
          }
          updateStreakBar(false);
        }
        addScore(gained);
        if (!tray[0] && !tray[1] && !tray[2]) tray = generateTray(grid);
        checkOver();
      }

      function checkOver() {
        if (over || anyFits()) return;
        over = true;
        Store.putString('bb_state', '');
        frame.endGame(score, Math.floor(score / 200));
      }

      // ------------------------------------------------------------ quyền trợ giúp
      function updateModeButtons() {
        frame.setPowerUpActive(rotateBtn, mode === 1);
        frame.setPowerUpActive(bombBtn, mode === 2);
      }
      function toggleMode(m) {
        if (over) return;
        if (mode === m) mode = 0;
        else { mode = m; frame.toast(m === 1 ? 'bb_hint_rotate' : 'bb_hint_bomb'); }
        updateModeButtons();
      }
      function cancelMode() { mode = 0; updateModeButtons(); }
      rotateBtn = frame.addPowerUp('🔄', 'bb_rotate', COST_ROTATE, function () { toggleMode(1); });
      frame.addPowerUp('🎲', 'bb_reroll', COST_REROLL, function () {
        if (over) return;
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
        var list = [];
        for (var r = r0 - 1; r <= r0 + 1; r++) for (var c = c0 - 1; c <= c0 + 1; c++) {
          if (r >= 0 && r < N && c >= 0 && c < N && grid[r][c]) list.push([r, c]);
        }
        cancelMode();
        Sound.play('clear'); Haptics.heavy();
        if (list.length) {
          removeCells(list);
          addScore(list.length * 2);
          addFloat('💥 +' + list.length * 2, boardLeft + (c0 + 0.5) * cell, boardTop + (r0 + 0.5) * cell, '#FF8FAB', 24);
        }
        checkOver();
      }

      // ------------------------------------------------------------ kéo thả
      function trayCellFor(p, slotW) {
        var pad = 14;
        return Math.min(cell * 0.8, Math.min((slotW - pad) / p.w, (trayHeight - pad) / p.h));
      }
      function slotAt(x, y) {
        if (y < trayTop - cell * 0.4) return -1;
        var i = Math.floor(x / (cv.w / 3));
        return i >= 0 && i < 3 ? i : -1;
      }
      /** Vị trí góc trên-trái của khối đang kéo (đi nhanh hơn ngón tay theo hệ số DRAG_GAIN). */
      function piecePos() {
        return { x: pieceX0 + (dragX - startX) * DRAG_GAIN, y: pieceY0 + (dragY - startY) * DRAG_GAIN };
      }
      /** Tìm ô hợp lệ gần nhất quanh vị trí khối (tự "hút" vào chỗ trống trong bán kính khoảng 1 ô). */
      function updateGhost() {
        var p = tray[drag], pp = piecePos();
        var fc = (pp.x - boardLeft) / cell, fr = (pp.y - boardTop) / cell;
        var rc = Math.round(fr), cc = Math.round(fc), best = null, bd = 1e9;
        for (var dr = -1; dr <= 1; dr++) {
          for (var dc = -1; dc <= 1; dc++) {
            var r = rc + dr, c = cc + dc;
            if (!canPlace(p, r, c)) continue;
            var d = (r - fr) * (r - fr) + (c - fc) * (c - fc);
            if (d < bd) { bd = d; best = [r, c]; }
          }
        }
        ghostValid = !!best && bd <= 0.9;
        prevRows = []; prevCols = [];
        if (ghostValid) {
          ghostR = best[0]; ghostC = best[1];
          p.cells.forEach(function (cl) { grid[ghostR + cl[0]][ghostC + cl[1]] = p.color; });
          var fl = fullLines(grid);
          prevRows = fl.rows; prevCols = fl.cols;
          p.cells.forEach(function (cl) { grid[ghostR + cl[0]][ghostC + cl[1]] = 0; });
        }
      }

      canvas.addEventListener('pointerdown', function (e) {
        Sound.unlock();
        if (over || drag >= 0) return;
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
          var p = tray[idx];
          drag = idx; startX = dragX = pt.x; startY = dragY = pt.y;
          pieceX0 = pt.x - p.w * cell / 2;              // khối nằm phía trên ngón tay để không bị che
          pieceY0 = pt.y - p.h * cell - cell * 0.9;
          var slotW = cv.w / 3, tc = trayCellFor(p, slotW);
          liftFrom = { x: slotW * idx + (slotW - p.w * tc) / 2, y: trayTop + (trayHeight - p.h * tc) / 2, c: tc };
          liftStart = performance.now();
          Sound.play('tap');
          updateGhost();
        } else if (mode === 1) cancelMode();
      });
      canvas.addEventListener('pointermove', function (e) {
        if (drag < 0) return;
        var evs = e.getCoalescedEvents ? e.getCoalescedEvents() : null;
        var last = evs && evs.length ? evs[evs.length - 1] : e;
        var pt = cv.pos(last);
        dragX = pt.x; dragY = pt.y;
        updateGhost();
      });
      function endDrag(commit) {
        if (drag < 0) return;
        var i = drag, moved = Math.abs(dragX - startX) + Math.abs(dragY - startY);
        drag = -1;
        if (commit && ghostValid) place(i, ghostR, ghostC);
        else if (commit && moved > 12) Sound.play('error');
        ghostValid = false;
      }
      canvas.addEventListener('pointerup', function () { endDrag(true); });
      canvas.addEventListener('pointercancel', function () { endDrag(false); });

      // ------------------------------------------------------------ lưu / khôi phục
      function saveState() {
        var s = score + ';' + streak + ';' + sinceClear + ';';
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
          clearFull(grid);
          score = parseInt(parts[0], 10); streak = parseInt(parts[1], 10) || 0; sinceClear = parseInt(parts[2], 10) || 0;
          if (!tray[0] && !tray[1] && !tray[2]) tray = generateTray(grid);
          frame.setScore(score);
          updateStreakBar(false);
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
      });

      var saved = Store.getString('bb_state', '');
      if (!(saved && restoreState(saved))) newGame();

      // để kiểm thử tự động
      PH.debugBB = {
        setGrid: function (g) { grid = g.map(function (r) { return r.slice(); }); },
        setTray: function (shapes) {
          tray = shapes.map(function (cells) { return cells ? makePiece(cells, 1 + PH.rnd(8)) : null; });
        },
        state: function () { return { score: score, streak: streak, sinceClear: sinceClear, over: over }; },
        layout: function () { return { cell: cell, boardLeft: boardLeft, boardTop: boardTop, trayTop: trayTop, trayHeight: trayHeight, w: cv.w }; }
      };

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
        var gap = Math.max(1.5, cell * 0.045), radius = cell * 0.2, r, c, i;

        ctx.fillStyle = th.board;
        rr(ctx, boardLeft - gap * 2, boardTop - gap * 2, boardSize + gap * 4, boardSize + gap * 4, radius * 1.4);
        ctx.fill();

        var popK = Math.min(1, (now - placedAt) / PLACE_POP_MS);
        for (r = 0; r < N; r++) for (c = 0; c < N; c++) {
          var l = boardLeft + c * cell + gap, t = boardTop + r * cell + gap, s = cell - 2 * gap;
          ctx.fillStyle = th.empty;
          rr(ctx, l, t, s, s, radius); ctx.fill();
          if (!grid[r][c]) continue;
          var sc = 1;
          if (popK < 1) {
            for (i = 0; i < placed.length; i++) {
              if (placed[i][0] === r && placed[i][1] === c) { sc = 0.82 + 0.18 * easeOut(popK); break; }
            }
          }
          var off = s * (1 - sc) / 2;
          drawBlock(ctx, l + off, t + off, s * sc, radius * sc, PAL[grid[r][c] - 1], 0);
        }

        // các ô vừa bị phá: chớp trắng rồi thu nhỏ
        var ck = (now - clearStart) / CLEAR_MS;
        if (ck < 1) {
          clearing.forEach(function (q) {
            var l2 = boardLeft + q.c * cell + gap, t2 = boardTop + q.r * cell + gap, s2 = cell - 2 * gap;
            var sz = s2 * (1 - 0.9 * ck), o2 = (s2 - sz) / 2;
            drawBlock(ctx, l2 + o2, t2 + o2, sz, radius * (sz / s2), PAL[q.color - 1],
              0.25 + 0.6 * (1 - Math.abs(2 * ck - 1)));
          });
        } else if (clearing.length) clearing = [];

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
        for (i = 0; i < 3; i++) {
          var p = tray[i];
          if (!p || i === drag) continue;
          var tc = trayCellFor(p, slotW), pw = p.w * tc, ph = p.h * tc;
          var ox = slotW * i + (slotW - pw) / 2, oy = trayTop + (trayHeight - ph) / 2, tg = Math.max(1, tc * 0.05);
          p.cells.forEach(function (cl) {
            drawBlock(ctx, ox + cl[1] * tc + tg, oy + cl[0] * tc + tg, tc - 2 * tg, tc * 0.2, PAL[p.color - 1], 0);
          });
        }

        // khối đang kéo: nhấc lên mượt từ khay rồi bám theo ngón tay
        if (drag >= 0 && tray[drag]) {
          var dp = tray[drag], pp = piecePos(), e = easeOut(Math.min(1, (now - liftStart) / LIFT_MS));
          var size = liftFrom.c + (cell - liftFrom.c) * e;
          var x0 = liftFrom.x + (pp.x - liftFrom.x) * e, y0 = liftFrom.y + (pp.y - liftFrom.y) * e;
          var g2 = Math.max(1.5, size * 0.045);
          ctx.save();
          ctx.shadowColor = 'rgba(61,58,92,0.25)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 6;
          dp.cells.forEach(function (cl) {
            drawBlock(ctx, x0 + cl[1] * size + g2, y0 + cl[0] * size + g2, size - 2 * g2, size * 0.2, PAL[dp.color - 1], 0);
          });
          ctx.restore();
        }

        particles = particles.filter(function (q) { return now - q.start < 600; });
        particles.forEach(function (q) {
          var t3 = (now - q.start) / 600;
          var px = q.x + q.vx * t3, py = q.y + q.vy * t3 + cell * 6 * t3 * t3;
          ctx.fillStyle = PH.alpha(q.color, 1 - t3);
          var sz3 = cell * 0.16 * (1 - t3 * 0.5);
          ctx.fillRect(px - sz3, py - sz3, sz3 * 2, sz3 * 2);
        });

        floats = floats.filter(function (f) { return now - f.start < 1000; });
        ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
        floats.forEach(function (f) {
          var t4 = (now - f.start) / 1000;
          var grow = t4 < 0.15 ? 0.7 + 2 * t4 : 1;          // chữ bật lên rồi bay lên trên
          ctx.font = '800 ' + Math.round(f.size * grow) + 'px -apple-system, Arial, sans-serif';
          ctx.shadowColor = 'rgba(61,58,92,' + 0.6 * (1 - t4) + ')'; ctx.shadowBlur = 5; ctx.shadowOffsetY = 2;
          ctx.fillStyle = PH.alpha(f.color, 1 - t4 * t4);
          ctx.fillText(f.text, f.x, f.y - cell * 1.1 * t4);
          ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
        });
      });
    }
  };
})();
