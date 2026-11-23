// 방 (서버판): 브라우저 저장판(../local/rooms.js)과 같은 이름·같은 결과 모양
// 누가 무엇을 읽고 쓸 수 있는지는 DB의 RLS와 함수가 막는다(supabase/schema.sql). 여기 확인은 빠른 안내용이다
import { checkAppointment, checkDate } from '../../lib/appointments.js'
import { AUTH_LIMITS, LIMITS } from '../limits.js'
import { ensureDevice, must, rpc, sb } from './client.js'
import { publish } from './realtime.js'

const ROOM_COLUMNS = 'id, title, host_id, confirmed_date, created_at'

function fail(message) {
  throw new Error(message)
}

function checkTitle(title) {
  const t = title.trim()
  if (!t) fail('모임 이름을 적어 주세요')
  if (t.length > LIMITS.title) fail(`모임 이름은 최대 ${LIMITS.title}글자예요`)
  return t
}

function checkName(name) {
  const n = name.trim()
  if (!n) fail('이름을 적어 주세요')
  if (n.length > AUTH_LIMITS.name) fail(`이름은 최대 ${AUTH_LIMITS.name}글자예요`)
  return n
}

function checkPassword(password) {
  if (!new RegExp(`^\\d{1,${LIMITS.password}}$`).test(password)) fail(`암호는 숫자 최대 ${LIMITS.password}자리예요`)
  return password
}

async function whoami() {
  return (await rpc('whoami'))?.[0] ?? fail('로그인이 필요해요')
}

export async function createRoom({ title, password }) {
  const t = checkTitle(title)
  const pw = checkPassword(password)
  const id = await rpc('create_room', { p_title: t, p_password: pw })
  return { id, title: t, password: pw }
}

// 화면이 쓰는 방 한 개의 전체 모양. 아직 참여하지 않은 방은 이름만(me: null)
export async function loadRoom(roomId) {
  await ensureDevice()
  const me = (await rpc('whoami'))?.[0] ?? null
  const [found] = must(await sb().from('rooms').select(ROOM_COLUMNS).eq('id', roomId))
  if (!found) {
    const [preview] = await rpc('room_preview', { r: roomId })
    if (!preview) return null
    return { room: { id: preview.id, title: preview.title }, isHost: false, me: null, profiles: [], offRows: [], notes: [] }
  }
  const [members, offDays, notes, appointments] = await Promise.all([
    sb().from('members').select('user_id, name, created_at').eq('room_id', roomId).order('created_at').then(must),
    sb().from('off_days').select('user_id, date').eq('room_id', roomId).then(must),
    sb().from('notes').select('user_id, date, text, updated_at').eq('room_id', roomId).then(must),
    // 약속 표(11/24)를 아직 DB에 만들지 않았으면 약속 없이 연다 (supabase/schema.sql을 다시 실행하면 생긴다)
    sb().from('appointments').select('id, date, title, category, created_at').eq('room_id', roomId).order('created_at').then((res) => (res.error ? [] : res.data)),
  ])
  const profiles = members.map((m) => ({ id: m.user_id, name: m.name, createdAt: m.created_at }))
  const nameOf = (id) => profiles.find((p) => p.id === id)?.name ?? ''
  return {
    room: { id: found.id, title: found.title, hostUser: nameOf(found.host_id), hostId: found.host_id, confirmedDate: found.confirmed_date, createdAt: found.created_at },
    isHost: Boolean(me) && found.host_id === me.id,
    me: profiles.find((p) => p.id === me?.id) ?? null,
    profiles,
    offRows: offDays.map((r) => ({ profileId: r.user_id, date: r.date })),
    notes: notes.map((n) => ({ date: n.date, profileId: n.user_id, name: nameOf(n.user_id), text: n.text, updatedAt: n.updated_at })),
    appointments: appointments.map((a) => ({ id: a.id, roomId, date: a.date, title: a.title, category: a.category, createdAt: a.created_at })),
  }
}

// 내가 속한 방: 만든 방과 들어간 방을 한 목록으로, 최근에 들어간 순
export async function listMyRooms() {
  const me = await whoami()
  const mine = must(await sb().from('members').select('room_id, created_at').eq('user_id', me.id))
  if (!mine.length) return []
  const ids = mine.map((m) => m.room_id)
  const [rooms, members] = await Promise.all([
    sb().from('rooms').select(ROOM_COLUMNS).in('id', ids).then(must),
    sb().from('members').select('room_id').in('room_id', ids).then(must),
  ])
  return rooms
    .map((room) => ({
      id: room.id,
      title: room.title,
      confirmedDate: room.confirmed_date,
      isHost: room.host_id === me.id,
      members: members.filter((m) => m.room_id === room.id).length,
      joinedAt: mine.find((m) => m.room_id === room.id).created_at,
    }))
    .sort((a, b) => b.joinedAt.localeCompare(a.joinedAt))
}

export async function joinRoom(roomId, password) {
  await rpc('join_room', { r: roomId, p_password: password })
  publish({ type: 'room_changed', roomId })
}

