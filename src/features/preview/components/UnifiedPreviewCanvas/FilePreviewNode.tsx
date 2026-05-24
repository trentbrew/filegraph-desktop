import * as React from 'react'
import { AlertCircle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { convertFileSrc } from '@tauri-apps/api/core'

import { ImageViewer } from '../../viewers/imageViewer'
import { MediaViewer } from '../../viewers/mediaViewer'
import { FontViewer } from '../../viewers/fontViewer'
import { TableViewer } from '../../viewers/tableViewer'
import { CodeViewer } from '../../viewers/codeViewer'
import { TextViewer } from '../../viewers/textViewer'
import { DataViewer } from '../../viewers/dataViewer'

import type { FilePreviewNodeData } from './types'

// Lazy load heavier viewers
const PdfViewer = React.lazy(() => import('../../viewers/pdfViewer').then((m) => ({ default: m.PdfViewer })))
const DocxViewer = React.lazy(() => import('../../viewers/docxViewer').then((m) => ({ default: m.DocxViewer })))
const MarkdownEditor = React.lazy(() =>
  import('../../viewers/markdownEditor').then((m) => ({ default: m.MarkdownEditor })),
)

export interface FilePreviewNodeProps {
  id?: string
  data: FilePreviewNodeData
  selected?: boolean
  hideHeader?: boolean
  hideResizer?: boolean
  hideHandles?: boolean
  onClose?: () => void
}

function CoverImagePreview({ filePath, fileName }: { filePath: string; fileName: string }) {
  const [error, setError] = React.useState<string | null>(null)

  const assetUrl = React.useMemo(() => {
    try {
      const url = convertFileSrc(filePath)
      console.log('[CoverImagePreview] convertFileSrc result:', { filePath, url })
      return url
    } catch (e) {
      console.error('[CoverImagePreview] convertFileSrc failed:', e)
      return ''
    }
  }, [filePath])

  if (!assetUrl) {
    return (
      <div className="flex items-center justify-center h-full p-6 text-center text-muted-foreground text-sm">
        Failed to load image
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <AlertCircle className="h-10 w-10 text-destructive mb-3" />
        <p className="text-sm font-medium">Failed to load image</p>
        <p className="text-xs text-muted-foreground mt-1">{error}</p>
      </div>
    )
  }

  return (
    <div className="h-full w-full overflow-hidden bg-muted/10">
      <img
        src={assetUrl}
        alt={fileName}
        className="h-full w-full object-cover"
        onError={() => setError('Failed to render image')}
      />
    </div>
  )
}

function CoverVideoPreview({ filePath }: { filePath: string }) {
  const [error, setError] = React.useState<string | null>(null)

  const assetUrl = React.useMemo(() => {
    try {
      return convertFileSrc(filePath)
    } catch {
      return ''
    }
  }, [filePath])

  if (!assetUrl) {
    return (
      <div className="flex items-center justify-center h-full p-6 text-center text-muted-foreground text-sm">
        Failed to load video
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <AlertCircle className="h-10 w-10 text-destructive mb-3" />
        <p className="text-sm font-medium">Failed to load video</p>
        <p className="text-xs text-muted-foreground mt-1">{error}</p>
      </div>
    )
  }

  return (
    <div className="h-full w-full overflow-hidden bg-black/5">
      <video
        src={assetUrl}
        controls
        className="h-full w-full object-cover"
        onError={() => setError('Failed to render video')}
        preload="metadata">
        <track kind="captions" />
        Your browser does not support the video element.
      </video>
    </div>
  )
}

export function FilePreviewNode({ data, hideHeader, onClose }: FilePreviewNodeProps) {
  const filePath = data?.filePath
  const fileName = data?.fileName
  const fileType = data?.fileType
  const extension = data?.extension ?? undefined
  const tableFileType: 'csv' | 'xlsx' = extension === 'xlsx' || extension === 'xls' ? 'xlsx' : 'csv'
  const label = data?.label || fileName || 'File'
  const textMaxBytes = data?.textMaxBytes
  const fit = data?.fit ?? 'contain'

  const viewerProps = React.useMemo(() => ({ filePath, fileName }), [filePath, fileName])

  const renderViewer = () => {
    if (!filePath) {
      return (
        <div className="flex items-center justify-center h-full p-6 text-center text-muted-foreground text-sm">
          No file loaded
        </div>
      )
    }

    try {
      switch (fileType) {
        case 'image':
          return fit === 'cover' ? <CoverImagePreview {...viewerProps} /> : <ImageViewer {...viewerProps} />
        case 'video':
          return fit === 'cover' ? (
            <CoverVideoPreview {...viewerProps} />
          ) : (
            <MediaViewer {...viewerProps} mediaType="video" />
          )
        case 'audio':
          return <MediaViewer {...viewerProps} mediaType="audio" />
        case 'pdf':
          return (
            <React.Suspense fallback={<div className="p-3 text-muted-foreground">Loading...</div>}>
              <PdfViewer {...viewerProps} />
            </React.Suspense>
          )
        case 'docx':
          return (
            <React.Suspense fallback={<div className="p-3 text-muted-foreground">Loading...</div>}>
              <DocxViewer {...viewerProps} />
            </React.Suspense>
          )
        case 'markdown':
          return (
            <React.Suspense fallback={<div className="p-3 text-muted-foreground">Loading...</div>}>
              <MarkdownEditor {...viewerProps} />
            </React.Suspense>
          )
        case 'font':
          return <FontViewer {...viewerProps} extension={extension} />
        case 'table':
          return <TableViewer {...viewerProps} fileType={tableFileType} />
        case 'data':
          return <DataViewer {...viewerProps} fileName={fileName} />
        case 'code':
          return <CodeViewer {...viewerProps} extension={extension ?? ''} />
        case 'text':
        default:
          return <TextViewer {...viewerProps} maxBytes={textMaxBytes} />
      }
    } catch (err) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-6 text-center">
          <AlertCircle className="h-10 w-10 text-destructive mb-3" />
          <p className="text-sm font-medium">Failed to render preview</p>
          <p className="text-xs text-muted-foreground mt-1">{err instanceof Error ? err.message : String(err)}</p>
        </div>
      )
    }
  }

  return (
    <div className="h-full w-full rounded-lg border bg-card overflow-hidden flex flex-col">
      {!hideHeader && (
        <div className="flex items-center justify-between gap-2 border-b bg-card/70 px-3 py-2">
          <div className="min-w-0">
            <div className="truncate text-xs font-medium text-foreground">{label}</div>
          </div>
          {onClose && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}
      <div className="min-h-0 flex-1">{renderViewer()}</div>
    </div>
  )
}
