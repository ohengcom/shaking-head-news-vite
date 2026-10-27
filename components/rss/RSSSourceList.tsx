import { useEffect, useState } from 'react'
import { AlertCircle, ArrowDown, ArrowUp, GripVertical, Trash2 } from 'lucide-react'
import { useTranslations } from '@/lib/i18n'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import {
  deleteRSSSourceViaApi,
  reorderRSSSourcesViaApi,
  updateRSSSourceViaApi,
} from '@/lib/api/rss-client'
import { RSSSource } from '@/types/rss'

interface RSSSourceListProps {
  initialSources: RSSSource[]
}

export function RSSSourceList({ initialSources }: RSSSourceListProps) {
  const [sources, setSources] = useState<RSSSource[]>(initialSources)
  const [draggedItem, setDraggedItem] = useState<string | null>(null)
  const { toast } = useToast()
  const t = useTranslations('rss')
  const tSettings = useTranslations('settings')

  useEffect(() => {
    setSources(initialSources)
  }, [initialSources])

  const handleToggleEnabled = async (id: string, enabled: boolean) => {
    try {
      const updated = await updateRSSSourceViaApi(id, { enabled })
      setSources(sources.map((source) => (source.id === id ? updated : source)))
      toast({
        title: t('success'),
        description: enabled ? t('sourceEnabled') : t('sourceDisabled'),
      })
    } catch {
      toast({
        title: t('error'),
        description: t('updateFailed'),
        variant: 'destructive',
      })
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm(t('confirmDelete'))) {
      return
    }

    try {
      await deleteRSSSourceViaApi(id)
      setSources(sources.filter((source) => source.id !== id))
      toast({
        title: t('success'),
        description: t('sourceDeleted'),
      })
    } catch {
      toast({
        title: t('error'),
        description: t('deleteFailed'),
        variant: 'destructive',
      })
    }
  }

  const handleDragStart = (id: string) => {
    setDraggedItem(id)
  }

  const handleDragOver = (event: React.DragEvent, targetId: string) => {
    event.preventDefault()

    if (!draggedItem || draggedItem === targetId) {
      return
    }

    const draggedIndex = sources.findIndex((source) => source.id === draggedItem)
    const targetIndex = sources.findIndex((source) => source.id === targetId)

    if (draggedIndex === -1 || targetIndex === -1) {
      return
    }

    const newSources = [...sources]
    const [removed] = newSources.splice(draggedIndex, 1)
    newSources.splice(targetIndex, 0, removed)

    setSources(newSources)
  }

  const handleDragEnd = async () => {
    if (!draggedItem) {
      return
    }

    try {
      await reorderRSSSourcesViaApi(sources.map((source) => source.id))
      toast({
        title: t('success'),
        description: t('orderUpdated'),
      })
    } catch {
      toast({
        title: t('error'),
        description: t('reorderFailed'),
        variant: 'destructive',
      })
      setSources(initialSources)
    } finally {
      setDraggedItem(null)
    }
  }

  /**
   * Keyboard-accessible reorder. Dragging alone excluded every keyboard and
   * screen-reader user from changing the order.
   */
  const moveSource = async (index: number, delta: number) => {
    const targetIndex = index + delta
    if (targetIndex < 0 || targetIndex >= sources.length) {
      return
    }

    const previous = sources
    const next = [...sources]
    const [moved] = next.splice(index, 1)
    next.splice(targetIndex, 0, moved)
    setSources(next)

    try {
      await reorderRSSSourcesViaApi(next.map((source) => source.id))
      toast({
        title: t('success'),
        description: t('orderUpdated'),
      })
    } catch {
      setSources(previous)
      toast({
        title: t('error'),
        description: t('reorderFailed'),
        variant: 'destructive',
      })
    }
  }

  if (sources.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-center">{t('noSources')}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground sr-only">{t('reorderHint')}</p>
      {sources.map((source, index) => (
        <Card
          key={source.id}
          draggable
          onDragStart={() => handleDragStart(source.id)}
          onDragOver={(event) => handleDragOver(event, source.id)}
          onDragEnd={handleDragEnd}
          className={`cursor-move transition-opacity ${
            draggedItem === source.id ? 'opacity-50' : ''
          }`}
        >
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex flex-1 items-start gap-3">
                <GripVertical aria-hidden="true" className="text-muted-foreground mt-1 h-5 w-5" />
                <div className="flex-1">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    {source.name}
                    {source.failureCount > 0 ? (
                      <Badge variant="destructive" className="text-xs">
                        <AlertCircle className="mr-1 h-3 w-3" />
                        {source.failureCount} {t('failures')}
                      </Badge>
                    ) : null}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {source.description || source.url}
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`${t('moveUp')}: ${source.name}`}
                  disabled={index === 0}
                  onClick={() => void moveSource(index, -1)}
                >
                  <ArrowUp className="h-4 w-4" aria-hidden="true" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`${t('moveDown')}: ${source.name}`}
                  disabled={index === sources.length - 1}
                  onClick={() => void moveSource(index, 1)}
                >
                  <ArrowDown className="h-4 w-4" aria-hidden="true" />
                </Button>
                <Switch
                  checked={source.enabled}
                  aria-label={`${t('toggleSource')}: ${source.name}`}
                  onCheckedChange={(checked) => handleToggleEnabled(source.id, checked)}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`${t('removeSource')}: ${source.name}`}
                  onClick={() => handleDelete(source.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">
                {source.language === 'zh' ? tSettings('chinese') : tSettings('english')}
              </Badge>
              {source.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
            {source.lastFetchedAt ? (
              <p className="text-muted-foreground mt-2 text-xs">
                {t('lastFetched')}: {new Date(source.lastFetchedAt).toLocaleString()}
              </p>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
