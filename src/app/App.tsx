import { Suspense, lazy } from 'react'
import { Route, Routes } from 'react-router-dom'
import { Footer } from '@/components/layout/footer'
import { Header } from '@/components/layout/header'
import { TiltWrapper } from '@/components/rotation/TiltWrapper'
import { RequireAuth } from '@/src/routes/RequireAuth'
import { useTranslations } from 'next-intl'

const HomePage = lazy(() =>
  import('@/src/routes/HomePage').then((module) => ({ default: module.HomePage }))
)
const LoginPage = lazy(() =>
  import('@/src/routes/LoginPage').then((module) => ({ default: module.LoginPage }))
)
const FeaturesPage = lazy(() =>
  import('@/src/routes/FeaturesPage').then((module) => ({ default: module.FeaturesPage }))
)
const AboutPage = lazy(() =>
  import('@/src/routes/AboutPage').then((module) => ({ default: module.AboutPage }))
)
const SettingsPage = lazy(() =>
  import('@/src/routes/SettingsPage').then((module) => ({ default: module.SettingsPage }))
)
const StatsPage = lazy(() =>
  import('@/src/routes/StatsPage').then((module) => ({ default: module.StatsPage }))
)
const RssPage = lazy(() =>
  import('@/src/routes/RssPage').then((module) => ({ default: module.RssPage }))
)
const NotFoundPage = lazy(() =>
  import('@/src/routes/NotFoundPage').then((module) => ({ default: module.NotFoundPage }))
)

export function App() {
  const tCommon = useTranslations('common')

  return (
    <TiltWrapper>
      <div className="relative flex min-h-screen flex-col bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.12),_transparent_34%),linear-gradient(180deg,_rgba(59,130,246,0.05),_transparent_32%),hsl(var(--background))]">
        <Header />
        <main className="flex-1 px-4 pt-6 pb-10 md:px-6">
          <Suspense
            fallback={
              <div className="flex min-h-[50vh] items-center justify-center">
                <div className="text-muted-foreground rounded-full border border-dashed px-4 py-2 text-sm">
                  {tCommon('loading')}
                </div>
              </div>
            }
          >
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/features" element={<FeaturesPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route
                path="/settings"
                element={
                  <RequireAuth>
                    <SettingsPage />
                  </RequireAuth>
                }
              />
              <Route
                path="/stats"
                element={
                  <RequireAuth>
                    <StatsPage />
                  </RequireAuth>
                }
              />
              <Route
                path="/rss"
                element={
                  <RequireAuth>
                    <RssPage />
                  </RequireAuth>
                }
              />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </main>
        <Footer />
      </div>
    </TiltWrapper>
  )
}
