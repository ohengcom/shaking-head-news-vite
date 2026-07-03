import type { ComponentType } from 'react'
import { createBrowserRouter, Outlet, useRouteError } from 'react-router-dom'
import { Footer } from '@/components/layout/footer'
import { Header } from '@/components/layout/header'
import { TiltWrapper } from '@/components/rotation/TiltWrapper'
import { HomePage } from '@/src/routes/HomePage'
import { RequireAuth } from '@/src/routes/RequireAuth'
import { AppProviders } from '@/src/providers/AppProviders'

function ProtectedRoute({ Component }: { Component: ComponentType }) {
  return (
    <RequireAuth>
      <Component />
    </RequireAuth>
  )
}

function RouteFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="text-muted-foreground rounded-full border border-dashed px-4 py-2 text-sm">
        Loading...
      </div>
    </div>
  )
}

function AppShell() {
  return (
    <TiltWrapper>
      <div className="relative flex min-h-screen flex-col bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.12),_transparent_34%),linear-gradient(180deg,_rgba(59,130,246,0.05),_transparent_32%),hsl(var(--background))]">
        <Header />
        <main className="flex-1 px-4 pt-6 pb-10 md:px-6">
          <Outlet />
        </main>
        <Footer />
      </div>
    </TiltWrapper>
  )
}

export function App() {
  return (
    <AppProviders>
      <AppShell />
    </AppProviders>
  )
}

function AppErrorBoundary() {
  const error = useRouteError()
  const message = error instanceof Error ? error.message : 'Something went wrong.'

  return (
    <AppProviders>
      <TiltWrapper>
        <div className="bg-background text-foreground flex min-h-screen items-center justify-center px-4">
          <div className="border-border bg-card max-w-lg rounded-lg border p-6 text-center shadow-sm">
            <p className="text-muted-foreground text-sm">Application error</p>
            <h1 className="mt-2 text-2xl font-bold">Unable to render this page</h1>
            <p className="text-muted-foreground mt-3 text-sm">{message}</p>
          </div>
        </div>
      </TiltWrapper>
    </AppProviders>
  )
}

export const router = createBrowserRouter([
  {
    path: '/',
    Component: App,
    ErrorBoundary: AppErrorBoundary,
    HydrateFallback: RouteFallback,
    children: [
      {
        index: true,
        Component: HomePage,
      },
      {
        path: 'login',
        lazy: async () => {
          const { LoginPage } = await import('@/src/routes/LoginPage')
          return { Component: LoginPage }
        },
      },
      {
        path: 'features',
        lazy: async () => {
          const { FeaturesPage } = await import('@/src/routes/FeaturesPage')
          return { Component: FeaturesPage }
        },
      },
      {
        path: 'about',
        lazy: async () => {
          const { AboutPage } = await import('@/src/routes/AboutPage')
          return { Component: AboutPage }
        },
      },
      {
        path: 'settings',
        lazy: async () => {
          const { SettingsPage } = await import('@/src/routes/SettingsPage')
          return {
            Component: function SettingsRoute() {
              return <ProtectedRoute Component={SettingsPage} />
            },
          }
        },
      },
      {
        path: 'stats',
        lazy: async () => {
          const { StatsPage } = await import('@/src/routes/StatsPage')
          return {
            Component: function StatsRoute() {
              return <ProtectedRoute Component={StatsPage} />
            },
          }
        },
      },
      {
        path: 'rss',
        lazy: async () => {
          const { RssPage } = await import('@/src/routes/RssPage')
          return {
            Component: function RssRoute() {
              return <ProtectedRoute Component={RssPage} />
            },
          }
        },
      },
      {
        path: '*',
        lazy: async () => {
          const { NotFoundPage } = await import('@/src/routes/NotFoundPage')
          return { Component: NotFoundPage }
        },
      },
    ],
  },
])
