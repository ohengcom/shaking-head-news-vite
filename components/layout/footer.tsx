import { Heart } from 'lucide-react'
import { useTranslations } from '@/lib/i18n'

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.48 2 2 6.58 2 12.26c0 4.52 2.87 8.35 6.84 9.71.5.1.68-.22.68-.49v-1.9c-2.78.62-3.37-1.22-3.37-1.22-.45-1.19-1.11-1.5-1.11-1.5-.91-.64.07-.63.07-.63 1 .07 1.53 1.06 1.53 1.06.9 1.57 2.35 1.12 2.92.86.09-.67.35-1.12.63-1.38-2.22-.26-4.56-1.14-4.56-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.05A9.3 9.3 0 0 1 12 6.95c.85 0 1.7.12 2.5.35 1.9-1.33 2.74-1.05 2.74-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.8-4.57 5.06.36.32.68.95.68 1.91v2.8c0 .27.18.59.69.49A10.08 10.08 0 0 0 22 12.26C22 6.58 17.52 2 12 2Z" />
    </svg>
  )
}

export function Footer() {
  const t = useTranslations('footer')
  const tCommon = useTranslations('common')

  return (
    <footer className="bg-background/80 border-border border-t backdrop-blur-sm transition-colors duration-200">
      <div className="container mx-auto py-6">
        <div className="text-muted-foreground flex flex-col items-center justify-between gap-4 text-xs sm:flex-row">
          <div className="flex flex-wrap items-center justify-center gap-1">
            <span>{t('madeWith')}</span>
            <Heart className="h-3 w-3 text-red-500" />
            <a
              href="https://oheng.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary font-medium transition-colors duration-200"
            >
              oheng
            </a>
            <span className="mx-2">·</span>
            <span>
              {t('copyright', {
                year: new Date().getFullYear(),
                appName: tCommon('appName'),
              })}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <a
              href="https://beian.miit.gov.cn/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary transition-colors duration-200"
            >
              {t('icp')}
            </a>
            <a
              href="https://github.com/ohengcom/shaking-head-news-vite"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary flex items-center gap-2 transition-colors duration-200"
              aria-label="GitHub"
            >
              <GitHubIcon className="h-4 w-4" />
              <span>GitHub</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
