/* Water Sort - bản web: rót nước để mỗi ống chỉ còn một màu. KHÔNG GIỚI HẠN số màn.
   Mỗi màn sinh ra đều được bộ giải kiểm tra trước để chắc chắn giải được. */
(function () {
  'use strict';
  var PH = window.PH, h = PH.h, T = PH.T, rr = PH.rr, Sound = PH.Sound, Haptics = PH.Haptics;
  var CAP = 4, COST_TUBE = 40, MAX_TUBES = 12;
  // 8 màu nước tách bạch, dễ phân biệt
  var WATER = ['#FA5252', '#FD7E14', '#FCC419', '#40C057', '#4DABF7', '#7950F2', '#F06595', '#A0522D'];

  function copy(t) { return t.map(function (x) { return x.slice(); }); }
  function uniform(t) { return t.every(function (v) { return v === t[0]; }); }
  function isDone(tubes) {
    return tubes.every(function (t) { return !t.length || (t.length === CAP && uniform(t)); });
  }
  function topRun(t) {
    if (!t.length) return 0;
    var c = t[t.length - 1], n = 0;
    for (var i = t.length - 1; i >= 0 && t[i] === c; i--) n++;
    return n;
  }
  function pourAmount(tubes, a, b) {
    if (a === b) return 0;
    var from = tubes[a], to = tubes[b];
    if (!from.length) return 0;
    if (to.length && to[to.length - 1] !== from[from.length - 1]) return 0;
    return Math.min(topRun(from), CAP - to.length);
  }

  /** Tìm kiếm theo chiều sâu có ghi nhớ trạng thái; dừng khi vượt quá "budget" bước. */
  function solvable(start, budget) {
    var seen = new Set(), nodes = 0;
    function key(t) { return t.map(function (x) { return x.join(''); }).sort().join('|'); }
    function dfs(t) {
      if (isDone(t)) return true;
      if (++nodes > budget) return false;
      var k = key(t);
      if (seen.has(k)) return false;
      seen.add(k);
      for (var a = 0; a < t.length; a++) {
        if (!t[a].length || (t[a].length === CAP && uniform(t[a]))) continue;
        for (var b = 0; b < t.length; b++) {
          var n = pourAmount(t, a, b);
          if (!n) continue;
          if (!t[b].length && uniform(t[a])) continue;     // rót cả ống một màu sang ống rỗng: vô ích
          var nt = copy(t), c = nt[a][nt[a].length - 1];
          for (var i = 0; i < n; i++) { nt[a].pop(); nt[b].push(c); }
          if (dfs(nt)) return true;
        }
      }
      return false;
    }
    return dfs(start);
  }

  function makeLevel(colors) {
    var pool = [], c, k, t = null;
    for (c = 1; c <= colors; c++) for (k = 0; k < CAP; k++) pool.push(c);
    for (var attempt = 0; attempt < 40; attempt++) {
      PH.shuffle(pool);
      t = [];
      for (var i = 0; i < colors; i++) t.push(pool.slice(i * CAP, (i + 1) * CAP));
      if (t.some(uniform)) continue;
      t.push([]); t.push([]);
      if (solvable(copy(t), 30000)) return t;
    }
    if (t.length === colors) { t.push([]); t.push([]); }
    return t;
  }

  /** Hình ống nghiệm: thân thẳng, đáy tròn, miệng hở. */
  function tubePath(ctx, x, y, w, hh) {
    var r = w / 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + hh - r);
    ctx.arc(x + r, y + hh - r, r, Math.PI, 0, true);
    ctx.lineTo(x + w, y);
  }

  PH.games.watersort = {
    makeLevel: makeLevel, solvable: solvable,     // để kiểm thử
    start: function (frame) {
      frame.saveOnExit = true;
      var tubes = [], initial = [], history = [], moves = 0, solved = false, selected = -1, selectStart = 0;
      var grow = {}, levelNo = 1, total = 0;
      var tubeW = 0, tubeH = 0, gapX = 14, pos = [];

      var levelInfo = h('div', { style: 'font-weight:800;font-size:16px' });
      var movesInfo = h('div', { style: 'font-weight:800;font-size:16px;color:var(--text2)' });
      var head = h('div', { style: 'display:flex;justify-content:space-between' }, [levelInfo, movesInfo]);
      var hint = h('div', { class: 'subtle', style: 'text-align:left', text: T('ws_instruction') });
      var cv = frame.makeCanvas(null, layout);
      var rowPlay = h('div', { class: 'btnrow three' }, [
        PH.UI.button('↩ ' + T('ws_undo'), '', undo),
        PH.UI.button('🔁 ' + T('ws_restart'), '', function () { if (!solved) restart(); }),
        frame.finishButton()
      ]);
      var rowDone = h('div', { class: 'btnrow gone' }, [
        PH.UI.button(T('ws_next'), 'primary', function () { levelNo++; loadLevel(); }),
        frame.finishButton()
      ]);
      frame.stage.insertBefore(head, cv.canvas);
      frame.stage.insertBefore(hint, cv.canvas);
      frame.stage.appendChild(rowPlay);
      frame.stage.appendChild(rowDone);

      frame.addPowerUp('🧪', 'ws_add_tube', COST_TUBE, function () {
        if (solved || tubes.length >= MAX_TUBES) return;
        if (!frame.trySpend(COST_TUBE)) return;
        tubes.push([]); initial.push([]);
        layout(cv); Sound.play('pop');
      });

      function loadLevel() {
        levelInfo.textContent = T('ws_level', levelNo);
        rowDone.classList.add('gone'); rowPlay.classList.remove('gone');
        initial = makeLevel(Math.min(8, 4 + Math.floor((levelNo - 1) / 2)));   // 4 màu, tăng dần tới 8 màu
        restart();
      }
      function restart() {
        tubes = copy(initial); history = []; selected = -1; moves = 0; solved = false; grow = {};
        layout(cv); updateMoves();
      }
      function updateMoves() { movesInfo.textContent = T('ws_moves', moves); }

      function pour(a, b) {
        var n = pourAmount(tubes, a, b), from = tubes[a], to = tubes[b], color = from[from.length - 1];
        for (var i = 0; i < n; i++) { from.pop(); to.push(color); }
        history.push([a, b, n]);
        grow[b] = { start: performance.now(), count: n };
        moves++; updateMoves();
        Sound.play('pop'); Haptics.light();
        if (isDone(tubes)) {
          solved = true;
          Sound.play('clear'); Haptics.heavy();
          var bonus = Math.max(0, 70 - moves) * 2;
          total += 100 + bonus;
          frame.setScore(total); frame.addCoins(8);
          frame.toast('ws_solved');
          rowPlay.classList.add('gone'); rowDone.classList.remove('gone');
        }
      }
      function undo() {
        if (!history.length || solved) return;
        var m = history.pop(), from = tubes[m[0]], to = tubes[m[1]];
        for (var i = 0; i < m[2]; i++) from.push(to.pop());
        delete grow[m[1]];
        moves = Math.max(0, moves - 1); selected = -1; updateMoves();
      }

      function layout(o) {
        if (!o.w || !tubes.length) return;
        var n = tubes.length, perRow = n <= 6 ? n : Math.ceil(n / 2), rows = n <= 6 ? 1 : 2;
        var pad = 10, vgap = 44;
        tubeW = Math.min((o.w - 2 * pad - (perRow - 1) * gapX) / perRow, 54);
        tubeH = Math.min(tubeW * 3.4, (o.h - 2 * pad - 24 - (rows - 1) * vgap) / rows);
        tubeW = Math.min(tubeW, tubeH / 2.9);
        var totalH = rows * tubeH + (rows - 1) * vgap, topY = (o.h - totalH) / 2 + 14;
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
          var lift = i === selected ? 18 : 0;
          if (p.x >= pos[i].x - gapX / 2 && p.x <= pos[i].x + tubeW + gapX / 2 &&
              p.y >= pos[i].y - lift - 16 && p.y <= pos[i].y + tubeH + 8) { hit = i; break; }
        }
        if (hit < 0) { selected = -1; return; }
        if (selected === -1) {
          if (tubes[hit].length) { selected = hit; selectStart = performance.now(); Sound.play('tap'); }
        } else if (selected === hit) selected = -1;
        else if (pourAmount(tubes, selected, hit) > 0) { var from = selected; selected = -1; pour(from, hit); }
        else {
          Sound.play('error');
          selected = tubes[hit].length ? hit : -1; selectStart = performance.now();
        }
      });

      frame.loop(function (now) {
        var ctx = cv.ctx, th = PH.theme(), dark = document.documentElement.getAttribute('data-theme') === 'dark';
        ctx.clearRect(0, 0, cv.w, cv.h);
        if (!pos.length) return;
        var seg = (tubeH - tubeW * 0.45) / CAP;
        var outline = dark ? 'rgba(220,214,255,0.55)' : 'rgba(110,100,160,0.45)';
        for (var i = 0; i < tubes.length; i++) {
          var lift = i === selected ? 18 * Math.min(1, (now - selectStart) / 140) : 0;
          var x = pos[i].x, y = pos[i].y - lift, w = tubeW, hh = tubeH;
          var t = tubes[i], complete = t.length === CAP && uniform(t);

          // thân ống (kính) + nước, cắt theo hình ống nghiệm
          ctx.save();
          tubePath(ctx, x, y, w, hh);
          ctx.closePath();
          ctx.fillStyle = dark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.75)';
          ctx.fill();
          ctx.clip();
          var gk = grow[i] ? Math.min(1, (now - grow[i].start) / 260) : 1;
          var bottom = y + hh, liquidTop = bottom;
          for (var k = 0; k < t.length; k++) {
            var sh = seg;
            if (grow[i] && k >= t.length - grow[i].count && gk < 1) sh = seg * gk;
            var yTop = liquidTop - sh;
            ctx.fillStyle = WATER[t[k] - 1];
            ctx.fillRect(x - 2, yTop, w + 4, sh + 0.6);
            liquidTop = yTop;
          }
          if (t.length) {
            // mặt nước sáng hơn một chút
            ctx.fillStyle = 'rgba(255,255,255,0.35)';
            ctx.fillRect(x - 2, liquidTop, w + 4, 3);
          }
          // vệt sáng của kính
          ctx.fillStyle = 'rgba(255,255,255,0.32)';
          rr(ctx, x + w * 0.15, y + 8, w * 0.13, hh - w * 0.9, w * 0.07);
          ctx.fill();
          ctx.restore();

          // viền ống và miệng ống
          tubePath(ctx, x, y, w, hh);
          ctx.lineWidth = 3;
          ctx.strokeStyle = i === selected ? th.accentDark : outline;
          ctx.stroke();
          ctx.fillStyle = i === selected ? th.accentDark : outline;
          rr(ctx, x - 4, y - 4, w + 8, 7, 3.5);
          ctx.fill();
          // ống đã hoàn thành thì đậy nút bần
          if (complete) {
            ctx.fillStyle = '#C08A5B';
            rr(ctx, x + w * 0.14, y - 15, w * 0.72, 13, 4);
            ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.25)';
            rr(ctx, x + w * 0.2, y - 13, w * 0.6, 3, 1.5);
            ctx.fill();
          }
        }
      });

      loadLevel();
    }
  };
})();
