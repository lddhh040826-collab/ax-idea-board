# architecture.md — 언제볼래 구조

기준: 2026-11-24 코드 (서버 모드 + 체험판)

## 한눈에 보기

```
화면 (pages/)          Login · Home · RoomNew · Room
   │  부품 (components/)  MonthCalendar · ResultPanel · DateDetail · RoomMenu(모임 설정) · Appointments(약속 줄·약속 창)
   │                     MemberPanel · InviteMaker · PasswordGate · Dialog · Sheet · Toast · CopyButton · ThemeToggle
   ▼
훅 (hooks/)            useSession (로그인 상태) · useRoom (모임 불러오기 + 변경 구독)
   ▼
API (api/)             auth.js · rooms.js · realtime.js  ← 화면이 부르는 곳. 모두 Promise
   │                     backend.js가 둘 중 하나를 고른다
   ├─ server/            Supabase: DB 함수(RPC)·표 읽기/쓰기, Realtime 방송   ← VITE_SUPABASE_* 가 있을 때
   └─ local/             localStorage DB + BroadcastChannel(탭 사이)        ← 없을 때(체험판)
   ▼
DB (supabase/schema.sql) 표, RLS(누가 무엇을 읽고 쓰나), 서버 함수

규칙 (lib/)            tally.js (집계, 순수 함수) · dates.js (날짜 계산) · appointments.js (약속 입력 확인·나누기) · invite.js (초대장)
```

- 화면은 `api/auth.js`·`rooms.js`·`realtime.js`만 부른다. 서버판과 체험판은 함수 이름과 돌려주는 모양이 같다(`loadRoom`의 `{ room, isHost, me, profiles, offRows, notes, appointments }` 등).
- 입력 제한(`limits.js`)과 링크 만들기(`links.js`)는 두 판이 같이 쓴다.
- 서버판에서 화면 쪽 확인은 빠른 안내용일 뿐이고, 실제로 막는 것은 DB의 RLS와 함수다.
- `lib/`은 화면도 저장소도 모르는 순수 함수라 Node에서 바로 검사한다(`scripts/check-tally.mjs`).

## 폴더 구조

```
meetup_web/
├─ index.html          첫 그리기 전에 저장된 화면 모드를 적용하는 짧은 스크립트 포함
├─ vite.config.js      포트 3059 고정
├─ public/favicon.svg
├─ scripts/check-tally.mjs   집계 규칙 검사 (npm run check:tally)
└─ src/
   ├─ main.jsx         BrowserRouter + App
   ├─ App.jsx          헤더(로고, 화면 모드, 로그아웃), 라우트, 로그인 유지 타이머
   ├─ styles.css       색 변수(라이트/다크), 탁상 달력 디자인 (기본)
   ├─ look-mono.css    스프링 벽걸이 달력 디자인. <html data-look="mono">일 때만 덮어쓴다 (VITE_LOOK=mono)
   ├─ api/             store.js · auth.js · rooms.js
   ├─ hooks/           useSession.js · useRoom.js
   ├─ lib/             tally.js · dates.js · appointments.js · invite.js
   ├─ components/
   └─ pages/
```

## 라우트

| 주소 | 화면 | 로그인 필요 |
|---|---|---|
| `/login` | Login | 아니요. 이미 로그인했으면 `/`로 보낸다 |
| `/` | Home (내 모임 목록) | 예 |
| `/new` | RoomNew (모임 만들기) | 예 |
| `/r/:id` | Room (참여 전이면 PasswordGate) | 예 |
| 그 밖 | `/`로 보낸다 | |

로그인이 안 된 채 `/r/:id`를 열면 `RequireLogin`이 그 주소를 sessionStorage(`eonje:return-to`)에 기억하고 `/login`으로 보낸다. 로그인하면 그 주소로 돌아간다.

## 데이터 모델

localStorage 키 `eonje:db:v2` 하나에 JSON으로 저장한다. 서버 DB의 테이블 자리다.

