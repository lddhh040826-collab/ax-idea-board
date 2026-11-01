// 입력 제한과 로그인 유지 시간. 브라우저 저장판과 서버판이 같이 쓴다 (서버 쪽 확인은 supabase/schema.sql)
export const AUTH_LIMITS = { name: 10, password: 4 }
export const LIMITS = { title: 10, password: 8, members: 8, note: 100 }
export const SESSION_TTL_MS = 10 * 60 * 1000
