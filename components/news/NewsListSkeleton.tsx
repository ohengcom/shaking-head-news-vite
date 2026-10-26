import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

const ROW_WIDTHS = ['w-full', 'w-5/6', 'w-4/5', 'w-full', 'w-2/3', 'w-5/6', 'w-3/4', 'w-full']

interface NewsListSkeletonProps {
  count?: number
}

export function NewsListSkeleton({ count = 8 }: NewsListSkeletonProps) {
  return (
    <div className="divide-border divide-y" data-testid="news-list-skeleton" aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="flex items-start gap-2 py-3">
          <Skeleton className={cn('h-5', ROW_WIDTHS[index % ROW_WIDTHS.length])} />
        </div>
      ))}
    </div>
  )
}
