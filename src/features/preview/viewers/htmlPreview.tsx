import * as React from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle } from 'lucide-react'
import { convertFileSrc } from '@tauri-apps/api/core'

interface HtmlPreviewProps {
  filePath: string
}

interface TextFileContent {
  content: string
  truncated: boolean
  encoding: string
  size: number
}

export function HtmlPreview({ filePath }: HtmlPreviewProps) {
  const [data, setData] = React.useState<TextFileContent | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const iframeRef = React.useRef<HTMLIFrameElement>(null)

  // Load HTML file content
  React.useEffect(() => {
    let cancelled = false

    const loadFile = async () => {
      setLoading(true)
      setError(null)

      try {
        const result = await invoke<TextFileContent>('read_text_file', {
          filePath,
          maxBytes: 4 * 1024 * 1024, // 4MB limit
        })

        if (!cancelled) {
          setData(result)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err))
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadFile()

    return () => {
      cancelled = true
    }
  }, [filePath])

  // Update iframe when data changes
  React.useEffect(() => {
    if (data && iframeRef.current) {
      const iframe = iframeRef.current
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document

      if (iframeDoc) {
        // Write the HTML content to the iframe
        iframeDoc.open()
        iframeDoc.write(data.content)
        iframeDoc.close()
      }
    }
  }, [data])

  if (loading) {
    return (
      <div className="p-4 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-center text-muted-foreground max-w-sm">
          <AlertCircle className="h-12 w-12 mx-auto mb-3 text-destructive" />
          <p className="text-sm font-medium mb-1">Failed to load HTML file</p>
          <p className="text-xs">{error}</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return null
  }

  return (
    <div className="h-full w-full bg-background">
      <iframe
        ref={iframeRef}
        title="HTML Preview"
        className="w-full h-full border-0"
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
      />
    </div>
  )
}
