// 확정 날짜 초대장: 9:16(900×1600) 세로 캔버스에 그린다. 생김새는 두 가지다.
// - 포스터형(술자리·카페·생일파티·걸스나잇): 크림 종이 + 한 가지 잉크색, 굵은 대문자 제목, 검은 마커 선 그림,
//   큰 날짜, 손글씨 정보 표, 맨 아래 「이름 x 이름」 줄, 반짝이 별
// - 테마형(여행·운동·홈파티): 위 문구 / 가운데 그림(날짜 포함) / 아래 방 이름 · 정보 표
// 그림은 Path2D로 직접 그려서 이미지 파일 없이 복사·저장된다 (외부 이미지를 쓰면 캔버스가 막힌다)
import { formatDateLong } from './dates.js'

export const INVITE_SIZE = { width: 900, height: 1600 }
const W = 900
const H = 1600

export const CATEGORIES = [
  { key: 'drinks', label: '술자리', phrase: 'Cheers!' },
  { key: 'cafe', label: '카페', phrase: 'Café & chill' },
  { key: 'birthday', label: '생일파티', phrase: 'Happy Birthday!' },
  { key: 'travel', label: '여행', phrase: 'adios!' },
  { key: 'workout', label: '운동', phrase: 'just do it' },
  { key: 'homeparty', label: '홈파티', phrase: 'Home sweet home' },
  { key: 'girlsnight', label: '걸스나잇', phrase: 'Girls only' },
]

const KR_SANS = '"Noto Sans KR", sans-serif'
const KR_HAND = '"Nanum Pen Script", cursive'
const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
const TBD = '추후 공지'
const FREE = '자유롭게'
const EVERYONE = '우리 모두'

// ── 테마: 배경, 글꼴, 색, 그림 ──
// head: 문구 글꼴('{}' 자리에 크기). fonts: 그리기 전에 받아 둘 글꼴
const THEMES = {
  drinks: {
    poster: true,
    lines: ['CHEERS!'],
    tagline: 'WINE — BEER — TALKS — GOOD FRIENDS',
    color: '#c42a46',
    sketch: drinksSketch,
  },
  cafe: {
    poster: true,
    lines: ['CAFÉ &', 'CHILL'],
    tagline: 'COFFEE — DESSERT — SLOW TALKS',
    color: '#4f8f63',
    sketch: cafeSketch,
  },
  birthday: {
    poster: true,
    lines: ['HAPPY', 'BIRTHDAY!'],
    tagline: 'CAKE — CANDLES — GIFTS — CHEERS',
    color: '#2f5bd6',
    sketch: birthdaySketch,
  },
  travel: {
    head: '400 {}px "Bebas Neue", sans-serif',
    headMax: 240,
    headColor: '#163a6b',
    label: '#f26b3a',
    title: '#163a6b',
    line: '#163a6b',
    dashed: true,
    value: '#163a6b',
    fonts: ['400 60px "Bebas Neue"'],
    bg: travelBg,
    art: travelArt,
  },
  workout: {
    head: '400 {}px "Anton", sans-serif',
    upper: true,
    skew: true,
    headColor: '#d4ff3a',
    headShadow: '#ff6a1f',
    label: '#d4ff3a',
    title: '#ffffff',
    line: 'rgba(255,255,255,.45)',
    value: '#ffffff',
    fonts: ['400 60px "Anton"'],
    bg: workoutBg,
    art: workoutArt,
  },
  homeparty: {
    head: '400 {}px "Shrikhand", cursive',
    headColor: '#c8553d',
    label: '#b07a1f',
    title: '#5b3a29',
    line: '#d9b98e',
    value: '#5b3a29',
    fonts: ['400 60px "Shrikhand"'],
    bg: homeBg,
    art: homeArt,
  },
  girlsnight: {
    poster: true,
    lines: ['GIRLS', 'ONLY'],
    tagline: 'WINE — SNACKS — TALKS — GOSSIP',
    color: '#d6339a',
    sketch: girlsSketch,
  },
}

// 그리기 전에 글꼴을 받아 둔다. 한글 글꼴은 글자 범위별로 나뉘어 있어 실제로 쓸 글자를 넘긴다
export async function loadInviteFonts(invite) {
  const all = inviteTexts(invite).join(' ')
  const t = THEMES[invite.category]
  const fonts = [`900 50px ${KR_SANS}`, `40px ${KR_HAND}`, ...(t.poster ? POSTER_FONTS : t.fonts)]
  await Promise.all(fonts.map((f) => document.fonts.load(f, all)))
}

function inviteTexts({ room, category, time, place, dress, who }) {
  const c = CATEGORIES.find((x) => x.key === category)
  return [room.title, c.phrase, c.phrase.toUpperCase(), ...(THEMES[category].lines ?? []), THEMES[category].tagline ?? '', formatDateLong(room.confirmedDate), time || TBD, place || TBD, dress || FREE, who || EVERYONE, (who || '').toUpperCase(), "YOU'RE INVITED 언제볼래 TIME WHERE WHO DRESSCODE DATE: TIME: WHERE: DRESSCODE: BOARDING PASS FROM TO HOME AWAY DATE DAY SEAT ALL x 외 명 0123456789/", ...DAYS]
}

function dateParts(date) {
  const d = new Date(`${date}T00:00:00`)
  const m = String(d.getMonth() + 1)
  const dd = String(d.getDate()).padStart(2, '0')
  return { md: `${m}/${dd}`, dow: DAYS[d.getDay()] }
}

