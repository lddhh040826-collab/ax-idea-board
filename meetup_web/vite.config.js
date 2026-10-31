import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// 아이디어 보드(3000), 계약서 대조(3055), 모임 일정 잡기(3057)와 겹치지 않게 3059를 쓴다.
export default defineConfig({
  plugins: [react()],
  server: { port: 3059, strictPort: true },
  preview: { port: 3059, strictPort: true },
})
