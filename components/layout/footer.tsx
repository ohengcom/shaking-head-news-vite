import { Github, Heart } from 'lucide-react'
import { useTranslations } from 'next-intl'

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
              <Github className="h-4 w-4" />
              <span>GitHub</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