export function drawInvite(ctx, invite) {
  const { room, category, time, place, dress, who } = invite
  const t = THEMES[category]
  if (t.poster) return drawPoster(ctx, t, invite)
  const c = CATEGORIES.find((x) => x.key === category)
  const d = dateParts(room.confirmedDate)
  ctx.save()
  ctx.clearRect(0, 0, W, H)
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'
  t.bg(ctx, t)

  const L = 70
  const MAXW = W - L * 2
  const labelFont = KR_SANS

  // 맨 위 작은 글씨
  ctx.fillStyle = t.label
  ctx.font = `900 22px ${labelFont}`
  spaced(ctx, 4)
  ctx.fillText("YOU'RE INVITED", L, 110)
  spaced(ctx, 0)
  ctx.textAlign = 'right'
  ctx.font = `900 20px ${KR_SANS}`
  ctx.fillText('언제볼래', W - L, 110)
  ctx.textAlign = 'left'

  // 문구: 한 줄로 너무 작아지면 두 줄로 나눈다
  const phrase = t.upper ? c.phrase.toUpperCase() : c.phrase
  const max = t.headMax ?? 170
  let lines = [phrase]
  let size = fitSize(ctx, phrase, t.head, max, MAXW)
  const words = phrase.split(' ')
  if (size < 120 && words.length > 1) {
    const cut = Math.ceil(words.length / 2)
    const two = [words.slice(0, cut).join(' '), words.slice(cut).join(' ')]
    const size2 = Math.min(max * 0.85, ...two.map((s) => fitSize(ctx, s, t.head, max, MAXW)))
    if (size2 > size) {
      lines = two
      size = size2
    }
  }
  let y = 162 + size * 0.82
  for (const text of lines) {
    drawHead(ctx, t, text, L - 4, y, size)
    y += size * 0.98
  }
  const headBottom = y - size * 0.98 + size * 0.25

  // 아래쪽: 정보 표 4줄을 바닥에 붙이고, 그 위에 방 이름
  const rowH = 72
  const top = H - 70 - rowH * 4
  const titleY = top - 36
  ctx.fillStyle = t.title
  ctx.font = `900 ${fitSize(ctx, room.title, `900 {}px ${KR_SANS}`, 50, MAXW)}px ${KR_SANS}`
  ctx.fillText(room.title, L, titleY)

  const names = (who || '').split(/[,，]/).map((n) => n.trim()).filter(Boolean)
  const rows = [
    ['TIME', time || TBD],
    ['WHERE', place || TBD],
    ['WHO', names.length ? names : EVERYONE],
    ['DRESSCODE', dress || FREE],
  ]
  ctx.strokeStyle = t.line
  ctx.lineWidth = 2
  if (t.dashed) ctx.setLineDash([10, 8])
  for (let i = 0; i <= rows.length; i += 1) {
    ctx.beginPath()
    ctx.moveTo(L, top + i * rowH)
    ctx.lineTo(L + MAXW, top + i * rowH)
    ctx.stroke()
  }
  ctx.setLineDash([])
  const vx = L + 180
  const vmax = L + MAXW - vx - 6
  const valueFont = KR_HAND
  const valueMax = 46
  rows.forEach(([label, value], i) => {
    const mid = top + i * rowH + rowH / 2
    ctx.fillStyle = t.label
    ctx.font = `900 18px ${labelFont}`
    spaced(ctx, 3)
    ctx.fillText(label, L + 4, mid + 7)
    spaced(ctx, 0)
    ctx.fillStyle = t.value
    const text = Array.isArray(value) ? fitNames(ctx, value, vmax, valueFont) : value
    const s = Math.max(24, fitSize(ctx, text, `{}px ${valueFont}`, valueMax, vmax))
    ctx.font = `${s}px ${valueFont}`
    ctx.fillText(clip(ctx, text, vmax), vx, mid + s * 0.32)
  })

  // 가운데 그림 (날짜 포함). 그림은 x 900~1560, y 60~850 칸 기준으로 그려 두었고, 남은 칸에 맞춰 줄인다
  const artTop = headBottom + 10
  const artBottom = titleY - 70
  const scale = Math.min(1.15, (artBottom - artTop) / 790, MAXW / 660)
  ctx.save()
  ctx.translate(W / 2, artTop + (artBottom - artTop - 790 * scale) / 2)
  ctx.scale(scale, scale)
  ctx.translate(-1230, -60)
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  t.art(ctx, t, d)
  ctx.restore()
  ctx.restore()
}

// 테마별 문구 그리기: 기울임(운동) 또는 그대로
function drawHead(ctx, t, text, x, y, size) {
  ctx.save()
  ctx.font = t.head.replace('{}', size)
  if (t.skew) {
    ctx.translate(x + 30, y)
    ctx.transform(1, 0, -0.2, 1, 0, 0)
    ctx.fillStyle = t.headShadow
    ctx.fillText(text, 7, 7)
    ctx.fillStyle = t.headColor
    ctx.fillText(text, 0, 0)
  } else {
    ctx.fillStyle = t.headColor
    ctx.fillText(text, x, y)
  }
  ctx.restore()
}

