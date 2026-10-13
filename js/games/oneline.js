/* One Line - bản web: nối mọi cạnh bằng một nét vẽ (đường đi Euler). */
(function () {
  'use strict';
  var PH = window.PH, h = PH.h, T = PH.T, PAL = PH.PALETTE, Sound = PH.Sound, Haptics = PH.Haptics;
  var RUN = 5, COST_HINT = 25;

  function polygon(n, cx, cy, rad) {
    var pts = [];
    for (var k = 0; k < n; k++) {
      var a = (-90 + (360 / n) * k) * Math.PI / 180;
      pts.push([cx + rad * Math.cos(a), cy + rad * Math.sin(a)]);
    }
    return pts;
  }
  var PENTA = polygon(5, 50, 52, 42), HEXA = polygon(6, 50, 50, 42);

  var LEVELS = [
    { nodes: [[50, 12], [12, 82], [88, 82]], edges: [[0, 1], [1, 2], [2, 0]] },
    { nodes: [[15, 15], [85, 15], [85, 85], [15, 85]], edges: [[0, 1], [1, 2], [2, 3], [3, 0], [0, 2]] },
    { nodes: [[15, 50], [85, 50], [85, 90], [15, 90], [50, 10]], edges: [[0, 1], [1, 2], [2, 3], [3, 0], [0, 4], [1, 4], [0, 2]] },
    { nodes: PENTA, edges: [[0, 2], [2, 4], [4, 1], [1, 3], [3, 0]] },
    { nodes: [[50, 8], [92, 50], [50, 92], [8, 50], [50, 50]], edges: [[0, 1], [1, 2], [2, 3], [3, 0], [0, 4], [4, 2]] },
    { nodes: [[10, 15], [10, 85], [50, 50], [90, 15], [90, 85]], edges: [[0, 2], [1, 2], [0, 1], [2, 3], [2, 4], [3, 4]] },
    { nodes: [[15, 25], [50, 25], [85, 25], [15, 75], [50, 75], [85, 75]], edges: [[0, 1], [1, 2], [3, 4], [4, 5], [0, 3], [1, 4], [2, 5]] },
    { nodes: [[8, 50], [42, 18], [78, 50], [42, 82], [95, 22], [95, 78]], edges: [[0, 1], [1, 2], [2, 3], [3, 0], [0, 2], [2, 4], [2, 5], [4, 5]] },
    { nodes: HEXA, edges: [[0, 2], [2, 4], [4, 0], [1, 3], [3, 5], [5, 1]] },
    { nodes: PENTA, edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0], [0, 2], [2, 4], [4, 1], [1, 3], [3, 0]] },
    { nodes: [[15, 15], [85, 15], [85, 85], [15, 85]], edges: [[0, 1], [1, 2], [2, 3], [3, 0], [0, 2], [1, 3]] },
    { nodes: HEXA, edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0], [0, 2], [2, 4], [4, 0], [1, 3], [3, 5], [5, 1]] }
  ];

  function randomRun() {
    function grp(a, b) { var l = []; for (var i = a; i <= b; i++) l.push(i); return PH.shuffle(l); }
    var e = grp(0, 3), m = grp(4, 7), hd = grp(8, 11);
    return [e[0], e[1], m[0], m[1], hd[0]];
  }

  PH.games.oneline = {
    start: function (frame) {
      var run = randomRun(), step = 0, total = 0, levelStart = performance.now();
      var level, used, path, currentNode, dragging, fx, fy, hintEdge, hintTo, solved;
      var left = 0, top = 0, size = 0;

      var levelInfo = h('div', { class: 'hl', style: 'font-size:16px;padding-bottom:0' });
      var status = h('div', { class: 'subtle', text: T('ol_instruction') });
      var cv = frame.makeCanvas(null, function (o) {
        size = Math.min(o.w, o.h) * 0.92; left = (o.w - size) / 2; top = (o.h - size) / 2;
      });
      var nextBtn = PH.UI.button(T('ol_next'), 'primary gone', onNext);
      var undoBtn = PH.UI.button('↩ ' + T('ol_undo'), '', function () { undoLast(); });
      var resetBtn = PH.UI.button('🔁 ' + T('ol_reset'), '', function () { if (!solved) resetPath(); });
      var row = h('div', { class: 'btnrow' }, [undoBtn, resetBtn]);
      frame.stage.insertBefore(levelInfo, cv.canvas);
      frame.stage.insertBefore(status, cv.canvas);
      frame.stage.appendChild(row);
      frame.stage.appendChild(nextBtn);

      frame.addPowerUp('💡', 'ol_hint', COST_HINT, function () {
        if (solved) return;
        if (frame.trySpend(COST_HINT)) showHint();
      });

      function nx(i) { return left + level.nodes[i][0] / 100 * size; }
      function ny(i) { return top + level.nodes[i][1] / 100 * size; }

      function loadLevel() {
        level = LEVELS[run[step]];
        levelInfo.textContent = T('ol_level', step + 1, RUN);
        status.textContent = T('ol_instruction');
        nextBtn.classList.add('gone'); row.classList.remove('gone');
        resetPath();
        levelStart = performance.now();
      }
      function resetPath() {
        used = level.edges.map(function () { return false; });
        path = []; currentNode = -1; dragging = false; hintEdge = -1; hintTo = -1; solved = false;
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
      function traverse(edge, to) {
        used[edge] = true; path.push(edge); currentNode = to; hintEdge = -1;
        Sound.play('pop'); Haptics.light();
        if (path.length === level.edges.length) {
          solved = true; dragging = false;
          Sound.play('clear'); Haptics.heavy();
          onSolved();
        }
      }
      function undoLast() {
        if (!path.length || solved) return;
        var edge = path.pop();
        used[edge] = false;
        var e = level.edges[edge];
        currentNode = (e[0] === currentNode) ? e[1] : e[0];
        hintEdge = -1;
      }

      cv.canvas.addEventListener('pointerdown', function (e) {
        Sound.unlock();
        if (solved) return;
        var p = cv.pos(e);
        cv.canvas.setPointerCapture(e.pointerId);
        var n = nodeAt(p.x, p.y, 34);
        if (n < 0) return;
        if (currentNode === -1 || n === currentNode) {
          currentNode = n; dragging = true; fx = p.x; fy = p.y; hintEdge = -1;
          Sound.play('tap');
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
            else if (path.length && path[path.length - 1] === edge) undoLast();   // kéo ngược = hoàn tác
          }
        }
      });
      function up() { dragging = false; }
      cv.canvas.addEventListener('pointerup', up);
      cv.canvas.addEventListener('pointercancel', up);

      // ---- gợi ý: tìm đường đi Euler bằng quay lui từ trạng thái hiện tại
      function dfs(node, u, count, out) {
        if (count === level.edges.length) return true;
        for (var i = 0; i < level.edges.length; i++) {
          if (u[i]) continue;
          var e = level.edges[i];
          if (e[0] !== node && e[1] !== node) continue;
          var other = e[0] === node ? e[1] : e[0];
          u[i] = true; out.push([i, other]);
          if (dfs(other, u, count + 1, out)) return true;
          out.pop(); u[i] = false;
        }
        return false;
      }
      function findNext() {
        var out;
        if (currentNode !== -1) {
          out = [];
          if (dfs(currentNode, used.slice(), path.length, out)) return [out[0][0], out[0][1], currentNode];
          return null;
        }
        var deg = level.nodes.map(function () { return 0; });
        level.edges.forEach(function (e) { deg[e[0]]++; deg[e[1]]++; });
        for (var pass = 0; pass < 2; pass++) {
          for (var s = 0; s < level.nodes.length; s++) {
            var odd = deg[s] % 2 === 1;
            if ((pass === 0) !== odd) continue;
            out = [];
            if (dfs(s, level.edges.map(function () { return false; }), 0, out)) return [out[0][0], out[0][1], s];
          }
        }
        return null;
      }
      function showHint() {
        var nx2 = findNext();
        if (!nx2) { resetPath(); nx2 = findNext(); }
        if (nx2) { hintEdge = nx2[0]; hintTo = nx2[1]; if (currentNode === -1) currentNode = nx2[2]; }
      }

      function onSolved() {
        var seconds = Math.floor((performance.now() - levelStart) / 1000);
        var bonus = Math.max(0, 60 - seconds) * 2;
        total += 100 + bonus;
        frame.setScore(total); frame.addCoins(5);
        status.textContent = T('ol_solved') + '  +' + (100 + bonus);
        nextBtn.textContent = step + 1 >= RUN ? T('end_title') : T('ol_next');
        nextBtn.classList.remove('gone'); row.classList.add('gone');
      }
      function onNext() {
        if (step + 1 >= RUN) frame.endGame(total, 20);
        else { step++; loadLevel(); }
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
          ctx.strokeStyle = cur ? '#fff' : (i === hintTo && hintEdge >= 0 ? th.gold : PAL[1]);
          ctx.stroke();
        }
      });

      loadLevel();
    }
  };
})();
