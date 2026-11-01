// 방마다 Supabase Realtime 방송 채널 하나(room:<id>). 바꾼 사람이 알리면 같은 방을 연 다른 사람이 다시 읽는다
// 방송에는 데이터가 없고 「바뀌었다」는 신호만 있다. 실제 데이터는 RLS를 거쳐 다시 읽는다
import { sb } from './client.js'

const rooms = new Map() // roomId → { channel, ready, handlers }

function join(roomId) {
  let entry = rooms.get(roomId)
  if (entry) return entry
  const channel = sb().channel(`room:${roomId}`)
  const handlers = new Set()
  channel.on('broadcast', { event: 'change' }, ({ payload }) => handlers.forEach((h) => h(payload)))
  const ready = new Promise((resolve) => {
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') resolve(status)
    })
  })
  entry = { channel, ready, handlers }
  rooms.set(roomId, entry)
  return entry
}

function leaveIfIdle(roomId) {
  const entry = rooms.get(roomId)
  if (!entry || entry.handlers.size) return
  rooms.delete(roomId)
  sb().removeChannel(entry.channel)
}

export function subscribeRoom(roomId, handler) {
  const entry = join(roomId)
  entry.handlers.add(handler)
  return () => {
    entry.handlers.delete(handler)
    leaveIfIdle(roomId)
  }
}

// 알림은 실패해도 저장은 이미 끝났으니 조용히 넘어간다
export async function publish(event) {
  try {
    const entry = join(event.roomId)
    if ((await entry.ready) === 'SUBSCRIBED') {
      await entry.channel.send({ type: 'broadcast', event: 'change', payload: { ...event, at: Date.now() } })
    }
    leaveIfIdle(event.roomId)
  } catch {
    // 무시
  }
}
