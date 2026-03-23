import { useEffect } from 'react'
import { useTranslations } from 'next-intl'

export function useDocumentTitle(title: string) {
  const tCommon = useTranslations('common')

  useEffect(() => {
    document.title = `${title} | ${tCommon('appName')}`
  }, [tCommon, title])
}
