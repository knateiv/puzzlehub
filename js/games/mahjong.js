/* Puzzle Hub – Mahjong Solitaire (Shanghai-style)
   Phiên bản chuẩn di động: 40 quân bài (20 cặp), kích thước quân to gấp 2 lần,
   căn giữa hoàn hảo, mặt quân bài màu ngà sáng tương phản cực cao trên nền tối,
   18 loại icon emoji SMP hiện đại (không dùng ký tự BMP cũ để triệt tiêu lỗi lệch icon trên Safari/iOS),
   bố cục kim tự tháp chuẩn theo lưới nguyên (integer grid) 100% không bị lệch mép hay cắt nửa icon. */
(function () {
  'use strict';
  var PH = window.PH, T = PH.T, Store = PH.Store, Sound = PH.Sound;
  var h = PH.h, rr = PH.rr;

  var TOTAL_TILES = 40;

  // ── Danh sách 18 emoji SMP hiện đại chuẩn Unicode, căn giữa tuyệt đối trên mọi thiết bị ──
  var TILE_TYPES = [
    '🍎','🍋','🍇','🍓','🍒',
    '🐶','🐱','🐰','🐼','🐸',
    '🦊','🥑','🍉','🍍','🍄',
    '🦋','💎','🎁','🔥','🌙'
  ];

  // ── Bố cục 40 quân (20 cặp) xếp tầng chuẩn theo lưới nguyên:
  //    Tầng 0: 26 quân, Tầng 1: 10 quân, Tầng 2: 4 quân.
  //    Tất cả hàng và cột đều là số nguyên (row 0..4, col 0,2,4,6,8,10),
  //    quân tầng trên nằm trọn vẹn lên quân tầng dưới, không bao giờ cắt đôi hay lệch icon!
  function buildLayout() {
    var p = [];
    // Tầng 0: Đáy (26 quân)
    [2, 4, 6, 8].forEach(function (c) { p.push([0, 0, c]); });
    [0, 2, 4, 6, 8, 10].forEach(function (c) { p.push([0, 1, c]); });
    [0, 2, 4, 6, 8, 10].forEach(function (c) { p.push([0, 2, c]); });
    [0, 2, 4, 6, 8, 10].forEach(function (c) { p.push([0, 3, c]); });
    [2, 4, 6, 8].forEach(function (c) { p.push([0, 4, c]); });

    // Tầng 1: Giữa (10 quân - nằm gọn trong lòng tầng 0)
    [2, 4, 6, 8].forEach(function (c) { p.push([1, 1, c]); });
    [4, 6].forEach(function (c) { p.push([1, 2, c]); });
    [2, 4, 6, 8].forEach(function (c) { p.push([1, 3, c]); });

    // Tầng 2: Đỉnh (4 quân - trung tâm đỉnh tháp)
    [4, 6].forEach(function (c) { p.push([2, 1, c]); });
    [4, 6].forEach(function (c) { p.push([2, 3, c]); });

    return p;
  }

  // Kiểm tra quân tự do trong mô phỏng tạo bàn cờ
  function isSimFree(sim, idx) {
    var t = sim[idx];
    if (t.removed) return false;
    for (var i = 0; i < sim.length; i++) {
      if (i === idx || sim[i].removed) continue;
      var o = sim[i];
      if (o.layer > t.layer && o.row === t.row && o.col === t.col) return false;
    }
    var leftFree = true, rightFree = true;
    for (var j = 0; j < sim.length; j++) {
      if (j === idx || sim[j].removed) continue;
      var o2 = sim[j];
      if (o2.layer === t.layer && o2.row === t.row) {
        if (o2.col === t.col - 2) leftFree = false;
        if (o2.col === t.col + 2) rightFree = false;
      }
    }
    return leftFree || rightFree;
  }

  // Thuật toán gỡ ngược (Reverse Removal): Ghép đôi các quân bài ĐANG CÙNG TỰ DO
  // Cam kết 100% không bao giờ xảy ra tình trạng 2 quân cùng biểu tượng đè lên nhau!
  function generateSolvableTiles(positions) {
    for (var attempt = 0; attempt < 60; attempt++) {
      var sim = positions.map(function (p) {
        return { layer: p[0], row: p[1], col: p[2], removed: false };
      });
      var pairs = [];
      var failed = false;

      while (pairs.length < 20) {
        var freeList = [];
        for (var i = 0; i < sim.length; i++) {
          if (!sim[i].removed && isSimFree(sim, i)) freeList.push(i);
        }
        if (freeList.length < 2) {
          failed = true;
          break;
        }

        var idx1 = PH.rnd(freeList.length);
        var p1 = freeList[idx1];
        freeList.splice(idx1, 1);
        var idx2 = PH.rnd(freeList.length);
        var p2 = freeList[idx2];

        // Khóa chặn 100%: 2 quân cùng cặp TUYỆT ĐỐI không bao giờ cùng (row, col)
        if (positions[p1][1] === positions[p2][1] && positions[p1][2] === positions[p2][2]) {
          failed = true;
          break;
        }

        sim[p1].removed = true;
        sim[p2].removed = true;
        pairs.push([p1, p2]);
      }

      if (!failed && pairs.length === 20) {
        var shuffledEmojis = PH.shuffle(TILE_TYPES.slice());
        var res = new Array(positions.length);
        for (var pi = 0; pi < pairs.length; pi++) {
          var emo = shuffledEmojis[pi % shuffledEmojis.length];
          var a = pairs[pi][0], b = pairs[pi][1];
          res[a] = { layer: positions[a][0], row: positions[a][1], col: positions[a][2], type: emo, removed: false, sel: false, hint: false };
          res[b] = { layer: positions[b][0], row: positions[b][1], col: positions[b][2], type: emo, removed: false, sel: false, hint: false };
        }
        return res;
      }
    }

    // Fallback: gán theo cặp đảm bảo không cùng hàng cùng cột
    var fbEmojis = PH.shuffle(TILE_TYPES.slice());
    return positions.map(function (pos, idx) {
      return { layer: pos[0], row: pos[1], col: pos[2], type: fbEmojis[Math.floor(idx / 2) % fbEmojis.length], removed: false, sel: false, hint: false };
    });
  }

  PH.games.mahjong = {
    start: function (frame) {
      frame.saveOnExit = true;

      var tiles = [], selected = null, history = [], score = 0, level = 1;

      var cv = frame.makeCanvas(null, function () { draw(); });

      // info bar
      var infoBar = h('div', {
        style: 'text-align:center;padding:4px;font-size:0.92rem;font-weight:700;color:var(--text2)'
      });
      frame.stage.insertBefore(infoBar, cv.canvas);

      // power-ups
      frame.addPowerUp('💡', 'mj_hint', 25, function () {
        var pair = findFreePair();
        if (!pair) {
          checkDeadlock();
          return;
        }
        if (!frame.trySpend(25)) return;
        tiles[pair[0]].hint = true;
        tiles[pair[1]].hint = true;
        draw();
        setTimeout(function () {
          if (tiles[pair[0]]) tiles[pair[0]].hint = false;
          if (tiles[pair[1]]) tiles[pair[1]].hint = false;
          draw();
        }, 2200);
      });

      frame.addPowerUp('↩️', 'mj_undo', 20, function () {
        if (!history.length) return;
        if (!frame.trySpend(20)) return;
        var last = history.pop();
        last.forEach(function (t) { t.removed = false; });
        score = Math.max(0, score - 20);
        frame.setScore(score);
        selected = null;
        updateInfo();
        draw();
      });
      frame.finishButton();

      // click handler
      cv.canvas.addEventListener('pointerdown', function (e) {
        var p = cv.pos(e);
        var L = layout();
        var hit = null;
        // tìm tile trên cùng tại vị trí click (duyệt từ layer cao nhất xuống)
        for (var i = tiles.length - 1; i >= 0; i--) {
          var t = tiles[i];
          if (t.removed) continue;
          var tx = L.ox + t.col * L.hw;
          var ty = L.oy - t.layer * L.dz + t.row * L.th;
          if (p.x >= tx && p.x <= tx + L.tw && p.y >= ty && p.y <= ty + L.th) {
            if (isFree(i)) { hit = i; break; }
          }
        }
        if (hit === null) return;
        Sound.play('tap');
        if (selected === null) {
          selected = hit;
          tiles[hit].sel = true;
          draw();
        } else if (selected === hit) {
          tiles[hit].sel = false;
          selected = null;
          draw();
        } else {
          if (tiles[selected].type === tiles[hit].type) {
            tiles[selected].sel = false;
            var pair = [tiles[selected], tiles[hit]];
            pair[0].removed = true; pair[1].removed = true;
            history.push(pair);
            selected = null;
            score += 20;
            frame.setScore(score);
            frame.addCoins(2);
            Sound.play('clear');
            updateInfo();
            draw();
            if (checkWin()) {
              Sound.play('win');
              frame.toast('mj_solved');
              score += 200 + level * 50;
              frame.setScore(score);
              frame.addCoins(6);
              level++;
              setTimeout(function () {
                initTiles();
              }, 1200);
            } else {
              checkDeadlock();
            }
          } else {
            tiles[selected].sel = false;
            tiles[hit].sel = true;
            selected = hit;
            Sound.play('error');
            draw();
          }
        }
      });

      // ── isFree: kiểm tra quân cờ có tự do (không bị đè từ trên và thoáng ít nhất 1 bên) ──
      function isFree(idx) {
        var t = tiles[idx];
        if (t.removed) return false;

        // 1. Bị đè từ trên: kiểm tra các quân có layer cao hơn nằm đè lên
        for (var i = 0; i < tiles.length; i++) {
          if (i === idx || tiles[i].removed) continue;
          var o = tiles[i];
          if (o.layer > t.layer) {
            if (o.row === t.row && o.col === t.col) return false;
          }
        }

        // 2. Bị chặn hai bên (cùng tầng):
        var leftFree = true, rightFree = true;
        for (var j = 0; j < tiles.length; j++) {
          if (j === idx || tiles[j].removed) continue;
          var o2 = tiles[j];
          if (o2.layer === t.layer && o2.row === t.row) {
            if (o2.col === t.col - 2) leftFree = false;
            if (o2.col === t.col + 2) rightFree = false;
          }
        }
        return leftFree || rightFree;
      }

      function findFreePair() {
        var free = [];
        for (var i = 0; i < tiles.length; i++) if (!tiles[i].removed && isFree(i)) free.push(i);
        for (var a = 0; a < free.length; a++) {
          for (var b = a + 1; b < free.length; b++) {
            if (tiles[free[a]].type === tiles[free[b]].type) return [free[a], free[b]];
          }
        }
        return null;
      }

      function checkDeadlock() {
        if (checkWin()) return;
        if (!findFreePair()) {
          var remaining = tiles.filter(function (t) { return !t.removed; });
          // Nếu chỉ còn đúng 2 quân cuối cùng mà bị đè lên nhau (tình huống kẹt)
          if (remaining.length === 2 && remaining[0].row === remaining[1].row && remaining[0].col === remaining[1].col) {
            remaining[0].removed = true;
            remaining[1].removed = true;
            Sound.play('win');
            frame.toast('mj_solved');
            score += 200 + level * 50;
            frame.setScore(score);
            frame.addCoins(6);
            level++;
            setTimeout(initTiles, 1200);
            return;
          }
          frame.toast('Hết nước đi! Tự động đổi vị trí…');
          autoShuffle();
        }
      }

      function autoShuffle() {
        var remaining = tiles.filter(function (t) { return !t.removed; });
        if (remaining.length < 2) return;

        // Nếu 2 quân cuối cùng bị đè lên nhau do dữ liệu cũ:
        if (remaining.length === 2 && remaining[0].row === remaining[1].row && remaining[0].col === remaining[1].col) {
          remaining[0].removed = true;
          remaining[1].removed = true;
          Sound.play('win');
          frame.toast('mj_solved');
          score += 200 + level * 50;
          frame.setScore(score);
          frame.addCoins(6);
          level++;
          setTimeout(initTiles, 1200);
          return;
        }

        var types = remaining.map(function (t) { return t.type; });

        // Tìm cách tráo đổi sao cho:
        // 1. Không có 2 quân cùng (row, col) bị gán trùng emoji
        // 2. Có ít nhất 1 cặp tự do (findFreePair() !== null)
        for (var attempt = 0; attempt < 100; attempt++) {
          PH.shuffle(types);
          var conflict = false;
          for (var i = 0; i < remaining.length; i++) {
            for (var j = i + 1; j < remaining.length; j++) {
              if (remaining[i].row === remaining[j].row && remaining[i].col === remaining[j].col) {
                if (types[i] === types[j]) {
                  conflict = true;
                  break;
                }
              }
            }
            if (conflict) break;
          }
          if (conflict) continue;

          for (var k = 0; k < remaining.length; k++) {
            remaining[k].type = types[k];
          }

          if (findFreePair()) {
            selected = null;
            remaining.forEach(function (t) { t.sel = false; t.hint = false; });
            draw();
            return;
          }
        }

        // Nếu qua 100 lần vẫn chưa có free pair ngẫu nhiên: gán thẳng cặp cho 2 quân đang free
        var freeList = [];
        for (var fi = 0; fi < tiles.length; fi++) {
          if (!tiles[fi].removed && isFree(fi)) freeList.push(tiles[fi]);
        }
        if (freeList.length >= 2) {
          var pairEmoji = types[0];
          freeList[0].type = pairEmoji;
          freeList[1].type = pairEmoji;
          var restTypes = types.slice(2);
          var otherTiles = remaining.filter(function (t) { return t !== freeList[0] && t !== freeList[1]; });
          PH.shuffle(restTypes);
          otherTiles.forEach(function (t, idx) { t.type = restTypes[idx]; });
        }
        selected = null;
        remaining.forEach(function (t) { t.sel = false; t.hint = false; });
        draw();
      }

      function checkWin() {
        return tiles.every(function (t) { return t.removed; });
      }

      function updateInfo() {
        var rem = tiles.filter(function (t) { return !t.removed; }).length;
        infoBar.textContent = 'Màn ' + level + ' • ' + T('mj_pairs', Math.ceil(rem / 2));
        if (frame.saveSession) {
          frame.saveSession({ v: 3, level: level, score: score, tiles: tiles });
        }
      }

      // ── layout: tính kích thước tối ưu, cân giữa 100% không lệch mép ──
      function layout() {
        var topH = (infoBar.offsetHeight || 28) + 8;
        var availW = cv.w - 16;
        var availH = cv.h - topH - 16;
        var totalCols = 6;
        var totalRows = 5;
        var twFromW = availW / (totalCols + 0.2);
        var twFromH = availH / (totalRows * 1.25 + 0.6);
        var tw = Math.floor(Math.min(twFromW, twFromH, 56));
        var th = Math.floor(tw * 1.24);
        var hw = Math.floor(tw / 2);
        var dz = Math.max(3, Math.floor(th * 0.08));
        var gridW = totalCols * tw;
        var gridH = totalRows * th + 2 * dz;
        var ox = Math.floor((cv.w - gridW) / 2);
        var oy = Math.floor(topH + (cv.h - topH - gridH) / 2) + 2 * dz;
        return { tw: tw, th: th, hw: hw, dz: dz, ox: ox, oy: oy };
      }

      // ── draw: vẽ quân bài mạt chược phong cách ngà voi cao cấp ────────
      function draw() {
        if (!cv) return;
        var ctx = cv.ctx, W = cv.w, H = cv.h;
        ctx.clearRect(0, 0, W, H);
        var L = layout();

        var order = tiles.map(function (t, i) { return i; })
          .filter(function (i) { return !tiles[i].removed; })
          .sort(function (a, b) {
            var ta = tiles[a], tb = tiles[b];
            if (ta.layer !== tb.layer) return ta.layer - tb.layer;
            if (ta.row !== tb.row) return ta.row - tb.row;
            return ta.col - tb.col;
          });

        order.forEach(function (i) {
          var t = tiles[i];
          var x = L.ox + t.col * L.hw;
          var y = L.oy - t.layer * L.dz + t.row * L.th;
          var free = isFree(i);

          // 1. Bóng đổ 3D
          ctx.fillStyle = 'rgba(0, 0, 0, 0.32)';
          rr(ctx, x + 3.5, y + 3.5, L.tw - 2, L.th - 2, 7);
          ctx.fill();

          // 2. Lưng quân bài (Tile back - màu ngọc lục bảo mạ vàng kinh điển)
          ctx.fillStyle = t.sel ? '#1971c2' : (t.hint ? '#f59f00' : '#234d31');
          rr(ctx, x + 1.5, y + 1.5, L.tw - 2, L.th - 2, 7);
          ctx.fill();

          // 3. Mặt quân bài (Màu ngà trắng ngọc sang trọng, tương phản cực cao)
          var faceBg = t.sel ? '#4dabf7' : (t.hint ? '#ffe066' : '#FAF6EE');
          ctx.fillStyle = faceBg;
          rr(ctx, x, y, L.tw - 2, L.th - 2, 6);
          ctx.fill();

          // 4. Viền sắc nét cho quân cờ
          ctx.strokeStyle = t.sel ? '#1864ab' : (t.hint ? '#e67700' : 'rgba(0,0,0,0.18)');
          ctx.lineWidth = t.sel ? 2.5 : 1.2;
          rr(ctx, x, y, L.tw - 2, L.th - 2, 6);
          ctx.stroke();

          // 5. Icon emoji: căn giữa hình học 100% bằng cách clip và vẽ tại tâm
          var tileW = L.tw - 2, tileH = L.th - 2;
          var fontSize = Math.floor(L.tw * 0.52);

          ctx.save();
          // Clip trong lòng mặt bài để tuyệt đối không tràn viền
          ctx.beginPath();
          rr(ctx, x + 1, y + 1, tileW - 2, tileH - 2, 5);
          ctx.clip();

          ctx.font = fontSize + 'px -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.globalAlpha = free ? 1 : 0.35;
          ctx.fillText(t.type, x + tileW / 2, y + tileH / 2);
          ctx.restore();
        });
      }

      // ── khởi tạo tiles ────────────────────────────────────────────
      function initTiles() {
        var positions = buildLayout(); // đúng 40 vị trí
        tiles = generateSolvableTiles(positions);

        // Đảm bảo mở màn luôn có ít nhất một cặp ghép được
        if (!findFreePair()) autoShuffle();

        updateInfo();
        draw();
      }

      // Xóa bỏ session cũ nếu không phải phiên bản v3 (tránh dùng lại layout cũ hoặc bàn cờ lỗi bị đè)
      var saved = frame.loadSession ? frame.loadSession() : null;
      if (saved && saved.v === 3 && typeof saved.level === 'number' && Array.isArray(saved.tiles) && saved.tiles.length === TOTAL_TILES) {
        level = saved.level;
        score = saved.score || 0;
        frame.setScore(score);
        tiles = saved.tiles;
        updateInfo();
        draw();
      } else {
        if (Store.clearSession) Store.clearSession('mahjong');
        initTiles();
      }
    }
  };
})();
