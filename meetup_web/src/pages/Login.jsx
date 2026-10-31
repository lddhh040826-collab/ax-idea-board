// 로그인: 이름이 아이디, 비밀번호 4글자. 없는 이름이면 한 번 물어보고 가입시킨다.
// 끝나면 열려던 방 링크(없으면 처음 화면)로 보낸다
import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { AUTH_LIMITS, accountExists, signIn, signUp } from '../api/auth.js'
import Sheet from '../components/Sheet.jsx'
import { takeReturnPath, useSession } from '../hooks/useSession.js'

export default function Login() {
  const { session, setSession } = useSession()
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [goTo, setGoTo] = useState(null)
  if (session) return <Navigate to={goTo ?? '/'} replace />

  const submit = (e) => {
    e.preventDefault()
    try {
      let next
      if (accountExists(name)) {
        next = signIn(name, password)
      } else {
        if (!window.confirm(`'${name.trim()}'은(는) 처음 보는 이름이에요.\n이 이름과 비밀번호로 새로 가입할까요?`)) return
        next = signUp(name, password)
      }
      setGoTo(takeReturnPath() ?? '/')
      setSession(next)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <>
      <div className="hero">
        <p className="hero-sub">약속 잡기 힘든 친구들</p>
        <h1 className="hero-title">안 되는 날만 X 치면 끝</h1>
      </div>
      <Sheet band="로그인">
        <form className="stack narrow" onSubmit={submit}>
          <label className="field">
            <span>이름 (아이디, 최대 {AUTH_LIMITS.name}글자)</span>
            <input value={name} maxLength={AUTH_LIMITS.name} autoFocus autoComplete="username" onChange={(e) => { setName(e.target.value); setError('') }} placeholder="예: 다현" />
          </label>
          <label className="field">
            <span>비밀번호 ({AUTH_LIMITS.password}글자)</span>
            <input
              type="password"
              value={password}
              maxLength={AUTH_LIMITS.password}
              autoComplete="current-password"
              onChange={(e) => { setPassword(e.target.value); setError('') }}
            />
          </label>
          {error && <p className="error">{error}</p>}
          <button className="btn primary wide" type="submit" disabled={!name.trim() || [...password].length !== AUTH_LIMITS.password}>
            들어가기
          </button>
          <p className="muted small center-text">처음이면 이 이름으로 바로 가입돼요. 이름은 방 안에서 그대로 보여요.</p>
        </form>
      </Sheet>
    </>
  )
}
