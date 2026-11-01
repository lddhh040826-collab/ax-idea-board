// 탁상 달력 한 장 모양의 카드. 위쪽 빨간 띠에 링 구멍이 있다.
export default function Sheet({ band, className = '', children }) {
  return (
    <section className={`sheet ${className}`}>
      <div className="sheet-band">
        <span>{band}</span>
      </div>
      <div className="sheet-body">{children}</div>
    </section>
  )
}

// 일력 한 장: 월 · 큰 날짜 · 요일
export function DayTile({ date, size = 'md', stamped = false }) {
  const d = new Date(`${date}T00:00:00`)
  const w = d.getDay()
  return (
    <div className={`daytile ${size} ${w === 0 ? 'sun' : w === 6 ? 'sat' : ''} ${stamped ? 'stamped' : ''}`}>
      <span className="dt-month">{d.getMonth() + 1}월</span>
      <span className="dt-day">{d.getDate()}</span>
      <span className="dt-week">{'일월화수목금토'[w]}요일</span>
    </div>
  )
}
