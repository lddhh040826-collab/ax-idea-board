// Supabase 주소와 키가 있으면 서버에 저장하고, 없으면 이 브라우저에만 저장한다(체험판)
export const remote = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)
