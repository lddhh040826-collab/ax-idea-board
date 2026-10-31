import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { getSession, signOut, touchSession } from './api/auth.js'
import { SessionContext, rememberReturnPath, useSession } from './hooks/useSession.js'
import Home from './pages/Home.jsx'
import Login from './pages/Login.jsx'
import Room from './pages/Room.jsx'
import RoomNew from './pages/RoomNew.jsx'
import ThemeToggle from './components/ThemeToggle.jsx'

// 로그인 안 됐으면 로그인 화면으로 보내고, 로그인 후 원래 링크로 돌아오게 기억한다
function RequireLogin({ children }) {
  const { session } = useSession()
  const location = useLocation()
  if (!session) {
    if (location.pathname !== '/') rememberReturnPath(location.pathname)
    return <Navigate to="/login" replace />
  }
  return children
}

export default function App() {
  const [session, setSession] = useState(() => getSession())
  const value = useMemo(() => ({ session, setSession }), [session])

  // 열어 둔 동안 1분마다, 그리고 탭을 가리거나 닫을 때 「마지막으로 쓴 때」를 남긴다.
  // 10분 넘게 비웠다가 돌아오면(절전 등) 로그인이 풀린 것으로 보고 로그인 화면으로 보낸다
  const signedIn = Boolean(session)
  useEffect(() => {
    if (!signedIn) return undefined
    const touch = () => {
      if (!touchSession()) setSession(null)
    }
    touch()
    const timer = setInterval(touch, 60 * 1000)
    document.addEventListener('visibilitychange', touch)
    window.addEventListener('pagehide', touch)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', touch)
      window.removeEventListener('pagehide', touch)
    }
  }, [signedIn])

  return (
    <SessionContext.Provider value={value}>
      <header className="topbar">
        <Link to="/" className="brand">
          <span className="brand-mark" aria-hidden="true" />
          언제볼래
        </Link>
        <div className="row">
          <ThemeToggle />
          {session && (
            <nav className="row">
              <span className="small"><b>{session.name}</b>님</span>
              <button
                type="button"
                className="link plain"
                onClick={() => {
                  // 처음 화면에서 새로 시작한다. 다음에 로그인하는 사람이 보던 방으로 끌려가지 않게 한다
                  signOut()
                  window.location.replace('/')
                }}
              >
                로그아웃
              </button>
            </nav>
          )}
        </div>
      </header>
      <main className="page">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<RequireLogin><Home /></RequireLogin>} />
          <Route path="/new" element={<RequireLogin><RoomNew /></RequireLogin>} />
          <Route path="/r/:id" element={<RequireLogin><Room /></RequireLogin>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <footer className="footnote">
        체험판 · 계정과 방은 이 브라우저에만 저장돼요. 친구와 실제로 함께 쓰려면 서버 저장을 붙여야 해요.
      </footer>
    </SessionContext.Provider>
  )
}
