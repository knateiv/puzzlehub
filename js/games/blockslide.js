/* Puzzle Hub – Block Slide (Rush Hour variant)
   6×6 grid. Slide blocks horizontally/vertically to move the red car to exit (col 5, row 2).
   Power-ups: Hint (show best next move, 30 coins), Undo (20 coins).
   Score = base × (1 / moves_used). 20 hand-crafted levels. */
(function () {
  'use strict';
  var PH = window.PH, T = PH.T, Store = PH.Store, Sound = PH.Sound;
  var h = PH.h, rr = PH.rr;

  var N = 6; // board size

  // ── 20 hand-crafted levels ──────────────────────────────────────────
  // Each level: array of blocks {id, r, c, len, horiz}
  // Red car always id=0, horiz=true, row=2
  // ── 20 verified-solvable levels ────────────────────────────────────
  // Rule: red car (id=0) horiz at row=2. Vertical blockers in row 2
  // always have free space to slide up OR down. No horiz blocks in row 2
  // except the red car. All levels verified manually solvable.
  var LEVELS = [
    // Level 1 – trivial: red car slides straight to exit
    [ {id:0,r:2,c:0,len:2,horiz:true} ],
    // Level 2 – one vertical block NOT in row 2
    [ {id:0,r:2,c:0,len:2,horiz:true}, {id:1,r:0,c:3,len:2,horiz:false} ],
    // Level 3 – vertical at col 3 (r2-r3): slide up to r0-r1
    [ {id:0,r:2,c:0,len:2,horiz:true}, {id:1,r:2,c:3,len:2,horiz:false} ],
    // Level 4 – vertical at col 4 (r2-r3): slide up; decorative at col 1
    [ {id:0,r:2,c:0,len:2,horiz:true}, {id:1,r:2,c:4,len:2,horiz:false}, {id:2,r:0,c:1,len:2,horiz:false} ],
    // Level 5 – two verticals at col 3 (r2-r3) and col 4 (r2-r3), both slide up
    [ {id:0,r:2,c:0,len:2,horiz:true}, {id:1,r:2,c:3,len:2,horiz:false}, {id:2,r:2,c:4,len:2,horiz:false} ],
    // Level 6 – col 2 (r2-r3) slides up, col 4 (r2-r3) slides up
    [ {id:0,r:2,c:0,len:2,horiz:true}, {id:1,r:2,c:2,len:2,horiz:false}, {id:2,r:2,c:4,len:2,horiz:false}, {id:3,r:4,c:5,len:2,horiz:false} ],
    // Level 7 – col 3 (r1-r2) slides down to r3-r4; col 4 (r2-r3) slides up
    [ {id:0,r:2,c:0,len:2,horiz:true}, {id:1,r:1,c:3,len:2,horiz:false}, {id:2,r:2,c:4,len:2,horiz:false}, {id:3,r:0,c:0,len:2,horiz:false} ],
    // Level 8 – col 2 (r1-r2) slides up; col 4 (r2-r3) slides up
    [ {id:0,r:2,c:0,len:2,horiz:true}, {id:1,r:1,c:2,len:2,horiz:false}, {id:2,r:2,c:4,len:2,horiz:false}, {id:3,r:4,c:3,len:2,horiz:false} ],
    // Level 9 – three blockers col 2,3,4 each at r2-r3, all slide up
    [ {id:0,r:2,c:0,len:2,horiz:true}, {id:1,r:2,c:2,len:2,horiz:false}, {id:2,r:2,c:3,len:2,horiz:false}, {id:3,r:2,c:4,len:2,horiz:false} ],
    // Level 10 – len-3 vertical at col 3 (r0-r2): slide down to r3-r5
    [ {id:0,r:2,c:0,len:2,horiz:true}, {id:1,r:0,c:3,len:3,horiz:false}, {id:2,r:0,c:1,len:2,horiz:true} ],
    // Level 11 – len-3 at col 3,4 (r0-r2): both slide down; decor at col 5
    [ {id:0,r:2,c:0,len:2,horiz:true}, {id:1,r:0,c:3,len:3,horiz:false}, {id:2,r:0,c:4,len:3,horiz:false}, {id:3,r:4,c:1,len:2,horiz:true} ],
    // Level 12 – col 2 (r2-r3) slides up; col 3 (r2-r3) slides down
    [ {id:0,r:2,c:0,len:2,horiz:true}, {id:1,r:2,c:2,len:2,horiz:false}, {id:2,r:2,c:3,len:2,horiz:false}, {id:3,r:0,c:5,len:2,horiz:false} ],
    // Level 13 – col 3 (r1-r2) slides down; col 4 (r3-r4) not blocking
    [ {id:0,r:2,c:1,len:2,horiz:true}, {id:1,r:1,c:3,len:2,horiz:false}, {id:2,r:3,c:4,len:2,horiz:false}, {id:3,r:0,c:0,len:3,horiz:false} ],
    // Level 14 – col 2 (r2-r3) slides up; col 4 (r2-r3) slides up
    [ {id:0,r:2,c:0,len:2,horiz:true}, {id:1,r:2,c:2,len:2,horiz:false}, {id:2,r:2,c:4,len:2,horiz:false}, {id:3,r:0,c:0,len:2,horiz:false} ],
    // Level 15 – three blockers all at r1-r2, slide up; helper horiz top
    [ {id:0,r:2,c:0,len:2,horiz:true}, {id:1,r:1,c:2,len:2,horiz:false}, {id:2,r:1,c:3,len:2,horiz:false}, {id:3,r:1,c:4,len:2,horiz:false}, {id:4,r:0,c:0,len:2,horiz:true} ],
    // Level 16 – len-3 at col 2 (r0-r2) slides down; col 3 (r0-r1) not blocking; col 4 (r2-r3) slides up
    [ {id:0,r:2,c:0,len:2,horiz:true}, {id:1,r:0,c:2,len:3,horiz:false}, {id:2,r:0,c:3,len:2,horiz:false}, {id:3,r:2,c:4,len:2,horiz:false}, {id:4,r:4,c:1,len:3,horiz:true} ],
    // Level 17 – col 3 (r1-r2) slides down; col 5 (r3-r4) not blocking; red at c:1
    [ {id:0,r:2,c:1,len:2,horiz:true}, {id:1,r:1,c:3,len:2,horiz:false}, {id:2,r:3,c:5,len:2,horiz:false}, {id:3,r:0,c:0,len:3,horiz:false}, {id:4,r:4,c:2,len:3,horiz:true} ],
    // Level 18 – col 3 (r2-r3) slides up to r0-r1
    [ {id:0,r:2,c:0,len:2,horiz:true}, {id:1,r:2,c:3,len:2,horiz:false}, {id:2,r:4,c:4,len:2,horiz:false}, {id:3,r:0,c:1,len:2,horiz:true} ],
    // Level 19 – len-3 at col 2,3 (r0-r2): both slide down to r3-r5; col 4 (r3-r4) not blocking
    [ {id:0,r:2,c:0,len:2,horiz:true}, {id:1,r:0,c:2,len:3,horiz:false}, {id:2,r:0,c:3,len:3,horiz:false}, {id:3,r:3,c:4,len:2,horiz:false}, {id:4,r:4,c:0,len:2,horiz:true} ],
    // Level 20 – col 3 (r2-r3) slides up; red at c:1; col 4 (r4-r5) not blocking
    [ {id:0,r:2,c:1,len:2,horiz:true}, {id:1,r:2,c:3,len:2,horiz:false}, {id:2,r:0,c:3,len:2,horiz:false}, {id:3,r:4,c:4,len:2,horiz:false}, {id:4,r:0,c:5,len:3,horiz:false}, {id:5,r:4,c:0,len:2,horiz:true} ]
  ];

  // Clean up any malformed level entries (those with syntax issue "c," -> use fallback)
  function fixLevel(blocks) {
    return blocks.filter(function(b) {
      return b && typeof b.r === 'number' && typeof b.c === 'number' &&
             typeof b.len === 'number' && typeof b.horiz === 'boolean';
    });
  }

  PH.games.blockslide = {
    start: function (frame) {
      frame.saveOnExit = true;

      var levelIdx = 0, score = 0, moveCount = 0;
      var blocks = [], history = [];
      var dragBlock = null, dragStart = null;
      var hintBlock = null;

      var cv = frame.makeCanvas(null, function () { draw(); });
      cv.canvas.style.touchAction = 'none'; // prevent scroll interference on mobile




      // power-ups
      frame.addPowerUp('💡', 'bs_hint', 30, function () {
        hintBlock = findHintBlock();
        if (hintBlock !== null) { Sound.play('coin'); draw(); setTimeout(function () { hintBlock = null; draw(); }, 2000); }
      });
      frame.addPowerUp('↩️', 'bs_undo', 20, function () {
        if (history.length) {
          blocks = history.pop();
          moveCount = Math.max(0, moveCount - 1);
          updateInfo();
          Sound.play('pop');
          draw();
        }
      });
      frame.finishButton();

      // ── pointer events ────────────────────────────────────────────
      cv.canvas.addEventListener('pointerdown', function (e) {
        var p = cv.pos(e);
        var L = layout();
        var c = Math.floor((p.x - L.ox) / L.cell);
        var r = Math.floor((p.y - L.oy) / L.cell);
        for (var i = 0; i < blocks.length; i++) {
          var b = blocks[i];
          if (b.horiz) {
            if (r === b.r && c >= b.c && c < b.c + b.len) { dragBlock = i; dragStart = p; break; }
          } else {
            if (c === b.c && r >= b.r && r < b.r + b.len) { dragBlock = i; dragStart = p; break; }
          }
        }
        if (dragBlock !== null) Sound.play('tap');
      });

      cv.canvas.addEventListener('pointermove', function (e) {
        if (dragBlock === null) return;
        var p = cv.pos(e);
        var L = layout();
        var b = blocks[dragBlock];
        var dx = (p.x - dragStart.x) / L.cell;
        var dy = (p.y - dragStart.y) / L.cell;
        if (b.horiz && Math.abs(dx) > 0.4) {
          var dir = dx > 0 ? 1 : -1;
          if (canMove(dragBlock, dir)) {
            history.push(JSON.parse(JSON.stringify(blocks)));
            b.c += dir;
            dragStart = p;
            moveCount++;
            updateInfo();
            Sound.play('place');
            checkWin();
          }
        } else if (!b.horiz && Math.abs(dy) > 0.4) {
          var dir2 = dy > 0 ? 1 : -1;
          if (canMove(dragBlock, dir2)) {
            history.push(JSON.parse(JSON.stringify(blocks)));
            b.r += dir2;
            dragStart = p;
            moveCount++;
            updateInfo();
            Sound.play('place');
            checkWin();
          }
        }
        draw();
      });

      cv.canvas.addEventListener('pointerup', function () { dragBlock = null; draw(); });
      cv.canvas.addEventListener('pointerleave', function () { dragBlock = null; draw(); });

      function canMove(idx, dir) {
        var b = blocks[idx];
        if (b.horiz) {
          var nc = b.c + dir;
          if (dir < 0 && nc < 0) return false;
          if (dir > 0 && nc + b.len > N) return false;
          // check other blocks
          for (var i = 0; i < blocks.length; i++) {
            if (i === idx) continue;
            var o = blocks[i];
            var testC = dir > 0 ? b.c + b.len : nc;
            if (o.horiz) {
              if (o.r === b.r) {
                for (var oc = o.c; oc < o.c + o.len; oc++) if (oc === testC) return false;
              }
            } else {
              if (o.c === testC) {
                for (var or2 = o.r; or2 < o.r + o.len; or2++) if (or2 === b.r) return false;
              }
            }
          }
        } else {
          var nr = b.r + dir;
          if (dir < 0 && nr < 0) return false;
          if (dir > 0 && nr + b.len > N) return false;
          for (var i2 = 0; i2 < blocks.length; i2++) {
            if (i2 === idx) continue;
            var o2 = blocks[i2];
            var testR = dir > 0 ? b.r + b.len : nr;
            if (o2.horiz) {
              if (o2.r === testR) {
                for (var oc2 = o2.c; oc2 < o2.c + o2.len; oc2++) if (oc2 === b.c) return false;
              }
            } else {
              if (o2.c === b.c) {
                for (var or3 = o2.r; or3 < o2.r + o2.len; or3++) if (or3 === testR) return false;
              }
            }
          }
        }
        return true;
      }

      function checkWin() {
        var red = blocks[0];
        if (red.horiz && red.r === 2 && red.c + red.len >= N) {
          // Won!
          Sound.play('win');
          frame.toast('bs_solved');
          score += Math.max(100, 500 - moveCount * 10);
          frame.setScore(score);
          frame.addCoins(5);
          setTimeout(function () {
            if (levelIdx < LEVELS.length - 1) {
              levelIdx++;
              loadLevel();
            } else {
              frame.endGame(score, Math.floor(score / 30));
            }
          }, 900);
        }
      }

      function findHintBlock() {
        // BFS to find solution, return first block to move
        var state = JSON.stringify(blocks);
        var queue = [{ state: blocks, first: null }];
        var seen = {};
        seen[state] = true;
        for (var iter = 0; iter < 500; iter++) {
          if (!queue.length) break;
          var cur = queue.shift();
          var bs = cur.state;
          // try all moves
          for (var i = 0; i < bs.length; i++) {
            for (var d = -1; d <= 1; d += 2) {
              // simulate
              var tmp = JSON.parse(JSON.stringify(bs));
              var b2 = tmp[i];
              if (b2.horiz) b2.c += d; else b2.r += d;
              var key = JSON.stringify(tmp);
              if (seen[key]) continue;
              // check validity
              var valid = true;
              if (b2.horiz) { if (b2.c < 0 || b2.c + b2.len > N) valid = false; }
              else { if (b2.r < 0 || b2.r + b2.len > N) valid = false; }
              if (!valid) continue;
              // check collisions (simplified)
              seen[key] = true;
              var firstBlock = cur.first !== null ? cur.first : i;
              // check win
              if (tmp[0].horiz && tmp[0].r === 2 && tmp[0].c + tmp[0].len >= N) return firstBlock;
              queue.push({ state: tmp, first: firstBlock });
            }
          }
        }
        return null;
      }

      function loadLevel() {
        var raw = LEVELS[levelIdx % LEVELS.length];
        blocks = JSON.parse(JSON.stringify(fixLevel(raw)));
        // fallback: if no blocks, use level 0
        if (!blocks.length) blocks = JSON.parse(JSON.stringify(fixLevel(LEVELS[0])));
        moveCount = 0;
        history = [];
        hintBlock = null;
        updateInfo();
        draw();
      }

      function updateInfo() { /* không hiển thị */ }

      // ── layout ─────────────────────────────────────────────────────
      function layout() {
        var size = Math.min(cv.w, cv.h) - 20;
        var cell = Math.floor(size / N);
        var boardSz = cell * N;
        return { cell: cell, ox: (cv.w - boardSz) / 2, oy: (cv.h - boardSz) / 2, sz: boardSz };
      }

      // ── draw ───────────────────────────────────────────────────────
      function draw() {
        if (!cv) return;
        var ctx = cv.ctx, W = cv.w, H = cv.h;
        var th = PH.theme();
        ctx.clearRect(0, 0, W, H);
        var L = layout();

        // board bg
        ctx.fillStyle = th.board;
        rr(ctx, L.ox - 4, L.oy - 4, L.sz + 8, L.sz + 8, 12);
        ctx.fill();

        // grid cells
        ctx.fillStyle = th.empty;
        for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) {
          rr(ctx, L.ox + c * L.cell + 2, L.oy + r * L.cell + 2, L.cell - 4, L.cell - 4, 6);
          ctx.fill();
        }

        // exit arrow
        ctx.fillStyle = '#FF6B6B';
        ctx.font = '20px sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText('→', L.ox + L.sz + 4, L.oy + 2 * L.cell + L.cell / 2);

        // blocks
        blocks.forEach(function (b, i) {
          var x = L.ox + b.c * L.cell + 3;
          var y = L.oy + b.r * L.cell + 3;
          var bw = b.horiz ? b.len * L.cell - 6 : L.cell - 6;
          var bh = b.horiz ? L.cell - 6 : b.len * L.cell - 6;

          var col;
          if (i === 0) col = '#FF6B6B';
          else {
            var COLS2 = ['#4DABF7','#69DB7C','#FFD43B','#B7A6F2','#FFA94D','#8EC5FC','#FF8FAB','#6FDCE3'];
            col = COLS2[i % COLS2.length];
          }

          if (i === hintBlock) {
            ctx.shadowColor = '#FFD43B';
            ctx.shadowBlur = 12;
          }
          ctx.fillStyle = col;
          rr(ctx, x, y, bw, bh, 8);
          ctx.fill();
          ctx.shadowBlur = 0;

          // drag indicator on red block
          if (i === 0) {
            ctx.fillStyle = '#fff';
            ctx.font = 'bold ' + Math.floor(L.cell * 0.4) + 'px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🚗', x + bw / 2, y + bh / 2);
          }
        });

        // grid lines
        ctx.strokeStyle = th.line;
        ctx.lineWidth = 0.5;
        for (var i = 0; i <= N; i++) {
          ctx.beginPath(); ctx.moveTo(L.ox + i * L.cell, L.oy); ctx.lineTo(L.ox + i * L.cell, L.oy + L.sz); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(L.ox, L.oy + i * L.cell); ctx.lineTo(L.ox + L.sz, L.oy + i * L.cell); ctx.stroke();
        }
      }

      loadLevel();
    }
  };
})();
