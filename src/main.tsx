import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initSession } from './services/sessionService'

// Khôi phục phiên đăng nhập còn hạn trước khi render để không bị chuyển về trang đăng nhập.
initSession()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
