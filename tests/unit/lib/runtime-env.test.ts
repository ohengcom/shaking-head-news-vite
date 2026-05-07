import { afterEach, describe, expect, it } from 'vitest'
import { getEnvValue, isNonProductionRuntime, isTestRuntime } from '@/lib/config/runtime-env'

const ORIGINAL_ENV = { ...process.env }

afterEach(() => {
  process.env = { ...ORIGINAL_ENV }
})

describe('runtime env helpers', () => {
  it('prefers the canonical NEXT_PUBLIC key and falls back to VITE', () => {
    process.env.NEXT_PUBLIC_GA_ID = ''
    process.env.VITE_GA_ID = 'vite-ga'

    expect(getEnvValue('NEXT_PUBLIC_GA_ID')).toBe('vite-ga')
  })

  it('prefers the canonical VITE key and falls back to NEXT_PUBLIC', () => {
    process.env.VITE_SENTRY_DSN = ''
    process.env.NEXT_PUBLIC_SENTRY_DSN = 'legacy-dsn'

    expect(getEnvValue('VITE_SENTRY_DSN')).toBe('legacy-dsn')
  })

  it('maps plain keys to their VITE-prefixed counterpart', () => {
    process.env.VITE_LOG_LEVEL = 'debug'

    expect(getEnvValue('LOG_LEVEL')).toBe('debug')
  })

  it('treats NODE_ENV=test as test runtime', () => {
    process.env.NODE_ENV = 'test'

    expect(isTestRuntime()).toBe(true)
    expect(isNonProductionRuntime()).toBe(true)
  })

  it('treats non-production runtimes as suppressible environments', () => {
    process.env.NODE_ENV = 'development'

    expect(isNonProductionRuntime()).toBe(true)
  })
})
