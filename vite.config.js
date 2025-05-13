// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'

export default defineConfig({
  plugins: [ react() ],
  css: {
    postcss: {
      plugins: [
        tailwindcss(),
        autoprefixer(),
      ],
    },
  },
  server: {
    host: true,            // ← bind to 0.0.0.0 so LAN devices can reach you
    port: 5174,            // ← optional: choose a fixed port
    strictPort: false,     // ← if true, Vite will error if 5174 is busy
    hmr: true,
    watch: {
      usePolling: true,
      interval: 1000
    },
  },
})


