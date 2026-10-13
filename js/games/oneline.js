/* One Line - bản web: nối mọi cạnh bằng một nét vẽ, KHÔNG GIỚI HẠN số màn.
   Mọi màn đều là "chu trình Euler" (mọi điểm có bậc chẵn, đồ thị liên thông) nên người chơi
   bắt đầu ở BẤT KỲ điểm nào cũng có thể hoàn thành. Từ màn 4 trở đi, màn chơi được sinh tự động. */
(function () {
  'use strict';
  var PH = window.PH, h = PH.h, T = PH.T, PAL = PH.PALETTE, Sound = PH.Sound, Haptics = PH.Haptics;
  var COST_HINT = 25;

  function polygon(n, cx, cy, rad) {
    var pts = [];
    for (var k = 0; k < n; k++) {
      var a = (-90 + (360 / n) * k) * Math.PI / 180;
      pts.push([cx + rad * Math.cos(a), cy + rad * Math.sin(a)]);
    }
    return pts;
  }
  var P5 = polygon(5, 50, 52, 42), P6 = polygon(6, 50, 50, 42);

  var FIXED = {
    1: { nodes: [[50, 12], [12, 82], [88, 82]], edges: [[0, 1], [1, 2], [2, 0]] },                              // tam giác
    2: { nodes: P5, edges: [[0, 2], [2, 4], [4, 1], [1, 3], [3, 0]] },                                         // ngôi sao
    3: { nodes: [[10, 15], [10, 85], [50, 50], [90, 15], [90, 85]], edges: [[0, 2], [1, 2], [0, 1], [2, 3], [2, 4], [3, 4]] }, // nơ
    5: {
      nodes: [[12, 12], [88, 12], [88, 88], [12, 88], [50, 12], [88, 50], [50, 88], [12, 50]],                // vuông + thoi
      edges: [[0, 4], [4, 1], [1, 5], [5, 2], [2, 6], [6, 3], [3, 7], [7, 0], [4, 5], [5, 6], [6, 7], [7, 4]]
    },
    8: { nodes: P5, edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0], [0, 2], [2, 4], [4, 1], [1, 3], [3, 0]] }, // ngũ giác + sao
    11: { nodes: P6, edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0], [0, 2], [2, 4], [4, 0], [1, 3], [3, 5], [5, 1]] }
  };

  /** Sinh màn ngẫu nhiên trên lưới điểm bằng phép XOR các chu trình nhỏ => mọi điểm luôn có bậc chẵn. */
  function genLevel(target) {
    var cols = target > 14 ? 5 : 4, rows = target > 18 ? 5 : 4;
    function id(r, c) { return r * cols + c; }
    function key(a, b) { return a < b ? a + '-' + b : b + '-' + a; }
    for (var attempt = 0; attempt < 800; attempt++) {
      var E = {}, count = 0;
      var tog = function (a, b) {
        var k = key(a, b);
        if (E[k]) { delete E[k]; count--; } else { E[k] = true; count++; }
      };
      for (var it = 0; it < 60 && count < target - 1; it++) {
        var r = PH.rnd(rows - 1), c = PH.rnd(cols - 1);
        var a = id(r, c), b = id(r, c + 1), cc = id(r + 1, c), d = id(r + 1, c + 1), t = PH.rnd(5);
        if (t === 0) { tog(a, b); tog(b, d); tog(a, d); }
        else if (t === 1) { tog(a, cc); tog(cc, d); tog(a, d); }
        else if (t === 2) { tog(a, b); tog(b, cc); tog(a, cc); }
        else if (t === 3) { tog(b, d); tog(cc, d); tog(b, cc); }
        else { tog(a, b); tog(b, d); tog(d, cc); tog(cc, a); }
      }
      if (count < target - 2 || count > target + 2) continue;
      // không cho hai đường chéo cắt nhau trong cùng một ô (dễ nhầm là có điểm ở giữa)
      var cross = false;
      for (r = 0; r < rows - 1 && !cross; r++) {
        for (c = 0; c < cols - 1; c++) {
          if (E[key(id(r, c), id(r + 1, c + 1))] && E[key(id(r, c + 1), id(r + 1, c))]) { cross = true; break; }
        }
      }
      if (cross) continue;
      var edges = Object.keys(E).map(function (k) { return k.split('-').map(Number); });
      // liên thông?
      var adj = {}, used = {};
      edges.forEach(function (e) {
        (adj[e[0]] = adj[e[0]] || []).push(e[1]);
        (adj[e[1]] = adj[e[1]] || []).push(e[0]);
      });
      var verts = Object.keys(adj).map(Number);
      if (verts.length < 4) continue;
      var stack = [verts[0]], seen = {};
      seen[verts[0]] = true;
      while (stack.length) {
        var v = stack.pop();
        adj[v].forEach(function (w) { if (!seen[w]) { seen[w] = true; stack.push(w); } });
      }
      if (Object.keys(seen).length !== verts.length) continue;
      // đánh số lại các điểm được dùng và căn giữa hình
      var minR = 99, maxR = -1, minC = 99, maxC = -1;
      verts.forEach(function (v) {
        var vr = Math.floor(v / cols), vc = v % cols;
        minR = Math.min(minR, vr); maxR = Math.max(maxR, vr); minC = Math.min(minC, vc); maxC = Math.max(maxC, vc);
      });
      var span = Math.max(maxR - minR, maxC - minC, 1), step = 80 / span;
      var offX = 50 - (maxC - minC) * step / 2, offY = 50 - (maxR - minR) * step / 2;
      var map = {}, nodes = [];
      verts.forEach(function (v, i) {
        map[v] = i;
        nodes.push([offX + (v % cols - minC) * step, offY + (Math.floor(v / cols) - minR) * step]);
      });
      return { nodes: nodes, edges: edges.map(function (e) { return [map[e[0]], map[e[1]]]; }) };
    }
    return null;
  }

  function levelData(n) {
    if (FIXED[n]) return FIXED[n];
    return genLevel(Math.min(24, 4 + n)) || FIXED[11];
  }

  PH.games.oneline = {
    genLevel: genLevel,        // để kiểm thử
    start: function (frame) {
      frame.saveOnExit = true;
      var levelNo = 1, total = 0, levelStart = performance.now();
      var level, used, path, currentNode, dragging, fx, fy, hintEdge, hintFrom, solved, stuckShown;
      var left = 0, top = 0, size = 0;

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
        if (!path.length) currentNode = -1;       // gỡ hết thì lại được chọn điểm xuất phát tùy ý
        hintEdge = -1; hintFrom = -1; stuckShown = false;
      }

      cv.canvas.addEventListener('pointerdown', function (e) {
        Sound.unlock();
        if (solved) return;
        var p = cv.pos(e);
        cv.canvas.setPointerCapture(e.pointerId);
        var n = nodeAt(p.x, p.y, 34);
        if (n < 0) return;
        if (!path.length) {
          // chưa vẽ cạnh nào: bắt đầu ở bất kỳ điểm nào
          currentNode = n; dragging = true; fx = p.x; fy = p.y;
          Sound.play('tap');
        } else if (n === currentNode) {
          dragging = true; fx = p.x; fy = p.y;
        }
      });
      cv.canvas.addEventListener('pointermove', function (e) {
        if (!dragging) return;
        var p = cv.pos(e);
        fx = p.x; fy = p.y;
        var n = nodeAt(p.x, p.y, 34 * 0.75);
        if (n >= 0 && n !== currentNode) {
          var edge = edgeBetween(currentNode, n);
          if (edge >= 0) {
            if (!used[edge]) traverse(edge, n);
            else if (path.length && path[path.length - 1] === edge) { undoLast(); currentNode = n; }   // kéo ngược = hoàn tác
          }
        }
      });
      function up() { dragging = false; if (!path.length) currentNode = -1; }
      cv.canvas.addEventListener('pointerup', up);
      cv.canvas.addEventListener('pointercancel', up);

      /** Thuật toán Hierholzer: đường đi Euler qua các cạnh còn lại, xuất phát từ điểm start. */
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
        var w = 9, i, e;
        ctx.lineCap = 'round';
        for (i = 0; i < level.edges.length; i++) {
          if (used[i]) continue;
          e = level.edges[i];
          ctx.strokeStyle = i === hintEdge ? th.gold : th.line;
          ctx.lineWidth = i === hintEdge ? w * 1.3 : w;
          ctx.beginPath(); ctx.moveTo(nx(e[0]), ny(e[0])); ctx.lineTo(nx(e[1]), ny(e[1])); ctx.stroke();
        }
        ctx.strokeStyle = PAL[0]; ctx.lineWidth = w * 1.15;
        for (i = 0; i < level.edges.length; i++) {
          if (!used[i]) continue;
          e = level.edges[i];
          ctx.beginPath(); ctx.moveTo(nx(e[0]), ny(e[0])); ctx.lineTo(nx(e[1]), ny(e[1])); ctx.stroke();
        }
        if (dragging && currentNode >= 0) {
          ctx.strokeStyle = PH.alpha(PAL[0], 0.45); ctx.lineWidth = w * 1.15;
          ctx.beginPath(); ctx.moveTo(nx(currentNode), ny(currentNode)); ctx.lineTo(fx, fy); ctx.stroke();
        }
        for (i = 0; i < level.nodes.length; i++) {
          var cur = i === currentNode, r = cur ? 16 : 13;
          ctx.fillStyle = cur ? PAL[0] : th.surface;
          ctx.beginPath(); ctx.arc(nx(i), ny(i), r, 0, Math.PI * 2); ctx.fill();
          ctx.lineWidth = 4;
          ctx.strokeStyle = cur ? '#fff' : (i === hintFrom && hintEdge >= 0 ? th.gold : PAL[1]);
          ctx.stroke();
        }
      });

      loadLevel();
    }
  };
})();
