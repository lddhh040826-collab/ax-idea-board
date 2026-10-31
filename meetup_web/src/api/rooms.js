// 방: 만들기, 암호로 입장, 안 되는 날, 메모, 확정
// 로그인한 계정 = 방 안의 내 프로필. 방장 확인도 계정 이름으로 한다.
import { currentUser, getSession } from './auth.js'
import { newId, publish, readDb, update } from './store.js'

export const LIMITS = { title: 10, password: 8, members: 8, note: 100 }

function fail(message) {
  throw new Error(message)
}

function checkTitle(title) {
  const t = title.trim()
  if (!t) fail('방 이름을 적어 주세요')
  if (t.length > LIMITS.title) fail(`방 이름은 최대 ${LIMITS.title}글자예요`)
  return t
}

function checkPassword(password) {
  if (!new RegExp(`^\\d{1,${LIMITS.password}}$`).test(password)) fail(`암호는 숫자 최대 ${LIMITS.password}자리예요`)
  return password
}

// 방장만 할 수 있는 일
function hostRoom(db, roomId) {
  const room = db.rooms[roomId]
  if (!room) fail('방을 찾을 수 없어요')
  if (room.hostUser !== currentUser()) fail('방장만 할 수 있어요')
  return room
}

// 이 방 안의 내 프로필 (방에 들어온 적이 없으면 없음).
// 읽기 함수는 다른 탭에서 로그아웃해도 깨지지 않게 user를 직접 받는다
function myProfile(db, roomId, user = currentUser()) {
  return db.profiles.find((p) => p.roomId === roomId && p.user === user) ?? null
}

function newProfile(roomId, user) {
  return { id: newId(8), roomId, user, name: user, createdAt: new Date().toISOString() }
}

export function createRoom({ title, password }) {
  const user = currentUser()
  const room = {
    id: newId(),
    title: checkTitle(title),
    // 체험판이라 그대로 저장한다. 서버로 옮길 때 해시로 바꾼다
    password: checkPassword(password),
    hostUser: user,
    confirmedDate: null,
    createdAt: new Date().toISOString(),
  }
  update((db) => {
    db.rooms[room.id] = room
    db.profiles.push(newProfile(room.id, user))
  })
  return room
}

// 화면이 쓰는 방 한 개의 전체 모양. 암호는 빼고 돌려준다
export function loadRoom(roomId) {
  const db = readDb()
  const found = db.rooms[roomId]
  if (!found) return null
  const { password: _, ...room } = found
  const user = getSession()?.name ?? null
  return {
    room,
    isHost: Boolean(user) && room.hostUser === user,
    me: user ? myProfile(db, roomId, user) : null,
    profiles: db.profiles.filter((p) => p.roomId === roomId),
    offRows: db.offDays.filter((r) => r.roomId === roomId),
    notes: db.notes.filter((n) => n.roomId === roomId),
  }
}

// 내가 속한 방: 만든 방과 들어간 방을 한 목록으로, 최근에 들어간 순
export function listMyRooms() {
  const db = readDb()
  const user = getSession()?.name
  if (!user) return []
  return db.profiles
    .filter((p) => p.user === user && db.rooms[p.roomId])
    .map((p) => {
      const room = db.rooms[p.roomId]
      return {
        id: room.id,
        title: room.title,
        confirmedDate: room.confirmedDate,
        isHost: room.hostUser === user,
        members: db.profiles.filter((x) => x.roomId === room.id).length,
        joinedAt: p.createdAt,
      }
    })
    .sort((a, b) => b.joinedAt.localeCompare(a.joinedAt))
}

// 처음 들어가는 방: 암호를 맞히면 내 계정으로 참여한다
export function joinRoom(roomId, password) {
  update((db) => {
    const room = db.rooms[roomId]
    if (!room) fail('방을 찾을 수 없어요')
    if (myProfile(db, roomId)) return
    if (room.password !== password) fail('비밀번호가 틀려요')
    if (db.profiles.filter((p) => p.roomId === roomId).length >= LIMITS.members) fail(`이 방은 최대 ${LIMITS.members}명까지예요`)
    db.profiles.push(newProfile(roomId, currentUser()))
  })
  publish({ type: 'room_changed', roomId })
}

