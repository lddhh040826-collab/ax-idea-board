// 방 하나: (처음이면) 방 암호로 참여 → [내 날짜 | 결과]. 방 안의 내 이름은 로그인한 계정 이름
import { useCallback, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AUTH_LIMITS, renameMe, saveOffDays } from '../api/rooms.js'
import { AppointmentBar, AppointmentDialog, NewAppointmentDialog } from '../components/Appointments.jsx'
import DateDetail from '../components/DateDetail.jsx'
import InviteMaker from '../components/InviteMaker.jsx'
import MemberPanel from '../components/MemberPanel.jsx'
import MonthCalendar from '../components/MonthCalendar.jsx'
import PasswordGate from '../components/PasswordGate.jsx'
import ResultPanel from '../components/ResultPanel.jsx'
import RoomMenu from '../components/RoomMenu.jsx'
import Sheet from '../components/Sheet.jsx'
import Toasts, { useToasts } from '../components/Toast.jsx'
import { useRoom } from '../hooks/useRoom.js'
import { isInviteTheme } from '../lib/appointments.js'
import { dateRange, windowRange } from '../lib/dates.js'
import { tally } from '../lib/tally.js'

export default function Room() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toasts, push } = useToasts()
  const [tab, setTab] = useState('mine')
  const [picked, setPicked] = useState(null)
  const [menu, setMenu] = useState(false)
  // 열어 본 약속 id, 초대장을 만드는 약속 id
  const [openAppt, setOpenAppt] = useState(null)
  const [inviteFor, setInviteFor] = useState(null)
  const [creating, setCreating] = useState(false)
  // 방에 들어오면 모임원 패널을 열어 둔다
  const [members, setMembers] = useState(true)
  // 모임 안에서 쓰는 내 이름(닉네임)을 고치는 중이면 입력칸의 값, 아니면 null
  const [nameDraft, setNameDraft] = useState(null)
  const [saved, setSaved] = useState(null)
  // 결과 보기에서 고른 기간 { from, to }. null이면 전체 기간. 탭을 바꿔도 유지한다
  const [period, setPeriod] = useState(null)

  const onRemoteChange = useCallback(
    (event) => {
      if (event.type === 'offdays_changed') push(`방금 ${event.name}님이 날짜를 바꿨어요`)
    },
    [push],
  )
  const { data, error, reload, patch } = useRoom(id, { onRemoteChange })

  const range = useMemo(() => windowRange(), [])
  const dates = useMemo(() => dateRange(range.start, range.end), [range])
  const table = useMemo(() => (data ? tally({ dates, profiles: data.profiles, offRows: data.offRows }) : new Map()), [data, dates])

  if (data === undefined) {
    return (
      <Sheet band="잠시만요" className="center">
        <p className="muted">{error || '모임을 불러오는 중…'}</p>
        {error && <button type="button" className="btn" onClick={reload}>다시 시도</button>}
      </Sheet>
    )
  }

  if (!data) {
    return (
      <Sheet band="앗" className="center">
        <h1>모임을 찾을 수 없어요</h1>
        <p className="muted">링크가 잘못됐거나 삭제된 모임이에요. 모임장에게 링크를 다시 받아 주세요.</p>
        <Link className="btn" to="/">내 모임 목록으로</Link>
      </Sheet>
    )
  }

  const { room, isHost, me, profiles, offRows, notes, appointments = [] } = data

  if (!me) return <PasswordGate room={room} onJoin={reload} />

  const mine = new Set(offRows.filter((r) => r.profileId === me.id).map((r) => r.date))
  const apptDates = new Set(appointments.filter((a) => a.date).map((a) => a.date))
  const apptById = (aid) => appointments.find((a) => a.id === aid) ?? null

  // 손을 떼면 화면부터 바꾸고 저장한다. 실패하면 서버 값으로 되돌린다
  const commit = async (changes) => {
    patch((d) => {
      const drop = new Set(changes.map((c) => c.date))
      const kept = d.offRows.filter((r) => !(r.profileId === me.id && drop.has(r.date)))
      const added = changes.filter((c) => c.off).map((c) => ({ profileId: me.id, date: c.date }))
      return { ...d, offRows: [...kept, ...added] }
    })
    try {
      await saveOffDays(id, changes)
      setSaved(new Date())
    } catch (err) {
      push(err.message, 'error')
    }
    reload()
  }

  const done = (message) => {
    reload()
    if (message) push(message)
  }

  return (
    <>
      <Link className="back" to="/">‹ 내 모임 목록</Link>

      <Sheet
        band={
          <>
            <button type="button" className="pencil" onClick={() => setMenu(true)} aria-label="모임 설정" title="모임 설정">✎</button>
            {room.title}
          </>
        }
      >
        <div className="row between wrap">
          {nameDraft === null ? (
            <p>
              <b>{me.name}</b>님으로 참여 중
              <button type="button" className="pencil-label" onClick={() => setNameDraft(me.name)} title="이 모임에서 쓸 내 이름 바꾸기">이름 ✎</button>
              <span className="muted"> · {profiles.map((p) => p.name).join(', ')}</span>
            </p>
          ) : (
            <form
              className="row"
              onSubmit={async (e) => {
                e.preventDefault()
                try {
                  await renameMe(id, nameDraft)
                  setNameDraft(null)
                  done('이 모임에서 쓸 이름을 바꿨어요')
                } catch (err) {
                  push(err.message, 'error')
                }
              }}
            >
              <input value={nameDraft} maxLength={AUTH_LIMITS.name} autoFocus aria-label="이 모임에서 쓸 내 이름" placeholder="모임에서 쓸 이름" onChange={(e) => setNameDraft(e.target.value)} />
              <button className="btn primary" type="submit" disabled={!nameDraft.trim()}>저장</button>
              <button className="btn" type="button" onClick={() => setNameDraft(null)}>취소</button>
            </form>
          )}
        </div>

        <AppointmentBar appointments={appointments} isHost={isHost} onOpen={(a) => setOpenAppt(a.id)} onCreate={() => setCreating(true)} />

        <div className="tabs" role="tablist">
          <button type="button" role="tab" aria-selected={tab === 'mine'} className={tab === 'mine' ? 'on' : ''} onClick={() => setTab('mine')}>불가능한 날</button>
          <button type="button" role="tab" aria-selected={tab === 'result'} className={tab === 'result' ? 'on' : ''} onClick={() => setTab('result')}>결과 보기</button>
        </div>

        {tab === 'mine' ? (
          <>
            <div className="row between wrap">
              <p className="muted small">
                불가능한 날을 탭하거나 드래그해서 X 치세요. 표시하지 않은 날은 가능한 날이에요.
              </p>
              <span className="muted small">{saved ? `저장됨 ✓ ${saved.toLocaleTimeString('ko-KR')}` : '바로 저장돼요'}</span>
            </div>
            <MonthCalendar
              mode="paint"
              start={range.start}
              end={range.end}
              mine={mine}
              table={table}
              total={profiles.length}
              confirmedDates={apptDates}
              onCommit={commit}
            />
            <div className="legend muted small">
              <span><i className="swatch x" /> 내가 불가능한 날 ({mine.size}일)</span>
            </div>
          </>
        ) : (
          <ResultPanel
            table={table}
            profiles={profiles}
            start={range.start}
            end={range.end}
            period={period}
            onPeriod={setPeriod}
            appointments={appointments}
            onPick={setPicked}
          />
        )}
      </Sheet>

      {picked && table.has(picked) && (
        <DateDetail
          key={picked}
          room={room}
          date={picked}
          entry={table.get(picked)}
          notes={notes.filter((n) => n.date === picked)}
          me={me}
          isHost={isHost}
          appointment={appointments.find((a) => a.date === picked) ?? null}
          appointments={appointments}
          onOpenAppointment={(a) => { setPicked(null); setOpenAppt(a.id) }}
          onClose={() => setPicked(null)}
          onChange={done}
          onError={(m) => push(m, 'error')}
        />
      )}
      {menu && (
        <RoomMenu
          room={room}
          isHost={isHost}
          onClose={() => setMenu(false)}
          onChange={done}
          onError={(m) => push(m, 'error')}
          onGone={(m) => navigate('/', { state: { message: m } })}
        />
      )}
      {openAppt && apptById(openAppt) && (
        <AppointmentDialog
          room={room}
          appointment={apptById(openAppt)}
          entry={table.get(apptById(openAppt).date)}
          isHost={isHost}
          onClose={() => setOpenAppt(null)}
          onInvite={() => { setInviteFor(openAppt); setOpenAppt(null) }}
          onChange={done}
          onError={(m) => push(m, 'error')}
        />
      )}
      {creating && (
        <NewAppointmentDialog room={room} onClose={() => setCreating(false)} onChange={done} onError={(m) => push(m, 'error')} />
      )}
      {inviteFor && apptById(inviteFor) && (
        <InviteMaker
          // 초대장은 약속 이름과 날짜로 그린다
          room={{ ...room, title: apptById(inviteFor).title, confirmedDate: apptById(inviteFor).date }}
          profiles={profiles}
          initialCategory={isInviteTheme(apptById(inviteFor).category) ? apptById(inviteFor).category : null}
          onClose={() => setInviteFor(null)}
          onDone={(m) => push(m)}
          onError={(m) => push(m, 'error')}
        />
      )}
      <MemberPanel
        profiles={profiles}
        offRows={offRows}
        hostId={room.hostId}
        meId={me.id}
        open={members}
        onOpen={() => setMembers(true)}
        onClose={() => setMembers(false)}
      />
      <Toasts toasts={toasts} />
    </>
  )
}
