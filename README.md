# 간호조무사 문제풀이

간호조무사 국가시험형 5지선다 연습 앱(PWA). 주소: https://sangwonpark70-art.github.io/nurse-quiz/

- 문항: 교재를 바탕으로 **직접 만든** 연습 문항만. 교재·기출 원문은 넣지 않는다.
- 풀이 기록: 기기 브라우저 저장소에 먼저 저장. 「설정 → 구글 로그인」 시 **사용자 본인 구글 드라이브** `간호조무사_문제풀이/문제풀이_기록.json`에 합쳐 저장(여러 기기 동기화, 날짜 백업 7개). 이 저장소·서버로는 보내지 않음. 권한은 drive.file(앱이 만든 파일만).
- 구글 로그인 키: Google Cloud 프로젝트 `nurse-quiz-514716`(이 앱 전용), 게시 상태 「테스트 중」 → 테스트 사용자만 로그인 가능.
- 휴대폰: 주소를 열고 「홈 화면에 추가」.

## 구조
- `index.html` 앱 전체 · `bank/<과목>.js` 문항은행(과목별 분리) · `SPEC.md` 문항 기준서
- `tools/validate.js` 검사기(`--control` 대조군) · `tools/smoke.js` 실행 점검(jsdom) · `tools/smoke_sync.js` 두 기기 동기화 점검(가짜 드라이브)

## 문항 추가 순서
출제 → 블라인드 풀이 → `node tools/validate.js --control` → `node tools/smoke.js` → 커밋. 새 과목 파일은 index.html·sw.js에 한 줄씩 추가.
