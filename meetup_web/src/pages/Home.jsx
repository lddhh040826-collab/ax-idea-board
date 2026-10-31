// 처음 화면(로그인 후): 내가 속한 방 목록 + 방 만들기 + 받은 링크로 들어가기
import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { listMyRooms, parseRoomLink } from '../api/rooms.js'
import Sheet from '../components/Sheet.jsx'
import { formatDate } from '../lib/dates.js'
import { useSession } from '../hooks/useSession.js'

export default function Home() {
  const { session } = useSession()
  const navigate = useNavigate()
  const [link, setLink] = useState('')
  const [error, setError] = useState('')
  const rooms = listMyRooms()
  // 방 삭제·나가기 후 넘어오면 한 줄 안내
  const message = useLocation().state?.message

  const go = (e) => {
    e.preventDefault()
    const id = parseRoomLink(link)
    if (!id) return setError('유효하지 않은 링크예요')
    navigate(`/r/${id}`)
  }

  return (
    <>
      <Sheet band={`${session.name}님의 방`}>
        {message && <p className="note small">{message}</p>}
        <div className="row between">
          <p className="muted small">{rooms.length ? '최근에 들어간 방부터 보여요' : ''}</p>
          <Link className="btn primary" to="/new">방 만들기</Link>
        </div>
        {rooms.length ? (
          <ul className="list">
            {rooms.map((r) => (
              <li key={r.id}>
                <Link className="room-item" to={`/r/${r.id}`}>
                  <span>
                    <b>{r.title}</b>
                    {r.isHost && <em className="tag">방장</em>}
                    <span className="muted small"> · {r.members}명</span>
                  </span>
                  {r.confirmedDate ? <span className="pill">{formatDate(r.confirmedDate)} 확정</span> : <span className="muted small">정하는 중</span>}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted top-gap">아직 속한 방이 없어요. 방을 만들거나 친구에게 받은 링크로 들어가 보세요.</p>
        )}
      </Sheet>

      <Sheet band="받은 링크로 들어가기">
        <form className="row" onSubmit={go}>
          <input value={link} onChange={(e) => { setLink(e.target.value); setError('') }} placeholder="방 링크 붙여넣기" aria-label="방 링크" />
          <button className="btn" type="submit">들어가기</button>
        </form>
        {error && <p className="error">{error}</p>}
      </Sheet>
    </>
  )
}
