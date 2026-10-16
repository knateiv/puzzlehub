/* Fruit Merge - bản web, kiểu "Suika": kéo để chọn vị trí, thả tay để thả trái cây ở BẤT KỲ chỗ nào.
   Trái cây rơi theo trọng lực, va chạm, lăn vào nhau; hai trái giống nhau chạm nhau sẽ gộp thành trái lớn hơn.
   Vật lý dùng tích phân Verlet + tách chồng lấn (tọa độ thế giới: chiều rộng hộp = 1). */
(function () {
  'use strict';
  var PH = window.PH, h = PH.h, T = PH.T, rr = PH.rr, Sound = PH.Sound, Haptics = PH.Haptics;
  var FRUITS = ['', '🍒', '🍓', '🍇', '🍊', '🍎', '🍐', '🍑', '🍍', '🍉'];
  var RADIUS = [0, 0.052, 0.066, 0.082, 0.098, 0.116, 0.136, 0.158, 0.182, 0.21];
  var COLORS = ['', '#FF8FAB', '#FFB3B3', '#C9B8F5', '#FFC48C', '#FF9E9E', '#C8E6A0', '#FFD0BC', '#FFE27A', '#8FE3C0'];
  var MAX = 9, WORLD_H = 1.4, DANGER = 0.25, SPAWN_Y = 0.12, G = 2.6, DT = 1 / 120;
  var COST_SWAP = 20, COST_HAMMER = 40, DROP_COOLDOWN = 450;

  PH.games.fruitmerge = {
    start: function (frame) {
      frame.saveOnExit = true;
      var bodies = [], floats = [];
      var score = 0, held = 1, next = 1, aimX = 0.5, lastDrop = -9999, over = false, hammer = false;
      var acc = 0, lastT = 0, anyDanger = false;
      var scale = 1, boxL = 0, boxT = 0, headerPx = 58;
      var hammerBtn;

      var hint = h('div', { class: 'subtle', text: T('fm_instruction') });
      var cv = frame.makeCanvas(null, function (o) {
        scale = Math.max(50, Math.min(o.w - 8, (o.h - headerPx - 6) / WORLD_H));
        boxL = (o.w - scale) / 2; boxT = headerPx;
      });
      frame.stage.insertBefore(hint, cv.canvas);

      function randomFruit() {
        var r = PH.rnd(100);
        return r < 30 ? 1 : r < 58 ? 2 : r < 80 ? 3 : r < 93 ? 4 : 5;
      }
      held = randomFruit(); next = randomFruit();

      frame.addPowerUp('🔀', 'fm_swap', COST_SWAP, function () {
        if (over) return;
        if (!frame.trySpend(COST_SWAP)) return;
        held = randomFruit(); aimX = clampAim(aimX); Sound.play('pop');
      });
      hammerBtn = frame.addPowerUp('🔨', 'fm_hammer', COST_HAMMER, function () {
        if (over) return;
        hammer = !hammer;
        frame.setPowerUpActive(hammerBtn, hammer);
        if (hammer) frame.toast('fm_hint_hammer');
      });

      function addBody(x, y, level, vx, vy) {
        var b = {
          x: x, y: y, px: x - (vx || 0), py: y - (vy || 0), r: RADIUS[level], level: level,
          angle: 0, born: performance.now(), popAt: 0, overT: 0, dead: false
        };
        bodies.push(b);
        return b;
      }
      function toWorld(e) {
        var p = cv.pos(e);
        return { x: (p.x - boxL) / scale, y: (p.y - boxT) / scale };
      }
      function clampAim(x) { var r = RADIUS[held]; return PH.clamp(x, r + 0.003, 1 - r - 0.003); }
      function ready(now) { return now - lastDrop > DROP_COOLDOWN; }

      function drop() {
        var now = performance.now();
        if (!ready(now)) return;
        addBody(aimX, SPAWN_Y, held, 0, 0);
        held = next; next = randomFruit();
        aimX = clampAim(aimX);
        lastDrop = now;
        Sound.play('place'); Haptics.light();
      }

      function useHammer(w) {
        var hit = null;
        bodies.forEach(function (b) {
          var dx = b.x - w.x, dy = b.y - w.y;
          if (dx * dx + dy * dy <= b.r * b.r) hit = b;
        });
        hammer = false; frame.setPowerUpActive(hammerBtn, false);
        if (!hit || !frame.trySpend(COST_HAMMER)) return;
        bodies.splice(bodies.indexOf(hit), 1);
        Sound.play('clear'); Haptics.heavy();
      }

      cv.canvas.addEventListener('pointerdown', function (e) {
        Sound.unlock();
        if (over) return;
        cv.canvas.setPointerCapture(e.pointerId);
        if (!hammer) aimX = clampAim(toWorld(e).x);
      });
      cv.canvas.addEventListener('pointermove', function (e) {
        if (over || hammer) return;
        aimX = clampAim(toWorld(e).x);
      });
      cv.canvas.addEventListener('pointerup', function (e) {
        if (over) return;
        var w = toWorld(e);
        if (hammer) { useHammer(w); return; }
        aimX = clampAim(w.x);
        drop();
      });

      // ------------------------------------------------------------ vật lý
      function step() {
        var i, j, a, b;
        for (i = 0; i < bodies.length; i++) {
          b = bodies[i];
          var vx = (b.x - b.px) * 0.996, vy = (b.y - b.py) * 0.996;
          var sp = Math.sqrt(vx * vx + vy * vy), vmax = 0.03;
          if (sp > vmax) { vx *= vmax / sp; vy *= vmax / sp; }
          b.px = b.x; b.py = b.y;
          b.x += vx; b.y += vy + G * DT * DT;
          b.angle += vx / b.r;                       // trái cây lăn tròn theo chiều ngang
        }
        for (var it = 0; it < 6; it++) {
          for (i = 0; i < bodies.length; i++) {
            a = bodies[i];
            for (j = i + 1; j < bodies.length; j++) {
              b = bodies[j];
              var dx = b.x - a.x, dy = b.y - a.y, rs = a.r + b.r, d2 = dx * dx + dy * dy;
              if (d2 >= rs * rs || d2 < 1e-12) continue;
              var d = Math.sqrt(d2), ov = rs - d, nx = dx / d, ny = dy / d;
              var ma = a.r * a.r, mb = b.r * b.r, tot = ma + mb;
              a.x -= nx * ov * (mb / tot); a.y -= ny * ov * (mb / tot);
              b.x += nx * ov * (ma / tot); b.y += ny * ov * (ma / tot);
            }
          }
          for (i = 0; i < bodies.length; i++) {
            b = bodies[i];
            if (b.x < b.r) { b.x = b.r; b.px = b.x + (b.x - b.px) * 0.3; }
            if (b.x > 1 - b.r) { b.x = 1 - b.r; b.px = b.x + (b.x - b.px) * 0.3; }
            if (b.y > WORLD_H - b.r) {
              b.y = WORLD_H - b.r;
              b.px = b.x - (b.x - b.px) * 0.985;     // ma sát với đáy hộp
            }
          }
        }
        mergeCheck();
      }

      function mergeCheck() {
        var now = performance.now();
        for (var i = 0; i < bodies.length; i++) {
          var a = bodies[i];
          if (a.dead) continue;
          for (var j = i + 1; j < bodies.length; j++) {
            var b = bodies[j];
            if (b.dead || b.level !== a.level) continue;
            var dx = b.x - a.x, dy = b.y - a.y, rs = a.r + b.r + 0.003;
            if (dx * dx + dy * dy > rs * rs) continue;
            a.dead = b.dead = true;
            var lvl = a.level + 1, mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
            var vx = ((a.x - a.px) + (b.x - b.px)) / 2, vy = ((a.y - a.py) + (b.y - b.py)) / 2;
            var pts;
            if (lvl > MAX) {
              pts = 500;                              // hai quả dưa hấu gộp nhau: biến mất, thưởng lớn
              Sound.play('win');
            } else {
              var nb = addBody(PH.clamp(mx, RADIUS[lvl], 1 - RADIUS[lvl]), my, lvl, vx, vy);
              nb.popAt = now;
              pts = lvl * (lvl + 1) / 2 * 10;
              Sound.play(lvl >= 6 ? 'combo' : 'clear');
            }
            Haptics.medium();
            score += pts;
            frame.setScore(score);
            floats.push({ text: '+' + pts, x: mx, y: my, start: now, color: COLORS[Math.min(MAX, lvl)] });
            break;
          }
        }
        bodies = bodies.filter(function (q) { return !q.dead; });
      }

      function checkDanger(now, dt) {
        anyDanger = false;
        for (var i = 0; i < bodies.length; i++) {
          var b = bodies[i];
          if (now - b.born < 1500) { b.overT = 0; continue; }
          if (b.y - b.r < DANGER) {
            b.overT += dt; anyDanger = true;
            if (b.overT > 2.2) { gameOver(); return; }
          } else b.overT = 0;
        }
      }

      function gameOver() {
        if (over) return;
        over = true;
        frame.endGame(score, Math.floor(score / 80));
      }

      // ------------------------------------------------------------ vẽ
      function drawFruit(ctx, x, y, r, level, angle, alpha) {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(x, y);
        ctx.fillStyle = COLORS[level];
        ctx.beginPath(); ctx.arc(0, 0, Math.max(0, r), 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.beginPath(); ctx.arc(-r * 0.3, -r * 0.35, Math.max(0, r * 0.45), 0, Math.PI * 2); ctx.fill();
        ctx.rotate(angle);
        ctx.font = (r * 1.3) + 'px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = '#000';
        ctx.fillText(FRUITS[level], 0, r * 0.08);
        ctx.restore();
      }

      frame.loop(function (now) {
        if (!lastT) lastT = now;
        var dtF = Math.min(0.05, (now - lastT) / 1000);
        lastT = now;
        if (!over && !document.hidden) {
          acc += dtF;
          var guard = 0;
          while (acc >= DT && guard++ < 8) { step(); acc -= DT; }
          if (guard >= 8) acc = 0;
          checkDanger(now, dtF);
        }

        var ctx = cv.ctx, th = PH.theme();
        ctx.clearRect(0, 0, cv.w, cv.h);
        var boxH = WORLD_H * scale;

        // "Tiếp theo" ở góc phải phía trên
        ctx.fillStyle = th.text2;
        ctx.font = '700 12px -apple-system, Arial, sans-serif';
        ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        ctx.fillText(T('fm_next'), boxL + scale - 48, 28);
        drawFruit(ctx, boxL + scale - 22, 28, Math.min(20, RADIUS[next] * scale), next, 0, 1);

        // hộp đựng
        ctx.fillStyle = th.board;
        rr(ctx, boxL, boxT, scale, boxH, 18); ctx.fill();

        // vạch nguy hiểm
        var dy = boxT + DANGER * scale;
        ctx.save();
        ctx.setLineDash([8, 6]);
        ctx.lineWidth = 2;
        ctx.strokeStyle = anyDanger && Math.floor(now / 250) % 2 ? 'rgba(240,80,90,0.95)' : 'rgba(240,112,122,0.45)';
        ctx.beginPath(); ctx.moveTo(boxL + 6, dy); ctx.lineTo(boxL + scale - 6, dy); ctx.stroke();
        ctx.restore();

        // đường ngắm và trái cây đang cầm
        if (!over && !hammer) {
          var ax = boxL + aimX * scale, ok = ready(now);
          ctx.save();
          ctx.setLineDash([4, 6]);
          ctx.strokeStyle = PH.alpha('#FFFFFF', 0.7);
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(ax, boxT + SPAWN_Y * scale); ctx.lineTo(ax, boxT + boxH - 4); ctx.stroke();
          ctx.restore();
          drawFruit(ctx, ax, boxT + SPAWN_Y * scale, RADIUS[held] * scale, held, 0, ok ? 1 : 0.45);
        }

        // trái cây
        bodies.forEach(function (b) {
          var pop = 1, age = now - b.popAt;
          if (b.popAt && age < 260) pop = 1 + 0.22 * Math.sin(Math.PI * age / 260);
          drawFruit(ctx, boxL + b.x * scale, boxT + b.y * scale, b.r * scale * pop, b.level, b.angle, 1);
        });

        // chữ điểm bay lên
        floats = floats.filter(function (f) { return now - f.start < 900; });
        floats.forEach(function (f) {
          var t = (now - f.start) / 900;
          ctx.font = '800 20px -apple-system, Arial, sans-serif';
          ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
          ctx.fillStyle = PH.alpha('#F2668B', 1 - t * t);
          ctx.fillText(f.text, boxL + f.x * scale, boxT + f.y * scale - 30 * t);
        });
      });

      PH.debugFruit = function () { return bodies; };     // để kiểm thử
    }
  };
})();
