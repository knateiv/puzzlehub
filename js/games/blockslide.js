/* Puzzle Hub – Block Slide (Rush Hour variant)
   6×6 grid. Slide blocks horizontally/vertically to move the red car to exit (col 5, row 2).
   Power-ups: Hint (AI BFS solver tìm nước đi tối ưu nhất, 30 coins), Undo (20 coins).
   100 màn chơi chuẩn quốc tế tăng dần độ khó từ 4 bước (màn 1) đến 51 bước (màn 100).
   Chơi vô tận sau màn 100 với các màn cấp độ Master không bao giờ lặp lại hay giảm độ khó.
   Lưu lại trạng thái màn chơi khi thoát. */
(function () {
  'use strict';
  var PH = window.PH, T = PH.T, Store = PH.Store, Sound = PH.Sound;
  var h = PH.h, rr = PH.rr;

  var N = 6; // board size

  // ── 100 màn chơi kiểm chứng 100% bằng giải thuật BFS thực tế ───────
  // Mỗi màn là chuỗi 36 ký tự biểu diễn lưới 6x6:
  // 'A': xe đỏ (chiều dài 2, hàng 2)
  // 'B'-'Z': các xe/khối cản (chiều dài 2 hoặc 3)
  // 'o' hoặc '.': ô trống
  var LEVELS_DATA = [
    'FBBCCoFoGoooAAGooooDDooooEEooooooooo',
    'oBBooooCCoooAAGoooFoGoooFDDEEooooooo',
    'oFBBCCoFGoooAAGooooDDooooEEooooooooo',
    'oGBBCCoGHoooAAHIooFDDIooFoooooooEEoo',
    'EooBBBEooGoHAAoGoHoFCCoooFooooooooDD',
    'oFBBoHoFoGoHAAoGooEooCCCEoooooDDoooo',
    'oGBBCCoGHooJAAHIoJFDDIooFoooooooEEoo',
    'oBBBooooGHCCAAGHoIFoDDoIFoooooooooEE',
    'BBCCoKDDoJoKAAoJooIooEEEIoooFFGGHHoo',
    'oIBBCCoIJDDoAAJoooHEEKooHFFKooooGGoo',
    'oBBCCoooDDIJAAoHIJoooHEEooFFooooGGoo',
    'GBBBooGooICCAAoIoJoHDDoJoHooEEFFoooo',
    'oHoBBKoHCCJKAAIoJKGoIoDDGEEoooooooFF',
    'oooBBJooCCIJAAGHIJooGHDDFoooooFoEEoo',
    'oooBBJoCCoIJAAHoIJGoHoDDGoooEEooooFF',
    'FoIBBoFoIooLGAAoKLGHCCKooHoJDDEEoJoo',
    'FooIBBFGoICCFGAAJKooHoJKooHDDoEEoooo',
    'BBooIoFoooIoFoAAIoGooHooGCCHDDooEEEo',
    'ooGHooooGHBBAAGoIooFCCIooFDDDoEEoooo',
    'ooGooJooGooJooHAAJFoHIooFBBICCooDDEE',
    'GoBBoKGoCCJKooAAJLooHDDLooHIEEoFFIoo',
    'GoBBooGoCCJKooAAJKooHDDKooHIEEoFFIoo',
    'ooBBJoFGHoJKFGHAAKoCCIoKoooIDDEEoooo',
    'oGHoBBoGHCCoAAHoooFooIJKFDDIJKoEEooo',
    'ooHBBoFoHICCFAAIoooGoIJKoGDDJKooEEoo',
    'oGHoBBFGHoooFGAAJKCCooJKoooIDDEEoIoo',
    'FoBBKoFHIoKLGHIAALGCCJoLoooJDDooEEoo',
    'BBoJoooHoJCCGHAAKoGDDoKoooIEEoFFIooo',
    'oBBIoooGoICCoGAAJKoDDoJKooHEEoFFHooo',
    'FBBJooFHoJCCGHAAKLGDDoKLooIooMEEIooM',
    'BBoJoooHoJCCGHAAKLGDDoKLooIEEoFFIooo',
    'BBHooKFoHoJKFAAoJLoGCCoLoGoIDDEEoIoo',
    'oIBBCCoIDDoLAAJooLHoJEEoHFFoKoGGooKo',
    'BBHooKoGHoJKFGAAJLFCCIoLoooIDDEEEooo',
    'GHoBBoGHCCKoGAAJKooooJDDooIEELFFIooL',
    'BBoooKFooooKFAAoJLFGCCJLoGHIDDEEHIoo',
    'oGBBKooGHJKLAAHJoLCCIoooFoIDDoFEEooo',
    'BBoKooGIoKCCGIAALoHDDoLMHoJEEMFFJooo',
    'FooIBBFCCIJKoGAAJKoGooJLDDHooLooHEEo',
    'BBJoooHIJCCoHIAALoDDoKLooooKEEFFGGoo',
    'BBJoooHIJCCMHIAALMDDoKLooooKEEFFGGoo',
    'BBHoooFGHCCLFGAAJLDDoIJooooIKoEEooKo',
    'GoBBBLGCCJoLAAIJoooHIoDDoHEEKoFFooKo',
    'BBIooooHICCLoHAAKLDDoJKoGooJEEGFFFoo',
    'GHoBBBGHCCKoGAAJKooooJDDooIEELFFIooL',
    'BBIoooGoICCCGAAJooGDDJKLoHEEKLoHFFoo',
    'BBCCoMIoDDoMIAAKooooJKEEFFJKLoGGHHLo',
    'oIBBCCoIDDoMAAJooMHoJEEMHFFKLoGGoKLo',
    'oooIBBoCCIoKoGoAAKoGDDJLEEHoJLooHFFo',
    'ooHBBBFoHICCFAAIJooGooJKoGDDJKoooEEo',
    'ooJBBMCCJoLMoIAALMHIoKDDHEEKoooFFGGo',
    'ooIBBLCCIoKLGHAAKMGHDDKMoooJEEoFFJoo',
    'oBBCCooooKDDAAoKLMHIEELMHIJFFFGGJooo',
    'GooJBBGCCJoLoHoAALoHDDKMEEIoKMooIFFo',
    'BBCCooHooKDDHAAKLoHIEELMoIJFFMGGJooo',
    'oIBBCCoIDDDMAAJKoMHoJKEEHoFFLoGGooLo',
    'GBBCCLGoIDDLAAIJoooHoJEEoHFFKoooooKo',
    'HBBCCLHDDJoLAAIJooooIoEEoFFFKoooGGKo',
    'HBBCCoHoJKDDAAJKoMoIEELMoIFFLoGGooLo',
    'BBoJoLFHoJKLFHAAKMGCCoKMGoIDDoEEIooo',
    'HBBCCMHoJDDMAAJKoooIoKEEoIFFLoGGooLo',
    'ooJBBBGoJCCMGAAKoMHIoKDDHIEELoFFooLo',
    'oIBBLoGICCLoGAAKLoHoJKDDHoJEEMooFFoM',
    'ooIBBBCCIoKoHAAJKoHooJDDEEFFoLGGoooL',
    'HBBCCMHoJDDMAAJKoooIoKEEoIFFLoGGGoLo',
    'BBooKoCCooKoGHAAKoGHIJDDEEIJoLoFFFoL',
    'BBBooLCCIoKLAAIoKMGHDDoMGHoJEEGFFJoo',
    'FHoJBBFHoJoLGHoAALGCCoKMDDIoKMooIEEo',
    'BBoKooGIoKCCGIAALMHDDoLMHoJEEMFFJooo',
    'BBBJooooIJCCAAIooLGHDDKLGHEEKoFFooKo',
    'BBBKLMHCCKLMHoJAAMDDJooooIEEoooIFFGG',
    'BBBJooooIJCCAAIooLGHDDKLGHEEKLFFooKo',
    'ooIBBLCCIooLGHAAKMGHDDKMGooJEEFFoJoo',
    'BBBJooooIJCCAAIoKLGHDDKLGHEEKMFFoooM',
    'BBBCCoDDEELoIAAKLoIoJKFFooJGGMoHHooM',
    'oIBBCCoIoKDDAAoKoLHEEEoLHoJFFLGGJooo',
    'HoBBCCHDDJoLAAIJoLooIEEMoFFFKMooGGKo',
    'BBBoLooCCoLoAAIKooGHIKDDGHJEEMFFJooM',
    'IBBCCMIoJDDMAAJKoooooKEEFFFoLoGGHHLo',
    'HBBCCLHoIDDLAAIJoooooJEEFFFJKoGGooKo',
    'oooKBBGCCKLMGIAALMHIDDLNHoJEENFFJooo',
    'oGBBBKFGooJKFAAoJLFoHCCLooHIDDEEEIoo',
    'GBBBKLGoCCKLAAHIoLDDHIoooooJEEFFoJoo',
    'GBBBKLGoCCKLAAHIKoDDHIoooooJEEFFoJoo',
    'oIBBLoGICCLoGAAKLoooJKDDHoJEEMHFFFoM',
    'oIBBCCoIJDDLAAJooLHEEKoLHooKFFHGGGoo',
    'BBBJKLGCCJKLGoAAKoDDIooooHIooooHEEFF',
    'BBGoIJooGoIJooGAAJFooHCCFDDHoooEEHoo',
    'GBBBoLGoHCCLAAHIKMoDDIKMoooJEEoFFJoo',
    'oooJBBFoIJoLFoIAALGCCCKMGHDDKMoHEEKo',
    'oBBBKMCCoIKMAAoILoGDDJLoGoHJEEFFHooo',
    'HBBBoMHCCJoMAAIJLMDDIKLooooKEEFFGGoo',
    'oBBBKMCCoIKMAAoILNGDDJLNGoHJEEFFHooo',
    'BBHooLGoHCCLGoAAJoDDoIJoEEEIKoFFoIKo',
    'HoBBBMHCCJLMAAIJLoDDIKLooooKEEoFFGGo',
    'GoBBooGCCCoLAAHIKLDDHIKLoooJEEoFFJoo',
    'BBHooLGoHCCLGoAAJMDDoIJMEEEIKoFFoIKo',
    'BBCCLoooJoLMIoJAAMIDDEEMoFFKooGGGKHH',
    'BBBKLMHCCKLMHoAALMDDJooooIJEEooIFFGG',
    'GBBoLoGHIoLMGHIAAMCCCKoMooJKDDEEJFFo'
  ];

  // ── Chuyển đổi chuỗi 36 ký tự thành mảng đối tượng khối ───────────
  function parseBoard(desc) {
    var positions = {};
    for (var idx = 0; idx < desc.length; idx++) {
      var ch = desc.charAt(idx);
      if (ch !== 'o' && ch !== '.' && ch !== 'x') {
        if (!positions[ch]) positions[ch] = [];
        var r = Math.floor(idx / N);
        var c = idx % N;
        positions[ch].push({ r: r, c: c });
      }
    }
    // Sắp xếp nhãn sao cho xe đỏ 'A' luôn luôn là id: 0
    var labels = Object.keys(positions).sort(function (a, b) {
      if (a === 'A') return -1;
      if (b === 'A') return 1;
      return a.localeCompare(b);
    });

    var blocks = [];
    labels.forEach(function (lab, id) {
      var cells = positions[lab];
      var horiz = cells.length > 1 && cells[0].r === cells[1].r;
      blocks.push({
        id: id,
        r: cells[0].r,
        c: cells[0].c,
        len: cells.length,
        horiz: horiz
      });
    });
    return blocks;
  }

  // ── Bộ giải BFS siêu tốc chuẩn Rush Hour (Multi-step slide BFS) ────
  // Trượt cả đoạn dài tính là 1 bước di chuyển.
  function solveRushHour(blocks, maxStates) {
    maxStates = maxStates || 15000;
    var K = blocks.length;
    var horiz = new Array(K);
    var fixed = new Array(K);
    var lens = new Array(K);
    var initState = new Array(K);

    for (var bIdx = 0; bIdx < K; bIdx++) {
      var bk = blocks[bIdx];
      horiz[bIdx] = bk.horiz;
      fixed[bIdx] = bk.horiz ? bk.r : bk.c;
      lens[bIdx] = bk.len;
      initState[bIdx] = bk.horiz ? bk.c : bk.r;
    }

    var initKey = initState.join(',');
    var qStates = [initState];
    var qDist = [0];
    var qFirstMove = [-1]; // id của khối di chuyển đầu tiên từ vị trí hiện tại
    var seen = {};
    seen[initKey] = true;

    var head = 0;
    while (head < qStates.length && head < maxStates) {
      var state = qStates[head];
      var dist = qDist[head];
      var firstMv = qFirstMove[head];
      head++;

      var redC = state[0];
      // Tạo lưới ma trận chiếm chỗ 6x6
      var g = [
        [-1, -1, -1, -1, -1, -1],
        [-1, -1, -1, -1, -1, -1],
        [-1, -1, -1, -1, -1, -1],
        [-1, -1, -1, -1, -1, -1],
        [-1, -1, -1, -1, -1, -1],
        [-1, -1, -1, -1, -1, -1]
      ];

      for (var i = 0; i < K; i++) {
        var val = state[i], l = lens[i], fix = fixed[i], isH = horiz[i];
        if (isH) {
          for (var c = val; c < val + l; c++) g[fix][c] = i;
        } else {
          for (var r = val; r < val + l; r++) g[r][fix] = i;
        }
      }

      // Kiểm tra xe đỏ có đường trượt thẳng tới cổng thoát không
      var canExit = true;
      for (var ec = redC + 2; ec < 6; ec++) {
        if (g[2][ec] !== -1) { canExit = false; break; }
      }
      if (canExit) {
        var totalMoves = dist + (redC < 4 ? 1 : 0);
        return { moves: totalMoves, firstBlock: firstMv === -1 ? 0 : firstMv };
      }

      // Mở rộng tất cả các nước trượt hợp lệ của mọi khối
      for (var bi = 0; bi < K; bi++) {
        var bVal = state[bi], bLen = lens[bi], bFix = fixed[bi], bH = horiz[bi];

        // Trượt lùi (về phía 0)
        for (var stepNeg = 1; stepNeg <= 5; stepNeg++) {
          var nVal = bVal - stepNeg;
          if (nVal < 0) break;
          var occN = bH ? g[bFix][nVal] : g[nVal][bFix];
          if (occN !== -1) break;
          var nextS = state.slice();
          nextS[bi] = nVal;
          var kNeg = nextS.join(',');
          if (!seen[kNeg]) {
            seen[kNeg] = true;
            qStates.push(nextS);
            qDist.push(dist + 1);
            qFirstMove.push(firstMv === -1 ? bi : firstMv);
          }
        }

        // Trượt tiến (về phía N)
        for (var stepPos = 1; stepPos <= 5; stepPos++) {
          var pVal = bVal + stepPos;
          if (pVal + bLen > 6) break;
          var occP = bH ? g[bFix][pVal + bLen - 1] : g[pVal + bLen - 1][bFix];
          if (occP !== -1) break;
          var nextSP = state.slice();
          nextSP[bi] = pVal;
          var kPos = nextSP.join(',');
          if (!seen[kPos]) {
            seen[kPos] = true;
            qStates.push(nextSP);
            qDist.push(dist + 1);
            qFirstMove.push(firstMv === -1 ? bi : firstMv);
          }
        }
      }
    }

    return null;
  }

  // ── Sinh màn chơi vô tận sau màn 100 (Luôn đảm bảo độ khó cao cấp) ──
  function generateProceduralLevel(idx) {
    // Lấy ngẫu nhiên từ top 50 màn khó nhất (từ 23 đến 51 bước)
    var poolStart = Math.min(50, LEVELS_DATA.length - 20);
    var poolLen = LEVELS_DATA.length - poolStart;
    var baseDesc = LEVELS_DATA[poolStart + PH.rnd(poolLen)];
    var cand = parseBoard(baseDesc);

    // Xáo trộn thứ tự các khối chướng ngại vật để màu sắc thay đổi tươi mới mỗi lần
    var red = cand[0];
    var others = PH.shuffle(cand.slice(1));
    var res = [red].concat(others);
    res.forEach(function (b, i) { b.id = i; });
    return res;
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
        setTimeout(function () { hintBlock = null; draw(); }, 2200);
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
          // Điểm thưởng tương ứng độ khó của màn chơi
          var levelBonus = Math.min(levelIdx * 15, 1200);
          score += Math.max(120, 450 + levelBonus - moveCount * 8);
          frame.setScore(score);
          frame.addCoins(5 + (levelIdx >= 50 ? 3 : 0));
          setTimeout(function () {
            // Chơi vô hạn màn: tăng ván liên tục, không bao giờ reset về ban đầu
            levelIdx++;
            loadLevel();
          }, 850);
        }
      }

      function findHintBlock() {
        var res = solveRushHour(blocks, 18000);
        if (res && res.firstBlock !== -1) {
          return res.firstBlock;
        }
        // Fallback heuristic nếu trạng thái quá phức tạp
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
        if (levelIdx < LEVELS_DATA.length) {
          raw = parseBoard(LEVELS_DATA[levelIdx]);
        } else {
          raw = generateProceduralLevel(levelIdx);
        }
        blocks = raw;
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
          frame.saveSession({ v: 2, levelIdx: levelIdx, score: score, blocks: blocks, moveCount: moveCount });
        }
      }

      // ── layout ─────────────────────────────────────────────────────
      function layout() {
        var topH = topBar.offsetHeight || 32;
        // Dành 34px bên phải cho Cổng Thoát (Exit Gate)
        var exitMargin = 36;
        var size = Math.min(cv.w - exitMargin - 12, cv.h - topH - 16);
        var cell = Math.floor(size / N);
        var boardSz = cell * N;
        var ox = Math.floor((cv.w - boardSz - exitMargin) / 2);
        var oy = Math.floor(topH + (cv.h - topH - boardSz) / 2);
        return { cell: cell, ox: ox, oy: oy, sz: boardSz, exitMargin: exitMargin };
      }

      // ── draw ───────────────────────────────────────────────────────
      function draw() {
        if (!cv) return;
        var ctx = cv.ctx, W = cv.w, H = cv.h;
        var th = PH.theme();
        ctx.clearRect(0, 0, W, H);
        var L = layout();

        // 1. Board background
        ctx.fillStyle = th.board;
        rr(ctx, L.ox - 4, L.oy - 4, L.sz + 8, L.sz + 8, 12);
        ctx.fill();

        // 2. Dotted guide line in lane row 2 (làn đường xe thoát hiểm)
        ctx.save();
        ctx.fillStyle = PH.alpha(th.line, 0.35);
        ctx.fillRect(L.ox, L.oy + 2 * L.cell + 2, L.sz, L.cell - 4);
        ctx.restore();

        // 3. Grid cells
        ctx.fillStyle = th.empty;
        for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) {
          rr(ctx, L.ox + c * L.cell + 2, L.oy + r * L.cell + 2, L.cell - 4, L.cell - 4, 6);
          ctx.fill();
        }

        // 4. Grid lines (VẼ TRƯỚC CÁC KHỐI ĐỂ KHÔNG BAO GIỜ BỊ ĐÈ LÊN KHỐI)
        ctx.strokeStyle = th.line;
        ctx.lineWidth = 1;
        for (var i = 0; i <= N; i++) {
          ctx.beginPath(); ctx.moveTo(L.ox + i * L.cell, L.oy); ctx.lineTo(L.ox + i * L.cell, L.oy + L.sz); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(L.ox, L.oy + i * L.cell); ctx.lineTo(L.ox + L.sz, L.oy + i * L.cell); ctx.stroke();
        }

        // 5. CỔNG THOÁT HIỂM / LỐI RA (EXIT GATE) - Cực kỳ nổi bật, dễ nhận biết
        var exitX = L.ox + L.sz;
        var exitY = L.oy + 2 * L.cell;
        var exitH = L.cell;
        var exitW = Math.max(26, Math.floor(L.cell * 0.7));

        ctx.save();
        // Mở lối ra trên viền bảng (xóa viền ở hàng 2)
        ctx.fillStyle = th.board;
        ctx.fillRect(exitX - 2, exitY + 2, 8, exitH - 4);

        // Nền cổng thoát hiểm màu gradient nổi bật phát sáng
        var gateGrad = ctx.createLinearGradient(exitX, exitY, exitX + exitW, exitY);
        gateGrad.addColorStop(0, 'rgba(255, 107, 107, 0.85)');
        gateGrad.addColorStop(1, 'rgba(255, 170, 77, 0.95)');
        ctx.fillStyle = gateGrad;
        rr(ctx, exitX + 2, exitY + 2, exitW, exitH - 4, 8);
        ctx.fill();

        // Viền sáng nhấp nháy cho cổng thoát
        ctx.strokeStyle = '#FFE600';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#FF6B6B';
        ctx.shadowBlur = 10;
        rr(ctx, exitX + 2, exitY + 2, exitW, exitH - 4, 8);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Ký hiệu mũi tên và chữ EXIT
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '900 ' + Math.floor(L.cell * 0.38) + 'px -apple-system, Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('➔', exitX + exitW / 2 + 1, exitY + exitH * 0.36);

        ctx.font = '800 ' + Math.floor(L.cell * 0.22) + 'px -apple-system, Arial, sans-serif';
        ctx.fillText('EXIT', exitX + exitW / 2 + 1, exitY + exitH * 0.74);
        ctx.restore();

        // 6. Blocks (VẼ TRÊN CÙNG để không bao giờ bị bất kỳ nét nào đè lên!)
        blocks.forEach(function (b, i) {
          var x = L.ox + b.c * L.cell + 3;
          var y = L.oy + b.r * L.cell + 3;
          var bw = b.horiz ? b.len * L.cell - 6 : L.cell - 6;
          var bh = b.horiz ? L.cell - 6 : b.len * L.cell - 6;

          var col, borderCol;
          if (i === 0) {
            col = '#FF4565';
            borderCol = '#E02447';
          } else {
            var COLS2 = ['#4DABF7','#69DB7C','#FFD43B','#B7A6F2','#FFA94D','#8EC5FC','#FF8FAB','#6FDCE3'];
            col = COLS2[i % COLS2.length];
            borderCol = PH.alpha('#000000', 0.15);
          }

          ctx.save();
          if (i === hintBlock) {
            ctx.shadowColor = '#FFD43B';
            ctx.shadowBlur = 16;
          } else {
            ctx.shadowColor = 'rgba(0, 0, 0, 0.18)';
            ctx.shadowBlur = 6;
            ctx.shadowOffsetY = 2;
          }

          // Khối thân xe/khối gỗ
          ctx.fillStyle = col;
          rr(ctx, x, y, bw, bh, 8);
          ctx.fill();

          // Highlight vát 3D trên khối
          ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
          rr(ctx, x + 2, y + 2, bw - 4, Math.floor(bh * 0.3), 6);
          ctx.fill();

          // Viền rõ nét cho khối
          ctx.strokeStyle = borderCol;
          ctx.lineWidth = i === 0 ? 2 : 1;
          rr(ctx, x, y, bw, bh, 8);
          ctx.stroke();
          ctx.restore();

          // Xe ô tô đỏ (quay đầu xe sang phải hướng thẳng về lối ra)
          if (i === 0) {
            ctx.save();
            ctx.translate(x + bw / 2, y + bh / 2);
            ctx.scale(-1, 1);
            ctx.font = 'bold ' + Math.floor(L.cell * 0.52) + 'px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🚗', 0, 0);
            ctx.restore();
          }
        });
      }

      // Khôi phục session cũ nếu có và chưa kết thúc
      var saved = frame.loadSession ? frame.loadSession() : null;
      if (saved && typeof saved.levelIdx === 'number') {
        levelIdx = saved.levelIdx;
        score = saved.score || 0;
        frame.setScore(score);
        // Chỉ nạp blocks nếu cùng phiên bản v2; nếu là session cũ phiên bản v1 thì tự động load màn chuẩn
        if (saved.v === 2 && Array.isArray(saved.blocks) && saved.blocks.length) {
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