```
users     { [name]: { name, password, createdAt } }        이름이 아이디
rooms        { [id]:   { id, title, password, hostUser, confirmedDate(옛 값, 항상 null), createdAt } }   모임
profiles     [ { id, roomId, user, name, createdAt } ]        모임 참여 = 계정 하나당 모임마다 한 줄. name = 모임 안에서 쓰는 이름(처음엔 계정 이름)
offDays      [ { roomId, profileId, date } ]                  불가능한 날만 저장. 약속과 상관없이 남는다
notes        [ { roomId, date, profileId, name, text, updatedAt } ]   날짜·사람마다 최대 1개. 이름은 읽을 때 profiles.name으로 바꿔 보여 준다
appointments [ { id, roomId, date | null, title, category, createdAt } ]   약속. date가 null이면 날짜 미정. 같은 모임·같은 날짜엔 하나
```

- 모임 id는 6자, 프로필·약속 id는 8자. 헷갈리는 글자(0·O·1·l·I)를 뺀 문자로 만든다(`newId`).
- `date`는 `'YYYY-MM-DD'`, 브라우저 시간 기준이다.
- v1은 로그인이 없던 구조라 읽지 않는다. 구조를 다시 바꾸면 키 버전을 올린다.
- 입력 제한은 코드 한 곳에 모여 있다: `AUTH_LIMITS`(`api/limits.js`: 이름 10 — 모임 안 이름도 같다, 비밀번호 4), `LIMITS`(모임 이름 10, 암호 8자리, 인원 8, 메모 100), `APPT_TITLE_MAX`(`lib/appointments.js`: 약속 이름 20).
- 예전에 모임마다 하나였던 `confirmedDate`는 `readDb()`가 처음 읽을 때 약속 하나(이름 = 모임 이름, 카테고리 기타)로 옮기고 지운다.

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
- 로그아웃은 세션과 돌아갈 주소를 모두 지우고 `/`에서 새로 시작한다. 다음에 로그인한 사람이 보던 모임으로 끌려가지 않게 하려는 것이다.

## 서버 모드 (Supabase)

- 로그인: 기기마다 Supabase **익명 로그인**을 하나 쓰고, 「이름 + 4글자 비밀번호」 계정은 `accounts` 표에서 직접 관리한다. `sign_in`이 맞으면 `sessions`에 「이 기기 → 이 계정」을 적고, 모든 권한 확인은 `me()`로 한다. (Supabase 기본 로그인은 이메일과 6자 이상 비밀번호가 필요해서 지금 로그인 방식과 맞지 않는다)
- 비밀번호·모임 암호는 bcrypt. 5번 틀리면 5분 잠금. 클라이언트는 그 칸을 읽을 수 없다(칸 단위 권한).
- 모임 만들기·참여·모임 암호 변경·모임 안 이름 바꾸기(`rename_member`)·가입·로그인은 DB 함수(RPC), 나머지는 표를 직접 읽고 쓰되 RLS가 막는다.
- 10분 로그인 유지는 체험판과 같다: 기기에 `eonje:seen:v1`(마지막으로 쓴 때)을 두고, 넘으면 `sign_out`.
- 표: `accounts`, `sessions`, `rooms`, `members`(모임 참여, `name` = 모임 안 이름), `off_days`, `notes`, `appointments`(약속). 나가면 그 사람의 표시·메모, 모임을 지우면 모임 안 모든 것이 DB에서 같이 지워진다(외래 키 cascade).
- `appointments`: 읽기는 모임원 모두, 만들기·이름/카테고리/날짜 고치기·지우기는 모임장만(RLS, `is_host`). `unique (room_id, date)`라 같은 날짜엔 약속 하나(날짜 미정 null은 여러 개 가능). 테이블이 아직 없으면 `loadRoom`은 약속 없이 모임을 연다.
- `schema.sql`은 여러 번 실행해도 된다. 바꿀 때마다 Supabase에서 다시 실행한다. 끝부분이 예전 `rooms.confirmed_date`를 약속으로 옮긴다.
- SQL은 이 서버의 PostgreSQL 16에 Supabase 흉내(익명 사용자, `auth.uid()`)를 만들어 시험했다: 가입·잠금·RLS·칸 권한·cascade. Supabase 실제 프로젝트에서는 아직 돌려 보지 않았다.

## 실시간 반영

