// "저장됨", "방금 ○○님이 시간을 바꿨어요" 같은 잠깐 뜨는 알림
import { useCallback, useState } from 'react'

export function useToasts() {
  const [toasts, setToasts] = useState([])
  const push = useCallback((text, tone = 'info') => {
    const id = Math.random()
    setToasts((t) => [...t.slice(-2), { id, text, tone }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3000)
  }, [])
  return { toasts, push }
}

export default function Toasts({ toasts }) {
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.tone}`}>{t.text}</div>
      ))}
    </div>
  )
}
