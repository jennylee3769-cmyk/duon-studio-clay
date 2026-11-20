/* ============================================================
   두온 스튜디오 - book.js
   AI 집필실 · 원고 제본소 · 표지 스튜디오 · 내 서재
   생성 로직(목차·표지·추천문구)은 studio.js(DUONBOOK_STUDIO)를 그대로 쓴다.
   저장 형식도 두온북과 동일하게 유지해 기존 서재가 그대로 열리게 한다.
   ============================================================ */
(function () {
  'use strict';

  var D = window.DUON;
  var S = window.DUONBOOK_STUDIO;
  if (!D || !S) return;

  var GENRES = ['자기계발', '에세이', '소설', '경제·경영', '실용·취미', '인문·교양', '시·산문', '동화·어린이', 'IT·기술'];
  var DEFAULT_ISBN = '979-11-000000-0-0';

  function fillGenres(sel, withPlaceholder) {
    if (!sel) return;
    sel.innerHTML = (withPlaceholder === false ? '' : '<option value="">장르를 선택하세요</option>') +
      GENRES.map(function (g) { return '<option value="' + g + '">' + g + '</option>'; }).join('');
  }

  /** 표지 스타일 라디오. 미리보기 카드 대신 이름표만 써서 폼이 길어지지 않게 한다. */
  function fillStyles(box, name, onPick) {
    if (!box) return;
    box.innerHTML = S.styles.map(function (s, i) {
      return '<label>' +
        '<input type="radio" name="' + name + '" value="' + D.esc(s.id) + '"' + (i === 0 ? ' checked' : '') + '>' +
        '<span>' + D.esc(s.nm) + '</span></label>';
    }).join('');
    box.addEventListener('change', function () { onPick(picked(box, name)); });
  }
  function picked(box, name) {
    var r = box.querySelector('input[name="' + name + '"]:checked');
    return r ? r.value : S.styles[0].id;
  }

  function todayISO() { return new Date().toISOString().slice(0, 10); }

  function saveBook(rec) {
    var books = D.store.get('books', []);
    books.unshift(rec);
    D.store.set('books', books);
    D.api('log_book', {
      kind: rec.type, title: rec.title, genre: rec.genre,
      author: rec.author, chapters: rec.chapters
    });
  }

  /* ══════════════════ AI 집필실 ══════════════════ */
  (function createStudio() {
    var form = D.$('#createForm');
    if (!form) return;

    var $t = D.$('#cTitle'), $kw = D.$('#cKeywords'), $g = D.$('#cGenre'), $tone = D.$('#cTone');
    var $ch = D.$('#cChapters'), $len = D.$('#cLength'), $author = D.$('#cAuthor'), $pub = D.$('#cPub');
    var $isbn = D.$('#cIsbn'), $date = D.$('#cDate'), $price = D.$('#cPrice');
    var $custom = D.$('#cTocCustom'), $tocList = D.$('#cTocList'), $tocTools = D.$('#cTocTools');
    var style = S.styles[0].id;

    fillGenres($g);
    fillStyles(D.$('#cStyles'), 'cStyle', function (v) { style = v; sync(); });
    $date.value = todayISO();

    function sync() {
      D.$('#cPreview').innerHTML = S.renderCover({
        style: style,
        title: $t.value.trim() || '제목을 입력하면 표지가 바뀝니다',
        author: $author.value.trim() || '작가 이름',
        publisher: $pub.value.trim() || '출판사',
        genre: $g.value || 'DUONBOOK'
      });
      D.$('#cChapLabel').textContent = $ch.value + '챕터';
      D.$('#cKwCount').textContent = D.comma($kw.value.length) + ' / 6,000자';
    }
    ['input', 'change'].forEach(function (ev) {
      [$t, $author, $pub, $g, $ch, $kw].forEach(function (n) { n.addEventListener(ev, sync); });
    });

    /* 목차 직접 설계 */
    function renderTocRows() {
      var n = parseInt($ch.value, 10);
      var old = D.$$('input', $tocList).map(function (i) { return i.value; });
      $tocList.innerHTML = '';
      for (var i = 0; i < n; i++) {
        var row = D.el('div');
        row.style.cssText = 'display:flex;gap:9px;align-items:center';
        var no = D.el('span', null, String(i + 1));
        no.style.cssText = 'width:26px;flex-shrink:0;font:700 12px/1 var(--mono);color:var(--ink-3);text-align:right';
        var inp = D.el('input');
        inp.type = 'text';
        inp.placeholder = (i + 1) + '챕터 제목';
        inp.value = old[i] || '';
        inp.setAttribute('aria-label', (i + 1) + '챕터 제목');
        row.appendChild(no); row.appendChild(inp);
        $tocList.appendChild(row);
      }
    }
    $custom.addEventListener('change', function () {
      $tocList.hidden = !$custom.checked;
      $tocTools.hidden = !$custom.checked;
      if ($custom.checked) renderTocRows();
    });
    $ch.addEventListener('input', function () { if ($custom.checked) renderTocRows(); });

    D.$('#cTocAI').addEventListener('click', function () {
      var titles = S.genToc({ genre: $g.value, keywords: $kw.value || $t.value, chapters: +$ch.value });
      renderTocRows();
      D.$$('input', $tocList).forEach(function (inp, i) { inp.value = titles[i] || ''; });
      D.toast('AI 목차 초안을 채웠습니다. 자유롭게 다듬어 주세요');
    });

    function currentToc() {
      if ($custom.checked) {
        var manual = D.$$('input', $tocList).map(function (i) { return i.value.trim(); }).filter(Boolean);
        if (manual.length) return manual;
      }
      return S.genToc({ genre: $g.value, keywords: $kw.value, chapters: +$ch.value });
    }

    var lastToc = [];
    function showToc(toc) {
      lastToc = toc;
      D.$('#cTocOut').textContent = toc.map(function (t, i) { return (i + 1) + '. ' + t; }).join('\n');
      D.$('#cActions').hidden = false;
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!$t.value.trim()) { D.toast('책 제목을 입력해 주세요'); $t.focus(); return; }
      if (!$kw.value.trim()) { D.toast('키워드를 입력해 주세요'); $kw.focus(); return; }
      if (!$g.value) { D.toast('장르를 선택해 주세요'); $g.focus(); return; }
      if (!$author.value.trim()) { D.toast('작가 이름을 입력해 주세요'); $author.focus(); return; }
      if (!$pub.value.trim()) { D.toast('출판사명을 입력해 주세요'); $pub.focus(); return; }
      if (!$price.value) { D.toast('정가를 입력해 주세요'); $price.focus(); return; }

      var toc = currentToc();
      showToc(toc);

      saveBook({
        id: 'bk' + Date.now(),
        toc: toc,
        title: $t.value.trim(),
        author: $author.value.trim(),
        publisher: $pub.value.trim(),
        genre: $g.value,
        tone: $tone.value,
        chapters: +$ch.value,
        length: $len.value,
        cover: style,
        chapterStyle: '없음',
        isbn: $isbn.value.trim() || DEFAULT_ISBN,
        price: +$price.value || 0,
        pubDate: $date.value || todayISO(),
        type: 'ai',
        status: 'done',
        createdAt: Date.now()
      });
      D.toast('서재에 담았습니다');
    });

    D.$('#cReset').addEventListener('click', function () {
      form.reset();
      $date.value = todayISO();
      $tocList.hidden = true; $tocTools.hidden = true;
      D.$('#cActions').hidden = true;
      D.$('#cTocOut').innerHTML = '<span style="color:var(--ink-3)">목차가 여기에 표시됩니다</span>';
      sync();
    });

    D.$('#cCopy').addEventListener('click', function () {
      D.copy(lastToc.map(function (t, i) { return (i + 1) + '. ' + t; }).join('\n'));
    });

    /* 목차를 숏폼 소스로 넘긴다. 탭 사이를 오갈 이유를 만들어 주는 연결 고리다. */
    D.$('#cToShorts').addEventListener('click', function () {
      var text = $t.value.trim() + '\n' + lastToc.join('. ') + '.';
      var box = D.$('#sText');
      if (box) box.value = text;
      D.show('shorts');
      D.toast('숏폼 스튜디오로 목차를 보냈습니다');
    });

    sync();
  })();

  /* ══════════════════ 원고 제본소 ══════════════════ */
  (function convertStudio() {
    var form = D.$('#convertForm');
    if (!form) return;

    var $body = D.$('#vBody'), $t = D.$('#vTitle'), $a = D.$('#vAuthor'), $p = D.$('#vPub');
    var $g = D.$('#vGenre'), $isbn = D.$('#vIsbn'), $date = D.$('#vDate'), $price = D.$('#vPrice'), $toc = D.$('#vToc');
    fillGenres($g);
    $date.value = todayISO();

    /** '## 제목' 줄을 장 구분으로 본다. 하나도 없으면 전체를 한 장으로 묶는다. */
    function parseChapters(raw) {
      var lines = String(raw || '').replace(/\r\n?/g, '\n').split('\n');
      var chapters = [];
      var cur = null;
      lines.forEach(function (line) {
        var m = line.match(/^\s*##\s+(.+?)\s*$/);
        if (m) {
          if (cur) chapters.push(cur);
          cur = { title: m[1], body: '' };
        } else if (cur) {
          cur.body += line + '\n';
        } else if (line.trim()) {
          cur = { title: '본문', body: line + '\n' };
        }
      });
      if (cur) chapters.push(cur);
      return chapters.map(function (c) { return { title: c.title, body: c.body.trim() }; });
    }

    var lastBook = null;

    D.$('#vFromCreate').addEventListener('click', function () {
      var books = D.store.get('books', []);
      var ai = books.filter(function (b) { return b.type === 'ai'; })[0];
      if (!ai) { D.toast('집필실에서 만든 책이 아직 없습니다'); return; }
      $t.value = ai.title; $a.value = ai.author; $p.value = ai.publisher || '';
      $g.value = ai.genre || ''; $isbn.value = ai.isbn || ''; $price.value = ai.price || '';
      $body.value = (ai.toc || []).map(function (t) { return '## ' + t + '\n\n(여기에 본문을 씁니다)\n'; }).join('\n');
      D.toast('집필실의 최근 책을 불러왔습니다');
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var chapters = parseChapters($body.value);
      if (!chapters.length) { D.toast('원고 본문을 넣어 주세요'); $body.focus(); return; }
      if (!$t.value.trim()) { D.toast('책 제목을 입력해 주세요'); $t.focus(); return; }
      if (!$a.value.trim()) { D.toast('작가 이름을 입력해 주세요'); $a.focus(); return; }

      var title = $t.value.trim(), author = $a.value.trim();
      var pub = $p.value.trim() || '두온북';
      var isbn = $isbn.value.trim() || DEFAULT_ISBN;
      var price = +$price.value || 0;
      var date = $date.value || todayISO();

      /* 조판 미리보기: 표제지 → 목차 → 본문 → 판권지 */
      var html = '';
      html += '<h3>' + D.esc(title) + '</h3>';
      html += '<p style="color:var(--ink-3)">' + D.esc(author) + ' 지음 · ' + D.esc(pub) + '</p>';
      if ($toc.checked) {
        html += '<h3>목차</h3>' + chapters.map(function (c, i) {
          return (i + 1) + '. ' + D.esc(c.title);
        }).join('\n') + '\n';
      }
      chapters.forEach(function (c, i) {
        html += '<h3>' + (i + 1) + '. ' + D.esc(c.title) + '</h3>' + D.esc(c.body) + '\n';
      });
      html += '<h3>판권</h3>' +
        D.esc(title) + '\n발행일 ' + D.esc(date) + '\n지은이 ' + D.esc(author) +
        '\n펴낸곳 ' + D.esc(pub) + '\nISBN ' + D.esc(isbn) +
        (price ? '\n정가 ' + D.comma(price) + '원' : '');

      D.$('#vOut').innerHTML = '<div class="out">' + html + '</div>';
      D.$('#vActions').hidden = false;

      lastBook = {
        id: 'bk' + Date.now(),
        title: title, author: author, publisher: pub,
        genre: $g.value,
        chapters: chapters.length,
        toc: chapters.map(function (c) { return c.title; }),
        manuscript: chapters.map(function (c) { return { title: c.title, body: c.body.slice(0, 50000) }; }),
        cover: 'cv-navy',
        isbn: isbn, price: price, pubDate: date,
        type: 'manual', status: 'done', createdAt: Date.now()
      };
      D.toast('제본했습니다. 서재에 담거나 인쇄하실 수 있습니다');
    });

    function plainText() {
      if (!lastBook) return '';
      var out = lastBook.title + '\n' + lastBook.author + ' 지음 · ' + lastBook.publisher + '\n\n';
      if ($toc.checked) {
        out += '목차\n' + lastBook.toc.map(function (t, i) { return (i + 1) + '. ' + t; }).join('\n') + '\n\n';
      }
      lastBook.manuscript.forEach(function (c, i) {
        out += (i + 1) + '. ' + c.title + '\n\n' + c.body + '\n\n';
      });
      out += '발행일 ' + lastBook.pubDate + '\nISBN ' + lastBook.isbn;
      return out;
    }

    D.$('#vCopy').addEventListener('click', function () { D.copy(plainText()); });
    D.$('#vDownload').addEventListener('click', function () {
      if (!lastBook) return;
      D.download(lastBook.title.replace(/[\\/:*?"<>|]/g, '_') + '.txt', plainText());
    });
    D.$('#vPrint').addEventListener('click', function () { window.print(); });
    D.$('#vSave').addEventListener('click', function () {
      if (!lastBook) return;
      saveBook(lastBook);
      D.toast('서재에 담았습니다');
    });
  })();

  /* ══════════════════ 표지 스튜디오 ══════════════════ */
  (function coverStudio() {
    var form = D.$('#coverForm');
    if (!form) return;

    var $t = D.$('#kTitle'), $g = D.$('#kGenre'), $kw = D.$('#kKeywords');
    var $a = D.$('#kAuthor'), $p = D.$('#kPub'), $dyn = D.$('#kDynamic');
    var style = S.styles[0].id;
    var seed = 0;

    fillGenres($g);
    fillStyles(D.$('#kStyles'), 'kStyle', function (v) { style = v; renderFields(); sync(); });

    /** 스타일이 쓰는 필드만 만든다. 조판 밖으로 나갈 값을 애초에 못 넣게 하는 방식이다. */
    function renderFields() {
      var st = S.styleOf(style);
      var prev = {};
      D.$$('input[data-k]', $dyn).forEach(function (i) { prev[i.dataset.k] = i.value; });

      $dyn.innerHTML = st.fields.map(function (f) {
        var def = S.fieldDefs[f.k];
        if (!def) return '';
        var id = 'kf_' + f.k;
        return '<div class="field">' +
          '<label for="' + id + '">' + D.esc(def.label) +
          ' <span style="color:var(--ink-3);font-weight:400">최대 ' + f.max + '자</span></label>' +
          '<input type="text" id="' + id + '" data-k="' + f.k + '" maxlength="' + f.max + '" placeholder="' + D.esc(def.ph) + '">' +
          '</div>';
      }).join('');

      D.$$('input[data-k]', $dyn).forEach(function (i) {
        if (prev[i.dataset.k]) i.value = prev[i.dataset.k].slice(0, +i.maxLength);
        i.addEventListener('input', sync);
      });
    }

    function collect() {
      var d = {
        style: style,
        title: $t.value.trim() || '제목을 입력해 주세요',
        author: $a.value.trim(),
        publisher: $p.value.trim() || '두온북',
        genre: $g.value || 'DUONBOOK'
      };
      D.$$('input[data-k]', $dyn).forEach(function (i) { if (i.value.trim()) d[i.dataset.k] = i.value.trim(); });
      return d;
    }
    function sync() { D.$('#kPreview').innerHTML = S.renderCover(collect()); }

    [$t, $g, $kw, $a, $p].forEach(function (n) { n.addEventListener('input', sync); });
    $g.addEventListener('change', sync);

    D.$('#kAuto').addEventListener('click', function () {
      seed += 1;
      var copy = S.autoCopy({ genre: $g.value, keywords: $kw.value || $t.value, seed: seed });
      var trimmed = S.trimToStyle(style, copy);
      D.$$('input[data-k]', $dyn).forEach(function (i) {
        if (trimmed[i.dataset.k]) i.value = trimmed[i.dataset.k];
      });
      sync();
      D.toast('추천 문구를 채웠습니다. 다시 누르면 다른 시안이 나옵니다');
    });

    D.$('#kSave').addEventListener('click', function () {
      if (!$t.value.trim()) { D.toast('책 제목을 입력해 주세요'); $t.focus(); return; }
      var d = collect();
      var item = {
        id: 'cv' + Date.now(),
        style: style,
        title: $t.value.trim(),
        author: d.author,
        publisher: d.publisher,
        genre: $g.value,
        createdAt: Date.now()
      };
      var trimmed = S.trimToStyle(style, d);
      Object.keys(trimmed).forEach(function (k) { item[k] = trimmed[k]; });

      var covers = D.store.get('covers', []);
      covers.unshift(item);
      D.store.set('covers', covers);
      D.api('log_book', { kind: 'cover', title: item.title, genre: item.genre, author: item.author, chapters: 0 });
      D.toast('표지 시안을 저장했습니다. 내 서재에서 확인하세요');
      renderSavedStrip();
    });

    function renderSavedStrip() {
      var box = D.$('#kSaved');
      var covers = D.store.get('covers', []).slice(0, 4);
      if (!covers.length) { box.innerHTML = ''; return; }
      box.innerHTML = '<h3 style="margin:22px 0 10px;font-size:14px">최근 시안</h3>' +
        '<div class="shelf" style="grid-template-columns:repeat(4,1fr)">' +
        covers.map(function (c) {
          return '<div><div class="cov-wrap">' + S.renderCover(c, { compact: true }) + '</div></div>';
        }).join('') + '</div>';
    }

    renderFields();
    sync();
    D.onEnter('cover', renderSavedStrip);
  })();

  /* ══════════════════ 내 서재 ══════════════════ */
  (function library() {
    var shelf = D.$('#bShelf');
    if (!shelf) return;

    function renderBooks() {
      var books = D.store.get('books', []);
      if (!books.length) {
        shelf.innerHTML = '<div class="empty">아직 보관함이 비어 있어요. 집필실이나 제본소에서 첫 책을 만들어 보세요.</div>';
        return;
      }
      shelf.innerHTML = '<div class="shelf">' + books.map(function (b) {
        return '<button class="shelf-item" data-id="' + D.esc(b.id) + '" type="button">' +
          '<div class="cov-wrap">' + S.renderCover({
            style: b.cover || 'cv-black', title: b.title, author: b.author,
            publisher: b.publisher, genre: b.genre
          }, { compact: true }) + '</div>' +
          '<h4>' + D.esc(b.title) + '</h4>' +
          '<p>' + D.esc(b.author || '') + ' · ' + (b.type === 'ai' ? '집필실' : '제본소') +
          ' · ' + D.fmtDate(b.createdAt) + '</p>' +
          '</button>';
      }).join('') + '</div>';
    }

    function renderCovers() {
      var box = D.$('#bCovers');
      var covers = D.store.get('covers', []);
      if (!covers.length) {
        box.innerHTML = '<div class="empty">저장한 표지 시안이 없습니다.</div>';
        return;
      }
      box.innerHTML = '<div class="shelf">' + covers.map(function (c) {
        return '<button class="shelf-item" data-cover-id="' + D.esc(c.id) + '" type="button">' +
          '<div class="cov-wrap">' + S.renderCover(c, { compact: true }) + '</div>' +
          '<h4>' + D.esc(c.title) + '</h4>' +
          '<p>' + D.esc(c.genre || '') + ' · ' + D.fmtDate(c.createdAt) + '</p>' +
          '</button>';
      }).join('') + '</div>';
    }

    /* 항목을 누르면 상세와 삭제. 모달을 따로 두지 않고 확인창으로 끝낸다. */
    shelf.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-id]');
      if (!btn) return;
      var books = D.store.get('books', []);
      var b = books.filter(function (x) { return x.id === btn.dataset.id; })[0];
      if (!b) return;
      var info = b.title + '\n' + (b.author || '') + ' 지음\n' +
        (b.genre || '') + ' · ' + (b.chapters || 0) + '챕터\n' +
        'ISBN ' + (b.isbn || '') + (b.price ? '\n정가 ' + D.comma(b.price) + '원' : '') +
        '\n\n확인을 누르면 이 책을 서재에서 지웁니다.';
      if (!confirm(info)) return;
      D.store.set('books', books.filter(function (x) { return x.id !== b.id; }));
      renderBooks();
      D.toast('서재에서 지웠습니다');
    });

    D.$('#bCovers').addEventListener('click', function (e) {
      var btn = e.target.closest('[data-cover-id]');
      if (!btn) return;
      if (!confirm('이 표지 시안을 지울까요?')) return;
      var covers = D.store.get('covers', []).filter(function (c) { return c.id !== btn.dataset.coverId; });
      D.store.set('covers', covers);
      renderCovers();
      D.toast('시안을 지웠습니다');
    });

    D.onEnter('books', function () { renderBooks(); renderCovers(); });
  })();
})();
