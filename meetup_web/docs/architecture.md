# architecture.md — 언제볼래 구조

기준: 2026-10-31 체험판 코드

## 한눈에 보기

```
화면 (pages/)          Login · Home · RoomNew · Room
   │  부품 (components/)  MonthCalendar · ResultPanel · DateDetail · RoomMenu
   │                     PasswordGate · Dialog · Sheet · Toast · CopyButton · ThemeToggle
   ▼
훅 (hooks/)            useSession (로그인 상태) · useRoom (방 불러오기 + 변경 구독)
   ▼
API (api/)             auth.js (로그인) · rooms.js (방 기능, 입력 제한)
   ▼
저장소 (api/store.js)   localStorage DB + BroadcastChannel(탭 사이 전파)

규칙 (lib/)            tally.js (집계, 순수 함수) · dates.js (날짜 계산)
```

- 화면은 `api/`의 함수만 부른다. localStorage를 직접 만지지 않는다.
- 서버를 붙일 때는 `api/` 안쪽만 바꾸고 화면은 그대로 둔다. 이것이 이 구조의 핵심 약속이다.
- `lib/`은 화면도 저장소도 모르는 순수 함수라 Node에서 바로 검사한다(`scripts/check-tally.mjs`).

## 폴더 구조

```
meetup_web/
├─ index.html          첫 그리기 전에 저장된 화면 모드를 적용하는 짧은 스크립트 포함
├─ vite.config.js      포트 3058 고정
├─ public/favicon.svg
├─ scripts/check-tally.mjs   집계 규칙 검사 (npm run check:tally)
└─ src/
   ├─ main.jsx         BrowserRouter + App
   ├─ App.jsx          헤더(로고, 화면 모드, 로그아웃), 라우트, 로그인 유지 타이머
   ├─ styles.css       색 변수(라이트/다크), 탁상 달력 디자인
   ├─ api/             store.js · auth.js · rooms.js
   ├─ hooks/           useSession.js · useRoom.js
   ├─ lib/             tally.js · dates.js
   ├─ components/
   └─ pages/
```

## 라우트

| 주소 | 화면 | 로그인 필요 |
|---|---|---|
| `/login` | Login | 아니요. 이미 로그인했으면 `/`로 보낸다 |
| `/` | Home (내 방 목록) | 예 |
| `/new` | RoomNew (방 만들기) | 예 |
| `/r/:id` | Room (참여 전이면 PasswordGate) | 예 |
| 그 밖 | `/`로 보낸다 | |

로그인이 안 된 채 `/r/:id`를 열면 `RequireLogin`이 그 주소를 sessionStorage(`eonje:return-to`)에 기억하고 `/login`으로 보낸다. 로그인하면 그 주소로 돌아간다.

## 데이터 모델

localStorage 키 `eonje:db:v2` 하나에 JSON으로 저장한다. 서버 DB의 테이블 자리다.

```
users     { [name]: { name, password, createdAt } }        이름이 아이디
rooms     { [id]:   { id, title, password, hostUser, confirmedDate, createdAt } }
profiles  [ { id, roomId, user, name, createdAt } ]         방 참여 = 계정 하나당 방마다 한 줄
offDays   [ { roomId, profileId, date } ]                   안 되는 날만 저장
notes     [ { roomId, date, profileId, name, text, updatedAt } ]   날짜·사람마다 최대 1개
```

- 방 id는 6자, 프로필 id는 8자. 헷갈리는 글자(0·O·1·l·I)를 뺀 문자로 만든다(`newId`).
- `date`는 `'YYYY-MM-DD'`, 브라우저 시간 기준이다.
- v1은 로그인이 없던 구조라 읽지 않는다. 구조를 다시 바꾸면 키 버전을 올린다.
- 입력 제한은 코드 한 곳에 모여 있다: `AUTH_LIMITS`(auth.js: 이름 10, 비밀번호 4), `LIMITS`(rooms.js: 방 이름 10, 암호 8자리, 인원 8, 메모 100).

그 밖의 브라우저 저장

