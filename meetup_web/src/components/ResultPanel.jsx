// 결과: 기간 고르기 → 달력 → 날짜 순위(되는 사람이 많은 순). 날짜를 누르면 상세(onPick)
// 고른 기간(period) 밖의 날은 순위와 달력 모두에서 뺀다
import { useState } from 'react'
import { ranking } from '../lib/tally.js'
import { addDays, dayClass, formatDate } from '../lib/dates.js'
import MonthCalendar from './MonthCalendar.jsx'

const SHOW = 8

export default function ResultPanel({ table, profiles, start, end, period, onPeriod, confirmedDate, onPick }) {
  const total = profiles.length
  const from = period?.from ?? start
  const to = period?.to ?? end
  const [shown, setShown] = useState(SHOW)

  if (!total) return <p className="muted">아직 아무도 없어요. 링크를 친구에게 보내 주세요.</p>

  const inPeriod = new Map([...table].filter(([date]) => date >= from && date <= to))
  const ranked = ranking(inPeriod)
  const best = ranked[0]?.ok.length ?? 0

  // 기간 밖으로 나가지 않게 자르고, 시작이 끝보다 늦으면 다른 쪽을 맞춘다
  const clamp = (date) => (date < start ? start : date > end ? end : date)
  const setRange = (nextFrom, nextTo) => {
    const f = clamp(nextFrom)
    const t = clamp(nextTo)
    onPeriod(f === start && t === end ? null : { from: f, to: t })
    setShown(SHOW)
  }
  const presets = [
    { label: '전체 기간', from: start, to: end },
    { label: '앞으로 2주', from: start, to: addDays(start, 13) },
    { label: '앞으로 4주', from: start, to: addDays(start, 27) },
  ]

  return (
    <div className="stack">
      <section className="period">
        <h2 className="section">기간</h2>
        <div className="chips">
          {presets.map((p) => {
            const on = from === p.from && to === clamp(p.to)
            return (
              <button key={p.label} type="button" className={`chip ${on ? 'on' : ''}`} onClick={() => setRange(p.from, p.to)}>{p.label}</button>
            )
          })}
        </div>
        <div className="row period-dates top-gap">
          <input
            type="date"
            aria-label="시작 날짜"
            min={start}
            max={end}
            value={from}
            onChange={(e) => e.target.value && setRange(e.target.value, e.target.value > to ? e.target.value : to)}
          />
          <span className="muted">~</span>
          <input
            type="date"
            aria-label="끝 날짜"
            min={start}
            max={end}
            value={to}
            onChange={(e) => e.target.value && setRange(e.target.value < from ? e.target.value : from, e.target.value)}
          />
        </div>
        <p className="muted small">{formatDate(from)} ~ {formatDate(to)} · {inPeriod.size}일 중에서 찾아요</p>
      </section>

      <section>
        <h2 className="section">달력으로 보기</h2>
        <MonthCalendar key={`${from}~${to}`} mode="view" start={from} end={to} table={table} total={total} confirmedDate={confirmedDate} onPick={onPick} />
        <div className="legend muted small">
          <span><i className="swatch solid" /> 모두 됨</span>
          <span><i className="swatch dim" /> 안 되는 사람 있음 (적게 될수록 흐림)</span>
        </div>
      </section>

      <section>
        <h2 className="section">
          날짜 순위
          {best > 0 && <span className="muted small">최대 {best}/{total}명 참석 가능</span>}
        </h2>
        {ranked.length ? (
          <ol className="cards ranked">
            {ranked.slice(0, shown).map((r) => (
              <li key={r.date}>
                <button type="button" className={`rec ${r.date === confirmedDate ? 'selected' : ''}`} onClick={() => onPick(r.date)}>
                  <span className={`rank ${r.rank === 1 ? 'first' : ''}`}>{r.rank}</span>
                  <div className="rec-body">
                    <div className="rec-head">
                      <p className={`rec-time ${dayClass(r.date)}`}>{formatDate(r.date)}</p>
                      {r.date === confirmedDate && <em className="tag">확정</em>}
                      <span className={`pill ${r.no.length ? '' : 'full'}`}>{r.ok.length}/{total}명 가능</span>
                    </div>
                    {r.no.length ? <p><span className="no">안 됨</span>{r.no.join(', ')}</p> : <p className="yes">모두 참석 가능</p>}
                  </div>
                </button>
              </li>
            ))}
          </ol>
        ) : (
          <p className="muted small">{period ? '이 기간에는' : '아직'} 참석 가능한 날이 없어요.</p>
        )}
        {ranked.length > shown && (
          <button type="button" className="btn wide top-gap" onClick={() => setShown(shown + SHOW)}>
            더 보기 ({ranked.length - shown}개 남음)
          </button>
        )}
      </section>
    </div>
  )
}
