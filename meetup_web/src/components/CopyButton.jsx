import { useState } from 'react'

export default function CopyButton({ text, label, className = 'btn' }) {
  const [done, setDone] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // http 주소 등에서 클립보드 API가 막히면 예전 방식으로 복사
      const ta = document.createElement('textarea')
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      ta.remove()
    }
    setDone(true)
    setTimeout(() => setDone(false), 1500)
  }
  return (
    <button type="button" className={className} onClick={copy}>
      {done ? '복사됨 ✓' : label}
    </button>
  )
}
