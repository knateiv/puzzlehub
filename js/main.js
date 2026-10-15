/* Khởi động ứng dụng web. */
(function () {
  'use strict';
  var PH = window.PH;

  // Màu theo giao diện hiện tại (đọc từ biến CSS, lưu tạm 400ms để vẽ nhanh)
  var cached = null, stamp = 0;
  PH.theme = function () {
    var now = performance.now();
    if (!cached || now - stamp > 400) {
      cached = {
        empty: PH.cssVar('--grid-empty'), board: PH.cssVar('--board-bg'), text: PH.cssVar('--text'),
        text2: PH.cssVar('--text2'), line: PH.cssVar('--grid-line'), surface: PH.cssVar('--surface'),
        accent: PH.cssVar('--accent'), accentDark: PH.cssVar('--accent-dark'), gold: PH.cssVar('--gold')
      };
      stamp = now;
    }
    return cached;
  };

  PH.UI.applyTheme();
  PH.UI.show(PH.UI.hubScreen());

  // Quản lý màn hình Splash khởi động nghệ thuật
  var splash = document.getElementById('splash');
  if (splash) {
    var prog = document.getElementById('splashProgress');
    if (prog) {
      setTimeout(function () { prog.style.width = '100%'; }, 60);
    }
    var dismissed = false;
    function dismissSplash() {
      if (dismissed) return;
      dismissed = true;
      PH.Sound.unlock();
      splash.classList.add('fade-out');
      setTimeout(function () {
        if (splash.parentNode) splash.parentNode.removeChild(splash);
      }, 550);
    }
    // Tự động chuyển mượt vào trang chủ sau 1.4s hoặc chạm ngay để vào nhanh
    splash.addEventListener('pointerdown', dismissSplash);
    splash.addEventListener('touchstart', dismissSplash);
    setTimeout(dismissSplash, 1400);
  }

  // Trình duyệt chỉ cho phát âm thanh sau lần chạm đầu tiên
  function unlock() { PH.Sound.unlock(); }
  document.addEventListener('pointerdown', unlock, { passive: true });
  document.addEventListener('touchstart', unlock, { passive: true });

  // Chặn cử chỉ phóng to / kéo trang trên iOS
  document.addEventListener('gesturestart', function (e) { e.preventDefault(); });
  document.addEventListener('dblclick', function (e) { e.preventDefault(); });

  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('sw.js').catch(function () { /* bỏ qua */ });
  }
})();
