/* Water Sort - bản web: rót nước để mỗi ống chỉ còn một màu. KHÔNG GIỚI HẠN số màn.
   Mỗi màn sinh ra đều được bộ giải kiểm tra trước để chắc chắn giải được.
   Có hiệu ứng nghiêng ống, dòng nước rót tự nhiên, bọt nước và gợn sóng sinh động. */
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
      var levelNo = 1, total = 0;
      var tubeW = 0, tubeH = 0, seg = 0, gapX = 14, pos = [];
      var pouring = null; // Quản lý trạng thái và hiệu ứng rót nước

      var levelInfo = h('div', { style: 'font-weight:800;font-size:16px' });
      var movesInfo = h('div', { style: 'font-weight:800;font-size:16px;color:var(--text2)' });
      var head = h('div', { style: 'display:flex;justify-content:space-between' }, [levelInfo, movesInfo]);
      var hint = h('div', { class: 'subtle', style: 'text-align:left', text: T('ws_instruction') });
      var cv = frame.makeCanvas(null, layout);
      cv.canvas.style.touchAction = 'none';

      var rowPlay = h('div', { class: 'btnrow three' }, [
        PH.UI.button('↩ ' + T('ws_undo'), '', undo),
        PH.UI.button('🔁 ' + T('ws_restart'), '', function () { if (!solved && !pouring) restart(); }),
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
        if (solved || pouring || tubes.length >= MAX_TUBES) return;
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
        if (pouring) return;
        tubes = copy(initial); history = []; selected = -1; moves = 0; solved = false; pouring = null;
        layout(cv); updateMoves();
      }

      function updateMoves() {
        movesInfo.textContent = T('ws_moves', moves);
        if (frame.saveSession) {
          frame.saveSession({ levelNo: levelNo, total: total, tubes: tubes, initial: initial, moves: moves, solved: solved });
        }
      }

      function pour(a, b) {
        if (pouring) return;
        var n = pourAmount(tubes, a, b), from = tubes[a], to = tubes[b], color = from[from.length - 1];
        var dir = (pos[b].x >= pos[a].x) ? 1 : -1;
        pouring = {
          a: a,
          b: b,
          n: n,
          color: color,
          start: performance.now(),
          dur: 520,
          fromLayers: from.slice(),
          toLayers: to.slice(),
          dir: dir,
          soundStep: 0
        };
        Sound.play('pop');
        Haptics.light();
      }

      function undo() {
        if (!history.length || solved || pouring) return;
        var m = history.pop(), from = tubes[m[0]], to = tubes[m[1]];
        for (var i = 0; i < m[2]; i++) from.push(to.pop());
        moves = Math.max(0, moves - 1); selected = -1; updateMoves();
        Sound.play('pop');
      }

      function layout(o) {
        if (!o.w || !tubes.length) return;
        var n = tubes.length, perRow = n <= 6 ? n : Math.ceil(n / 2), rows = n <= 6 ? 1 : 2;
        var pad = 10, vgap = 44;
        tubeW = Math.min((o.w - 2 * pad - (perRow - 1) * gapX) / perRow, 54);
        tubeH = Math.min(tubeW * 3.4, (o.h - 2 * pad - 24 - (rows - 1) * vgap) / rows);
        tubeW = Math.min(tubeW, tubeH / 2.9);
        seg = (tubeH - tubeW * 0.45) / CAP;
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
        if (solved || pouring) return;
        var p = cv.pos(e), hit = -1;
        for (var i = 0; i < tubes.length; i++) {
          var lift = i === selected ? 18 : 0;
          if (p.x >= pos[i].x - gapX / 2 && p.x <= pos[i].x + tubeW + gapX / 2 &&
              p.y >= pos[i].y - lift - 16 && p.y <= pos[i].y + tubeH + 8) { hit = i; break; }
        }
        if (hit < 0) { selected = -1; return; }
        if (selected === -1) {
          if (tubes[hit].length) { selected = hit; selectStart = performance.now(); Sound.play('tap'); }
        } else if (selected === hit) {
          selected = -1;
        } else if (pourAmount(tubes, selected, hit) > 0) {
          var from = selected;
          selected = -1;
          pour(from, hit);
        } else {
          Sound.play('error');
          selected = tubes[hit].length ? hit : -1;
          selectStart = performance.now();
        }
      });

      // Hàm vẽ một ống nghiệm hoàn chỉnh (hỗ trợ góc xoay và tầng nước co giãn khi rót)
      function drawSingleTube(ctx, originX, originY, w, hh, layers, angle, isSelected, isComplete, dark, outline, th, partialTopH) {
        ctx.save();
        if (angle) {
          ctx.translate(originX + w / 2, originY);
          ctx.rotate(angle);
          ctx.translate(-(w / 2), 0);
        } else {
          ctx.translate(originX, originY);
        }

        // Clip và đổ chất lỏng
        ctx.save();
        tubePath(ctx, 0, 0, w, hh);
        ctx.closePath();
        ctx.fillStyle = dark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.75)';
        ctx.fill();
        ctx.clip();

        var bottom = hh, liquidTop = bottom;
        for (var k = 0; k < layers.length; k++) {
          var sh = (k === layers.length - 1 && partialTopH !== undefined) ? partialTopH : seg;
          if (sh <= 0) continue;
          var yTop = liquidTop - sh;
          ctx.fillStyle = WATER[layers[k] - 1];
          ctx.fillRect(-2, yTop, w + 4, sh + 0.6);
          liquidTop = yTop;
        }

        if (layers.length && liquidTop < hh) {
          // Mặt nước sáng lấp lánh nhẹ
          ctx.fillStyle = 'rgba(255,255,255,0.38)';
          ctx.fillRect(-2, liquidTop, w + 4, 3);
        }

        // Vệt phản chiếu ánh sáng trên kính
        ctx.fillStyle = 'rgba(255,255,255,0.32)';
        rr(ctx, w * 0.15, 8, w * 0.13, hh - w * 0.9, w * 0.07);
        ctx.fill();
        ctx.restore(); // Hết clip nước

        // Viền ống nghiệm
        tubePath(ctx, 0, 0, w, hh);
        ctx.lineWidth = 3;
        ctx.strokeStyle = isSelected ? th.accentDark : outline;
        ctx.stroke();

        // Vành miệng ống
        ctx.fillStyle = isSelected ? th.accentDark : outline;
        rr(ctx, -4, -4, w + 8, 7, 3.5);
        ctx.fill();

        // Ống đã hoàn thành thì đậy nút bần
        if (isComplete) {
          ctx.fillStyle = '#C08A5B';
          rr(ctx, w * 0.14, -15, w * 0.72, 13, 4);
          ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.25)';
          rr(ctx, w * 0.2, -13, w * 0.6, 3, 1.5);
          ctx.fill();
        }

        ctx.restore(); // Hết translate/rotate
      }

      frame.loop(function (now) {
        var ctx = cv.ctx, th = PH.theme(), dark = document.documentElement.getAttribute('data-theme') === 'dark';
        ctx.clearRect(0, 0, cv.w, cv.h);
        if (!pos.length) return;
        var outline = dark ? 'rgba(220,214,255,0.55)' : 'rgba(110,100,160,0.45)';

        // Xử lý hoàn thành bước rót nước
        if (pouring) {
          var pNow = (now - pouring.start) / pouring.dur;
          if (pNow >= 1) {
            var pData = pouring;
            pouring = null;
            var from = tubes[pData.a], to = tubes[pData.b];
            for (var pi = 0; pi < pData.n; pi++) { from.pop(); to.push(pData.color); }
            history.push([pData.a, pData.b, pData.n]);
            moves++;
            updateMoves();
            Sound.play('place');
            Haptics.light();
            if (isDone(tubes)) {
              solved = true;
              Sound.play('clear');
              Haptics.heavy();
              var bonus = Math.max(0, 70 - moves) * 2;
              total += 100 + bonus;
              frame.setScore(total);
              frame.addCoins(8);
              frame.toast('ws_solved');
              rowPlay.classList.add('gone');
              rowDone.classList.remove('gone');
            }
          }
        }

        if (!pouring) {
          // Trạng thái tĩnh bình thường
          for (var i = 0; i < tubes.length; i++) {
            var lift = i === selected ? 18 * Math.min(1, (now - selectStart) / 140) : 0;
            var t = tubes[i], complete = t.length === CAP && uniform(t);
            drawSingleTube(ctx, pos[i].x, pos[i].y - lift, tubeW, tubeH, t, 0, i === selected, complete, dark, outline, th);
          }
        } else {
          // Đang có hiệu ứng rót nước
          var p = Math.min(1, (now - pouring.start) / pouring.dur);
          var flowP = Math.max(0, Math.min(1, (p - 0.20) / 0.60));
          var transferred = pouring.n * flowP;

          // Tiếng rót nước nhẹ trong lúc nước chảy
          if (flowP > 0.15 && pouring.soundStep === 0) {
            pouring.soundStep = 1;
            Sound.play('tap');
          }
          if (flowP > 0.65 && pouring.soundStep === 1) {
            pouring.soundStep = 2;
            Sound.play('tap');
          }

          // 1. Vẽ tất cả các ống ngoại trừ ống a (đang rót ở tiền cảnh)
          for (var i = 0; i < tubes.length; i++) {
            if (i === pouring.a) continue;
            if (i === pouring.b) {
              // Ống b nhận nước: nước dâng lên mượt mà theo flowP
              var fullLayersB = Math.floor(transferred);
              var fracLayerB = transferred - fullLayersB;
              var layersB = pouring.toLayers.slice();
              for (var fl = 0; fl < fullLayersB; fl++) layersB.push(pouring.color);
              var partialTopB = undefined;
              if (fracLayerB > 0.001) {
                layersB.push(pouring.color);
                partialTopB = fracLayerB * seg;
              } else if (fullLayersB > 0) {
                partialTopB = seg;
              }
              drawSingleTube(ctx, pos[i].x, pos[i].y, tubeW, tubeH, layersB, 0, false, false, dark, outline, th, partialTopB);
            } else {
              var t2 = tubes[i], complete2 = t2.length === CAP && uniform(t2);
              drawSingleTube(ctx, pos[i].x, pos[i].y, tubeW, tubeH, t2, 0, false, complete2, dark, outline, th);
            }
          }

          // 2. Tính toán vị trí và góc nghiêng của ống a
          var tiltFactor;
          if (p < 0.20) {
            var t0 = p / 0.20;
            tiltFactor = t0 * t0 * (3 - 2 * t0);
          } else if (p < 0.80) {
            tiltFactor = 1;
          } else {
            var t1 = (p - 0.80) / 0.20;
            tiltFactor = 1 - (t1 * t1 * (3 - 2 * t1));
          }

          var maxAngle = pouring.dir * (Math.PI * 0.42); // nghiêng ~75 độ
          var curAngle = maxAngle * tiltFactor;

          var bMouthX = pos[pouring.b].x + tubeW / 2;
          var bMouthY = pos[pouring.b].y;
          var targetLipX = bMouthX - pouring.dir * 4;
          var targetLipY = bMouthY - 18;

          var peakCurX, peakCurY;
          if (pouring.dir > 0) {
            peakCurX = targetLipX - (tubeW / 2) - (tubeW / 2) * Math.cos(maxAngle);
            peakCurY = targetLipY - (tubeW / 2) * Math.sin(maxAngle);
          } else {
            peakCurX = targetLipX - (tubeW / 2) + (tubeW / 2) * Math.cos(maxAngle);
            peakCurY = targetLipY + (tubeW / 2) * Math.sin(maxAngle);
          }

          var curX = pos[pouring.a].x + (peakCurX - pos[pouring.a].x) * tiltFactor;
          var curY = (pos[pouring.a].y - 18) + (peakCurY - (pos[pouring.a].y - 18)) * tiltFactor;

          // Vị trí miệng rót thực tế
          var lipX, lipY;
          if (pouring.dir > 0) {
            lipX = (curX + tubeW / 2) + (tubeW / 2) * Math.cos(curAngle);
            lipY = curY + (tubeW / 2) * Math.sin(curAngle);
          } else {
            lipX = (curX + tubeW / 2) - (tubeW / 2) * Math.cos(curAngle);
            lipY = curY - (tubeW / 2) * Math.sin(curAngle);
          }

          // Mặt nước hiện tại trong ống b
          var totalLiquidB = pouring.toLayers.length + transferred;
          var bLiquidTop = (pos[pouring.b].y + tubeH) - totalLiquidB * seg;

          // 3. Vẽ dòng nước uốn cong rót từ miệng ống a vào ống b
          if (flowP > 0.02 && flowP < 0.98) {
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(lipX, lipY);
            var midY = (lipY + bLiquidTop) * 0.45;
            ctx.bezierCurveTo(lipX, midY, bMouthX, midY, bMouthX, bLiquidTop);
            ctx.lineWidth = Math.max(4, tubeW * 0.16);
            ctx.strokeStyle = WATER[pouring.color - 1];
            ctx.lineCap = 'round';
            ctx.stroke();

            // Vệt phản chiếu ánh sáng trắng ở tâm dòng nước
            ctx.lineWidth = Math.max(1.5, tubeW * 0.06);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
            ctx.stroke();

            // Vòng sóng mặt nước nơi dòng nước chạm vào
            var ripW = (tubeW * 0.35) * (0.75 + 0.25 * Math.sin(now * 0.03));
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.ellipse(bMouthX, bLiquidTop, ripW, ripW * 0.3, 0, 0, Math.PI * 2);
            ctx.stroke();

            // Giọt nước li ti bắn lên
            for (var pi = 0; pi < 3; pi++) {
              var seed = (now * 0.015 + pi * 0.33) % 1;
              var splashOffset = (pi === 0 ? -1 : pi === 1 ? 1 : 0) * seed * (tubeW * 0.25);
              var splashX = bMouthX + splashOffset;
              var splashY = bLiquidTop - seed * (tubeH * 0.1) * (1 - seed * 0.5);
              var splashR = Math.max(1, 2.5 * (1 - seed));
              ctx.fillStyle = WATER[pouring.color - 1];
              ctx.beginPath();
              ctx.arc(splashX, splashY, splashR, 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.restore();
          }

          // 4. Vẽ ống a (ở tiền cảnh, hạ mức nước dần dần theo flowP)
          var stableCountA = pouring.fromLayers.length - pouring.n;
          var remainingPourA = pouring.n * (1 - flowP);
          var fullPourRemain = Math.floor(remainingPourA);
          var fracPourRemain = remainingPourA - fullPourRemain;

          var layersA = pouring.fromLayers.slice(0, stableCountA);
          for (var fi = 0; fi < fullPourRemain; fi++) layersA.push(pouring.color);
          var partialTopA = undefined;
          if (fracPourRemain > 0.001) {
            layersA.push(pouring.color);
            partialTopA = fracPourRemain * seg;
          } else if (fullPourRemain > 0) {
            partialTopA = seg;
          }

          // Đổ bóng cho ống a khi đang bay trên không
          ctx.save();
          ctx.shadowColor = 'rgba(0,0,0,0.32)';
          ctx.shadowBlur = 14;
          ctx.shadowOffsetY = 6;
          drawSingleTube(ctx, curX, curY, tubeW, tubeH, layersA, curAngle, false, false, dark, outline, th, partialTopA);
          ctx.restore();
        }
      });

      var saved = frame.loadSession ? frame.loadSession() : null;
      if (saved && typeof saved.levelNo === 'number' && Array.isArray(saved.tubes)) {
        levelNo = saved.levelNo;
        total = saved.total || 0;
        frame.setScore(total);
        tubes = saved.tubes;
        initial = saved.initial || copy(tubes);
        moves = saved.moves || 0;
        solved = !!saved.solved;
        levelInfo.textContent = T('ws_level', levelNo);
        updateMoves();
        layout(cv);
        if (solved) {
          rowPlay.classList.add('gone');
          rowDone.classList.remove('gone');
        }
      } else {
        loadLevel();
      }
    }
  };
})();
