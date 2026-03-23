'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, Reorder, motion } from 'framer-motion'
import { Check, GripVertical, Loader2, Lock, Plus, RotateCcw, X } from 'lucide-react'
import { useSetAppLocale, useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { UpgradePrompt } from '@/components/tier/UpgradePrompt'
import { useToast } from '@/hooks/use-toast'
import { HOT_LIST_SOURCES } from '@/lib/api/hot-list'
import { resetSettingsViaApi, updateSettingsViaApi } from '@/lib/api/settings-client'
import { DEFAULT_SETTINGS } from '@/lib/config/defaults'
import { useRotationStore } from '@/lib/stores/rotation-store'
import { useUIStore } from '@/lib/stores/ui-store'
import { UserSettings } from '@/types/settings'
import { useUserTier } from '@/hooks/use-user-tier'
import { useTheme } from 'next-themes'
import { LanguageSelector } from './LanguageSelector'

interface SettingsPanelProps {
  initialSettings: UserSettings
}

function LockedSettingItem({
  label,
  description,
  value,
  requiredTier = 'member',
}: {
  label: string
  description?: string
  value: string
  requiredTier?: 'member' | 'pro'
}) {
  const tTier = useTranslations('tier')

  return (
    <div className="space-y-2 opacity-60">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          {label}
          <Lock className="text-muted-foreground h-3 w-3" />
        </Label>
        <span className="text-muted-foreground text-sm">{value}</span>
      </div>
      {description ? <p className="text-muted-foreground text-sm">{description}</p> : null}
      <p className="text-muted-foreground text-xs">
        {requiredTier === 'member' ? tTier('loginToUnlock') : tTier('upgradeToUnlock')}
      </p>
    </div>
  )
}

export function SettingsPanel({ initialSettings }: SettingsPanelProps) {
  const [settings, setSettings] = useState<UserSettings>(initialSettings)
  const [isPending, setIsPending] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const { toast } = useToast()
  const t = useTranslations('settings')
  const tCommon = useTranslations('common')
  const tTier = useTranslations('tier')
  const { setFontSize, setLayoutMode } = useUIStore()
  const {
    setMode: setRotationMode,
    setInterval: setRotationInterval,
    togglePause,
    isPaused,
  } = useRotationStore()
  const { setTheme } = useTheme()
  const setAppLocale = useSetAppLocale()
  const { isGuest, isPro, features, togglePro, isTogglingPro } = useUserTier({
    initialIsPro: initialSettings.isPro ?? false,
  })

  useEffect(() => {
    setFontSize(settings.fontSize)
    setLayoutMode(settings.layoutMode)
    setTheme(settings.theme)
    setRotationMode(settings.rotationMode)
    setRotationInterval(settings.rotationInterval)
    setAppLocale(settings.language)
  }, [
    setAppLocale,
    setFontSize,
    setLayoutMode,
    setRotationInterval,
    setRotationMode,
    setTheme,
    settings.fontSize,
    settings.language,
    settings.layoutMode,
    settings.rotationInterval,
    settings.rotationMode,
    settings.theme,
  ])

  useEffect(() => {
    setSettings((prev) => (prev.isPro === isPro ? prev : { ...prev, isPro }))
  }, [isPro])

  const updateSetting = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }))

    if (key === 'fontSize') {
      setFontSize(value as UserSettings['fontSize'])
    } else if (key === 'layoutMode') {
      setLayoutMode(value as UserSettings['layoutMode'])
    } else if (key === 'theme') {
      setTheme(value as 'light' | 'dark' | 'system')
    } else if (key === 'rotationMode') {
      setRotationMode(value as 'fixed' | 'continuous')
    } else if (key === 'rotationInterval') {
      setRotationInterval(value as number)
    } else if (key === 'language') {
      setAppLocale(value as 'zh' | 'en')
    }
  }

  const handleSave = async () => {
    if (isPending || isResetting) {
      return
    }

    setIsPending(true)

    try {
      const payload: UserSettings = {
        ...settings,
        isPro,
      }
      const result = await updateSettingsViaApi(payload)

      if (result?.success) {
        toast({
          title: t('saveSuccess'),
          description: t('saveSuccessDescription'),
        })
        return
      }

      toast({
        title: t('saveError'),
        description: result?.error || t('saveErrorDescription'),
        variant: 'destructive',
      })
    } catch {
      toast({
        title: t('saveError'),
        description: t('saveErrorDescription'),
        variant: 'destructive',
      })
    } finally {
      setIsPending(false)
    }
  }

  const handleReset = async () => {
    if (isPending || isResetting) {
      return
    }

    setIsResetting(true)

    try {
      const result = await resetSettingsViaApi()

      if (result?.success && result.settings) {
        setSettings(result.settings)
        toast({
          title: t('saveSuccess'),
          description: t('saveSuccessDescription'),
        })
        return
      }

      toast({
        title: t('saveError'),
        description: result?.error || t('saveErrorDescription'),
        variant: 'destructive',
      })
    } catch {
      toast({
        title: t('saveError'),
        description: t('saveErrorDescription'),
        variant: 'destructive',
      })
    } finally {
      setIsResetting(false)
    }
  }

  const handleTogglePro = async () => {
    if (isPending || isResetting || isTogglingPro) {
      return
    }

    try {
      const result = await togglePro()

      if (!result || !result.success || typeof result.isPro !== 'boolean') {
        toast({
          title: t('saveError'),
          description: result?.error || t('saveErrorDescription'),
          variant: 'destructive',
        })
        return
      }

      setSettings((prev) => ({
        ...prev,
        isPro: result.isPro,
        ...(result.isPro ? {} : { adsEnabled: true }),
      }))
    } catch {
      toast({
        title: t('saveError'),
        description: t('saveErrorDescription'),
        variant: 'destructive',
      })
    }
  }

  const handleAdsEnabledChange = async (checked: boolean) => {
    const previousValue = settings.adsEnabled
    updateSetting('adsEnabled', checked)

    try {
      const result = await updateSettingsViaApi({
        adsEnabled: checked,
        isPro,
      })

      if (!result.success) {
        throw new Error(result.error || t('adsUpdateError'))
      }

      if (typeof window !== 'undefined') {
        window.localStorage.setItem('adsEnabled', String(checked))
        window.dispatchEvent(new CustomEvent('ads-preference-changed', { detail: checked }))
      }

      toast({
        title: t('saveSuccess'),
        description: checked ? t('adsEnabledState') : t('adsDisabledState'),
      })
    } catch (error) {
      updateSetting('adsEnabled', previousValue)
      toast({
        title: t('saveError'),
        description: error instanceof Error ? error.message : t('saveErrorDescription'),
        variant: 'destructive',
      })
    }
  }

  const availableSourceCount = HOT_LIST_SOURCES.filter(
    (source) => !settings.newsSources?.includes(source.id)
  ).length
  const enabledSourceCount = settings.newsSources?.length || 0

  return (
    <div
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault()
      }}
    >
      <Card>
        <CardHeader>
          <CardTitle>{t('theme')}</CardTitle>
          <CardDescription>{t('themeDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <LanguageSelector currentLanguage={settings.language} />

          <div className="space-y-2">
            <Label htmlFor="theme">{t('theme')}</Label>
            <Select
              value={settings.theme}
              onValueChange={(value) =>
                updateSetting('theme', value as 'light' | 'dark' | 'system')
              }
            >
              <SelectTrigger id="theme">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">{t('light')}</SelectItem>
                <SelectItem value="dark">{t('dark')}</SelectItem>
                <SelectItem value="system">{t('system')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {features.fontSizeAdjustable ? (
            <div className="space-y-2">
              <Label htmlFor="fontSize">{t('fontSize')}</Label>
              <Select
                value={settings.fontSize}
                onValueChange={(value) =>
                  updateSetting('fontSize', value as UserSettings['fontSize'])
                }
              >
                <SelectTrigger id="fontSize">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">{t('small')}</SelectItem>
                  <SelectItem value="medium">{t('medium')}</SelectItem>
                  <SelectItem value="large">{t('large')}</SelectItem>
                  <SelectItem value="xlarge">{t('xlarge')}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-sm">{t('fontSizeDescription')}</p>
            </div>
          ) : (
            <LockedSettingItem
              label={t('fontSize')}
              description={t('fontSizeDescription')}
              value={t('medium')}
              requiredTier="member"
            />
          )}

          {features.layoutModeSelectable ? (
            <div className="space-y-2">
              <Label htmlFor="layoutMode">{t('layout')}</Label>
              <Select
                value={settings.layoutMode}
                onValueChange={(value) =>
                  updateSetting('layoutMode', value as 'normal' | 'compact')
                }
              >
                <SelectTrigger id="layoutMode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">{t('normal')}</SelectItem>
                  <SelectItem value="compact">{t('compact')}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-sm">{t('layoutDescription')}</p>
            </div>
          ) : (
            <LockedSettingItem
              label={t('layout')}
              description={t('layoutDescription')}
              value={t('normal')}
              requiredTier="member"
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('rotation')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {features.rotationModeSelectable ? (
            <div className="space-y-2">
              <Label htmlFor="rotationMode">{t('rotationMode')}</Label>
              <Select
                value={settings.rotationMode}
                onValueChange={(value) =>
                  updateSetting('rotationMode', value as 'fixed' | 'continuous')
                }
              >
                <SelectTrigger id="rotationMode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">{t('fixed')}</SelectItem>
                  <SelectItem value="continuous">{t('continuous')}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-sm">{t('rotationModeDescription')}</p>
            </div>
          ) : (
            <LockedSettingItem
              label={t('rotationMode')}
              description={t('rotationModeDescription')}
              value={t('continuous')}
              requiredTier="member"
            />
          )}

          {features.rotationIntervalAdjustable ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="rotationInterval">{t('interval')}</Label>
                <span className="text-muted-foreground text-sm">{settings.rotationInterval}s</span>
              </div>
              <Slider
                id="rotationInterval"
                value={[settings.rotationInterval]}
                onValueChange={([value]) => updateSetting('rotationInterval', value)}
                min={5}
                max={60}
                step={5}
                className="w-full"
              />
              <p className="text-muted-foreground text-sm">{t('intervalDescription')}</p>
            </div>
          ) : (
            <LockedSettingItem
              label={t('interval')}
              description={t('intervalDescription')}
              value={`${DEFAULT_SETTINGS.rotationInterval}s`}
              requiredTier="member"
            />
          )}

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="animationEnabled">{t('animation')}</Label>
              <p className="text-muted-foreground text-sm">{t('animationDescription')}</p>
            </div>
            <Switch
              id="animationEnabled"
              checked={!isPaused}
              onCheckedChange={(checked) => {
                updateSetting('animationEnabled', checked)
                if (checked === isPaused) {
                  togglePause()
                }
              }}
            />
          </div>
        </CardContent>
      </Card>

      {isGuest ? <UpgradePrompt variant="inline" className="my-4" /> : null}

      {!isGuest ? (
        <Card>
          <CardHeader>
            <CardTitle>{t('newsContentTitle')}</CardTitle>
            <CardDescription>{t('newsContentDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                    {t('availableSources', { count: availableSourceCount })}
                  </Label>
                </div>
                <div className="bg-muted/30 min-h-[300px] rounded-lg border p-2">
                  <div className="space-y-2">
                    {HOT_LIST_SOURCES.filter(
                      (source) => !settings.newsSources?.includes(source.id)
                    ).map((source) => (
                      <motion.div
                        layout
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        key={source.id}
                        className="bg-card hover:border-primary/50 group flex cursor-pointer items-center justify-between rounded-md border p-2 text-sm transition-colors"
                        onClick={() => {
                          const currentSources = settings.newsSources || []
                          updateSetting('newsSources', [...currentSources, source.id])
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{source.icon}</span>
                          <span>{source.name}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </motion.div>
                    ))}
                    {availableSourceCount === 0 ? (
                      <div className="text-muted-foreground flex h-full flex-col items-center justify-center py-8 text-xs">
                        <Check className="mb-2 h-8 w-8 opacity-20" />
                        {t('allSourcesAdded')}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <Label className="text-primary text-xs font-medium tracking-wider uppercase">
                    {t('enabledSources', { count: enabledSourceCount })}
                  </Label>
                  <span className="text-muted-foreground text-xs">{t('dragToReorder')}</span>
                </div>
                <div className="bg-card min-h-[300px] rounded-lg border p-2">
                  <Reorder.Group
                    axis="y"
                    values={settings.newsSources || []}
                    onReorder={(newOrder) => updateSetting('newsSources', newOrder)}
                    className="space-y-2"
                  >
                    <AnimatePresence initial={false}>
                      {(settings.newsSources || []).map((sourceId) => {
                        const source = HOT_LIST_SOURCES.find((item) => item.id === sourceId)
                        if (!source) {
                          return null
                        }

                        return (
                          <Reorder.Item
                            key={source.id}
                            value={source.id}
                            className="bg-background flex cursor-grab items-center justify-between rounded-md border p-2 text-sm shadow-sm active:cursor-grabbing"
                            whileDrag={{
                              scale: 1.02,
                              zIndex: 10,
                              boxShadow: '0 5px 15px rgba(0,0,0,0.1)',
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <GripVertical className="text-muted-foreground/50 h-4 w-4" />
                              <span className="text-lg">{source.icon}</span>
                              <span className="font-medium">{source.name}</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-muted-foreground hover:text-destructive h-6 w-6"
                              onClick={(event) => {
                                event.stopPropagation()
                                const currentSources = settings.newsSources || []
                                updateSetting(
                                  'newsSources',
                                  currentSources.filter((id) => id !== source.id)
                                )
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </Reorder.Item>
                        )
                      })}
                    </AnimatePresence>
                    {enabledSourceCount === 0 ? (
                      <div className="text-muted-foreground flex h-full flex-col items-center justify-center py-8 text-xs">
                        {t('addSourcesHint')}
                      </div>
                    ) : null}
                  </Reorder.Group>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {!isGuest ? (
        <Card className={isPro ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/20' : ''}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {isPro ? t('proStatusActiveTitle') : t('proStatusInactiveTitle')}
            </CardTitle>
            <CardDescription>
              {isPro ? t('proStatusActiveDescription') : t('proStatusInactiveDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              type="button"
              onClick={(event) => {
                event.preventDefault()
                event.stopPropagation()
                void handleTogglePro()
              }}
              disabled={isTogglingPro}
              variant={isPro ? 'outline' : 'default'}
              className={
                isPro
                  ? ''
                  : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600'
              }
            >
              {isTogglingPro ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isPro ? t('disableProTesting') : t('enableProTesting')}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {isPro ? (
        <Card>
          <CardHeader>
            <CardTitle>{t('customSubscriptionTitle')}</CardTitle>
            <CardDescription>{t('customSubscriptionDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>{t('rssManagementLabel')}</Label>
                <p className="text-muted-foreground text-sm">{t('rssManagementDescription')}</p>
              </div>
              <Button variant="outline" asChild>
                <a href="/rss">{t('manageSubscriptions')}</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {isPro ? (
        <Card>
          <CardHeader>
            <CardTitle>{t('adsTitle')}</CardTitle>
            <CardDescription>{t('adsDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="adsEnabled">{t('showAds')}</Label>
                <p className="text-muted-foreground text-sm">{t('showAdsDescription')}</p>
              </div>
              <Switch
                id="adsEnabled"
                checked={settings.adsEnabled}
                disabled={isPending || isResetting || isTogglingPro}
                onCheckedChange={(checked) => void handleAdsEnabledChange(checked)}
              />
            </div>
          </CardContent>
        </Card>
      ) : null}

      {isPro ? (
        <Card>
          <CardHeader>
            <CardTitle>{t('notifications')}</CardTitle>
            <CardDescription>{t('wellnessDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="dailyGoal">{t('dailyGoal')}</Label>
                <span className="text-muted-foreground text-sm">{settings.dailyGoal}</span>
              </div>
              <Slider
                id="dailyGoal"
                value={[settings.dailyGoal]}
                onValueChange={([value]) => updateSetting('dailyGoal', value)}
                min={10}
                max={100}
                step={5}
                className="w-full"
              />
              <p className="text-muted-foreground text-sm">{t('dailyGoalDescription')}</p>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notificationsEnabled">{t('notifications')}</Label>
                <p className="text-muted-foreground text-sm">{t('notificationsDescription')}</p>
              </div>
              <Switch
                id="notificationsEnabled"
                checked={settings.notificationsEnabled}
                onCheckedChange={(checked) => updateSetting('notificationsEnabled', checked)}
              />
            </div>
          </CardContent>
        </Card>
      ) : null}

      {!isGuest ? (
        <div className="flex gap-4">
          <Button
            type="button"
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              void handleSave()
            }}
            disabled={isPending || isResetting}
            className="flex-1"
          >
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {tCommon('save')}
          </Button>
          <Button
            type="button"
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              void handleReset()
            }}
            disabled={isPending || isResetting}
            variant="outline"
          >
            {isResetting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {!isResetting ? <RotateCcw className="mr-2 h-4 w-4" /> : null}
            {tCommon('reset')}
          </Button>
        </div>
      ) : (
        <div className="border-muted-foreground/30 bg-muted/30 rounded-lg border border-dashed p-4 text-center">
          <p className="text-muted-foreground text-sm">{tTier('loginToUnlockDescription')}</p>
        </div>
      )}
    </div>
  )
}
