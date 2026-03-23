import { useTranslations } from 'next-intl'
import { useDocumentTitle } from '@/src/hooks/use-document-title'

function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="bg-card text-card-foreground rounded-lg border p-6 shadow-sm">
      <h3 className="mb-2 text-xl font-semibold">{title}</h3>
      <p className="text-muted-foreground text-sm">{description}</p>
    </div>
  )
}

export function AboutPage() {
  const tHome = useTranslations('home')
  const tAbout = useTranslations('about')

  useDocumentTitle(tAbout('metaTitle'))

  return (
    <div className="container mx-auto py-8 md:py-12">
      <div className="mx-auto max-w-4xl space-y-6 md:space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            {tHome('title')}
          </h1>
          <p className="text-muted-foreground mt-4 text-lg">{tHome('subtitle')}</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            title={tHome('features.news.title')}
            description={tHome('features.news.description')}
          />
          <FeatureCard
            title={tHome('features.rotation.title')}
            description={tHome('features.rotation.description')}
          />
          <FeatureCard
            title={tHome('features.stats.title')}
            description={tHome('features.stats.description')}
          />
          <FeatureCard
            title={tHome('features.i18n.title')}
            description={tHome('features.i18n.description')}
          />
          <FeatureCard
            title={tHome('features.sync.title')}
            description={tHome('features.sync.description')}
          />
          <FeatureCard
            title={tHome('features.theme.title')}
            description={tHome('features.theme.description')}
          />
        </div>

        <div className="bg-card text-card-foreground space-y-6 rounded-lg border p-6 shadow-sm">
          <div>
            <h2 className="mb-3 text-2xl font-semibold">{tAbout('background')}</h2>
            <p className="text-muted-foreground">{tAbout('backgroundDescription')}</p>
          </div>

          <div>
            <h2 className="mb-3 text-2xl font-semibold">{tAbout('techStack')}</h2>
            <div className="flex flex-wrap gap-2">
              <span className="bg-primary/10 rounded-full px-3 py-1 text-sm">Vite 8</span>
              <span className="bg-primary/10 rounded-full px-3 py-1 text-sm">
                Cloudflare Workers
              </span>
              <span className="bg-primary/10 rounded-full px-3 py-1 text-sm">React 19</span>
              <span className="bg-primary/10 rounded-full px-3 py-1 text-sm">TypeScript 5.9</span>
              <span className="bg-primary/10 rounded-full px-3 py-1 text-sm">Tailwind CSS 4</span>
              <span className="bg-primary/10 rounded-full px-3 py-1 text-sm">Better Auth</span>
              <span className="bg-primary/10 rounded-full px-3 py-1 text-sm">Cloudflare KV</span>
            </div>
          </div>

          <div className="border-t pt-6 text-center">
            <p className="text-muted-foreground text-sm">{tAbout('license')}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
