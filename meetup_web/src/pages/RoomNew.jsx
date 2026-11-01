// 방 만들기: 이름(최대 10글자) + 숫자 암호(최대 8자리). 만들면 링크를 보여 준다
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { LIMITS, createRoom, roomLink } from '../api/rooms.js'
import CopyButton from '../components/CopyButton.jsx'
import Sheet from '../components/Sheet.jsx'

export default function RoomNew() {
  const [title, setTitle] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [room, setRoom] = useState(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      setRoom(await createRoom({ title, password }))
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (room) {
    const link = roomLink(room.id)
    return (
      <Sheet band="방을 만들었어요" className="center">
        <h1>{room.title}</h1>
        <p className="muted">링크와 암호를 친구에게 보내 주세요.</p>
        <div className="link-box">{link}</div>
        <p>암호 <b className="mono">{room.password}</b></p>
        <div className="row wrap center-row">
          <CopyButton text={`[${room.title}] 안 되는 날을 표시해 줘!\n${link}\n암호: ${room.password}`} label="링크+암호 복사" className="btn" />
          <Link className="btn primary" to={`/r/${room.id}`}>방 들어가기</Link>
        </div>
      </Sheet>
    )
  }

  return (
    <>
      <Link className="back" to="/">‹ 내 방 목록</Link>
      <Sheet band="방 만들기">
        <form className="stack narrow" onSubmit={submit}>
          <label className="field">
            <span>방 이름 (최대 {LIMITS.title}글자)</span>
            <input value={title} maxLength={LIMITS.title} onChange={(e) => { setTitle(e.target.value); setError('') }} placeholder="예: 동기 송년회" autoFocus />
          </label>
          <label className="field">
            <span>암호 (숫자 최대 {LIMITS.password}자리)</span>
            <input
              value={password}
              inputMode="numeric"
              maxLength={LIMITS.password}
              onChange={(e) => { setPassword(e.target.value.replace(/\D/g, '')); setError('') }}
              placeholder="예: 1234"
            />
          </label>
          <p className="muted small">암호는 친구에게 공유해 주세요. 링크와 암호를 아는 사람만 들어올 수 있어요.</p>
          {error && <p className="error">{error}</p>}
          <button className="btn primary wide" type="submit" disabled={busy || !title.trim() || !password}>{busy ? '만드는 중…' : '만들기'}</button>
        </form>
      </Sheet>
    </>
  )
}
