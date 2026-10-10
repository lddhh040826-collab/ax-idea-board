import DiffMatchPatch from 'diff-match-patch'
import { pairClauses, splitClauses } from './clauses.js'

const dmp = new DiffMatchPatch()
const normalize = (s) => s.replace(/\s+/g, ' ').trim()
const fullText = (c) => normalize(`${c.title ? `(${c.title}) ` : ''}${c.text}`)

// ⑤ 차이 계산 (규칙). AI를 쓰지 않는다.
// 글자 단위로 비교하면 "30일→20일"이 "3→2"로 쪼개져 읽기 어려워서, 띄어쓰기 단위(어절)로 비교한다.
export function diffText(oldText, newText) {
  const vocab = new Map()
  const encode = (t) =>
    (t.match(/\s+|[^\s]+/g) || [])
      .map((tok) => {
        if (!vocab.has(tok)) vocab.set(tok, String.fromCharCode(0xe000 + vocab.size))
        return vocab.get(tok)
      })
      .join('')
  const a = encode(oldText)
  const b = encode(newText)
  const tokens = [...vocab.keys()]
  const decode = (chars) => [...chars].map((c) => tokens[c.charCodeAt(0) - 0xe000]).join('')

  const diffs = dmp.diff_main(a, b, false)
  dmp.diff_cleanupSemantic(diffs)
  return diffs.map(([op, chars]) => ({ op: op === 0 ? 'equal' : op === -1 ? 'delete' : 'insert', text: decode(chars) }))
}

// 바뀐 조각을 (구 → 신) 묶음으로 정리한다. 요약과 정답 대조에 쓴다.
export function changePieces(diffs) {
  const pieces = []
  for (let i = 0; i < diffs.length; i++) {
    const d = diffs[i]
    if (d.op === 'equal') continue
    if (d.op === 'delete' && diffs[i + 1]?.op === 'insert') {
      pieces.push({ old: d.text, new: diffs[i + 1].text })
      i++
    } else {
      pieces.push(d.op === 'delete' ? { old: d.text, new: '' } : { old: '', new: d.text })
    }
  }
  return pieces
}

// ⑥ 변경 요약. LLM 연결 전까지는 diff 조각으로 규칙 문장을 만든다.
const quote = (s) => `‘${s.trim().length > 40 ? `${s.trim().slice(0, 40)}…` : s.trim()}’`
export function ruleSummary(pieces) {
  const parts = pieces
    .filter((p) => p.old.trim() || p.new.trim())
    .map((p) => {
      if (!p.old.trim()) return `${quote(p.new)} 추가`
      if (!p.new.trim()) return `${quote(p.old)} 삭제`
      return `${quote(p.old)} → ${quote(p.new)}`
    })
  if (!parts.length) return '띄어쓰기·줄바꿈만 바뀌었습니다.'
  const shown = parts.slice(0, 3).join(', ')
  return `바뀐 곳: ${shown}${parts.length > 3 ? ` 외 ${parts.length - 3}곳` : ''}`
}

export function compareTexts(oldText, newText) {
  const oldClauses = splitClauses(oldText)
  const newClauses = splitClauses(newText)
  if (!oldClauses.length || !newClauses.length) {
    const which = !oldClauses.length ? '구버전' : '신버전'
    throw new Error(
      `${which}에서 「제N조」로 시작하는 조항을 찾지 못했어요. 조항 번호가 「제1조(목적)」처럼 적힌 계약서인지 확인해 주세요.`,
    )
  }

  const rows = pairClauses(oldClauses, newClauses).map((p) => {
    const no = p.new?.no ?? p.old.no
    const title = p.new?.title || p.old?.title || ''
    const renumbered = p.old && p.new && p.old.no !== p.new.no ? p.old.no : null
    if (!p.old) return { no, title, status: 'added', old: '', new: fullText(p.new), diffs: [], summary: '신설 조항입니다.' }
    if (!p.new) return { no, title, status: 'deleted', old: fullText(p.old), new: '', diffs: [], summary: '조항이 삭제되었습니다.' }

    const oldT = fullText(p.old)
    const newT = fullText(p.new)
    if (oldT === newT) return { no, title, renumbered, status: 'same', old: oldT, new: newT, diffs: [], summary: '' }
    const diffs = diffText(oldT, newT)
    return { no, title, renumbered, status: 'modified', old: oldT, new: newT, diffs, summary: ruleSummary(changePieces(diffs)) }
  })

  const counts = { added: 0, deleted: 0, modified: 0, same: 0 }
  rows.forEach((r) => counts[r.status]++)
  return { counts, rows }
}
