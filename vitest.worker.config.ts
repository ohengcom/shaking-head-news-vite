import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { cloudflareTest } from '@cloudflare/vitest-pool-workers'
import { defineConfig } from 'vitest/config'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
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
