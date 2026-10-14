/* Block Blast - bản web. Bảng 8x8, kéo thả 3 khối, phá hàng/cột.
   CHUỖI PHÁ: mỗi lần đặt khối phá được hàng/cột thì chuỗi tăng (x1, x2, x3...), điểm phá hàng nhân với chuỗi.
   Chuỗi giữ được nếu trong 3 lượt đặt khối liên tiếp có ít nhất một lần phá hàng.
   Kéo thả: khối đi nhanh hơn ngón tay (x1.35), tự hút vào ô hợp lệ gần nhất, không bị khóa khi đang phá hàng.
   Hiệu ứng: Tia laser quét hàng/cột, rung màn hình (screen shake), sóng xung kích (shockwave),
   vật lý vỡ khối 3D (3D shards & sparks), chuyển cảnh mượt sang Neon khi phá sạch bàn cờ.
   10 CHỦ ĐỀ & 10 PHONG CÁCH KHỐI ĐỘC ĐÁO. */
(function () {
  'use strict';
  var PH = window.PH, T = PH.T, rr = PH.rr, PAL = PH.PALETTE, Sound = PH.Sound, Haptics = PH.Haptics, Store = PH.Store;
  var N = 8;
  var COST_ROTATE = 15, COST_REROLL = 30, COST_BOMB = 50;
  var STREAK_WINDOW = 3;
  var DRAG_GAIN = 1.35;
  var CLEAR_MS = 320, LIFT_MS = 110, PLACE_POP_MS = 150;
  var STREAK_COLORS = ['#FF8FAB', '#FF8FAB', '#FF7A9A', '#FF6B6B', '#FF6B35', '#FF4D2E'];

  // ── 10 CHỦ ĐỀ & BẢNG MÀU ĐA DẠNG ──────────────────────────────
  var THEMES = {
    pastel: {
      id: 'pastel', nameKey: 'bb_theme_pastel', emoji: '🌸',
      boardBg: '#E9DFF3', boardBorder: '#D8CBE4', emptyCell: '#F0E9F6', emptyBorder: 'transparent',
      pal: ['#FF8FAB', '#8EC5FC', '#8FE3C0', '#FFC48C', '#B7A6F2', '#FFE27A', '#FF9E9E', '#6FDCE3'],
      beamColor: '#FF8FAB', shockColor: '#FF8FAB', glowColor: 'rgba(255,143,171,0.4)', glowIntensity: 0,
      dark: false, style: 'jelly'
    },
    neon: {
      id: 'neon', nameKey: 'bb_theme_neon', emoji: '⚡',
      boardBg: '#0B091A', boardBorder: '#00F0FF', emptyCell: '#15122B', emptyBorder: 'rgba(0,240,255,0.28)',
      pal: ['#00F0FF', '#FF007F', '#39FF14', '#FFE600', '#B026FF', '#FF5E00', '#00E5FF', '#FF3366'],
      beamColor: '#00F0FF', shockColor: '#FF007F', glowColor: '#00F0FF', glowIntensity: 18,
      dark: true, style: 'cyber'
    },
    sunset: {
      id: 'sunset', nameKey: 'bb_theme_sunset', emoji: '🌅',
      boardBg: '#211124', boardBorder: '#FF7B54', emptyCell: '#331B38', emptyBorder: 'rgba(255,123,84,0.25)',
      pal: ['#FF4565', '#FF7B54', '#FFA62B', '#FFE74C', '#B388EB', '#E78EA9', '#FF6B6B', '#F78FB3'],
      beamColor: '#FFB26B', shockColor: '#FF4565', glowColor: '#FF7B54', glowIntensity: 14,
      dark: true, style: 'stripes'
    },
    ocean: {
      id: 'ocean', nameKey: 'bb_theme_ocean', emoji: '🌊',
      boardBg: '#091E2A', boardBorder: '#00C9A7', emptyCell: '#102F42', emptyBorder: 'rgba(0,201,167,0.25)',
      pal: ['#00C9A7', '#00B4D8', '#48CAE4', '#90E0EF', '#0077B6', '#52B788', '#06D6A0', '#4EA8DE'],
      beamColor: '#00C9A7', shockColor: '#48CAE4', glowColor: '#00B4D8', glowIntensity: 14,
      dark: true, style: 'gem'
    },
    galaxy: {
      id: 'galaxy', nameKey: 'bb_theme_galaxy', emoji: '🌌',
      boardBg: '#130924', boardBorder: '#A06CD5', emptyCell: '#23153D', emptyBorder: 'rgba(160,108,213,0.28)',
      pal: ['#A06CD5', '#E2CFEA', '#FF6F91', '#845EC2', '#D65DB1', '#FF9671', '#C34A36', '#A288E3'],
      beamColor: '#E2CFEA', shockColor: '#FF6F91', glowColor: '#A06CD5', glowIntensity: 16,
      dark: true, style: 'star'
    },
    forest: {
      id: 'forest', nameKey: 'bb_theme_forest', emoji: '🌲',
      boardBg: '#0D2018', boardBorder: '#52B788', emptyCell: '#163627', emptyBorder: 'rgba(82,183,136,0.25)',
      pal: ['#2D6A4F', '#40916C', '#52B788', '#74C69D', '#95D5B2', '#57CC99', '#80ED99', '#38B000'],
      beamColor: '#74C69D', shockColor: '#52B788', glowColor: '#74C69D', glowIntensity: 12,
      dark: true, style: 'leaf'
    },
    candy: {
      id: 'candy', nameKey: 'bb_theme_candy', emoji: '🍬',
      boardBg: '#FFF0F5', boardBorder: '#FF69B4', emptyCell: '#FFE4E1', emptyBorder: 'rgba(255,105,180,0.20)',
      pal: ['#FF1493', '#00BFFF', '#FF69B4', '#FFD700', '#FF4500', '#7B68EE', '#00FA9A', '#FF6347'],
      beamColor: '#FF69B4', shockColor: '#FF1493', glowColor: '#FF69B4', glowIntensity: 10,
      dark: false, style: 'dots'
    },
    volcano: {
      id: 'volcano', nameKey: 'bb_theme_volcano', emoji: '🌋',
      boardBg: '#1B0C0A', boardBorder: '#FF4500', emptyCell: '#2B1410', emptyBorder: 'rgba(255,69,0,0.28)',
      pal: ['#FF2A00', '#FF5500', '#FF8000', '#FFAA00', '#D62828', '#F77F00', '#FCBF49', '#FF3B00'],
      beamColor: '#FFAA00', shockColor: '#FF2A00', glowColor: '#FF5500', glowIntensity: 18,
      dark: true, style: 'lava'
    },
    frost: {
      id: 'frost', nameKey: 'bb_theme_frost', emoji: '❄️',
      boardBg: '#0A1C24', boardBorder: '#80DEEA', emptyCell: '#132B37', emptyBorder: 'rgba(128,222,234,0.28)',
      pal: ['#E0F7FA', '#B2EBF2', '#80DEEA', '#4DD0E1', '#26C6DA', '#A7FFEB', '#64FFDA', '#00E5FF'],
      beamColor: '#80DEEA', shockColor: '#4DD0E1', glowColor: '#80DEEA', glowIntensity: 15,
      dark: true, style: 'ice'
    },
    gold: {
      id: 'gold', nameKey: 'bb_theme_gold', emoji: '👑',
      boardBg: '#1C1708', boardBorder: '#FFD700', emptyCell: '#2C2510', emptyBorder: 'rgba(255,215,0,0.30)',
      pal: ['#FFD700', '#FFC000', '#E6A100', '#D4AF37', '#C5A059', '#F3E5AB', '#B8860B', '#FFA500'],
      beamColor: '#FFE066', shockColor: '#FFD700', glowColor: '#FFD700', glowIntensity: 16,
      dark: true, style: 'gold'
    }
  };

  var THEME_KEYS = ['pastel', 'neon', 'sunset', 'ocean', 'galaxy', 'forest', 'candy', 'volcano', 'frost', 'gold'];

  function parseHex(h) {
    if (!h) return [255, 255, 255];
    if (h.charAt(0) === '#') h = h.slice(1);
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function toHex(rgb) {
    var r = PH.clamp(Math.round(rgb[0]), 0, 255);
    var g = PH.clamp(Math.round(rgb[1]), 0, 255);
    var b = PH.clamp(Math.round(rgb[2]), 0, 255);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }
  function lerpColor(c1, c2, t) {
    var a = parseHex(c1), b = parseHex(c2);
    return toHex([
      a[0] + (b[0] - a[0]) * t,
      a[1] + (b[1] - a[1]) * t,
      a[2] + (b[2] - a[2]) * t
    ]);
  }
  function lighten(hex, amount) {
    var c = parseHex(hex);
    return toHex([
      c[0] + (255 - c[0]) * amount,
      c[1] + (255 - c[1]) * amount,
      c[2] + (255 - c[2]) * amount
    ]);
  }
  function darken(hex, amount) {
    var c = parseHex(hex);
    return toHex([
      c[0] * (1 - amount),
      c[1] * (1 - amount),
      c[2] * (1 - amount)
    ]);
  }

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

  function shapeToPiece(shape, color) {
    var cells = [];
    shape.forEach(function (row, r) {
      for (var c = 0; c < row.length; c++) if (row[c] === 'X') cells.push([r, c]);
    });
    return makePiece(cells, color || (1 + PH.rnd(8)));
  }

  // ---- logic bảng ----
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

  /** Tìm tất cả các hình có thể hoàn thành ít nhất 1 hàng hoặc 1 cột trên bảng hiện tại. */
  function getClearingShapes(board) {
    var list = [];
    for (var i = 0; i < SHAPES.length; i++) {
      var p = shapeToPiece(SHAPES[i], 1);
      var canClear = false;
      for (var r = 0; r < N && !canClear; r++) {
        for (var c = 0; c < N && !canClear; c++) {
          if (canPlaceOn(board, p, r, c)) {
            var nb = copyGrid(board);
            p.cells.forEach(function (cl) { nb[r + cl[0]][c + cl[1]] = 1; });
            if (fullLines(nb).count > 0) {
              canClear = true;
              list.push(SHAPES[i]);
            }
          }
        }
      }
    }
    return list;
  }

  /** 3 khối được phát luôn đặt được hết lên bảng hiện tại;
      ƯU TIÊN phát các mảnh giúp người chơi hoàn thành nốt hàng hoặc cột đang chờ. */
  function generateTray(grid) {
    var clearing = getClearingShapes(grid);
    var a, t;

    // Ưu tiên 1: Tạo khay chứa mảnh giúp hoàn thành hàng/cột ngay
    if (clearing.length > 0) {
      for (a = 0; a < 60; a++) {
        var clearShape1 = clearing[PH.rnd(clearing.length)];
        var p0 = shapeToPiece(clearShape1, 1 + PH.rnd(8));
        var p1 = (clearing.length > 1 && Math.random() < 0.45)
          ? shapeToPiece(clearing[PH.rnd(clearing.length)], 1 + PH.rnd(8))
          : randomPiece(99);
        var p2 = randomPiece(99);
        t = PH.shuffle([p0, p1, p2]);
        if (solvable(copyGrid(grid), t.slice())) return t;
      }
      for (a = 0; a < 40; a++) {
        var clearShape2 = clearing[PH.rnd(clearing.length)];
        var p0s = shapeToPiece(clearShape2, 1 + PH.rnd(8));
        t = PH.shuffle([p0s, randomPiece(3), randomPiece(2)]);
        if (solvable(copyGrid(grid), t.slice())) return t;
      }
    }

    // Nếu không có mảnh clear hoặc bảng thoáng, sinh bình thường
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
      var score = 0, streak = 0, sinceClear = 0, over = false, mode = 0;
      var clearing = [], clearStart = 0, placed = [], placedAt = 0;
      var drag = -1, startX = 0, startY = 0, dragX = 0, dragY = 0, pieceX0 = 0, pieceY0 = 0;
      var liftFrom = null, liftStart = 0;
      var ghostR = 0, ghostC = 0, ghostValid = false, prevRows = [], prevCols = [];
      var shards = [], sparks = [], laserBeams = [], shockwaves = [], crossFlares = [], floats = [];
      var screenFlash = { start: 0, dur: 0, color: '#00F0FF' };
      var shakeMag = 0, shakeTime = 0, shakeDur = 0;
      var cell = 0, boardLeft = 0, boardTop = 0, boardSize = 0, trayTop = 0, trayHeight = 0;
      var rotateBtn, bombBtn;

      // Theme state
      var currentThemeKey = Store.getString('bb_theme', 'pastel');
      if (!THEMES[currentThemeKey]) currentThemeKey = 'pastel';
      var currentTheme = THEMES[currentThemeKey];

      var themeTrans = {
        active: false, start: 0, dur: 1000,
        from: currentTheme, to: currentTheme,
        banner: '', subBanner: ''
      };

      function triggerShake(mag, dur) {
        shakeMag = Math.max(shakeMag, mag);
        shakeDur = dur || 260;
        shakeTime = performance.now();
      }

      function addShockwave(x, y, maxR, dur, color) {
        shockwaves.push({
          x: x, y: y, maxR: maxR || cell * 3.5,
          start: performance.now(), dur: dur || 480,
          color: color || currentTheme.shockColor
        });
      }

      function triggerThemeTransition(targetKey, banner, subBanner) {
        if (!THEMES[targetKey]) return;
        var oldTheme = currentTheme;
        currentThemeKey = targetKey;
        currentTheme = THEMES[targetKey];
        Store.putString('bb_theme', currentThemeKey);
        themeTrans.active = true;
        themeTrans.start = performance.now();
        themeTrans.dur = 1100;
        themeTrans.from = oldTheme;
        themeTrans.to = currentTheme;
        themeTrans.banner = banner || '';
        themeTrans.subBanner = subBanner || '';
        updateThemePill();
      }

      function cycleTheme() {
        var idx = THEME_KEYS.indexOf(currentThemeKey);
        var nextKey = THEME_KEYS[(idx + 1) % THEME_KEYS.length];
        triggerThemeTransition(nextKey);
        Sound.play('pop');
      }

      function getThemeColor(colIdx) {
        var pal = currentTheme.pal;
        var i = Math.max(0, colIdx - 1) % pal.length;
        return pal[i] || PAL[i] || '#FF8FAB';
      }

      // UI header: thanh chuỗi phá + nút chọn đề tài
      var streakText = PH.h('span', { class: 'txt' });
      var streakDots = PH.h('span', { class: 'dots' });
      var streakBar = PH.h('div', { class: 'streakbar' }, [streakText, streakDots]);

      var themeBtn = PH.h('button', {
        class: 'bb-theme-pill' + (currentThemeKey === 'neon' ? ' neon-active' : ''),
        onclick: function (e) {
          e.stopPropagation();
          cycleTheme();
        }
      }, [
        PH.h('span', { class: 'bb-theme-txt', text: currentTheme.emoji + ' ' + T(currentTheme.nameKey) })
      ]);

      function updateThemePill() {
        var span = themeBtn.querySelector('.bb-theme-txt');
        if (span) span.textContent = currentTheme.emoji + ' ' + T(currentTheme.nameKey);
        themeBtn.className = 'bb-theme-pill' + (currentThemeKey === 'neon' ? ' neon-active' : '');
      }

      var headerRow = PH.h('div', { class: 'bb-header-row' }, [streakBar, themeBtn]);
      var cv = frame.makeCanvas(null, layout);
      var canvas = cv.canvas;
      frame.stage.insertBefore(headerRow, canvas);

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
            void streakBar.offsetWidth;
            streakBar.classList.add('bump');
          }
        } else {
          streakBar.classList.remove('on', 'hot', 'bump');
        }
      }

      // ------------------------------------------------------------ luật chơi
      function newGame() {
        grid = newGrid(); clearing = []; placed = [];
        shards = []; sparks = []; laserBeams = []; shockwaves = []; crossFlares = [];
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

      function removeCells(list) {
        var now = performance.now();
        clearStart = now;
        clearing = list.map(function (q) { return { r: q[0], c: q[1], color: grid[q[0]][q[1]] }; });

        clearing.forEach(function (q) {
          var cx = boardLeft + (q.c + 0.5) * cell;
          var cy = boardTop + (q.r + 0.5) * cell;
          var colHex = getThemeColor(q.color);
          var darkHex = darken(colHex, 0.38);
          var lightHex = lighten(colHex, 0.42);

          // 8 mảnh vỡ 3D văng theo vật lý
          for (var k = 0; k < 8; k++) {
            var ang = (Math.PI * 2 * k) / 8 + (Math.random() - 0.5) * 0.5;
            var spd = cell * (3.2 + Math.random() * 5.2);
            shards.push({
              x: cx + (Math.random() - 0.5) * cell * 0.35,
              y: cy + (Math.random() - 0.5) * cell * 0.35,
              vx: Math.cos(ang) * spd,
              vy: Math.sin(ang) * spd - cell * 2.8,
              rot: Math.random() * Math.PI * 2,
              vRot: (Math.random() - 0.5) * 16,
              size: cell * (0.24 + Math.random() * 0.16),
              color: colHex,
              colorDark: darkHex,
              colorLight: lightHex,
              start: now,
              dur: 680 + Math.random() * 220
            });
          }

          // 5 tia lửa (sparks)
          for (var s = 0; s < 5; s++) {
            var sAng = Math.random() * Math.PI * 2;
            var sSpd = cell * (6.0 + Math.random() * 8.5);
            sparks.push({
              x: cx, y: cy,
              vx: Math.cos(sAng) * sSpd,
              vy: Math.sin(sAng) * sSpd,
              color: Math.random() > 0.4 ? '#FFFFFF' : colHex,
              start: now,
              dur: 280 + Math.random() * 150
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
        var now = performance.now();

        if (fl.count > 0) {
          streak++; sinceClear = 0;
          var pts = 20 * fl.count * fl.count * streak;
          gained += pts;
          var list = [];
          for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) if (fl.rows[r] || fl.cols[c]) list.push([r, c]);
          removeCells(list);
          frame.addCoins(fl.count * 2);

          var shakePwr = 5 + fl.count * 4 + (streak >= 3 ? 4 : 0);
          triggerShake(shakePwr, 240 + fl.count * 40);

          // Tia laser quét hàng
          for (var rLine = 0; rLine < N; rLine++) {
            if (fl.rows[rLine]) {
              laserBeams.push({
                dir: 'h', index: rLine,
                y: boardTop + (rLine + 0.5) * cell,
                x0: boardLeft, x1: boardLeft + boardSize,
                start: now, dur: 420, color: currentTheme.beamColor
              });
            }
          }
          // Tia laser quét cột
          for (var cLine = 0; cLine < N; cLine++) {
            if (fl.cols[cLine]) {
              laserBeams.push({
                dir: 'v', index: cLine,
                x: boardLeft + (cLine + 0.5) * cell,
                y0: boardTop, y1: boardTop + boardSize,
                start: now, dur: 420, color: currentTheme.beamColor
              });
            }
          }

          // Điểm giao nhau giữa hàng và cột
          for (var ir = 0; ir < N; ir++) {
            if (fl.rows[ir]) {
              for (var ic = 0; ic < N; ic++) {
                if (fl.cols[ic]) {
                  crossFlares.push({
                    x: boardLeft + (ic + 0.5) * cell,
                    y: boardTop + (ir + 0.5) * cell,
                    start: now, dur: 500, color: currentTheme.shockColor
                  });
                }
              }
            }
          }

          addShockwave(cx, cy, cell * (2.8 + fl.count * 1.2), 480, currentTheme.shockColor);

          var col = STREAK_COLORS[Math.min(streak, STREAK_COLORS.length - 1)];
          addFloat('+' + pts, cx, cy, '#FFC94D', 30);
          addFloat(T('bb_streak', streak), boardLeft + boardSize / 2, boardTop + boardSize * 0.36,
            col, Math.min(42, 24 + streak * 2));

          if (fl.count === 2) {
            addFloat(T('bb_double'), cx, cy + cell * 1.0, '#00F0FF', 26);
          } else if (fl.count === 3) {
            addFloat(T('bb_triple'), cx, cy + cell * 1.0, '#FF7B54', 29);
          } else if (fl.count >= 4) {
            addFloat(T('bb_mega'), cx, cy + cell * 1.0, '#FF007F', 34);
          }

          if (streak % 5 === 0) {
            frame.addCoins(5);
            addFloat('🪙 +5', boardLeft + boardSize / 2, boardTop + boardSize * 0.80, '#FFC94D', 24);
          }

          if (streak >= 2) { Sound.play('combo'); Haptics.heavy(); } else { Sound.play('clear'); Haptics.medium(); }

          // KHI DỌN SẠCH TOÀN BỘ BẢNG (PERFECT CLEAR) -> CHUYỂN CẢNH NEON
          if (boardEmpty()) {
            gained += 300;
            frame.addCoins(10);
            Sound.play('win');
            triggerShake(22, 750);

            var nextTheme = currentThemeKey === 'neon' ? 'gold' : 'neon';
            triggerThemeTransition(
              nextTheme,
              '⚡ ' + T('bb_neon_overdrive') + ' ⚡',
              '🏆 ' + T('bb_board_cleared') + ' +300'
            );

            addShockwave(boardLeft + boardSize / 2, boardTop + boardSize / 2, boardSize * 1.7, 850, '#00F0FF');
            addShockwave(boardLeft + boardSize / 2, boardTop + boardSize / 2, boardSize * 1.3, 700, '#FF007F');
            screenFlash = { start: now, dur: 700, color: '#00F0FF' };
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
          var bbx = boardLeft + (c0 + 0.5) * cell, bby = boardTop + (r0 + 0.5) * cell;
          triggerShake(12, 350);
          addShockwave(bbx, bby, cell * 3.2, 500, '#FF4565');
          addFloat('💥 +' + list.length * 2, bbx, bby, '#FF8FAB', 26);
          if (boardEmpty()) {
            addScore(300);
            frame.addCoins(10);
            Sound.play('win');
            triggerShake(22, 750);
            triggerThemeTransition('neon', '⚡ ' + T('bb_neon_overdrive') + ' ⚡', '🏆 ' + T('bb_board_cleared') + ' +300');
            addShockwave(boardLeft + boardSize / 2, boardTop + boardSize / 2, boardSize * 1.7, 850, '#00F0FF');
            screenFlash = { start: performance.now(), dur: 700, color: '#00F0FF' };
          }
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
      function piecePos() {
        return { x: pieceX0 + (dragX - startX) * DRAG_GAIN, y: pieceY0 + (dragY - startY) * DRAG_GAIN };
      }
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
          pieceX0 = pt.x - p.w * cell / 2;
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

      PH.debugBB = {
        setGrid: function (g) { grid = g.map(function (r) { return r.slice(); }); },
        setTray: function (shapes) {
          tray = shapes.map(function (cells) { return cells ? makePiece(cells, 1 + PH.rnd(8)) : null; });
        },
        state: function () { return { score: score, streak: streak, sinceClear: sinceClear, over: over }; },
        layout: function () { return { cell: cell, boardLeft: boardLeft, boardTop: boardTop, trayTop: trayTop, trayHeight: trayHeight, w: cv.w }; },
        setTheme: function (k) { triggerThemeTransition(k); }
      };

      // ------------------------------------------------------------ vẽ khối tùy theo style chủ đề
      function mix(hex, m) {
        var n = parseInt(hex.slice(1), 16);
        var r = Math.round((n >> 16 & 255) * (1 - m) + 255 * m);
        var g = Math.round((n >> 8 & 255) * (1 - m) + 255 * m);
        var b = Math.round((n & 255) * (1 - m) + 255 * m);
        return 'rgb(' + r + ',' + g + ',' + b + ')';
      }

      function drawBlock(ctx, x, y, s, radius, hex, whiteMix, a, isNeon, isGhost, style) {
        ctx.save();
        ctx.globalAlpha = a === undefined ? 1 : a;
        var baseHex = whiteMix ? mix(hex, whiteMix) : hex;

        if (isGhost) {
          ctx.fillStyle = baseHex;
          rr(ctx, x, y, s, s, radius);
          ctx.fill();
          ctx.restore();
          return;
        }

        switch (style) {
          case 'cyber':
            ctx.shadowColor = baseHex;
            ctx.shadowBlur = Math.min(14, s * 0.35);
            ctx.fillStyle = baseHex;
            rr(ctx, x, y, s, s, radius);
            ctx.fill();

            ctx.strokeStyle = lighten(baseHex, 0.45);
            ctx.lineWidth = Math.max(1, s * 0.065);
            ctx.stroke();

            ctx.shadowBlur = 0;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.50)';
            rr(ctx, x + s * 0.14, y + s * 0.12, s * 0.72, s * 0.30, radius * 0.65);
            ctx.fill();

            ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
            rr(ctx, x + s * 0.14, y + s * 0.62, s * 0.72, s * 0.24, radius * 0.6);
            ctx.fill();
            break;

          case 'gem':
            ctx.fillStyle = baseHex;
            rr(ctx, x, y, s, s, radius);
            ctx.fill();

            ctx.fillStyle = lighten(baseHex, 0.35);
            ctx.beginPath();
            ctx.moveTo(x, y); ctx.lineTo(x + s, y); ctx.lineTo(x + s * 0.75, y + s * 0.25); ctx.lineTo(x + s * 0.25, y + s * 0.25);
            ctx.closePath(); ctx.fill();

            ctx.fillStyle = darken(baseHex, 0.35);
            ctx.beginPath();
            ctx.moveTo(x, y + s); ctx.lineTo(x + s, y + s); ctx.lineTo(x + s * 0.75, y + s * 0.75); ctx.lineTo(x + s * 0.25, y + s * 0.75);
            ctx.closePath(); ctx.fill();

            ctx.fillStyle = 'rgba(255,255,255,0.45)';
            rr(ctx, x + s * 0.28, y + s * 0.28, s * 0.44, s * 0.44, radius * 0.4);
            ctx.fill();
            break;

          case 'star':
            ctx.fillStyle = baseHex;
            rr(ctx, x, y, s, s, radius);
            ctx.fill();

            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            rr(ctx, x + s * 0.12, y + s * 0.10, s * 0.76, s * 0.32, radius * 0.7);
            ctx.fill();

            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold ' + Math.floor(s * 0.44) + 'px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('✦', x + s / 2, y + s / 2 + 1);
            break;

          case 'stripes':
            ctx.fillStyle = baseHex;
            rr(ctx, x, y, s, s, radius);
            ctx.fill();

            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            rr(ctx, x + s * 0.1, y + s * 0.08, s * 0.8, s * 0.25, radius * 0.6);
            ctx.fill();

            ctx.fillStyle = 'rgba(0,0,0,0.22)';
            ctx.fillRect(x + s * 0.12, y + s * 0.48, s * 0.76, s * 0.09);
            ctx.fillRect(x + s * 0.16, y + s * 0.66, s * 0.68, s * 0.09);
            break;

          case 'leaf':
            ctx.fillStyle = baseHex;
            rr(ctx, x, y, s, s, radius);
            ctx.fill();

            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            rr(ctx, x + s * 0.1, y + s * 0.08, s * 0.8, s * 0.3, radius * 0.6);
            ctx.fill();

            ctx.font = Math.floor(s * 0.42) + 'px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🌿', x + s / 2, y + s / 2 + 1);
            break;

          case 'dots':
            ctx.fillStyle = baseHex;
            rr(ctx, x, y, s, s, radius);
            ctx.fill();

            ctx.fillStyle = 'rgba(255,255,255,0.6)';
            var dotR = s * 0.09;
            ctx.beginPath();
            ctx.arc(x + s * 0.32, y + s * 0.32, dotR, 0, Math.PI * 2);
            ctx.arc(x + s * 0.68, y + s * 0.38, dotR, 0, Math.PI * 2);
            ctx.arc(x + s * 0.48, y + s * 0.68, dotR * 1.2, 0, Math.PI * 2);
            ctx.fill();
            break;

          case 'lava':
            ctx.fillStyle = baseHex;
            rr(ctx, x, y, s, s, radius);
            ctx.fill();

            ctx.shadowColor = '#FF2A00';
            ctx.shadowBlur = 8;
            ctx.fillStyle = '#FFE600';
            rr(ctx, x + s * 0.25, y + s * 0.25, s * 0.5, s * 0.5, radius * 0.5);
            ctx.fill();
            ctx.shadowBlur = 0;
            break;

          case 'ice':
            ctx.fillStyle = baseHex;
            rr(ctx, x, y, s, s, radius);
            ctx.fill();

            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            rr(ctx, x + s * 0.1, y + s * 0.08, s * 0.8, s * 0.3, radius * 0.6);
            ctx.fill();

            ctx.font = 'bold ' + Math.floor(s * 0.46) + 'px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#FFFFFF';
            ctx.fillText('❄', x + s / 2, y + s / 2 + 1);
            break;

          case 'gold':
            ctx.fillStyle = baseHex;
            rr(ctx, x, y, s, s, radius);
            ctx.fill();

            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 1.2;
            rr(ctx, x + 2, y + 2, s - 4, s - 4, radius * 0.7);
            ctx.stroke();

            ctx.font = Math.floor(s * 0.38) + 'px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('💎', x + s / 2, y + s / 2 + 1);
            break;

          case 'jelly':
          default:
            ctx.fillStyle = baseHex;
            rr(ctx, x, y, s, s, radius);
            ctx.fill();

            ctx.fillStyle = 'rgba(255, 255, 255, 0.38)';
            rr(ctx, x + s * 0.12, y + s * 0.10, s * 0.76, s * 0.32, radius * 0.7);
            ctx.fill();

            ctx.fillStyle = 'rgba(0, 0, 0, 0.14)';
            rr(ctx, x + s * 0.12, y + s * 0.72, s * 0.76, s * 0.18, radius * 0.5);
            ctx.fill();
            break;
        }
        ctx.restore();
      }

      frame.loop(function (now) {
        var ctx = cv.ctx;
        ctx.clearRect(0, 0, cv.w, cv.h);
        if (!cell) return;
        var gap = Math.max(1.5, cell * 0.045), radius = cell * 0.2, r, c, i;

        // ---- 1. Screen Shake ----
        ctx.save();
        var shakeElapsed = now - shakeTime;
        if (shakeElapsed < shakeDur) {
          var decay = 1 - (shakeElapsed / shakeDur);
          var curMag = shakeMag * decay * decay;
          var ox = (Math.random() - 0.5) * 2 * curMag;
          var oy = (Math.random() - 0.5) * 2 * curMag;
          ctx.translate(ox, oy);
        } else {
          shakeMag = 0;
        }

        // ---- 2. Tính toán Theme & Smooth Transition ----
        var curBoardBg, curEmptyCell, curBorderCol, isNeonMode;
        if (themeTrans.active) {
          var tp = PH.clamp((now - themeTrans.start) / themeTrans.dur, 0, 1);
          var easeTp = easeOut(tp);
          curBoardBg = lerpColor(themeTrans.from.boardBg, themeTrans.to.boardBg, easeTp);
          curEmptyCell = lerpColor(themeTrans.from.emptyCell, themeTrans.to.emptyCell, easeTp);
          curBorderCol = lerpColor(themeTrans.from.boardBorder, themeTrans.to.boardBorder, easeTp);
          isNeonMode = (easeTp > 0.4 && themeTrans.to.dark) || (easeTp <= 0.4 && themeTrans.from.dark);
          if (tp >= 1) themeTrans.active = false;
        } else {
          curBoardBg = currentTheme.boardBg;
          curEmptyCell = currentTheme.emptyCell;
          curBorderCol = currentTheme.boardBorder;
          isNeonMode = currentTheme.dark;
        }

        // Ambient cyber motes (hạt bụi không gian trong chế độ Neon)
        if (isNeonMode) {
          for (var m = 0; m < 12; m++) {
            var mx = boardLeft + ((Math.sin(now * 0.0006 + m * 1.8) * 0.5 + 0.5) * boardSize);
            var my = boardTop + ((now * 0.04 + m * 55) % (boardSize + 40)) - 20;
            ctx.fillStyle = PH.alpha(currentTheme.shockColor, 0.25 + 0.2 * Math.sin(now * 0.003 + m));
            ctx.beginPath();
            ctx.arc(mx, my, 1.8, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // Nền bảng
        ctx.fillStyle = curBoardBg;
        rr(ctx, boardLeft - gap * 2, boardTop - gap * 2, boardSize + gap * 4, boardSize + gap * 4, radius * 1.4);
        ctx.fill();

        // Viền hào quang của bảng nếu ở chế độ tối/neon
        if (isNeonMode) {
          ctx.save();
          ctx.strokeStyle = curBorderCol;
          ctx.lineWidth = 2.5;
          ctx.shadowColor = curBorderCol;
          ctx.shadowBlur = 12;
          rr(ctx, boardLeft - gap * 2, boardTop - gap * 2, boardSize + gap * 4, boardSize + gap * 4, radius * 1.4);
          ctx.stroke();
          ctx.restore();
        }

        // Lưới ô cờ
        var popK = Math.min(1, (now - placedAt) / PLACE_POP_MS);
        for (r = 0; r < N; r++) for (c = 0; c < N; c++) {
          var l = boardLeft + c * cell + gap, t = boardTop + r * cell + gap, s = cell - 2 * gap;
          ctx.fillStyle = curEmptyCell;
          rr(ctx, l, t, s, s, radius);
          ctx.fill();

          if (isNeonMode && currentTheme.emptyBorder !== 'transparent') {
            ctx.strokeStyle = currentTheme.emptyBorder;
            ctx.lineWidth = 1;
            rr(ctx, l, t, s, s, radius);
            ctx.stroke();
          }

          if (!grid[r][c]) continue;
          var sc = 1;
          if (popK < 1) {
            for (i = 0; i < placed.length; i++) {
              if (placed[i][0] === r && placed[i][1] === c) { sc = 0.82 + 0.18 * easeOut(popK); break; }
            }
          }
          var off = s * (1 - sc) / 2;
          drawBlock(ctx, l + off, t + off, s * sc, radius * sc, getThemeColor(grid[r][c]), 0, 1, isNeonMode, false, currentTheme.style);
        }

        // Các ô đang bị kích nổ phá: 70ms đầu chớp trắng rực, sau đó co lại
        var ck = (now - clearStart) / CLEAR_MS;
        if (ck < 1) {
          clearing.forEach(function (q) {
            var l2 = boardLeft + q.c * cell + gap, t2 = boardTop + q.r * cell + gap, s2 = cell - 2 * gap;
            var col = getThemeColor(q.color);
            if (ck < 0.22) {
              var heatSc = 1.08;
              var heatOff = s2 * (1 - heatSc) / 2;
              drawBlock(ctx, l2 + heatOff, t2 + heatOff, s2 * heatSc, radius, col, 0.95, 1, isNeonMode, false, currentTheme.style);
            } else {
              var shrinkK = (ck - 0.22) / 0.78;
              var sz = s2 * (1 - 0.9 * shrinkK), o2 = (s2 - sz) / 2;
              drawBlock(ctx, l2 + o2, t2 + o2, sz, radius * (sz / s2), col, 0.3 * (1 - shrinkK), 1 - shrinkK * 0.5, isNeonMode, false, currentTheme.style);
            }
          });
        } else if (clearing.length) clearing = [];

        // Laser beam sweeping lines
        laserBeams = laserBeams.filter(function (lb) { return now - lb.start < lb.dur; });
        laserBeams.forEach(function (lb) {
          var lp = (now - lb.start) / lb.dur;
          var beamAlpha = lp < 0.25 ? lp / 0.25 : 1 - (lp - 0.25) / 0.75;
          ctx.save();
          if (lb.dir === 'h') {
            var beamThickness = cell * 0.85 * (1 - lp * 0.7);
            var bY = lb.y - beamThickness / 2;
            var bGrad = ctx.createLinearGradient(0, bY, 0, bY + beamThickness);
            bGrad.addColorStop(0, 'rgba(255,255,255,0)');
            bGrad.addColorStop(0.3, PH.alpha(lb.color, beamAlpha * 0.75));
            bGrad.addColorStop(0.5, 'rgba(255,255,255,' + beamAlpha + ')');
            bGrad.addColorStop(0.7, PH.alpha(lb.color, beamAlpha * 0.75));
            bGrad.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = bGrad;
            ctx.fillRect(lb.x0, bY, lb.x1 - lb.x0, beamThickness);

            ctx.fillStyle = 'rgba(255,255,255,' + beamAlpha * 0.9 + ')';
            ctx.fillRect(lb.x0, lb.y - cell * 0.08, lb.x1 - lb.x0, cell * 0.16);
          } else {
            var beamW = cell * 0.85 * (1 - lp * 0.7);
            var bX = lb.x - beamW / 2;
            var bGradV = ctx.createLinearGradient(bX, 0, bX + beamW, 0);
            bGradV.addColorStop(0, 'rgba(255,255,255,0)');
            bGradV.addColorStop(0.3, PH.alpha(lb.color, beamAlpha * 0.75));
            bGradV.addColorStop(0.5, 'rgba(255,255,255,' + beamAlpha + ')');
            bGradV.addColorStop(0.7, PH.alpha(lb.color, beamAlpha * 0.75));
            bGradV.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = bGradV;
            ctx.fillRect(bX, lb.y0, beamW, lb.y1 - lb.y0);

            ctx.fillStyle = 'rgba(255,255,255,' + beamAlpha * 0.9 + ')';
            ctx.fillRect(lb.x - cell * 0.08, lb.y0, cell * 0.16, lb.y1 - lb.y0);
          }
          ctx.restore();
        });

        // Cross flares tại điểm giao hàng/cột
        crossFlares = crossFlares.filter(function (cf) { return now - cf.start < cf.dur; });
        crossFlares.forEach(function (cf) {
          var cp = (now - cf.start) / cf.dur;
          var cfAlpha = 1 - cp;
          var fR = cell * (1.2 + cp * 1.5);
          ctx.save();
          ctx.translate(cf.x, cf.y);
          ctx.rotate(cp * 1.2);
          ctx.strokeStyle = PH.alpha('#FFFFFF', cfAlpha);
          ctx.lineWidth = Math.max(1, 3 * (1 - cp));
          ctx.beginPath();
          ctx.moveTo(-fR, 0); ctx.lineTo(fR, 0);
          ctx.moveTo(0, -fR); ctx.lineTo(0, fR);
          ctx.stroke();
          ctx.fillStyle = PH.alpha(cf.color, cfAlpha * 0.8);
          ctx.beginPath(); ctx.arc(0, 0, cell * 0.45 * (1 - cp), 0, Math.PI * 2); ctx.fill();
          ctx.restore();
        });

        // Expanding Shockwave rings
        shockwaves = shockwaves.filter(function (sw) { return now - sw.start < sw.dur; });
        shockwaves.forEach(function (sw) {
          var sp = (now - sw.start) / sw.dur;
          var curR = sw.maxR * Math.sqrt(sp);
          ctx.save();
          ctx.beginPath();
          ctx.arc(sw.x, sw.y, curR, 0, Math.PI * 2);
          ctx.lineWidth = Math.max(1, (1 - sp) * 6);
          ctx.strokeStyle = PH.alpha(sw.color, (1 - sp) * 0.85);
          ctx.stroke();
          ctx.restore();
        });

        // 3D Shards (mảnh vỡ gạch 3D)
        shards = shards.filter(function (sh) { return now - sh.start < sh.dur; });
        shards.forEach(function (sh) {
          var dt = (now - sh.start) / 1000;
          var p = (now - sh.start) / sh.dur;
          var px = sh.x + sh.vx * dt;
          var py = sh.y + sh.vy * dt + 0.5 * (cell * 16) * dt * dt;
          var alpha = 1 - p * p;
          var sz = sh.size * (1 - p * 0.35);

          ctx.save();
          ctx.translate(px, py);
          ctx.rotate(sh.rot + sh.vRot * dt);
          ctx.globalAlpha = Math.max(0, alpha);

          if (isNeonMode) {
            ctx.shadowColor = sh.color;
            ctx.shadowBlur = 6;
          }

          ctx.fillStyle = sh.color;
          ctx.fillRect(-sz / 2, -sz / 2, sz, sz);

          ctx.fillStyle = sh.colorLight;
          ctx.fillRect(-sz / 2, -sz / 2, sz, sz * 0.28);
          ctx.fillRect(-sz / 2, -sz / 2, sz * 0.28, sz);

          ctx.fillStyle = sh.colorDark;
          ctx.fillRect(-sz / 2, sz / 2 - sz * 0.28, sz, sz * 0.28);
          ctx.fillRect(sz / 2 - sz * 0.28, -sz / 2, sz * 0.28, sz);

          ctx.restore();
        });

        // Sparks (tia lửa hạt)
        sparks = sparks.filter(function (sp) { return now - sp.start < sp.dur; });
        sparks.forEach(function (sp) {
          var dt2 = (now - sp.start) / 1000;
          var spP = (now - sp.start) / sp.dur;
          var px2 = sp.x + sp.vx * dt2;
          var py2 = sp.y + sp.vy * dt2 + 0.5 * (cell * 8) * dt2 * dt2;

          ctx.save();
          ctx.strokeStyle = PH.alpha(sp.color, 1 - spP);
          ctx.lineWidth = Math.max(1, 2.5 * (1 - spP));
          ctx.beginPath();
          ctx.moveTo(px2 - sp.vx * 0.02, py2 - sp.vy * 0.02);
          ctx.lineTo(px2, py2);
          ctx.stroke();
          ctx.restore();
        });

        // Ghost piece & line highlights khi kéo khối
        if (drag >= 0 && ghostValid) {
          for (r = 0; r < N; r++) for (c = 0; c < N; c++) {
            if (prevRows[r] || prevCols[c]) {
              ctx.fillStyle = isNeonMode ? 'rgba(0, 240, 255, 0.28)' : 'rgba(255,255,255,0.4)';
              rr(ctx, boardLeft + c * cell + gap, boardTop + r * cell + gap, cell - 2 * gap, cell - 2 * gap, radius);
              ctx.fill();
            }
          }
          var gp = tray[drag];
          gp.cells.forEach(function (cl) {
            drawBlock(ctx, boardLeft + (ghostC + cl[1]) * cell + gap, boardTop + (ghostR + cl[0]) * cell + gap,
              cell - 2 * gap, radius, getThemeColor(gp.color), 0, 0.45, isNeonMode, true, currentTheme.style);
          });
        }

        // Khay đựng 3 khối (Tray)
        var slotW = cv.w / 3;
        for (i = 0; i < 3; i++) {
          var p2 = tray[i];
          if (!p2 || i === drag) continue;
          var tc = trayCellFor(p2, slotW), pw = p2.w * tc, ph = p2.h * tc;
          var ox2 = slotW * i + (slotW - pw) / 2, oy2 = trayTop + (trayHeight - ph) / 2, tg = Math.max(1, tc * 0.05);
          p2.cells.forEach(function (cl) {
            drawBlock(ctx, ox2 + cl[1] * tc + tg, oy2 + cl[0] * tc + tg, tc - 2 * tg, tc * 0.2, getThemeColor(p2.color), 0, 1, isNeonMode, false, currentTheme.style);
          });
        }

        // Khối đang kéo (nhấc lên và bay theo ngón tay)
        if (drag >= 0 && tray[drag]) {
          var dp = tray[drag], pp = piecePos(), e = easeOut(Math.min(1, (now - liftStart) / LIFT_MS));
          var size = liftFrom.c + (cell - liftFrom.c) * e;
          var x0 = liftFrom.x + (pp.x - liftFrom.x) * e, y0 = liftFrom.y + (pp.y - liftFrom.y) * e;
          var g2 = Math.max(1.5, size * 0.045);
          ctx.save();
          ctx.shadowColor = isNeonMode ? getThemeColor(dp.color) : 'rgba(61,58,92,0.25)';
          ctx.shadowBlur = isNeonMode ? 16 : 12;
          ctx.shadowOffsetY = isNeonMode ? 0 : 6;
          dp.cells.forEach(function (cl) {
            drawBlock(ctx, x0 + cl[1] * size + g2, y0 + cl[0] * size + g2, size - 2 * g2, size * 0.2, getThemeColor(dp.color), 0, 1, isNeonMode, false, currentTheme.style);
          });
          ctx.restore();
        }

        // Full screen flash burst (khi board clear / chuyển cảnh)
        if (now - screenFlash.start < screenFlash.dur) {
          var fp = (now - screenFlash.start) / screenFlash.dur;
          ctx.fillStyle = PH.alpha(screenFlash.color, (1 - fp) * 0.45);
          ctx.fillRect(0, 0, cv.w, cv.h);
        }

        // Transition banner overlay (khi chuyển cảnh sang Neon)
        if (themeTrans.active && themeTrans.banner) {
          var tbp = (now - themeTrans.start) / themeTrans.dur;
          var bannerAlpha = tbp < 0.2 ? tbp / 0.2 : 1 - (tbp - 0.2) / 0.8;
          var bannerScale = tbp < 0.15 ? 0.7 + 2 * tbp : 1;
          ctx.save();
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.font = '900 ' + Math.round(28 * bannerScale) + 'px -apple-system, Arial, sans-serif';
          ctx.shadowColor = '#00F0FF'; ctx.shadowBlur = 18;
          ctx.fillStyle = PH.alpha('#FFFFFF', bannerAlpha);
          ctx.fillText(themeTrans.banner, cv.w / 2, boardTop + boardSize * 0.44);

          if (themeTrans.subBanner) {
            ctx.font = '800 ' + Math.round(20 * bannerScale) + 'px -apple-system, Arial, sans-serif';
            ctx.shadowColor = '#FF007F'; ctx.shadowBlur = 14;
            ctx.fillStyle = PH.alpha('#FFC94D', bannerAlpha);
            ctx.fillText(themeTrans.subBanner, cv.w / 2, boardTop + boardSize * 0.54);
          }
          ctx.restore();
        }

        // Floating texts (điểm số, combo, v.v.)
        floats = floats.filter(function (f) { return now - f.start < 1000; });
        ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
        floats.forEach(function (f) {
          var t4 = (now - f.start) / 1000;
          var grow = t4 < 0.15 ? 0.7 + 2.2 * t4 : 1;
          var fSize = Math.round(f.size * grow);
          ctx.save();
          ctx.font = '900 ' + fSize + 'px -apple-system, Arial, sans-serif';

          if (isNeonMode) {
            ctx.shadowColor = f.color;
            ctx.shadowBlur = 12;
            ctx.strokeStyle = '#0B091A';
            ctx.lineWidth = 4;
            ctx.strokeText(f.text, f.x, f.y - cell * 1.15 * t4);
          } else {
            ctx.shadowColor = 'rgba(61,58,92,' + 0.6 * (1 - t4) + ')';
            ctx.shadowBlur = 5; ctx.shadowOffsetY = 2;
          }

          ctx.fillStyle = PH.alpha(f.color, 1 - t4 * t4);
          ctx.fillText(f.text, f.x, f.y - cell * 1.15 * t4);
          ctx.restore();
        });

        // Kết thúc Screen Shake transform
        ctx.restore();
      });
    }
  };
})();
