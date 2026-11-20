/* ============================================================
   두온북 크리에이터 - studio.js
   표지 스타일 정의(단일 소스) · 공유 표지 렌더러 · AI 추천 문구 · 목차 초안
   원칙: 스타일별 필드·글자수는 키 기반 객체로 선언한다 (병렬 배열 금지)
   ============================================================ */
(function () {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* ── 필드 사전 (라벨·타입·기본 글자수) ── */
  var FIELD_DEFS = {
    subtitle:   { label: '부제목',        ph: '제목을 보조하는 한 줄',            max: 28 },
    badge:      { label: '원형 배지 문구', ph: '예) 화제의 신간',                  max: 12 },
    band1:      { label: '띠지 헤드 카피', ph: '띠지에 크게 들어갈 문구',          max: 20 },
    band2:      { label: '띠지 서브 카피', ph: '헤드 카피를 잇는 설명 문구',        max: 34 },
    review1:    { label: '추천사 1',      ph: '짧은 추천 문장',                   max: 22 },
    review1_by: { label: '추천인 1',      ph: '김**',                            max: 6 },
    review2:    { label: '추천사 2',      ph: '짧은 추천 문장',                   max: 22 },
    review2_by: { label: '추천인 2',      ph: '이**',                            max: 6 }
  };

  /* ── 표지 스타일 9종: 스타일마다 쓰는 필드와 글자수가 다르다 ── */
  var STYLES = [
    { id: 'cv-black', nm: '블랙',
      fields: [{ k: 'subtitle', max: 28 }] },
    { id: 'cv-black cv-band-paper', nm: '블랙 · 크림 띠지',
      fields: [{ k: 'subtitle', max: 26 }, { k: 'band1', max: 20 }, { k: 'band2', max: 32 },
               { k: 'review1', max: 20 }, { k: 'review1_by', max: 6 },
               { k: 'review2', max: 20 }, { k: 'review2_by', max: 6 }] },
    { id: 'cv-black cv-band-gold', nm: '블랙 · 금박 띠지',
      fields: [{ k: 'subtitle', max: 26 }, { k: 'band1', max: 20 }, { k: 'band2', max: 32 }] },
    { id: 'cv-ivory', nm: '아이보리',
      fields: [{ k: 'subtitle', max: 28 }, { k: 'badge', max: 12 }] },
    { id: 'cv-ivory cv-band-gold', nm: '아이보리 · 금박 띠지',
      fields: [{ k: 'subtitle', max: 24 }, { k: 'band1', max: 20 },
               { k: 'review1', max: 20 }, { k: 'review1_by', max: 6 }] },
    { id: 'cv-emerald', nm: '에메랄드',
      fields: [{ k: 'subtitle', max: 30 }] },
    { id: 'cv-goldfoil', nm: '골드 포일',
      fields: [{ k: 'subtitle', max: 24 }, { k: 'badge', max: 12 }] },
    { id: 'cv-navy', nm: '딥 네이비',
      fields: [{ k: 'subtitle', max: 30 }] },
    { id: 'cv-terra', nm: '테라코타',
      fields: [{ k: 'badge', max: 14 }] }
  ];

  function styleOf(id) {
    for (var i = 0; i < STYLES.length; i++) if (STYLES[i].id === id) return STYLES[i];
    return STYLES[0];
  }

  /* ── 공유 표지 렌더러 ──
     d: { style, title|titleHtml, author, publisher, genre,
          subtitle, badge, band1, band2, review1, review1_by, review2, review2_by }
     opts: { compact: true → 작은 카드용 (추천사 생략) }                       */
  function renderCover(d, opts) {
    opts = opts || {};
    var style = d.style || 'cv-black';
    var hasBand = style.indexOf('band') > -1;

    var badge = d.badge ? '<span class="bc-badge">' + esc(d.badge) + '</span>' : '';
    var sub = d.subtitle ? '<span class="bc-sub">' + esc(d.subtitle) + '</span>' : '';

    var band = '';
    if (hasBand) {
      var lines = [];
      if (d.band1) lines.push('<span class="band-head">' + esc(d.band1) + '</span>');
      if (d.band2) lines.push('<span class="band-sub">' + esc(d.band2) + '</span>');
      if (!opts.compact) {
        if (d.review1) lines.push('<span class="band-review">“' + esc(d.review1) + '” - ' + esc(d.review1_by || '독자') + '</span>');
        if (d.review2) lines.push('<span class="band-review">“' + esc(d.review2) + '” - ' + esc(d.review2_by || '독자') + '</span>');
      }
      if (!lines.length) lines.push('<span class="band-head">' + esc(d.bandFallback || '독자의 마음을 여는 한 줄') + '</span>');
      band = '<div class="bc-band">' + lines.join('') + '</div>';
    }

    return '<div class="bookcov ' + esc(style) + '">' + badge +
      '<div class="bc-inner">' +
      '<span class="bc-top">' + esc(d.genre || 'DUONBOOK') + '</span>' +
      '<span class="bc-title">' + (d.titleHtml || esc(d.title || '')) + '</span>' + sub +
      '<span class="bc-author">' + (d.author ? esc(d.author) + ' 지음' : '') + '</span>' +
      '<span class="bc-pub">' + esc(d.publisher || '') + '</span>' +
      '</div>' + band + '</div>';
  }

  /* ── AI 추천 문구 (시뮬레이션: 장르·키워드 기반 템플릿, seed로 시안별 변주) ── */
  var COPY = {
    '자기계발': {
      sub: ['오늘부터 달라지는 나를 위한 안내서', '작은 습관이 만드는 가장 큰 변화', '흔들리는 날에도 나아가는 법'],
      band1: ['출간 전부터 화제의 책', '읽는 순간 내일이 가벼워진다', '변화는 이 책에서 시작된다'],
      band2: ['{kw} 앞에서 머뭇거리는 당신에게', '미루기만 했던 결심을 행동으로 바꾸는 문장들', '하루 10분, 삶의 방향이 달라진다'],
      review: ['올해 읽은 책 중 최고였어요', '실천할 수 있어 좋았습니다', '선물하고 싶은 책입니다']
    },
    '에세이': {
      sub: ['평범한 하루를 오래 붙잡아 두는 글', '지친 마음을 데우는 조용한 문장들', '당신의 계절에 건네는 편지'],
      band1: ['마음이 머무는 에세이', '읽고 나면 밤이 짧아진다', '올해의 위로가 도착했다'],
      band2: ['{kw}의 순간들을 담담하게 눌러 담았다', '바쁜 하루 끝, 나를 돌보는 시간', '괜찮지 않아도 괜찮다고 말해주는 책'],
      review: ['문장마다 밑줄을 그었어요', '내 이야기 같아 울컥했습니다', '머리맡에 두고 읽는 책']
    },
    '소설': {
      sub: ['끝내 잊히지 않을 하나의 이야기', '마지막 장을 덮을 수 없는 소설', '우리 모두의 어떤 밤에 관하여'],
      band1: ['압도적 몰입의 서사', '첫 문장부터 빨려든다', '올해 가장 기다려온 신작'],
      band2: ['{kw}에서 시작된 운명의 이야기', '한 번 펼치면 밤을 새우게 되는 소설', '독자들이 먼저 알아본 작품'],
      review: ['숨도 못 쉬고 읽었습니다', '결말에서 한참을 멈췄어요', '인생 소설이 생겼습니다']
    },
    '경제·경영': {
      sub: ['불확실한 시대의 가장 확실한 전략', '숫자 너머를 읽는 사람의 생각법', '내 돈을 지키는 최소한의 원칙'],
      band1: ['실전에서 검증된 인사이트', '경영 현장의 진짜 이야기', '돈의 흐름이 보이기 시작한다'],
      band2: ['{kw} 시대에 살아남는 법을 담았다', '이론이 아니라 내일 아침 써먹는 전략', '작은 회사에도 통하는 성장 공식'],
      review: ['바로 적용해 효과를 봤어요', '팀 전체가 돌려 읽었습니다', '군더더기 없는 실전서']
    },
    '시·산문': {
      sub: ['밤의 가장자리에서 주운 문장들', '짧지만 오래 남는 말들', '당신에게 보내는 계절의 행간'],
      band1: ['마음에 꽂히는 시집', '필사하고 싶은 문장들', '조용히 스며드는 언어'],
      band2: ['{kw}을 닮은 마흔네 편의 기록', '소리 내어 읽으면 더 좋은 시', '하루 한 편, 마음의 온도를 올린다'],
      review: ['필사 노트가 가득 찼어요', '읽을 때마다 새롭습니다', '선물용으로 최고예요']
    },
    'default': {
      sub: ['처음 읽는 사람을 위한 친절한 안내', '알수록 빠져드는 이야기', '한 권으로 정리하는 핵심'],
      band1: ['믿고 보는 화제의 신간', '지금 가장 주목받는 책', '독자가 먼저 찾은 책'],
      band2: ['{kw}이 궁금한 당신을 위한 한 권', '입문부터 심화까지 한 걸음씩', '어렵던 이야기가 쉬워진다'],
      review: ['설명이 정말 쉬워요', '기대 이상이었습니다', '주변에 추천하고 있어요']
    }
  };
  var BADGES = ['화제의 신간', '에디터 추천', '기대작 1위', '독자 추천'];
  var BYS = ['김**', '이**', '박**', '정**', '최**'];

  function firstKeyword(keywords) {
    var t = String(keywords || '').split(/[,\n.·]/)[0].trim();
    if (t.length > 12) t = t.slice(0, 12);
    return t || '당신의 이야기';
  }
  function pick(arr, n) { return arr[((n % arr.length) + arr.length) % arr.length]; }

  function autoCopy(input) {
    var pool = COPY[input.genre] || COPY['default'];
    var s = input.seed || 0;
    var kw = firstKeyword(input.keywords);
    return {
      subtitle:   pick(pool.sub, s),
      badge:      pick(BADGES, s),
      band1:      pick(pool.band1, s),
      band2:      pick(pool.band2, s + 1).replace('{kw}', kw),
      review1:    pick(pool.review, s),
      review1_by: pick(BYS, s),
      review2:    pick(pool.review, s + 1),
      review2_by: pick(BYS, s + 2)
    };
  }

  /* 시안 저장 시 스타일 필드 밖의 값은 버린다 (조판 밖 텍스트 방지) */
  function trimToStyle(styleId, data) {
    var st = styleOf(styleId);
    var out = {};
    for (var i = 0; i < st.fields.length; i++) {
      var f = st.fields[i];
      var v = String(data[f.k] || '').slice(0, f.max);
      if (v) out[f.k] = v;
    }
    return out;
  }

  /* ── 목차 초안 (시뮬레이션) ── */
  var TOC = {
    '자기계발': ['왜 지금 {kw}인가', '나를 아는 일부터 시작한다', '작게 시작하는 기술', '습관의 뼈대를 세운다', '무너지는 날의 회복법', '주변을 내 편으로 만드는 법', '성장을 기록하는 습관', '다음 계단 앞에서'],
    '에세이': ['어떤 아침의 기록', '{kw}에 대하여', '조금 서툴러도 괜찮은 날', '혼자의 시간에 배운 것', '우리를 견디게 하는 것들', '계절이 지나가는 자리', '잊지 않으려고 쓴 문장', '내일의 나에게'],
    '소설': ['시작되는 밤', '{kw}의 그림자', '엇갈린 마음', '숨겨진 진실', '되돌릴 수 없는 선택', '폭풍 속으로', '마주 서는 사람들', '그리고 남은 이야기'],
    '경제·경영': ['{kw}의 판이 바뀌고 있다', '기본기: 흐름을 읽는 눈', '작게 시작해 크게 검증한다', '고객이 말하지 않는 진심', '숫자로 관리하는 하루', '위기에서 기회를 보는 법', '함께 성장하는 팀 만들기', '지속 가능한 성장 설계'],
    '시·산문': ['봄, 시작의 말들', '여름, 무성한 마음', '{kw}의 행간', '가을, 내려놓는 연습', '겨울, 견디는 온도', '다시 봄을 기다리며'],
    'default': ['{kw}, 왜 알아야 할까', '기초를 단단히 다지기', '핵심 개념 한눈에 보기', '실전에서 부딪히는 문제들', '한 걸음 더: 심화 이야기', '자주 하는 실수와 해법', '현장의 사례에서 배운다', '앞으로의 전망']
  };

  function genToc(input) {
    var pool = TOC[input.genre] || TOC['default'];
    var kw = firstKeyword(input.keywords);
    var n = Math.max(1, Math.min(20, input.chapters || 8));
    var out = [];
    for (var i = 0; i < n; i++) {
      var t = pool[i % pool.length].replace('{kw}', kw);
      if (i >= pool.length) t = t + ' ' + (Math.floor(i / pool.length) + 1);
      out.push(t);
    }
    return out;
  }

  window.DUONBOOK_STUDIO = {
    styles: STYLES,
    fieldDefs: FIELD_DEFS,
    styleOf: styleOf,
    renderCover: renderCover,
    autoCopy: autoCopy,
    trimToStyle: trimToStyle,
    genToc: genToc
  };
})();
