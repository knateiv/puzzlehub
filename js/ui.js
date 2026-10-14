/* Puzzle Hub (web) - giao diện chung: trang chủ, cài đặt, bảng xếp hạng, khung game, hộp thoại. */
(function () {
  'use strict';
  var PH = window.PH, h = PH.h, T = PH.T, Store = PH.Store, Sound = PH.Sound;

  var catalog = [
    { id: 'block_blast', nameKey: 'game_block_blast', descKey: 'desc_block_blast', emoji: '🧱', color: '#FF8FAB' },
    { id: 'tictactoe', nameKey: 'game_tictactoe', descKey: 'desc_tictactoe', emoji: '❌', color: '#8EC5FC' },
    { id: 'oneline', nameKey: 'game_oneline', descKey: 'desc_oneline', emoji: '✏️', color: '#8FE3C0' },
    { id: 'watersort', nameKey: 'game_watersort', descKey: 'desc_watersort', emoji: '🧪', color: '#6FDCE3' },
    { id: 'fruitmerge', nameKey: 'game_fruitmerge', descKey: 'desc_fruitmerge', emoji: '🍉', color: '#FFC48C' },
    { id: 'whack', nameKey: 'game_whack', descKey: 'desc_whack', emoji: '🔨', color: '#B7A6F2' },
    { id: 'sudoku', nameKey: 'game_sudoku', descKey: 'desc_sudoku', emoji: '🔢', color: '#4DABF7' },
    { id: 'onet', nameKey: 'game_onet', descKey: 'desc_onet', emoji: '🔗', color: '#69DB7C' },
    { id: 'mahjong', nameKey: 'game_mahjong', descKey: 'desc_mahjong', emoji: '🀄', color: '#FF6B6B' },
    { id: 'blockslide', nameKey: 'game_blockslide', descKey: 'desc_blockslide', emoji: '🚗', color: '#FFA94D' }
  ];

  var app = document.getElementById('app');
  var current = null;      // { el, destroy, rerender, keepAlive, onPause, onResume }
  var activeGames = {};    // info.id -> screen

  function show(screen) {
    if (current) {
      if (current.keepAlive) {
        if (current.onPause) current.onPause();
      } else if (current.destroy) {
        current.destroy();
      }
    }
    app.innerHTML = '';
    app.appendChild(screen.el);
    current = screen;
    if (screen.onResume) screen.onResume();
  }

  function applyTheme() {
    var dark = Store.isDark();
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    var m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute('content', dark ? '#1E1B2E' : '#FFF7F0');
    document.documentElement.lang = Store.getLang();
  }

  function toast(msg) {
    var t = h('div', { class: 'toast', text: msg });
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 1800);
  }

  function dialog(children) {
    var box = h('div', { class: 'dialog' }, children);
    var ov = h('div', { class: 'overlay' }, box);
    document.body.appendChild(ov);
    return { box: box, close: function () { ov.remove(); } };
  }

  function button(text, cls, onclick) {
    return h('button', { class: 'btn ' + (cls || ''), text: text, onclick: onclick });
  }

  // ------------------------------------------------------------------ trang chủ
  function bestText(id) {
    var b = Store.getBest(id);
    return b > 0 ? T('hub_best', b) : T('hub_not_played');
  }

  function openGame(info) {
    Sound.unlock();
    Sound.play('tap');
    if (activeGames[info.id] && !activeGames[info.id].frame.isEnded()) {
      show(activeGames[info.id]);
      return;
    }
    startGame(info);
  }

  function hubScreen() {
    var main = catalog[0];
    var decorMap = ['.XX..', '.XX.X', 'X..XX', 'XX.XX', 'XX...'];
    var decor = h('div', { class: 'decor' });
    decorMap.forEach(function (row, r) {
      for (var c = 0; c < 5; c++) {
        decor.appendChild(h('i', { class: row[c] === 'X' ? ((r + c) % 2 === 0 ? 'on1' : 'on2') : '' }));
      }
    });

    var hero = h('div', { class: 'hero press', onclick: function () { openGame(main); } }, [
      h('div', { class: 'hero-row' }, [
        h('div', { style: 'flex:1' }, [
          h('h2', { text: T(main.nameKey) }),
          h('p', { text: T(main.descKey) }),
          h('div', { class: 'bestline', text: bestText(main.id) })
        ]),
        decor
      ]),
      h('div', { class: 'play', text: T('hub_play_now') })
    ]);

    var grid = h('div', { class: 'grid2' });
    catalog.slice(1).forEach(function (g) {
      grid.appendChild(h('div', { class: 'card press', onclick: function () { openGame(g); } }, [
        h('div', { class: 'ic', style: 'background:' + PH.alpha(g.color, 0.35), text: g.emoji }),
        h('div', { class: 'nm', text: T(g.nameKey) }),
        h('div', { class: 'ds', text: T(g.descKey) }),
        h('div', { class: 'bs', text: bestText(g.id) })
      ]));
    });

    var el = h('div', { class: 'screen scroll' }, [
      h('div', { class: 'hub-head' }, [
        h('div', { class: 't' }, [
          h('h1', { text: '🧩 ' + T('app_name') }),
          h('div', { class: 's', text: T('hub_subtitle') })
        ]),
        h('button', { class: 'iconbtn', text: '🏆', onclick: function () { show(leaderboardScreen()); } }),
        h('button', { class: 'iconbtn', text: '⚙️', onclick: function () { show(settingsScreen()); } })
      ]),
      h('div', { style: 'margin-top:14px' }, h('span', { class: 'coinchip', text: '🪙 ' + Store.getCoins() })),
      h('div', { class: 'section', text: T('hub_main_game') }),
      hero,
      h('div', { class: 'section', text: T('hub_mini_games') }),
      grid,
      h('div', { style: 'height:24px' })
    ]);
    return { el: el };
  }

  // ------------------------------------------------------------------ cài đặt
  function switchRow(emoji, key, checked, cb) {
    var input = h('input', { type: 'checkbox' });
    input.checked = checked;
    input.addEventListener('change', function () { cb(input.checked); });
    return h('div', { class: 'row' }, [
      h('div', { class: 'grow', text: emoji + '  ' + T(key) }),
      h('label', { class: 'switch' }, [input, h('span')])
    ]);
  }

  function settingsScreen() {
    function rebuild() { show(settingsScreen()); }
    var viBtn = h('button', { class: 'chip' + (Store.getLang() === 'vi' ? ' sel' : ''), text: 'Tiếng Việt', onclick: function () { setLang('vi'); } });
    var enBtn = h('button', { class: 'chip' + (Store.getLang() === 'en' ? ' sel' : ''), text: 'English', onclick: function () { setLang('en'); } });
    function setLang(l) {
      if (Store.getLang() === l) return;
      Store.setSetting('set_lang', l);
      applyTheme();
      rebuild();
    }
    var el = h('div', { class: 'screen scroll' }, [
      h('div', { class: 'topbar' }, [
        h('button', { class: 'iconbtn', text: '←', onclick: function () { show(hubScreen()); } }),
        h('div', { class: 'title', style: 'text-align:left', text: '⚙️ ' + T('settings_title') })
      ]),
      h('div', { class: 'panel' }, [
        switchRow('🔊', 'setting_sound', Store.isSound(), function (v) { Store.setSetting('set_sound', v); if (v) { Sound.unlock(); Sound.play('coin'); } }),
        switchRow('🎵', 'setting_music', Store.isMusic(), function (v) { Store.setSetting('set_music', v); Sound.unlock(); Sound.refreshMusic(); }),
        switchRow('📳', 'setting_haptics', Store.isHaptics(), function (v) { Store.setSetting('set_haptics', v); }),
        h('div', { class: 'note', text: T('haptics_note') }),
        switchRow('🌙', 'setting_dark', Store.isDark(), function (v) { Store.setSetting('set_dark', v); applyTheme(); })
      ]),
      h('div', { class: 'panel' }, h('div', { class: 'row' }, [
        h('div', { class: 'grow', text: '🌐  ' + T('setting_language') }), viBtn, enBtn
      ])),
      h('div', { style: 'margin-top:20px' }, button('🗑  ' + T('setting_reset'), 'danger', function () {
        var d = dialog([
          h('h2', { text: T('reset_title') }),
          h('p', { text: T('reset_message') }),
          button(T('ok'), 'primary', function () { Store.resetProgress(); d.close(); toast(T('reset_done')); }),
          button(T('cancel'), '', function () { d.close(); })
        ]);
      }))
    ]);
    // lưu ý: nút xóa dữ liệu chiếm toàn chiều rộng
    var resetBtn = el.querySelector('.btn.danger');
    if (resetBtn) resetBtn.style.width = '100%';
    return { el: el };
  }

  // ------------------------------------------------------------------ bảng xếp hạng
  function leaderboardScreen() {
    var medals = ['🥇', '🥈', '🥉', '4.', '5.'];
    var el = h('div', { class: 'screen scroll' }, [
      h('div', { class: 'topbar' }, [
        h('button', { class: 'iconbtn', text: '←', onclick: function () { show(hubScreen()); } }),
        h('div', { class: 'title', style: 'text-align:left', text: '🏆 ' + T('lb_title') })
      ]),
      h('div', { class: 'stat' }, [
        h('b', { text: T('lb_coins', Store.getCoins()) }),
        h('div', { text: T('lb_total_earned', Store.getTotalEarned()) }),
        h('div', { text: T('lb_games_played', Store.getPlays()) })
      ])
    ]);
    catalog.forEach(function (g) {
      var card = h('div', { class: 'lbcard' }, h('h3', { text: g.emoji + '  ' + T(g.nameKey) }));
      var top = Store.getTop(g.id);
      if (!top.length) card.appendChild(h('div', { class: 'empty', text: T('lb_empty') }));
      top.forEach(function (s, i) {
        card.appendChild(h('div', { class: 'lbrow' + (i === 0 ? ' first' : '') }, [
          h('div', { class: 'md', text: medals[i] }), h('div', { text: s.toLocaleString('en-US') })
        ]));
      });
      el.appendChild(card);
    });
    el.appendChild(h('div', { style: 'height:20px' }));
    return { el: el };
  }

  // ------------------------------------------------------------------ khung game
  function startGame(info) {
    if (activeGames[info.id] && activeGames[info.id].destroy) {
      try { activeGames[info.id].destroy(); } catch (e) {}
      delete activeGames[info.id];
    }
    var gameImpl = PH.games[info.id];
    var cleanups = [];
    var score = 0, ended = false, coinsEarned = 0, paused = false;
    var fitCanvas = null;
    var bestAtStart = Store.getBest(info.id);

    var coinChip = h('div', { class: 'coinchip' });
    var scoreVal = h('div', { class: 'val', text: '0' });
    var bestVal = h('div', { class: 'best', text: String(bestAtStart) });
    var stage = h('div', { class: 'stage' });
    var powerbar = h('div', { class: 'powerbar gone' });

    function refreshCoins() { coinChip.textContent = '🪙 ' + Store.getCoins(); }
    refreshCoins();

    var el = h('div', { class: 'screen' }, [
      h('div', { class: 'topbar' }, [
        h('button', { class: 'iconbtn', text: '←', onclick: function () { leaveGame(); } }),
        h('div', { class: 'title', text: info.emoji + ' ' + T(info.nameKey) }),
        coinChip
      ]),
      h('div', { class: 'scoreboard' }, [
        h('div', { class: 'col' }, [
          h('div', { class: 'lbl' }, [h('span', { class: 'ic', text: '🎯' }), h('span', { text: T('score_label') })]),
          scoreVal
        ]),
        h('div', { class: 'col right' }, [
          h('div', { class: 'lbl' }, [h('span', { class: 'ic', text: '🏆' }), h('span', { text: T('best_label') })]),
          bestVal
        ])
      ]),
      stage,
      powerbar
    ]);

    // Game chơi không giới hạn: bấm quay lại vẫn ghi điểm vào bảng xếp hạng
    function leaveGame() {
      if (frame.saveOnExit && !ended && score > 0) Store.submitScore(info.id, score);
      show(hubScreen());
    }

    var frame = {
      stage: stage,
      info: info,
      saveOnExit: false,
      saveSession: function (data) {
        if (!ended) Store.saveSession(info.id, data);
      },
      loadSession: function () {
        return Store.loadSession(info.id);
      },
      clearSession: function () {
        Store.clearSession(info.id);
      },
      /** Nút 🏁 Kết thúc: dừng ván, ghi điểm và hiện hộp thoại kết quả. */
      finishButton: function () {
        return button(T('finish'), '', function () { frame.endGame(score, 0); });
      },
      onDestroy: function (fn) { cleanups.push(fn); },
      isEnded: function () { return ended; },
      setScore: function (s) {
        score = s;
        scoreVal.textContent = String(s);
        if (s > Math.max(bestAtStart, 0)) bestVal.textContent = String(s);
      },
      getScore: function () { return score; },
      addCoins: function (n) {
        if (n <= 0) return;
        Store.addCoins(n);
        coinsEarned += n;
        refreshCoins();
      },
      trySpend: function (cost) {
        if (Store.spendCoins(cost)) {
          Sound.play('coin');
          refreshCoins();
          return true;
        }
        Sound.play('error');
        toast(T('not_enough_coins'));
        return false;
      },
      toast: function (key) { toast(T(key)); },
      addPowerUp: function (emoji, labelKey, cost, fn) {
        var b = h('button', { class: 'power press', onclick: function () { Sound.play('tap'); fn(); } }, [
          h('span', { class: 'em', text: emoji }),
          h('span', { class: 'nm', text: T(labelKey) }),
          h('span', { class: 'pr', text: '🪙 ' + cost })
        ]);
        powerbar.classList.remove('gone');
        powerbar.appendChild(b);
        return b;
      },
      setPowerUpActive: function (b, on) { if (b) b.classList.toggle('active', !!on); },
      loop: function (fn) {
        var alive = true;
        function tick(t) {
          if (!alive) return;
          if (!paused) fn(t);
          requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
        cleanups.push(function () { alive = false; });
      },
      /** Tạo canvas lấp đầy vùng "stage" (hoặc parent chỉ định); trả về đối tượng cảm ứng + vẽ. */
      makeCanvas: function (parent, onResize) {
        var canvas = h('canvas');
        (parent || stage).appendChild(canvas);
        var o = { canvas: canvas, ctx: canvas.getContext('2d'), w: 0, h: 0, dpr: 1 };
        function fit() {
          var r = canvas.getBoundingClientRect();
          var dpr = Math.min(window.devicePixelRatio || 1, 3);
          var w = Math.max(1, Math.round(r.width)), hh = Math.max(1, Math.round(r.height));
          if (w !== o.w || hh !== o.h || dpr !== o.dpr) {
            o.w = w; o.h = hh; o.dpr = dpr;
            canvas.width = Math.round(w * dpr);
            canvas.height = Math.round(hh * dpr);
            o.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            if (onResize) onResize(o);
          }
        }
        fitCanvas = fit;
        var ro = new ResizeObserver(fit);
        ro.observe(canvas);
        window.addEventListener('resize', fit);
        cleanups.push(function () { ro.disconnect(); window.removeEventListener('resize', fit); });
        setTimeout(fit, 0);
        o.fit = fit;
        o.pos = function (e) {
          var r = canvas.getBoundingClientRect();
          return { x: e.clientX - r.left, y: e.clientY - r.top };
        };
        return o;
      },
      endGame: function (finalScore, bonusCoins) {
        if (ended) return;
        ended = true;
        gameScreen.keepAlive = false;
        delete activeGames[info.id];
        Store.clearSession(info.id);
        var record = Store.submitScore(info.id, finalScore);
        frame.addCoins(bonusCoins);
        Sound.play(record ? 'win' : 'lose');
        var kids = [h('h2', { text: '🏁 ' + T('end_title') })];
        if (record) kids.push(h('div', { class: 'rec', text: T('end_new_record') }));
        kids.push(h('div', { class: 'big', text: String(finalScore) }));
        kids.push(h('div', { class: 'meta', text: T('end_best', Math.max(Store.getBest(info.id), finalScore)) }));
        kids.push(h('div', { class: 'coins', text: T('end_coins', coinsEarned) }));
        var d = dialog(kids);
        var box = d.box;
        box.appendChild(button(T('end_replay'), 'primary', function () { d.close(); startGame(info); }));
        box.appendChild(button(T('end_home'), '', function () { d.close(); show(hubScreen()); }));
      },
      refreshCoins: refreshCoins
    };

    var gameScreen = {
      el: el,
      frame: frame,
      keepAlive: true,
      onPause: function () {
        paused = true;
      },
      onResume: function () {
        paused = false;
        refreshCoins();
        if (fitCanvas) fitCanvas();
      },
      destroy: function () {
        cleanups.forEach(function (f) { try { f(); } catch (e) { /* bỏ qua */ } });
      }
    };
    activeGames[info.id] = gameScreen;

    show(gameScreen);
    gameImpl.start(frame);
  }

  PH.UI = {
    show: show, hubScreen: hubScreen, applyTheme: applyTheme, dialog: dialog, button: button, toast: toast,
    catalog: catalog
  };
})();