| 키 | 저장소 | 내용 |
|---|---|---|
| `eonje:session:v1` | localStorage | 로그인 상태 `{ name, signedInAt, lastSeen }` |
| `eonje:return-to` | sessionStorage | 로그인 뒤 돌아갈 주소 |
| `meetup.theme` | localStorage | 화면 모드 `light` / `dark`. 자동이면 키가 없다 |

## 로그인 유지

- `lastSeen`에서 10분(`SESSION_TTL_MS`)이 지나면 로그인이 풀린다.
- 앱을 열어 둔 동안 1분마다, 그리고 탭을 가리거나 닫을 때(`visibilitychange`, `pagehide`) `lastSeen`을 갱신한다(`App.jsx`).
- 절전 등으로 10분 넘게 비웠다 돌아오면 갱신이 실패하고 로그인 화면으로 간다.
- 로그아웃은 세션과 돌아갈 주소를 모두 지우고 `/`에서 새로 시작한다. 다음에 로그인한 사람이 보던 방으로 끌려가지 않게 하려는 것이다.

## 실시간 반영

- 바꾸는 함수(`joinRoom`, `saveOffDays`, `confirmDate` 등)는 저장한 뒤 `publish({ type, roomId, ... })`로 BroadcastChannel `eonje:realtime`에 알린다.
- `useRoom`은 같은 방의 이벤트를 받으면 방 전체를 다시 읽는다. 다른 창에서 저장소가 바뀐 경우를 대비해 `storage` 이벤트(`eonje:`로 시작하는 키)도 듣는다.
- `offdays_changed`면 「방금 ○○님이 날짜를 바꿨어요」 알림을 띄운다.
- 같은 브라우저 안에서만 동작한다. 서버를 붙이면 이 자리를 서버의 실시간 구독(예: Supabase Realtime)으로 바꾼다.

## 집계 규칙 (`lib/tally.js`)

- `tally({ dates, profiles, offRows })` → 날짜마다 `{ ok: [이름], no: [이름] }`. 표시하지 않은 날은 되는 날이다. 지워진 프로필의 행은 무시한다.
- `ranking(table)` → 되는 사람이 많은 순, 같으면 이른 날짜 순. 인원이 같으면 같은 순위(1, 1, 3 …). 아무도 안 되는 날은 뺀다.
- 결과 화면은 고른 기간으로 표를 먼저 자른 뒤 `ranking`에 넣는다.

## 화면 모드 (라이트 / 다크)

- 색은 모두 `styles.css`의 `:root` 변수(`--paper`, `--ink`, `--red` …)로 쓴다. 새 스타일도 색을 직접 적지 말고 변수를 쓴다.
- 다크 색은 두 곳에 같은 값으로 있다. 하나를 고치면 다른 하나도 고친다.
  - `@media (prefers-color-scheme: dark) { :root:not([data-theme='light']) }` — 자동일 때 기기가 다크면 적용
  - `:root[data-theme='dark']` — 버튼으로 다크를 골랐을 때 적용
- `ThemeToggle`이 `<html data-theme>`을 붙이거나 떼고 `meetup.theme`에 저장한다. 자동이면 속성과 키를 모두 지운다.
- `index.html`의 짧은 스크립트가 React보다 먼저 저장값을 적용해 새로고침할 때 깜빡이지 않게 한다.

## 서버로 옮기는 방법 (계획)

1. DB에 위 다섯 테이블을 만든다. `users.password`와 `rooms.password`는 해시로 저장한다.
2. `api/store.js`의 `readDb` / `update` 대신 `auth.js`·`rooms.js` 함수 안에서 서버를 부른다. 함수 이름과 돌려주는 모양(`loadRoom`의 `{ room, isHost, me, profiles, offRows, notes }` 등)은 그대로 둔다.
3. 함수가 비동기가 되므로 화면에서 부르는 곳에 `await`과 로딩 표시를 더해야 한다. 이 부분은 화면도 조금 고쳐야 한다.
4. 방 암호·방장 확인을 서버에서 한다. 지금은 브라우저에서 확인하므로 누구나 우회할 수 있다.
5. `publish` / `subscribe`를 서버 실시간 구독으로 바꾼다.
