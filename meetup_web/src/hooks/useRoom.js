// 방 하나를 불러오고 다른 탭의 변경을 구독한다.
// 받은 이벤트로 방 전체를 다시 읽는다 (체험판은 저장소가 같은 브라우저 안이라 비용이 없다).
import { useCallback, useEffect, useState } from 'react'
import { loadRoom } from '../api/rooms.js'
import { subscribe } from '../api/store.js'

export function useRoom(roomId, { onRemoteChange } = {}) {
  const [data, setData] = useState(() => loadRoom(roomId))
  const reload = useCallback(() => setData(loadRoom(roomId)), [roomId])

  useEffect(() => {
    reload()
    const unsubscribe = subscribe((event) => {
      if (event.roomId !== roomId) return
      reload()
      onRemoteChange?.(event)
    })
    // 다른 창에서 저장소가 바뀐 경우의 예비 경로
    const onStorage = (e) => e.key?.startsWith('eonje:') && reload()
    window.addEventListener('storage', onStorage)
    return () => {
      unsubscribe()
      window.removeEventListener('storage', onStorage)
    }
  }, [roomId, reload, onRemoteChange])

  return { data, reload }
}
