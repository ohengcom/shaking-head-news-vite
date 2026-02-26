import { getRequestConfig } from 'next-intl/server'
import { cookies } from 'next/headers'
import zhMessages from '../messages/zh.json'
import enMessages from '../messages/en.json'

const MESSAGES = {
  zh: zhMessages,
  en: enMessages,
} as const

export default getRequestConfig(async () => {
  const cookieStore = await cookies()
  const locale = cookieStore.get('locale')?.value === 'en' ? 'en' : 'zh'

  return {
    locale,
    messages: MESSAGES[locale],
  }
})
