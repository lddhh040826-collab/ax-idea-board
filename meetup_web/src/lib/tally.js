// 집계 (규칙, AI 안 씀)
// 각자 「안 되는 날」만 표시하므로, 표시하지 않은 날은 되는 날로 센다.
// 화면·저장소를 모르는 순수 함수라 scripts/check-tally.mjs에서 Node로 검사한다.

/**
 * 날짜마다 되는 사람 / 안 되는 사람
 * @param {object} p
 * @param {string[]} p.dates                                  볼 날짜 (이른 순)
 * @param {{id:string,name:string}[]} p.profiles
 * @param {{profileId:string,date:string}[]} p.offRows        안 되는 날 행
 * @returns {Map<string, {ok:string[], no:string[]}>}         이름 목록
 */
export function tally({ dates, profiles, offRows }) {
  const offByDate = new Map()
  for (const r of offRows) {
    if (!offByDate.has(r.date)) offByDate.set(r.date, new Set())
    offByDate.get(r.date).add(r.profileId)
  }
  return new Map(
    dates.map((date) => {
      const off = offByDate.get(date) ?? new Set()
      return [
        date,
        {
          ok: profiles.filter((p) => !off.has(p.id)).map((p) => p.name),
          no: profiles.filter((p) => off.has(p.id)).map((p) => p.name),
        },
      ]
    }),
  )
}

// 날짜 순위: 되는 사람이 많은 순, 같으면 이른 날짜 순. 아무도 안 되는 날은 뺀다
// 인원이 같으면 같은 순위 (1, 1, 3 …)
export function ranking(table) {
  const sorted = [...table]
    .filter(([, t]) => t.ok.length > 0)
    .sort(([a, ta], [b, tb]) => tb.ok.length - ta.ok.length || a.localeCompare(b))
  let rank = 0
  return sorted.map(([date, t], i) => {
    if (i === 0 || t.ok.length !== sorted[i - 1][1].ok.length) rank = i + 1
    return { rank, date, ...t }
  })
}
