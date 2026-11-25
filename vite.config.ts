import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages phục vụ tại /<tên-repo>/ nên cần base này (đổi nếu đổi tên repo).
  base: '/E-Mobility-Hub/',
  plugins: [react(), tailwindcss()],
})
