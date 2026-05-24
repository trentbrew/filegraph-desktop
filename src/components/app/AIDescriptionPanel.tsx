import * as React from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { Sparkles, type LucideIcon } from 'lucide-react'

interface AIDescriptionPanelProps {
  description?: string | null
  loading?: boolean
  error?: string | null
  emptyMessage?: React.ReactNode
  emptyContent?: React.ReactNode
  actions?: React.ReactNode
  note?: React.ReactNode
  icon?: LucideIcon
  className?: string
  skeletonLines?: number
  hideDescriptionWhileLoading?: boolean
}

export function AIDescriptionPanel({
  description,
  loading = false,
  error,
  emptyMessage = 'No description yet.',
  emptyContent,
  actions,
  note,
  icon: Icon = Sparkles,
  className,
  skeletonLines = 3,
  hideDescriptionWhileLoading = false,
}: AIDescriptionPanelProps) {
  const hasDescription = Boolean(description && description.trim().length > 0)
  const showSkeleton = loading && (!hasDescription || hideDescriptionWhileLoading)

  const skeletonWidths = ['w-3/4', 'w-full', 'w-2/3']

  return (
    <div className={cn(className)}>
      <div className="flex items-center gap-3 pl-2">
        <Icon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
        <div className="flex-1 min-w-0 space-y-2">
          {showSkeleton &&
            Array.from({ length: skeletonLines }).map((_, index) => (
              <Skeleton
                // eslint-disable-next-line react/no-array-index-key
                key={index}
                className={cn('h-3', skeletonWidths[index % skeletonWidths.length])}
              />
            ))}

          {!showSkeleton && hasDescription && (
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap wrap-break-word">
              {description}
            </p>
          )}

          {!showSkeleton && !hasDescription && !loading && (
            <>{emptyContent ?? <p className="text-xs text-muted-foreground">{emptyMessage}</p>}</>
          )}

          {!showSkeleton && error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      {note ? <div className="mt-2 text-[10px] text-muted-foreground">{note}</div> : null}
    </div>
  )
}
