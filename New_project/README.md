# 계약서 버전 대조

구버전·신버전 계약서(docx·텍스트 PDF)를 올리면 조항 단위로 추가·삭제·수정을 짚어 주는 웹 도구. 기준 문서: [docs/PRD-board.md](docs/PRD-board.md), [docs/handoff.md](docs/handoff.md)

```bash
npm install
npm run dev            # http://localhost:3055
npm run build
npm run check:samples  # Q6 기준: 샘플 3쌍의 정답 변경 목록과 대조
npm run preview        # 빌드본을 http://localhost:3055 으로 실행 (앱 설치는 빌드본에서만 됨)
```

## 앱으로 설치 (PWA)

`npm run build && npm run preview`로 연 뒤 Chrome·Edge에서 첫 화면의 [앱으로 설치] 버튼(또는 주소창 오른쪽 설치 아이콘)을 누른다.
바탕화면·시작 메뉴에 아이콘이 생기고 자기 창에서 열린다. 한 번 연 뒤에는 인터넷 없이도 열린다.
다른 사람이 설치하려면 앱을 https 주소로 배포해야 한다(localhost는 예외). 아이콘은 `python3 scripts/make-icons.py public`으로 다시 만든다.

## 지금 구현된 범위

- 화면 1 · 업로드: 구/신 파일 칸, [비교하기], 샘플 3쌍 체험, 읽을 수 없는 파일 안내(형식·HWP·암호·이미지 PDF·20MB 초과)
- 화면 2 · 비교 결과: 추가·삭제·수정 칩 필터, 조항별 비교표(초록/빨강 취소선/노랑), 요약 클릭 시 원문 근거, 인쇄/PDF 저장, 공유 링크 복사
- 조항 짝 맞추기: 번호+제목 → 제목(번호 밀림) → 번호(제목 변경) 순
- 파일은 브라우저 안에서만 읽고 서버로 보내지 않는다.

## 임시 처리 (남은 질문이 정해지면 바꿀 것)

| 항목 | 지금 | 관련 질문 |
|---|---|---|
| 변경 요약 | LLM 대신 diff 조각으로 만든 규칙 문장 (`src/lib/compare.js` `ruleSummary`) | handoff 남은 질문 4 (외부 AI API 허용·LLM 선택) |
| 공유 링크 | DB 없이 두 원문을 압축해 링크 `#s=` 뒤에 담음. 링크를 가진 사람은 원문 전체를 볼 수 있음 | 남은 질문 2·3·4 (저장 위치·권한·DB) |
| 파일 크기 한도 | 20MB | 남은 질문 5 |
| 표 | 표 안 글자만 문단으로 비교, 표 구조 비교는 하지 않음 | PRD 「여력이 되면」 |
