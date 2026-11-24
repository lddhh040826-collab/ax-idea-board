// 날짜 하나: 가능한 사람 / 불가능한 사람, 메모, (모임장) 이 날짜로 확정할 약속 고르기
import { useState } from 'react'
import { LIMITS, saveNote, setAppointmentDate } from '../api/rooms.js'
import { categoryLabel, splitAppointments } from '../lib/appointments.js'
import { formatDate, formatDateLong } from '../lib/dates.js'
import Dialog from './Dialog.jsx'

export default function DateDetail({ room, date, entry, notes, me, isHost, appointment, appointments = [], onOpenAppointment, onClose, onChange, onError }) {
  const mineNote = notes.find((n) => n.profileId === me.id)
  const [text, setText] = useState(mineNote?.text ?? '')
  // 이 날짜로 확정할 수 있는 약속: 날짜 미정 먼저, 그다음 이미 날짜가 있는 다가오는 약속(날짜 옮기기)
  const { pending, upcoming } = splitAppointments(appointments)
  const choices = [...pending, ...upcoming]
  // 모임장이 약속을 직접 골라야 [이 날짜로 확정]이 켜진다 (처음엔 아무것도 고르지 않음)
  const [picked, setChosen] = useState(null)
  const chosen = choices.some((x) => x.id === picked) ? picked : null

  const run = async (fn, done) => {
    try {
      await fn()
      onChange(done)
    } catch (err) {
      onError(err.message)
    }
  }

  const confirm = async () => {
    const a = choices.find((x) => x.id === chosen)
    if (!a) return
    if (a.date && !window.confirm(`'${a.title}' 약속은 ${formatDate(a.date)}로 정해져 있어요. ${formatDateLong(date)}로 옮길까요?`)) return
    await run(() => setAppointmentDate(room.id, a.id, date), `'${a.title}' 약속을 ${formatDateLong(date)}로 확정했어요`)
    onClose()
  }

  return (
    <Dialog title={formatDateLong(date)} onClose={onClose}>
      <p><span className="yes">가능</span>{entry.ok.join(', ') || '없음'}</p>
      <p><span className="no">불가능</span>{entry.no.join(', ') || '없음'}</p>

      <h3 className="section">메모</h3>
      {notes.length ? (
        <ul className="notes">
          {notes.map((n) => <li key={n.profileId}><b>{n.name}</b> {n.text}</li>)}
        </ul>
      ) : (
        <p className="muted small">메모가 없어요</p>
      )}
      <form className="row top-gap" onSubmit={(e) => { e.preventDefault(); run(() => saveNote(room.id, date, text), '메모를 저장했어요') }}>
        <input value={text} maxLength={LIMITS.note} onChange={(e) => setText(e.target.value)} placeholder={`이 날짜에 메모 남기기 (최대 ${LIMITS.note}자)`} aria-label="메모" />
        <button className="btn" type="submit" disabled={text.trim() === (mineNote?.text ?? '')}>저장</button>
      </form>

      {appointment ? (
        <button type="button" className="btn wide top-gap" onClick={() => onOpenAppointment(appointment)}>
          이 날의 약속: <b>{appointment.title}</b> · {categoryLabel(appointment.category)}
        </button>
      ) : isHost && (
        <section className="stack top-gap">
          <h3 className="section">이 날짜로 확정할 약속</h3>
          {choices.length > 0 && (
            <div className="chips" role="radiogroup" aria-label="확정할 약속">
              {choices.map((a) => (
                <button key={a.id} type="button" role="radio" aria-checked={chosen === a.id} className={`chip ${chosen === a.id ? 'on' : ''}`} onClick={() => setChosen(a.id)}>
                  {a.title} <span className="muted small">{a.date ? `${formatDate(a.date)} → 옮기기` : categoryLabel(a.category)}</span>
                </button>
              ))}
            </div>
          )}
          <button type="button" className="btn primary wide" onClick={confirm} disabled={!chosen}>이 날짜로 확정</button>
        </section>
      )}
    </Dialog>
  )
}
