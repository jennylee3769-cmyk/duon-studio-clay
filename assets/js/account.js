/* ============================================================
   두온 스튜디오 - account.js
   로그인 · 가입 · 내 정보 · 탈퇴 · 문의 · 공지 · 초대 이벤트
   백엔드는 두온북과 같은 api.php 를 쓴다. 오류는 코드로 오므로
   사람이 읽을 문장으로 바꿔서 보여 준다.
   ============================================================ */
(function () {
  'use strict';

  var D = window.DUON;
  if (!D) return;

  var MSG = {
    demo_only: '이 로컬 복제본에는 계정·문의 서버가 연결되어 있지 않습니다.',
    bad_name: '이름은 두 글자 이상 적어 주세요.',
    bad_email: '이메일 형식이 올바르지 않습니다.',
    bad_password: '비밀번호는 8자 이상이어야 합니다.',
    email_exists: '이미 가입된 이메일입니다. 로그인해 주세요.',
    bad_login: '이메일 또는 비밀번호가 맞지 않습니다.',
    invalid: '이메일 또는 비밀번호가 맞지 않습니다.',
    not_found: '가입되지 않은 이메일입니다.',
    withdrawn: '탈퇴한 계정입니다.',
    unauthorized: '권한이 없습니다.',
    bad_origin: '보안 확인에 실패했습니다. 새로고침 후 다시 시도해 주세요.',
    need_login: '로그인이 필요합니다.',
    rate_limited: '요청이 너무 잦습니다. 잠시 후 다시 시도해 주세요.',
    too_fast: '방금 문의를 보내셨습니다. 1분 뒤에 다시 시도해 주세요.',
    bad_message: '문의 내용을 다섯 글자 이상 적어 주세요.',
    bad_current_password: '현재 비밀번호가 맞지 않습니다.',
    invalid_login: '이메일 또는 비밀번호가 맞지 않습니다.',
    locked: '로그인 실패가 반복되어 10분간 잠겼습니다. 잠시 후 다시 시도해 주세요.',
    inactive: '이용이 정지된 계정입니다. 문의해 주세요.',
    login_required: '로그인이 필요합니다.',
    bad_input: '이메일과 비밀번호를 확인해 주세요.'
  };
  function human(res) {
    if (!res) return '서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.';
    if (res.error) return MSG[res.error] || ('처리하지 못했습니다 (' + res.error + ')');
    return '처리하지 못했습니다.';
  }
  function note(id, kind, text) {
    var box = D.$(id);
    if (!box) return;
    box.innerHTML = text ? '<div class="' + kind + '">' + D.esc(text) + '</div>' : '';
  }

  var me = null;

  /* ── 로그인 상태 반영 ── */
  function applyUser(user) {
    me = user || null;
    var who = D.$('#whoAmI');
    var btn = D.$('#loginBtn');
    var guest = D.$('#acGuest');
    var mine = D.$('#acUser');

    if (me) {
      if (who) who.textContent = me.name + ' 님';
      if (btn) btn.textContent = '내 계정';
      if (guest) guest.hidden = true;
      if (mine) mine.hidden = false;
      var n = D.$('#pfName'), e = D.$('#pfEmail');
      if (n) n.value = me.name || '';
      if (e) e.value = me.email || '';
      var acTitle = D.$('#acTitle'), acLead = D.$('#acLead');
      if (acTitle) acTitle.textContent = me.name + ' 님의 계정';
      if (acLead) acLead.textContent = '이름을 바꾸거나 로그아웃하실 수 있습니다.';
      // 문의 폼을 미리 채워 두면 다시 적는 수고를 던다.
      var inName = D.$('#inName'), inContact = D.$('#inContact');
      if (inName && !inName.value) inName.value = me.name || '';
      if (inContact && !inContact.value) inContact.value = me.email || '';
    } else {
      if (who) who.textContent = '';
      if (btn) btn.textContent = '로그인';
      if (guest) guest.hidden = false;
      if (mine) mine.hidden = true;
    }
    announce();
  }

  /* 로그인·로그아웃을 다른 모듈(미디어 브리지)이 바로 알 수 있게 알린다. */
  function announce() {
    try { document.dispatchEvent(new CustomEvent('duon:auth', { detail: me })); } catch (e) {}
  }

  function loadMe() {
    return D.api('me').then(function (r) {
      applyUser(r && r.ok ? r.user : null);
      return me;
    });
  }

  /* ── 로그인 ── */
  var loginForm = D.$('#loginForm');
  if (loginForm) loginForm.addEventListener('submit', function (e) {
    e.preventDefault();
    note('#liMsg', 'err', '');
    D.api('login', { email: D.$('#liEmail').value.trim(), password: D.$('#liPw').value })
      .then(function (r) {
        if (r && r.ok) {
          D.$('#liPw').value = '';
          applyUser(r.user);
          D.toast('로그인했습니다');
        } else {
          note('#liMsg', 'err', human(r));
        }
      });
  });

  /* ── 가입 ── */
  var signupForm = D.$('#signupForm');
  if (signupForm) signupForm.addEventListener('submit', function (e) {
    e.preventDefault();
    note('#suMsg', 'err', '');
    if (!D.$('#suAgree').checked) { note('#suMsg', 'err', '약관에 동의해야 가입할 수 있습니다.'); return; }
    D.api('signup', {
      name: D.$('#suName').value.trim(),
      email: D.$('#suEmail').value.trim(),
      password: D.$('#suPw').value
    }).then(function (r) {
      if (r && r.ok) {
        D.$('#suPw').value = '';
        applyUser(r.user);
        note('#suMsg', 'ok', '가입이 끝났습니다. 바로 이용하실 수 있습니다.');
        D.toast('환영합니다');
      } else {
        note('#suMsg', 'err', human(r));
      }
    });
  });

  /* ── 내 정보 ── */
  var profileForm = D.$('#profileForm');
  if (profileForm) profileForm.addEventListener('submit', function (e) {
    e.preventDefault();
    note('#pfMsg', 'ok', '');
    D.api('update_profile', { name: D.$('#pfName').value.trim() }).then(function (r) {
      if (r && r.ok) {
        if (me) me.name = D.$('#pfName').value.trim();
        applyUser(me);
        note('#pfMsg', 'ok', '저장했습니다.');
      } else {
        note('#pfMsg', 'err', human(r));
      }
    });
  });

  /* ── 비밀번호 변경 ── */
  var pwForm = D.$('#pwForm');
  if (pwForm) pwForm.addEventListener('submit', function (e) {
    e.preventDefault();
    note('#pwMsg', 'ok', '');
    var cur = D.$('#pwCur').value;
    var np = D.$('#pwNew').value;
    if (np !== D.$('#pwNew2').value) { note('#pwMsg', 'err', '새 비밀번호가 서로 다릅니다.'); return; }
    if (np.length < 8) { note('#pwMsg', 'err', MSG.bad_password); return; }
    D.api('update_profile', { current_password: cur, password: np }).then(function (r) {
      if (r && r.ok) {
        pwForm.reset();
        note('#pwMsg', 'ok', '비밀번호를 변경했습니다.');
        D.toast('비밀번호를 변경했습니다');
      } else {
        note('#pwMsg', 'err', human(r));
      }
    });
  });

  var logoutBtn = D.$('#logoutBtn');
  if (logoutBtn) logoutBtn.addEventListener('click', function () {
    D.api('logout').then(function () {
      applyUser(null);
      D.toast('로그아웃했습니다');
    });
  });

  var withdrawBtn = D.$('#withdrawBtn');
  if (withdrawBtn) withdrawBtn.addEventListener('click', function () {
    if (!confirm('정말 탈퇴하시겠습니까?\n계정 정보가 지워지며 되돌릴 수 없습니다.')) return;
    D.api('withdraw').then(function (r) {
      if (r && r.ok) {
        applyUser(null);
        D.toast('탈퇴 처리했습니다');
      } else {
        note('#pfMsg', 'err', human(r));
      }
    });
  });

  /* ── 문의 ── */
  var inquiryForm = D.$('#inquiryForm');
  if (inquiryForm) inquiryForm.addEventListener('submit', function (e) {
    e.preventDefault();
    note('#inResult', 'ok', '');
    // api.php 는 필드명을 email 로 받고 형식 검증까지 한다. 전화번호는 받지 않는다.
    var payload = {
      name: D.$('#inName').value.trim(),
      email: D.$('#inContact').value.trim(),
      message: D.$('#inMsg').value.trim()
    };
    if (payload.message.length < 5) { note('#inResult', 'err', '문의 내용을 다섯 글자 이상 적어 주세요.'); return; }
    D.api('inquiry', payload).then(function (r) {
      if (r && r.ok) {
        D.$('#inMsg').value = '';
        note('#inResult', 'ok', '문의를 보냈습니다. 확인 후 연락드리겠습니다.');
      } else {
        note('#inResult', 'err', human(r));
      }
    });
  });

  /* ── 공지 ── */
  function loadNotices() {
    var box = D.$('#noticeList');
    if (!box) return;
    D.api('notices').then(function (r) {
      var rows = (r && r.notices) || (r && r.items) || [];
      if (!rows.length) {
        box.innerHTML = '<div class="empty">등록된 공지가 없습니다.</div>';
        return;
      }
      box.innerHTML = rows.map(function (n) {
        return '<details><summary>' +
          (n.cat ? '<span style="color:var(--emerald);font-size:12px;margin-right:8px">' + D.esc(n.cat) + '</span>' : '') +
          D.esc(n.title) +
          '<span style="display:block;font:400 12px/1.6 var(--mono);color:var(--ink-3);margin-top:4px">' + D.esc(n.date || '') + '</span>' +
          '</summary><p>' + D.esc(n.body || '').replace(/\n/g, '<br>') + '</p></details>';
      }).join('');
    });
  }
  D.onEnter('notice', loadNotices);

  /* ── 초대 이벤트 ── */
  function randomCode() {
    var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    var out = '';
    var buf = new Uint32Array(6);
    (window.crypto || window.msCrypto).getRandomValues(buf);
    for (var i = 0; i < 6; i++) out += chars[buf[i] % chars.length];
    return 'DUON-' + out;
  }
  function paintInvite() {
    var code = D.store.get('inviteCode', '');
    if (!code) { code = randomCode(); D.store.set('inviteCode', code); }
    var c = D.$('#evCode'), l = D.$('#evLink');
    if (c) c.value = code;
    if (l) l.value = location.origin + location.pathname + '?invite=' + encodeURIComponent(code);
  }
  var evCopy = D.$('#evCopy');
  if (evCopy) evCopy.addEventListener('click', function () { D.copy(D.$('#evLink').value); });
  var evNew = D.$('#evNew');
  if (evNew) evNew.addEventListener('click', function () {
    D.store.set('inviteCode', randomCode());
    paintInvite();
    D.toast('새 초대 코드를 만들었습니다');
  });
  D.onEnter('event', paintInvite);

  /* 초대 링크로 들어온 경우 기록해 둔다. 정산은 정식 오픈 후 계정 기준으로 한다. */
  document.addEventListener('DOMContentLoaded', function () {
    var invited = new URLSearchParams(location.search).get('invite');
    if (invited && !D.store.get('invitedBy', '')) {
      D.store.set('invitedBy', invited);
      D.toast('초대 코드가 확인되었습니다');
    }
    loadMe();
  });
})();
