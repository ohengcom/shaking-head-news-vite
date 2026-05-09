import { useEffect } from 'react'
import { useTranslations } from '@/lib/i18n'

export function useDocumentTitle(title: string) {
  const tCommon = useTranslations('common')

  useEffect(() => {
    document.title = `${title} | ${tCommon('appName')}`
  }, [tCommon, title])
}
