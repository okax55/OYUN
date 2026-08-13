import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    sourcemap: false, // Kaynak kodların tarayıcıda görünmesini engeller
  },
  esbuild: {
    // @ts-ignore
    drop: ['console', 'debugger'], // console.log ve debugger'ları siler
  },
})
