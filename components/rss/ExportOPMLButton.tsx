'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { exportOPMLViaApi } from '@/lib/api/rss-client'

export function ExportOPMLButton() {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const t = useTranslations('rss')

  const handleExport = async () => {
    setLoading(true)

    try {
      const opml = await exportOPMLViaApi()
      const blob = new Blob([opml], { type: 'application/xml' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `rss-sources-${new Date().toISOString().split('T')[0]}.opml`
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)
      URL.revokeObjectURL(url)

      toast({
        title: t('success'),
        description: t('exportSuccess'),
      })
    } catch (error) {
      console.error('Failed to export OPML:', error)
      toast({
        title: t('error'),
        description: t('exportFailed'),
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button variant="outline" onClick={handleExport} disabled={loading}>
      <Download className="mr-2 h-4 w-4" />
      {loading ? t('exporting') : t('exportOPML')}
    </Button>
  )
}
