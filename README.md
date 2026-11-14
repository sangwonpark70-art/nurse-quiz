# 간호조무사 문제풀이

간호조무사 국가시험형 5지선다 연습 앱(PWA). 주소: https://sangwonpark70-art.github.io/nurse-quiz/

- 문항: 교재를 바탕으로 **직접 만든** 연습 문항만. 교재·기출 원문은 넣지 않는다.
- 풀이 기록: 사용하는 기기의 브라우저 저장소에만 저장(이 저장소·서버로 보내지 않음). 설정 → 기록 파일로 백업.
- 휴대폰: 주소를 열고 「홈 화면에 추가」.

## 구조
- `index.html` 앱 전체 · `bank/<과목>.js` 문항은행(과목별 분리) · `SPEC.md` 문항 기준서
- `tools/validate.js` 검사기(`--control` 대조군) · `tools/smoke.js` 실행 점검(jsdom)

## 문항 추가 순서
출제 → 블라인드 풀이 → `node tools/validate.js --control` → `node tools/smoke.js` → 커밋. 새 과목 파일은 index.html·sw.js에 한 줄씩 추가.
