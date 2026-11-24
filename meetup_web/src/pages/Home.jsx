// 처음 화면(로그인 후): 내가 속한 모임 목록(최신순·가나다순, 모임장은 삭제, 모임원은 나가기) + 모임 만들기 + 받은 링크로 들어가기
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { deleteRoom, leaveRoom, listMyRooms, parseRoomLink } from '../api/rooms.js'
import Sheet from '../components/Sheet.jsx'
import { useSession } from '../hooks/useSession.js'

export default function Home() {
  const { session } = useSession()
  const navigate = useNavigate()
  const [link, setLink] = useState('')
  const [error, setError] = useState('')
  // 목록에서 삭제·나가기를 하면 다시 읽도록 바꾸는 값
  const [version, setVersion] = useState(0)
  // 실패했을 때만 한 줄 안내 (성공 안내는 띄우지 않는다)
  const [problem, setProblem] = useState('')
  // null = 불러오는 중
  const [rooms, setRooms] = useState(null)
  const [sort, setSort] = useState('recent') // recent = 최신순(최근에 참여한 순), name = 가나다순

  useEffect(() => {
    listMyRooms()
      .then(setRooms)
      .catch((err) => {
        setRooms([])
        setProblem(err.message)
      })
  }, [version])

  const shown = useMemo(() => {
    if (!rooms) return rooms
    if (sort === 'name') return [...rooms].sort((a, b) => a.title.localeCompare(b.title, 'ko'))
    return rooms
  }, [rooms, sort])

  const remove = async (r) => {
    const ask = r.isHost
      ? `'${r.title}' 모임을 삭제할까요?\n모든 모임원의 표시와 메모도 함께 지워지고, 되돌릴 수 없어요.`
      : `'${r.title}' 모임에서 나갈까요?\n내가 표시한 날짜와 메모도 함께 지워져요.`
    if (!window.confirm(ask)) return
    setProblem('')
    try {
      if (r.isHost) await deleteRoom(r.id)
      else await leaveRoom(r.id)
    } catch (err) {
      setProblem(err.message)
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
      <Sheet band={`${session.name}님의 모임`} action={<Link className="band-btn" to="/new">+ 모임 만들기</Link>}>
        {problem && <p className="error small">{problem}</p>}
        {shown === null ? (
          <p className="muted top-gap">불러오는 중…</p>
        ) : shown.length ? (
          <>
            {shown.length > 1 && (
              <div className="list-head">
                <div className="sort-seg" role="tablist" aria-label="정렬">
                  <button type="button" role="tab" aria-selected={sort === 'recent'} className={sort === 'recent' ? 'on' : ''} onClick={() => setSort('recent')}>최신순</button>
                  <button type="button" role="tab" aria-selected={sort === 'name'} className={sort === 'name' ? 'on' : ''} onClick={() => setSort('name')}>가나다순</button>
                </div>
              </div>
            )}
            <ul className="list">
              {shown.map((r) => (
                <li key={r.id} className="room-row">
                  <Link className="room-item" to={`/r/${r.id}`}>
                    <span>
                      <b>{r.title}</b>
                      {r.isHost && <em className="tag">모임장</em>}
                      <span className="muted small"> · {r.members}명</span>
                    </span>
                  </Link>
                  <button type="button" className="btn danger room-action" onClick={() => remove(r)}>
                    {r.isHost ? '삭제' : '나가기'}
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="muted empty-note">아직 참여 중인 모임이 없어요✨</p>
        )}
      </Sheet>

      <Sheet band="받은 링크로 들어가기">
        <form className="row" onSubmit={go}>
          <input value={link} onChange={(e) => { setLink(e.target.value); setError('') }} placeholder="모임 링크 붙여넣기" aria-label="모임 링크" />
          <button className="btn" type="submit">들어가기</button>
        </form>
        {error && <p className="error">{error}</p>}
      </Sheet>
    </>
  )
}
