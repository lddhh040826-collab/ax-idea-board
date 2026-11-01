// 방 기능. 화면은 이 파일만 부른다. 실제 일은 서버판(server/) 또는 브라우저 저장판(local/)이 한다
// 두 판의 결과 모양이 같고, 모두 Promise를 돌려준다
import { remote } from './backend.js'
import * as local from './local/rooms.js'
import * as server from './server/rooms.js'

export { LIMITS } from './limits.js'
export { parseRoomLink, roomLink } from './links.js'

const impl = remote ? server : local
const run = (name) => async (...args) => impl[name](...args)

export const createRoom = run('createRoom')
export const loadRoom = run('loadRoom')
export const listMyRooms = run('listMyRooms')
export const joinRoom = run('joinRoom')
export const leaveRoom = run('leaveRoom')
export const saveOffDays = run('saveOffDays')
export const saveNote = run('saveNote')
export const confirmDate = run('confirmDate')
export const cancelConfirm = run('cancelConfirm')
export const renameRoom = run('renameRoom')
export const changePassword = run('changePassword')
export const deleteRoom = run('deleteRoom')
