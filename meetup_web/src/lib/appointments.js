// 약속: 한 모임 안에서 계속 잡는 약속들. 먼저 약속(이름·카테고리)을 만들어 두고(날짜 미정),
// 결과 달력에서 날짜를 고를 때 어느 약속의 날짜인지 골라 확정한다. 공용 달력의 X(불가능한 날)는 그대로 남는다
// 카테고리는 초대장 테마와 같은 목록 + 기타 (초대장을 만들 때 그 테마로 바로 시작한다)
import { CATEGORIES } from './invite.js'
import { today as todayKey } from './dates.js'

export const APPT_CATEGORIES = [...CATEGORIES.map(({ key, label }) => ({ key, label })), { key: 'etc', label: '기타' }]
export const APPT_TITLE_MAX = 20

export const categoryLabel = (key) => APPT_CATEGORIES.find((c) => c.key === key)?.label ?? '기타'
export const isInviteTheme = (key) => CATEGORIES.some((c) => c.key === key)

// 입력 확인 (브라우저 저장판·서버판이 같이 쓴다)
export function checkDate(date) {
  if (date !== null && !/^\d{4}-\d{2}-\d{2}$/.test(date || '')) throw new Error('날짜가 올바르지 않아요')
  return date
}

export function checkAppointment({ title, category }) {
  const t = (title ?? '').trim()
  if (!t) throw new Error('약속 이름을 적어 주세요')
  if (t.length > APPT_TITLE_MAX) throw new Error(`약속 이름은 최대 ${APPT_TITLE_MAX}글자예요`)
  const c = APPT_CATEGORIES.some((x) => x.key === category) ? category : 'etc'
  return { title: t, category: c }
}

// 날짜 미정(만든 순) / 오늘 포함 앞으로의 약속(가까운 순) / 지난 약속(최근 순)
export function splitAppointments(list, today = todayKey()) {
  const dated = list.filter((a) => a.date).sort((a, b) => a.date.localeCompare(b.date))
  return {
    pending: list.filter((a) => !a.date).sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || '')),
    upcoming: dated.filter((a) => a.date >= today),
    past: dated.filter((a) => a.date < today).reverse(),
  }
}
