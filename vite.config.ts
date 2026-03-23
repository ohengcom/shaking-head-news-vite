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
      'next-intl': path.resolve(rootDir, 'src/shims/next-intl.tsx'),
      'next-intl/server': path.resolve(rootDir, 'src/shims/next-intl-server.ts'),
      'next/navigation': path.resolve(rootDir, 'src/shims/next-navigation.tsx'),
      'next/link': path.resolve(rootDir, 'src/shims/next-link.tsx'),
      'next/image': path.resolve(rootDir, 'src/shims/next-image.tsx'),
      'next/dynamic': path.resolve(rootDir, 'src/shims/next-dynamic.tsx'),
      'next/cache': path.resolve(rootDir, 'src/shims/next-cache.ts'),
      'next-themes': path.resolve(rootDir, 'src/shims/next-themes.tsx'),
    },
  },
  plugins: [react(), cloudflare()],
})
