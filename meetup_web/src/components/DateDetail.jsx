// 날짜 하나: 되는 사람 / 안 되는 사람, 메모, (방장) 이 날로 확정
import { useState } from 'react'
import { LIMITS, cancelConfirm, confirmDate, saveNote } from '../api/rooms.js'
import { formatDateLong } from '../lib/dates.js'
import Dialog from './Dialog.jsx'

export default function DateDetail({ room, date, entry, notes, me, isHost, onClose, onChange, onError }) {
  const mineNote = notes.find((n) => n.profileId === me.id)
  const [text, setText] = useState(mineNote?.text ?? '')
  const confirmed = room.confirmedDate === date

  const run = (fn, done) => {
    try {
      fn()
      onChange(done)
    } catch (err) {
      onError(err.message)
    }
  }

  const confirm = () => {
    const msg = room.confirmedDate
      ? `확정 날짜를 ${formatDateLong(date)}(으)로 바꿀까요?`
      : `${formatDateLong(date)}로 확정할까요?`
    if (window.confirm(msg)) run(() => confirmDate(room.id, date), '날짜를 확정했어요')
  }

  const cancel = () => {
    if (window.confirm('확정을 취소할까요?')) run(() => cancelConfirm(room.id), '확정을 취소했어요')
  }

  return (
    <Dialog title={formatDateLong(date)} onClose={onClose}>
      <p><span className="yes">됨</span>{entry.ok.join(', ') || '없음'}</p>
      <p><span className="no">안 됨</span>{entry.no.join(', ') || '없음'}</p>

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

      {isHost && (
        <div className="row wrap top-gap">
          {confirmed ? (
            <button type="button" className="btn wide" onClick={cancel}>날짜 확정 취소</button>
          ) : (
            <button type="button" className="btn primary wide" onClick={confirm}>이 날로 확정</button>
          )}
        </div>
      )}
    </Dialog>
  )
}
