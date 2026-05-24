import * as React from 'react'
import { FileItem } from '@/components/app/fileStructure'
import { Button } from '@/components/ui/button'
import { Globe, ExternalLink, X, Minus, Plus, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { invoke } from '@tauri-apps/api/core'
import { toast } from 'sonner'
import { useFileStore } from '@/stores/useFileStore'
import { useUIStore } from '@/stores/useUIStore'

interface WebPreviewProps {
  url: string
  onClose?: () => void
  onUrlUpdate?: (newUrl: string) => Promise<void>
}

// Normalize localhost URLs to use http instead of https (dev servers don't have TLS)
function normalizeLocalhostUrl(inputUrl: string): string {
  if (/^https:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?/i.test(inputUrl)) {
    return inputUrl.replace(/^https:/i, 'http:')
  }
  return inputUrl
}

export function WebPreview({ url: rawUrl, onClose, onUrlUpdate }: WebPreviewProps) {
  // Auto-fix localhost URLs that incorrectly use https
  const url = normalizeLocalhostUrl(rawUrl)
  const displayUrl = url.replace(/^https?:\/\//, '')
  const [isEditing, setIsEditing] = React.useState(false)
  const [editUrl, setEditUrl] = React.useState(url)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const { webPreviewZoom, setWebPreviewZoom, resetWebPreviewZoom } = useUIStore()
  const zoomScale = webPreviewZoom / 100

  React.useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleSave = async () => {
    if (!onUrlUpdate) {
      setIsEditing(false)
      return
    }

    let finalUrl = editUrl.trim()
    if (!finalUrl) {
      setEditUrl(url)
      setIsEditing(false)
      return
    }

    // Add protocol if missing - use http for localhost/127.0.0.1, https for everything else
    if (!/^https?:\/\//i.test(finalUrl)) {
      const isLocalhost = /^(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?/i.test(finalUrl)
      finalUrl = (isLocalhost ? 'http://' : 'https://') + finalUrl
    }

    if (finalUrl !== url) {
      await onUrlUpdate(finalUrl)
    }
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave()
    } else if (e.key === 'Escape') {
      setEditUrl(url)
      setIsEditing(false)
    }
  }

  const [proxyPort, setProxyPort] = React.useState<number | null>(null)

  React.useEffect(() => {
    invoke<number>('get_proxy_port')
      .then(setProxyPort)
      .catch((e) => console.error('Failed to get proxy port:', e))
  }, [])

  const iframeSrc = React.useMemo(() => {
    if (!proxyPort || !url) return url
    if (!url.startsWith('http')) return url

    try {
      // Encode the full URL as the target
      // The backend will treat everything after /p/{target}/ as path to append
      // If we pass the full URL, the derived path will be empty initially
      // We use the 'URL_SAFE' base64 variant in backend, so we should match here or use standard if backend handles it?
      // Backend uses `general_purpose::URL_SAFE`. JS `btoa` is standard.
      // We need to make it url safe: + -> -, / -> _, = -> remove
      const b64 = btoa(url).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
      return `http://127.0.0.1:${proxyPort}/p/${b64}/`
    } catch (e) {
      console.error('Failed to encode proxy url:', e)
      return url
    }
  }, [proxyPort, url])

  return (
    <div className="h-full flex flex-col bg-transparent rounded-xl preview-content">
      <div className="shrink-0 border border-border px-4 mb-3 py-2.5 rounded-xl bg-card">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
            {isEditing ? (
              <input
                ref={inputRef}
                value={editUrl}
                onChange={(e) => setEditUrl(e.target.value)}
                onBlur={handleSave}
                onKeyDown={handleKeyDown}
                className="font-semibold text-xs bg-transparent outline-none border-b border-primary focus:border-transparent min-w-0 w-full"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <h3
                className={cn(
                  'font-semibold text-xs truncate mb-0',
                  onUrlUpdate && 'cursor-text hover:bg-muted/50 px-1 -ml-1 rounded transition-colors',
                )}
                onClick={() => {
                  if (onUrlUpdate) {
                    setEditUrl(url)
                    setIsEditing(true)
                  }
                }}
                title={onUrlUpdate ? 'Click to edit URL' : undefined}>
                {displayUrl}
              </h3>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Zoom controls */}
            <div className="flex items-center gap-0.5 mr-2 border-r border-border pr-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => setWebPreviewZoom(Math.max(25, webPreviewZoom - 25))}
                disabled={webPreviewZoom <= 25}
                title="Zoom out">
                <Minus className="h-3 w-3" />
              </Button>
              <span className="text-xs font-medium w-9 text-center">{webPreviewZoom}%</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => setWebPreviewZoom(Math.min(400, webPreviewZoom + 25))}
                disabled={webPreviewZoom >= 400}
                title="Zoom in">
                <Plus className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={resetWebPreviewZoom}
                disabled={webPreviewZoom === 100}
                title="Reset zoom">
                <RotateCcw className="h-3 w-3" />
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}>
              <ExternalLink className="h-3.5 w-3.5 mr-1" />
              Open
            </Button>
            {onClose && (
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onClose} title="Close preview">
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto rounded-xl border bg-card">
        <div
          style={{
            transform: `scale(${zoomScale})`,
            transformOrigin: 'top left',
            width: `${100 / zoomScale}%`,
            height: `${100 / zoomScale}%`,
          }}>
          <iframe
            src={iframeSrc}
            title={displayUrl}
            className="w-full h-full border-0 rounded-xl bg-white"
            sandbox="allow-same-origin allow-forms allow-scripts allow-popups"
          />
        </div>
      </div>
    </div>
  )
}

export function WebUrlInput({ activeItem }: { activeItem: FileItem }) {
  const [url, setUrl] = React.useState('')
  const [saving, setSaving] = React.useState(false)

  const handleSave = async () => {
    if (!url.trim()) return

    // Normalize URL - use http for localhost, https for everything else
    let finalUrl = url.trim()
    if (!/^https?:\/\//i.test(finalUrl)) {
      const isLocalhost = /^(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?/i.test(finalUrl)
      finalUrl = (isLocalhost ? 'http://' : 'https://') + finalUrl
    }

    setSaving(true)
    try {
      await invoke('write_text_file', {
        filePath: activeItem.path,
        content: finalUrl,
      })

      useFileStore.getState().setWebPreviewUrl(finalUrl)
      toast.success('Bookmark saved')
    } catch (error) {
      toast.error(`Failed to save bookmark: ${error}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="h-full flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center">
          <Globe className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
          <h3 className="font-semibold text-lg">Add Web Bookmark</h3>
          <p className="text-sm text-muted-foreground">Enter a URL to save this bookmark</p>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            className="flex-1 h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            autoFocus
          />
          <Button onClick={handleSave} disabled={!url.trim() || saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  )
}
