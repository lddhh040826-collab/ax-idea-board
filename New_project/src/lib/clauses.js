// ③ 조항 분리: 줄 목록 → 조항 목록. "제N조(제목)" 또는 "제N조의M(제목)"으로 시작하는 줄을 새 조항의 시작으로 본다.
const CLAUSE_HEAD = /^\s*제\s*(\d+)\s*조(?:\s*의\s*(\d+))?\s*(?:[(（]([^)）]*)[)）])?\s*/

export function splitClauses(text) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  const clauses = []
  const preamble = []
  let current = null

  for (const line of lines) {
    const m = line.match(CLAUSE_HEAD)
    if (m) {
      const no = m[2] ? `제${m[1]}조의${m[2]}` : `제${m[1]}조`
      current = { no, title: (m[3] || '').trim(), body: [line.slice(m[0].length)].filter(Boolean) }
      clauses.push(current)
    } else if (current) {
      current.body.push(line)
    } else {
      preamble.push(line)
    }
  }

  const result = clauses.map((c) => ({ no: c.no, title: c.title, text: c.body.join('\n') }))
  if (preamble.length && result.length) {
    result.unshift({ no: '전문', title: '', text: preamble.join('\n') })
  }
  return result
}

// ④ 조항 짝 맞추기
// 1) 번호·제목이 모두 같은 것 → 2) 제목이 같은 것(번호 밀림) → 3) 번호가 같은 것(제목 변경) 순으로 짝짓는다.
// 짝이 없는 신버전 조항은 추가, 구버전 조항은 삭제.
export function pairClauses(oldList, newList) {
  const oldTaken = new Array(oldList.length).fill(false)
  const match = new Array(newList.length).fill(-1)

  const passes = [
    (o, n) => o.no === n.no && o.title === n.title,
    (o, n) => o.title !== '' && o.title === n.title,
    (o, n) => o.no === n.no,
  ]
  for (const same of passes) {
    newList.forEach((n, ni) => {
      if (match[ni] !== -1) return
      const oi = oldList.findIndex((o, i) => !oldTaken[i] && same(o, n))
      if (oi !== -1) {
        match[ni] = oi
        oldTaken[oi] = true
      }
    })
  }

  // 신버전 순서대로 늘어놓고, 삭제된 구 조항은 구버전에서 있던 자리에 끼워 넣는다.
  const pairs = []
  let nextOld = 0
  const flushDeletedBefore = (limit) => {
    for (; nextOld < limit; nextOld++) {
      if (!oldTaken[nextOld]) pairs.push({ old: oldList[nextOld], new: null })
    }
  }
  newList.forEach((n, ni) => {
    const oi = match[ni]
    if (oi === -1) {
      pairs.push({ old: null, new: n })
    } else {
      flushDeletedBefore(oi)
      nextOld = Math.max(nextOld, oi + 1)
      pairs.push({ old: oldList[oi], new: n })
    }
  })
  flushDeletedBefore(oldList.length)
  return pairs
}
