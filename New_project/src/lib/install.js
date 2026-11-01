import { useEffect, useState } from 'react'

// 브라우저가 "설치할 수 있다"고 알려 줄 때만 [앱으로 설치] 버튼을 보여 준다.
// 이미 설치한 앱 창에서 열었거나 Safari처럼 설치 이벤트가 없는 브라우저에서는 버튼이 나오지 않는다.
export function useInstallPrompt() {
  const [prompt, setPrompt] = useState(null)

  useEffect(() => {
    const onPrompt = (e) => {
      e.preventDefault()
      setPrompt(e)
    }
    const onInstalled = () => setPrompt(null)
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  async function install() {
    if (!prompt) return
    prompt.prompt()
    await prompt.userChoice
    setPrompt(null)
  }

  return prompt ? install : null
}
