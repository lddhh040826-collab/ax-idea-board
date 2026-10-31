// 집계 규칙 검사: node scripts/check-tally.mjs
import assert from 'node:assert/strict'
import { ranking, tally } from '../src/lib/tally.js'

const dates = ['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04']
const profiles = [
  { id: 'a', name: '가' },
  { id: 'b', name: '나' },
  { id: 'c', name: '다' },
]
const offRows = [
  { profileId: 'a', date: '2026-11-01' },
  { profileId: 'b', date: '2026-11-01' },
  { profileId: 'c', date: '2026-11-02' },
  { profileId: 'x', date: '2026-11-04' }, // 지워진 프로필의 행은 무시
]

const table = tally({ dates, profiles, offRows })
assert.deepEqual(table.get('2026-11-01'), { ok: ['다'], no: ['가', '나'] })
assert.deepEqual(table.get('2026-11-02'), { ok: ['가', '나'], no: ['다'] })

// 표시 안 한 날 = 되는 날 → 3명 모두 되는 11/3, 11/4가 공동 1위, 아무도 안 되는 날은 없음
const ranked = ranking(table)
assert.deepEqual(
  ranked.map((r) => [r.rank, r.date, r.ok.length]),
  [
    [1, '2026-11-03', 3],
    [1, '2026-11-04', 3],
    [3, '2026-11-02', 2],
    [4, '2026-11-01', 1],
  ],
)

// 아무도 안 되는 날은 순위에서 빠진다
const allOff = tally({ dates: ['2026-11-01'], profiles: [profiles[0]], offRows: [{ profileId: 'a', date: '2026-11-01' }] })
assert.deepEqual(ranking(allOff), [])

// 프로필이 없으면 순위도 없다
assert.deepEqual(ranking(tally({ dates, profiles: [], offRows: [] })), [])

console.log('tally: 모든 검사 통과')
