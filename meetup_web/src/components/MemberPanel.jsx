// 방 오른쪽에 뜨는 모임원 패널: 이름, 방장·나 표시, 안 되는 날을 입력했는지
// 「입력함」은 안 되는 날을 하루라도 표시했다는 뜻이다 (모든 날이 되는 사람은 표시할 게 없어 「아직」으로 보인다)
import { LIMITS } from '../api/rooms.js'

export default function MemberPanel({ profiles, offRows, hostName, meId, open, onOpen, onClose }) {
  const counts = new Map()
  for (const r of offRows) counts.set(r.profileId, (counts.get(r.profileId) ?? 0) + 1)
  const done = profiles.filter((p) => counts.has(p.id)).length

  if (!open) {
    return (
      <button type="button" className="member-toggle" onClick={onOpen} aria-label="모임원 목록 열기">
        모임원 <b>{done}/{profiles.length}</b>
      </button>
    )
  }

  return (
    <aside className="member-panel" aria-label="모임원 목록">
      <div className="row between">
        <h2>모임원 <span className="muted small">{profiles.length}/{LIMITS.members}명</span></h2>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="모임원 목록 닫기">✕</button>
      </div>
      <p className="muted small">{done}명이 날짜를 입력했어요</p>
      <ul className="member-list">
        {profiles.map((p) => {
          const n = counts.get(p.id) ?? 0
          return (
            <li key={p.id}>
              <span className="member-name">
                <b>{p.name}</b>
                {p.name === hostName && <em className="tag">방장</em>}
                {p.id === meId && <em className="tag me">나</em>}
              </span>
              {n ? <span className="member-state done">✓ 입력함 · {n}일</span> : <span className="member-state">아직</span>}
            </li>
          )
        })}
      </ul>
    </aside>
  )
}
