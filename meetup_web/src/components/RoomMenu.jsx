// 방 메뉴: 링크 복사 / (방장) 이름·암호 변경, 확정 취소, 방 삭제 / (참여자) 방 나가기
import { useState } from 'react'
import { LIMITS, cancelConfirm, changePassword, deleteRoom, leaveRoom, renameRoom, roomLink } from '../api/rooms.js'
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
    <Dialog title="방 메뉴" onClose={onClose}>
      <div className="stack">
        <CopyButton text={roomLink(room.id)} label="방 링크 복사하기" className="btn wide" />
        {isHost ? (
          <>
            <form className="row" onSubmit={(e) => { e.preventDefault(); run(() => renameRoom(room.id, title), '방 이름을 바꿨어요') }}>
              <input value={title} maxLength={LIMITS.title} onChange={(e) => setTitle(e.target.value)} aria-label="방 이름" />
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
            {room.confirmedDate && (
              <button type="button" className="btn wide" onClick={() => window.confirm('확정을 취소할까요?') && run(() => cancelConfirm(room.id), '확정을 취소했어요')}>
                날짜 확정 취소
              </button>
            )}
            <button
              type="button"
              className="btn danger wide"
              onClick={async () => {
                if (!window.confirm(`'${room.title}' 방을 삭제할까요?\n삭제하면 되돌릴 수 없어요.`)) return
                try {
                  await deleteRoom(room.id)
                  onGone('방을 삭제했어요')
                } catch (err) {
                  onError(err.message)
                }
              }}
            >
              방 삭제
            </button>
          </>
        ) : (
          <button
            type="button"
            className="btn danger wide"
            onClick={async () => {
              if (!window.confirm(`'${room.title}' 방에서 나갈까요?\n내가 표시한 날짜와 메모도 함께 지워져요.`)) return
              try {
                await leaveRoom(room.id)
                onGone('방에서 나왔어요')
              } catch (err) {
                onError(err.message)
              }
            }}
          >
            방 나가기
          </button>
        )}
      </div>
    </Dialog>
  )
}
