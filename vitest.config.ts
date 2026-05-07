import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  test: {
    // Use jsdom for DOM testing
    environment: 'jsdom',
    // Enable global test APIs (describe, it, expect, etc.)
    globals: true,
    // Setup file for test configuration
    setupFiles: './tests/setup.ts',
    // Test file patterns
    include: ['tests/**/*.{test,spec}.{ts,tsx}'],
    // Exclude patterns
    exclude: ['node_modules', '.next', 'tests/e2e/**'],
    // Coverage configuration using V8 provider (recommended for Vitest 4.x)
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        '.next/',
        'tests/',
        '**/*.config.{js,ts,cjs,mjs}',
        '**/types/**',
        '**/*.d.ts',
      ],
    },
    // Vitest 4.x recommended settings
    pool: 'forks',
    // Isolate tests for better reliability
    isolate: true,
    // Reporter configuration
    reporters: ['default'],
  },
  resolve: {
    alias: {
      '@': rootDir,
      'next-intl': path.resolve(rootDir, 'src/shims/next-intl.tsx'),
      'next/navigation': path.resolve(rootDir, 'src/shims/next-navigation.tsx'),
      'next/link': path.resolve(rootDir, 'src/shims/next-link.tsx'),
      'next/cache': path.resolve(rootDir, 'src/shims/next-cache.ts'),
      'next-themes': path.resolve(rootDir, 'src/shims/next-themes.tsx'),
    },
  },
})
