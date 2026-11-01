// 로그인. 화면은 이 파일만 부른다. 실제 일은 서버판(server/) 또는 브라우저 저장판(local/)이 한다
// 두 판의 결과 모양이 같고, 모두 Promise를 돌려준다
import { remote } from './backend.js'
import * as local from './local/auth.js'
import * as server from './server/auth.js'

export { AUTH_LIMITS } from './limits.js'

const impl = remote ? server : local
const run = (name) => async (...args) => impl[name](...args)

export const getSession = run('getSession')
export const touchSession = run('touchSession')
export const accountExists = run('accountExists')
export const signIn = run('signIn')
export const signUp = run('signUp')
export const signOut = run('signOut')
