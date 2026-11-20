# 구조 분석 기록

이 문서는 v1 분석 기록을 보존한 사본입니다. v2는 별도 `assets/css/clay.css`와 `assets/clay-hero.png`로 시각 디자인을 변경했습니다.

대상: `https://duonedu.net/edu/duon-studio/`  
도구: morluto/rea의 `capture_browser_scenario`  
관찰일: 2026-11-20

## 관찰한 구조

| 영역 | 구조 및 동작 |
| --- | --- |
| 라우팅 | `#home`, `#create` 등 해시를 이용한 단일 HTML 페이지. `role=tablist`와 12개 탭, 대응 `tabpanel` 구성 |
| 홈 | 히어로 문구, 6개 도구 타일, 기능 수치 4개 |
| 집필 | 제목, 키워드, 9개 장르, 문체, 챕터 수, 9개 표지 스타일, 서지 정보를 받아 목차/표지 초안을 만듦 |
| 제본 | 원고 텍스트와 서지 정보를 표제지·판권지·목차와 조합하고 인쇄/PDF 및 txt 내려받기 제공 |
| 표지/서재 | 표지 스타일과 추천 문구 입력, 시안 저장. 책과 시안은 `localStorage`의 `duonbook_` 접두사에 저장 |
| 숏폼/오디오북 | 공개 프런트엔드가 별도 PDBOOK API의 상태를 조회하고 업로드/작업 API를 사용 |
| 계정/공지 | `api.php`에 POST하는 비공개 PHP 서비스 의존 |

## 근거 및 한계

- REA 캡처 Evidence ID: `ev_a4ba667e8fd18b078161eb6d52e3a4940cd2f9835819ada65e07d5d151abfdd1`(화면 포함), `ev_2e579695439920343fc8b2a53ba3803a2054fd1b0c5f34fc385feff8f5a83cb0`(DOM/접근성).
- 공개 정적 파일은 `../reference_capture/`에 다운로드해 보존했습니다. 클론의 프런트엔드 파일은 이 자원을 바탕으로 하며, 서버 호출만 로컬 검토에 맞게 분리했습니다.
- 비공개 `api.php`, 서버 데이터베이스, PDBOOK 렌더러는 관찰 범위에 없었습니다. REA의 브라우저 관찰로 서버 구현이나 과거 이용 기록을 확인할 수 없습니다.