function spaced(ctx, px) {
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${px}px`
}

function centerText(ctx, text, x, y, font, fill) {
  ctx.save()
  ctx.font = font
  ctx.textAlign = 'center'
  ctx.fillStyle = fill
  ctx.fillText(text, x, y)
  ctx.restore()
}

// ── 배경 ──

const SKY = '#dcf0fa'

function travelBg(ctx) {
  ctx.fillStyle = SKY
  ctx.fillRect(0, 0, W, H)
  for (const [x, y, s] of [[640, 60, 0.9], [-20, 640, 1], [760, 1060, 1.1], [700, 1560, 0.8]]) cloud(ctx, x, y, s)
  ctx.save()
  ctx.strokeStyle = 'rgba(22,58,107,.35)'
  ctx.lineWidth = 3
  ctx.setLineDash([4, 12])
  line(ctx, 'M120 1130 C40 960 200 620 60 440')
  ctx.restore()
}

function cloud(ctx, x, y, s) {
  ctx.fillStyle = 'rgba(255,255,255,.9)'
  for (const [dx, dy, r] of [[0, 0, 40], [40, -18, 48], [88, 0, 38], [44, 14, 40]]) ctx.fill(new Path2D(ellipse(x + dx * s, y + dy * s, r * s)))
}

function workoutBg(ctx) {
  ctx.fillStyle = '#1f3bff'
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = 'rgba(255,255,255,.07)'
  for (let i = -2; i < 12; i += 1) {
    ctx.beginPath()
    ctx.moveTo(i * 180, H)
    ctx.lineTo(i * 180 + 90, H)
    ctx.lineTo(i * 180 + 490, 0)
    ctx.lineTo(i * 180 + 400, 0)
    ctx.closePath()
    ctx.fill()
  }
}

function homeBg(ctx) {
  ctx.fillStyle = '#f4e1c6'
  ctx.fillRect(0, 0, W, H)
  const g = ctx.createRadialGradient(450, 760, 60, 450, 760, 620)
  g.addColorStop(0, 'rgba(255,214,140,.55)')
  g.addColorStop(1, 'rgba(255,214,140,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)
  // 벽지 무늬
  ctx.fillStyle = 'rgba(200,85,61,.08)'
  for (let x = 40; x < W; x += 80) for (let y = 40; y < H; y += 80) ctx.fill(new Path2D(ellipse(x + ((y / 80) % 2) * 40, y, 5)))
  grain(ctx, 'rgba(90,58,41,.05)')
}

function grain(ctx, color) {
  const rand = seeded(7)
  ctx.fillStyle = color
  for (let i = 0; i < 4000; i += 1) ctx.fillRect(rand() * W, rand() * H, 1.6, 1.6)
}

// ── 중앙 그림 (오른쪽 칸: x 900~1530, 가운데 1230) ──

function travelArt(ctx, t, d) {
  const navy = '#163a6b'
  const orange = '#f26b3a'
  ctx.save()
  ctx.translate(1225, 470)
  ctx.rotate(-0.06)
  const body = new Path2D(rr(-310, -180, 620, 360, 24))
  ctx.save()
  ctx.shadowColor = 'rgba(22,58,107,.25)'
  ctx.shadowBlur = 30
  ctx.shadowOffsetY = 14
  ctx.fillStyle = '#ffffff'
  ctx.fill(body)
  ctx.restore()
  ctx.save()
  ctx.clip(body)
  ctx.fillStyle = navy
  ctx.fillRect(-310, -180, 620, 72)
  ctx.fillStyle = orange
  ctx.fillRect(160, -180, 150, 72)
  ctx.restore()
  // 절취선 홈
  for (const y of [-180, 180]) dot(ctx, ellipse(160, y, 18), SKY)
  ctx.save()
  ctx.strokeStyle = 'rgba(22,58,107,.5)'
  ctx.lineWidth = 3
  ctx.setLineDash([6, 8])
  line(ctx, 'M160 -158 V158')
  ctx.restore()
  ctx.fillStyle = '#ffffff'
  ctx.font = '400 40px "Bebas Neue", sans-serif'
  spaced(ctx, 4)
  ctx.fillText('BOARDING PASS', -280, -128)
  ctx.fillText('SEAT', 190, -128)
  spaced(ctx, 0)
  plane(ctx, 110, -142, 0.9, '#ffffff')
  const label = (text, x, y) => {
    ctx.fillStyle = orange
    ctx.font = `900 16px ${KR_SANS}`
    spaced(ctx, 3)
    ctx.fillText(text, x, y)
    spaced(ctx, 0)
  }
  // 출발 → 도착
  label('FROM', -280, -70)
  label('TO', -60, -70)
  ctx.fillStyle = navy
  ctx.font = '400 64px "Bebas Neue", sans-serif'
  ctx.fillText('HOME', -280, -12)
  ctx.fillText('AWAY', -60, -12)
  plane(ctx, -122, -36, 0.7, navy)
  // 날짜
  label('DATE', -280, 40)
  ctx.fillStyle = navy
  ctx.font = '400 130px "Bebas Neue", sans-serif'
  ctx.fillText(d.md, -284, 150)
  const w = ctx.measureText(d.md).width
  label('DAY', -284 + w + 26, 40)
  ctx.fillStyle = orange
  ctx.font = '400 64px "Bebas Neue", sans-serif'
  ctx.fillText(d.dow, -284 + w + 26, 100)
  // 꼬리표: 좌석 + 바코드
  ctx.fillStyle = navy
  ctx.font = '400 56px "Bebas Neue", sans-serif'
  ctx.fillText('ALL', 190, -40)
  const rand = seeded(4)
  let bx = 190
  while (bx < 280) {
    const bw = 2 + Math.floor(rand() * 5)
    ctx.fillRect(bx, -10, bw, 150)
    bx += bw + 2 + Math.floor(rand() * 4)
  }
  ctx.restore()
  plane(ctx, 1115, 72, 1.3, navy)
}

// 위에서 본 비행기 실루엣 (오른쪽을 향한다)
function plane(ctx, x, y, s, col) {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(s, s)
  dot(ctx, 'M-26 2 L22 -4 Q34 -5 34 0 Q34 5 22 4 Z M-2 -2 L-14 -26 L-6 -26 L10 -3 Z M-2 2 L-14 26 L-6 26 L10 3 Z M-22 0 L-30 -12 L-24 -12 L-14 -1 Z M-22 0 L-30 12 L-24 12 L-14 1 Z', col)
  ctx.restore()
}

function workoutArt(ctx, t, d) {
  const lime = '#d4ff3a'
  const orange = '#ff6a1f'
  const ink = '#0d0d1a'
  dot(ctx, ellipse(1230, 470, 300), lime)
  // 번개, 속도선
  for (const [x, y, s] of [[960, 230, 1], [1500, 700, 0.8]]) {
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(s, s)
    ctx.strokeStyle = ink
    ctx.lineWidth = 5
    shape(ctx, 'M10 -60 L-26 8 L0 8 L-12 60 L30 -10 L4 -10 Z', orange)
    ctx.restore()
  }
  ctx.save()
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 8
  line(ctx, 'M930 560 H1010 M950 600 H1040 M930 640 H1000')
  ctx.restore()
  // 스톱워치 안에 날짜
  ctx.strokeStyle = ink
  ctx.lineWidth = 10
  shape(ctx, rr(1200, 222, 60, 40, 8), orange)
  shape(ctx, rr(1214, 196, 32, 30, 6), ink)
  ctx.save()
  ctx.translate(1370, 300)
  ctx.rotate(0.75)
  shape(ctx, rr(-16, -22, 32, 40, 6), orange)
  ctx.restore()
  shape(ctx, ellipse(1230, 480, 215), '#ffffff')
  ctx.lineWidth = 4
  line(ctx, ellipse(1230, 480, 188))
  for (let i = 0; i < 60; i += 1) {
    const a = (i / 60) * Math.PI * 2
    const r1 = i % 5 === 0 ? 160 : 172
    ctx.lineWidth = i % 5 === 0 ? 6 : 2.5
    line(ctx, `M${1230 + Math.cos(a) * r1} ${480 + Math.sin(a) * r1} L${1230 + Math.cos(a) * 182} ${480 + Math.sin(a) * 182}`)
  }
  ctx.save()
  ctx.strokeStyle = orange
  ctx.lineWidth = 12
  ctx.beginPath()
  ctx.arc(1230, 480, 201, -Math.PI / 2, Math.PI / 4)
  ctx.stroke()
  ctx.restore()
  ctx.save()
  ctx.font = '400 116px "Anton", sans-serif'
  ctx.textAlign = 'center'
  ctx.lineWidth = 12
  ctx.strokeStyle = '#ffffff'
  ctx.strokeText(d.md, 1230, 520)
  ctx.fillStyle = '#1f3bff'
  ctx.fillText(d.md, 1230, 520)
  ctx.font = '400 40px "Anton", sans-serif'
  spaced(ctx, 8)
  ctx.fillStyle = orange
  ctx.fillText(d.dow, 1234, 580)
  ctx.restore()
}

function homeArt(ctx, t, d) {
  const brown = '#5b3a29'
  const terra = '#c8553d'
  const mustard = '#e3a33b'
  const cream = '#fff6e6'
  const olive = '#7d8f4e'
  ctx.strokeStyle = brown
  ctx.lineWidth = 5
  // 전구 줄
  ctx.save()
  ctx.lineWidth = 3
  line(ctx, 'M930 100 Q1230 210 1530 100')
  ctx.restore()
  for (let i = 1; i < 12; i += 1) {
    const s = i / 12
    const x = 930 + 600 * s
    const y = (1 - s) ** 2 * 100 + 2 * (1 - s) * s * 210 + s * s * 100
    ctx.save()
    ctx.shadowColor = mustard
    ctx.shadowBlur = 20
    dot(ctx, ellipse(x, y + 14, 8, 11), i % 3 === 0 ? terra : mustard)
    ctx.restore()
  }
  // 굴뚝 연기
  ctx.save()
  ctx.strokeStyle = 'rgba(91,58,41,.4)'
  ctx.lineWidth = 6
  line(ctx, 'M1365 238 C1345 215 1385 200 1365 175 C1350 158 1378 146 1368 128')
  ctx.restore()
  shape(ctx, rr(1340, 240, 50, 90, 4), terra)
  // 집
  shape(ctx, rr(1060, 380, 340, 340, 6), cream)
  shape(ctx, 'M1010 400 L1230 214 L1450 400 Z', terra)
  // 창문 (따뜻한 불빛)
  for (const x of [1092, 1298]) {
    ctx.save()
    ctx.shadowColor = mustard
    ctx.shadowBlur = 30
    dot(ctx, rr(x, 530, 72, 80, 6), '#ffd57a')
    ctx.restore()
    shape(ctx, rr(x, 530, 72, 80, 6), null)
    line(ctx, `M${x + 36} 530 V610 M${x} 570 H${x + 72}`)
    shape(ctx, rr(x - 6, 608, 84, 14, 4), olive)
  }
  // 문 + 리스
  shape(ctx, 'M1192 720 V600 Q1192 560 1230 560 Q1268 560 1268 600 V720 Z', brown)
  ctx.save()
  ctx.strokeStyle = olive
  ctx.lineWidth = 9
  line(ctx, ellipse(1230, 612, 22))
  ctx.restore()
  for (const a of [0.3, 2.2, 4.1]) dot(ctx, ellipse(1230 + Math.cos(a) * 22, 612 + Math.sin(a) * 22, 4.5), terra)
  dot(ctx, ellipse(1255, 668, 4), mustard)
  // 걸어 둔 나무 간판에 날짜
  ctx.save()
  ctx.lineWidth = 3
  line(ctx, 'M1165 404 L1175 432 M1295 404 L1285 432')
  ctx.restore()
  shape(ctx, rr(1110, 428, 240, 92, 14), '#a8673d')
  centerText(ctx, d.md, 1230, 488, '400 50px "Shrikhand", cursive', cream)
  ctx.save()
  spaced(ctx, 6)
  centerText(ctx, d.dow, 1233, 512, `900 18px ${KR_SANS}`, '#ffd57a')
  ctx.restore()
  // 땅, 화분
  shape(ctx, ellipse(1230, 726, 300, 22), olive)
  for (const x of [1020, 1440]) {
    shape(ctx, `M${x - 26} 690 L${x + 26} 690 L${x + 20} 730 L${x - 20} 730 Z`, terra)
    for (const a of [-0.5, 0, 0.5]) {
      ctx.save()
      ctx.translate(x, 690)
      ctx.rotate(a)
      shape(ctx, ellipse(0, -30, 10, 28), olive)
      ctx.restore()
    }
  }
}

// ── 포스터형: 술자리·카페·생일파티·걸스나잇 ──

const PAPER = '#f6f2ea'
const MARKER = '#1c1a1b'
const MONT = '"Montserrat", "Noto Sans KR", sans-serif'
const POSTER_FONTS = ['700 60px "Montserrat"', '600 60px "Montserrat"', 'italic 800 60px "Montserrat"']
// 반짝이 별: [x, y, 반지름, 회전]. 큰 별은 가장자리에 걸쳐 둔다
const STARS = [[868, 40, 48, 0.2], [150, 46, 13, 0], [34, 610, 30, 0.35], [842, 352, 12, 0.1], [132, 780, 11, 0.5], [880, 730, 64, 0.45], [10, 1020, 76, 0.05], [292, 1098, 11, 0.3], [600, 1588, 10, 0.2]]

function drawPoster(ctx, t, { room, time, place, dress, who }) {
  const d = dateParts(room.confirmedDate)
  const L = 56
  const MAXW = W - L * 2
  ctx.save()
  ctx.clearRect(0, 0, W, H)
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'
  paper(ctx)
  for (const [x, y, r, a] of STARS) glitterStar(ctx, x, y, r, a, t.color)

  // 제목 (줄마다 같은 크기)
  const size = Math.min(200, ...t.lines.map((line) => fitSize(ctx, line, `700 {}px ${MONT}`, 200, MAXW)))
  ctx.fillStyle = t.color
  ctx.font = `700 ${size}px ${MONT}`
  let y = 70 + size * 0.74
  for (const text of t.lines) {
    ctx.fillText(text, L - size * 0.03, y)
    y += size * 0.92
  }

  // 방 이름
  const titleY = y - size * 0.92 + 74
  ctx.fillStyle = MARKER
  ctx.font = `900 ${fitSize(ctx, room.title, `900 {}px ${KR_SANS}`, 40, MAXW)}px ${KR_SANS}`
  ctx.fillText(room.title, L, titleY)

  // 큰 날짜(오른쪽) + 요일(왼쪽)
  const dateY = 1238
  ctx.fillStyle = t.color
  ctx.font = `600 ${fitSize(ctx, d.md, `600 {}px ${MONT}`, 210, MAXW - 140)}px ${MONT}`
  ctx.textAlign = 'right'
  ctx.fillText(d.md, W - L + 6, dateY)
  ctx.textAlign = 'left'
  ctx.font = `700 34px ${MONT}`
  spaced(ctx, 6)
  ctx.fillText(d.dow, L, dateY)
  spaced(ctx, 0)

  // 가운데 마커 그림 (600×600 칸 기준을 남은 높이에 맞춘다)
  const top = titleY + 28
  const bottom = dateY - 178
  const s = Math.min(1.25, (bottom - top) / 600, MAXW / 600)
  ctx.save()
  ctx.translate(W / 2 - 300 * s, top + (bottom - top - 600 * s) / 2)
  ctx.scale(s, s)
  ctx.strokeStyle = MARKER
  ctx.lineWidth = 6.5
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  t.sketch(ctx, t.color)
  ctx.restore()

  // 한 줄 문구
  ctx.fillStyle = t.color
  ctx.font = `600 ${fitSize(ctx, t.tagline, `600 {}px ${MONT}`, 36, MAXW)}px ${MONT}`
  ctx.fillText(t.tagline, L, 1302)

  // 정보 표: [DATE | TIME] / [WHERE] / [DRESSCODE]
  const T = { x: L, y: 1332, w: MAXW, h: 64 }
  ctx.strokeStyle = t.color
  ctx.lineWidth = 2.5
  ctx.strokeRect(T.x, T.y, T.w, T.h * 3)
  ctx.beginPath()
  ctx.moveTo(T.x, T.y + T.h)
  ctx.lineTo(T.x + T.w, T.y + T.h)
  ctx.moveTo(T.x, T.y + T.h * 2)
  ctx.lineTo(T.x + T.w, T.y + T.h * 2)
  ctx.moveTo(T.x + T.w / 2, T.y)
  ctx.lineTo(T.x + T.w / 2, T.y + T.h)
  ctx.stroke()
  posterCell(ctx, t, 'DATE:', formatDateLong(room.confirmedDate), T.x, T.y, T.w / 2, T.h)
  posterCell(ctx, t, 'TIME:', time || TBD, T.x + T.w / 2, T.y, T.w / 2, T.h)
  posterCell(ctx, t, 'WHERE:', place || TBD, T.x, T.y + T.h, T.w, T.h)
  posterCell(ctx, t, 'DRESSCODE:', dress || FREE, T.x, T.y + T.h * 2, T.w, T.h)

  // 맨 아래: WHO를 「이름 x 이름」으로
  const names = (who || '').split(/[,，]/).map((n) => n.trim().toUpperCase()).filter(Boolean)
  namesLine(ctx, t.color, names.length ? names : [EVERYONE], L, 1570, MAXW)
  ctx.restore()
}

function posterCell(ctx, t, label, value, x, y, w, h) {
  ctx.fillStyle = t.color
  ctx.font = `600 25px ${MONT}`
  ctx.fillText(label, x + 16, y + h / 2 + 9)
  const vx = x + 16 + ctx.measureText(label).width + 14
  const max = x + w - 12 - vx
  ctx.fillStyle = MARKER
  const size = Math.max(26, fitSize(ctx, value, `{}px ${KR_HAND}`, 42, max))
  ctx.font = `${size}px ${KR_HAND}`
  ctx.fillText(clip(ctx, value, max), vx, y + h / 2 + size * 0.3)
}

// 이름 사이에 x를 넣어 양끝을 맞춘다. 넘치면 글자를 줄이고, 그래도 넘치면 「외 n명」
function namesLine(ctx, color, names, x, y, w) {
  const font = (size) => `italic 800 ${size}px ${MONT}`
  const fits = (list, size) => {
    ctx.font = font(size)
    return list.reduce((sum, n) => sum + ctx.measureText(n).width, 0) + (list.length - 1) * size * 1.6 <= w
  }
  let size = 34
  let list = names
  while (size > 24 && !fits(list, size)) size -= 2
  for (let k = names.length - 1; k > 0 && !fits(list, size); k -= 1) list = [...names.slice(0, k), `외 ${names.length - k}명`]
  ctx.fillStyle = color
  ctx.font = font(size)
  if (list.length === 1) {
    ctx.fillText(list[0], x, y)
    return
  }
  const widths = list.map((n) => ctx.measureText(n).width)
  const gap = (w - widths.reduce((a, b) => a + b, 0)) / (list.length - 1)
  let cx = x
  list.forEach((n, i) => {
    ctx.font = font(size)
    ctx.fillText(n, cx, y)
    cx += widths[i]
    if (i < list.length - 1) {
      ctx.font = `600 ${size * 0.8}px ${MONT}`
      ctx.textAlign = 'center'
      ctx.fillText('x', cx + gap / 2, y)
      ctx.textAlign = 'left'
      cx += gap
    }
  })
}

// 크림색 수채 종이: 잔 점과 짧은 섬유
function paper(ctx) {
  ctx.fillStyle = PAPER
  ctx.fillRect(0, 0, W, H)
  grain(ctx, 'rgba(110,90,60,.06)')
  const rand = seeded(21)
  ctx.save()
  ctx.strokeStyle = 'rgba(110,90,60,.06)'
  ctx.lineWidth = 1
  for (let i = 0; i < 700; i += 1) {
    const x = rand() * W
    const y = rand() * H
    const a = rand() * Math.PI
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + Math.cos(a) * 9, y + Math.sin(a) * 9)
    ctx.stroke()
  }
  ctx.restore()
}

function starPath(cx, cy, r, rot) {
  let d = ''
  for (let i = 0; i < 10; i += 1) {
    const rr2 = i % 2 === 0 ? r : r * 0.45
    const a = rot - Math.PI / 2 + (i * Math.PI) / 5
    d += `${i === 0 ? 'M' : 'L'}${cx + Math.cos(a) * rr2} ${cy + Math.sin(a) * rr2} `
  }
  return `${d}Z`
}

// 반짝이로 채운 별
function glitterStar(ctx, x, y, r, rot, color) {
  const p = new Path2D(starPath(x, y, r, rot))
  ctx.save()
  ctx.clip(p)
  ctx.globalAlpha = 0.5
  ctx.fillStyle = color
  ctx.fill(p)
  const rand = seeded(Math.round(x * 7 + y * 13 + r))
  const n = Math.max(40, r * r * 0.9)
  for (let i = 0; i < n; i += 1) {
    const k = rand()
    ctx.fillStyle = k < 0.55 ? color : k < 0.8 ? '#ffffff' : 'rgba(0,0,0,.35)'
    ctx.globalAlpha = 0.45 + rand() * 0.55
    const size = 1.2 + rand() * 2.6
    ctx.fillRect(x - r + rand() * r * 2, y - r + rand() * r * 2, size, size)
  }
  ctx.restore()
}

// ── 마커 선 그림 (600×600 칸) ──

// 와인잔: 발 아래 가운데(x, y) 기준, angle만큼 기울인다
function sketchGlass(ctx, x, y, angle, scale, color) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)
  ctx.scale(scale, scale)
  ctx.lineWidth /= scale
  const bowl = new Path2D('M-40 -175 C-44 -120 -32 -94 0 -91 C32 -94 44 -120 40 -175 Z')
  ctx.fillStyle = PAPER
  ctx.fill(bowl)
  ctx.save()
  ctx.clip(bowl)
  ctx.fillStyle = color
  ctx.fillRect(-50, -140, 100, 60)
  ctx.restore()
  ctx.stroke(bowl)
  line(ctx, 'M0 -91 V-10')
  shape(ctx, ellipse(0, -7, 32, 7), PAPER)
  line(ctx, 'M-26 -160 Q-30 -130 -22 -112')
  ctx.restore()
}

function drinksSketch(ctx, color) {
  // 와인병
  ctx.save()
  ctx.translate(160, 575)
  ctx.rotate(-0.12)
  shape(ctx, 'M-48 0 L-48 -250 Q-48 -300 -16 -322 L-16 -420 L16 -420 L16 -322 Q48 -300 48 -250 L48 0 Z', PAPER)
  shape(ctx, rr(-40, -210, 80, 100, 6), color)
  shape(ctx, rr(-20, -444, 40, 26, 4), MARKER)
  ctx.restore()
  // 건배하는 잔 두 개 + 튀는 방울
  sketchGlass(ctx, 292, 585, 0.2, 1.55, color)
  sketchGlass(ctx, 490, 585, -0.2, 1.55, color)
  for (const [x, y, r] of [[390, 282, 9], [368, 258, 6], [414, 252, 7], [392, 224, 5]]) dot(ctx, ellipse(x, y, r), color)
  line(ctx, 'M350 300 L330 282 M432 300 L452 282')
}

function mug(ctx, cx, angle, color, side) {
  ctx.save()
  ctx.translate(cx, 530)
  ctx.rotate(angle)
  line(ctx, `M${side * 80} -165 C${side * 145} -165 ${side * 145} -60 ${side * 76} -62`)
  const body = 'M-85 -200 L85 -200 L75 0 Q0 14 -75 0 Z'
  shape(ctx, body, PAPER)
  ctx.save()
  ctx.clip(new Path2D(body))
  ctx.fillStyle = color
  ctx.fillRect(-90, -138, 180, 40)
  ctx.restore()
  shape(ctx, body)
  shape(ctx, ellipse(0, -200, 85, 14), '#6b4a36')
  ctx.restore()
}

function cafeSketch(ctx, color) {
  line(ctx, 'M30 545 Q300 556 570 536')
  mug(ctx, 170, 0.07, color, -1)
  mug(ctx, 430, -0.07, color, 1)
  // 두 잔에서 오르는 김이 하트로 만난다
  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = 6
  line(ctx, 'M190 300 C170 262 214 240 196 206 C186 186 214 170 236 160')
  line(ctx, 'M410 300 C430 262 386 240 404 206 C414 186 386 170 364 160')
  line(ctx, heart(300, 130, 40))
  ctx.restore()
  // 쿠키 한 접시
  shape(ctx, ellipse(300, 532, 62, 12), PAPER)
  shape(ctx, ellipse(300, 508, 34, 22), PAPER)
  for (const [x, y] of [[288, 500], [310, 512], [300, 494], [318, 500]]) dot(ctx, ellipse(x, y, 3.5), MARKER)
}

function birthdaySketch(ctx, color) {
  // 풍선
  ctx.save()
  ctx.lineWidth = 3.5
  line(ctx, 'M95 222 C80 290 128 330 175 410')
  line(ctx, 'M505 206 C522 280 478 322 430 402')
  ctx.restore()
  shape(ctx, ellipse(95, 140, 62, 78), PAPER)
  shape(ctx, 'M85 228 L95 214 L105 228 Z', PAPER)
  line(ctx, 'M68 104 Q74 90 88 86')
  shape(ctx, ellipse(505, 124, 58, 74), color)
  shape(ctx, 'M495 208 L505 194 L515 208 Z', color)
  // 케이크
  shape(ctx, ellipse(300, 565, 232, 26), PAPER)
  shape(ctx, rr(120, 412, 360, 150, 8), PAPER)
  shape(ctx, drips(120, 412, 360, 24, 8), color)
  shape(ctx, rr(182, 302, 236, 114, 8), PAPER)
  shape(ctx, drips(182, 302, 236, 20, 6), color)
  const rand = seeded(13)
  ctx.save()
  ctx.lineWidth = 4
  for (let i = 0; i < 18; i += 1) {
    const top = i < 7
    const x = top ? 200 + rand() * 200 : 140 + rand() * 320
    const y = top ? 350 + rand() * 50 : 470 + rand() * 75
    const a = rand() * Math.PI
    line(ctx, `M${x} ${y} L${x + Math.cos(a) * 9} ${y + Math.sin(a) * 9}`)
  }
  ctx.restore()
  for (const x of [232, 266, 300, 334, 368]) {
    shape(ctx, rr(x - 6, 244, 12, 58, 3), PAPER)
    shape(ctx, `M${x} 206 Q${x + 12} 226 ${x} 234 Q${x - 12} 226 ${x} 206 Z`, color)
  }
  // 색 조각
  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = 5
  for (const [x, y, a] of [[40, 300, 0.5], [560, 320, -0.4], [250, 120, 1], [360, 70, -0.8], [470, 270, 0.3], [150, 280, -0.6]]) {
    line(ctx, `M${x} ${y} L${x + Math.cos(a) * 16} ${y + Math.sin(a) * 16}`)
  }
  ctx.restore()
}

// 선글라스 낀 얼굴: 얼굴 윤곽 없이 성긴 머리카락 선이 얼굴을 감싼다
function face(ctx, cx, cy, v, color) {
  // 뒤에 있는 그림의 선을 가린다
  dot(ctx, ellipse(cx, cy + 6, 50, 68), PAPER)
  ctx.save()
  ctx.lineWidth = 4.5
  line(ctx, `M${cx - 60} ${cy - 4} Q${cx - 66} ${cy - 98} ${cx} ${cy - 104} Q${cx + 66} ${cy - 98} ${cx + 60} ${cy - 4}`)
  const end = v.short ? 60 : 140
  for (const side of [-1, 1]) {
    const X = (dx) => cx + side * dx
    for (let k = 0; k < 3; k += 1) {
      const o = k * 15
      const len = end - k * 18
      if (v.wavy) {
        line(ctx, `M${X(52 + o * 0.4)} ${cy - 78 + o} C${X(86 + o * 0.3)} ${cy - 24} ${X(50 + o)} ${cy + 16} ${X(82 + o * 0.5)} ${cy + 56} S${X(62 + o)} ${cy + 100} ${X(90 + o * 0.4)} ${cy + len}`)
      } else {
        line(ctx, `M${X(56 + o * 0.3)} ${cy - 80 + o} C${X(70 + o * 0.4)} ${cy - 4} ${X(66 + o * 0.6)} ${cy + 70} ${X(76 + o * 0.7)} ${cy + len}`)
      }
    }
  }
  if (v.bangs) {
    for (let j = -2; j <= 2; j += 1) line(ctx, `M${cx + j * 20} ${cy - 100} Q${cx + j * 22} ${cy - 70} ${cx + j * 24} ${cy - 44}`)
  } else {
    line(ctx, `M${cx + 14} ${cy - 103} Q${cx - 26} ${cy - 88} ${cx - 50} ${cy - 40}`)
    line(ctx, `M${cx + 14} ${cy - 103} Q${cx + 42} ${cy - 84} ${cx + 52} ${cy - 42}`)
  }
  ctx.restore()
  // 선글라스
  if (v.round) {
    dot(ctx, ellipse(cx - 25, cy - 6, 22, 20), MARKER)
    dot(ctx, ellipse(cx + 25, cy - 6, 22, 20), MARKER)
  } else {
    for (const side of [-1, 1]) {
      const X = (dx) => cx + side * dx
      dot(ctx, `M${X(56)} ${cy - 22} L${X(6)} ${cy - 18} Q${X(8)} ${cy + 8} ${X(26)} ${cy + 10} Q${X(48)} ${cy + 8} ${X(56)} ${cy - 22} Z`, MARKER)
    }
  }
  line(ctx, `M${cx - 6} ${cy - 14} Q${cx} ${cy - 20} ${cx + 6} ${cy - 14}`)
  ctx.save()
  ctx.lineWidth = 4
  line(ctx, `M${cx + 2} ${cy + 16} Q${cx + 8} ${cy + 26} ${cx} ${cy + 28}`)
  ctx.restore()
  dot(ctx, `M${cx - 16} ${cy + 46} Q${cx - 8} ${cy + 38} ${cx} ${cy + 43} Q${cx + 8} ${cy + 38} ${cx + 16} ${cy + 46} Q${cx} ${cy + 60} ${cx - 16} ${cy + 46} Z`, color)
}

function girlsSketch(ctx, color) {
  // 뒤에서 앞 순서로 그린다
  face(ctx, 150, 150, { bangs: true }, color)
  face(ctx, 450, 145, { wavy: true }, color)
  face(ctx, 300, 278, { bangs: true, short: true }, color)
  face(ctx, 160, 438, { round: true }, color)
  face(ctx, 440, 430, { wavy: true, bangs: true }, color)
}

// ── 공통 도구 ──

// 이름이 길면 「가, 나 외 3명」으로 줄인다
function fitNames(ctx, names, max, family) {
  ctx.font = `28px ${family}`
  for (let k = names.length; k > 1; k -= 1) {
    const text = k === names.length ? names.join(', ') : `${names.slice(0, k).join(', ')} 외 ${names.length - k}명`
    if (ctx.measureText(text).width <= max) return text
  }
  return names.length > 1 ? `${names[0]} 외 ${names.length - 1}명` : (names[0] ?? '')
}

function fitSize(ctx, text, font, maxSize, maxWidth) {
  ctx.font = font.replace('{}', maxSize)
  const w = ctx.measureText(text).width
  return w > maxWidth ? Math.floor((maxSize * maxWidth) / w) : maxSize
}

function clip(ctx, text, max) {
  if (ctx.measureText(text).width <= max) return text
  let t = text
  while (t && ctx.measureText(`${t}…`).width > max) t = t.slice(0, -1)
  return `${t}…`
}

function seeded(seed) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function rr(x, y, w, h, r) {
  return `M${x + r} ${y} H${x + w - r} Q${x + w} ${y} ${x + w} ${y + r} V${y + h - r} Q${x + w} ${y + h} ${x + w - r} ${y + h} H${x + r} Q${x} ${y + h} ${x} ${y + h - r} V${y + r} Q${x} ${y} ${x + r} ${y} Z`
}

function ellipse(cx, cy, rx, ry = rx) {
  return `M${cx - rx} ${cy} a${rx} ${ry} 0 1 0 ${2 * rx} 0 a${rx} ${ry} 0 1 0 ${-2 * rx} 0 Z`
}

function heart(cx, cy, s) {
  return `M${cx} ${cy + s * 0.9} C${cx - s * 1.6} ${cy - s * 0.2} ${cx - s * 0.6} ${cy - s * 1.3} ${cx} ${cy - s * 0.4} C${cx + s * 0.6} ${cy - s * 1.3} ${cx + s * 1.6} ${cy - s * 0.2} ${cx} ${cy + s * 0.9} Z`
}

// 케이크 위로 흘러내린 아이싱 띠
function drips(x, y, w, d, n = 6) {
  const seg = w / n
  let s = `M${x} ${y} H${x + w} V${y + d}`
  for (let i = n - 1; i >= 0; i -= 1) {
    const x0 = x + i * seg
    s += ` Q${x0 + seg / 2} ${y + d + (i % 2 === 0 ? d * 1.4 : d * 0.5)} ${x0} ${y + d}`
  }
  return `${s} Z`
}

// 채우고 테두리를 긋는다. fill이 없으면 선만
function shape(ctx, d, fill) {
  const p = new Path2D(d)
  if (fill) {
    ctx.fillStyle = fill
    ctx.fill(p)
  }
  ctx.stroke(p)
}

function dot(ctx, d, fill) {
  ctx.fillStyle = fill
  ctx.fill(new Path2D(d))
}

function line(ctx, d) {
  ctx.stroke(new Path2D(d))
}
