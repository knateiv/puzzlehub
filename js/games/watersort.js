/* Water Sort - bản web: rót nước giữa các ống để mỗi ống chỉ còn một màu. */
(function () {
  'use strict';
  var PH = window.PH, h = PH.h, T = PH.T, rr = PH.rr, PAL = PH.PALETTE, Sound = PH.Sound, Haptics = PH.Haptics;
  var CAP = 4, LEVELS = 3, COST_TUBE = 40, MAX_TUBES = 12;

  PH.games.watersort = {
    start: function (frame) {
      var tubes = [], initial = [], history = [], moves = 0, solved = false, selected = -1, selectStart = 0;
      var grow = {};             // chỉ số ống -> {start, count}
      var level = 0, total = 0;
      var tubeW = 0, tubeH = 0, gapX = 12, pos = [];

      var levelInfo = h('div', { style: 'font-weight:800;font-size:16px' });
      var movesInfo = h('div', { style: 'font-weight:800;font-size:16px;color:var(--text2)' });
      var head = h('div', { style: 'display:flex;justify-content:space-between' }, [levelInfo, movesInfo]);
      var hint = h('div', { class: 'subtle', style: 'text-align:left', text: T('ws_instruction') });
      var cv = frame.makeCanvas(null, layout);
      var nextBtn = PH.UI.button(T('ws_next'), 'primary gone', onNext);
      var row = h('div', { class: 'btnrow' }, [
        PH.UI.button('↩ ' + T('ws_undo'), '', undo),
        PH.UI.button('🔁 ' + T('ws_restart'), '', function () { if (!solved) restart(); })
      ]);
      frame.stage.insertBefore(head, cv.canvas);
      frame.stage.insertBefore(hint, cv.canvas);
      frame.stage.appendChild(row);
      frame.stage.appendChild(nextBtn);

      frame.addPowerUp('🧪', 'ws_add_tube', COST_TUBE, function () {
        if (solved || tubes.length >= MAX_TUBES) return;
        if (!frame.trySpend(COST_TUBE)) return;
        tubes.push([]); initial.push([]);
        layout(cv); Sound.play('pop');
      });

      function copy(t) { return t.map(function (x) { return x.slice(); }); }

      function newLevel(colors) {
        var pool = [], t, i, c, k;
        for (c = 1; c <= colors; c++) for (k = 0; k < CAP; k++) pool.push(c);
        function anySorted(tt) {
          return tt.some(function (tube) { return tube.every(function (v) { return v === tube[0]; }); });
        }
        do {
          PH.shuffle(pool);
          t = [];
          for (i = 0; i < colors; i++) t.push(pool.slice(i * CAP, (i + 1) * CAP));
        } while (anySorted(t));
        t.push([]); t.push([]);
        initial = copy(t);
        restart();
      }
      function restart() {
        tubes = copy(initial); history = []; selected = -1; moves = 0; solved = false; grow = {};
        layout(cv); updateMoves();
      }
      function updateMoves() { movesInfo.textContent = T('ws_moves', moves); }

      function top(t) { return t.length ? t[t.length - 1] : 0; }
      function topRun(t) {
        if (!t.length) return 0;
        var c = top(t), n = 0;
        for (var i = t.length - 1; i >= 0 && t[i] === c; i--) n++;
        return n;
      }
      function pourAmount(a, b) {
        if (a === b) return 0;
        var from = tubes[a], to = tubes[b];
        if (!from.length) return 0;
        if (to.length && top(to) !== top(from)) return 0;
        return Math.min(topRun(from), CAP - to.length);
      }
      function pour(a, b) {
        var n = pourAmount(a, b), from = tubes[a], to = tubes[b], color = top(from);
        for (var i = 0; i < n; i++) { from.pop(); to.push(color); }
        history.push([a, b, n]);
        grow[b] = { start: performance.now(), count: n };
        moves++; updateMoves();
        Sound.play('pop'); Haptics.light();
        var ok = tubes.every(function (t) {
          return !t.length || (t.length === CAP && t.every(function (v) { return v === t[0]; }));
        });
        if (ok) {
          solved = true;
          Sound.play('clear'); Haptics.heavy();
          var bonus = Math.max(0, 70 - moves) * 2;
          total += 100 + bonus;
          frame.setScore(total); frame.addCoins(8);
          frame.toast('ws_solved');
          nextBtn.textContent = level + 1 >= LEVELS ? T('end_title') : T('ws_next');
          nextBtn.classList.remove('gone'); row.classList.add('gone');
        }
      }
      function undo() {
        if (!history.length || solved) return;
        var m = history.pop(), from = tubes[m[0]], to = tubes[m[1]];
        for (var i = 0; i < m[2]; i++) from.push(to.pop());
        moves = Math.max(0, moves - 1); selected = -1; updateMoves();
      }

      function layout(o) {
        if (!o.w || !tubes.length) return;
        var n = tubes.length, perRow = n <= 5 ? n : Math.ceil(n / 2), rows = n <= 5 ? 1 : 2;
        var pad = 8, vgap = 34;
        tubeW = Math.min((o.w - 2 * pad - (perRow - 1) * gapX) / perRow, 64);
        tubeH = Math.min(tubeW * 3, (o.h - 2 * pad - (rows - 1) * vgap) / rows);
        tubeW = Math.min(tubeW, tubeH / 2.6);
        var totalH = rows * tubeH + (rows - 1) * vgap, topY = (o.h - totalH) / 2 + 8;
        pos = [];
        for (var i = 0; i < n; i++) {
          var r = Math.floor(i / perRow), c = i % perRow;
          var inRow = (r === rows - 1) ? n - r * perRow : perRow;
          var rw = inRow * tubeW + (inRow - 1) * gapX;
          pos.push({ x: (o.w - rw) / 2 + c * (tubeW + gapX), y: topY + r * (tubeH + vgap) });
        }
      }

      cv.canvas.addEventListener('pointerdown', function (e) {
        Sound.unlock();
        if (solved) return;
        var p = cv.pos(e), hit = -1;
        for (var i = 0; i < tubes.length; i++) {
          var lift = i === selected ? 16 : 0;
          if (p.x >= pos[i].x - gapX / 2 && p.x <= pos[i].x + tubeW + gapX / 2 &&
              p.y >= pos[i].y - lift - 6 && p.y <= pos[i].y + tubeH + 6) { hit = i; break; }
        }
        if (hit < 0) { selected = -1; return; }
        if (selected === -1) {
          if (tubes[hit].length) { selected = hit; selectStart = performance.now(); Sound.play('tap'); }
        } else if (selected === hit) selected = -1;
        else if (pourAmount(selected, hit) > 0) { var from = selected; selected = -1; pour(from, hit); }
        else {
          Sound.play('error');
          selected = tubes[hit].length ? hit : -1; selectStart = performance.now();
        }
      });

      function onNext() {
        if (level + 1 >= LEVELS) frame.endGame(total, 20);
        else { level++; loadLevel(); }
      }
      function loadLevel() {
        levelInfo.textContent = T('ws_level', level + 1);
        nextBtn.classList.add('gone'); row.classList.remove('gone');
        newLevel(4 + level);
      }

      frame.loop(function (now) {
        var ctx = cv.ctx, th = PH.theme();
        ctx.clearRect(0, 0, cv.w, cv.h);
        if (!pos.length) return;
        var seg = (tubeH - tubeW * 0.25) / CAP;
        for (var i = 0; i < tubes.length; i++) {
          var lift = 0;
          if (i === selected) lift = 16 * Math.min(1, (now - selectStart) / 140);
          var x = pos[i].x, y = pos[i].y - lift;
          ctx.fillStyle = PH.alpha('#FFFFFF', 0.35);
          rr(ctx, x, y, tubeW, tubeH, tubeW * 0.4); ctx.fill();
          var t = tubes[i], gk = 1;
          if (grow[i]) gk = Math.min(1, (now - grow[i].start) / 260);
          for (var k = 0; k < t.length; k++) {
            var bottom = y + tubeH - tubeW * 0.12 - k * seg, sh = seg;
            var growing = grow[i] && k >= t.length - grow[i].count && gk < 1;
            if (growing) sh = seg * gk;
            ctx.fillStyle = PAL[t[k] - 1];
            var rad = k === 0 ? tubeW * 0.3 : tubeW * 0.06;
            rr(ctx, x + tubeW * 0.12, bottom - sh, tubeW * 0.76, sh, rad); ctx.fill();
          }
          ctx.lineWidth = 3.5; ctx.strokeStyle = i === selected ? PAL[0] : th.line;
          rr(ctx, x, y, tubeW, tubeH, tubeW * 0.4); ctx.stroke();
        }
      });

      loadLevel();
    }
  };
})();
