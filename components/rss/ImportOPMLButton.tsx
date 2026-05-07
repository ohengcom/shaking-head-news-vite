'use client'

import { useRef, useState, type ChangeEvent, type ElementRef } from 'react'
import { Upload } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { importOPMLViaApi } from '@/lib/api/rss-client'

export function ImportOPMLButton() {
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef<ElementRef<'input'>>(null)
  const { toast } = useToast()
  const t = useTranslations('rss')
  const router = useRouter()

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (event: ChangeEvent<ElementRef<'input'>>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    if (!file.name.endsWith('.opml') && !file.name.endsWith('.xml')) {
      toast({
        title: t('error'),
        description: t('selectOpmlFile'),
        variant: 'destructive',
      })
      return
    }

    if (file.size > 1024 * 1024) {
      toast({
        title: t('error'),
        description: t('fileTooLarge'),
        variant: 'destructive',
      })
      return
    }

    setLoading(true)

    try {
      const content = await file.text()
      const result = await importOPMLViaApi(content)

      toast({
        title: t('success'),
        description:
          result.skipped > 0
            ? t('importSuccessWithSkipped', {
                imported: result.imported,
                skipped: result.skipped,
              })
            : t('importSuccess', { imported: result.imported }),
      })

      router.refresh()
    } catch (error) {
      console.error('Failed to import OPML:', error)
      toast({
        title: t('error'),
        description: error instanceof Error ? error.message : t('importFailed'),
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".opml,.xml"
        onChange={handleFileChange}
        className="hidden"
      />
      <Button variant="outline" onClick={handleClick} disabled={loading}>
        <Upload className="mr-2 h-4 w-4" />
        {loading ? t('importing') : t('importOPML')}
      </Button>
    </>
  )
}
