// 처음 들어가는 방: 방 암호를 맞히면 내 계정으로 참여한다
import { useState } from 'react'
import { joinRoom } from '../api/rooms.js'
import Sheet from './Sheet.jsx'

export default function PasswordGate({ room, onJoin }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const submit = (e) => {
    e.preventDefault()
    try {
      joinRoom(room.id, password)
      onJoin()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <Sheet band="암호 입력" className="center">
      <h1>{room.title} 방에 참여</h1>
      <p className="muted small">방 암호는 방장에게 물어보세요. 한 번 들어가면 내 방 목록에 계속 남아요.</p>
      <form className="stack narrow" onSubmit={submit}>
        <input
          value={password}
          inputMode="numeric"
          autoFocus
          aria-label="암호"
          placeholder="숫자 암호"
          onChange={(e) => { setPassword(e.target.value.replace(/\D/g, '')); setError('') }}
        />
        {error && <p className="error">{error}</p>}
        <button className="btn primary wide" type="submit" disabled={!password}>참여하기</button>
      </form>
    </Sheet>
  )
}
