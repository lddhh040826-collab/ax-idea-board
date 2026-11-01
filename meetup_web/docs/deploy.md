# deploy.md — 언제볼래를 인터넷에 올리기

목표: `https://○○○.vercel.app` 주소 하나로 친구들이 각자 폰에서 같은 방을 쓰게 한다.

- **Supabase**: 데이터(계정, 방, 안 되는 날, 메모)를 저장하고 실시간 알림을 보낸다. 무료 요금제로 충분하다.
- **Vercel**: 웹 주소를 만들고 앱을 올린다. GitHub에 push할 때마다 자동으로 다시 올린다. 무료 요금제로 충분하다.

두 서비스 모두 GitHub 계정으로 가입하면 편하다.

## 1. Supabase 프로젝트 만들기 (10분)

1. https://supabase.com → **Start your project** → GitHub로 로그인
2. **New project**
   - Name: `eonje` (아무거나)
   - Database Password: **Generate** 눌러 만들고 따로 적어 둔다 (앱에는 필요 없다)
   - Region: **Northeast Asia (Seoul)**
   - **Create new project** → 1~2분 기다린다
3. 왼쪽 메뉴 **SQL Editor** → **New query** → 이 저장소의 [`supabase/schema.sql`](../supabase/schema.sql) 내용을 전부 붙여 넣고 **Run**
   - 아래쪽에 `Success. No rows returned`가 나오면 된다. 다시 실행해도 괜찮다
4. 왼쪽 메뉴 **Authentication** → **Sign In / Providers** (또는 Providers) → **Allow anonymous sign-ins**를 켜고 **Save**
   - 기기마다 익명으로 서버에 연결하고, 「이름 + 비밀번호」 확인은 DB 함수가 한다. 이걸 켜지 않으면 로그인 화면에서 「서버 설정에서 익명 로그인을 켜 주세요」가 나온다
5. 프로젝트 첫 화면의 **Connect** 버튼(또는 **Project Settings → API**)에서 두 값을 복사한다
   - **Project URL**: `https://xxxx.supabase.co`
   - **anon public** 키 (새 프로젝트는 `sb_publishable_...`로 시작하는 Publishable key) — 이 키는 웹 앱에 들어가도 되는 공개용 키다
   - **service_role / secret 키는 복사하지 않는다.** 이 키는 모든 보안 규칙을 건너뛴다

## 2. 이 컴퓨터에서 먼저 확인하기

`meetup_web/.env.local` 파일을 만들고 (git에 올라가지 않는다):

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=복사한_키
```

```bash
cd meetup_web
npm run build && npm run preview -- --host 0.0.0.0   # http://localhost:3059
```

화면 맨 아래 「체험판 · 이 브라우저에만 저장돼요」 문구가 **없으면** 서버 모드다. 가입 → 방 만들기 → 다른 브라우저(시크릿 창)에서 다른 이름으로 가입 → 링크와 암호로 참여 → 한쪽에서 X를 치면 다른 쪽에 바로 「방금 ○○님이 날짜를 바꿨어요」가 뜨는지 본다.

## 3. Vercel에 올리기 (10분)

코드가 GitHub에 있어야 한다(`lddhh040826-collab/ax-idea-board`).

1. https://vercel.com → **Sign Up** → **Continue with GitHub**
2. **Add New… → Project** → `ax-idea-board` 저장소 **Import**
   - 처음이면 **Install** 눌러 Vercel이 이 저장소를 읽게 허락한다
3. 설정
   - **Root Directory**: **Edit** → `meetup_web` 선택 (중요: 저장소 루트가 아니다)
   - Framework Preset: **Vite** (자동으로 잡힌다)
   - **Environment Variables**에 두 줄 추가
     - `VITE_SUPABASE_URL` = Project URL
     - `VITE_SUPABASE_ANON_KEY` = anon(Publishable) 키
4. **Deploy** → 1분쯤 뒤 `https://○○○.vercel.app` 주소가 나온다
5. 프로젝트 **Settings → Domains**에서 주소 앞부분을 바꿀 수 있다 (예: `eonje.vercel.app`, 비어 있는 이름일 때만)

배포할 브랜치: Vercel은 기본으로 `main` 브랜치를 실제 주소에 올린다. 다른 브랜치(예: `feat/meeting-schedule`)는 미리보기 주소로 올라간다. 실제 주소로 쓰려면 `main`에 합치거나, **Settings → Git → Production Branch**를 바꾼다.

## 4. 올린 뒤 확인

- 휴대폰에서 주소 열기 → 가입 → 방 만들기 → 친구에게 「링크+암호 복사」로 보내기
- 친구 폰에서 참여 → 서로의 X가 바로 반영되는지
- 초대장 「이미지 복사」는 https 주소라서 폰에서도 된다

## 문제가 생기면

| 증상 | 원인과 해결 |
|---|---|
| 「서버 설정에서 익명 로그인을 켜 주세요」 | 1-4단계 |
| 「permission denied」, 「권한이 없어요」 | `schema.sql`을 끝까지 실행했는지. 다시 실행해도 된다 |
| 새로고침하면 404 | `vercel.json`이 `meetup_web/` 안에 있는지, Root Directory가 `meetup_web`인지 |
| 아직 「체험판」 문구가 보인다 | Vercel 환경 변수 이름이 정확히 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`인지. 바꾼 뒤 **Redeploy** |
| 다른 사람 변경이 바로 안 보인다 | 새로고침하면 보이면 실시간 알림만 문제. Supabase **Realtime** 설정에서 「Private channels only」가 꺼져 있는지 |

## 보안 메모

- 방 안의 데이터는 그 방 멤버만 읽고, 다른 사람의 표시·메모는 고칠 수 없다(DB의 RLS).
- 계정 비밀번호와 방 암호는 bcrypt로 저장하고, 클라이언트는 그 칸을 읽을 수 없다.
- 비밀번호가 4글자라 맞히기 쉬운 편이어서, 5번 틀리면 그 계정을 5분 동안 잠근다.
- 실시간 알림은 「바뀌었다」는 신호만 보내고 데이터는 담지 않는다. 데이터는 매번 보안 규칙을 거쳐 다시 읽는다.
