// 로그인: 이름이 곧 아이디, 비밀번호는 4글자.
// 체험판이라 계정과 로그인 상태를 이 브라우저에 저장한다. 서버로 옮길 때 비밀번호는 해시로 바꾼다.
// 로그인 유지: 마지막으로 쓴 때(lastSeen)부터 10분 안에 다시 열면 그 계정 그대로, 넘으면 다시 로그인한다.
import { readDb, update } from './store.js'

export const AUTH_LIMITS = { name: 10, password: 4 }

const SESSION_KEY = 'eonje:session:v1'
export const SESSION_TTL_MS = 10 * 60 * 1000

function fail(message) {
  throw new Error(message)
}

function checkName(name) {
  const n = name.trim()
  if (!n) fail('이름을 적어 주세요')
  if (n.length > AUTH_LIMITS.name) fail(`이름은 최대 ${AUTH_LIMITS.name}글자예요`)
  return n
}

function checkPassword(password) {
  if ([...password].length !== AUTH_LIMITS.password) fail(`비밀번호는 ${AUTH_LIMITS.password}글자예요`)
  return password
}

function startSession(name) {
  const now = Date.now()
  const session = { name, signedInAt: now, lastSeen: now }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  return session
}

// 마지막으로 쓴 지 10분이 넘었거나, 저장소가 비워져 계정이 사라졌으면 로그인이 풀린 것으로 본다
export function getSession() {
  try {
    const session = JSON.parse(localStorage.getItem(SESSION_KEY) ?? 'null')
    if (!session?.name) return null
    if (Date.now() - (session.lastSeen ?? session.signedInAt ?? 0) > SESSION_TTL_MS || !readDb().users[session.name]) {
      localStorage.removeItem(SESSION_KEY)
      return null
    }
    return session
  } catch {
    // 깨진 값이면 로그아웃 상태
    return null
  }
}

// 앱을 쓰는 동안 마지막으로 쓴 때를 갱신한다. 이미 풀린 로그인은 되살리지 않는다
export function touchSession() {
  const session = getSession()
  if (!session) return null
  const next = { ...session, lastSeen: Date.now() }
  localStorage.setItem(SESSION_KEY, JSON.stringify(next))
  return next
}

export function currentUser() {
  return getSession()?.name ?? fail('로그인이 필요해요')
}

export function accountExists(name) {
  return Boolean(readDb().users[name.trim()])
}

export function signIn(name, password) {
  const n = checkName(name)
  const user = readDb().users[n]
  if (!user) fail('없는 이름이에요')
  if (user.password !== password) fail('비밀번호가 틀려요')
  return startSession(n)
}

export function signUp(name, password) {
  const n = checkName(name)
  const pw = checkPassword(password)
  update((db) => {
    if (db.users[n]) fail('이미 있는 이름이에요')
    db.users[n] = { name: n, password: pw, createdAt: new Date().toISOString() }
  })
  return startSession(n)
}

export function signOut() {
  localStorage.removeItem(SESSION_KEY)
  // 로그인 전에 열려던 링크 기억도 지운다 (hooks/useSession.js)
  sessionStorage.removeItem('eonje:return-to')
}
