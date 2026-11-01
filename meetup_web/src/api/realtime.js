// 방 하나의 변경 알림 구독. 서버판은 Supabase Realtime 방송, 브라우저 저장판은 같은 브라우저의 다른 탭
import { remote } from './backend.js'
import * as local from './local/store.js'
import * as server from './server/realtime.js'

// handler(event): event = { type, roomId, name? }. 돌려준 함수를 부르면 구독을 끝낸다
export function subscribeRoom(roomId, handler) {
  return remote ? server.subscribeRoom(roomId, handler) : local.subscribeRoom(roomId, handler)
}
