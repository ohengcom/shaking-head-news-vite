'use client'

import { useSetAppLocale, useTranslations } from 'next-intl'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { updateSettingsViaApi } from '@/lib/api/settings-client'
import { useToast } from '@/hooks/use-toast'
import { useEffect, useState } from 'react'
import { Globe } from 'lucide-react'

interface LanguageSelectorProps {
  currentLanguage: 'zh' | 'en'
}

export function LanguageSelector({ currentLanguage }: LanguageSelectorProps) {
  const t = useTranslations('settings')
  const setAppLocale = useSetAppLocale()
  const { toast } = useToast()
  const [language, setLanguage] = useState<'zh' | 'en'>(currentLanguage)
  const [isPending, setIsPending] = useState(false)

  useEffect(() => {
    setLanguage(currentLanguage)
  }, [currentLanguage])

  const handleLanguageChange = async (newLanguage: 'zh' | 'en') => {
    if (isPending) {
      return
    }

    setLanguage(newLanguage)
    setIsPending(true)

    try {
      const result = await updateSettingsViaApi({ language: newLanguage })
      if (!result?.success) {
        throw new Error(result?.error || 'Failed to update language')
      }

      setAppLocale(newLanguage)

      toast({
        title: t('saveSuccess'),
        description: t('saveSuccessDescription'),
      })
    } catch (error) {
      console.error('Failed to update language:', error)
      toast({
        title: t('saveError'),
        description: t('saveErrorDescription'),
        variant: 'destructive',
      })
      // Revert on error
      setLanguage(currentLanguage)
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="language" className="flex items-center gap-2">
        <Globe className="h-4 w-4" />
        {t('language')}
      </Label>
      <Select
        value={language}
        onValueChange={(value) => handleLanguageChange(value as 'zh' | 'en')}
        disabled={isPending}
      >
        <SelectTrigger id="language">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="zh">{t('chinese')}</SelectItem>
          <SelectItem value="en">{t('english')}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
