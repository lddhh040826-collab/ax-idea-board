-- 언제볼래 서버 DB (Supabase)
-- Supabase 대시보드 → SQL Editor에 이 파일 전체를 붙여 넣고 Run. 여러 번 실행해도 된다.
--
-- 로그인 방식
-- - 기기마다 Supabase 익명 로그인(auth.users)을 하나씩 쓰고, 「이름 + 4글자 비밀번호」 계정(accounts)은 우리가 관리한다
-- - sign_in이 맞으면 sessions에 「이 기기 → 이 계정」을 적는다. 모든 권한 확인은 me()(지금 기기의 계정)로 한다
-- - 비밀번호는 bcrypt로 저장하고, 5번 틀리면 5분 동안 잠근다
--
-- 지키는 규칙
-- - 방 안의 내용(멤버, 안 되는 날, 메모)은 그 방 멤버만 읽는다
-- - 방 암호·계정 비밀번호 칸은 클라이언트가 읽을 수 없다. 맞는지는 서버 함수에서만 확인한다
-- - 안 되는 날·메모는 본인 것만 쓰고 지운다
-- - 방 이름·확정 날짜·삭제는 방장만 한다

create extension if not exists pgcrypto with schema extensions;

-- ── 표 ──

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 1 and 10),
  password_hash text not null,
  failed int not null default 0,
  locked_until timestamptz,
  created_at timestamptz not null default now()
);

