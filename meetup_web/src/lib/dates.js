// 날짜 계산. 칸 하나 = 날짜 하루 'YYYY-MM-DD' (브라우저 시간 기준).

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

// 모임에서 고를 수 있는 기간: 오늘부터 「올해 + 몇 년」의 12월 31일까지 (2026년이면 2027-12-31)
export const WINDOW_YEARS = 1

export function pad(n) {
  return String(n).padStart(2, '0')
}

export function toDateKey(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function today() {
  return toDateKey(new Date())
}

export function dateRange(startDate, endDate) {
  const out = []
  const d = new Date(`${startDate}T00:00:00`)
  const end = new Date(`${endDate}T00:00:00`)
  while (d <= end) {
    out.push(toDateKey(d))
    d.setDate(d.getDate() + 1)
  }
  return out
}

export function addDays(date, days) {
  const d = new Date(`${date}T00:00:00`)
  d.setDate(d.getDate() + days)
  return toDateKey(d)
}

// 오늘 ~ (올해 + years)년 12월 31일
export function windowRange(from = today(), years = WINDOW_YEARS) {
  const year = Number(from.slice(0, 4)) + years
  return { start: from, end: `${year}-12-31` }
}

// 기간이 걸쳐 있는 달 목록: [{ year, month(0~11) }]
export function monthsBetween(start, end) {
  const out = []
  const d = new Date(`${start.slice(0, 7)}-01T00:00:00`)
  const last = end.slice(0, 7)
  while (toDateKey(d).slice(0, 7) <= last) {
    out.push({ year: d.getFullYear(), month: d.getMonth() })
    d.setMonth(d.getMonth() + 1)
  }
  return out
}

// 그 날을 포함해 이번 달에 남은 날 수
export function daysLeftInMonth(date) {
  const d = new Date(`${date}T00:00:00`)
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate() - d.getDate() + 1
}

// 달력 한 달의 칸: 앞쪽 빈칸(null) + 그 달의 날짜들
export function monthCells(year, month) {
  const first = new Date(year, month, 1).getDay()
  const days = new Date(year, month + 1, 0).getDate()
  return [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => toDateKey(new Date(year, month, i + 1)))]
}

// '10/25(일)'
export function formatDate(date) {
  const d = new Date(`${date}T00:00:00`)
  return `${d.getMonth() + 1}/${d.getDate()}(${WEEKDAYS[d.getDay()]})`
}

// '10월 25일(일)'
export function formatDateLong(date) {
  const d = new Date(`${date}T00:00:00`)
  return `${d.getMonth() + 1}월 ${d.getDate()}일(${WEEKDAYS[d.getDay()]})`
}

// 달력처럼 토요일 파랑, 일요일 빨강으로 칠할 때 쓴다
export function dayClass(date) {
  const w = new Date(`${date}T00:00:00`).getDay()
  return w === 0 ? 'sun' : w === 6 ? 'sat' : ''
}
