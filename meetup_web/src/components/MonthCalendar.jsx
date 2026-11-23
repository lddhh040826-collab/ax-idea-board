// 한 달씩 넘기는 달력.
// mode='paint': 안 되는 날을 탭하거나 드래그해서 X 표시. 첫 날을 누를 때의 상태로 「표시」인지 「지우기」인지 정하고,
//               손을 떼면 바뀐 날짜만 onCommit으로 보낸다. 다른 사람 표시와 상관없이 모든 날을 같은 다홍색으로 칠한다.
// mode='view' : 날짜를 누르면 onPick(date). 색이 진할수록 되는 사람이 많다.
// 기간(start~end) 밖의 날은 흐리게 보이고 누를 수 없다.
import { useRef, useState } from 'react'
import { dayClass, daysLeftInMonth, monthCells, monthsBetween, today } from '../lib/dates.js'

export default function MonthCalendar({ start, end, mode, mine = new Set(), table, total, confirmedDates = new Set(), selected, disabled, onCommit, onPick }) {
  const months = monthsBetween(start, end)
  // 오늘부터 보는데 이번 달이 일주일도 안 남았으면 다음 달부터 보여 준다 (직접 고른 기간은 시작 달부터)
  const [index, setIndex] = useState(() => (months.length > 1 && start === today() && daysLeftInMonth(start) < 7 ? 1 : 0))
  const { year, month } = months[Math.min(index, months.length - 1)]

  // 드래그 중인 날짜. 화면 갱신용 state와, 손을 뗄 때 읽을 ref를 함께 둔다
  const [pending, setPendingState] = useState(() => new Map())
  const pendingRef = useRef(pending)
  const setPending = (next) => {
    pendingRef.current = next
    setPendingState(next)
  }
  const drag = useRef(null)

  const inRange = (date) => date >= start && date <= end
  const isMine = (date) => (pending.has(date) ? pending.get(date) : mine.has(date))

  const paint = (date) => {
    if (!date || !drag.current || drag.current.touched.has(date)) return
    drag.current.touched.add(date)
    setPending(new Map(pendingRef.current).set(date, drag.current.mode))
  }

  const dateAt = (e) => document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-date]')?.dataset.date

  const onPointerDown = (e) => {
    const date = e.target.closest('[data-date]')?.dataset.date
    if (mode !== 'paint' || disabled || !date) return
    e.preventDefault()
    e.currentTarget.setPointerCapture?.(e.pointerId)
    drag.current = { mode: !mine.has(date), touched: new Set() }
    paint(date)
  }

  const onPointerMove = (e) => {
    if (drag.current) paint(dateAt(e))
  }

  const finish = () => {
    if (!drag.current) return
    drag.current = null
    const changes = [...pendingRef.current]
      .filter(([date, off]) => off !== mine.has(date))
      .map(([date, off]) => ({ date, off }))
    setPending(new Map())
    if (changes.length) onCommit(changes)
  }

  const onClick = (e) => {
    const date = e.target.closest('[data-date]')?.dataset.date
    if (mode === 'view' && date) onPick?.(date)
  }

  return (
    <div className={`cal ${mode} ${disabled ? 'disabled' : ''}`}>
      <div className="cal-nav">
        <button type="button" className="icon-btn" disabled={index === 0} onClick={() => setIndex(index - 1)} aria-label="이전 달">‹</button>
        <h3 className="cal-title">{year}년 {month + 1}월</h3>
        <button type="button" className="icon-btn" disabled={index >= months.length - 1} onClick={() => setIndex(index + 1)} aria-label="다음 달">›</button>
      </div>
      <div
        className="cal-grid"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finish}
        onPointerCancel={finish}
        onLostPointerCapture={finish}
        onClick={onClick}
      >
        {'일월화수목금토'.split('').map((w, i) => (
          <span key={w} className={`cal-head ${i === 0 ? 'sun' : i === 6 ? 'sat' : ''}`}>{w}</span>
        ))}
        {monthCells(year, month).map((date, i) => {
          if (!date) return <span key={`b${i}`} />
          const day = Number(date.slice(8))
          if (!inRange(date)) {
            return <span key={date} className={`cal-day off ${dayClass(date)}`}>{day}</span>
          }
          const ok = table.get(date)?.ok.length ?? 0
          // 인원에 따른 색 진하기·「모두 됨」 테두리는 결과 달력에서만 쓴다
          const counted = mode === 'view' && total > 0
          const classes = [
            'cal-day pick',
            dayClass(date),
            isMine(date) ? 'x' : '',
            confirmedDates.has(date) ? 'confirmed' : '',
            date === selected ? 'selected' : '',
            counted && ok === total ? 'all' : '',
          ]
          return (
            <span
              key={date}
              data-date={date}
              className={classes.join(' ')}
              style={{ '--heat': counted ? ok / total : 0 }}
              title={total > 0 ? `${date} · ${ok}/${total}명 가능` : date}
            >
              <span className="cal-num">{day}</span>
              {total > 0 && <span className="cal-count">{ok}/{total}</span>}
            </span>
          )
        })}
      </div>
    </div>
  )
}