-- 이 기기(익명 auth 사용자)가 지금 어느 계정으로 로그인했는지
create table if not exists public.sessions (
  auth_id uuid primary key references auth.users on delete cascade,
  account_id uuid not null references public.accounts on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.rooms (
  id text primary key,
  title text not null check (char_length(title) between 1 and 10),
  password_hash text not null,
  host_id uuid not null references public.accounts on delete cascade,
  confirmed_date date,
  created_at timestamptz not null default now()
);

-- 방 참여 = 계정 하나당 방마다 한 줄. 나가면 그 사람의 안 되는 날·메모도 같이 지워진다
create table if not exists public.members (
  room_id text not null references public.rooms on delete cascade,
  user_id uuid not null references public.accounts on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

create table if not exists public.off_days (
  room_id text not null,
  user_id uuid not null,
  date date not null,
  primary key (room_id, user_id, date),
  foreign key (room_id, user_id) references public.members on delete cascade
);

create table if not exists public.notes (
  room_id text not null,
  user_id uuid not null,
  date date not null,
  text text not null check (char_length(text) between 1 and 100),
  updated_at timestamptz not null default now(),
  primary key (room_id, user_id, date),
  foreign key (room_id, user_id) references public.members on delete cascade
);

-- ── 권한 확인 도우미 (RLS 안에서 쓰므로 security definer로 순환을 피한다) ──

-- 지금 기기가 로그인한 계정 (없으면 null)
create or replace function public.me()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select account_id from public.sessions where auth_id = auth.uid();
$$;

create or replace function public.is_member(r text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.members where room_id = r and user_id = public.me());
$$;

create or replace function public.is_host(r text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.rooms where id = r and host_id = public.me());
$$;

-- ── 행 단위 보안 (RLS) ──

alter table public.accounts enable row level security;
alter table public.sessions enable row level security;
alter table public.rooms enable row level security;
alter table public.members enable row level security;
alter table public.off_days enable row level security;
alter table public.notes enable row level security;

drop policy if exists "멤버만 방 읽기" on public.rooms;
create policy "멤버만 방 읽기" on public.rooms for select to authenticated using (public.is_member(id));
drop policy if exists "방장만 방 고치기" on public.rooms;
create policy "방장만 방 고치기" on public.rooms for update to authenticated using (host_id = public.me()) with check (host_id = public.me());
drop policy if exists "방장만 방 지우기" on public.rooms;
create policy "방장만 방 지우기" on public.rooms for delete to authenticated using (host_id = public.me());

drop policy if exists "멤버만 멤버 목록 읽기" on public.members;
create policy "멤버만 멤버 목록 읽기" on public.members for select to authenticated using (public.is_member(room_id));
drop policy if exists "방장 아닌 사람만 스스로 나가기" on public.members;
create policy "방장 아닌 사람만 스스로 나가기" on public.members for delete to authenticated
  using (user_id = public.me() and not public.is_host(room_id));

drop policy if exists "멤버만 안 되는 날 읽기" on public.off_days;
create policy "멤버만 안 되는 날 읽기" on public.off_days for select to authenticated using (public.is_member(room_id));
drop policy if exists "내 안 되는 날 쓰기" on public.off_days;
create policy "내 안 되는 날 쓰기" on public.off_days for insert to authenticated with check (user_id = public.me() and public.is_member(room_id));
drop policy if exists "내 안 되는 날 지우기" on public.off_days;
create policy "내 안 되는 날 지우기" on public.off_days for delete to authenticated using (user_id = public.me());

drop policy if exists "멤버만 메모 읽기" on public.notes;
create policy "멤버만 메모 읽기" on public.notes for select to authenticated using (public.is_member(room_id));
drop policy if exists "내 메모 쓰기" on public.notes;
create policy "내 메모 쓰기" on public.notes for insert to authenticated with check (user_id = public.me() and public.is_member(room_id));
drop policy if exists "내 메모 고치기" on public.notes;
create policy "내 메모 고치기" on public.notes for update to authenticated using (user_id = public.me()) with check (user_id = public.me());
drop policy if exists "내 메모 지우기" on public.notes;
create policy "내 메모 지우기" on public.notes for delete to authenticated using (user_id = public.me());

-- 칸 단위 권한: 계정·세션 표는 함수로만, 방 암호 칸은 못 읽고 못 쓴다, 방장이 고칠 칸은 이름과 확정 날짜만
revoke all on public.accounts, public.sessions, public.rooms, public.members, public.off_days, public.notes from anon, authenticated;
grant select (id, title, host_id, confirmed_date, created_at) on public.rooms to authenticated;
grant update (title, confirmed_date) on public.rooms to authenticated;
grant delete on public.rooms to authenticated;
grant select, delete on public.members to authenticated;
grant select, insert, delete on public.off_days to authenticated;
grant select, insert, update, delete on public.notes to authenticated;

-- ── 서버 함수 (RPC) ──

-- 가입 전에 이름이 이미 있는지
create or replace function public.name_taken(n text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.accounts where name = trim(n));
$$;

-- 지금 기기의 로그인 상태: { id, name } 또는 0줄
create or replace function public.whoami()
returns table (id uuid, name text)
language sql
stable
security definer
set search_path = public
as $$
  select a.id, a.name from public.accounts a where a.id = public.me();
$$;

-- 가입: 이름(1~10글자) + 비밀번호(정확히 4글자). 가입하면 이 기기는 그 계정으로 로그인된다
create or replace function public.sign_up(n text, p text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  new_id uuid;
begin
  if auth.uid() is null then raise exception '서버에 연결하지 못했어요'; end if;
  if char_length(trim(coalesce(n, ''))) not between 1 and 10 then raise exception '이름은 1~10글자예요'; end if;
  if char_length(coalesce(p, '')) <> 4 then raise exception '비밀번호는 4글자예요'; end if;
  if exists (select 1 from public.accounts where name = trim(n)) then raise exception '이미 있는 이름이에요'; end if;
  insert into public.accounts (name, password_hash) values (trim(n), crypt(p, gen_salt('bf'))) returning id into new_id;
  insert into public.sessions (auth_id, account_id) values (auth.uid(), new_id)
    on conflict (auth_id) do update set account_id = excluded.account_id, created_at = now();
end;
$$;

-- 로그인: 'ok' | 'missing' | 'wrong' | 'locked'
-- 틀린 횟수를 저장해야 해서 예외 대신 결과 글자를 돌려준다 (예외를 던지면 기록도 되돌아간다)
create or replace function public.sign_in(n text, p text)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  acc public.accounts;
begin
  if auth.uid() is null then raise exception '서버에 연결하지 못했어요'; end if;
  select * into acc from public.accounts where name = trim(n);
  if acc.id is null then return 'missing'; end if;
  if acc.locked_until is not null and acc.locked_until > now() then return 'locked'; end if;
  if acc.locked_until is not null then
    update public.accounts set failed = 0, locked_until = null where id = acc.id;
    acc.failed := 0;
  end if;
  if crypt(coalesce(p, ''), acc.password_hash) <> acc.password_hash then
    update public.accounts
      set failed = acc.failed + 1,
          locked_until = case when acc.failed + 1 >= 5 then now() + interval '5 minutes' end
      where id = acc.id;
    return case when acc.failed + 1 >= 5 then 'locked' else 'wrong' end;
  end if;
  update public.accounts set failed = 0, locked_until = null where id = acc.id;
  insert into public.sessions (auth_id, account_id) values (auth.uid(), acc.id)
    on conflict (auth_id) do update set account_id = excluded.account_id, created_at = now();
  return 'ok';
end;
$$;

create or replace function public.sign_out()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.sessions where auth_id = auth.uid();
$$;

-- 참여 전 암호 화면에 보여 줄 방 이름
create or replace function public.room_preview(r text)
returns table (id text, title text)
language sql
stable
security definer
set search_path = public
as $$
  select id, title from public.rooms where id = r;
$$;

-- 방 만들기: 암호를 bcrypt로 저장하고 만든 사람을 첫 멤버로 넣는다
create or replace function public.create_room(p_title text, p_password text)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  my_id uuid := public.me();
  my_name text;
  new_id text;
  chars text := 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
begin
  select name into my_name from public.accounts where id = my_id;
  if my_name is null then raise exception '로그인이 필요해요'; end if;
  if char_length(trim(coalesce(p_title, ''))) not between 1 and 10 then raise exception '모임 이름은 1~10글자예요'; end if;
  if coalesce(p_password, '') !~ '^\d{1,8}$' then raise exception '암호는 숫자 최대 8자리예요'; end if;
  loop
    new_id := '';
    for i in 1..6 loop
      new_id := new_id || substr(chars, 1 + floor(random() * length(chars))::int, 1);
    end loop;
    exit when not exists (select 1 from public.rooms where id = new_id);
  end loop;
  insert into public.rooms (id, title, password_hash, host_id) values (new_id, trim(p_title), crypt(p_password, gen_salt('bf')), my_id);
  insert into public.members (room_id, user_id, name) values (new_id, my_id, my_name);
  return new_id;
end;
$$;

-- 방 참여: 암호 확인, 최대 8명
create or replace function public.join_room(r text, p_password text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  my_id uuid := public.me();
  my_name text;
  hash text;
begin
  select name into my_name from public.accounts where id = my_id;
  if my_name is null then raise exception '로그인이 필요해요'; end if;
  if exists (select 1 from public.members where room_id = r and user_id = my_id) then return; end if;
  select password_hash into hash from public.rooms where id = r;
  if hash is null then raise exception '모임을 찾을 수 없어요'; end if;
  if crypt(coalesce(p_password, ''), hash) <> hash then raise exception '비밀번호가 틀려요'; end if;
  if (select count(*) from public.members where room_id = r) >= 8 then raise exception '이 모임은 최대 8명까지예요'; end if;
  insert into public.members (room_id, user_id, name) values (r, my_id, my_name);
end;
$$;

-- 방 암호 바꾸기 (방장만)
create or replace function public.change_room_password(r text, p_password text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not public.is_host(r) then raise exception '모임장만 할 수 있어요'; end if;
  if coalesce(p_password, '') !~ '^\d{1,8}$' then raise exception '암호는 숫자 최대 8자리예요'; end if;
  update public.rooms set password_hash = crypt(p_password, gen_salt('bf')) where id = r;
end;
$$;

-- 모임 안에서 쓰는 내 이름(닉네임) 바꾸기. 계정 이름은 그대로 두고, 같은 모임 안 중복은 막는다
create or replace function public.rename_member(r text, n text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  my_id uuid := public.me();
  t text := trim(coalesce(n, ''));
begin
  if my_id is null then raise exception '로그인이 필요해요'; end if;
  if char_length(t) not between 1 and 10 then raise exception '이름은 1~10글자예요'; end if;
  if not exists (select 1 from public.members where room_id = r and user_id = my_id) then raise exception '이 모임에 참여하지 않았어요'; end if;
  if exists (select 1 from public.members where room_id = r and user_id <> my_id and name = t) then raise exception '이 모임에 같은 이름이 있어요'; end if;
  update public.members set name = t where room_id = r and user_id = my_id;
end;
$$;

-- 함수는 로그인한 기기(익명 포함 authenticated)만 부른다
revoke execute on all functions in schema public from public, anon;
grant execute on function
  public.me(), public.is_member(text), public.is_host(text),
  public.name_taken(text), public.whoami(), public.sign_up(text, text), public.sign_in(text, text), public.sign_out(),
  public.room_preview(text), public.create_room(text, text), public.join_room(text, text), public.change_room_password(text, text),
  public.rename_member(text, text)
  to authenticated;

-- ── 약속 (11/24) ──
-- 한 모임 안에서 계속 잡는 약속. 먼저 만들고(date = null, 날짜 미정) 결과 달력에서 날짜를 확정한다
-- 불가능한 날(off_days)은 그대로 둔다. 읽기는 모임원 모두, 만들기·고치기·지우기는 모임장만. 같은 날짜에는 약속 하나
create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  room_id text not null references public.rooms on delete cascade,
  date date,
  title text not null check (char_length(title) between 1 and 20),
  category text not null default 'etc',
  created_at timestamptz not null default now(),
  unique (room_id, date)
);

alter table public.appointments alter column date drop not null;
alter table public.appointments enable row level security;
drop policy if exists "모임원만 약속 읽기" on public.appointments;
create policy "모임원만 약속 읽기" on public.appointments for select to authenticated using (public.is_member(room_id));
drop policy if exists "모임장만 약속 만들기" on public.appointments;
create policy "모임장만 약속 만들기" on public.appointments for insert to authenticated with check (public.is_host(room_id));
drop policy if exists "모임장만 약속 고치기" on public.appointments;
create policy "모임장만 약속 고치기" on public.appointments for update to authenticated using (public.is_host(room_id)) with check (public.is_host(room_id));
drop policy if exists "모임장만 약속 지우기" on public.appointments;
create policy "모임장만 약속 지우기" on public.appointments for delete to authenticated using (public.is_host(room_id));

revoke all on public.appointments from anon, authenticated;
grant select, insert, delete on public.appointments to authenticated;
grant update (title, category, date) on public.appointments to authenticated;

-- 예전 확정 날짜(rooms.confirmed_date)를 약속으로 옮긴다. 여러 번 실행해도 한 번만 옮겨진다
insert into public.appointments (room_id, date, title, category)
  select id, confirmed_date, title, 'etc' from public.rooms where confirmed_date is not null
  on conflict (room_id, date) do nothing;
update public.rooms set confirmed_date = null where confirmed_date is not null;