- 바꾸는 함수(`joinRoom`, `saveOffDays`, `createAppointment`, `setAppointmentDate`, `renameMe` 등)는 저장한 뒤 그 방에 「바뀌었다」는 신호를 보낸다. 서버판은 Supabase Realtime 방송 채널 `room:<id>`, 체험판은 BroadcastChannel `eonje:realtime`(같은 브라우저의 다른 탭).
- 신호에는 데이터가 없다. `useRoom`은 신호를 받으면 모임 전체를 다시 읽는다(서버판은 RLS를 거친다). 체험판은 `storage` 이벤트도 예비로 듣는다.
- `offdays_changed`면 「방금 ○○님이 날짜를 바꿨어요」 알림을 띄운다.
- 불가능한 날은 손을 떼면 화면부터 바꾸고(`patch`) 저장한 뒤 다시 읽는다. 저장이 실패하면 다시 읽으면서 원래대로 돌아간다.

## 집계 규칙 (`lib/tally.js`)

- `tally({ dates, profiles, offRows })` → 날짜마다 `{ ok: [이름], no: [이름] }`. 표시하지 않은 날은 가능한 날이다. 지워진 프로필의 행은 무시한다.
- `ranking(table)` → 가능한 사람이 많은 순, 같으면 이른 날짜 순. 인원이 같으면 같은 순위(1, 1, 3 …). 아무도 가능하지 않은 날은 뺀다.
- 결과 화면은 고른 기간으로 표를 먼저 자른 뒤 `ranking`에 넣는다.

## 화면 모드 (라이트 / 다크)

- 색은 모두 `styles.css`의 `:root` 변수(`--paper`, `--ink`, `--red` …)로 쓴다. 새 스타일도 색을 직접 적지 말고 변수를 쓴다.
- 다크 색은 두 곳에 같은 값으로 있다. 하나를 고치면 다른 하나도 고친다.
  - `@media (prefers-color-scheme: dark) { :root:not([data-theme='light']) }` — 자동일 때 기기가 다크면 적용
  - `:root[data-theme='dark']` — 버튼으로 다크를 골랐을 때 적용
- `ThemeToggle`이 `<html data-theme>`을 붙이거나 떼고 `meetup.theme`에 저장한다. 자동이면 속성과 키를 모두 지운다.
- `index.html`의 짧은 스크립트가 React보다 먼저 저장값을 적용해 새로고침할 때 깜빡이지 않게 한다.

## 약속 (`lib/appointments.js`, `components/Appointments.jsx`)

- 흐름: 모임장이 [+ 새 약속]으로 이름·카테고리만 정해 만든다(날짜 미정) → 결과에서 날짜를 누르고 「이 날짜로 확정할 약속」을 고른다(`setAppointmentDate`) → 날짜 확정 취소는 `date = null`.
- `splitAppointments(list)` → `{ pending(날짜 미정, 만든 순), upcoming(오늘 포함 앞으로, 가까운 순), past(지난, 최근 순) }`. 약속 줄은 다가오는 약속 → 날짜 미정, 오른쪽 끝 탭이 지난 약속.
- 카테고리 = 초대장 카테고리 7개 + 기타(`APPT_CATEGORIES`). 초대장은 약속 이름을 제목으로, 카테고리가 초대장 테마면 그 테마로 바로 시작한다.
- 달력에서 약속 날짜는 `confirmedDates`(Set)로 표시한다.

## 디자인 두 가지 (`VITE_LOOK`)

- 기본은 `styles.css`(탁상 달력). `VITE_LOOK=mono`로 띄우거나 빌드하면 `main.jsx`가 `<html data-look="mono">`를 붙이고, `look-mono.css`의 `[data-look='mono']` 규칙이 색·글꼴·모양을 덮어쓴다(스프링 벽걸이 달력).
- `look-mono.css`는 늘 번들에 들어가지만 속성이 없으면 아무것도 바꾸지 않는다. 화면 코드는 두 디자인이 같다.
- 스프링은 SVG 고리 그림을 `data:` URI로 넣어 가로로 반복한다(`--spring`, 밝은 모드 남색 / 다크 모드 흰 철사). **URI 안의 `#`는 반드시 `%23`으로** 적는다(그대로 두면 그 뒤가 잘려 그림이 안 나온다).
- 글꼴: Do Hyeon(제목·숫자, 굵기 하나라 `font-weight: 400`), Pretendard(본문·버튼, jsdelivr CDN). 둘 다 `index.html`에서 불러온다.

## 글꼴과 글자 크기

