import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { cloudflareTest } from '@cloudflare/vitest-plugin'
import { defineConfig } from 'vitest/config'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

// Keep the Vitest cache out of the OneDrive-synced workspace on Windows.
// Non-Windows environments (CI) use the default cache location.
const isWindows = process.platform === 'win32'

export default defineConfig({
  ...(isWindows ? { cacheDir: 'C:/temp/shaking-head-news-vite/vitest-worker-cache' } : {}),
  plugins: [
    cloudflareTest({
      main: './worker/index.ts',
      wrangler: {
        configPath: './wrangler.jsonc',
      },
    }),
  ],
  test: {
    include: ['tests/worker/**/*.{test,spec}.ts'],
    isolate: true,
    reporters: ['default'],
  },
  resolve: {
    alias: {
      '@': rootDir,
    },
  },
})
