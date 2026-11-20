# v2 검증 기록 (2026-11-20)

- `node --check`로 `assets/js`의 5개 파일 문법을 확인했습니다. 모두 통과했습니다.
- REA 브라우저 시나리오에서 v2의 1440×900 홈 화면, 390×844 모바일 홈, 1440×900 집필실을 렌더링해 확인했습니다. 세 화면 모두 페이지 오류가 기록되지 않았습니다.
- v1 첫 화면의 원본 대비 이미지 일치 검증은 v1의 `VERIFICATION.md`에 기록되어 있습니다. v2는 디자인을 바꿨으므로 픽셀 일치 대상이 아닙니다.
- v1의 REA 시나리오에서 홈→AI 집필실 탭 클릭, 집필 폼의 8개 목차 생성과 `duonbook_books` 저장을 확인했습니다. v2는 이 동작의 JavaScript를 변경하지 않았습니다.
- 계정, 공지 서버, 영상/오디오 렌더 서버는 재현하지 않았고 실제 가입·문의·영상 생성은 검증 대상이 아닙니다.

REA Evidence IDs: v2 데스크톱 홈 `ev_d3472176882ecf5af26dee7caa5ef5022a5d0d13310317003938294e47d7ecf4`, 모바일 홈 `ev_2f60ecf8e0835b3c9c3a0ca166832556eb06fc1cb9da7650c0d72b075dc132a3`, 집필실 `ev_f66c367ec32e961f4b916cc090d0f6b14542b06c2c2cc14c599b27f5057c9124`. 집필 폼의 저장 동작은 v1에서 확인했고, v2는 동일한 JavaScript를 사용합니다.

## GitHub·Vercel 배포 확인

- GitHub 공개 저장소 `jennylee3769-cmyk/duon-studio-clay`의 `main` 브랜치에 커밋하고 푸시했습니다.
- Vercel 프로젝트 `duon-studio-clay`를 생성하고 GitHub 저장소에 연결했습니다.
- `https://duon-studio-clay.vercel.app/`, `assets/clay-hero.png`, `robots.txt`가 HTTP 200을 반환했습니다.
- 프로덕션 페이지에서 AI 집필실 탭 클릭 후 URL이 `/#create`로 변하고 집필 폼이 표시됐습니다. REA Evidence ID: `ev_c2e3ae817afa65ec2d4bcaaa24bfd74bc1bfc49c9a1cca9755c05a362236eacc`. 페이지 오류는 기록되지 않았습니다.
