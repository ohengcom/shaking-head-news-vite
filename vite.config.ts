import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { cloudflare } from '@cloudflare/vite-plugin'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  server: {
    port: 3001,
  },
  preview: {
    port: 3001,
  },
  resolve: {
    alias: {
      '@': rootDir,
    },
  },
  plugins: [react(), cloudflare()],
})
