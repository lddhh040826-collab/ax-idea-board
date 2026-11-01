import { useEffect, useState } from 'react'

// 자동(기기 설정 따라감) → 라이트 → 다크 순서로 돌아간다. 고른 값은 이 브라우저에 기억한다.
// 첫 화면 깜빡임을 막으려고 index.html에서도 같은 키를 읽어 미리 적용한다
const KEY = 'meetup.theme'
const MODES = {
  system: { icon: '🖥️', label: '자동' },
  light: { icon: '☀️', label: '라이트' },
  dark: { icon: '🌙', label: '다크' },
}
const ORDER = ['system', 'light', 'dark']

function readMode() {
  try {
    const saved = localStorage.getItem(KEY)
    return ORDER.includes(saved) ? saved : 'system'
  } catch {
    return 'system'
  }
}

export default function ThemeToggle() {
  const [mode, setMode] = useState(readMode)

  useEffect(() => {
    const root = document.documentElement
    if (mode === 'system') root.removeAttribute('data-theme')
    else root.setAttribute('data-theme', mode)
    try {
      if (mode === 'system') localStorage.removeItem(KEY)
      else localStorage.setItem(KEY, mode)
    } catch {
      // 저장이 막혀도 이번 화면에서는 바뀐 모드가 그대로 보인다
    }
  }, [mode])

  const next = ORDER[(ORDER.indexOf(mode) + 1) % ORDER.length]
  const { icon, label } = MODES[mode]
  return (
    <button
      type="button"
      className="theme-btn"
      onClick={() => setMode(next)}
      aria-label={`화면 모드: ${label}. 누르면 ${MODES[next].label}(으)로 바뀌어요`}
      title={`화면 모드: ${label}`}
    >
      <span aria-hidden="true">{icon}</span> <span className="theme-label">{label}</span>
    </button>
  )
}
