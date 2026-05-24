import * as React from 'react'
import { type ReactNode } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle, File, FileWarning, FileText, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatFileSize } from '../utils'
import { cn } from '@/lib/utils'
import { Logo } from '@/components/logo'

interface PreviewPlaceholderProps {
  icon?: LucideIcon
  title: string
  description?: string
  children?: ReactNode
  className?: string
}

export function PreviewPlaceholder({
  icon: Icon = File,
  title,
  description,
  children,
  className,
}: PreviewPlaceholderProps) {
  return (
    <div className={cn('h-full flex items-center justify-center rounded-xl bg-card/0', className)}>
      <div className="text-center text-muted-foreground p-8 space-y-4 max-w-sm">
        <Logo className="h-12 w-12 mx-auto opacity-25" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground opacity-40">{title}</p>
          {description && <p className="text-xs text-muted-foreground opacity-50">{description}</p>}
        </div>
        {children}
      </div>
    </div>
  )
}

export function LoadingState() {
  return (
    <div className="p-4 space-y-3">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  )
}

export function ErrorState({ error }: { error: string }) {
  return (
    <div className="h-full flex items-center justify-center p-8">
      <div className="text-center text-muted-foreground max-w-sm">
        <AlertCircle className="h-12 w-12 mx-auto mb-3 text-destructive" />
        <p className="text-sm font-medium mb-1">Failed to load preview</p>
        <p className="text-xs">{error}</p>
      </div>
    </div>
  )
}

export function EmptyState() {
  return <PreviewPlaceholder title="Select a file to preview" />
}

export function FolderState() {
  return <PreviewPlaceholder title="Folder preview not available" description="Open the folder to view its contents." />
}

export function UnsupportedState({ extension }: { extension?: string }) {
  return (
    <PreviewPlaceholder
      icon={FileText}
      title={`Preview not available for ${extension ? `.${extension}` : 'this'} files`}
      description="Open externally to view this file."
    />
  )
}

interface LargeFileWarningProps {
  size: number
  onLoadAnyway: () => void
}

export function LargeFileWarning({ size, onLoadAnyway }: LargeFileWarningProps) {
  return (
    <div className="h-full flex items-center justify-center p-8">
      <div className="text-center max-w-md space-y-4">
        <FileWarning className="h-16 w-16 mx-auto text-amber-500" />
        <div>
          <h3 className="font-semibold text-lg mb-2">Large File Detected</h3>
          <p className="text-sm text-muted-foreground mb-1">
            This file is <span className="font-medium text-foreground">{formatFileSize(size)}</span>
          </p>
          <p className="text-sm text-muted-foreground">Loading large files may cause the UI to freeze temporarily.</p>
        </div>
        <div className="flex flex-col gap-2">
          <Button onClick={onLoadAnyway} variant="default" className="gap-2">
            <FileText className="h-4 w-4" />
            Load Preview Anyway
          </Button>
          <p className="text-xs text-muted-foreground">Files over 1 MB will be truncated to 4 MB for preview</p>
        </div>
      </div>
    </div>
  )
}
