import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import enMessages from '@/messages/en.json'
import zhMessages from '@/messages/zh.json'

export type AppLocale = 'zh' | 'en'

type MessageTree = Record<string, unknown>
type TranslationValues = Record<string, string | number | boolean | null | undefined>
type TranslateFn = (key: string, values?: TranslationValues) => string

interface I18nContextValue {
  locale: AppLocale
  messages: MessageTree
  setLocale: (locale: AppLocale) => void
}

const STORAGE_KEY = 'app-locale'
const COOKIE_KEY = 'locale'
const DEFAULT_LOCALE: AppLocale = 'zh'
const MESSAGE_MAP: Record<AppLocale, MessageTree> = {
  zh: zhMessages as MessageTree,
  en: enMessages as MessageTree,
}

const I18nContext = createContext<I18nContextValue | null>(null)

function isLocale(value: string | null | undefined): value is AppLocale {
  return value === 'zh' || value === 'en'
}

function readCookieLocale(): AppLocale | null {
  if (typeof document === 'undefined') {
    return null
  }

  const match = document.cookie.match(/(?:^|;\s*)locale=(zh|en)(?:;|$)/)
  return isLocale(match?.[1]) ? match[1] : null
}

function detectInitialLocale(): AppLocale {
  if (typeof window === 'undefined') {
    return DEFAULT_LOCALE
  }

  const fromStorage = window.localStorage.getItem(STORAGE_KEY)
  if (isLocale(fromStorage)) {
    return fromStorage
  }

  const fromCookie = readCookieLocale()
  if (fromCookie) {
    return fromCookie
  }

  return navigator.language.toLowerCase().startsWith('en') ? 'en' : 'zh'
}

function getNestedValue(messages: MessageTree, path: string): unknown {
  return path.split('.').reduce<unknown>((current, segment) => {
    if (!current || typeof current !== 'object' || !(segment in current)) {
      return undefined
    }

    return (current as MessageTree)[segment]
  }, messages)
}

function interpolate(message: string, values?: TranslationValues): string {
  if (!values) {
    return message
  }

  return message.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = values[key]
    return value == null ? '' : String(value)
  })
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<AppLocale>(detectInitialLocale)

  useEffect(() => {
    if (typeof document === 'undefined') {
      return
    }

    document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en'
    document.cookie = `${COOKIE_KEY}=${locale}; path=/; max-age=31536000; samesite=lax`
    window.localStorage.setItem(STORAGE_KEY, locale)
  }, [locale])

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      messages: MESSAGE_MAP[locale],
      setLocale: setLocaleState,
    }),
    [locale]
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

function useI18nContext(): I18nContextValue {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error('I18nProvider is missing')
  }

  return context
}

export function useAppLocale(): AppLocale {
  return useI18nContext().locale
}

export function useSetAppLocale(): (locale: AppLocale) => void {
  return useI18nContext().setLocale
}

export function useTranslations(namespace?: string): TranslateFn {
  const { messages } = useI18nContext()

  return useMemo<TranslateFn>(() => {
    return (key, values) => {
      const path = namespace ? `${namespace}.${key}` : key
      const value = getNestedValue(messages, path)

      if (typeof value === 'string') {
        return interpolate(value, values)
      }

      if (typeof value === 'number' || typeof value === 'boolean') {
        return String(value)
      }

      return path
    }
  }, [messages, namespace])
}

export async function getTranslations(namespace?: string): Promise<TranslateFn> {
  const messages = MESSAGE_MAP[DEFAULT_LOCALE]

  return (key, values) => {
    const path = namespace ? `${namespace}.${key}` : key
    const value = getNestedValue(messages, path)
    return typeof value === 'string' ? interpolate(value, values) : path
  }
}

export function getMessagesForLocale(locale: AppLocale): MessageTree {
  return MESSAGE_MAP[locale]
}