- 글꼴은 `--display` 변수 하나로 본문과 제목에 모두 쓴다: `'SF Gyeoul Myeongjo', 'Noto Serif KR', 'AppleMyungjo', serif`.
- SF겨울명조는 눈누마켓의 유료 폰트라 저장소에 넣지 않았다. 구매한 woff2 파일을 `public/fonts/`에 넣으면 적용된다.
  - `SFGyeoulMyeongjo-Medium.woff2` — 굵기 100~600 (본문)
  - `SFGyeoulMyeongjo-Bold.woff2` — 굵기 700~900 (제목, 버튼)
  - 파일이 없으면 Google Fonts의 Noto Serif KR로 보인다(`index.html`에서 불러옴).
- 글자 크기는 모두 `rem`이다. `:root`의 `font-size: 112.5%`(18px) 하나로 전체 크기가 같이 바뀐다.

## 초대장 (`lib/invite.js`, `components/InviteMaker.jsx`)

- 900×1600(9:16) 세로 캔버스에 그린다. 생김새는 두 가지다.
  - **포스터형** (술자리·카페·생일파티·걸스나잇, `drawPoster`): 크림 종이에 한 가지 잉크색. 굵은 대문자 제목, 약속 이름, 검은 마커 선 그림, 큰 날짜와 요일, 「— 」로 잇는 한 줄 문구, 표 [DATE: | TIME:] / [WHERE:] / [DRESSCODE:], 맨 아래 WHO를 「이름 x 이름」으로, 가장자리에 반짝이 별.
  - **테마형** (여행·운동·홈파티): 위 문구 / 가운데 그림(날짜는 그림 안) / 아래 약속 이름과 정보 표(TIME / WHERE / WHO / DRESSCODE).
- 카테고리(`CATEGORIES`)는 이름과 문구만, 생김새는 `THEMES`에 있다. 포스터형은 `lines`·`tagline`·`color`·`sketch`, 테마형은 문구 글꼴·색·`bg`·`art`.

| 카테고리 | 형식 | 제목/문구 | 색 | 가운데 그림 |
|---|---|---|---|---|
| 술자리 | 포스터 | CHEERS! | 와인 레드 | 와인병, 건배하는 잔 |
| 카페 | 포스터 | CAFÉ & CHILL | 세이지 그린 | 머그 두 개, 하트 모양 김, 쿠키 |
| 생일파티 | 포스터 | HAPPY BIRTHDAY! | 로열 블루 | 2단 케이크, 풍선 |
| 걸스나잇 | 포스터 | GIRLS ONLY | 마젠타 | 선글라스 낀 얼굴 다섯 |
| 여행 | 테마 | adios! | 하늘색·남색·주황 | 탑승권 (날짜는 DATE 칸) |
| 운동 | 테마 | just do it | 비비드 파랑·라임·주황 | 스톱워치 (날짜는 안쪽) |
| 홈파티 | 테마 | Home sweet home | 웜톤 | 집 (날짜는 현관 위 간판) |

- 그림은 이미지 파일 없이 `Path2D`로 직접 그린다. 외부 이미지를 캔버스에 그리면 복사·저장이 막히기 때문이다. 포스터형 그림은 600×600 칸, 테마형 그림은 가로 칸(x 900~1560, y 60~850) 기준이고, 남은 높이에 맞춰 옮기고 줄인다.
- 글꼴은 모두 Google Fonts(`index.html`): Montserrat(포스터형), Bebas Neue·Anton·Shrikhand(테마형), Noto Sans KR 900·Nanum Pen Script(한글). 그리기 전에 그 카테고리가 쓰는 글꼴만 실제 글자로 `document.fonts.load`를 부른다(`loadInviteFonts`).
- WHO는 처음에 참여자 이름이 채워져 있고 쉼표로 나눠 고칠 수 있다(비우면 「우리 모두」, 길면 「○○ 외 n명」). 시간·장소·드레스코드·WHO는 초대장에만 쓰고 저장하지 않는다.
- 복사는 `navigator.clipboard.write`(PNG). https나 localhost에서만 되고, 막히면 저장하기를 안내한다. 공유하기는 파일 공유를 지원하는 브라우저(주로 휴대폰)에서만 보인다.
- 「just do it」은 나이키의 등록 상표 슬로건이다. 서비스로 공개하기 전에 문구를 바꿀지 정해야 한다.
