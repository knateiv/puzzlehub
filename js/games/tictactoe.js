/* Tic Tac Toe - bản web: đấu máy KHÔNG GIỚI HẠN số ván (Minimax). Bấm 🏁 Kết thúc để ghi điểm. */
(function () {
  'use strict';
  var PH = window.PH, h = PH.h, T = PH.T, rr = PH.rr, PAL = PH.PALETTE, Sound = PH.Sound, Haptics = PH.Haptics;
  var COST_HINT = 20;
  var LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
  var PLAYER = 1, AI = 2;

  function winner(c) {
    for (var i = 0; i < LINES.length; i++) {
      var l = LINES[i];
      if (c[l[0]] && c[l[0]] === c[l[1]] && c[l[1]] === c[l[2]]) return c[l[0]];
    }
    return 0;
  }
  function winLine(c) {
    for (var i = 0; i < LINES.length; i++) {
      var l = LINES[i];
      if (c[l[0]] && c[l[0]] === c[l[1]] && c[l[1]] === c[l[2]]) return l;
    }
    return null;
  }
  function other(m) { return m === PLAYER ? AI : PLAYER; }
  function minimax(c, mark, depth) {
    var w = winner(c);
    if (w) return (w === mark ? 10 : -10) - (w === mark ? depth : -depth);
    var full = true, best = -Infinity;
    for (var i = 0; i < 9; i++) {
      if (c[i]) continue;
      full = false;
      c[i] = mark;
      best = Math.max(best, -minimax(c, other(mark), depth + 1));
      c[i] = 0;
    }
    return full ? 0 : best;
  }
  function bestMove(c, mark) {
    var best = -1, bs = -Infinity;
    for (var i = 0; i < 9; i++) {
      if (c[i]) continue;
      c[i] = mark;
      var s = -minimax(c, other(mark), 1);
      c[i] = 0;
      if (s > bs || (s === bs && Math.random() < 0.5)) { bs = s; best = i; }
    }
    return best;
  }

  PH.games.tictactoe = {
    start: function (frame) {
      frame.saveOnExit = true;
      var cells = [0, 0, 0, 0, 0, 0, 0, 0, 0], placedAt = [0, 0, 0, 0, 0, 0, 0, 0, 0];
      var win = null, hintCell = -1, inputOn = false;
      var hard = false, round = 1, points = 0, playerTurn = false, roundOver = false;
      var timers = [];
      var cell = 0, left = 0, top = 0;

      var roundInfo = h('div', { class: 'subtle', style: 'font-weight:700;font-size:15px' });
      var status = h('div', { class: 'hl' });
      var cv = frame.makeCanvas(null, function (o) {
        var size = Math.min(o.w, o.h) - 8;
        cell = size / 3; left = (o.w - size) / 2; top = (o.h - size) / 2;
      });
      var nextBtn = PH.UI.button(T('ttt_next'), 'primary gone', onNext);
      var row = h('div', { class: 'btnrow' }, [nextBtn, frame.finishButton()]);
      frame.stage.insertBefore(roundInfo, cv.canvas);
      frame.stage.insertBefore(status, cv.canvas);
      frame.stage.appendChild(row);

      frame.addPowerUp('💡', 'ttt_hint', COST_HINT, function () {
        if (!playerTurn || roundOver) return;
        if (!frame.trySpend(COST_HINT)) return;
        hintCell = bestMove(cells.slice(), PLAYER);
      });

      function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
      frame.onDestroy(function () { timers.forEach(clearTimeout); });

      function chooseDifficulty() {
        inputOn = false;
        status.textContent = T('ttt_choose_level');
        var d = PH.UI.dialog([
          h('h2', { text: T('ttt_choose_level') }),
          PH.UI.button(T('ttt_easy'), '', function () { d.close(); hard = false; startRound(); }),
          PH.UI.button(T('ttt_hard'), 'primary', function () { d.close(); hard = true; startRound(); })
        ]);
      }

      function startRound() {
        cells = [0, 0, 0, 0, 0, 0, 0, 0, 0]; win = null; hintCell = -1; roundOver = false;
        nextBtn.classList.add('gone');
        roundInfo.textContent = T('ttt_round', round);
        playerTurn = round % 2 === 1;          // ván lẻ người đi trước, ván chẵn máy đi trước
        if (playerTurn) { status.textContent = T('ttt_your_turn'); inputOn = true; }
        else aiMove();
      }

      function chooseAi() {
        var chance = hard ? 85 : 30;
        if (PH.rnd(100) < chance) return bestMove(cells.slice(), AI);
        var empty = [];
        for (var i = 0; i < 9; i++) if (!cells[i]) empty.push(i);
        return empty[PH.rnd(empty.length)];
      }

      function aiMove() {
        inputOn = false;
        status.textContent = T('ttt_ai_turn');
        later(function () {
          if (roundOver) return;
          var m = chooseAi();
          cells[m] = AI; placedAt[m] = performance.now(); hintCell = -1;
          Sound.play('pop');
          if (!checkEnd()) { playerTurn = true; status.textContent = T('ttt_your_turn'); inputOn = true; }
        }, 550);
      }

      function checkEnd() {
        var w = winner(cells), full = cells.every(function (c) { return c; });
        if (!w && !full) return false;
        roundOver = true; inputOn = false;
        if (w) win = winLine(cells);
        var mult = hard ? 2 : 1;
        if (w === PLAYER) {
          points += 3; status.textContent = T('ttt_win'); frame.addCoins(5 * mult);
          Sound.play('win'); Haptics.heavy();
        } else if (w === AI) {
          status.textContent = T('ttt_lose'); Sound.play('lose'); Haptics.medium();
        } else {
          points += 1; status.textContent = T('ttt_draw'); frame.addCoins(2 * mult); Sound.play('clear');
        }
        frame.setScore(points * mult);
        nextBtn.classList.remove('gone');
        return true;
      }

      function onNext() { round++; startRound(); }

      cv.canvas.addEventListener('pointerdown', function (e) {
        Sound.unlock();
        if (!inputOn || !playerTurn || roundOver) return;
        var p = cv.pos(e);
        var c = Math.floor((p.x - left) / cell), r = Math.floor((p.y - top) / cell);
        if (r < 0 || r > 2 || c < 0 || c > 2) return;
        var i = r * 3 + c;
        if (cells[i]) return;
        cells[i] = PLAYER; placedAt[i] = performance.now(); hintCell = -1;
        Sound.play('tap'); Haptics.light();
        if (!checkEnd()) { playerTurn = false; aiMove(); }
      });

      function overshoot(t) { var c1 = 1.70158, c3 = c1 + 1, u = t - 1; return 1 + c3 * u * u * u + c1 * u * u; }

      frame.loop(function (now) {
        var ctx = cv.ctx, th = PH.theme();
        ctx.clearRect(0, 0, cv.w, cv.h);
        if (!cell) return;
        var gap = cell * 0.05, radius = cell * 0.18;
        for (var i = 0; i < 9; i++) {
          var r = Math.floor(i / 3), c = i % 3;
          var l = left + c * cell + gap, t = top + r * cell + gap, s = cell - 2 * gap;
          var inWin = win && win.indexOf(i) >= 0;
          ctx.fillStyle = inWin ? PH.alpha('#FFC94D', 0.55) : (i === hintCell ? PH.alpha('#FFC94D', 0.35) : th.empty);
          rr(ctx, l, t, s, s, radius); ctx.fill();
          if (!cells[i]) continue;
          var k = Math.min(1, (now - placedAt[i]) / 240);
          var half = s * 0.27 * overshoot(k), cx = l + s / 2, cy = t + s / 2;
          ctx.lineCap = 'round'; ctx.lineWidth = s * 0.13;
          if (cells[i] === PLAYER) {
            ctx.strokeStyle = PAL[0];
            ctx.beginPath(); ctx.moveTo(cx - half, cy - half); ctx.lineTo(cx + half, cy + half);
            ctx.moveTo(cx + half, cy - half); ctx.lineTo(cx - half, cy + half); ctx.stroke();
          } else {
            ctx.strokeStyle = PAL[1];
            ctx.beginPath(); ctx.arc(cx, cy, half * 1.1, 0, Math.PI * 2); ctx.stroke();
          }
        }
      });

      chooseDifficulty();
    }
  };
})();
