// 로그인 (서버판): 이름이 곧 아이디, 비밀번호는 4글자. 확인과 잠금(5번 틀리면 5분)은 DB 함수가 한다
// 로그인 유지: 마지막으로 쓴 때(lastSeen)부터 10분 안에 다시 열면 그 계정 그대로, 넘으면 다시 로그인한다
import { AUTH_LIMITS, SESSION_TTL_MS } from '../limits.js'
import { rpc } from './client.js'

const SEEN_KEY = 'eonje:seen:v1'

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

function markSeen() {
  localStorage.setItem(SEEN_KEY, String(Date.now()))
}

export async function getSession() {
  const last = Number(localStorage.getItem(SEEN_KEY) ?? 0)
  if (!last) return null
  if (Date.now() - last > SESSION_TTL_MS) {
    await signOut()
    return null
  }
  const me = (await rpc('whoami'))?.[0]
  if (!me) {
    localStorage.removeItem(SEEN_KEY)
    return null
  }
  return { name: me.name, lastSeen: last }
}

// 앱을 쓰는 동안 마지막으로 쓴 때를 갱신한다. 이미 풀린 로그인은 되살리지 않는다
export async function touchSession() {
  const session = await getSession()
  if (session) markSeen()
  return session
}

export async function accountExists(name) {
  return rpc('name_taken', { n: name.trim() })
}

export async function signIn(name, password) {
  const n = checkName(name)
  const result = await rpc('sign_in', { n, p: password })
  if (result === 'missing') fail('없는 이름이에요')
  if (result === 'wrong') fail('비밀번호가 틀려요')
  if (result === 'locked') fail('비밀번호를 5번 틀려서 5분 동안 잠겼어요. 잠시 뒤 다시 해 주세요')
  markSeen()
  return { name: n }
}

export async function signUp(name, password) {
  const n = checkName(name)
  await rpc('sign_up', { n, p: checkPassword(password) })
  markSeen()
  return { name: n }
}

export async function signOut() {
  localStorage.removeItem(SEEN_KEY)
  // 로그인 전에 열려던 링크 기억도 지운다 (hooks/useSession.js)
  sessionStorage.removeItem('eonje:return-to')
  await rpc('sign_out').catch(() => {})
}
