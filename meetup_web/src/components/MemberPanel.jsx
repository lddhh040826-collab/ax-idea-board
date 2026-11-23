// 모임 오른쪽에 뜨는 모임원 패널: 이름, 모임장·나 표시, 날짜를 입력했으면 ✓
// ✓는 불가능한 날을 하루라도 표시했다는 뜻이다 (모든 날이 가능한 사람은 표시할 게 없어 ✓가 없다)
import { LIMITS } from '../api/rooms.js'

export default function MemberPanel({ profiles, offRows, hostId, meId, open, onOpen, onClose }) {
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
                {p.id === hostId && <em className="tag">모임장</em>}
                {p.id === meId && <em className="tag me">나</em>}
              </span>
              {n > 0 && <span className="member-state done" title={`불가능한 날 ${n}일 입력함`} aria-label="날짜 입력함">✓</span>}
            </li>
          )
        })}
      </ul>
    </aside>
  )
}
