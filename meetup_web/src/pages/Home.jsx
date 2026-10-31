// 처음 화면(로그인 후): 내가 속한 방 목록(방장은 삭제, 모임원은 나가기) + 방 만들기 + 받은 링크로 들어가기
import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { deleteRoom, leaveRoom, listMyRooms, parseRoomLink } from '../api/rooms.js'
import Sheet from '../components/Sheet.jsx'
import { useSession } from '../hooks/useSession.js'

export default function Home() {
  const { session } = useSession()
  const navigate = useNavigate()
  const [link, setLink] = useState('')
  const [error, setError] = useState('')
  // 목록에서 삭제·나가기를 하면 다시 읽도록 바꾸는 값
  const [, setVersion] = useState(0)
  const [notice, setNotice] = useState('')
  const location = useLocation()
  const rooms = listMyRooms()
  // 방 안에서 삭제·나가기를 하고 넘어오면 한 줄 안내
  const message = notice || location.state?.message

  const remove = (r) => {
    const ask = r.isHost
      ? `'${r.title}' 모임을 삭제할까요?\n모든 모임원의 표시와 메모도 함께 지워지고, 되돌릴 수 없어요.`
      : `'${r.title}' 모임에서 나갈까요?\n내가 표시한 날짜와 메모도 함께 지워져요.`
    if (!window.confirm(ask)) return
    try {
      if (r.isHost) deleteRoom(r.id)
      else leaveRoom(r.id)
      setNotice(r.isHost ? '모임을 삭제했어요' : '모임에서 나왔어요')
    } catch (err) {
      setNotice(err.message)
    }
    setVersion((v) => v + 1)
  }

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
              <li key={r.id} className="room-row">
                <Link className="room-item" to={`/r/${r.id}`}>
                  <span>
                    <b>{r.title}</b>
                    {r.isHost && <em className="tag">방장</em>}
                    <span className="muted small"> · {r.members}명</span>
                  </span>
                </Link>
                <button type="button" className="btn danger room-action" onClick={() => remove(r)}>
                  {r.isHost ? '삭제' : '나가기'}
                </button>
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
