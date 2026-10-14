/* Puzzle Hub – Mahjong Solitaire (Shanghai-style) — dùng emoji tiêu chuẩn
   Phiên bản tối ưu cho di động: 44 quân bài xếp tầng dạng kim tự tháp thoáng,
   kích thước mỗi quân to gấp 2 lần, icon emoji lớn rõ nét và không bị tràn viền.
   Tự động xáo bài khi hết nước đi, lưu trạng thái ván chơi. */
(function () {
  'use strict';
  var PH = window.PH, T = PH.T, Store = PH.Store, Sound = PH.Sound;
  var h = PH.h, rr = PH.rr;

  // ── Danh sách emoji đẹp, rõ nét trên mọi màn hình ──
  var TILE_TYPES = [
    // Hoa quả
    '🍎','🍊','🍋','🍇','🍓','🍒','🍑','🍍',
    // Động vật
    '🐶','🐱','🐰','🦊','🐻','🐼','🐸','🐵',
    // Biểu tượng / Tự nhiên
    '⭐','🌙','☀️','⚡','🔥','💧','💎','🎁'
  ];

  // ── Layout kim tự tháp 44 quân thoáng đãng, ô to rõ ràng ──
  function buildLayout() {
    var p = [];
    // Layer 0: Tầng đáy (28 quân)
    // Row 0
    [2, 4, 6, 8].forEach(function (c) { p.push([0, 0, c]); });
    // Row 1
    [0, 2, 4, 6, 8, 10].forEach(function (c) { p.push([0, 1, c]); });
    // Row 2 (có 2 cánh vươn ra 2 bên)
    [-2, 0, 2, 4, 6, 8, 10, 12].forEach(function (c) { p.push([0, 2, c]); });
    // Row 3
    [0, 2, 4, 6, 8, 10].forEach(function (c) { p.push([0, 3, c]); });
    // Row 4
    [2, 4, 6, 8].forEach(function (c) { p.push([0, 4, c]); });

    // Layer 1: Tầng giữa (12 quân)
    [2, 4, 6, 8].forEach(function (c) { p.push([1, 1, c]); });
    [2, 4, 6, 8].forEach(function (c) { p.push([1, 2, c]); });
    [2, 4, 6, 8].forEach(function (c) { p.push([1, 3, c]); });

    // Layer 2: Tầng đỉnh (4 quân trung tâm)
    [4, 6].forEach(function (c) { p.push([2, 1.5, c]); });
    [4, 6].forEach(function (c) { p.push([2, 2.5, c]); });

    return p;
  }

  PH.games.mahjong = {
    start: function (frame) {
      frame.saveOnExit = true;

      var tiles = [], selected = null, history = [], score = 0, level = 1;

      var cv = frame.makeCanvas(null, function () { draw(); });

      // info bar
      var infoBar = h('div', {
        style: 'text-align:center;padding:4px;font-size:0.9rem;font-weight:700;color:var(--text2)'
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
        // tìm tile trên cùng tại vị trí click
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

      function isFree(idx) {
        var t = tiles[idx];
        if (t.removed) return false;
        // bị phủ từ trên: kiểm tra các quân có layer cao hơn
        for (var i = 0; i < tiles.length; i++) {
          if (i === idx || tiles[i].removed) continue;
          var o = tiles[i];
          if (o.layer > t.layer) {
            if (Math.abs(o.row - t.row) < 0.95 && Math.abs(o.col - t.col) < 1.95) return false;
          }
        }
        // bị chặn hai bên (cùng tầng)
        var leftFree = true, rightFree = true;
        for (var j = 0; j < tiles.length; j++) {
          if (j === idx || tiles[j].removed) continue;
          var o2 = tiles[j];
          if (o2.layer === t.layer && Math.abs(o2.row - t.row) < 0.7) {
            if (Math.abs(o2.col - (t.col - 2)) < 0.5) leftFree = false;
            if (Math.abs(o2.col - (t.col + 2)) < 0.5) rightFree = false;
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
          frame.toast('Hết nước đi! Tự động đổi vị trí…');
          autoShuffle();
        }
      }

      function autoShuffle() {
        var remaining = tiles.filter(function (t) { return !t.removed; });
        if (remaining.length < 2) return;
        var types = remaining.map(function (t) { return t.type; });
        PH.shuffle(types);
        remaining.forEach(function (t, idx) { t.type = types[idx]; t.sel = false; t.hint = false; });
        selected = null;
        draw();
        if (!findFreePair()) {
          setTimeout(autoShuffle, 300);
        }
      }

      function checkWin() {
        return tiles.every(function (t) { return t.removed; });
      }

      function updateInfo() {
        var rem = tiles.filter(function (t) { return !t.removed; }).length;
        infoBar.textContent = 'Màn ' + level + ' • ' + T('mj_pairs', Math.ceil(rem / 2));
        if (frame.saveSession) {
          frame.saveSession({ level: level, score: score, tiles: tiles });
        }
      }

      // ── layout: tính kích thước tối ưu cho màn hình ───────────────────
      function layout() {
        var topH = (infoBar.offsetHeight || 28) + 8;
        var availW = cv.w - 16;
        var availH = cv.h - topH - 16;
        // Bảng trải từ col -2 đến 12 (tổng 16 nửa ô = 8 quân rộng)
        var twFromW = availW / 8.5;
        var twFromH = availH / 6.8;
        var tw = Math.floor(Math.min(twFromW, twFromH, 56));
        var th = Math.floor(tw * 1.25);
        var hw = Math.floor(tw / 2);
        var dz = Math.max(3, Math.floor(th * 0.08));
        var minCol = -2, maxCol = 12;
        var gridW = (maxCol - minCol) * hw + tw;
        var gridH = 5 * th + 3 * dz;
        var ox = Math.floor((cv.w - gridW) / 2) - minCol * hw;
        var oy = Math.floor(topH + (cv.h - topH - gridH) / 2) + 2 * dz;
        return { tw: tw, th: th, hw: hw, dz: dz, ox: ox, oy: oy };
      }

      // ── draw ──────────────────────────────────────────────────────────
      function draw() {
        if (!cv) return;
        var ctx = cv.ctx, W = cv.w, H = cv.h;
        var th = PH.theme();
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

          // 3D shadow dưới quân bài
          ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
          rr(ctx, x + 3, y + 3, L.tw, L.th, 7);
          ctx.fill();

          // Thân quân bài
          var bg;
          if (t.sel) bg = '#4DABF7';
          else if (t.hint) bg = '#FFE27A';
          else if (free) bg = th.surface;
          else bg = PH.alpha(th.surface, 0.65);

          ctx.fillStyle = bg;
          rr(ctx, x, y, L.tw, L.th, 7);
          ctx.fill();

          // Mặt bóng nhẹ góc trên
          ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
          rr(ctx, x + 2, y + 2, L.tw - 4, Math.floor(L.th * 0.28), 5);
          ctx.fill();

          // Viền quân bài
          ctx.strokeStyle = t.sel ? '#1971c2' : (free ? th.line : PH.alpha(th.line, 0.5));
          ctx.lineWidth = t.sel ? 2.5 : 1.2;
          rr(ctx, x, y, L.tw, L.th, 7);
          ctx.stroke();

          // Icon emoji: căn chỉnh tỷ lệ 56% bề rộng quân cờ, không bao giờ tràn viền
          var fontSize = Math.floor(L.tw * 0.56);
          ctx.font = fontSize + 'px -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.globalAlpha = free ? 1 : 0.38;
          ctx.fillText(t.type, x + L.tw / 2, y + L.th / 2 + 1);
          ctx.globalAlpha = 1;
        });
      }

      // ── khởi tạo tiles ────────────────────────────────────────────
      function initTiles() {
        var positions = buildLayout();
        var numTiles = positions.length; // 44 quân
        var numPairs = numTiles / 2;    // 22 cặp
        // Chọn ngẫu nhiên 11 loại emoji, mỗi loại 4 quân = 44 quân
        var chosenTypes = PH.shuffle(TILE_TYPES.slice()).slice(0, 11);
        var pool = [];
        chosenTypes.forEach(function (type) {
          pool.push(type, type, type, type);
        });
        PH.shuffle(pool);

        tiles = positions.map(function (pos, idx) {
          return { layer: pos[0], row: pos[1], col: pos[2], type: pool[idx], removed: false, sel: false, hint: false };
        });

        // Đảm bảo ban đầu luôn có ít nhất một cặp ghép được
        if (!findFreePair()) autoShuffle();

        updateInfo();
        draw();
      }

      var saved = frame.loadSession ? frame.loadSession() : null;
      if (saved && typeof saved.level === 'number' && Array.isArray(saved.tiles)) {
        level = saved.level;
        score = saved.score || 0;
        frame.setScore(score);
        tiles = saved.tiles;
        updateInfo();
        draw();
      } else {
        initTiles();
      }
    }
  };
})();
