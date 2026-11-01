export function roomLink(roomId) {
  return `${window.location.origin}/r/${roomId}`
}

// 붙여 넣은 글에서 방 id를 찾는다: 전체 링크든 '/r/abc123'이든
export function parseRoomLink(text) {
  return text.trim().match(/\/r\/([A-Za-z0-9]{4,})/)?.[1] ?? null
}
