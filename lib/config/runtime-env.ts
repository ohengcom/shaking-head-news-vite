type EnvRecord = Record<string, string | boolean | undefined>

function getImportMetaEnv(): EnvRecord | null {
  if (typeof import.meta === 'undefined' || !import.meta.env) {
    return null
  }

  return import.meta.env as EnvRecord
}

function getProcessEnv(): EnvRecord | null {
  if (typeof process === 'undefined' || !process.env) {
    return null
  }

  return process.env as EnvRecord
}

function getCandidateKeys(key: string): string[] {
  if (key.startsWith('NEXT_PUBLIC_')) {
    return [key, `VITE_${key.slice('NEXT_PUBLIC_'.length)}`]
  }

  if (key.startsWith('VITE_')) {
    return [key, `NEXT_PUBLIC_${key.slice('VITE_'.length)}`]
  }

  return [key, `VITE_${key}`]
}

export function getEnvValue(key: string): string | undefined {
  const importMetaEnv = getImportMetaEnv()
  const processEnv = getProcessEnv()

  for (const candidate of getCandidateKeys(key)) {
    const fromImportMeta = importMetaEnv?.[candidate]
    if (typeof fromImportMeta === 'string' && fromImportMeta.trim().length > 0) {
      return fromImportMeta.trim()
    }

    const fromProcess = processEnv?.[candidate]
    if (typeof fromProcess === 'string' && fromProcess.trim().length > 0) {
      return fromProcess.trim()
    }
  }

  return undefined
}

export function getRuntimeMode(): string {
  const importMetaEnv = getImportMetaEnv()
  if (typeof importMetaEnv?.MODE === 'string' && importMetaEnv.MODE.length > 0) {
    return importMetaEnv.MODE
  }

  const processEnv = getProcessEnv()
  if (typeof processEnv?.NODE_ENV === 'string' && processEnv.NODE_ENV.length > 0) {
    return processEnv.NODE_ENV
  }

  return 'development'
}

export function isDevelopmentRuntime(): boolean {
  const importMetaEnv = getImportMetaEnv()
  if (typeof importMetaEnv?.DEV === 'boolean') {
    return importMetaEnv.DEV
  }

  return getRuntimeMode() === 'development'
}

export function isTestRuntime(): boolean {
  return getRuntimeMode() === 'test'
}

export function isProductionRuntime(): boolean {
  const importMetaEnv = getImportMetaEnv()
  if (typeof importMetaEnv?.PROD === 'boolean') {
    return importMetaEnv.PROD
  }

  return getRuntimeMode() === 'production'
}

export function isNonProductionRuntime(): boolean {
  return !isProductionRuntime()
}
