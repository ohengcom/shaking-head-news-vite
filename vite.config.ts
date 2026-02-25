import path from 'node:path'
import { fileURLToPath } from 'node:url'
import rsc from '@vitejs/plugin-rsc'
import vinext from 'vinext'
import { defineConfig } from 'vite'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      '@': rootDir,
    },
  },
  plugins: [
    vinext({ rsc: false }),
    rsc({
      entries: {
        rsc: 'virtual:vinext-rsc-entry',
        ssr: 'virtual:vinext-app-ssr-entry',
        client: 'virtual:vinext-app-browser-entry',
      },
    }),
  ],
})
