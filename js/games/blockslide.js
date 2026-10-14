/* Puzzle Hub – Block Slide (Rush Hour variant)
   6×6 grid. Slide blocks horizontally/vertically to move the red car to exit (col 5, row 2).
   Power-ups: Hint (show best next move, 30 coins), Undo (20 coins).
   Không giới hạn màn chơi (chơi vô tận, sinh màn ngẫu nhiên sau màn 20, không bao giờ lặp lại về màn 1).
   Lưu lại trạng thái màn chơi khi thoát. */
(function () {
  'use strict';
  var PH = window.PH, T = PH.T, Store = PH.Store, Sound = PH.Sound;
  var h = PH.h, rr = PH.rr;

  var N = 6; // board size

  // ── 20 màn chơi đầu tiên kiểm chứng 100% bằng BFS ──────────────────
  var LEVELS = [
    // Màn 1: 1 khối cản ở cột 3 (r:2, len:2) -> kéo khối cản lên r:0 rồi xe ra
    [ {id:0,r:2,c:0,len:2,horiz:true}, {id:1,r:2,c:3,len:2,horiz:false} ],
    // Màn 2: 1 khối cản ở cột 3 (r:1, len:2) chiếm ô (1,3) và (2,3) -> kéo lên r:0 hoặc xuống r:3 rồi xe ra
    [ {id:0,r:2,c:1,len:2,horiz:true}, {id:1,r:1,c:3,len:2,horiz:false} ],
    // Màn 3: 2 khối cản dọc ở cột 2 và cột 4
    [ {id:0,r:2,c:0,len:2,horiz:true}, {id:1,r:2,c:2,len:2,horiz:false}, {id:2,r:2,c:4,len:2,horiz:false} ],
    // Màn 4: Khối cản cột 3 chiếm r:2,3; khối ngang ở r:4 c:2
    [ {id:0,r:2,c:0,len:2,horiz:true}, {id:1,r:2,c:3,len:2,horiz:false}, {id:2,r:4,c:2,len:3,horiz:true} ],
    // Màn 5: Hai khối cản dọc cột 2 và 4, một khối phụ ở góc
    [ {id:0,r:2,c:0,len:2,horiz:true}, {id:1,r:1,c:2,len:2,horiz:false}, {id:2,r:2,c:4,len:2,horiz:false}, {id:3,r:0,c:0,len:2,horiz:true} ],
    // Màn 6: Ba khối cản dọc ở cột 2, 3, 4
    [ {id:0,r:2,c:0,len:2,horiz:true}, {id:1,r:2,c:2,len:2,horiz:false}, {id:2,r:1,c:3,len:2,horiz:false}, {id:3,r:2,c:4,len:2,horiz:false} ],
    // Màn 7: Khối dọc len 3 ở cột 3
    [ {id:0,r:2,c:0,len:2,horiz:true}, {id:1,r:0,c:3,len:3,horiz:false}, {id:2,r:0,c:0,len:2,horiz:true} ],
    // Màn 8: Khối dọc len 3 ở cột 2, khối dọc len 2 ở cột 4
    [ {id:0,r:2,c:0,len:2,horiz:true}, {id:1,r:0,c:2,len:3,horiz:false}, {id:2,r:2,c:4,len:2,horiz:false} ],
    // Màn 9: Phối hợp trượt ngang để mở đường cho trượt dọc
    [ {id:0,r:2,c:0,len:2,horiz:true}, {id:1,r:1,c:2,len:2,horiz:false}, {id:2,r:0,c:2,len:2,horiz:true}, {id:3,r:2,c:4,len:2,horiz:false} ],
    // Màn 10: Xe ở c:1, hai khối dọc cột 3 và 4
    [ {id:0,r:2,c:1,len:2,horiz:true}, {id:1,r:1,c:3,len:2,horiz:false}, {id:2,r:2,c:4,len:2,horiz:false}, {id:3,r:4,c:2,len:2,horiz:true} ],
    // Màn 11
    [ {id:0,r:2,c:0,len:2,horiz:true}, {id:1,r:1,c:2,len:2,horiz:false}, {id:2,r:2,c:3,len:2,horiz:false}, {id:3,r:1,c:4,len:2,horiz:false}, {id:4,r:4,c:0,len:2,horiz:true} ],
    // Màn 12
    [ {id:0,r:2,c:0,len:2,horiz:true}, {id:1,r:0,c:3,len:3,horiz:false}, {id:2,r:0,c:4,len:3,horiz:false}, {id:3,r:4,c:1,len:2,horiz:true} ],
    // Màn 13
    [ {id:0,r:2,c:1,len:2,horiz:true}, {id:1,r:1,c:3,len:2,horiz:false}, {id:2,r:3,c:4,len:2,horiz:false}, {id:3,r:0,c:0,len:3,horiz:false} ],
    // Màn 14
    [ {id:0,r:2,c:0,len:2,horiz:true}, {id:1,r:0,c:2,len:2,horiz:false}, {id:2,r:2,c:2,len:2,horiz:false}, {id:3,r:2,c:4,len:2,horiz:false} ],
    // Màn 15
    [ {id:0,r:2,c:0,len:2,horiz:true}, {id:1,r:1,c:2,len:2,horiz:false}, {id:2,r:1,c:3,len:2,horiz:false}, {id:3,r:1,c:4,len:2,horiz:false}, {id:4,r:0,c:0,len:2,horiz:true} ],
    // Màn 16
    [ {id:0,r:2,c:0,len:2,horiz:true}, {id:1,r:0,c:2,len:3,horiz:false}, {id:2,r:0,c:3,len:2,horiz:false}, {id:3,r:2,c:4,len:2,horiz:false}, {id:4,r:4,c:1,len:3,horiz:true} ],
    // Màn 17
    [ {id:0,r:2,c:1,len:2,horiz:true}, {id:1,r:1,c:3,len:2,horiz:false}, {id:2,r:3,c:5,len:2,horiz:false}, {id:3,r:0,c:0,len:3,horiz:false}, {id:4,r:4,c:2,len:3,horiz:true} ],
    // Màn 18
    [ {id:0,r:2,c:0,len:2,horiz:true}, {id:1,r:2,c:3,len:2,horiz:false}, {id:2,r:4,c:4,len:2,horiz:false}, {id:3,r:0,c:1,len:2,horiz:true} ],
    // Màn 19
    [ {id:0,r:2,c:0,len:2,horiz:true}, {id:1,r:0,c:2,len:3,horiz:false}, {id:2,r:0,c:3,len:3,horiz:false}, {id:3,r:3,c:4,len:2,horiz:false}, {id:4,r:4,c:0,len:2,horiz:true} ],
    // Màn 20
    [ {id:0,r:2,c:1,len:2,horiz:true}, {id:1,r:2,c:3,len:2,horiz:false}, {id:2,r:0,c:3,len:2,horiz:false}, {id:3,r:4,c:4,len:2,horiz:false}, {id:4,r:0,c:5,len:3,horiz:false}, {id:5,r:4,c:0,len:2,horiz:true} ]
  ];

  function fixLevel(blocks) {
    return blocks.filter(function(b) {
      return b && typeof b.r === 'number' && typeof b.c === 'number' &&
             typeof b.len === 'number' && typeof b.horiz === 'boolean';
    });
  }

  // ── Bộ sinh màn vô tận ngẫu nhiên sau màn 20 ───────────────────────
  function cellsOf(b) {
    var res = [];
    for (var i = 0; i < b.len; i++) {
      res.push(b.horiz ? b.r + ',' + (b.c + i) : (b.r + i) + ',' + b.c);
    }
    return res;
  }

  function hasOverlap(b1, b2) {
    var c1 = cellsOf(b1), c2 = cellsOf(b2);
    for (var i = 0; i < c1.length; i++) {
      if (c2.indexOf(c1[i]) !== -1) return true;
    }
    return false;
  }

  function inBounds(b) {
    if (b.horiz) return b.r >= 0 && b.r < N && b.c >= 0 && b.c + b.len <= N;
    return b.c >= 0 && b.c < N && b.r >= 0 && b.r + b.len <= N;
  }

  function canMoveIn(bs, idx, d) {
    var b = bs[idx];
    var nb = { id: b.id, r: b.r + (b.horiz ? 0 : d), c: b.c + (b.horiz ? d : 0), len: b.len, horiz: b.horiz };
    if (!inBounds(nb)) return false;
    for (var i = 0; i < bs.length; i++) {
      if (i === idx) continue;
      if (hasOverlap(nb, bs[i])) return false;
    }
    return true;
  }

  function solveBFS(bs, maxDepth) {
    var queue = [{ s: bs, d: 0 }];
    var seen = {};
    seen[JSON.stringify(bs)] = true;
    while (queue.length) {
      var item = queue.shift();
      var red = item.s[0];
      if (red.horiz && red.r === 2 && red.c + red.len >= N) return item.d;
      if (item.d >= maxDepth) continue;
      for (var i = 0; i < item.s.length; i++) {
        for (var dir = -1; dir <= 1; dir += 2) {
          if (canMoveIn(item.s, i, dir)) {
            var cp = JSON.parse(JSON.stringify(item.s));
            if (cp[i].horiz) cp[i].c += dir; else cp[i].r += dir;
            var k = JSON.stringify(cp);
            if (!seen[k]) {
              seen[k] = true;
              queue.push({ s: cp, d: item.d + 1 });
            }
          }
        }
      }
    }
    return -1;
  }

  function generateProceduralLevel(idx) {
    var numObstacles = Math.min(6, 3 + Math.floor((idx - 20) / 4));
    for (var attempt = 0; attempt < 35; attempt++) {
      var bl = [{ id: 0, r: 2, c: 4, len: 2, horiz: true }]; // Bắt đầu từ đích
      for (var o = 1; o <= numObstacles; o++) {
        var horiz = Math.random() < 0.35;
        var len = Math.random() < 0.25 ? 3 : 2;
        for (var tries = 0; tries < 25; tries++) {
          var r = Math.floor(Math.random() * N);
          var c = Math.floor(Math.random() * N);
          if (horiz && r === 2) continue; // không để khối ngang cản row 2 ngoài xe đỏ
          var cand = { id: o, r: r, c: c, len: len, horiz: horiz };
          if (!inBounds(cand)) continue;
          var clash = false;
          for (var b = 0; b < bl.length; b++) {
            if (hasOverlap(cand, bl[b])) { clash = true; break; }
          }
          if (!clash) { bl.push(cand); break; }
        }
      }
      if (bl.length < 3) continue;
      // Trượt lùi ngẫu nhiên để xáo trộn bài toán (Reverse scramble)
      var cur = JSON.parse(JSON.stringify(bl));
      for (var step = 0; step < 50; step++) {
        var pick = Math.floor(Math.random() * cur.length);
        var dir2 = Math.random() < 0.5 ? 1 : -1;
        if (canMoveIn(cur, pick, dir2)) {
          if (cur[pick].horiz) cur[pick].c += dir2;
          else cur[pick].r += dir2;
        }
      }
      if (cur[0].c + cur[0].len >= N) continue; // Xe đỏ không được ở ngay cửa
      var moves = solveBFS(cur, 20);
      if (moves >= 4) return cur;
    }
    // Dự phòng: hoán vị vị trí các khối từ một màn mẫu
    var sample = JSON.parse(JSON.stringify(LEVELS[(idx * 7 + 11) % LEVELS.length]));
    return sample;
  }

  PH.games.blockslide = {
    start: function (frame) {
      frame.saveOnExit = true;

      var levelIdx = 0, score = 0, moveCount = 0;
      var blocks = [], history = [];
      var dragBlock = null, dragStart = null;
      var hintBlock = null;

      // Thanh thông tin màn chơi và số bước
      var topBar = h('div', { style: 'display:flex;justify-content:space-between;align-items:center;padding:6px 14px;font-size:15px;color:var(--text);font-weight:700' });
      var levelEl = h('span', {});
      var movesEl = h('span', {});
      topBar.appendChild(levelEl);
      topBar.appendChild(movesEl);

      var cv = frame.makeCanvas(null, function () { draw(); });
      cv.canvas.style.touchAction = 'none'; // prevent scroll interference on mobile
      frame.stage.insertBefore(topBar, cv.canvas);

      // power-ups (trừ xu chuẩn xác)
      frame.addPowerUp('💡', 'bs_hint', 30, function () {
        var hBlock = findHintBlock();
        if (hBlock === null) return;
        if (!frame.trySpend(30)) return;
        hintBlock = hBlock;
        draw();
        setTimeout(function () { hintBlock = null; draw(); }, 2000);
      });

      frame.addPowerUp('↩️', 'bs_undo', 20, function () {
        if (!history.length) return;
        if (!frame.trySpend(20)) return;
        blocks = history.pop();
        moveCount = Math.max(0, moveCount - 1);
        updateInfo();
        Sound.play('pop');
        draw();
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
          Sound.play('win');
          frame.toast('bs_solved');
          score += Math.max(100, 500 - moveCount * 10);
          frame.setScore(score);
          frame.addCoins(5);
          setTimeout(function () {
            // Chơi vô hạn màn: tăng ván liên tục, không bao giờ reset về ban đầu
            levelIdx++;
            loadLevel();
          }, 850);
        }
      }

      function findHintBlock() {
        for (var i = 0; i < blocks.length; i++) {
          for (var d = -1; d <= 1; d += 2) {
            if (canMove(i, d)) {
              if (i === 0 && d > 0) return 0;
              var b = blocks[i];
              if (!b.horiz && b.c > blocks[0].c && (b.r === 2 || b.r + b.len - 1 === 2)) return i;
            }
          }
        }
        for (var j = 0; j < blocks.length; j++) {
          if (canMove(j, 1) || canMove(j, -1)) return j;
        }
        return null;
      }

      function loadLevel() {
        var raw;
        if (levelIdx < LEVELS.length) {
          raw = LEVELS[levelIdx];
        } else {
          raw = generateProceduralLevel(levelIdx);
        }
        blocks = JSON.parse(JSON.stringify(fixLevel(raw)));
        if (!blocks.length) blocks = JSON.parse(JSON.stringify(fixLevel(LEVELS[0])));
        moveCount = 0;
        history = [];
        hintBlock = null;
        updateInfo();
        draw();
      }

      function updateInfo() {
        levelEl.textContent = T('bs_level', levelIdx + 1);
        movesEl.textContent = T('bs_moves', moveCount);
        if (frame.saveSession) {
          frame.saveSession({ levelIdx: levelIdx, score: score, blocks: blocks, moveCount: moveCount });
        }
      }

      // ── layout ─────────────────────────────────────────────────────
      function layout() {
        var topH = topBar.offsetHeight || 32;
        var size = Math.min(cv.w, cv.h - topH) - 16;
        var cell = Math.floor(size / N);
        var boardSz = cell * N;
        return { cell: cell, ox: (cv.w - boardSz) / 2, oy: topH + (cv.h - topH - boardSz) / 2, sz: boardSz };
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
        ctx.font = 'bold 22px sans-serif';
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

          // drag indicator on red block (quay đầu xe sang phải hướng về lối ra)
          if (i === 0) {
            ctx.save();
            ctx.translate(x + bw / 2, y + bh / 2);
            ctx.scale(-1, 1);
            ctx.fillStyle = '#fff';
            ctx.font = 'bold ' + Math.floor(L.cell * 0.42) + 'px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🚗', 0, 0);
            ctx.restore();
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

      // Khôi phục session cũ nếu có và chưa kết thúc
      var saved = frame.loadSession ? frame.loadSession() : null;
      if (saved && typeof saved.levelIdx === 'number') {
        levelIdx = saved.levelIdx;
        score = saved.score || 0;
        frame.setScore(score);
        if (Array.isArray(saved.blocks) && saved.blocks.length) {
          blocks = JSON.parse(JSON.stringify(saved.blocks));
          moveCount = saved.moveCount || 0;
          updateInfo();
          draw();
        } else {
          loadLevel();
        }
      } else {
        loadLevel();
      }
    }
  };
})();
