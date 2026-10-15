/* Block Blast - bản web. Bảng 8x8, kéo thả 3 khối, phá hàng/cột.
   CHUỖI PHÁ & COMBO: Bùng nổ trung tâm (Center-Board Combo), hào quang rực rỡ, linh vật cổ vũ.
   ĐIỂM SỐ: Huy hiệu kim cương phát sáng (Diamond Badge), số đếm mượt (Rolling Ticker), điểm cao vương miện.
   10 CHỦ ĐỀ & KHỐI 3D VÁT CẠNH: Hồng Phấn, Rừng Xanh, Gỗ Mộc, Đất Nung, Lam Ngọc, Neon, Thạch Anh, Hoàng Hôn, Băng Tuyết, Hoàng Kim.
   Ô vuông bàn cờ chìm tinh xảo chuẩn Block Blast, linh vật đứng góc trên bên phải, kéo thả x1.35, tự hút ô hợp lệ. */
(function () {
  'use strict';
  var PH = window.PH, T = PH.T, rr = PH.rr, PAL = PH.PALETTE, Sound = PH.Sound, Haptics = PH.Haptics, Store = PH.Store;
  var N = 8;
  var COST_ROTATE = 15, COST_REROLL = 30, COST_BOMB = 50;
  var STREAK_WINDOW = 3;
  var DRAG_GAIN = 1.35;
  var CLEAR_MS = 320, LIFT_MS = 110, PLACE_POP_MS = 150;

  // ── 10 BẢNG MÀU & CHỦ ĐỀ CHUẨN NGUYÊN BẢN MOBILE ──────────────
  var THEMES = {
    rose: {
      id: 'rose', nameKey: 'bb_theme_rose', emoji: '🌸',
      bg: '#D47F96', boardBg: '#A8596F', emptyCell: '#944C61', boardBorder: '#BE6D83',
      pal: ['#F28CA4', '#E06B88', '#D65173', '#F7ADC0', '#C13B5E', '#FAA1B6', '#E87A95', '#F59FB3'],
      diamondColor: '#00E5FF', beamColor: '#FFD54F', shockColor: '#00E5FF',
      dark: false, style: 'bevel_smooth'
    },
    forest: {
      id: 'forest', nameKey: 'bb_theme_forest', emoji: '🌲',
      bg: '#284428', boardBg: '#1D351D', emptyCell: '#152915', boardBorder: '#385C38',
      pal: ['#8BA358', '#5F7F3B', '#7A9A8B', '#B8C5A5', '#D2B558', '#4E6B34', '#99B87A', '#A3B899'],
      diamondColor: '#FFD700', beamColor: '#80ED99', shockColor: '#FFD700',
      dark: true, style: 'bevel_matte'
    },
    wood: {
      id: 'wood', nameKey: 'bb_theme_wood', emoji: '🪵',
      bg: '#4E3E34', boardBg: '#382A22', emptyCell: '#2A1E17', boardBorder: '#634E42',
      pal: ['#E8D7C3', '#D6C0A6', '#C7AA88', '#F2E8DC', '#E0CBB2', '#BA9977', '#EFE4D6', '#CDAF90'],
      diamondColor: '#FFD700', beamColor: '#F3E5AB', shockColor: '#FFD700',
      dark: true, style: 'bevel_stone'
    },
    terracotta: {
      id: 'terracotta', nameKey: 'bb_theme_terracotta', emoji: '🏺',
      bg: '#753D28', boardBg: '#542616', emptyCell: '#401A0D', boardBorder: '#8A4832',
      pal: ['#869CA9', '#DF7D52', '#C65A35', '#EAA86C', '#6E8594', '#D26B43', '#9BB0BD', '#F0B780'],
      diamondColor: '#00E5FF', beamColor: '#FFAA00', shockColor: '#00E5FF',
      dark: true, style: 'bevel_clay'
    },
    sapphire: {
      id: 'sapphire', nameKey: 'bb_theme_sapphire', emoji: '💎',
      bg: '#1C2742', boardBg: '#121A2D', emptyCell: '#0C1221', boardBorder: '#2B3D66',
      pal: ['#3B82F6', '#60A5FA', '#2563EB', '#93C5FD', '#1D4ED8', '#38BDF8', '#7DD3FC', '#1E40AF'],
      diamondColor: '#00F0FF', beamColor: '#60A5FA', shockColor: '#00F0FF',
      dark: true, style: 'bevel_smooth'
    },
    neon: {
      id: 'neon', nameKey: 'bb_theme_neon', emoji: '⚡',
      bg: '#0E0B1C', boardBg: '#080612', emptyCell: '#140E26', boardBorder: '#00F0FF',
      pal: ['#00F0FF', '#FF007F', '#39FF14', '#FFE600', '#B026FF', '#FF5E00', '#00E5FF', '#FF3366'],
      diamondColor: '#FF007F', beamColor: '#00F0FF', shockColor: '#FF007F',
      dark: true, style: 'bevel_neon'
    },
    amethyst: {
      id: 'amethyst', nameKey: 'bb_theme_amethyst', emoji: '🔮',
      bg: '#3A224E', boardBg: '#271436', emptyCell: '#1C0D28', boardBorder: '#522F6E',
      pal: ['#C084FC', '#A855F7', '#9333EA', '#D8B4FE', '#E879F9', '#7E22CE', '#F472B6', '#C084FC'],
      diamondColor: '#FFE600', beamColor: '#E879F9', shockColor: '#FFE600',
      dark: true, style: 'bevel_smooth'
    },
    sunset: {
      id: 'sunset', nameKey: 'bb_theme_sunset', emoji: '🌅',
      bg: '#52262E', boardBg: '#38161D', emptyCell: '#290D13', boardBorder: '#6E323D',
      pal: ['#FF6B6B', '#FFA07A', '#FF7F50', '#FFD166', '#EE5253', '#F368E0', '#FF9F43', '#FECA57'],
      diamondColor: '#FFD700', beamColor: '#FFA07A', shockColor: '#FFD700',
      dark: true, style: 'bevel_smooth'
    },
    glacier: {
      id: 'glacier', nameKey: 'bb_theme_glacier', emoji: '❄️',
      bg: '#1C3442', boardBg: '#12222C', emptyCell: '#0B161E', boardBorder: '#2B4D61',
      pal: ['#67E8F9', '#38BDF8', '#A5F3FC', '#06B6D4', '#7DD3FC', '#BAE6FD', '#0284C7', '#E0F2FE'],
      diamondColor: '#38BDF8', beamColor: '#A5F3FC', shockColor: '#38BDF8',
      dark: true, style: 'bevel_smooth'
    },
    gold: {
      id: 'gold', nameKey: 'bb_theme_gold', emoji: '👑',
      bg: '#3B2D14', boardBg: '#271C0A', emptyCell: '#1C1205', boardBorder: '#57421F',
      pal: ['#FBBF24', '#F59E0B', '#D97706', '#FDE68A', '#B45309', '#FCD34D', '#EAB308', '#CA8A04'],
      diamondColor: '#00F0FF', beamColor: '#FFE066', shockColor: '#FFD700',
      dark: true, style: 'bevel_smooth'
    }
  };

  var THEME_KEYS = ['rose', 'forest', 'wood', 'terracotta', 'sapphire', 'neon', 'amethyst', 'sunset', 'glacier', 'gold'];

  var THEME_MAP = {
    pastel: 'rose', ocean: 'sapphire', galaxy: 'amethyst',
    candy: 'rose', volcano: 'terracotta', frost: 'glacier'
  };

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

  // ---- Logic Bảng Cờ ----
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

  function generateTray(grid) {
    var clearing = getClearingShapes(grid);
    var a, t;
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
  function easeOutBack(t) {
    var c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  // ── VẼ KHỐI 3D VÁT CẠNH CHUẨN NGUYÊN BẢN (BEVELED 3D TILE) ─────
  // ── VẼ KHỐI 3D VÁT CẠNH (TẤT CẢ CHỦ ĐỀ ĐỀU CHUẨN FORM NHƯ ROSE PINK, HỌA TIẾT THEO CHỦ ĐỀ) ─────
  function drawBevelBlock(ctx, x, y, s, radius, hex, whiteMix, alpha, themeId, isGhost, isFlash) {
    ctx.save();
    ctx.globalAlpha = alpha === undefined ? 1 : alpha;

    if (isGhost) {
      ctx.fillStyle = hex;
      ctx.globalAlpha = 0.38;
      rr(ctx, x, y, s, s, radius);
      ctx.fill();
      ctx.strokeStyle = lighten(hex, 0.45);
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
      return;
    }

    var baseHex = isFlash ? '#FFFFFF' : (whiteMix ? lighten(hex, whiteMix) : hex);
    var bw = Math.max(2, Math.round(s * 0.14)); // Vát cạnh thanh thoát chuẩn 14%

    // Bo góc tinh tế, sắc nét chuẩn form Rose Pink
    ctx.beginPath();
    rr(ctx, x, y, s, s, radius);
    ctx.clip();

    // 0. Đổ nền chính
    ctx.fillStyle = baseHex;
    ctx.fillRect(x, y, s, s);

    var ix0 = x + bw, iy0 = y + bw;
    var ix1 = x + s - bw, iy1 = y + s - bw;

    // 1. Vát trên (Top Bevel - ánh sáng phản quang tự nhiên: +30% lighten)
    ctx.fillStyle = lighten(baseHex, 0.30);
    ctx.beginPath();
    ctx.moveTo(x, y); ctx.lineTo(x + s, y); ctx.lineTo(ix1, iy0); ctx.lineTo(ix0, iy0);
    ctx.closePath(); ctx.fill();

    // 2. Vát trái (Left Bevel - ánh sáng dịu: +14% lighten)
    ctx.fillStyle = lighten(baseHex, 0.14);
    ctx.beginPath();
    ctx.moveTo(x, y); ctx.lineTo(ix0, iy0); ctx.lineTo(ix0, iy1); ctx.lineTo(x, y + s);
    ctx.closePath(); ctx.fill();

    // 3. Vát phải (Right Bevel - đổ bóng mềm: -14% darken)
    ctx.fillStyle = darken(baseHex, 0.14);
    ctx.beginPath();
    ctx.moveTo(x + s, y); ctx.lineTo(x + s, y + s); ctx.lineTo(ix1, iy1); ctx.lineTo(ix1, iy0);
    ctx.closePath(); ctx.fill();

    // 4. Vát dưới (Bottom Bevel - đổ bóng khối 3D rõ nét: -30% darken)
    ctx.fillStyle = darken(baseHex, 0.30);
    ctx.beginPath();
    ctx.moveTo(x, y + s); ctx.lineTo(ix0, iy1); ctx.lineTo(ix1, iy1); ctx.lineTo(x + s, y + s);
    ctx.closePath(); ctx.fill();

    // 5. Mặt phẳng tâm (Flat Center Face)
    ctx.fillStyle = baseHex;
    ctx.fillRect(ix0, iy0, ix1 - ix0, iy1 - iy0);

    // 6. Họa tiết tinh xảo tùy theo từng chủ đề trên mặt khối (giữ nguyên 100% form vát 3D chuẩn):
    switch (themeId) {
      case 'forest':
        // Rừng Xanh: Vệt bóng lá hữu cơ nhẹ nhàng + đường gân lá thanh tú
        ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
        ctx.fillRect(ix0 + 2, iy0 + 2, ix1 - ix0 - 4, Math.max(1.5, s * 0.08));
        ctx.strokeStyle = 'rgba(25, 60, 25, 0.16)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(ix0 + (ix1 - ix0) * 0.25, iy1 - 3);
        ctx.lineTo(ix1 - 3, iy0 + (iy1 - iy0) * 0.25);
        ctx.stroke();
        break;

      case 'wood':
        // Gỗ Mộc / Travertine: Vân đá travertine / thớ gỗ cẩm thạch sang trọng
        ctx.fillStyle = 'rgba(255, 255, 255, 0.20)';
        ctx.fillRect(ix0 + 2, iy0 + 2, ix1 - ix0 - 4, Math.max(1.5, s * 0.08));
        ctx.fillStyle = 'rgba(90, 60, 40, 0.15)';
        ctx.fillRect(ix0 + 3, iy0 + (iy1 - iy0) * 0.42, (ix1 - ix0) * 0.72, 1.2);
        ctx.fillRect(ix0 + (ix1 - ix0) * 0.25, iy0 + (iy1 - iy0) * 0.74, (ix1 - ix0) * 0.65, 1.2);
        break;

      case 'terracotta':
        // Đất Nung: Chất gốm nung mộc mạc với vệt men đất
        ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
        ctx.fillRect(ix0 + 2, iy0 + 2, ix1 - ix0 - 4, Math.max(1.5, s * 0.08));
        ctx.fillStyle = 'rgba(70, 25, 12, 0.12)';
        ctx.fillRect(ix0 + 3, iy0 + (iy1 - iy0) * 0.50, (ix1 - ix0) * 0.62, 1);
        break;

      case 'sapphire':
        // Lam Ngọc: Giác cắt kim cương lấp lánh (sparkle glint)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.26)';
        ctx.fillRect(ix0 + 2, iy0 + 2, ix1 - ix0 - 4, Math.max(1.5, s * 0.09));
        ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        var scx = (ix0 + ix1) / 2, scy = (iy0 + iy1) / 2;
        ctx.beginPath();
        ctx.arc(scx, scy, Math.max(1.5, s * 0.05), 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'neon':
        // Dạ Quang (Neon): Đường viền lõi cyber sáng rực
        ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.fillRect(ix0 + 2, iy0 + 2, ix1 - ix0 - 4, Math.max(1.5, s * 0.09));
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1;
        ctx.strokeRect(ix0 + 2, iy0 + 2, ix1 - ix0 - 4, iy1 - iy0 - 4);
        break;

      case 'amethyst':
        // Thạch Anh: Ánh tím pha lê huyền ảo
        ctx.fillStyle = 'rgba(255, 255, 255, 0.24)';
        ctx.fillRect(ix0 + 2, iy0 + 2, ix1 - ix0 - 4, Math.max(1.5, s * 0.08));
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(ix0 + 3, iy1 - 3);
        ctx.lineTo(ix1 - 3, iy0 + 3);
        ctx.stroke();
        break;

      case 'sunset':
        // Hoàng Hôn: Ánh sáng mặt trời rạng rỡ
        ctx.fillStyle = 'rgba(255, 240, 200, 0.28)';
        ctx.fillRect(ix0 + 2, iy0 + 2, ix1 - ix0 - 4, Math.max(1.5, s * 0.09));
        break;

      case 'glacier':
        // Băng Tuyết: Tinh thể băng tuyết sắc lạnh
        ctx.fillStyle = 'rgba(255, 255, 255, 0.30)';
        ctx.fillRect(ix0 + 2, iy0 + 2, ix1 - ix0 - 4, Math.max(1.5, s * 0.08));
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(ix0 + 3, iy0 + (iy1 - iy0) * 0.3);
        ctx.lineTo(ix1 - 3, iy0 + (iy1 - iy0) * 0.7);
        ctx.stroke();
        break;

      case 'gold':
        // Hoàng Kim: Ánh vàng kim hoàng gia
        ctx.fillStyle = 'rgba(255, 255, 255, 0.32)';
        ctx.fillRect(ix0 + 2, iy0 + 2, ix1 - ix0 - 4, Math.max(1.5, s * 0.09));
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.30)';
        ctx.lineWidth = 1;
        var gcx = (ix0 + ix1) / 2, gcy = (iy0 + iy1) / 2, gr = Math.max(2, s * 0.12);
        ctx.strokeRect(gcx - gr, gcy - gr, gr * 2, gr * 2);
        break;

      case 'rose':
      default:
        // Hồng Phấn: Lớp phủ bóng nhựa trong suốt mượt mà chuẩn mẫu
        ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
        ctx.fillRect(ix0 + 2, iy0 + 2, ix1 - ix0 - 4, Math.max(1.5, s * 0.10));
        break;
    }

    ctx.restore();
  }

  // ── VẼ LINH VẬT MASCOT BÊN GÓC TRÊN PHẢI BÀN CỜ ───────────────
  function drawMascot(ctx, x, y, size, isCheering, now) {
    ctx.save();
    var bounce = isCheering ? Math.abs(Math.sin(now * 0.014)) * 10 : Math.sin(now * 0.003) * 2;
    var mx = x, my = y - bounce;
    var w = size * 0.95, h = size * 1.15;
    var blink = !isCheering && (Math.sin(now * 0.002) > 0.96);

    // Bóng mascot
    ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
    ctx.beginPath();
    ctx.ellipse(mx + w * 0.5, y + h * 0.92, w * 0.42, h * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Thân mascot tím
    ctx.fillStyle = '#7E57C2';
    ctx.strokeStyle = '#512DA8';
    ctx.lineWidth = Math.max(1.5, w * 0.05);
    ctx.beginPath();
    ctx.ellipse(mx + w * 0.5, my + h * 0.52, w * 0.42, h * 0.44, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();

    // Áo phông xanh lá
    ctx.fillStyle = '#43A047';
    ctx.beginPath();
    ctx.ellipse(mx + w * 0.5, my + h * 0.74, w * 0.38, h * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();

    // Vương miện vàng
    ctx.fillStyle = '#FFD54F';
    ctx.strokeStyle = '#FF8F00';
    ctx.lineWidth = 1.2;
    var cw = w * 0.36, ch = h * 0.22;
    var cx0 = mx + (w - cw) / 2, cy0 = my + h * 0.06;
    ctx.beginPath();
    ctx.moveTo(cx0, cy0 + ch);
    ctx.lineTo(cx0, cy0);
    ctx.lineTo(cx0 + cw * 0.28, cy0 + ch * 0.45);
    ctx.lineTo(cx0 + cw * 0.5, cy0);
    ctx.lineTo(cx0 + cw * 0.72, cy0 + ch * 0.45);
    ctx.lineTo(cx0 + cw, cy0);
    ctx.lineTo(cx0 + cw, cy0 + ch);
    ctx.closePath();
    ctx.fill(); ctx.stroke();

    // Mắt tròn to
    var eyeR = w * 0.13;
    var eyeY = my + h * 0.42;
    var leftEyeX = mx + w * 0.34, rightEyeX = mx + w * 0.66;

    if (blink) {
      ctx.strokeStyle = '#2A164D';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(leftEyeX, eyeY, eyeR * 0.8, 0.2, Math.PI - 0.2);
      ctx.arc(rightEyeX, eyeY, eyeR * 0.8, 0.2, Math.PI - 0.2);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(leftEyeX, eyeY, eyeR, 0, Math.PI * 2);
      ctx.arc(rightEyeX, eyeY, eyeR, 0, Math.PI * 2);
      ctx.fill();

      // Đồng tử mắt
      ctx.fillStyle = '#2A164D';
      var pupilOffX = isCheering ? 0 : -2;
      var pupilOffY = isCheering ? -2 : 0;
      ctx.beginPath();
      ctx.arc(leftEyeX + pupilOffX, eyeY + pupilOffY, eyeR * 0.48, 0, Math.PI * 2);
      ctx.arc(rightEyeX + pupilOffX, eyeY + pupilOffY, eyeR * 0.48, 0, Math.PI * 2);
      ctx.fill();
    }

    // Miệng cười
    var mouthY = my + h * 0.58;
    if (isCheering) {
      ctx.fillStyle = '#4A148C';
      ctx.beginPath();
      ctx.arc(mx + w * 0.5, mouthY, w * 0.16, 0, Math.PI);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#FF6F91';
      ctx.beginPath();
      ctx.arc(mx + w * 0.5, mouthY + 3, w * 0.09, 0, Math.PI);
      ctx.fill();
    } else {
      ctx.strokeStyle = '#311B92';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(mx + w * 0.5, mouthY - 2, w * 0.12, 0.2, Math.PI - 0.2);
      ctx.stroke();
    }

    // Tay tựa lên mép bàn cờ hoặc vung tay cổ vũ
    ctx.fillStyle = '#7E57C2';
    ctx.strokeStyle = '#512DA8';
    ctx.lineWidth = 1.5;
    if (isCheering) {
      ctx.beginPath();
      ctx.ellipse(mx + w * 0.1, my + h * 0.32, w * 0.12, h * 0.16, -0.6, 0, Math.PI * 2);
      ctx.ellipse(mx + w * 0.9, my + h * 0.32, w * 0.12, h * 0.16, 0.6, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.ellipse(mx + w * 0.24, y + h * 0.88, w * 0.11, h * 0.08, 0, 0, Math.PI * 2);
      ctx.ellipse(mx + w * 0.76, y + h * 0.88, w * 0.11, h * 0.08, 0, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
    }

    ctx.restore();
  }

  // ── VẼ HUY HIỆU KIM CƯƠNG PHÁT SÁNG SAU ĐIỂM SỐ ────────────────
  function drawDiamondBadge(ctx, x, y, size, color, pulse, now) {
    ctx.save();
    ctx.translate(x, y);
    var scale = 1 + pulse * 0.32;
    ctx.scale(scale, scale);
    ctx.rotate(Math.PI / 4 + Math.sin(now * 0.003) * 0.04);

    // Hào quang tỏa sáng mềm mại
    ctx.shadowColor = color;
    ctx.shadowBlur = 18 + pulse * 22;

    var s = size;
    var grad = ctx.createLinearGradient(-s / 2, -s / 2, s / 2, s / 2);
    grad.addColorStop(0, lighten(color, 0.45));
    grad.addColorStop(0.4, color);
    grad.addColorStop(1, darken(color, 0.35));

    ctx.fillStyle = grad;
    ctx.fillRect(-s / 2, -s / 2, s, s);

    // Viền kim cương ánh bạc
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = Math.max(1, s * 0.08);
    ctx.globalAlpha = 0.70 + pulse * 0.30;
    ctx.strokeRect(-s * 0.4, -s * 0.4, s * 0.8, s * 0.8);

    // Tia sao lóe sáng khi điểm tăng
    if (pulse > 0.05) {
      ctx.rotate(-Math.PI / 4);
      ctx.fillStyle = PH.alpha('#FFFFFF', pulse * 0.85);
      var flareL = size * (1.3 + pulse * 1.5);
      var flareW = Math.max(2, size * 0.11);
      ctx.fillRect(-flareL / 2, -flareW / 2, flareL, flareW);
      ctx.fillRect(-flareW / 2, -flareL / 2, flareW, flareL);
    }

    ctx.restore();
  }

  PH.games.block_blast = {
    start: function (frame) {
      var grid = newGrid(), tray = [null, null, null];
      var score = 0, displayScore = 0, scorePop = 0, streak = 0, sinceClear = 0, over = false, mode = 0;
      var clearing = [], clearStart = 0, placed = [], placedAt = 0;
      var drag = -1, startX = 0, startY = 0, dragX = 0, dragY = 0, pieceX0 = 0, pieceY0 = 0;
      var liftFrom = null, liftStart = 0;
      var ghostR = 0, ghostC = 0, ghostValid = false, prevRows = [], prevCols = [];
      var shards = [], sparks = [], laserBeams = [], shockwaves = [], crossFlares = [], floats = [];
      var screenFlash = { start: 0, dur: 0, color: '#00F0FF' };
      var shakeMag = 0, shakeTime = 0, shakeDur = 0;
      var diamondPulse = 0, cheerUntil = 0;
      var comboBanner = { streak: 0, start: 0, dur: 0, title: '', sub: '' };

      var cell = 0, boardLeft = 0, boardTop = 0, boardSize = 0, trayTop = 0, trayHeight = 0;
      var crownX = 0, crownY = 0, scoreCenterX = 0, scoreCenterY = 0, comboBadgeY = 0;
      var rotateBtn, bombBtn;

      // Theme logic
      var storedKey = Store.getString('bb_theme', 'rose');
      var currentThemeKey = THEME_MAP[storedKey] || storedKey;
      if (!THEMES[currentThemeKey]) currentThemeKey = 'rose';
      var currentTheme = THEMES[currentThemeKey];

      var themeTrans = {
        active: false, start: 0, dur: 900,
        from: currentTheme, to: currentTheme,
        banner: '', subBanner: ''
      };

      // Gắn class giao diện chuyên biệt cho Block Blast
      var screenEl = frame.stage.parentElement;
      if (screenEl) {
        screenEl.classList.add('game-bb');
        screenEl.style.backgroundColor = currentTheme.bg;
      }

      function updateScreenBg(colorHex) {
        if (screenEl) screenEl.style.backgroundColor = colorHex;
      }

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
        updateScreenBg(currentTheme.bg);
        themeTrans.active = true;
        themeTrans.start = performance.now();
        themeTrans.dur = 950;
        themeTrans.from = oldTheme;
        themeTrans.to = currentTheme;
        themeTrans.banner = banner || '';
        themeTrans.subBanner = subBanner || '';
        updateThemeBtn();
      }

      function cycleTheme() {
        var idx = THEME_KEYS.indexOf(currentThemeKey);
        var nextKey = THEME_KEYS[(idx + 1) % THEME_KEYS.length];
        triggerThemeTransition(nextKey);
        Sound.play('pop');
        frame.toast(currentTheme.emoji + ' ' + T(currentTheme.nameKey));
      }

      function getThemeColor(colIdx) {
        var pal = currentTheme.pal;
        var i = Math.max(0, colIdx - 1) % pal.length;
        return pal[i] || PAL[i] || '#F28CA4';
      }

      // Nút đổi chủ đề nằm ngay trên thanh topbar cạnh chip xu
      var topbar = screenEl ? screenEl.querySelector('.topbar') : null;
      var themeBtn = PH.h('button', {
        class: 'bb-theme-pill press',
        title: 'Themes / Đổi chủ đề',
        onclick: function (e) {
          e.stopPropagation();
          cycleTheme();
        }
      }, [
        PH.h('span', { class: 'bb-theme-txt', text: currentTheme.emoji + ' ' + T(currentTheme.nameKey) })
      ]);

      if (topbar) {
        topbar.appendChild(themeBtn);
      }

      function updateThemeBtn() {
        var span = themeBtn.querySelector('.bb-theme-txt');
        if (span) span.textContent = currentTheme.emoji + ' ' + T(currentTheme.nameKey);
        themeBtn.className = 'bb-theme-pill press' + (currentThemeKey === 'neon' ? ' neon-active' : '');
      }

      var cv = frame.makeCanvas(null, layout);
      var canvas = cv.canvas;

      function layout(o) {
        var headerH = Math.max(76, Math.min(105, Math.round(o.h * 0.14)));
        crownX = 14;
        crownY = Math.round(headerH * 0.32);
        scoreCenterX = Math.round(o.w / 2);
        scoreCenterY = Math.round(headerH * 0.46);
        comboBadgeY = Math.round(headerH * 0.88);

        boardTop = headerH + 6;
        var maxBoardW = o.w - 16;
        var maxBoardH = o.h - boardTop - 120;
        boardSize = Math.max(200, Math.min(maxBoardW, maxBoardH));
        cell = boardSize / N;
        boardLeft = Math.round((o.w - boardSize) / 2);

        trayTop = Math.round(boardTop + boardSize + 12);
        trayHeight = Math.max(88, o.h - trayTop - 6);
      }

      // ── BÙNG NỔ COMBO GIỮA BÀN CỜ (CENTER-BOARD COMBO SPLASH) ──────
      function triggerCenterCombo(streakCount, linesCount, cx, cy) {
        var now = performance.now();
        var title = 'COMBO x' + streakCount + '!';
        if (streakCount >= 6) title = T('bb_combo_ultra', streakCount);
        else if (streakCount === 5) title = T('bb_combo_mega', streakCount);
        else if (streakCount === 4) title = T('bb_combo_super', streakCount);
        else if (streakCount === 3) title = T('bb_combo_great', streakCount);

        comboBanner = {
          streak: streakCount,
          start: now,
          dur: 1100,
          title: title,
          sub: linesCount > 1 ? (linesCount === 2 ? T('bb_double') : (linesCount === 3 ? T('bb_triple') : T('bb_mega'))) : ''
        };

        cheerUntil = now + 1200;
        addShockwave(cx, cy, boardSize * 0.9, 650, streakCount >= 4 ? '#FF5500' : currentTheme.shockColor);
        triggerShake(6 + streakCount * 3.5, 280 + streakCount * 35);
        Sound.play('combo');
        Haptics.heavy();
      }

      // ------------------------------------------------------------ luật chơi
      function newGame() {
        grid = newGrid(); clearing = []; placed = [];
        shards = []; sparks = []; laserBeams = []; shockwaves = []; crossFlares = [];
        score = 0; displayScore = 0; scorePop = 0; streak = 0; sinceClear = 0; over = false; mode = 0;
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
      function boardEmpty() {
        for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) if (grid[r][c]) return false;
        return true;
      }

      function addScore(n) {
        score += n;
        diamondPulse = 1.0;
        frame.setScore(score);
      }

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

          // 8 mảnh vỡ 3D văng theo vật lý
          for (var k = 0; k < 8; k++) {
            var ang = (Math.PI * 2 * k) / 8 + (Math.random() - 0.5) * 0.5;
            var spd = cell * (3.5 + Math.random() * 5.2);
            shards.push({
              x: cx + (Math.random() - 0.5) * cell * 0.35,
              y: cy + (Math.random() - 0.5) * cell * 0.35,
              vx: Math.cos(ang) * spd,
              vy: Math.sin(ang) * spd - cell * 2.8,
              rot: Math.random() * Math.PI * 2,
              vRot: (Math.random() - 0.5) * 16,
              size: cell * (0.24 + Math.random() * 0.16),
              color: colHex,
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

          var shakePwr = 5 + fl.count * 4 + (streak >= 3 ? 5 : 0);
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
          addFloat('+' + pts, cx, cy, '#FFE066', 32);

          // BÙNG NỔ COMBO NẾU TỪ STREAK 2 TRỞ LÊN
          if (streak >= 2) {
            triggerCenterCombo(streak, fl.count, cx, boardTop + boardSize * 0.42);
          } else {
            cheerUntil = now + 800;
            Sound.play('clear');
            Haptics.medium();
          }

          if (streak % 5 === 0) {
            frame.addCoins(5);
            addFloat('🪙 +5', boardLeft + boardSize / 2, boardTop + boardSize * 0.80, '#FFD700', 24);
          }

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
            screenFlash = { start: now, dur: 700, color: '#00F0FF' };
          }
        } else {
          sinceClear++;
          if (streak > 0 && sinceClear >= STREAK_WINDOW) {
            streak = 0;
            addFloat(T('bb_streak_lost'), boardLeft + boardSize / 2, boardTop + boardSize / 2, '#CBD5E1', 22);
          }
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
          score = parseInt(parts[0], 10); displayScore = score;
          streak = parseInt(parts[1], 10) || 0; sinceClear = parseInt(parts[2], 10) || 0;
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
        if (screenEl) {
          screenEl.classList.remove('game-bb');
          screenEl.style.backgroundColor = '';
        }
        if (themeBtn && themeBtn.parentElement) themeBtn.parentElement.removeChild(themeBtn);
        document.removeEventListener('visibilitychange', persist);
        window.removeEventListener('pagehide', persist);
      });

      var saved = Store.getString('bb_state', '');
      if (!(saved && restoreState(saved))) newGame();

      // ── GAME LOOP ──────────────────────────────────────────────
      frame.loop(function (now) {
        var ctx = cv.ctx;
        ctx.clearRect(0, 0, cv.w, cv.h);
        if (!cell) return;

        // 1. Cập nhật đếm điểm mượt (Rolling Score Ticker)
        if (displayScore < score) {
          var diff = score - displayScore;
          var step = Math.max(1, Math.ceil(diff * 0.20));
          displayScore += step;
          scorePop = 1.0;
        } else {
          scorePop = Math.max(0, scorePop - 0.05);
        }

        // Cập nhật nhịp đập kim cương
        if (diamondPulse > 0) {
          diamondPulse = Math.max(0, diamondPulse - 0.045);
        }

        // 2. Rung màn hình (Screen Shake)
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

        // 3. Tính toán Màu sắc & Chuyển cảnh Theme mượt mà
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

        // 4. KHU VỰC ĐỈNH: VƯƠNG MIỆN & ĐIỂM CAO NHẤT (Top-left Crown & Best Score)
        var bestScore = Math.max(Store.getBest('block_blast') || 0, score);
        ctx.save();
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.font = '900 ' + Math.max(16, Math.round(cell * 0.46)) + 'px -apple-system, Arial, sans-serif';
        ctx.fillStyle = '#FFD54F';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
        ctx.shadowBlur = 6;
        ctx.shadowOffsetY = 2;
        ctx.fillText('👑 ' + bestScore, crownX, crownY);
        ctx.restore();

        // 5. HUY HIỆU KIM CƯƠNG & ĐIỂM SỐ KHỔNG LỒ (Giant Score & Glowing Diamond)
        var diamondSize = Math.max(34, Math.round(cell * 0.90));
        drawDiamondBadge(ctx, scoreCenterX, scoreCenterY, diamondSize, currentTheme.diamondColor, diamondPulse, now);

        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        var scoreFontSize = Math.round(Math.max(36, cell * 1.05) * (1 + scorePop * 0.12));
        ctx.font = '900 ' + scoreFontSize + 'px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 3;
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(String(displayScore), scoreCenterX, scoreCenterY);
        ctx.restore();

        // 6. THANH COMBO GIỮA TRUNG TÂM (Active Combo Pill Meter)
        if (streak > 0) {
          ctx.save();
          ctx.translate(scoreCenterX, comboBadgeY);
          var meterScale = 1 + 0.04 * Math.sin(now * 0.008);
          ctx.scale(meterScale, meterScale);

          var badgeW = Math.max(130, cell * 3.4), badgeH = Math.max(24, cell * 0.58);
          ctx.fillStyle = 'rgba(0, 0, 0, 0.32)';
          ctx.strokeStyle = streak >= 3 ? '#FF6B35' : 'rgba(255, 255, 255, 0.4)';
          ctx.lineWidth = 1.5;
          ctx.shadowColor = streak >= 3 ? '#FF6B35' : 'transparent';
          ctx.shadowBlur = 8;
          rr(ctx, -badgeW / 2, -badgeH / 2, badgeW, badgeH, badgeH / 2);
          ctx.fill(); ctx.stroke();

          // Chữ COMBO xN
          ctx.shadowBlur = 0;
          ctx.font = '800 ' + Math.round(badgeH * 0.58) + 'px -apple-system, Arial, sans-serif';
          ctx.fillStyle = streak >= 3 ? '#FF9E66' : '#FFFFFF';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText('🔥 COMBO ' + streak, -badgeW / 2 + 10, 0);

          // 3 đốm lửa biểu thị số lượt còn lại để duy trì chuỗi (STREAK_WINDOW)
          var leftMoves = STREAK_WINDOW - sinceClear;
          var pipStartX = badgeW / 2 - 40;
          for (var pi = 0; pi < STREAK_WINDOW; pi++) {
            var px = pipStartX + pi * 12;
            ctx.beginPath();
            ctx.arc(px, 0, 4, 0, Math.PI * 2);
            if (pi < leftMoves) {
              ctx.fillStyle = '#FFD54F';
              ctx.shadowColor = '#FF8F00';
              ctx.shadowBlur = 6;
              ctx.fill();
            } else {
              ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
              ctx.shadowBlur = 0;
              ctx.fill();
            }
          }
          ctx.restore();
        }

        // 7. LINH VẬT MASCOT ĐỨNG HẲN GÓC TRÊN BÊN PHẢI BÀN CỜ
        var isCheering = now < cheerUntil;
        var mascotSize = Math.max(38, Math.min(54, cell * 1.12));
        var mascotW = mascotSize * 0.95;
        var mascotH = mascotSize * 1.15;
        // Đặt hẳn sang góc trên bên phải của bàn cờ, có đệm mép màn hình an toàn
        var mascotX = Math.min(cv.w - mascotW - 12, boardLeft + boardSize - mascotW * 0.88);
        var mascotY = boardTop - mascotH * 0.74;
        drawMascot(ctx, mascotX, mascotY, mascotSize, isCheering, now);

        // 8. BẢNG CỜ CHÌM VÀ CÁC Ô LƯỚI (Sunken Grid Board)
        var outerRadius = Math.max(10, Math.round(cell * 0.24));
        var boardPad = 5;
        ctx.fillStyle = curBoardBg;
        rr(ctx, boardLeft - boardPad, boardTop - boardPad, boardSize + boardPad * 2, boardSize + boardPad * 2, outerRadius);
        ctx.fill();

        // Viền chìm hoặc hào quang bàn cờ khi đang combo
        ctx.save();
        if (streak >= 2) {
          ctx.strokeStyle = PH.alpha(streak >= 4 ? '#FF5500' : '#00E5FF', 0.45 + 0.3 * Math.sin(now * 0.009));
          ctx.lineWidth = 3;
          ctx.shadowColor = streak >= 4 ? '#FF5500' : '#00E5FF';
          ctx.shadowBlur = 12;
        } else {
          ctx.strokeStyle = curBorderCol;
          ctx.lineWidth = 1.8;
          ctx.shadowBlur = isNeonMode ? 10 : 0;
          ctx.shadowColor = curBorderCol;
        }
        rr(ctx, boardLeft - boardPad, boardTop - boardPad, boardSize + boardPad * 2, boardSize + boardPad * 2, outerRadius);
        ctx.stroke();
        ctx.restore();

        // Lưới ô cờ & khối đã đặt (Ô vuông thanh lịch, bo nhẹ tinh xảo chuẩn Block Blast)
        var cellGap = 1.5;
        var cellCorner = Math.max(3, Math.round(cell * 0.09));
        var popK = Math.min(1, (now - placedAt) / PLACE_POP_MS);

        for (var r = 0; r < N; r++) {
          for (var c = 0; c < N; c++) {
            var l = boardLeft + c * cell + cellGap;
            var t = boardTop + r * cell + cellGap;
            var s = cell - 2 * cellGap;

            // Ô cờ trống: ô vuông chìm nhẹ, viền mảnh tự nhiên
            ctx.fillStyle = curEmptyCell;
            rr(ctx, l, t, s, s, cellCorner);
            ctx.fill();

            if (!grid[r][c]) continue;
            var sc = 1;
            if (popK < 1) {
              for (var pi2 = 0; pi2 < placed.length; pi2++) {
                if (placed[pi2][0] === r && placed[pi2][1] === c) { sc = 0.84 + 0.16 * easeOut(popK); break; }
              }
            }
            var off = s * (1 - sc) / 2;
            drawBevelBlock(ctx, l + off, t + off, s * sc, cellCorner * sc, getThemeColor(grid[r][c]), 0, 1, currentThemeKey, false, false);
          }
        }

        // Ô đang nổ tung khi phá hàng
        var ck = (now - clearStart) / CLEAR_MS;
        if (ck < 1) {
          clearing.forEach(function (q) {
            var l2 = boardLeft + q.c * cell + cellGap, t2 = boardTop + q.r * cell + cellGap, s2 = cell - 2 * cellGap;
            var col = getThemeColor(q.color);
            if (ck < 0.22) {
              var heatSc = 1.10;
              var heatOff = s2 * (1 - heatSc) / 2;
              drawBevelBlock(ctx, l2 + heatOff, t2 + heatOff, s2 * heatSc, cellCorner, col, 0.95, 1, currentThemeKey, false, true);
            } else {
              var shrinkK = (ck - 0.22) / 0.78;
              var sz = s2 * (1 - 0.9 * shrinkK), o2 = (s2 - sz) / 2;
              drawBevelBlock(ctx, l2 + o2, t2 + o2, sz, cellCorner * (sz / s2), col, 0.3 * (1 - shrinkK), 1 - shrinkK * 0.5, currentThemeKey, false, false);
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
          drawBevelBlock(ctx, -sz / 2, -sz / 2, sz, sz * 0.18, sh.color, 0, 1, currentThemeKey, false, false);
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
          var ghostRadius = Math.max(3, Math.round(cell * 0.09));
          for (var gr = 0; gr < N; gr++) {
            for (var gc = 0; gc < N; gc++) {
              if (prevRows[gr] || prevCols[gc]) {
                ctx.fillStyle = isNeonMode ? 'rgba(0, 240, 255, 0.28)' : 'rgba(255, 255, 255, 0.35)';
                rr(ctx, boardLeft + gc * cell + cellGap, boardTop + gr * cell + cellGap, cell - 2 * cellGap, cell - 2 * cellGap, ghostRadius);
                ctx.fill();
              }
            }
          }
          var gp = tray[drag];
          gp.cells.forEach(function (cl) {
            drawBevelBlock(ctx, boardLeft + (ghostC + cl[1]) * cell + cellGap, boardTop + (ghostR + cl[0]) * cell + cellGap,
              cell - 2 * cellGap, ghostRadius, getThemeColor(gp.color), 0, 0.45, currentThemeKey, true, false);
          });
        }

        // Khay đựng 3 khối (Tray) với bóng đổ tinh tế
        var slotW = cv.w / 3;
        for (var ti = 0; ti < 3; ti++) {
          var p2 = tray[ti];
          if (!p2 || ti === drag) continue;
          var tc = trayCellFor(p2, slotW), pw = p2.w * tc, ph = p2.h * tc;
          var ox2 = slotW * ti + (slotW - pw) / 2, oy2 = trayTop + (trayHeight - ph) / 2, tg = 1.5;
          var trayRadius = Math.max(3, Math.round(tc * 0.09));

          // Bóng đổ nhẹ dưới từng khối trong khay
          ctx.save();
          ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
          p2.cells.forEach(function (cl) {
            rr(ctx, ox2 + cl[1] * tc + tg, oy2 + cl[0] * tc + tg + 3.5, tc - 2 * tg, tc - 2 * tg, trayRadius);
            ctx.fill();
          });
          ctx.restore();

          p2.cells.forEach(function (cl) {
            drawBevelBlock(ctx, ox2 + cl[1] * tc + tg, oy2 + cl[0] * tc + tg, tc - 2 * tg, trayRadius, getThemeColor(p2.color), 0, 1, currentThemeKey, false, false);
          });
        }

        // Khối đang kéo (nhấc lên và bay mượt theo ngón tay x1.35)
        if (drag >= 0 && tray[drag]) {
          var dp = tray[drag], pp = piecePos(), e = easeOut(Math.min(1, (now - liftStart) / LIFT_MS));
          var size = liftFrom.c + (cell - liftFrom.c) * e;
          var x0 = liftFrom.x + (pp.x - liftFrom.x) * e, y0 = liftFrom.y + (pp.y - liftFrom.y) * e;
          var g2 = 1.5;
          var dragRadius = Math.max(3, Math.round(size * 0.09));
          ctx.save();
          ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
          ctx.shadowBlur = 18;
          ctx.shadowOffsetY = 8;
          dp.cells.forEach(function (cl) {
            drawBevelBlock(ctx, x0 + cl[1] * size + g2, y0 + cl[0] * size + g2, size - 2 * g2, dragRadius, getThemeColor(dp.color), 0, 1, currentThemeKey, false, false);
          });
          ctx.restore();
        }

        // ── BANNER COMBO BÙNG NỔ Ở TRUNG TÂM BÀN CỜ ──────────────────
        if (now - comboBanner.start < comboBanner.dur) {
          var cbp = (now - comboBanner.start) / comboBanner.dur;
          var bannerAlpha = cbp < 0.15 ? cbp / 0.15 : (cbp > 0.75 ? 1 - (cbp - 0.75) / 0.25 : 1);
          var bannerScale = cbp < 0.2 ? easeOutBack(cbp / 0.2) : (1 + 0.05 * Math.sin(cbp * Math.PI));
          var bannerY = boardTop + boardSize * 0.44 - cbp * 35;

          ctx.save();
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          // Hào quang tỏa sáng rực rỡ sau chữ Combo
          ctx.shadowColor = comboBanner.streak >= 4 ? '#FF5500' : '#00E5FF';
          ctx.shadowBlur = 24;

          var bannerFontSize = Math.round(Math.min(48, cell * 1.15) * bannerScale);
          ctx.font = '900 ' + bannerFontSize + 'px -apple-system, Arial, sans-serif';

          // Viền đen đậm nổi khối
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = Math.max(3, bannerFontSize * 0.14);
          ctx.strokeText(comboBanner.title, scoreCenterX, bannerY);

          // Gradient màu rực rỡ cho chữ combo
          var txtGrad = ctx.createLinearGradient(0, bannerY - bannerFontSize / 2, 0, bannerY + bannerFontSize / 2);
          if (comboBanner.streak >= 4) {
            txtGrad.addColorStop(0, '#FFF59D');
            txtGrad.addColorStop(0.5, '#FF8A65');
            txtGrad.addColorStop(1, '#FF1744');
          } else {
            txtGrad.addColorStop(0, '#FFFFFF');
            txtGrad.addColorStop(0.5, '#80D8FF');
            txtGrad.addColorStop(1, '#0091EA');
          }
          ctx.fillStyle = txtGrad;
          ctx.globalAlpha = bannerAlpha;
          ctx.fillText(comboBanner.title, scoreCenterX, bannerY);

          // Phụ đề (DOUBLE CLEAR, TRIPLE CLEAR, v.v.)
          if (comboBanner.sub) {
            var subFontSize = Math.round(bannerFontSize * 0.55);
            ctx.font = '800 ' + subFontSize + 'px -apple-system, Arial, sans-serif';
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = Math.max(2, subFontSize * 0.12);
            ctx.strokeText(comboBanner.sub, scoreCenterX, bannerY + bannerFontSize * 0.72);
            ctx.fillStyle = '#FFD54F';
            ctx.fillText(comboBanner.sub, scoreCenterX, bannerY + bannerFontSize * 0.72);
          }
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
          var tBannerAlpha = tbp < 0.2 ? tbp / 0.2 : 1 - (tbp - 0.2) / 0.8;
          var tBannerScale = tbp < 0.15 ? 0.7 + 2 * tbp : 1;
          ctx.save();
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.font = '900 ' + Math.round(28 * tBannerScale) + 'px -apple-system, Arial, sans-serif';
          ctx.shadowColor = '#00F0FF'; ctx.shadowBlur = 18;
          ctx.fillStyle = PH.alpha('#FFFFFF', tBannerAlpha);
          ctx.fillText(themeTrans.banner, cv.w / 2, boardTop + boardSize * 0.44);

          if (themeTrans.subBanner) {
            ctx.font = '800 ' + Math.round(20 * tBannerScale) + 'px -apple-system, Arial, sans-serif';
            ctx.shadowColor = '#FF007F'; ctx.shadowBlur = 14;
            ctx.fillStyle = PH.alpha('#FFC94D', tBannerAlpha);
            ctx.fillText(themeTrans.subBanner, cv.w / 2, boardTop + boardSize * 0.54);
          }
          ctx.restore();
        }

        // Floating texts (+Pts nổi lên)
        floats = floats.filter(function (f) { return now - f.start < 1000; });
        ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
        floats.forEach(function (f) {
          var t4 = (now - f.start) / 1000;
          var grow = t4 < 0.15 ? 0.7 + 2.2 * t4 : 1;
          var fSize = Math.round(f.size * grow);
          ctx.save();
          ctx.font = '900 ' + fSize + 'px -apple-system, Arial, sans-serif';
          ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
          ctx.shadowBlur = 8;
          ctx.shadowOffsetY = 2;
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 3;
          ctx.strokeText(f.text, f.x, f.y - cell * 1.25 * t4);
          ctx.fillStyle = PH.alpha(f.color, 1 - t4 * t4);
          ctx.fillText(f.text, f.x, f.y - cell * 1.25 * t4);
          ctx.restore();
        });

        // Kết thúc Screen Shake transform
        ctx.restore();
      });
    }
  };
})();
