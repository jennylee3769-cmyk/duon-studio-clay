/* ============================================================
   두온 스튜디오 - media.js
   숏폼 · 오디오북 (로컬 PDBOOK 스튜디오 브리지)

   영상 렌더링은 브라우저 엔진과 인코더를 함께 돌려야 해서 PHP 웹호스팅에서는
   돌지 않는다. 그래서 이용자 컴퓨터에서 도는 로컬 스튜디오를 호출한다.
   연결 상태는 두 가지로 보여 준다.
     연결됨        - 바로 쓸 수 있다
     연결 안 됨    - 실행 방법을 안내한다 (꺼져 있는 경우와 브라우저가 사설망을
                     막은 경우를 브라우저가 구분해 주지 않으므로 함께 안내한다)
   ============================================================ */
(function () {
  'use strict';

  var D = window.DUON;
  if (!D) return;

  /* 렌더 서버 후보.
     ① NAS 스튜디오 - 같은 출처라 CORS·사설망 차단이 아예 없다 (평소 이 경로로 붙는다)
     ② 내 PC 로컬 스튜디오 - NAS 가 멈췄거나 직접 돌리고 싶을 때의 대비책
     ①이 응답하면 그것을 쓰고, 아니면 ②로 내려간다. */
  var NAS_BASE = '/__local_clone_no_nas__';
  var LOCAL_BASE = 'http://127.0.0.1:4700';
  var BASE = NAS_BASE;
  var linked = false;
  var options = null;
  var uploads = { shorts: null, book: null };

  /* NAS 스튜디오는 회원만 쓸 수 있다. api.php 가 1시간짜리 토큰을 발급한다. */
  var token = '';
  var tokenExp = 0;
  function needToken() { return BASE === NAS_BASE; }
  function ensureToken(force) {
    if (!needToken()) return Promise.resolve('');
    var now = Math.floor(Date.now() / 1000);
    if (!force && token && tokenExp - 60 > now) return Promise.resolve(token);
    return D.api('studio_token').then(function (r) {
      if (r && r.ok && r.token) { token = r.token; tokenExp = r.exp || 0; }
      else { token = ''; tokenExp = 0; }
      return token;
    }).catch(function () { token = ''; return ''; });
  }
  function withToken(init) {
    var out = init ? Object.assign({}, init) : {};
    out.headers = Object.assign({}, init && init.headers);
    if (token) out.headers['x-studio-token'] = token;
    return out;
  }

  /* ── 브리지 ── */
  function url(path) { return BASE.replace(/\/+$/, '') + path; }

  /** 후보 하나가 살아 있는지 짧게 물어본다. */
  function ping(base) {
    var ac = new AbortController();
    var timer = setTimeout(function () { ac.abort(); }, 3500);
    return fetch(base.replace(/\/+$/, '') + '/api/health', { signal: ac.signal })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { return !!(j && j.ok); })
      .catch(function () { return false; })
      .finally(function () { clearTimeout(timer); });
  }

  function probe() {
    return ping(LOCAL_BASE).then(function (ok) {
      BASE = LOCAL_BASE;
      return { state: ok ? 'on' : 'off', where: ok ? 'local' : '' };
    });
  }

  function callJson(path, init) {
    return ensureToken(false).then(function () {
      return fetch(url(path), withToken(init)).then(function (res) {
        // 토큰이 만료됐으면 한 번만 새로 받아 재시도한다.
        if (res.status === 401 && needToken()) {
          return ensureToken(true).then(function (t) {
            if (!t) throw new Error('두온 스튜디오에 로그인한 뒤 이용할 수 있습니다.');
            return fetch(url(path), withToken(init)).then(readJson);
          });
        }
        return readJson(res);
      });
    });
  }
  function readJson(res) {
    return res.text().then(function (text) {
      var body = null;
      try { body = text ? JSON.parse(text) : null; } catch (e) { body = null; }
      if (!res.ok) throw new Error((body && body.error) || '요청이 실패했습니다 (HTTP ' + res.status + ')');
      return body;
    });
  }
  function postJson(path, data) {
    return callJson(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(data)
    });
  }

  /* ── 상태 표시 ── */
  var GUIDE_ON = '로컬 스튜디오에 연결되었습니다';
  var GUIDE_OFF = '스튜디오 서버에 연결되지 않았습니다. 잠시 후 다시 확인을 눌러 주세요.';
  var GUIDE_NAS = '두온 스튜디오 서버에 연결되었습니다';
  var GUIDE_LOCAL = '내 컴퓨터의 로컬 스튜디오에 연결되었습니다';
  var GUIDE_LOGIN = '두온 스튜디오 서버에 연결되었습니다. 로그인하시면 바로 만들 수 있습니다.';

  /** where: 'nas' | 'local' | '' */
  function paint(state, where) {
    var on = state === 'on';
    var needLogin = on && where === 'nas' && !token;
    var text = !on ? GUIDE_OFF : needLogin ? GUIDE_LOGIN : (where === 'local' ? GUIDE_LOCAL : GUIDE_NAS);

    [['#mState', '#mStateText'], ['#aState', '#aStateText']].forEach(function (pair) {
      var box = D.$(pair[0]);
      var txt = D.$(pair[1]);
      if (!box || !txt) return;
      box.className = 'link-state ' + (on && !needLogin ? 'on' : 'off');
      txt.textContent = text;
    });

    ['#mRetry', '#aRetry'].forEach(function (sel) {
      var r = D.$(sel);
      if (r) r.hidden = on && !needLogin;
    });

    linked = on && !needLogin;
    [['#sSubmit', '#sSubmitLabel', '숏폼 만들기'], ['#aSubmit', '#aSubmitLabel', '오디오북 만들기']].forEach(function (t) {
      var btn = D.$(t[0]), lbl = D.$(t[1]);
      if (!btn || !lbl) return;
      if (!linked) {
        btn.disabled = true;
        lbl.textContent = needLogin ? '로그인 후 이용할 수 있습니다' : '스튜디오 연결이 필요합니다';
      } else if (t[0] === '#aSubmit') {
        btn.disabled = !uploads.book;
        lbl.textContent = uploads.book ? '오디오북 만들기' : 'EPUB 을 올려 주세요';
      } else {
        btn.disabled = false;
        lbl.textContent = t[2];
      }
    });

    if (needLogin) showLoginHelp();
    else if (!on) showHelp();
    else clearHelp(); // 로그인·연결이 풀렸다 다시 붙으면 안내문을 치운다
  }

  function clearHelp() {
    ['#sResult', '#aResult'].forEach(function (sel) {
      var box = D.$(sel);
      if (!box || box.dataset.help !== '1') return;
      delete box.dataset.help;
      box.innerHTML = sel === '#sResult' ? '<div class="empty">아직 만든 영상이 없습니다</div>' : '';
    });
  }

  /** NAS 스튜디오는 붙었는데 로그인만 안 된 상태. 실행 방법이 아니라 로그인을 안내해야 한다. */
  function showLoginHelp() {
    ['#sResult', '#aResult'].forEach(function (sel) {
      var box = D.$(sel);
      if (!box) return;
      box.dataset.help = '1';
      box.innerHTML =
        '<div class="empty" style="text-align:left;line-height:1.9">' +
        '<b style="display:block;margin-bottom:8px;color:var(--deck-ink)">회원 전용 기능입니다</b>' +
        '영상·낭독 만들기는 서버 자원을 쓰기 때문에 로그인한 회원만 이용할 수 있습니다.<br>' +
        '<button class="btn ghost sm" data-go="account" style="margin-top:10px">로그인하러 가기</button>' +
        '</div>';
    });
  }

  /* 꺼져 있을 때 실행 방법을 알려 준다. 안내가 없으면 이용자는 고장으로 받아들인다.
     숏폼·오디오북 두 탭 모두에 같은 안내를 띄운다.
     예전에는 숏폼 결과칸에만 넣어서, 오디오북 탭에서는 안내 없이 실패 문구만 보였다. */
  function showHelp() {
    ['#sResult', '#aResult'].forEach(function (sel) {
      var box = D.$(sel);
      if (!box || box.dataset.help === '1') return;
      box.dataset.help = '1';
      box.innerHTML =
        '<div class="empty" style="text-align:left;line-height:1.9">' +
        '<b style="display:block;margin-bottom:8px;color:var(--deck-ink)">스튜디오 서버에 연결되지 않았습니다</b>' +
        '잠시 뒤 [다시 확인]을 눌러 주세요. 내 컴퓨터에서 직접 돌리려면:<br>' +
        '1. 명령 프롬프트(또는 PowerShell)를 엽니다<br>' +
        '2. <code style="font-family:var(--mono)">cd C:\\Users\\내계정\\projects\\pdbook-mvp</code><br>' +
        '3. <code style="font-family:var(--mono)">npm start</code><br>' +
        '4. <code style="font-family:var(--mono)">http://localhost:4700</code> 이 열리면 이 페이지로 돌아와 [다시 확인]<br>' +
        '<span style="display:block;margin-top:10px;font-size:.9em">' +
        '실행 중인데도 연결되지 않는다면, 브라우저가 사설망(내 컴퓨터) 접근을 막은 경우입니다. ' +
        '주소창 옆 자물쇠 아이콘에서 이 사이트의 사설망 접근을 허용하거나, ' +
        '<code style="font-family:var(--mono)">http://localhost:4700</code> 을 직접 열어 사용하세요.</span>' +
        '</div>';
    });
  }

  /* 로그인 직후에는 토큰을 새로 받아야 하므로 곧바로 다시 확인한다.
     이게 없으면 로그인하고도 [다시 확인] 을 눌러야 해서 고장처럼 보인다. */
  document.addEventListener('duon:auth', function () {
    token = ''; tokenExp = 0;
    refresh();
  });

  function refresh() {
    paintWaiting();
    return probe().then(function (r) {
      paint(r.state, r.where);
      if (r.state === 'on') loadOptions();
      return r.state;
    });
  }
  function paintWaiting() {
    [['#mState', '#mStateText'], ['#aState', '#aStateText']].forEach(function (pair) {
      var box = D.$(pair[0]), txt = D.$(pair[1]);
      if (box) box.className = 'link-state wait';
      if (txt) txt.textContent = '로컬 스튜디오를 찾는 중입니다';
    });
  }

  /* ── 옵션(음성·템플릿) ── */
  function loadOptions() {
    if (options) return Promise.resolve(options);
    return callJson('/api/options').then(function (o) {
      options = o;
      [D.$('#sVoice'), D.$('#aVoice')].forEach(function (sel) {
        if (!sel || sel.options.length) return;
        o.voices.forEach(function (v) {
          var opt = document.createElement('option');
          opt.value = v.id; opt.textContent = v.label;
          if (v.id === o.defaultVoice) opt.selected = true;
          sel.appendChild(opt);
        });
      });
      var tpl = D.$('#sTemplate');
      if (tpl && tpl.options.length <= 1) {
        o.templates.forEach(function (t) {
          var opt = document.createElement('option');
          opt.value = t.id; opt.textContent = t.label;
          tpl.appendChild(opt);
        });
      }
      return o;
    }).catch(function () { return null; });
  }

  /* ── 업로드 ── */
  function wireDrop(dropId, inputId, infoId, kind, after) {
    var drop = D.$(dropId), input = D.$(inputId);
    if (!drop || !input) return;

    ['dragenter', 'dragover'].forEach(function (ev) {
      drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('over'); });
    });
    ['dragleave', 'drop'].forEach(function (ev) {
      drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('over'); });
    });
    drop.addEventListener('drop', function (e) {
      var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) send(f);
    });
    input.addEventListener('change', function () {
      if (input.files && input.files[0]) send(f_(input.files[0]));
    });
    function f_(f) { return f; }

    function send(file) {
      if (!linked) { D.toast('로컬 스튜디오에 먼저 연결해 주세요'); return; }
      var info = D.$(infoId);
      info.innerHTML = '<div class="list"><li>읽는 중입니다: ' + D.esc(file.name) + '</li></div>';

      callJson('/api/uploads?name=' + encodeURIComponent(file.name), {
        method: 'POST',
        headers: { 'content-type': 'application/octet-stream' },
        body: file
      }).then(function (r) {
        uploads[kind] = r;
        var meta = r.format.toUpperCase() + ' · ' + D.comma(r.chars) + '자' +
          (r.chapters ? ' · 챕터 ' + r.chapters.length + '개' : '');
        info.innerHTML = '<ul class="list"><li><div class="top"><b>' + D.esc(r.fileName) + '</b>' +
          '<span>' + D.esc(meta) + '</span></div>' +
          (r.title ? '<div style="font-size:12.5px;color:var(--deck-ink-2);margin-top:4px">제목: ' + D.esc(r.title) + '</div>' : '') +
          '</li></ul>';
        if (after) after(r);
      }).catch(function (err) {
        uploads[kind] = null;
        info.innerHTML = '<div class="err">' + D.esc(err.message) + '</div>';
        if (after) after(null);
      });
    }
  }

  /* ── 진행 표시 ── */
  function setProgress(prefix, text, percent) {
    var st = D.$('#' + prefix + 'Status');
    if (st) st.textContent = text;
    if (typeof percent === 'number') {
      var bar = D.$('#' + prefix + 'Bar');
      var pct = D.$('#' + prefix + 'Pct');
      if (bar) bar.style.width = percent + '%';
      if (pct) pct.textContent = percent + '%';
    }
  }
  function showErr(id, msg) {
    var box = D.$(id);
    if (!box) return;
    box.innerHTML = msg ? '<div class="err">' + D.esc(msg) + '</div>' : '';
  }
  function poll(jobId, prefix, done) {
    var timer = setInterval(function () {
      callJson('/api/jobs/' + jobId).then(function (job) {
        if (job.status === 'done') {
          clearInterval(timer);
          setProgress(prefix, '완성되었습니다', 100);
          done(job);
        } else if (job.status === 'failed') {
          clearInterval(timer);
          setProgress(prefix, '실패했습니다', job.progress || 0);
          showErr('#' + prefix + 'Err', job.error || '알 수 없는 오류입니다.');
          done(null);
        } else {
          setProgress(prefix, job.message, job.progress);
        }
      }).catch(function () { /* 일시적 오류는 다음 폴링에서 회복된다 */ });
    }, 1300);
  }

  function dlLink(label, href, filename) {
    var a = D.el('a', 'btn ghost sm', label);
    a.href = url(href);
    a.download = filename;
    return a;
  }

  /* ══════════════════ 숏폼 ══════════════════ */
  (function shorts() {
    var form = D.$('#shortsForm');
    if (!form) return;

    D.$('#sSeconds').addEventListener('input', function () {
      D.$('#sSecLabel').textContent = D.$('#sSeconds').value + '초';
    });
    ['#mRetry', '#aRetry'].forEach(function (sel) {
      var r = D.$(sel);
      if (r) r.addEventListener('click', function () { refresh(); });
    });

    wireDrop('#sDrop', '#sFile', '#sFileInfo', 'shorts');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      showErr('#sErr', '');
      if (!linked) { D.toast('로컬 스튜디오에 먼저 연결해 주세요'); return; }

      var tpl = D.$('#sTemplate').value;
      var body = {
        text: D.$('#sText').value,
        url: D.$('#sUrl').value,
        uploadId: uploads.shorts ? uploads.shorts.uploadId : undefined,
        template: tpl === 'auto' ? 'classic' : tpl,
        autoTemplate: tpl === 'auto',
        aspect: D.$('#sWide').checked ? 'both' : 'vertical',
        voice: D.$('#sVoice').value,
        targetSeconds: Number(D.$('#sSeconds').value)
      };
      if (!body.text.trim() && !body.url.trim() && !body.uploadId) {
        showErr('#sErr', '텍스트, URL, 파일 중 하나는 넣어야 합니다.');
        return;
      }

      D.$('#sSubmit').disabled = true;
      D.$('#sSubmitLabel').textContent = '만드는 중입니다';
      setProgress('s', '작업을 등록하는 중입니다', 0);
      D.$('#sResult').innerHTML = '';
      D.$('#sResult').dataset.help = '';

      postJson('/api/jobs', body).then(function (job) {
        poll(job.id, 's', function (done) {
          D.$('#sSubmit').disabled = false;
          D.$('#sSubmitLabel').textContent = '숏폼 만들기';
          if (done) renderShort(done);
        });
      }).catch(function (err) {
        D.$('#sSubmit').disabled = false;
        D.$('#sSubmitLabel').textContent = '숏폼 만들기';
        setProgress('s', '실패했습니다', 0);
        showErr('#sErr', err.message);
      });
    });

    function renderShort(job) {
      var box = D.$('#sResult');
      box.innerHTML = '';

      var v = document.createElement('video');
      v.className = 'vertical'; v.src = url(job.videoUrl); v.controls = true; v.playsInline = true;
      box.appendChild(v);

      if (job.videoWideUrl) {
        var w = document.createElement('video');
        w.className = 'wide'; w.src = url(job.videoWideUrl); w.controls = true; w.playsInline = true;
        box.appendChild(w);
      }

      var ul = D.el('ul', 'list');
      function row(k, val) {
        var li = D.el('li');
        var top = D.el('div', 'top');
        top.appendChild(D.el('b', null, k));
        top.appendChild(D.el('span', null, val));
        li.appendChild(top);
        return li;
      }
      ul.appendChild(row('길이', D.fmtDur(job.duration)));
      ul.appendChild(row('연출', (job.chosenTemplate || '') + (job.templateReason ? ' · ' + job.templateReason : '')));
      if (job.script && job.script.hashtags && job.script.hashtags.length) {
        ul.appendChild(row('해시태그', job.script.hashtags.join(' ')));
      }
      box.appendChild(ul);

      var acts = D.el('div', 'btns');
      acts.style.marginTop = '14px';
      acts.appendChild(dlLink('세로 영상', job.videoUrl, 'video.mp4'));
      if (job.videoWideUrl) acts.appendChild(dlLink('가로 영상', job.videoWideUrl, 'video-wide.mp4'));
      if (job.srtUrl) acts.appendChild(dlLink('자막 SRT', job.srtUrl, 'captions.srt'));
      if (job.audioUrl) acts.appendChild(dlLink('음성 MP3', job.audioUrl, 'voice.mp3'));
      box.appendChild(acts);
    }
  })();

  /* ══════════════════ 오디오북 ══════════════════ */
  (function audiobook() {
    var form = D.$('#bookForm');
    if (!form) return;

    wireDrop('#aDrop', '#aFile', '#aFileInfo', 'book', function (r) {
      var ok = Boolean(r && r.chapters && r.chapters.length);
      var btn = D.$('#aSubmit'), lbl = D.$('#aSubmitLabel');
      btn.disabled = !ok || !linked;
      lbl.textContent = !linked ? '로컬 스튜디오 연결이 필요합니다'
        : ok ? '오디오북 만들기 (' + r.chapters.length + '장)'
        : (r ? '챕터가 있는 EPUB 이 필요합니다' : 'EPUB 을 올려 주세요');
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      showErr('#aErr', '');
      if (!uploads.book) { showErr('#aErr', 'EPUB 파일을 올려 주세요.'); return; }

      var body = { uploadId: uploads.book.uploadId, voice: D.$('#aVoice').value };
      var max = D.$('#aMax').value;
      if (max) body.maxChapters = Number(max);

      D.$('#aSubmit').disabled = true;
      D.$('#aSubmitLabel').textContent = '낭독하는 중입니다';
      setProgress('a', '작업을 등록하는 중입니다', 0);
      D.$('#aResult').innerHTML = '';

      postJson('/api/books', body).then(function (job) {
        poll(job.id, 'a', function (done) {
          D.$('#aSubmit').disabled = false;
          D.$('#aSubmitLabel').textContent = '오디오북 만들기';
          if (done) renderBook(done);
        });
      }).catch(function (err) {
        D.$('#aSubmit').disabled = false;
        D.$('#aSubmitLabel').textContent = '오디오북 만들기';
        setProgress('a', '실패했습니다', 0);
        showErr('#aErr', err.message);
      });
    });

    function renderBook(job) {
      var box = D.$('#aResult');
      box.innerHTML = '';
      var ab = job.audiobook;
      if (!ab) return;

      var head = D.el('ul', 'list');
      function row(k, v) {
        var li = D.el('li');
        var top = D.el('div', 'top');
        top.appendChild(D.el('b', null, k));
        top.appendChild(D.el('span', null, v));
        li.appendChild(top);
        return li;
      }
      head.appendChild(row('제목', ab.title));
      if (ab.author) head.appendChild(row('지은이', ab.author));
      head.appendChild(row('전체 길이', D.fmtDur(ab.totalDuration)));
      box.appendChild(head);

      if (ab.m4bUrl) {
        var acts = D.el('div', 'btns');
        acts.style.margin = '14px 0';
        acts.appendChild(dlLink('오디오북 M4B 내려받기', ab.m4bUrl, 'audiobook.m4b'));
        box.appendChild(acts);
      } else if (ab.m4bSkippedReason) {
        var note = D.el('div', 'err', '합본을 만들지 못했습니다: ' + ab.m4bSkippedReason +
          ' (챕터별 MP3 는 아래에서 받으실 수 있습니다)');
        box.appendChild(note);
      }

      var list = D.el('ul', 'list');
      ab.chapters.forEach(function (c) {
        var li = D.el('li');
        var top = D.el('div', 'top');
        top.appendChild(D.el('b', null, c.index + '. ' + c.title));
        top.appendChild(D.el('span', null, D.fmtDur(c.duration)));
        li.appendChild(top);

        var audio = document.createElement('audio');
        audio.controls = true; audio.preload = 'none'; audio.src = url(c.mp3Url);
        li.appendChild(audio);

        var acts2 = D.el('div', 'btns');
        acts2.style.marginTop = '8px';
        acts2.appendChild(dlLink('MP3', c.mp3Url, 'chapter' + c.index + '.mp3'));
        acts2.appendChild(dlLink('자막', c.srtUrl, 'chapter' + c.index + '.srt'));
        li.appendChild(acts2);

        list.appendChild(li);
      });
      box.appendChild(list);
    }
  })();

  /* 탭을 열 때마다 상태를 다시 본다. 그 사이 스튜디오를 켰을 수 있다. */
  D.onEnter('shorts', function () { if (!linked) refresh(); });
  D.onEnter('audiobook', function () { if (!linked) refresh(); });

  document.addEventListener('DOMContentLoaded', function () { refresh(); });
})();
