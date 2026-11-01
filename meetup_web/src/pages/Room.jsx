// 방 하나: (처음이면) 방 암호로 참여 → [내 날짜 | 결과]. 방 안의 내 이름은 로그인한 계정 이름
import { useCallback, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { roomLink, saveOffDays } from '../api/rooms.js'
import CopyButton from '../components/CopyButton.jsx'
import DateDetail from '../components/DateDetail.jsx'
import InviteMaker from '../components/InviteMaker.jsx'
import MonthCalendar from '../components/MonthCalendar.jsx'
import PasswordGate from '../components/PasswordGate.jsx'
import ResultPanel from '../components/ResultPanel.jsx'
import RoomMenu from '../components/RoomMenu.jsx'
import Sheet from '../components/Sheet.jsx'
import Toasts, { useToasts } from '../components/Toast.jsx'
import { useRoom } from '../hooks/useRoom.js'
import { dateRange, formatDateLong, windowRange } from '../lib/dates.js'
import { tally } from '../lib/tally.js'

export default function Room() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toasts, push } = useToasts()
  const [tab, setTab] = useState('mine')
  const [picked, setPicked] = useState(null)
  const [menu, setMenu] = useState(false)
  const [invite, setInvite] = useState(false)
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
        <p className="muted">{error || '방을 불러오는 중…'}</p>
        {error && <button type="button" className="btn" onClick={reload}>다시 시도</button>}
      </Sheet>
    )
  }

  if (!data) {
    return (
      <Sheet band="앗" className="center">
        <h1>방을 찾을 수 없어요</h1>
        <p className="muted">링크가 잘못됐거나 삭제된 방이에요. 방장에게 링크를 다시 받아 주세요.</p>
        <Link className="btn" to="/">내 방 목록으로</Link>
      </Sheet>
    )
  }

  const { room, isHost, me, profiles, offRows, notes } = data

  if (!me) return <PasswordGate room={room} onJoin={reload} />

  const mine = new Set(offRows.filter((r) => r.profileId === me.id).map((r) => r.date))
  const confirmed = Boolean(room.confirmedDate)

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
      <Link className="back" to="/">‹ 내 방 목록</Link>
      {confirmed && (
        <Sheet band="확정" className="confirmed center">
          <h1>{formatDateLong(room.confirmedDate)}</h1>
          <p className="muted small">되는 사람: {table.get(room.confirmedDate)?.ok.join(', ') || '기간이 지난 날짜예요'}</p>
          <div className="row wrap center-row">
            <button type="button" className="btn primary" onClick={() => setInvite(true)}>초대장 만들기</button>
            <CopyButton text={`[${room.title}] ${formatDateLong(room.confirmedDate)}에 만나요!\n${roomLink(room.id)}`} label="공지 복사" />
          </div>
        </Sheet>
      )}

      <Sheet band={room.title}>
        <div className="row between wrap">
          <p>
            <b>{me.name}</b>님으로 참여 중 · <span className="muted">{profiles.map((p) => p.name).join(', ')}</span>
          </p>
          <button type="button" className="btn" onClick={() => setMenu(true)}>방 메뉴</button>
        </div>

        <div className="tabs" role="tablist">
          <button type="button" role="tab" aria-selected={tab === 'mine'} className={tab === 'mine' ? 'on' : ''} onClick={() => setTab('mine')}>안 되는 날</button>
          <button type="button" role="tab" aria-selected={tab === 'result'} className={tab === 'result' ? 'on' : ''} onClick={() => setTab('result')}>결과 보기</button>
        </div>

        {tab === 'mine' ? (
          <>
            <div className="row between wrap">
              <p className="muted small">
                안 되는 날을 탭하거나 드래그해서 X 치세요. 표시 안 한 날은 되는 날이에요.
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
              confirmedDate={room.confirmedDate}
              onCommit={commit}
            />
            <div className="legend muted small">
              <span><i className="swatch x" /> 내가 안 되는 날 ({mine.size}일)</span>
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
            confirmedDate={room.confirmedDate}
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
      {invite && confirmed && (
        <InviteMaker
          room={room}
          profiles={profiles}
          onClose={() => setInvite(false)}
          onDone={(m) => push(m)}
          onError={(m) => push(m, 'error')}
        />
      )}
      <Toasts toasts={toasts} />
    </>
  )
}
