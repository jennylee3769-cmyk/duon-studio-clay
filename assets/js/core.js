/* ============================================================
   두온 스튜디오 - core.js
   탭 라우팅(해시) · api.php 래퍼 · 토스트 · 스토리지 · 유틸
   localStorage 접두사는 duonbook_ 을 그대로 쓴다.
   두온북 사용자의 서재·표지 시안이 같은 오리진에 이미 쌓여 있어서,
   접두사를 바꾸면 기존 자료가 통째로 사라진 것처럼 보인다.
   ============================================================ */
(function () {
  'use strict';

  var D = window.DUON = window.DUON || {};

  /* ── 유틸 ── */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function fmtDate(ts) {
    var d = new Date(ts);
    if (isNaN(d.getTime())) return '';
    var mm = String(d.getMonth() + 1).padStart(2, '0');
    var dd = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '.' + mm + '.' + dd;
  }
  function comma(n) { return Number(n || 0).toLocaleString('ko-KR'); }
  function fmtDur(sec) {
    var s = Math.round(sec || 0);
    var m = Math.floor(s / 60);
    return m > 0 ? m + '분 ' + (s % 60) + '초' : s + '초';
  }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }

  /* ── 스토리지 ── */
  var store = {
    get: function (key, fallback) {
      try {
        var raw = localStorage.getItem('duonbook_' + key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch (e) { return fallback; }
    },
    set: function (key, val) {
      try { localStorage.setItem('duonbook_' + key, JSON.stringify(val)); return true; }
      catch (e) { toast('저장 공간이 가득 찼습니다. 서재에서 오래된 항목을 지워 주세요.'); return false; }
    },
    remove: function (key) {
      try { localStorage.removeItem('duonbook_' + key); } catch (e) {}
    }
  };

  /* ── 토스트 ── */
  var toastEl = null, toastTimer = null;
  function toast(msg) {
    if (!toastEl) {
      toastEl = el('div', 'toast');
      toastEl.setAttribute('role', 'status');
      toastEl.setAttribute('aria-live', 'polite');
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 2600);
  }

  /* ── api.php ── */
  function api(action, data) {
    // The public site uses a private PHP service. Keep this local clone isolated.
    if (action === 'notices') return Promise.resolve({ ok: true, notices: [] });
    if (action === 'track' || action === 'log_book') return Promise.resolve({ ok: true });
    return Promise.resolve({ ok: false, error: 'demo_only' });
  }

  /* ── 클립보드 ──
     execCommand 폴백을 남겨 둔다. 사내망이나 http 접속에서는
     navigator.clipboard 가 아예 없는 경우가 있다. */
  function copy(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text)
        .then(function () { toast('클립보드에 복사했습니다'); return true; })
        .catch(function () { return legacyCopy(text); });
    }
    return Promise.resolve(legacyCopy(text));
  }
  function legacyCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;left:-9999px;top:0';
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    toast(ok ? '클립보드에 복사했습니다' : '복사에 실패했습니다. 직접 선택해 복사해 주세요.');
    return ok;
  }

  /* ── 파일 내려받기 ── */
  function download(filename, text, mime) {
    var blob = new Blob([text], { type: (mime || 'text/plain') + ';charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = el('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  /* ══════════ 탭 라우팅 ══════════ */
  var TABS = [];
  var current = '';
  var listeners = {};

  /** 탭이 열릴 때 실행할 일을 등록한다. 매번 호출되므로 갱신이 필요한 화면에 쓴다. */
  function onEnter(tab, fn) {
    (listeners[tab] = listeners[tab] || []).push(fn);
  }

  function show(tab, opts) {
    opts = opts || {};
    if (!TABS.length) return;
    if (TABS.indexOf(tab) === -1) tab = TABS[0];
    current = tab;

    TABS.forEach(function (t) {
      var btn = document.getElementById('tab-' + t);
      var pane = document.getElementById('pane-' + t);
      var on = t === tab;
      if (btn) {
        btn.setAttribute('aria-selected', String(on));
        btn.tabIndex = on ? 0 : -1;
      }
      if (pane) pane.hidden = !on;
    });

    if (!opts.silent && location.hash.slice(1) !== tab) {
      history.replaceState(null, '', '#' + tab);
    }
    if (!opts.keepScroll) window.scrollTo({ top: 0, behavior: 'auto' });

    (listeners[tab] || []).forEach(function (fn) {
      try { fn(); } catch (e) { console.error('[tab ' + tab + ']', e); }
    });

    // 탭 전환도 하나의 화면 이동이므로 따로 집계한다.
    api('track', { page: tab });
  }

  function initTabs() {
    var bar = document.getElementById('tabbar');
    if (!bar) return;
    TABS = $$('button[role=tab]', bar).map(function (b) { return b.id.replace('tab-', ''); });

    $$('button[role=tab]', bar).forEach(function (btn, i) {
      btn.addEventListener('click', function () { show(TABS[i]); });
      btn.addEventListener('keydown', function (e) {
        var idx = -1;
        if (e.key === 'ArrowRight') idx = (i + 1) % TABS.length;
        else if (e.key === 'ArrowLeft') idx = (i - 1 + TABS.length) % TABS.length;
        else if (e.key === 'Home') idx = 0;
        else if (e.key === 'End') idx = TABS.length - 1;
        else return;
        e.preventDefault();
        show(TABS[idx]);
        document.getElementById('tab-' + TABS[idx]).focus();
      });
    });

    // 페이지 안 어디서든 data-go 로 탭을 옮길 수 있게 한다.
    document.addEventListener('click', function (e) {
      var go = e.target.closest('[data-go]');
      if (!go) return;
      e.preventDefault();
      show(go.getAttribute('data-go'));
    });

    window.addEventListener('hashchange', function () {
      var t = location.hash.slice(1);
      if (t && t !== current) show(t, { silent: true });
    });

    show(location.hash.slice(1) || TABS[0], { silent: true });
  }

  D.esc = esc; D.fmtDate = fmtDate; D.comma = comma; D.fmtDur = fmtDur;
  D.$ = $; D.$$ = $$; D.el = el;
  D.store = store; D.toast = toast; D.api = api;
  D.copy = copy; D.download = download;
  D.show = show; D.onEnter = onEnter;
  D.currentTab = function () { return current; };

  document.addEventListener('DOMContentLoaded', initTabs);
})();
