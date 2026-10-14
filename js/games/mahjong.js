/* Puzzle Hub – Mahjong Solitaire (Shanghai-style)
   144 tiles in a classic pyramid layout. Remove free matching pairs.
   "Free" = not covered from above AND accessible from left or right edge.
   Power-ups: Hint (25 coins), Undo (20 coins).
   Score = pairs removed × multiplier. */
(function () {
  'use strict';
  var PH = window.PH, T = PH.T, Store = PH.Store, Sound = PH.Sound;
  var h = PH.h, rr = PH.rr;

  // ── Tile sets ─────────────────────────────────────────────────────
  // 36 types × 4 copies = 144 tiles
  var TILE_TYPES = [
    '🀇','🀈','🀉','🀊','🀋','🀌','🀍','🀎','🀏', // man 1-9
    '🀙','🀚','🀛','🀜','🀝','🀞','🀟','🀠','🀡', // circles 1-9
    '🀐','🀑','🀒','🀓','🀔','🀕','🀖','🀗','🀘', // bamboo 1-9
    '🀀','🀁','🀂','🀃',                           // winds ESWN
    '🀄','🀅','🀆',                               // dragons
    '🌸','🌺','🌻','🌼'                           // flowers (each unique but match any flower)
  ];
  var FLOWER_IDX = [33,34,35,36]; // indices in TILE_TYPES of flower tiles
  // Flowers: any flower matches any other flower (4 of them, 4 copies? No – 1 copy each = 4 tiles)
  // We'll handle flowers specially: 4 unique tiles, they match pairwise.

  // Classic Shanghai layout: (layer, row, col) 
  // For simplicity use a 4-layer pyramid layout with hand-crafted positions
  // Layer format: [layer, row, col] (col in half-tile units to allow overlapping)
  // We'll use a well-known 144-tile layout
  function buildLayout() {
    var positions = [];
    // Layer 0 (bottom): 8 rows × various cols
    var L0 = [
      [0,0,2],[0,0,4],[0,0,6],[0,0,8],[0,0,10],[0,0,12],[0,0,14],[0,0,16],[0,0,18],[0,0,20],[0,0,22],[0,0,24],
      [0,1,0],[0,1,2],[0,1,4],[0,1,6],[0,1,8],[0,1,10],[0,1,12],[0,1,14],[0,1,16],[0,1,18],[0,1,20],[0,1,22],[0,1,24],[0,1,26],
      [0,2,2],[0,2,4],[0,2,6],[0,2,8],[0,2,10],[0,2,12],[0,2,14],[0,2,16],[0,2,18],[0,2,20],[0,2,22],[0,2,24],
      [0,3,0],[0,3,2],[0,3,4],[0,3,6],[0,3,8],[0,3,10],[0,3,12],[0,3,14],[0,3,16],[0,3,18],[0,3,20],[0,3,22],[0,3,24],[0,3,26],
      [0,4,2],[0,4,4],[0,4,6],[0,4,8],[0,4,10],[0,4,12],[0,4,14],[0,4,16],[0,4,18],[0,4,20],[0,4,22],[0,4,24],
      [0,5,0],[0,5,2],[0,5,4],[0,5,6],[0,5,8],[0,5,10],[0,5,12],[0,5,14],[0,5,16],[0,5,18],[0,5,20],[0,5,22],[0,5,24],[0,5,26],
      [0,6,2],[0,6,4],[0,6,6],[0,6,8],[0,6,10],[0,6,12],[0,6,14],[0,6,16],[0,6,18],[0,6,20],[0,6,22],[0,6,24],
      [0,7,12],[0,7,14]  // center bottom extras
    ];
    // Layer 1: 
    var L1 = [
      [1,1,4],[1,1,6],[1,1,8],[1,1,10],[1,1,12],[1,1,14],[1,1,16],[1,1,18],[1,1,20],[1,1,22],
      [1,2,4],[1,2,6],[1,2,8],[1,2,10],[1,2,12],[1,2,14],[1,2,16],[1,2,18],[1,2,20],[1,2,22],
      [1,3,4],[1,3,6],[1,3,8],[1,3,10],[1,3,12],[1,3,14],[1,3,16],[1,3,18],[1,3,20],[1,3,22],
      [1,4,4],[1,4,6],[1,4,8],[1,4,10],[1,4,12],[1,4,14],[1,4,16],[1,4,18],[1,4,20],[1,4,22],
      [1,5,4],[1,5,6],[1,5,8],[1,5,10],[1,5,12],[1,5,14],[1,5,16],[1,5,18],[1,5,20],[1,5,22],
      [1,6,4],[1,6,6],[1,6,8],[1,6,10],[1,6,12],[1,6,14],[1,6,16],[1,6,18],[1,6,20],[1,6,22]
    ];
    // Layer 2:
    var L2 = [
      [2,2,8],[2,2,10],[2,2,12],[2,2,14],[2,2,16],[2,2,18],
      [2,3,8],[2,3,10],[2,3,12],[2,3,14],[2,3,16],[2,3,18],
      [2,4,8],[2,4,10],[2,4,12],[2,4,14],[2,4,16],[2,4,18],
      [2,5,8],[2,5,10],[2,5,12],[2,5,14],[2,5,16],[2,5,18]
    ];
    // Layer 3 (top):
    var L3 = [
      [3,3,12],[3,3,14],[3,4,12],[3,4,14]
    ];
    // Special: lone tiles on sides (layer 0, row 4 extended)
    var SIDE = [[0,4,-2],[0,4,28]]; // left and right side
    return L0.concat(L1).concat(L2).concat(L3).concat(SIDE);
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
        // find topmost tile at click
        var hit = null;
        for (var i = tiles.length - 1; i >= 0; i--) {
          var t = tiles[i];
          if (t.removed) continue;
          var tx = L.ox + t.col * L.hw, ty = L.oy + t.layer * L.dz + t.row * L.th;
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
          if (tilesMatch(tiles[selected], tiles[hit])) {
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

      function tilesMatch(a, b) {
        if (a.type === b.type) return true;
        // flowers match each other
        var aF = FLOWER_IDX.indexOf(TILE_TYPES.indexOf(a.type)) >= 0;
        var bF = FLOWER_IDX.indexOf(TILE_TYPES.indexOf(b.type)) >= 0;
        // simpler: check if both are flowers
        var flowers = ['🌸','🌺','🌻','🌼'];
        if (flowers.indexOf(a.type) >= 0 && flowers.indexOf(b.type) >= 0) return true;
        return false;
      }

      function isFree(idx) {
        var t = tiles[idx];
        if (t.removed) return false;
        // not covered: no tile above overlaps
        for (var i = 0; i < tiles.length; i++) {
          if (i === idx || tiles[i].removed) continue;
          var o = tiles[i];
          if (o.layer === t.layer + 1) {
            // overlaps if rows and cols overlap
            if (Math.abs(o.row - t.row) < 1 && Math.abs(o.col - t.col) < 2) return false;
          }
        }
        // accessible: left or right side has no tile at same layer+row blocking
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
            if (tilesMatch(tiles[free[a]], tiles[free[b]])) return [free[a], free[b]];
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
        var tw = Math.min(cv.w / 16, 36), th = tw * 1.3;
        var hw = tw / 2; // half-width (column step)
        var layers = 4, dz = th * 0.12;
        var gridW = 30 * hw + tw, gridH = 8 * th;
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

        // Sort tiles by layer then row then col for correct rendering order
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

          // shadow (depth)
          ctx.fillStyle = PH.alpha('#000000', 0.15);
          rr(ctx, x + 2, y + 2, L.tw, L.th, 4);
          ctx.fill();

          // tile body
          var bg = t.sel ? '#4DABF7' : t.hint ? '#FFE27A' : isFree(i) ? th.surface : PH.alpha(th.surface, 0.6);
          ctx.fillStyle = bg;
          rr(ctx, x, y, L.tw, L.th, 4);
          ctx.fill();

          // border
          ctx.strokeStyle = t.sel ? '#228be6' : th.line;
          ctx.lineWidth = t.sel ? 2 : 1;
          rr(ctx, x, y, L.tw, L.th, 4);
          ctx.stroke();

          // emoji
          ctx.font = Math.floor(L.tw * 0.55) + 'px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.globalAlpha = isFree(i) ? 1 : 0.5;
          ctx.fillText(t.type, x + L.tw / 2, y + L.th / 2);
          ctx.globalAlpha = 1;
        });
      }

      // ── init ─────────────────────────────────────────────────────
      function initTiles() {
        var layout2 = buildLayout();
        // Build tile pool: 4 copies of 33 types, 1 copy of 4 flowers = 136 tiles
        // but we have 144 positions. Let's use 36 types × 4 = 144.
        var pool = [];
        for (var i = 0; i < 36; i++) {
          var type = TILE_TYPES[i] || TILE_TYPES[i % TILE_TYPES.length];
          pool.push(type, type, type, type);
        }
        PH.shuffle(pool);
        // if positions < pool length, trim
        var positions = layout2.slice(0, pool.length);
        tiles = positions.map(function (pos, idx) {
          return { layer: pos[0], row: pos[1], col: pos[2], type: pool[idx], removed: false, sel: false, hint: false };
        });
        updateInfo();
        draw();
      }

      initTiles();
    }
  };
})();
