// 체험판 저장소: 서버 설정이 없을 때 이 브라우저의 localStorage에 저장한다.

// v2: 로그인(users)과 방 참여(profiles.user)가 생겨서 예전(v1) 데이터는 읽지 않는다
const KEY = 'eonje:db:v2'
const CHANNEL = 'eonje:realtime'

const empty = () => ({ users: {}, rooms: {}, profiles: [], offDays: [], notes: [], appointments: [] })

export function readDb() {
  let db
  try {
    db = { ...empty(), ...JSON.parse(localStorage.getItem(KEY) ?? 'null') }
  } catch {
    return empty()
  }
  // 11/24: 모임마다 하나였던 확정 날짜(confirmedDate)를 약속 목록으로 옮긴다 (한 번만)
  let moved = false
  for (const room of Object.values(db.rooms)) {
    if (!room.confirmedDate) continue
    if (!db.appointments.some((a) => a.roomId === room.id && a.date === room.confirmedDate)) {
      db.appointments.push({ id: newId(8), roomId: room.id, date: room.confirmedDate, title: room.title, category: 'etc', createdAt: new Date().toISOString() })
    }
    room.confirmedDate = null
    moved = true
  }
  if (moved) writeDb(db)
  return db
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

// 방 하나의 변경을 듣는다. 다른 창에서 저장소가 바뀐 경우(storage 이벤트)도 예비로 듣는다
export function subscribeRoom(roomId, handler) {
  const onMessage = (e) => e.data?.roomId === roomId && handler(e.data)
  const onStorage = (e) => e.key?.startsWith('eonje:') && handler({ type: 'room_changed', roomId })
  channel?.addEventListener('message', onMessage)
  window.addEventListener('storage', onStorage)
  return () => {
    channel?.removeEventListener('message', onMessage)
    window.removeEventListener('storage', onStorage)
  }
}

export function newId(length = 6) {
  const chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let s = ''
  for (let i = 0; i < length; i += 1) s += chars[Math.floor(Math.random() * chars.length)]
  return s
}