// 방 나가기: 내 프로필과 내가 표시한 날·메모를 지운다. 방장은 나갈 수 없고 방을 지운다
export function leaveRoom(roomId) {
  update((db) => {
    const room = db.rooms[roomId]
    if (!room) fail('방을 찾을 수 없어요')
    if (room.hostUser === currentUser()) fail('방장은 나갈 수 없어요. 방을 삭제해 주세요')
    const me = myProfile(db, roomId)
    if (!me) return
    db.profiles = db.profiles.filter((p) => p.id !== me.id)
    db.offDays = db.offDays.filter((r) => !(r.roomId === roomId && r.profileId === me.id))
    db.notes = db.notes.filter((n) => !(n.roomId === roomId && n.profileId === me.id))
  })
  publish({ type: 'room_changed', roomId })
}

// changes: [{ date, off }] — 달력에서 손을 뗄 때 바뀐 날만 온다
export function saveOffDays(roomId, changes) {
  let me
  update((db) => {
    const room = db.rooms[roomId]
    if (!room) fail('방을 찾을 수 없어요')
    me = myProfile(db, roomId) ?? fail('이 방에 참여하지 않았어요')
    for (const { date, off } of changes) {
      const i = db.offDays.findIndex((r) => r.roomId === roomId && r.profileId === me.id && r.date === date)
      if (off && i < 0) db.offDays.push({ roomId, profileId: me.id, date })
      if (!off && i >= 0) db.offDays.splice(i, 1)
    }
  })
  publish({ type: 'offdays_changed', roomId, profileId: me.id, name: me.name })
}

// 날짜별 메모. 빈 글이면 그 날짜의 내 메모를 지운다
export function saveNote(roomId, date, text) {
  const t = text.trim()
  if (t.length > LIMITS.note) fail(`메모는 최대 ${LIMITS.note}자예요`)
  update((db) => {
    const me = myProfile(db, roomId) ?? fail('이 방에 참여하지 않았어요')
    db.notes = db.notes.filter((n) => !(n.roomId === roomId && n.date === date && n.profileId === me.id))
    if (t) db.notes.push({ roomId, date, profileId: me.id, name: me.name, text: t, updatedAt: new Date().toISOString() })
  })
  publish({ type: 'room_changed', roomId })
}

export function confirmDate(roomId, date) {
  update((db) => {
    hostRoom(db, roomId).confirmedDate = date
  })
  publish({ type: 'room_changed', roomId })
}

export function cancelConfirm(roomId) {
  update((db) => {
    hostRoom(db, roomId).confirmedDate = null
  })
  publish({ type: 'room_changed', roomId })
}

export function renameRoom(roomId, title) {
  const t = checkTitle(title)
  update((db) => {
    const room = hostRoom(db, roomId)
    if (room.title === t) fail('현재 방 이름과 같아요')
    room.title = t
  })
  publish({ type: 'room_changed', roomId })
}

export function changePassword(roomId, password) {
  const pw = checkPassword(password)
  update((db) => {
    hostRoom(db, roomId).password = pw
  })
}

export function deleteRoom(roomId) {
  update((db) => {
    hostRoom(db, roomId)
    delete db.rooms[roomId]
    db.profiles = db.profiles.filter((p) => p.roomId !== roomId)
    db.offDays = db.offDays.filter((r) => r.roomId !== roomId)
    db.notes = db.notes.filter((n) => n.roomId !== roomId)
  })
  publish({ type: 'room_deleted', roomId })
}

export function roomLink(roomId) {
  return `${window.location.origin}/r/${roomId}`
}

// 붙여 넣은 글에서 방 id를 찾는다: 전체 링크든 '/r/abc123'이든
export function parseRoomLink(text) {
  return text.trim().match(/\/r\/([A-Za-z0-9]{4,})/)?.[1] ?? null
}
