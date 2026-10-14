/* Puzzle Hub – Sudoku
   9×9 grid, 3 difficulty levels, backtracking generator + remover.
   Power-ups: Hint (reveal a cell, 30 coins), Check (highlight errors, 20 coins).
   Score = difficulty_base × time_bonus. */
(function () {
  'use strict';
  var PH = window.PH, T = PH.T, Store = PH.Store, Sound = PH.Sound;
  var h = PH.h, rr = PH.rr;

  // ── Sudoku generator ──────────────────────────────────────────────
  function newBoard() { return Array.from({ length: 81 }, function () { return 0; }); }

  function validPlace(b, idx, n) {
    var row = Math.floor(idx / 9), col = idx % 9;
    var boxR = Math.floor(row / 3) * 3, boxC = Math.floor(col / 3) * 3;
    for (var i = 0; i < 9; i++) {
      if (b[row * 9 + i] === n) return false;
      if (b[i * 9 + col] === n) return false;
      if (b[(boxR + Math.floor(i / 3)) * 9 + boxC + (i % 3)] === n) return false;
    }
    return true;
  }

  function solve(b, pos) {
    pos = pos || 0;
    while (pos < 81 && b[pos] !== 0) pos++;
    if (pos === 81) return true;
    var nums = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    PH.shuffle(nums);
    for (var i = 0; i < 9; i++) {
      if (validPlace(b, pos, nums[i])) {
        b[pos] = nums[i];
        if (solve(b, pos + 1)) return true;
        b[pos] = 0;
      }
    }
    return false;
  }

  function countSolutions(b, pos, limit) {
    while (pos < 81 && b[pos] !== 0) pos++;
    if (pos === 81) return 1;
    var count = 0;
    for (var n = 1; n <= 9; n++) {
      if (validPlace(b, pos, n)) {
        b[pos] = n;
        count += countSolutions(b, pos + 1, limit);
        b[pos] = 0;
        if (count >= limit) return count;
      }
    }
    return count;
  }

  function generatePuzzle(removals) {
    var sol = newBoard();
    solve(sol, 0);
    var puz = sol.slice();
    var indices = PH.shuffle(Array.from({ length: 81 }, function (_, i) { return i; }));
    var removed = 0;
    for (var k = 0; k < indices.length && removed < removals; k++) {
      var idx = indices[k];
      var old = puz[idx];
      puz[idx] = 0;
      var tmp = puz.slice();
      if (countSolutions(tmp, 0, 2) === 1) { removed++; }
      else { puz[idx] = old; }
    }
    return { solution: sol, puzzle: puz };
  }

  // ── Game entry ────────────────────────────────────────────────────
  PH.games.sudoku = {
    start: function (frame) {
      frame.saveOnExit = true;
      var PH = window.PH;

      // state
      var diff = null; // 'easy'|'medium'|'hard'
      var solution = null, puzzle = null, board = null;
      var given = null; // bool array
      var errors = null; // bool array shown by check
      var selected = -1;
      var startTime = 0, score = 0;
      var hintActive = false;

      var stage = frame.stage;

      // ── difficulty chooser ────────────────────────────────────────
      function showChooser() {
        stage.innerHTML = '';
        var wrap = h('div', { style: 'display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:18px;padding:20px' });
        wrap.appendChild(h('div', { style: 'font-size:2rem;font-weight:700;color:var(--text)', text: T('sk_choose') }));
        [['easy', 40], ['medium', 52], ['hard', 60]].forEach(function (d) {
          var btn = h('button', {
            class: 'btn primary', style: 'width:180px;font-size:1.1rem',
            text: T('sk_' + d[0])
          });
          btn.addEventListener('click', function () { startGame(d[0], d[1]); });
          wrap.appendChild(btn);
        });
        stage.appendChild(wrap);
      }

      function startGame(d, removals) {
        diff = d;
        var data = generatePuzzle(removals);
        solution = data.solution;
        puzzle = data.puzzle;
        board = puzzle.slice();
        given = puzzle.map(function (v) { return v !== 0; });
        errors = Array(81).fill(false);
        selected = -1;
        startTime = Date.now();
        score = 0;
        stage.innerHTML = '';
        buildUI();
      }

      // ── Build game UI ──────────────────────────────────────────────
      var cv = null;

      function buildUI() {
        cv = frame.makeCanvas(null, function (o) { draw(); });

        // number pad below canvas
        var pad = h('div', { style: 'display:flex;gap:6px;justify-content:center;flex-wrap:wrap;padding:6px 4px' });
        for (var n = 1; n <= 9; n++) {
          (function (num) {
            var btn = h('button', {
              class: 'btn', style: 'width:40px;height:40px;font-size:1.1rem;font-weight:700;border-radius:10px;padding:0',
              text: String(num)
            });
            btn.addEventListener('click', function () { inputNum(num); });
            pad.appendChild(btn);
          })(n);
        }
        var eraseBtn = h('button', {
          class: 'btn', style: 'width:40px;height:40px;font-size:1rem;border-radius:10px;padding:0',
          text: '⌫'
        });
        eraseBtn.addEventListener('click', function () { inputNum(0); });
        pad.appendChild(eraseBtn);
        frame.stage.insertBefore(pad, cv.canvas.nextSibling || null);

        // power-ups
        frame.addPowerUp('💡', 'sk_hint', 30, function () {
          hintActive = true;
          doHint();
        });
        frame.addPowerUp('✅', 'sk_check', 20, function () {
          doCheck();
        });

        // finish button
        var finBtn = frame.finishButton();

        // canvas events
        cv.canvas.addEventListener('pointerdown', function (e) {
          var p = cv.pos(e);
          var margin = cv.w * 0.04;
          var size = Math.min(cv.w, cv.h) - margin * 2;
          var ox = (cv.w - size) / 2;
          var oy = margin;
          var cell = Math.floor(size / 9);
          var col = Math.floor((p.x - ox) / cell);
          var row = Math.floor((p.y - oy) / cell);
          if (col >= 0 && col < 9 && row >= 0 && row < 9) {
            var idx = row * 9 + col;
            if (!given[idx]) {
              selected = idx;
              errors[idx] = false;
              draw();
              Sound.play('tap');
            }
          }
        });

        draw();
      }

      function inputNum(n) {
        if (selected < 0 || given[selected] || frame.isEnded()) return;
        board[selected] = n;
        errors[selected] = false;
        Sound.play('place');
        draw();
        checkWin();
      }

      function doHint() {
        // Find an empty or wrong cell and fill it
        var empties = [];
        for (var i = 0; i < 81; i++) {
          if (!given[i] && board[i] !== solution[i]) empties.push(i);
        }
        if (empties.length === 0) return;
        var idx = empties[Math.floor(Math.random() * empties.length)];
        board[idx] = solution[idx];
        errors[idx] = false;
        selected = idx;
        Sound.play('coin');
        draw();
        frame.toast('sk_hint_used');
        checkWin();
      }

      function doCheck() {
        var erCount = 0;
        for (var i = 0; i < 81; i++) {
          if (!given[i] && board[i] !== 0 && board[i] !== solution[i]) {
            errors[i] = true;
            erCount++;
          } else {
            errors[i] = false;
          }
        }
        Sound.play(erCount > 0 ? 'error' : 'win');
        frame.toast(erCount > 0 ? T('sk_errors', erCount) : T('sk_no_errors'));
        draw();
      }

      function checkWin() {
        for (var i = 0; i < 81; i++) {
          if (board[i] !== solution[i]) return;
        }
        // Solved!
        var elapsed = (Date.now() - startTime) / 1000;
        var base = { easy: 500, medium: 1000, hard: 1500 }[diff];
        var timeBonus = Math.max(0, Math.floor(base - elapsed * 2));
        score = base + timeBonus;
        frame.setScore(score);
        var coins = Math.floor(score / 30);
        Sound.play('win');
        frame.toast('sk_congrats');
        setTimeout(function () { frame.endGame(score, coins); }, 1000);
      }

      // ── Draw ───────────────────────────────────────────────────────
      function draw() {
        if (!cv) return;
        var ctx = cv.ctx, W = cv.w, H = cv.h;
        var th = PH.theme();
        ctx.clearRect(0, 0, W, H);

        var margin = W * 0.04;
        var size = Math.min(W, H) - margin * 2;
        var ox = (W - size) / 2;
        var oy = margin;
        var cell = size / 9;

        // background
        ctx.fillStyle = th.board;
        rr(ctx, ox - 2, oy - 2, size + 4, size + 4, 12);
        ctx.fill();

        for (var row = 0; row < 9; row++) {
          for (var col = 0; col < 9; col++) {
            var idx = row * 9 + col;
            var x = ox + col * cell, y = oy + row * cell;

            // cell background
            var bg;
            if (idx === selected) bg = '#4DABF7';
            else if (errors[idx]) bg = PH.alpha('#FF6B6B', 0.35);
            else if (!given[idx] && board[idx] !== 0 && board[idx] === solution[idx]) bg = PH.alpha('#69DB7C', 0.25);
            else bg = th.empty;

            ctx.fillStyle = bg;
            ctx.fillRect(x + 1, y + 1, cell - 2, cell - 2);

            // number
            var val = board[idx];
            if (val !== 0) {
              ctx.font = 'bold ' + Math.floor(cell * 0.55) + 'px "Nunito", sans-serif';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillStyle = given[idx] ? th.text : (idx === selected ? '#fff' : '#4DABF7');
              ctx.fillText(String(val), x + cell / 2, y + cell / 2);
            }
          }
        }

        // grid lines
        ctx.strokeStyle = th.line;
        for (var i = 0; i <= 9; i++) {
          ctx.lineWidth = (i % 3 === 0) ? 2.5 : 0.8;
          ctx.beginPath();
          ctx.moveTo(ox + i * cell, oy);
          ctx.lineTo(ox + i * cell, oy + size);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(ox, oy + i * cell);
          ctx.lineTo(ox + size, oy + i * cell);
          ctx.stroke();
        }
      }

      // Start with chooser
      showChooser();
    }
  };
})();
