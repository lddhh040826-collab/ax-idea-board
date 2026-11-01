// Supabase 연결. 기기마다 익명 로그인을 하나 만들어 두고, 「이름 + 비밀번호」 로그인은 DB 함수(sign_in)가 한다
import { createClient } from '@supabase/supabase-js'

let client = null
let device = null

export function sb() {
  client ??= createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY)
  return client
}

// 이 기기의 익명 로그인 (없으면 만든다)
export function ensureDevice() {
  device ??= (async () => {
    const { data } = await sb().auth.getSession()
    if (data.session) return
    const { error } = await sb().auth.signInAnonymously()
    if (error) throw new Error(friendly(error))
  })().catch((err) => {
    device = null
    throw err
  })
  return device
}

export async function rpc(name, args) {
  await ensureDevice()
  return must(await sb().rpc(name, args))
}

// Supabase 응답에서 오류를 꺼내 한국어 문장으로 던진다
export function must({ data, error }) {
  if (error) throw new Error(friendly(error))
  return data
}

function friendly(error) {
  const msg = error.message ?? ''
  if (/anonymous sign-ins are disabled/i.test(msg)) return '서버 설정에서 익명 로그인(Anonymous sign-ins)을 켜 주세요'
  if (/failed to fetch|network/i.test(msg)) return '서버에 연결하지 못했어요. 인터넷 연결을 확인해 주세요'
  if (error.code === '42501') return '권한이 없어요'
  // DB 함수가 raise exception으로 던진 한국어 문장은 그대로 보여 준다
  return msg || '서버 오류가 났어요'
}
