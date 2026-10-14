/* Puzzle Hub – Mahjong Solitaire (Shanghai-style) — dùng emoji tiêu chuẩn
   144 tiles in a pyramid layout. Remove free matching pairs.
   "Free" = not covered from above AND accessible from left or right.
   Power-ups: Hint (25 coins), Undo (20 coins). */
(function () {
  'use strict';
  var PH = window.PH, T = PH.T, Store = PH.Store, Sound = PH.Sound;
  var h = PH.h, rr = PH.rr;

  // ── 36 loại emoji chuẩn (hoạt động trên mọi thiết bị) × 4 bản sao = 144 quân ──
  var TILE_TYPES = [
    // Hoa quả (9)
    '🍎','🍊','🍋','🍇','🍓','🍒','🍑','🥝','🍍',
    // Động vật (9)
    '🐶','🐱','🐭','🐰','🦊','🐻','🐼','🐨','🐸',
    // Thiên nhiên/biểu tượng (9)
    '⭐','🌙','☀️','🌈','⚡','🔥','💧','❄️','🌊',
    // Vật phẩm (9)
    '🎵','🎮','🎲','🎯','🎪','🏆','💎','🎀','🎁'
  ];

  // ── Layout cổ điển: (layer, row, col) — col tính theo nửa ô ──
  function buildLayout() {
    var p = [];
    // Layer 0: 12 cột × 8 hàng (bước 2, stagger 1) = 48 × ... simplified
    var rows0 = [
      // row, [cols...]
      [0, [2,4,6,8,10,12,14,16,18,20,22,24]],
      [1, [0,2,4,6,8,10,12,14,16,18,20,22,24,26]],
      [2, [2,4,6,8,10,12,14,16,18,20,22,24]],
      [3, [0,2,4,6,8,10,12,14,16,18,20,22,24,26]],
      [4, [2,4,6,8,10,12,14,16,18,20,22,24]],
      [5, [0,2,4,6,8,10,12,14,16,18,20,22,24,26]],
      [6, [2,4,6,8,10,12,14,16,18,20,22,24]],
      [7, [12,14]] // center bottom
    ];
    rows0.forEach(function(rv) {
      rv[1].forEach(function(c) { p.push([0, rv[0], c]); });
    });
    // Layer 1
    var rows1 = [
      [1, [4,6,8,10,12,14,16,18,20,22]],
      [2, [4,6,8,10,12,14,16,18,20,22]],
      [3, [4,6,8,10,12,14,16,18,20,22]],
      [4, [4,6,8,10,12,14,16,18,20,22]],
      [5, [4,6,8,10,12,14,16,18,20,22]],
      [6, [4,6,8,10,12,14,16,18,20,22]]
    ];
    rows1.forEach(function(rv) {
      rv[1].forEach(function(c) { p.push([1, rv[0], c]); });
    });
    // Layer 2
    var rows2 = [
      [2, [8,10,12,14,16,18]],
      [3, [8,10,12,14,16,18]],
      [4, [8,10,12,14,16,18]],
      [5, [8,10,12,14,16,18]]
    ];
    rows2.forEach(function(rv) {
      rv[1].forEach(function(c) { p.push([2, rv[0], c]); });
    });
    // Layer 3 (top)
    [[3,12],[3,14],[4,12],[4,14]].forEach(function(rc) {
      p.push([3, rc[0], rc[1]]);
    });
    // Side tiles (chỉ có bên phải và trái của row 4, layer 0)
    p.push([0,4,-2]);
    p.push([0,4,28]);
    return p;
  }

  PH.games.mahjong = {
    start: function (frame) {
      frame.saveOnExit = true;

      var tiles = [], selected = null, history = [], score = 0;

      var cv = frame.makeCanvas(null, function () { draw(); });

      // info bar
      var infoBar = h('div', {
        style: 'text-align:center;padding:4px;font-size:0.85rem;font-weight:600;color:var(--text2)'
      });
      frame.stage.insertBefore(infoBar, cv.canvas);

      // power-ups
      frame.addPowerUp('💡', 'mj_hint', 25, function () {
        var pair = findFreePair();
        if (pair) {
          tiles[pair[0]].hint = true;
          tiles[pair[1]].hint = true;
          Sound.play('coin');
          draw();
          setTimeout(function () {
            if (tiles[pair[0]]) tiles[pair[0]].hint = false;
            if (tiles[pair[1]]) tiles[pair[1]].hint = false;
            draw();
          }, 2000);
        }
      });
      frame.addPowerUp('↩️', 'mj_undo', 20, function () {
        if (history.length) {
          var last = history.pop();
          last.forEach(function (t) { t.removed = false; });
          score = Math.max(0, score - 20);
          frame.setScore(score);
          Sound.play('pop');
          selected = null;
          updateInfo();
          draw();
        }
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
          var ty = L.oy + t.layer * L.dz + t.row * L.th;
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
              setTimeout(function () { frame.endGame(score, Math.floor(score / 20)); }, 1200);
            } else if (!findFreePair()) {
              frame.toast('mj_no_moves');
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
        // bị phủ từ trên: kiểm tra layer + 1
        for (var i = 0; i < tiles.length; i++) {
          if (i === idx || tiles[i].removed) continue;
          var o = tiles[i];
          if (o.layer === t.layer + 1) {
            // col tính theo nửa ô, tile rộng 2 đơn vị
            if (Math.abs(o.row - t.row) < 1 && Math.abs(o.col - t.col) < 2) return false;
          }
        }
        // bị chặn hai bên
        var leftFree = true, rightFree = true;
        for (var j = 0; j < tiles.length; j++) {
          if (j === idx || tiles[j].removed) continue;
          var o2 = tiles[j];
          if (o2.layer === t.layer && Math.abs(o2.row - t.row) < 1) {
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

      function checkWin() {
        return tiles.every(function (t) { return t.removed; });
      }

      function updateInfo() {
        var rem = tiles.filter(function (t) { return !t.removed; }).length;
        infoBar.textContent = T('mj_pairs', rem / 2 | 0);
      }

      // ── layout ───────────────────────────────────────────────────
      function layout() {
        var tw = Math.min(cv.w / 16, 38), th = tw * 1.25;
        var hw = tw / 2;
        var dz = th * 0.1;
        var gridW = 30 * hw + tw, gridH = 8 * th + 4 * dz;
        var ox = (cv.w - gridW) / 2, oy = (cv.h - gridH) / 2 + 10;
        return { tw: tw, th: th, hw: hw, dz: dz, ox: ox, oy: oy };
      }

      // ── draw ─────────────────────────────────────────────────────
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
          var y = L.oy + t.layer * L.dz + t.row * L.th;
          var free = isFree(i);

          // shadow
          ctx.fillStyle = PH.alpha('#000000', 0.18);
          rr(ctx, x + 2, y + 2, L.tw, L.th, 4);
          ctx.fill();

          // tile body
          var bg;
          if (t.sel) bg = '#4DABF7';
          else if (t.hint) bg = '#FFE27A';
          else if (free) bg = th.surface;
          else bg = PH.alpha(th.surface, 0.55);

          ctx.fillStyle = bg;
          rr(ctx, x, y, L.tw, L.th, 4);
          ctx.fill();

          // border
          ctx.strokeStyle = t.sel ? '#228be6' : (free ? th.line : PH.alpha(th.line, 0.4));
          ctx.lineWidth = t.sel ? 2 : 1;
          rr(ctx, x, y, L.tw, L.th, 4);
          ctx.stroke();

          // emoji
          var fontSize = Math.floor(L.tw * 0.52);
          ctx.font = fontSize + 'px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.globalAlpha = free ? 1 : 0.45;
          ctx.fillText(t.type, x + L.tw / 2, y + L.th / 2);
          ctx.globalAlpha = 1;
        });
      }

      // ── khởi tạo tiles ────────────────────────────────────────────
      function initTiles() {
        var positions = buildLayout();
        // pool: 36 loại × 4 bản sao = 144
        var pool = [];
        for (var i = 0; i < 36; i++) {
          var type = TILE_TYPES[i % TILE_TYPES.length];
          pool.push(type, type, type, type);
        }
        PH.shuffle(pool);
        // dùng số lượng theo số vị trí layout (144 hoặc ít hơn)
        var count = Math.min(positions.length, pool.length);
        // đảm bảo số chẵn để ghép cặp
        if (count % 2 !== 0) count--;
        tiles = positions.slice(0, count).map(function (pos, idx) {
          return { layer: pos[0], row: pos[1], col: pos[2], type: pool[idx], removed: false, sel: false, hint: false };
        });
        updateInfo();
        draw();
      }

      initTiles();
    }
  };
})();
