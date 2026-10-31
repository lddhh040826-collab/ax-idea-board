// 체험판 저장소: 서버 대신 이 브라우저의 localStorage에 저장한다.
// 서버로 옮길 때는 api/ 폴더의 함수 안쪽만 바꾸고, 화면은 그대로 둔다.

// v2: 로그인(users)과 방 참여(profiles.user)가 생겨서 예전(v1) 데이터는 읽지 않는다
const KEY = 'eonje:db:v2'
const CHANNEL = 'eonje:realtime'

const empty = () => ({ users: {}, rooms: {}, profiles: [], offDays: [], notes: [] })

export function readDb() {
  try {
    return { ...empty(), ...JSON.parse(localStorage.getItem(KEY) ?? 'null') }
  } catch {
    return empty()
  }
}

export function writeDb(db) {
  localStorage.setItem(KEY, JSON.stringify(db))
}

export function update(fn) {
  const db = readDb()
  const result = fn(db)
  writeDb(db)
  return result
}

// 실시간 전파 대용: 같은 브라우저의 다른 탭으로 변경을 바로 보낸다
const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL) : null

export function publish(event) {
  channel?.postMessage({ ...event, at: Date.now() })
}

export function subscribe(handler) {
  if (!channel) return () => {}
  const onMessage = (e) => handler(e.data)
  channel.addEventListener('message', onMessage)
  return () => channel.removeEventListener('message', onMessage)
}

export function newId(length = 6) {
  const chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let s = ''
  for (let i = 0; i < length; i += 1) s += chars[Math.floor(Math.random() * chars.length)]
  return s
}
