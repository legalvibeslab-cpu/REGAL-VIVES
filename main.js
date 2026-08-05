/* =========================================================
   REGAL VIVES — main.js
   0. オープニング（スプラッシュ）
   1. モバイルナビ（ドロワー）の開閉
   2. ヘッダーのスクロール状態
   3. スクロールに応じたフェードイン
   ========================================================= */
(function () {
  'use strict';

  /* ---------- 0. オープニング ---------- */

  // true にすると、同一セッション中は初回アクセス時のみ表示します
  var SHOW_ONCE_PER_SESSION = false;

  var splash = document.getElementById('splash');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // CSS変数（--splash-in など）から尺をミリ秒で読み取る
  function cssMs(name) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    if (!v) return 0;
    return v.slice(-2) === 'ms' ? parseFloat(v) : parseFloat(v) * 1000;
  }

  function seen() {
    try { return sessionStorage.getItem('rv-splash') === '1'; } catch (e) { return false; }
  }
  function markSeen() {
    try { sessionStorage.setItem('rv-splash', '1'); } catch (e) { /* noop */ }
  }

  // 本編を表示状態にする（スプラッシュを出さない場合もここを通る）
  function revealSite() {
    document.body.classList.remove('is-splashing');
    document.body.classList.add('is-loaded');
  }

  if (splash) {
    // ページ内リンク付きで開かれた場合／表示済みの場合はスキップ
    var skip = !!window.location.hash || (SHOW_ONCE_PER_SESSION && seen());

    if (skip) {
      splash.parentNode.removeChild(splash);
      revealSite();
    } else {
      document.body.classList.add('is-splashing');

      var outMs = reduced ? 200 : cssMs('--splash-out');
      var stayMs = reduced ? 500 : cssMs('--splash-in') + cssMs('--splash-hold');
      var leaveTimer;

      var leave = function () {
        if (!splash || splash.classList.contains('is-leaving')) return;
        clearTimeout(leaveTimer);
        splash.classList.add('is-leaving');
        revealSite();
        markSeen();

        setTimeout(function () {
          if (splash && splash.parentNode) splash.parentNode.removeChild(splash);
          splash = null;
        }, outMs + 200);
      };

      leaveTimer = setTimeout(leave, stayMs);

      // クリック／キー操作でスキップできるようにする
      splash.addEventListener('click', leave);
      document.addEventListener('keydown', function onKey(e) {
        if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ' || e.key === 'Tab') {
          document.removeEventListener('keydown', onKey);
          leave();
        }
      });

      // 何らかの理由でタイマーが動かなかった場合の保険
      window.addEventListener('load', function () {
        setTimeout(leave, stayMs);
      });
    }
  } else {
    revealSite();
  }

  /* ---------- 1. モバイルナビ ---------- */
  var toggle = document.getElementById('navToggle');
  var gnav = document.getElementById('gnav');

  function closeNav() {
    if (!toggle || !gnav) return;
    toggle.setAttribute('aria-expanded', 'false');
    gnav.classList.remove('is-open');
    document.body.classList.remove('is-nav-open');
  }

  if (toggle && gnav) {
    toggle.addEventListener('click', function () {
      var isOpen = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!isOpen));
      gnav.classList.toggle('is-open', !isOpen);
      document.body.classList.toggle('is-nav-open', !isOpen);
    });

    // ナビ内リンクをタップしたら閉じる
    gnav.addEventListener('click', function (e) {
      if (e.target.closest('a')) closeNav();
    });

    // Esc で閉じる
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeNav();
    });

    // PC幅に戻ったら状態をリセット
    var mq = window.matchMedia('(min-width: 900px)');
    mq.addEventListener('change', function (e) {
      if (e.matches) closeNav();
    });
  }

  /* ---------- 2. ヘッダーのスクロール状態 ---------- */
  var header = document.getElementById('siteHeader');

  if (header) {
    var onScroll = function () {
      header.classList.toggle('is-scrolled', window.scrollY > 8);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---------- 3. フェードイン ---------- */
  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var targets = document.querySelectorAll(
    '.section__head, .feature, .service, .news__item, .plan, .plan-foot,' +
    '.company__table, .cta__inner'
  );

  if (prefersReduced || !('IntersectionObserver' in window)) return;

  targets.forEach(function (el, i) {
    el.classList.add('reveal');
    el.style.transitionDelay = (i % 3) * 90 + 'ms';
  });

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      io.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });

  targets.forEach(function (el) { io.observe(el); });
})();
