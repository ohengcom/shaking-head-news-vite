import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { cloudflare } from '@cloudflare/vite-plugin'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  environments: {
    client: {
      build: {
        rolldownOptions: {
          output: {
            codeSplitting: {
              groups: [
                {
                  name: 'react-vendor',
                  test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/,
                  priority: 3,
                },
                {
                  name: 'ui-vendor',
                  test: /node_modules[\\/](@radix-ui|framer-motion|lucide-react)[\\/]/,
                  priority: 2,
                },
                {
                  name: 'vendor',
                  test: /node_modules[\\/]/,
                  priority: 1,
                  maxSize: 250_000,
                },
              ],
            },
          },
        },
      },
    },
  },
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
