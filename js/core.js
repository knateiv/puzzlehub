/* Puzzle Hub (bản web / PWA) - lõi: lưu trữ, đa ngôn ngữ, âm thanh, tiện ích.
   Bản web này dùng để chơi thử trên iPhone; bản nộp bài là ứng dụng Android. */
(function () {
  'use strict';

  // ------------------------------------------------------------------ tiện ích DOM
  function h(tag, attrs, children) {
    var el = document.createElement(tag);
    if (attrs) {
      for (var k in attrs) {
        var v = attrs[k];
        if (v === undefined || v === null || v === false) continue;
        if (k === 'class') el.className = v;
        else if (k === 'style') el.style.cssText = v;
        else if (k === 'text') el.textContent = v;
        else if (k === 'html') el.innerHTML = v;
        else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
        else el.setAttribute(k, v);
      }
    }
    if (children) {
      (Array.isArray(children) ? children : [children]).forEach(function (c) {
        if (c === null || c === undefined || c === false) return;
        el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
      });
    }
    return el;
  }

  function rr(ctx, x, y, w, hgt, r) {
    r = Math.max(0, Math.min(r, w / 2, hgt / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + hgt, r);
    ctx.arcTo(x + w, y + hgt, x, y + hgt, r);
    ctx.arcTo(x, y + hgt, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function rnd(n) { return Math.floor(Math.random() * n); }
  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = rnd(i + 1), t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function alpha(hex, a) {
    var n = parseInt(hex.slice(1), 16);
    return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')';
  }
  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  // 8 màu khối pastel dùng chung
  var PALETTE = ['#FF8FAB', '#8EC5FC', '#8FE3C0', '#FFC48C', '#B7A6F2', '#FFE27A', '#FF9E9E', '#6FDCE3'];

  // ------------------------------------------------------------------ lưu trữ (localStorage)
  var P = 'puzzlehub_';
  var Store = {
    _get: function (k, d) {
      try {
        var v = localStorage.getItem(P + k);
        return v === null ? d : JSON.parse(v);
      } catch (e) { return d; }
    },
    _set: function (k, v) {
      try { localStorage.setItem(P + k, JSON.stringify(v)); } catch (e) { /* bộ nhớ đầy */ }
    },
    getCoins: function () { return this._get('coins', 100); },
    addCoins: function (n) {
      if (n <= 0) return;
      this._set('coins', this.getCoins() + n);
      this._set('coins_total', this.getTotalEarned() + n);
    },
    spendCoins: function (n) {
      var have = this.getCoins();
      if (have < n) return false;
      this._set('coins', have - n);
      return true;
    },
    getTotalEarned: function () { return this._get('coins_total', 0); },
    getPlays: function () { return this._get('plays', 0); },
    getTop: function (id) { return this._get('top_' + id, []); },
    getBest: function (id) { var t = this.getTop(id); return t.length ? t[0] : 0; },
    submitScore: function (id, score) {
      this._set('plays', this.getPlays() + 1);
      if (score <= 0) return false;
      var old = this.getBest(id);
      var top = this.getTop(id);
      top.push(score);
      top.sort(function (a, b) { return b - a; });
      this._set('top_' + id, top.slice(0, 5));
      return score > old;
    },
    getString: function (k, d) { return this._get(k, d); },
    putString: function (k, v) { this._set(k, v); },
    isSound: function () { return this._get('set_sound', true); },
    isMusic: function () { return this._get('set_music', true); },
    isHaptics: function () { return this._get('set_haptics', true); },
    isDark: function () { return this._get('set_dark', false); },
    getLang: function () { return this._get('set_lang', 'vi'); },
    setSetting: function (k, v) { this._set(k, v); },
    resetProgress: function () {
      var keep = {};
      ['set_sound', 'set_music', 'set_haptics', 'set_dark', 'set_lang'].forEach(function (k) {
        keep[k] = Store._get(k, null);
      });
      var rm = [];
      for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        if (key && key.indexOf(P) === 0) rm.push(key);
      }
      rm.forEach(function (k) { localStorage.removeItem(k); });
      for (var k in keep) if (keep[k] !== null) Store._set(k, keep[k]);
    }
  };

  // ------------------------------------------------------------------ đa ngôn ngữ
  var STR = {
    vi: {
      app_name: 'Puzzle Hub', hub_subtitle: 'Thiên đường giải đố – chơi offline 100%',
      hub_main_game: 'GAME CHÍNH', hub_mini_games: 'MINI GAME', hub_play_now: 'CHƠI NGAY',
      hub_best: 'Điểm cao: {0}', hub_not_played: 'Chưa chơi',
      game_block_blast: 'Block Blast', game_tictactoe: 'Tic Tac Toe', game_oneline: 'One Line',
      game_watersort: 'Water Sort', game_fruitmerge: 'Fruit Merge', game_whack: 'Đập Chuột',
      desc_block_blast: 'Kéo thả khối, lấp đầy hàng ngang hoặc dọc để phá hủy',
      desc_tictactoe: 'Đấu với máy, không giới hạn số ván', desc_oneline: 'Nối mọi cạnh bằng một nét vẽ',
      desc_watersort: 'Phân loại màu vào từng ống', desc_fruitmerge: 'Thả trái cây, chúng lăn và gộp vào nhau',
      desc_whack: 'Đập chuột với 3 mạng, chơi không giới hạn',
      ok: 'Đồng ý', cancel: 'Hủy', score_label: 'ĐIỂM', best_label: 'CAO NHẤT',
      end_title: 'Kết thúc!', end_new_record: '🏆 Kỷ lục mới!', end_best: 'Điểm cao nhất: {0}',
      end_coins: 'Xu nhận được: +{0} 🪙', end_replay: 'Chơi lại', end_home: 'Về trang chủ',
      not_enough_coins: 'Không đủ xu! Hãy chơi thêm để kiếm xu nhé.',
      settings_title: 'Cài đặt', setting_sound: 'Âm thanh', setting_music: 'Nhạc nền',
      setting_haptics: 'Chế độ rung', setting_dark: 'Giao diện tối', setting_language: 'Ngôn ngữ',
      setting_reset: 'Xóa toàn bộ dữ liệu', reset_title: 'Xóa dữ liệu?',
      reset_message: 'Toàn bộ điểm cao, xu và tiến trình sẽ bị xóa. Hành động này không thể hoàn tác.',
      reset_done: 'Đã xóa dữ liệu', haptics_note: 'iPhone (Safari) không hỗ trợ rung.',
      lb_title: 'Bảng xếp hạng', lb_coins: 'Xu hiện có: {0}', lb_total_earned: 'Tổng xu đã kiếm: {0}',
      lb_games_played: 'Số lượt đã chơi: {0}', lb_empty: 'Chưa có điểm',
      bb_rotate: 'Xoay', bb_reroll: 'Đổi khối', bb_bomb: 'Bom',
      bb_hint_rotate: 'Chạm vào một khối ở khay để xoay', bb_hint_bomb: 'Chạm vào bảng để đặt bom (xóa vùng 3x3)',
      bb_combo: 'COMBO x{0}', bb_perfect: 'HOÀN HẢO!', bb_streak: 'Chuỗi phá x{0}', bb_streak_lost: 'Mất chuỗi phá', bb_lines: '{0} hàng!',
      ttt_choose_level: 'Chọn độ khó', ttt_easy: 'Dễ', ttt_hard: 'Khó', ttt_round: 'Ván {0}',
      ttt_your_turn: 'Lượt của bạn (X)', ttt_ai_turn: 'Máy đang nghĩ…', ttt_win: 'Bạn thắng! +3 điểm',
      ttt_lose: 'Bạn thua! +0 điểm', ttt_draw: 'Hòa! +1 điểm', ttt_next: 'Ván tiếp',
      ttt_finish: 'Xem kết quả', ttt_hint: 'Gợi ý',
      ol_level: 'Màn {0}', ol_instruction: 'Bắt đầu ở điểm bất kỳ, vẽ một nét đi qua mọi cạnh, mỗi cạnh đúng một lần', ol_stuck: 'Bế tắc rồi! Hãy Hoàn tác hoặc Làm lại.',
      ol_undo: 'Hoàn tác', ol_reset: 'Làm lại', ol_hint: 'Gợi ý', ol_solved: 'Hoàn thành màn!',
      ol_next: 'Màn tiếp',
      ws_level: 'Màn {0}', ws_moves: 'Lượt: {0}', ws_instruction: 'Chạm ống nguồn rồi chạm ống đích để rót nước',
      ws_undo: 'Hoàn tác', ws_restart: 'Làm lại', ws_add_tube: 'Thêm ống', ws_solved: 'Hoàn thành màn!',
      ws_next: 'Màn tiếp',
      fm_next: 'Tiếp theo', fm_instruction: 'Kéo để chọn chỗ, thả tay để thả trái cây. Hai trái giống nhau chạm nhau sẽ gộp lại!',
      fm_swap: 'Đổi trái', fm_hammer: 'Búa', fm_hint_hammer: 'Chạm vào một trái cây để đập',
      wm_start: 'Bắt đầu', wm_instruction: 'Đập chuột! Chuột vàng +3 điểm. Để chuột chạy mất hoặc đập bom sẽ mất 1 mạng.',
      wm_plus_life: '+1 mạng', finish: '🏁 Kết thúc'
    },
    en: {
      app_name: 'Puzzle Hub', hub_subtitle: 'Your offline puzzle paradise',
      hub_main_game: 'MAIN GAME', hub_mini_games: 'MINI GAMES', hub_play_now: 'PLAY NOW',
      hub_best: 'Best: {0}', hub_not_played: 'Not played yet',
      game_block_blast: 'Block Blast', game_tictactoe: 'Tic Tac Toe', game_oneline: 'One Line',
      game_watersort: 'Water Sort', game_fruitmerge: 'Fruit Merge', game_whack: 'Whack-a-Mole',
      desc_block_blast: 'Drag blocks and fill rows or columns to blast them',
      desc_tictactoe: 'Play the AI, unlimited rounds', desc_oneline: 'Trace every edge in one stroke',
      desc_watersort: 'Sort the colors into tubes', desc_fruitmerge: 'Drop fruits, they roll and merge',
      desc_whack: 'Whack moles with 3 lives, endless',
      ok: 'OK', cancel: 'Cancel', score_label: 'SCORE', best_label: 'BEST',
      end_title: 'Game over!', end_new_record: '🏆 New record!', end_best: 'Best score: {0}',
      end_coins: 'Coins earned: +{0} 🪙', end_replay: 'Play again', end_home: 'Home',
      not_enough_coins: 'Not enough coins! Play more to earn some.',
      settings_title: 'Settings', setting_sound: 'Sound effects', setting_music: 'Background music',
      setting_haptics: 'Vibration', setting_dark: 'Dark mode', setting_language: 'Language',
      setting_reset: 'Erase all data', reset_title: 'Erase data?',
      reset_message: 'All high scores, coins and progress will be deleted. This cannot be undone.',
      reset_done: 'Data erased', haptics_note: 'iPhone (Safari) does not support vibration.',
      lb_title: 'Leaderboard', lb_coins: 'Coins: {0}', lb_total_earned: 'Total coins earned: {0}',
      lb_games_played: 'Games played: {0}', lb_empty: 'No scores yet',
      bb_rotate: 'Rotate', bb_reroll: 'Reroll', bb_bomb: 'Bomb',
      bb_hint_rotate: 'Tap a piece in the tray to rotate it', bb_hint_bomb: 'Tap the board to drop a bomb (clears a 3x3 area)',
      bb_combo: 'COMBO x{0}', bb_perfect: 'PERFECT!', bb_streak: 'Streak x{0}', bb_streak_lost: 'Streak lost', bb_lines: '{0} lines!',
      ttt_choose_level: 'Choose difficulty', ttt_easy: 'Easy', ttt_hard: 'Hard', ttt_round: 'Round {0}',
      ttt_your_turn: 'Your turn (X)', ttt_ai_turn: 'AI is thinking…', ttt_win: 'You win! +3 points',
      ttt_lose: 'You lose! +0 points', ttt_draw: 'Draw! +1 point', ttt_next: 'Next round',
      ttt_finish: 'See results', ttt_hint: 'Hint',
      ol_level: 'Level {0}', ol_instruction: 'Start anywhere and draw one stroke through every edge, each exactly once', ol_stuck: 'Stuck! Undo or reset.',
      ol_undo: 'Undo', ol_reset: 'Reset', ol_hint: 'Hint', ol_solved: 'Level complete!', ol_next: 'Next level',
      ws_level: 'Level {0}', ws_moves: 'Moves: {0}', ws_instruction: 'Tap a source tube, then a target tube to pour',
      ws_undo: 'Undo', ws_restart: 'Restart', ws_add_tube: 'Add tube', ws_solved: 'Level complete!',
      ws_next: 'Next level',
      fm_next: 'Next', fm_instruction: 'Drag to aim, release to drop. Matching fruits that touch merge!',
      fm_swap: 'Swap', fm_hammer: 'Hammer', fm_hint_hammer: 'Tap a fruit to smash it',
      wm_start: 'Start', wm_instruction: 'Whack the moles! Golden +3. Letting a mole escape or hitting a bomb costs 1 life.',
      wm_plus_life: '+1 life', finish: '🏁 Finish'
    }
  };

  function T(key) {
    var s = (STR[Store.getLang()] || STR.vi)[key];
    if (s === undefined) s = STR.vi[key] !== undefined ? STR.vi[key] : key;
    for (var i = 1; i < arguments.length; i++) s = s.replace('{' + (i - 1) + '}', arguments[i]);
    return s;
  }

  // ------------------------------------------------------------------ âm thanh (Web Audio, tạo bằng code)
  var Sound = (function () {
    var ctx = null, musicNode = null, musicBuf = null, musicGain = null, running = false;

    var SFX = {
      tap: [[880, 40]], place: [[196, 70], [165, 60]],
      clear: [[523, 70], [659, 70], [784, 110]],
      combo: [[659, 70], [784, 70], [988, 70], [1319, 140]],
      win: [[523, 120], [659, 120], [784, 120], [1047, 260]],
      lose: [[392, 170], [330, 170], [262, 170], [196, 330]],
      coin: [[1319, 50], [1760, 110]], error: [[150, 130]], pop: [[620, 45], [820, 45]]
    };

    function ensure() {
      if (!ctx) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
      }
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    }

    function unlock() {
      var c = ensure();
      if (!c) return;
      refreshMusic();
    }

    function play(name) {
      if (!Store.isSound()) return;
      var c = ensure();
      if (!c || !SFX[name]) return;
      var t = c.currentTime;
      SFX[name].forEach(function (n) {
        var f = n[0], dur = n[1] / 1000;
        var o = c.createOscillator(), g = c.createGain();
        o.type = 'sine';
        o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.35, t + 0.008);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g); g.connect(c.destination);
        o.start(t); o.stop(t + dur + 0.02);
        t += dur;
      });
    }

    // Nhạc nền: vòng hợp âm lo-fi nhẹ nhàng Fmaj7 - Em7 - Dm7 - Cmaj7 (84 BPM, khoảng 23 giây rồi lặp lại).
    // Gồm pad êm, rải hợp âm, bass, giai điệu chuông và trống nhẹ - tất cả được tạo bằng code.
    function buildMusic(c) {
      var rate = 22050, bpm = 84, beat = 60 / bpm, bars = 8;
      var N = Math.floor(bars * 4 * beat * rate);
      var data = new Float32Array(N);
      var chords = [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [48, 52, 55, 59]];
      var melody = [[76, 74, 72, 0], [71, 72, 74, 0], [72, 69, 67, 0], [64, 67, 71, 72]];
      var arp = [0, 1, 2, 3, 2, 1, 2, 3];
      function mf(m) { return 440 * Math.pow(2, (m - 69) / 12); }
      // ghi một nốt vào bộ đệm (vòng lặp liền mạch nhờ chỉ số % N)
      function note(t0, dur, f, amp, o) {
        var a = o.attack || 0.01, rel = o.release || 0.1, dec = o.decay || 0;
        var n = Math.floor((dur + rel) * rate), s0 = Math.floor(t0 * rate), w = 2 * Math.PI * f / rate;
        for (var i = 0; i < n; i++) {
          var t = i / rate, env = t < a ? t / a : 1;
          if (dec && t > a) env *= Math.exp(-dec * (t - a));
          if (t > dur) env *= Math.max(0, 1 - (t - dur) / rel);
          var ph = w * i, v = Math.sin(ph);
          if (o.h2) v += o.h2 * Math.sin(2 * ph);
          if (o.h3) v += o.h3 * Math.sin(3 * ph);
          data[(s0 + i) % N] += v * env * amp;
        }
      }
      function kick(t0) {
        var n = Math.floor(0.2 * rate), s0 = Math.floor(t0 * rate), ph = 0;
        for (var i = 0; i < n; i++) {
          var t = i / rate, f = 48 + 70 * Math.exp(-t * 28);
          ph += 2 * Math.PI * f / rate;
          data[(s0 + i) % N] += Math.sin(ph) * Math.exp(-t * 16) * 0.2;
        }
      }
      var seed = 7;
      function noise() { seed = (seed * 16807) % 2147483647; return seed / 1073741823.5 - 1; }
      function hat(t0, amp) {
        var n = Math.floor(0.05 * rate), s0 = Math.floor(t0 * rate), prev = 0;
        for (var i = 0; i < n; i++) {
          var x = noise(), v = x - prev;
          prev = x;
          data[(s0 + i) % N] += v * Math.exp(-i / rate * 70) * amp;
        }
      }
      for (var b = 0; b < bars; b++) {
        var ch = chords[b % 4], t0 = b * 4 * beat;
        ch.forEach(function (m) {
          note(t0, 4 * beat, mf(m), 0.032, { attack: 0.5, release: 0.9, h2: 0.12 });
          note(t0, 4 * beat, mf(m) * 1.004, 0.026, { attack: 0.7, release: 0.9 });
        });
        note(t0, 2 * beat * 0.95, mf(ch[0] - 12), 0.15, { attack: 0.02, decay: 1.1, release: 0.2, h2: 0.25 });
        note(t0 + 2 * beat, 2 * beat * 0.95, mf((b % 2 ? ch[2] : ch[0]) - 12), 0.13,
          { attack: 0.02, decay: 1.1, release: 0.2, h2: 0.25 });
        for (var k = 0; k < 8; k++) {
          note(t0 + k * beat / 2, beat / 2, mf(ch[arp[k]] + 12), 0.055, { attack: 0.005, decay: 5, release: 0.15, h2: 0.1 });
        }
        if (b >= 4) {
          melody[b - 4].forEach(function (m, q) {
            if (m) note(t0 + q * beat, beat * 0.9, mf(m), 0.06, { attack: 0.005, decay: 2.6, release: 0.35, h3: 0.08 });
          });
        }
        kick(t0); kick(t0 + 2 * beat);
        for (var q = 0; q < 4; q++) hat(t0 + q * beat + beat / 2, q % 2 ? 0.035 : 0.025);
      }
      var peak = 0;
      for (var i = 0; i < N; i++) peak = Math.max(peak, Math.abs(data[i]));
      var g = peak > 0 ? 0.5 / peak : 1;
      for (i = 0; i < N; i++) data[i] *= g;
      var buf = c.createBuffer(1, N, rate);
      buf.getChannelData(0).set(data);
      return buf;
    }

    function refreshMusic() {
      var want = Store.isMusic() && !document.hidden;
      if (want && !running) {
        var c = ensure();
        if (!c) return;
        if (!musicBuf) musicBuf = buildMusic(c);
        musicGain = c.createGain();
        musicGain.gain.value = 0.55;
        musicNode = c.createBufferSource();
        musicNode.buffer = musicBuf;
        musicNode.loop = true;
        musicNode.connect(musicGain); musicGain.connect(c.destination);
        musicNode.start();
        running = true;
      } else if (!want && running) {
        try { musicNode.stop(); } catch (e) { /* đã dừng */ }
        running = false;
      }
    }

    document.addEventListener('visibilitychange', function () { if (ctx) refreshMusic(); });
    return { play: play, unlock: unlock, refreshMusic: refreshMusic };
  })();

  var Haptics = {
    _v: function (ms) {
      if (Store.isHaptics() && navigator.vibrate) navigator.vibrate(ms);
    },
    light: function () { this._v(15); },
    medium: function () { this._v(35); },
    heavy: function () { this._v(70); }
  };

  window.PH = {
    h: h, rr: rr, clamp: clamp, rnd: rnd, shuffle: shuffle, alpha: alpha, cssVar: cssVar,
    PALETTE: PALETTE, Store: Store, T: T, Sound: Sound, Haptics: Haptics, games: {}
  };
})();
