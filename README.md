# 두온 스튜디오 클레이모피즘 클론 v2

2026-11-20에 만든 로컬 클론 v1에 클레이모피즘 디자인을 입힌 별도 버전입니다. 원본 캡처는 상위 폴더의 `reference_capture/`, 이전 클론은 `duon_studio_clone_v1/`에 보존했습니다.

## 공개 배포

- 사이트: https://duon-studio-clay.vercel.app/
- GitHub: https://github.com/jennylee3769-cmyk/duon-studio-clay
- Vercel 프로젝트는 위 GitHub 저장소에 연결되어 있습니다.
- 이 사이트는 복제 디자인 데모이며 비공개 계정 서버와 영상 렌더 서버는 포함하지 않습니다.

## 실행

PowerShell에서 이 폴더로 이동한 뒤:

```powershell
python -m http.server 8766 --bind 127.0.0.1
```

브라우저에서 `http://127.0.0.1:8766/`를 엽니다. Python이 없다면 정적 파일 서버로 이 폴더를 제공해도 됩니다.

## 클레이모피즘 디자인

- 파스텔 민트·라벤더·피치·버터 옐로 계열을 바탕으로, 둥근 찰흙 같은 카드와 버튼을 사용했습니다.
- 홈의 노트북과 캐릭터 3D 일러스트는 이번 버전을 위해 생성해 `assets/clay-hero.png`에 저장했습니다.
- `assets/css/clay.css`가 v1의 `studio.css` 위에 테마를 적용합니다. 집필·제본·서재 로직은 그대로 유지됩니다.

이미지 제작 프롬프트: “Claymorphism style infographic, cute 3D soft plastic textures, rounded inflated shapes, friendly pastel colors, 3D characters interacting with a giant notebook, playful and accessible AI technology. A large open notebook with characters placing a book page, video frame, and sound wave; pastel mint, lilac, peach, butter yellow, and pale sky blue; no text or logo.” 내장 이미지 생성 도구를 사용했습니다.

## 범위

- 홈, 탭 이동, AI 집필실의 목차/표지 초안, 원고 제본소, 표지 시안, 내 서재의 브라우저 저장, FAQ, 정책 페이지를 포함합니다.
- 집필실의 “AI” 추천 문구와 목차는 공개 JavaScript의 장르/키워드 템플릿 기반입니다. 원격 AI 모델 호출은 없습니다.
- 계정 가입/로그인/문의/공지 API는 원 사이트의 비공개 PHP 서버가 필요합니다. 이 복제본에서는 요청을 차단하며 공지는 빈 목록으로 표시합니다.
- 숏폼/오디오북은 별도 PDBOOK 렌더 서버가 필요합니다. 원 사이트 NAS 연결은 차단했고 `127.0.0.1:4700`에서 사용자가 직접 실행한 로컬 서비스만 탐색합니다. 서버가 없으면 제작 버튼은 비활성화됩니다.
- 멤버십 가격과 이벤트는 관찰 시점의 표시만 복제한 것입니다. 결제, 혜택, 초대 정산은 동작하지 않습니다.
- 글꼴과 아이콘은 외부 CDN에 연결되어 있어 인터넷이 없으면 대체 글꼴/아이콘으로 보일 수 있습니다.

## 파일

- `index.html`: 통합 스튜디오 페이지
- `assets/css/studio.css`: 화면 스타일
- `assets/css/clay.css`: 클레이모피즘 테마
- `assets/clay-hero.png`: 생성한 3D 홈 일러스트
- `assets/js/`: 탭, 집필/제본/표지/서재, 미디어, 계정 화면 로직
- `terms.html`, `privacy.html`, `refund.html`: 공개 정책 페이지

실제 서비스의 비공개 서버 코드와 데이터는 포함하지 않습니다. 결과물은 로컬 검토용이며 원 서비스로 배포하거나 고객 계정을 받는 용도로 사용하지 마세요.
