import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    // 설치형 웹앱(PWA): 바탕화면 아이콘으로 설치하고, 한 번 연 뒤에는 인터넷 없이도 열린다.
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: '계약서 버전 대조',
        short_name: '계약서 대조',
        description: '구버전과 신버전 계약서를 조항 단위로 비교해 추가·삭제·수정을 짚어 주는 도구',
        lang: 'ko',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        background_color: '#f6f7f9',
        theme_color: '#2f5bd3',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,mjs,css,html,svg,png}'],
        // PDF 읽기 worker가 1.3MB라 기본 한도(2MB)에 여유를 둔다.
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
    }),
  ],
  server: {
    port: 3055,
    strictPort: true,
  },
  preview: {
    port: 3055,
    strictPort: true,
  },
})
