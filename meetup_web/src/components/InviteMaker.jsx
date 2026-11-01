// 확정 날짜 초대장: 카테고리를 고르면 9:16 이미지로 그리고, 복사·저장·공유한다
import { useEffect, useRef, useState } from 'react'
import { CATEGORIES, INVITE_SIZE, drawInvite, loadInviteFonts } from '../lib/invite.js'
import Dialog from './Dialog.jsx'

export default function InviteMaker({ room, profiles, onClose, onDone, onError }) {
  const [category, setCategory] = useState(null)
  const [time, setTime] = useState('')
  const [place, setPlace] = useState('')
  const [dress, setDress] = useState('')
  // 처음엔 참여자 이름. 쉼표로 나눠 고칠 수 있다
  const [who, setWho] = useState(() => profiles.map((p) => p.name).join(', '))
  const [ready, setReady] = useState(false)
  const canvasRef = useRef(null)

  useEffect(() => {
    if (!category) return undefined
    let cancelled = false
    const invite = { room, category, time: time.trim(), place: place.trim(), dress: dress.trim(), who: who.trim() }
    setReady(false)
    loadInviteFonts(invite)
      .catch(() => {}) // 글꼴을 못 받아도 기본 글꼴로 그린다
      .then(() => {
        if (cancelled || !canvasRef.current) return
        drawInvite(canvasRef.current.getContext('2d'), invite)
        setReady(true)
      })
    return () => {
      cancelled = true
    }
  }, [room, category, time, place, dress, who])

  const fileName = `${room.title}-초대장.png`
  const toBlob = () => new Promise((resolve, reject) => canvasRef.current.toBlob((b) => (b ? resolve(b) : reject(new Error('이미지를 만들지 못했어요'))), 'image/png'))

  const copy = async () => {
    try {
      // Safari는 클릭한 그 순간에 write를 불러야 해서 Blob 대신 Promise를 넘긴다
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': toBlob() })])
      onDone('초대장 이미지를 복사했어요')
    } catch {
      onError('이 브라우저에서는 이미지 복사가 막혀 있어요. 저장하기를 눌러 주세요')
    }
  }

  const save = async () => {
    const url = URL.createObjectURL(await toBlob())
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const canShare = typeof navigator.canShare === 'function' && navigator.canShare({ files: [new File([''], fileName, { type: 'image/png' })] })
  const share = async () => {
    try {
      const file = new File([await toBlob()], fileName, { type: 'image/png' })
      await navigator.share({ files: [file], title: `${room.title} 초대장` })
    } catch (err) {
      if (err.name !== 'AbortError') onError('공유하지 못했어요. 저장하기를 눌러 주세요')
    }
  }

  return (
    <Dialog title="초대장 만들기" onClose={onClose}>
      <div className="stack">
        <p className="muted small">모임 종류를 고르면 초대장이 만들어져요.</p>
        <div className="chips">
          {CATEGORIES.map((c) => (
            <button key={c.key} type="button" className={`chip ${category === c.key ? 'on' : ''}`} onClick={() => setCategory(c.key)}>
              {c.label}
            </button>
          ))}
        </div>
        {category && (
          <>
            <div className="row">
              <input value={time} maxLength={20} onChange={(e) => setTime(e.target.value)} placeholder="시간 (예: 저녁 7시)" aria-label="시간" />
              <input value={dress} maxLength={20} onChange={(e) => setDress(e.target.value)} placeholder="드레스코드 (예: 올블랙)" aria-label="드레스코드" />
            </div>
            <input value={place} maxLength={30} onChange={(e) => setPlace(e.target.value)} placeholder="장소 (예: 강남역 11번 출구)" aria-label="장소" />
            <input value={who} maxLength={80} onChange={(e) => setWho(e.target.value)} placeholder="함께하는 사람 (쉼표로 구분)" aria-label="함께하는 사람" />
            <canvas ref={canvasRef} className="invite" width={INVITE_SIZE.width} height={INVITE_SIZE.height} aria-label={`${room.title} 초대장 미리보기`} />
            <div className="row wrap">
              <button type="button" className="btn primary" disabled={!ready} onClick={copy}>이미지 복사</button>
              <button type="button" className="btn" disabled={!ready} onClick={save}>저장하기</button>
              {canShare && <button type="button" className="btn" disabled={!ready} onClick={share}>공유하기</button>}
            </div>
          </>
        )}
      </div>
    </Dialog>
  )
}
