// 로그인 상태를 화면 전체에 나눠 준다
import { createContext, useContext } from 'react'

export const SessionContext = createContext({ session: null, setSession: () => {} })

export function useSession() {
  return useContext(SessionContext)
}

// 로그인 전에 열려던 주소(/r/:id)를 기억했다가 로그인 후 그곳으로 보낸다
const RETURN_KEY = 'eonje:return-to'

export function rememberReturnPath(path) {
  sessionStorage.setItem(RETURN_KEY, path)
}

export function takeReturnPath() {
  const path = sessionStorage.getItem(RETURN_KEY)
  sessionStorage.removeItem(RETURN_KEY)
  return path
}