// 방 나가기: 내 참여 줄을 지우면 내 안 되는 날·메모도 DB가 같이 지운다. 방장은 나갈 수 없고 방을 지운다
export async function leaveRoom(roomId) {
  const me = await whoami()
  const [room] = must(await sb().from('rooms').select('host_id').eq('id', roomId))
  if (!room) fail('모임을 찾을 수 없어요')
  if (room.host_id === me.id) fail('모임장은 나갈 수 없어요. 모임을 삭제해 주세요')
  must(await sb().from('members').delete().eq('room_id', roomId).eq('user_id', me.id))
  publish({ type: 'room_changed', roomId })
}

// changes: [{ date, off }] — 달력에서 손을 뗄 때 바뀐 날만 온다
export async function saveOffDays(roomId, changes) {
  const me = await whoami()
  const add = changes.filter((c) => c.off).map((c) => ({ room_id: roomId, user_id: me.id, date: c.date }))
  const remove = changes.filter((c) => !c.off).map((c) => c.date)
  if (add.length) must(await sb().from('off_days').upsert(add, { onConflict: 'room_id,user_id,date', ignoreDuplicates: true }))
  if (remove.length) must(await sb().from('off_days').delete().eq('room_id', roomId).eq('user_id', me.id).in('date', remove))
  // 알림에는 모임 안에서 쓰는 이름을 보낸다
  const [member] = must(await sb().from('members').select('name').eq('room_id', roomId).eq('user_id', me.id))
  publish({ type: 'offdays_changed', roomId, name: member?.name ?? me.name })
}

// 날짜별 메모. 빈 글이면 그 날짜의 내 메모를 지운다
export async function saveNote(roomId, date, text) {
  const t = text.trim()
  if (t.length > LIMITS.note) fail(`메모는 최대 ${LIMITS.note}자예요`)
  const me = await whoami()
  if (t) {
    must(await sb().from('notes').upsert({ room_id: roomId, user_id: me.id, date, text: t, updated_at: new Date().toISOString() }, { onConflict: 'room_id,user_id,date' }))
  } else {
    must(await sb().from('notes').delete().eq('room_id', roomId).eq('user_id', me.id).eq('date', date))
  }
  publish({ type: 'room_changed', roomId })
}

// 방장만 바꿀 수 있는 칸. RLS에 막히면 0줄이 바뀌므로 그때 안내한다
async function hostUpdate(roomId, values) {
  const rows = must(await sb().from('rooms').update(values).eq('id', roomId).select('id'))
  if (!rows.length) fail('모임장만 할 수 있어요')
  publish({ type: 'room_changed', roomId })
}

// 약속 (모임장만). 누가 쓸 수 있는지는 DB의 RLS가 막는다(supabase/schema.sql 「약속」)
export async function createAppointment(roomId, input) {
  const a = checkAppointment(input)
  const [row] = must(await sb().from('appointments').insert({ room_id: roomId, ...a }).select('id'))
  if (!row) fail('모임장만 할 수 있어요')
  publish({ type: 'room_changed', roomId })
  return { id: row.id, roomId, ...a, date: null }
}

// 날짜 확정(date) 또는 확정 취소(null). 같은 날짜에는 약속 하나 (DB의 unique도 막는다)
export async function setAppointmentDate(roomId, id, date) {
  const d = checkDate(date)
  if (d) {
    const [dup] = must(await sb().from('appointments').select('id').eq('room_id', roomId).eq('date', d).neq('id', id))
    if (dup) fail('이 날짜에는 이미 다른 약속이 있어요')
  }
  const rows = must(await sb().from('appointments').update({ date: d }).eq('id', id).eq('room_id', roomId).select('id'))
  if (!rows.length) fail('모임장만 할 수 있어요')
  publish({ type: 'room_changed', roomId })
}

export async function updateAppointment(roomId, id, input) {
  const { title, category } = checkAppointment(input)
  const rows = must(await sb().from('appointments').update({ title, category }).eq('id', id).eq('room_id', roomId).select('id'))
  if (!rows.length) fail('모임장만 할 수 있어요')
  publish({ type: 'room_changed', roomId })
}

export async function deleteAppointment(roomId, id) {
  const rows = must(await sb().from('appointments').delete().eq('id', id).eq('room_id', roomId).select('id'))
  if (!rows.length) fail('모임장만 할 수 있어요')
  publish({ type: 'room_changed', roomId })
}

// 모임 안의 내 이름 바꾸기 (계정 이름은 그대로). 같은 모임 안 중복은 DB 함수가 막는다
export async function renameMe(roomId, name) {
  await rpc('rename_member', { r: roomId, n: checkName(name) })
  publish({ type: 'room_changed', roomId })
}

export async function renameRoom(roomId, title) {
  const t = checkTitle(title)
  const [room] = must(await sb().from('rooms').select('title').eq('id', roomId))
  if (room?.title === t) fail('현재 모임 이름과 같아요')
  await hostUpdate(roomId, { title: t })
}

export async function changePassword(roomId, password) {
  await rpc('change_room_password', { r: roomId, p_password: checkPassword(password) })
}

export async function deleteRoom(roomId) {
  const rows = must(await sb().from('rooms').delete().eq('id', roomId).select('id'))
  if (!rows.length) fail('모임장만 할 수 있어요')
  publish({ type: 'room_deleted', roomId })
}
