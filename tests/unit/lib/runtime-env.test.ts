import { afterEach, describe, expect, it } from 'vitest'
import { getEnvValue, isNonProductionRuntime, isTestRuntime } from '@/lib/config/runtime-env'

const ORIGINAL_ENV = { ...process.env }

afterEach(() => {
  process.env = { ...ORIGINAL_ENV }
})

describe('runtime env helpers', () => {
  it('reads canonical VITE-prefixed keys', () => {
    process.env.VITE_LOG_LEVEL = 'info'

    expect(getEnvValue('VITE_LOG_LEVEL')).toBe('info')
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
