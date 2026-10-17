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
    saveSession: function (id, data) { this._set('sess_' + id, data); },
    loadSession: function (id) { return this._get('sess_' + id, null); },
    clearSession: function (id) {
      try { localStorage.removeItem(P + 'sess_' + id); } catch (e) {}
    },
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
      app_name: 'Puzzle Hub', hub_subtitle: 'Thiên đường giải đố',
      hub_main_game: 'GAME CHÍNH', hub_mini_games: 'BỘ SƯU TẬP TRÒ CHƠI', hub_play_now: 'CHƠI NGAY',
      hub_featured: 'GAME NỔI BẬT', hub_games_count: '9 trò chơi',
      hub_best: 'Kỷ lục: {0}', hub_not_played: 'Chưa chơi',
      game_block_blast: 'Phá Khối', game_tictactoe: 'Cờ Caro', game_oneline: 'Một Nét Vẽ',
      game_watersort: 'Rót Nước', game_fruitmerge: 'Ghép Hoa Quả', game_whack: 'Đập Chuột',
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
      bb_combo_great: 'TUYỆT VỜI x{0}!', bb_combo_super: 'SIÊU CẤP x{0}!', bb_combo_mega: 'ĐỈNH CAO x{0}!', bb_combo_ultra: 'THẦN THÁNH x{0}!',
      bb_theme: 'Chủ đề: {0}',
      bb_theme_rose: 'Hồng Phấn', bb_theme_forest: 'Rừng Xanh', bb_theme_wood: 'Gỗ Mộc',
      bb_theme_terracotta: 'Đất Nung', bb_theme_sapphire: 'Lam Ngọc', bb_theme_neon: 'Dạ Quang',
      bb_theme_amethyst: 'Thạch Anh', bb_theme_sunset: 'Hoàng Hôn', bb_theme_glacier: 'Băng Tuyết', bb_theme_gold: 'Hoàng Kim',
      bb_theme_pastel: 'Hồng Phấn', bb_theme_ocean: 'Lam Ngọc', bb_theme_galaxy: 'Thạch Anh', bb_theme_candy: 'Kẹo Ngọt', bb_theme_volcano: 'Đất Nung', bb_theme_frost: 'Băng Tuyết',
      bb_neon_overdrive: '⚡ CHUYỂN CẢNH NEON! ⚡', bb_board_cleared: '💥 DỌN SẠCH BÀN CỜ! 💥',
      bb_double: 'PHÁ ĐÔI!', bb_triple: 'PHÁ BA! 🔥', bb_mega: 'SIÊU PHÁ HÀNG! ⚡',
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
      wm_plus_life: '+1 mạng', finish: '🏁 Kết thúc',
      game_sudoku: 'Điền Số Sudoku', desc_sudoku: 'Điền số vào ô trống sao cho đúng luật',
      game_onet: 'Nối Hình', desc_onet: 'Nối cặp hình giống nhau không quá 2 lần rẽ',
      game_mahjong: 'Mạt Chược', desc_mahjong: 'Ghép cặp quân bài tự do để xóa toàn bộ bàn',
      game_blockslide: 'Trượt Khối', desc_blockslide: 'Trượt các khối để đưa khối đỏ ra ngoài',
      sk_easy: 'Dễ', sk_medium: 'Vừa', sk_hard: 'Khó', sk_choose: 'Chọn độ khó',
      sk_hint: 'Gợi ý', sk_check: 'Kiểm tra', sk_congrats: 'Hoàn thành! Tuyệt vời!',
      sk_errors: 'Có {0} lỗi', sk_no_errors: 'Không có lỗi!', sk_hint_used: 'Đã gợi ý ô',
      on_time: 'Thời gian: {0}s', on_pairs: 'Cặp còn lại: {0}',
      on_hint: 'Gợi ý', on_timeup: '+30 giây',
      on_solved: 'Hoàn thành!', on_level: 'Màn {0}',
      mj_pairs: 'Cặp còn: {0}', mj_hint: 'Gợi ý', mj_undo: 'Hoàn tác',
      mj_solved: 'Chúc mừng! Dọn sạch bàn!', mj_no_moves: 'Hết nước đi!',
      bs_moves: 'Bước: {0}', bs_level: 'Màn {0}', bs_hint: 'Gợi ý', bs_undo: 'Hoàn tác',
      bs_solved: 'Hoàn thành màn!', bs_next: 'Màn tiếp'
    },
    en: {
      app_name: 'Puzzle Hub', hub_subtitle: 'Puzzle Paradise',
      hub_main_game: 'MAIN GAME', hub_mini_games: 'ALL PUZZLES', hub_play_now: 'PLAY NOW',
      hub_featured: 'FEATURED', hub_games_count: '9 games',
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
      bb_combo_great: 'GREAT COMBO x{0}!', bb_combo_super: 'SUPER COMBO x{0}!', bb_combo_mega: 'MEGA COMBO x{0}!', bb_combo_ultra: 'ULTRA COMBO x{0}!',
      bb_theme: 'Theme: {0}',
      bb_theme_rose: 'Rose Pink', bb_theme_forest: 'Forest Green', bb_theme_wood: 'Mocha Wood',
      bb_theme_terracotta: 'Terracotta Clay', bb_theme_sapphire: 'Midnight Sapphire', bb_theme_neon: 'Cyber Neon',
      bb_theme_amethyst: 'Royal Amethyst', bb_theme_sunset: 'Sunset Amber', bb_theme_glacier: 'Glacier Ice', bb_theme_gold: 'Imperial Gold',
      bb_theme_pastel: 'Rose Pink', bb_theme_ocean: 'Midnight Sapphire', bb_theme_galaxy: 'Royal Amethyst', bb_theme_candy: 'Candy Pop', bb_theme_volcano: 'Terracotta Clay', bb_theme_frost: 'Glacier Ice',
      bb_neon_overdrive: '⚡ NEON OVERDRIVE! ⚡', bb_board_cleared: '💥 BOARD CLEARED! 💥',
      bb_double: 'DOUBLE CLEAR!', bb_triple: 'TRIPLE CLEAR! 🔥', bb_mega: 'MEGA CLEAR! ⚡',
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
      wm_plus_life: '+1 life', finish: '🏁 Finish',
      game_sudoku: 'Sudoku', desc_sudoku: 'Fill the grid so every row, column and box has 1–9',
      game_onet: 'Onet', desc_onet: 'Connect matching pairs with a path of at most 2 turns',
      game_mahjong: 'Mahjong', desc_mahjong: 'Remove all free matching tile pairs from the board',
      game_blockslide: 'Block Slide', desc_blockslide: 'Slide blocks to move the red block to the exit',
      sk_easy: 'Easy', sk_medium: 'Medium', sk_hard: 'Hard', sk_choose: 'Choose difficulty',
      sk_hint: 'Hint', sk_check: 'Check', sk_congrats: 'Puzzle complete! Great job!',
      sk_errors: '{0} error(s) found', sk_no_errors: 'No errors!', sk_hint_used: 'Cell revealed',
      on_time: 'Time: {0}s', on_pairs: 'Pairs left: {0}',
      on_hint: 'Hint', on_timeup: '+30 seconds',
      on_solved: 'Level complete!', on_level: 'Level {0}',
      mj_pairs: 'Pairs left: {0}', mj_hint: 'Hint', mj_undo: 'Undo',
      mj_solved: 'Congratulations! Board cleared!', mj_no_moves: 'No more moves!',
      bs_moves: 'Moves: {0}', bs_level: 'Level {0}', bs_hint: 'Hint', bs_undo: 'Undo',
      bs_solved: 'Level complete!', bs_next: 'Next level'
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

    // Nhạc nền: Giai điệu Piano cổ điển du dương, ấm áp và thư giãn (64 BPM, 16 khuông nhạc ~60 giây lặp tuần hoàn).
    // Âm sắc Piano mộc thuần khiết: bồi âm acoustic, ngân rung dây kép (chorus), tấn công mượt mà không tiếng lộp độp.
    function buildMusic(c) {
      var rate = 22050, bpm = 64, beat = 60 / bpm, bars = 16;
      var N = Math.floor(bars * 4 * beat * rate);
      var data = new Float32Array(N);

      function mf(m) { return 440 * Math.pow(2, (m - 69) / 12); }

      // Các bậc bồi âm piano: [bậc, biên độ tương đối, hệ số tắt dần, thời gian tối đa s]
      var harmonics = [
        [1, 1.0,  1.0, 3.8],
        [2, 0.50, 1.4, 2.8],
        [3, 0.20, 2.1, 1.6],
        [4, 0.08, 3.0, 0.8],
        [5, 0.03, 4.2, 0.4]
      ];

      function addNote(t0, m, vel, dur) {
        var f0 = mf(m);
        var detune = 0.22 / f0; // ngân rung tự nhiên giữa các dây đàn
        var baseDecay = 0.50 + (f0 / 440) * 0.35;
        var s0 = Math.floor(t0 * rate);
        var attackTime = 0.015; // 15ms vuốt mượt mà, triệt tiêu hoàn toàn tiếng lách cách / lộp độp

        for (var h = 0; h < harmonics.length; h++) {
          var hNum = harmonics[h][0], hAmp = harmonics[h][1], hDecMult = harmonics[h][2], hMaxDur = harmonics[h][3];
          var fk = hNum * f0 * Math.sqrt(1 + 0.00015 * hNum * hNum);
          var fk2 = fk * (1 + detune);
          var decay = baseDecay * hDecMult;
          var w1 = 2 * Math.PI * fk / rate;
          var w2 = 2 * Math.PI * fk2 / rate;
          var amp = hAmp * vel * 0.08;

          var noteDur = Math.min(dur || 4.0, hMaxDur);
          var nSamples = Math.floor(noteDur * rate);

          for (var i = 0; i < nSamples; i++) {
            var t = i / rate;
            var env = (t < attackTime) ? 0.5 * (1 - Math.cos(Math.PI * t / attackTime)) : 1;
            env *= Math.exp(-decay * t);
            if (t > attackTime && env < 0.00003) break;
            var val = (Math.sin(w1 * i) + 0.55 * Math.sin(w2 * i)) * env * amp;
            data[(s0 + i) % N] += val;
          }
        }
      }

      // Hợp âm tay trái trầm ấm, giữ pedal ngân dài bồng bềnh
      var chordsLH = [
        [[0.0, 36, 0.65, 4.0], [1.0, 55, 0.40, 3.0], [1.0, 64, 0.40, 3.0], [1.0, 71, 0.35, 3.0]],
        [[0.0, 35, 0.65, 4.0], [1.0, 55, 0.40, 3.0], [1.0, 64, 0.40, 3.0], [1.0, 74, 0.35, 3.0]],
        [[0.0, 33, 0.65, 4.0], [1.0, 52, 0.40, 3.0], [1.0, 60, 0.40, 3.0], [1.0, 67, 0.35, 3.0]],
        [[0.0, 29, 0.65, 4.0], [1.0, 48, 0.40, 3.0], [1.0, 57, 0.40, 3.0], [1.0, 64, 0.35, 3.0]],
        [[0.0, 38, 0.65, 4.0], [1.0, 57, 0.40, 3.0], [1.0, 65, 0.40, 3.0], [1.0, 72, 0.35, 3.0]],
        [[0.0, 31, 0.65, 4.0], [1.0, 53, 0.40, 3.0], [1.0, 60, 0.40, 2.0], [3.0, 59, 0.35, 1.5]],
        [[0.0, 40, 0.65, 4.0], [1.0, 59, 0.40, 3.0], [1.0, 67, 0.40, 3.0], [1.0, 74, 0.35, 3.0]],
        [[0.0, 33, 0.65, 4.0], [1.0, 52, 0.40, 3.0], [1.0, 60, 0.40, 3.0], [1.0, 67, 0.35, 3.0]],
        [[0.0, 38, 0.65, 4.0], [1.0, 53, 0.40, 3.0], [1.0, 60, 0.40, 3.0], [1.0, 64, 0.35, 3.0]],
        [[0.0, 31, 0.65, 4.0], [1.0, 53, 0.40, 3.0], [1.0, 59, 0.40, 3.0], [1.0, 64, 0.35, 3.0]],
        [[0.0, 36, 0.65, 4.0], [1.0, 52, 0.40, 3.0], [1.0, 59, 0.40, 3.0], [1.0, 67, 0.35, 3.0]],
        [[0.0, 29, 0.65, 4.0], [1.0, 48, 0.40, 3.0], [1.0, 57, 0.40, 3.0], [1.0, 64, 0.35, 3.0]],
        [[0.0, 38, 0.65, 4.0], [1.0, 57, 0.40, 3.0], [1.0, 65, 0.40, 3.0], [1.0, 72, 0.35, 3.0]],
        [[0.0, 31, 0.65, 4.0], [1.0, 50, 0.40, 3.0], [1.0, 55, 0.40, 3.0], [2.5, 59, 0.35, 1.5]],
        [[0.0, 36, 0.65, 4.0], [1.0, 55, 0.40, 3.0], [1.0, 62, 0.40, 3.0], [1.0, 64, 0.35, 3.0]],
        [[0.0, 36, 0.50, 4.0], [1.0, 48, 0.35, 3.5], [2.0, 55, 0.30, 2.5], [3.0, 64, 0.25, 2.0]]
      ];

      // Giai điệu tay phải nhẹ nhàng, thanh thoát, sâu lắng
      var melody = [
        [0, 0.0, 76, 0.62, 2.5], [0, 2.5, 74, 0.52, 1.5],
        [1, 0.0, 71, 0.60, 2.2], [1, 2.0, 72, 0.52, 1.0], [1, 3.0, 74, 0.55, 1.0],
        [2, 0.0, 72, 0.60, 2.8], [2, 3.0, 69, 0.50, 1.0],
        [3, 0.0, 67, 0.60, 1.8], [3, 2.0, 71, 0.52, 1.0], [3, 3.0, 72, 0.55, 1.0],
        [4, 0.0, 74, 0.62, 2.5], [4, 2.5, 76, 0.52, 1.5],
        [5, 0.0, 74, 0.60, 2.2], [5, 2.0, 71, 0.50, 1.0], [5, 3.0, 72, 0.55, 1.0],
        [6, 0.0, 67, 0.60, 2.8], [6, 3.0, 71, 0.50, 1.0],
        [7, 0.0, 69, 0.62, 2.8], [7, 3.0, 72, 0.55, 1.0],
        [8, 0.0, 74, 0.65, 2.0], [8, 2.0, 76, 0.58, 1.0], [8, 3.0, 77, 0.62, 1.0],
        [9, 0.0, 79, 0.70, 2.5], [9, 2.5, 77, 0.55, 0.8], [9, 3.25, 76, 0.55, 0.8],
        [10, 0.0, 76, 0.68, 2.8], [10, 2.5, 74, 0.55, 0.8], [10, 3.25, 72, 0.60, 0.8],
        [11, 0.0, 72, 0.65, 2.2], [11, 2.0, 71, 0.52, 1.0], [11, 3.0, 69, 0.52, 1.0],
        [12, 0.0, 69, 0.62, 2.0], [12, 2.0, 71, 0.52, 1.0], [12, 3.0, 72, 0.58, 1.0],
        [13, 0.0, 74, 0.62, 2.5], [13, 2.5, 71, 0.52, 1.5],
        [14, 0.0, 72, 0.62, 3.5],
        [15, 0.0, 76, 0.50, 4.0], [15, 2.0, 84, 0.40, 3.0]
      ];

      for (var b = 0; b < chordsLH.length; b++) {
        var barT = b * 4 * beat;
        var evs = chordsLH[b];
        for (var e = 0; e < evs.length; e++) {
          addNote(barT + evs[e][0] * beat, evs[e][1], evs[e][2] * 0.7, evs[e][3] * beat);
        }
      }

      for (var mIdx = 0; mIdx < melody.length; mIdx++) {
        var ev = melody[mIdx];
        var tM = (ev[0] * 4 + ev[1]) * beat;
        addNote(tM, ev[2], ev[3], ev[4] * beat);
      }

      // Độ vang êm ái của thùng đàn (mượt mà, không tiếng dội rời rạc)
      var diffDelay = Math.floor(0.18 * rate);
      var diffGain = 0.18;
      var diffBuf = new Float32Array(N);
      for (var s = 0; s < N; s++) {
        var src = (s - diffDelay + N) % N;
        diffBuf[s] = data[src] * diffGain;
      }
      for (s = 0; s < N; s++) data[s] += diffBuf[s];

      var peak = 0;
      for (var p = 0; p < N; p++) peak = Math.max(peak, Math.abs(data[p]));
      var g = peak > 0 ? 0.72 / peak : 1;
      for (p = 0; p < N; p++) data[p] *= g;

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
        musicGain.gain.value = 0.42;
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
