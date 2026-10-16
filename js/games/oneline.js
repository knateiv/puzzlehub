/* One Line - bản web: nối mọi cạnh bằng một nét vẽ, KHÔNG GIỚI HẠN số màn.
   Mọi màn đều là "chu trình Euler" (mọi điểm có bậc chẵn, đồ thị liên thông) nên người chơi
   bắt đầu ở BẤT KỲ điểm nào cũng có thể hoàn thành trọn vẹn. */
(function () {
  'use strict';
  var PH = window.PH, h = PH.h, T = PH.T, PAL = PH.PALETTE, Sound = PH.Sound, Haptics = PH.Haptics;
  var COST_HINT = 25;

  function polygon(n, cx, cy, rad, rot) {
    var r = (rot !== undefined) ? rot : -90;
    var pts = [];
    for (var k = 0; k < n; k++) {
      var a = (r + (360 / n) * k) * Math.PI / 180;
      pts.push([
        Math.round((cx + rad * Math.cos(a)) * 10) / 10,
        Math.round((cy + rad * Math.sin(a)) * 10) / 10
      ]);
    }
    return pts;
  }

  function triangulatedRings(n, r1, r2) {
    var nodes1 = polygon(n, 50, 50, r1, -90);
    var nodes2 = polygon(n, 50, 50, r2, -90 + 180 / n);
    var nodes = nodes1.concat(nodes2);
    var edges = [];
    var i;
    for (i = 0; i < n; i++) edges.push([i, (i + 1) % n]);
    for (i = 0; i < n; i++) edges.push([n + i, n + ((i + 1) % n)]);
    for (i = 0; i < n; i++) {
      edges.push([i, n + i]);
      edges.push([i, n + ((i - 1 + n) % n)]);
    }
    return { nodes: nodes, edges: edges };
  }

  function flowerHub(n, rTip, angleSpread) {
    var spread = angleSpread || 22;
    var nodes = [[50, 50]];
    var edges = [];
    for (var k = 0; k < n; k++) {
      var centerA = -90 + (360 / n) * k;
      var a1 = (centerA - spread) * Math.PI / 180;
      var a2 = (centerA + spread) * Math.PI / 180;
      var p1 = [Math.round((50 + rTip * Math.cos(a1)) * 10) / 10, Math.round((50 + rTip * Math.sin(a1)) * 10) / 10];
      var p2 = [Math.round((50 + rTip * Math.cos(a2)) * 10) / 10, Math.round((50 + rTip * Math.sin(a2)) * 10) / 10];
      var idx1 = nodes.length; nodes.push(p1);
      var idx2 = nodes.length; nodes.push(p2);
      edges.push([0, idx1]);
      edges.push([idx1, idx2]);
      edges.push([idx2, 0]);
    }
    return { nodes: nodes, edges: edges };
  }

  function starPolygon(n, skip, rad) {
    var r = rad || 38;
    var nodes = polygon(n, 50, 50, r, -90);
    var edges = [];
    var i;
    for (i = 0; i < n; i++) edges.push([i, (i + 1) % n]);
    for (i = 0; i < n; i++) edges.push([i, (i + skip) % n]);
    return { nodes: nodes, edges: edges };
  }

  // ------------------------------------------------------------------ BỘ SƯU TẬP 24 MÀN THIẾT KẾ ĐỘ KHÓ TĂNG DẦN
  var P5 = polygon(5, 50, 50, 38, -90);
  var P6 = polygon(6, 50, 50, 38, -90);
  var P8 = polygon(8, 50, 50, 38, -90);
  var P12 = polygon(12, 50, 50, 38, -90);

  var CATALOG = {
    // Cấp độ 1..3: Làm quen (3 - 6 cạnh)
    1: { nodes: [[50, 15], [15, 82], [85, 82]], edges: [[0, 1], [1, 2], [2, 0]] },
    2: { nodes: P5, edges: [[0, 2], [2, 4], [4, 1], [1, 3], [3, 0]] },
    3: { nodes: [[15, 20], [15, 80], [50, 50], [85, 20], [85, 80]], edges: [[0, 1], [1, 2], [2, 0], [2, 3], [3, 4], [4, 2]] },

    // Cấp độ 4..7: Nhập môn đa giác (9 - 12 cạnh)
    4: flowerHub(3, 38, 28),
    5: {
      nodes: P5,
      edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0], [0, 2], [2, 4], [4, 1], [1, 3], [3, 0]]
    },
    6: {
      nodes: [[15, 15], [85, 15], [85, 85], [15, 85], [50, 15], [85, 50], [50, 85], [15, 50]],
      edges: [[0, 4], [4, 1], [1, 5], [5, 2], [2, 6], [6, 3], [3, 7], [7, 0], [4, 5], [5, 6], [6, 7], [7, 4]]
    },
    7: {
      nodes: P6,
      edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0], [0, 2], [2, 4], [4, 0], [1, 3], [3, 5], [5, 1]]
    },

    // Cấp độ 8..11: Trung cấp (12 - 15 cạnh)
    8: flowerHub(4, 38, 22),
    9: triangulatedRings(3, 38, 19),
    10: starPolygon(7, 2, 38),
    11: flowerHub(5, 38, 18),

    // Cấp độ 12..15: Thử thách (16 - 18 cạnh)
    12: starPolygon(8, 2, 38),
    13: triangulatedRings(4, 38, 20),
    14: flowerHub(6, 38, 15),
    15: starPolygon(9, 2, 38),

    // Cấp độ 16..19: Nâng cao (20 - 24 cạnh)
    16: starPolygon(10, 2, 38),
    17: triangulatedRings(5, 38, 20),
    18: flowerHub(8, 38, 11),
    19: {
      nodes: P8,
      edges: (function () {
        var e = [], i;
        for (i = 0; i < 8; i++) e.push([i, (i + 1) % 8]);
        for (i = 0; i < 8; i++) e.push([i, (i + 2) % 8]);
        for (i = 0; i < 8; i++) e.push([i, (i + 3) % 8]);
        return e;
      })()
    },

    // Cấp độ 20..24: Bậc thầy hình học (24 - 32 cạnh)
    20: triangulatedRings(6, 38, 20),
    21: flowerHub(10, 38, 9),
    22: triangulatedRings(7, 38, 20),
    23: {
      nodes: P12,
      edges: (function () {
        var e = [], i;
        for (i = 0; i < 12; i++) e.push([i, (i + 1) % 12]);
        for (i = 0; i < 12; i++) e.push([i, (i + 3) % 12]);
        return e;
      })()
    },
    24: triangulatedRings(8, 38, 20)
  };

  /** Trả về màn chơi theo cấp độ. Từ màn 25 trở đi sinh chu kỳ các mạng đối xứng Euler vô tận. */
  function levelData(n) {
    if (CATALOG[n]) return CATALOG[n];
    var cycle = (n - 25) % 4;
    var step = Math.floor((n - 25) / 4);
    var sectors = Math.min(12, 6 + (step % 7));
    if (cycle === 0) return triangulatedRings(sectors, 38, 20);
    if (cycle === 1) return flowerHub(sectors, 38, Math.max(8, 20 - sectors));
    if (cycle === 2) return starPolygon(sectors, 2, 38);
    return triangulatedRings(sectors + 1, 38, 19);
  }

  PH.games.oneline = {
    levelData: levelData,
    CATALOG: CATALOG,
    start: function (frame) {
      frame.saveOnExit = true;
      var levelNo = 1, total = 0, levelStart = performance.now();
      var level, used, path, currentNode, dragging, fx, fy, hintEdge, hintFrom, solved, stuckShown;
      var left = 0, top = 0, size = 0;
      var ripples = [];

      var levelInfo = h('div', { class: 'hl', style: 'font-size:16px;padding-bottom:0' });
      var status = h('div', { class: 'subtle', text: T('ol_instruction') });
      var cv = frame.makeCanvas(null, function (o) {
        size = Math.min(o.w, o.h) * 0.92; left = (o.w - size) / 2; top = (o.h - size) / 2;
      });
      var rowPlay = h('div', { class: 'btnrow three' }, [
        PH.UI.button('↩ ' + T('ol_undo'), '', function () { undoLast(); }),
        PH.UI.button('🔁 ' + T('ol_reset'), '', function () { if (!solved) resetPath(); }),
        frame.finishButton()
      ]);
      var rowDone = h('div', { class: 'btnrow gone' }, [
        PH.UI.button(T('ol_next'), 'primary', function () { levelNo++; loadLevel(); }),
        frame.finishButton()
      ]);
      frame.stage.insertBefore(levelInfo, cv.canvas);
      frame.stage.insertBefore(status, cv.canvas);
      frame.stage.appendChild(rowPlay);
      frame.stage.appendChild(rowDone);

      frame.addPowerUp('💡', 'ol_hint', COST_HINT, function () {
        if (solved) return;
        if (frame.trySpend(COST_HINT)) showHint();
      });

      function nx(i) { return left + level.nodes[i][0] / 100 * size; }
      function ny(i) { return top + level.nodes[i][1] / 100 * size; }

      function loadLevel() {
        level = levelData(levelNo);
        levelInfo.textContent = T('ol_level', levelNo);
        status.textContent = T('ol_instruction');
        rowDone.classList.add('gone'); rowPlay.classList.remove('gone');
        resetPath();
        levelStart = performance.now();
      }
      function resetPath() {
        used = level.edges.map(function () { return false; });
        path = []; currentNode = -1; dragging = false; hintEdge = -1; hintFrom = -1; solved = false; stuckShown = false;
        ripples = [];
      }
      function nodeAt(x, y, radius) {
        var best = -1, bd = radius * radius;
        for (var i = 0; i < level.nodes.length; i++) {
          var dx = nx(i) - x, dy = ny(i) - y, d = dx * dx + dy * dy;
          if (d <= bd) { bd = d; best = i; }
        }
        return best;
      }
      function edgeBetween(a, b) {
        for (var i = 0; i < level.edges.length; i++) {
          var e = level.edges[i];
          if ((e[0] === a && e[1] === b) || (e[0] === b && e[1] === a)) return i;
        }
        return -1;
      }

      /** Các cạnh chưa đi có còn nối liền với điểm v không (nếu không => bế tắc). */
      function remainingConnected(v) {
        var left2 = 0, i;
        for (i = 0; i < used.length; i++) if (!used[i]) left2++;
        if (!left2) return true;
        var seenV = {}, seenE = 0, stack = [v];
        seenV[v] = true;
        var counted = used.map(function () { return false; });
        while (stack.length) {
          var x = stack.pop();
          for (i = 0; i < level.edges.length; i++) {
            if (used[i]) continue;
            var e = level.edges[i];
            if (e[0] !== x && e[1] !== x) continue;
            if (!counted[i]) { counted[i] = true; seenE++; }
            var o = e[0] === x ? e[1] : e[0];
            if (!seenV[o]) { seenV[o] = true; stack.push(o); }
          }
        }
        return seenE === left2;
      }

      function traverse(edge, to) {
        used[edge] = true; path.push(edge); currentNode = to; hintEdge = -1; hintFrom = -1;
        ripples.push({ x: nx(to), y: ny(to), start: performance.now(), color: PAL[0] });
        Sound.play('pop'); Haptics.light();
        if (path.length === level.edges.length) {
          solved = true; dragging = false;
          Sound.play('clear'); Haptics.heavy();
          onSolved();
        } else if (!stuckShown && !remainingConnected(currentNode)) {
          stuckShown = true;
          frame.toast('ol_stuck');
        }
      }
      function undoLast() {
        if (!path.length || solved) return;
        var edge = path.pop();
        used[edge] = false;
        var e = level.edges[edge];
        currentNode = (e[0] === currentNode) ? e[1] : e[0];
        if (!path.length) currentNode = -1;
        hintEdge = -1; hintFrom = -1; stuckShown = false;
        ripples = [];
      }

      cv.canvas.addEventListener('pointerdown', function (e) {
        Sound.unlock();
        if (solved) return;
        var p = cv.pos(e);
        cv.canvas.setPointerCapture(e.pointerId);
        var n = nodeAt(p.x, p.y, 36);
        if (n < 0) return;
        if (!path.length) {
          currentNode = n; dragging = true; fx = p.x; fy = p.y;
          ripples.push({ x: nx(n), y: ny(n), start: performance.now(), color: PAL[0] });
          Sound.play('tap');
        } else if (n === currentNode) {
          dragging = true; fx = p.x; fy = p.y;
        }
      });
      cv.canvas.addEventListener('pointermove', function (e) {
        if (!dragging) return;
        var p = cv.pos(e);
        fx = p.x; fy = p.y;
        var n = nodeAt(p.x, p.y, 36 * 0.75);
        if (n >= 0 && n !== currentNode) {
          var edge = edgeBetween(currentNode, n);
          if (edge >= 0) {
            if (!used[edge]) traverse(edge, n);
            else if (path.length && path[path.length - 1] === edge) { undoLast(); currentNode = n; }
          }
        }
      });
      function up() { dragging = false; if (!path.length) currentNode = -1; }
      cv.canvas.addEventListener('pointerup', up);
      cv.canvas.addEventListener('pointercancel', up);

      /** Thuật toán Hierholzer: tìm đường đi Euler qua các cạnh còn lại */
      function eulerFirstEdge(start) {
        var adj = level.nodes.map(function () { return []; });
        level.edges.forEach(function (e, i) { if (!used[i]) { adj[e[0]].push(i); adj[e[1]].push(i); } });
        var usedL = used.slice(), ptr = adj.map(function () { return 0; });
        var stack = [{ v: start, e: -1 }], circuit = [];
        while (stack.length) {
          var topE = stack[stack.length - 1], list = adj[topE.v];
          while (ptr[topE.v] < list.length && usedL[list[ptr[topE.v]]]) ptr[topE.v]++;
          if (ptr[topE.v] < list.length) {
            var ei = list[ptr[topE.v]], ed = level.edges[ei];
            usedL[ei] = true;
            stack.push({ v: ed[0] === topE.v ? ed[1] : ed[0], e: ei });
          } else circuit.push(stack.pop().e);
        }
        circuit.reverse();
        return circuit.length > 1 ? circuit[1] : -1;
      }
      function showHint() {
        var start = currentNode;
        if (path.length && !remainingConnected(currentNode)) {
          resetPath();
          frame.toast('ol_stuck');
          start = -1;
        }
        if (start === -1 || !path.length) start = level.edges[0][0];
        hintEdge = eulerFirstEdge(start);
        hintFrom = start;
      }

      function onSolved() {
        var seconds = Math.floor((performance.now() - levelStart) / 1000);
        var bonus = Math.max(0, 60 - seconds) * 2;
        total += 100 + bonus;
        frame.setScore(total); frame.addCoins(5);
        status.textContent = T('ol_solved') + '  +' + (100 + bonus);
        rowPlay.classList.add('gone'); rowDone.classList.remove('gone');
      }

      frame.loop(function () {
        var ctx = cv.ctx, th = PH.theme();
        ctx.clearRect(0, 0, cv.w, cv.h);
        if (!level || !size) return;
        var now = performance.now();
        var w = Math.max(7, Math.min(10, size * 0.026));
        var i, e;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // 1. Cạnh chưa vẽ
        for (i = 0; i < level.edges.length; i++) {
          if (used[i]) continue;
          e = level.edges[i];
          ctx.strokeStyle = i === hintEdge ? th.gold : th.line;
          ctx.lineWidth = i === hintEdge ? w * 1.35 : w;
          ctx.beginPath(); ctx.moveTo(nx(e[0]), ny(e[0])); ctx.lineTo(nx(e[1]), ny(e[1])); ctx.stroke();
        }

        // 2. Cạnh đã vẽ (rực rỡ, phát sáng nhẹ)
        ctx.strokeStyle = PAL[0];
        ctx.lineWidth = w * 1.2;
        for (i = 0; i < level.edges.length; i++) {
          if (!used[i]) continue;
          e = level.edges[i];
          ctx.beginPath(); ctx.moveTo(nx(e[0]), ny(e[0])); ctx.lineTo(nx(e[1]), ny(e[1])); ctx.stroke();
        }

        // 3. Đường dây thun đang kéo
        if (dragging && currentNode >= 0) {
          ctx.strokeStyle = PH.alpha(PAL[0], 0.5);
          ctx.lineWidth = w * 1.15;
          ctx.beginPath(); ctx.moveTo(nx(currentNode), ny(currentNode)); ctx.lineTo(fx, fy); ctx.stroke();
        }

        // 4. Hiệu ứng sóng lan tỏa khi chạm điểm
        ripples = ripples.filter(function (rp) { return now - rp.start < 360; });
        ripples.forEach(function (rp) {
          var p = (now - rp.start) / 360;
          var curR = Math.max(0, 13 + p * 20);
          ctx.save();
          ctx.strokeStyle = PH.alpha(rp.color, (1 - p) * 0.8);
          ctx.lineWidth = Math.max(0.5, 3.2 * (1 - p));
          ctx.beginPath();
          ctx.arc(rp.x, rp.y, curR, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        });

        // 5. Xác định tập hợp điểm đã nối
        var connectedMap = {};
        for (i = 0; i < level.edges.length; i++) {
          if (used[i]) {
            connectedMap[level.edges[i][0]] = true;
            connectedMap[level.edges[i][1]] = true;
          }
        }
        if (currentNode >= 0) {
          connectedMap[currentNode] = true;
        }

        // 6. Vẽ các điểm tròn đẹp, ĐẶC 100%, TUYỆT ĐỐI KHÔNG BỊ RỖNG
        for (i = 0; i < level.nodes.length; i++) {
          var px = nx(i), py = ny(i);
          var isCur = (i === currentNode);
          var isConn = !!connectedMap[i];
          var isHint = (i === hintFrom && hintEdge >= 0);

          if (isConn) {
            // ĐIỂM ĐÃ NỐI: Tròn đặc 100% sắc nét, nguyên khối màu hồng rực rỡ, không có ruột rỗng
            var rConn = isCur ? 15.5 : 12.5;

            ctx.save();
            ctx.shadowColor = PAL[0];
            ctx.shadowBlur = isCur ? 12 : 6;
            ctx.fillStyle = PAL[0];
            ctx.beginPath();
            ctx.arc(px, py, rConn, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            // Viền trắng tinh khôi bo ngoài
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = isCur ? 3.0 : 2.0;
            ctx.beginPath();
            ctx.arc(px, py, rConn, 0, Math.PI * 2);
            ctx.stroke();

            // Aura tỏa sáng khi đang kéo
            if (isCur && dragging) {
              var pulse = 0.5 + 0.5 * Math.sin(now * 0.012);
              ctx.strokeStyle = PH.alpha('#FFFFFF', 0.55 * pulse);
              ctx.lineWidth = 2.0;
              ctx.beginPath();
              ctx.arc(px, py, rConn + 4 + pulse * 2.5, 0, Math.PI * 2);
              ctx.stroke();
            }
          } else {
            // ĐIỂM CHƯA NỐI: Hạt tròn đặc 100%, gọn gàng tinh tế, không rỗng ruột
            var rUnconn = 9.5;
            ctx.save();
            if (isHint) {
              ctx.shadowColor = th.gold;
              ctx.shadowBlur = 10;
              ctx.fillStyle = th.gold;
              ctx.beginPath();
              ctx.arc(px, py, rUnconn + 2, 0, Math.PI * 2);
              ctx.fill();
              ctx.strokeStyle = '#FFFFFF';
              ctx.lineWidth = 2.5;
              ctx.stroke();
            } else {
              // Hạt tròn đặc 100% màu xanh ngọc pastel, có viền trắng mờ tinh tế
              ctx.fillStyle = PAL[1];
              ctx.beginPath();
              ctx.arc(px, py, rUnconn, 0, Math.PI * 2);
              ctx.fill();

              ctx.strokeStyle = '#FFFFFF';
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.arc(px, py, rUnconn, 0, Math.PI * 2);
              ctx.stroke();
            }
            ctx.restore();
          }
        }
      });

      loadLevel();
    }
  };
})();
