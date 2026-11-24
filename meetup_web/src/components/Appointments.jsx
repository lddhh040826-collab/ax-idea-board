// 약속: 달력 위 타원형 약속 줄([+ 새 약속] · 다가오는/날짜 미정 약속 · 오른쪽 끝에 지난 약속 탭), 새 약속 창, 약속 하나를 여는 창
import { useState } from 'react'
import { createAppointment, deleteAppointment, roomLink, setAppointmentDate, updateAppointment } from '../api/rooms.js'
import { APPT_CATEGORIES, APPT_TITLE_MAX, categoryLabel, splitAppointments } from '../lib/appointments.js'
import { formatDate, formatDateLong } from '../lib/dates.js'
import CopyButton from './CopyButton.jsx'
import Dialog from './Dialog.jsx'

export function AppointmentBar({ appointments, isHost, onOpen, onCreate }) {
  const [showPast, setShowPast] = useState(false)
  const { pending, upcoming, past } = splitAppointments(appointments)
  const list = showPast ? past : [...upcoming, ...pending]

  return (
    <div className="appt-bar">
      <div className="appt-list" role="list" aria-label={showPast ? '지난 약속' : '약속'}>
        {isHost && !showPast && (
          <button type="button" className="appt-chip new" onClick={onCreate}>+ 새 약속</button>
        )}
        {list.map((a) => (
          <button key={a.id} type="button" role="listitem" className={`appt-chip ${showPast ? 'past' : a.date ? '' : 'pending'}`} onClick={() => onOpen(a)}>
            <span className="appt-date">{a.date ? formatDate(a.date) : '날짜 미정'}</span>
            <b>{a.title}</b>
            <span className="appt-cat">{categoryLabel(a.category)}</span>
          </button>
        ))}
        {!list.length && (
          <span className="muted small appt-empty">
            {showPast ? '지난 약속이 없어요' : isHost ? '← 새 약속을 만들고, 결과 보기에서 날짜를 골라 확정하세요' : '아직 약속이 없어요'}
          </span>
        )}
      </div>
      <button type="button" className={`appt-tab ${showPast ? 'on' : ''}`} onClick={() => setShowPast((v) => !v)} aria-pressed={showPast}>
        {showPast ? '다가오는 약속' : `지난 약속${past.length ? ` ${past.length}` : ''}`}
      </button>
    </div>
  )
}

// 새 약속 만들기 (모임장): 이름과 카테고리만. 날짜는 결과 달력에서 확정한다
export function NewAppointmentDialog({ room, onClose, onChange, onError }) {
  const [draft, setDraft] = useState({ title: '', category: 'etc' })
  const submit = async (e) => {
    e.preventDefault()
    try {
      await createAppointment(room.id, draft)
      onChange(`'${draft.title.trim()}' 약속을 만들었어요. 결과 보기에서 날짜를 골라 확정하세요`)
      onClose()
    } catch (err) {
      onError(err.message)
    }
  }
  return (
    <Dialog title="새 약속" onClose={onClose}>
      <form className="stack" onSubmit={submit}>
        <input value={draft.title} maxLength={APPT_TITLE_MAX} autoFocus placeholder="약속 이름 (예: 연말 회식)" aria-label="약속 이름" onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
        <CategoryPicker value={draft.category} onChange={(category) => setDraft({ ...draft, category })} />
        <p className="muted small">날짜는 정하지 않아도 돼요. 다들 불가능한 날을 표시하면, 결과 보기에서 날짜를 누르고 이 약속을 골라 확정해요.</p>
        <button className="btn primary wide" type="submit" disabled={!draft.title.trim()}>약속 만들기</button>
      </form>
    </Dialog>
  )
}

// 약속 하나: 날짜(또는 미정)·가능한 사람, 초대장·공지, (모임장) ✎ 이름·카테고리, 날짜 확정 취소, 약속 삭제
export function AppointmentDialog({ room, appointment: a, entry, isHost, onClose, onInvite, onChange, onError }) {
  const [draft, setDraft] = useState(null) // { title, category } 고치는 중
  const run = async (fn, done) => {
    try {
      await fn()
      onChange(done)
      return true
    } catch (err) {
      onError(err.message)
      return false
    }
  }

  return (
    <Dialog title={a.date ? formatDateLong(a.date) : '날짜 미정'} onClose={onClose}>
      {draft ? (
        <form
          className="stack"
          onSubmit={async (e) => {
            e.preventDefault()
            if (await run(() => updateAppointment(room.id, a.id, draft), '약속을 고쳤어요')) setDraft(null)
          }}
        >
          <input value={draft.title} maxLength={APPT_TITLE_MAX} autoFocus aria-label="약속 이름" onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          <CategoryPicker value={draft.category} onChange={(category) => setDraft({ ...draft, category })} />
          <div className="row">
            <button className="btn primary" type="submit" disabled={!draft.title.trim()}>저장</button>
            <button className="btn" type="button" onClick={() => setDraft(null)}>취소</button>
          </div>
        </form>
      ) : (
        <p className="appt-title">
          {isHost && (
            <button type="button" className="pencil ink" onClick={() => setDraft({ title: a.title, category: a.category })} aria-label="약속 이름 수정" title="약속 이름 수정">✎</button>
          )}
          <b>{a.title}</b> <em className="tag">{categoryLabel(a.category)}</em>
        </p>
      )}

      {a.date ? (
        <>
          <p><span className="yes">가능</span>{entry?.ok.join(', ') || (entry ? '없음' : '표시 기간이 지난 날짜예요')}</p>
          {entry?.no.length > 0 && <p><span className="no">불가능</span>{entry.no.join(', ')}</p>}
          <div className="row wrap top-gap">
            <button type="button" className="btn primary" onClick={onInvite}>초대장 만들기</button>
            <CopyButton text={`[${room.title}] ${a.title} · ${formatDateLong(a.date)}에 만나요!\n${roomLink(room.id)}`} label="공지 복사" />
          </div>
        </>
      ) : (
        <p className="muted small">아직 날짜를 정하지 않았어요. 결과 보기에서 날짜를 누르고 이 약속을 골라 확정하세요.</p>
      )}

      {isHost && (
        <div className="row wrap top-gap">
          {a.date && (
            <button type="button" className="btn" onClick={() => window.confirm('날짜 확정을 취소할까요? 약속은 「날짜 미정」으로 남아요.') && run(() => setAppointmentDate(room.id, a.id, null), '날짜 확정을 취소했어요')}>
              날짜 확정 취소
            </button>
          )}
          <button
            type="button"
            className="btn danger"
            onClick={() => window.confirm(`'${a.title}' 약속을 삭제할까요?\n불가능한 날 표시는 그대로 남아요.`) && run(() => deleteAppointment(room.id, a.id), '약속을 삭제했어요').then((ok) => ok && onClose())}
          >
            약속 삭제
          </button>
        </div>
      )}
    </Dialog>
  )
}

export function CategoryPicker({ value, onChange }) {
  return (
    <div className="chips" role="radiogroup" aria-label="카테고리">
      {APPT_CATEGORIES.map((c) => (
        <button key={c.key} type="button" role="radio" aria-checked={value === c.key} className={`chip ${value === c.key ? 'on' : ''}`} onClick={() => onChange(c.key)}>
          {c.label}
        </button>
      ))}
    </div>
  )
}
