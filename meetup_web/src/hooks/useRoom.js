// 방 하나를 불러오고, 다른 사람(다른 기기·다른 탭)의 변경 알림을 받으면 다시 읽는다.
// data: undefined = 불러오는 중, null = 없는 방
import { useCallback, useEffect, useRef, useState } from 'react'
import { subscribeRoom } from '../api/realtime.js'
import { loadRoom } from '../api/rooms.js'

export function useRoom(roomId, { onRemoteChange } = {}) {
  const [data, setData] = useState(undefined)
  const [error, setError] = useState('')
  // 늦게 도착한 옛 응답이 새 응답을 덮어쓰지 않게 요청마다 번호를 매긴다
  const seq = useRef(0)

  const reload = useCallback(async () => {
    const n = ++seq.current
    try {
      const next = await loadRoom(roomId)
      if (n === seq.current) {
        setData(next)
        setError('')
      }
    } catch (err) {
      if (n === seq.current) setError(err.message)
    }
  }, [roomId])

  // 저장이 끝나기 전에 화면부터 바꿀 때 쓴다 (다음 reload가 서버 값으로 맞춘다)
  const patch = useCallback((fn) => {
    seq.current += 1
    setData((d) => (d ? fn(d) : d))
  }, [])

  useEffect(() => {
    setData(undefined)
    reload()
    return subscribeRoom(roomId, (event) => {
      reload()
      onRemoteChange?.(event)
    })
  }, [roomId, reload, onRemoteChange])

  return { data, error, reload, patch }
}
