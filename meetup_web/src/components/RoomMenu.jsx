// 모임 설정 (모임 이름 왼쪽 ✎): 링크 복사 / (모임장) 이름·암호 변경, 모임 삭제 / (참여자) 모임 나가기. 약속 취소는 약속 창에서
import { useState } from 'react'
import { LIMITS, changePassword, deleteRoom, leaveRoom, renameRoom, roomLink } from '../api/rooms.js'
import CopyButton from './CopyButton.jsx'
import Dialog from './Dialog.jsx'

export default function RoomMenu({ room, isHost, onClose, onChange, onError, onGone }) {
  const [title, setTitle] = useState(room.title)
  const [password, setPassword] = useState('')

  const run = async (fn, done) => {
    try {
      await fn()
      onChange(done)
    } catch (err) {
      onError(err.message)
    }
  }

  return (
    <Dialog title="모임 설정" onClose={onClose}>
      <div className="stack">
        <CopyButton text={roomLink(room.id)} label="모임 링크 복사하기" className="btn wide" />
        {isHost ? (
          <>
            <form className="row" onSubmit={(e) => { e.preventDefault(); run(() => renameRoom(room.id, title), '모임 이름을 바꿨어요') }}>
              <input value={title} maxLength={LIMITS.title} onChange={(e) => setTitle(e.target.value)} aria-label="모임 이름" />
              <button className="btn" type="submit">이름 변경</button>
            </form>
            <form
              className="row"
              onSubmit={(e) => {
                e.preventDefault()
                run(() => changePassword(room.id, password), '암호를 바꿨어요')
                setPassword('')
              }}
            >
              <input value={password} inputMode="numeric" maxLength={LIMITS.password} onChange={(e) => setPassword(e.target.value.replace(/\D/g, ''))} placeholder="새 암호" aria-label="새 암호" />
              <button className="btn" type="submit" disabled={!password}>암호 변경</button>
            </form>
            <button
              type="button"
              className="btn danger wide"
              onClick={async () => {
                if (!window.confirm(`'${room.title}' 모임을 삭제할까요?\n삭제하면 되돌릴 수 없어요.`)) return
                try {
                  await deleteRoom(room.id)
                  onGone('모임을 삭제했어요')
                } catch (err) {
                  onError(err.message)
                }
              }}
            >
              모임 삭제
            </button>
          </>
        ) : (
          <button
            type="button"
            className="btn danger wide"
            onClick={async () => {
              if (!window.confirm(`'${room.title}' 모임에서 나갈까요?\n내가 표시한 날짜와 메모도 함께 지워져요.`)) return
              try {
                await leaveRoom(room.id)
                onGone('모임에서 나왔어요')
              } catch (err) {
                onError(err.message)
              }
            }}
          >
            모임 나가기
          </button>
        )}
      </div>
    </Dialog>
  )
}
