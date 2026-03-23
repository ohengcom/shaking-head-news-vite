import Link from 'next/link'
import { useDocumentTitle } from '@/src/hooks/use-document-title'

export function NotFoundPage() {
  useDocumentTitle('404')

  return (
    <div className="container mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center gap-6 text-center">
      <div className="space-y-2">
        <p className="text-primary text-sm font-semibold tracking-[0.32em] uppercase">404</p>
        <h1 className="text-4xl font-bold tracking-tight">404 Not Found</h1>
        <p className="text-muted-foreground">
          The route does not exist in the new Cloudflare Vite application.
        </p>
      </div>
      <Link
        href="/"
        className="border-border bg-card hover:border-primary hover:text-primary rounded-full border px-5 py-2 text-sm font-medium transition"
      >
        Go Home
      </Link>
    </div>
  )
}
