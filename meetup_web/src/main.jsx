import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './styles.css'
import './look-mono.css'

// 디자인 고르기: VITE_LOOK=mono 로 켜면 흑백 포스터 디자인 (look-mono.css). 기본은 원래 디자인
if (import.meta.env.VITE_LOOK === 'mono') document.documentElement.dataset.look = 'mono'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
