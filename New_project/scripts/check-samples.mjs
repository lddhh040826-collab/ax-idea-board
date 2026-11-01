// Q6 성공 기준 확인: 샘플 3쌍에서 변경 조항을 하나도 빠뜨리지 않고 추가·삭제·수정을 맞게 구분하는가?
import { compareTexts } from '../src/lib/compare.js'
import { samples } from '../src/samples.js'

let failed = 0
for (const s of samples) {
  const { rows, counts } = compareTexts(s.old, s.new)
  const got = rows.filter((r) => r.status !== 'same').map((r) => `${r.no}:${r.status}`)
  const want = s.answer.map((a) => `${a.no}:${a.status}`)
  const missing = want.filter((w) => !got.includes(w))
  const extra = got.filter((g) => !want.includes(g))
  const ok = !missing.length && !extra.length
  if (!ok) failed++
  console.log(`${ok ? 'PASS' : 'FAIL'} ${s.label}  추가 ${counts.added} · 삭제 ${counts.deleted} · 수정 ${counts.modified}`)
  if (missing.length) console.log('  빠짐:', missing.join(', '))
  if (extra.length) console.log('  정답에 없음:', extra.join(', '))
  rows.filter((r) => r.status === 'modified').forEach((r) => console.log(`  ${r.no} ${r.summary}`))
}
process.exit(failed ? 1 : 0)
