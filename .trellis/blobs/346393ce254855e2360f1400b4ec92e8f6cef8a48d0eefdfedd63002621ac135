/**
 * Embed Node for Canvas
 * Embeds websites via iframe
 */

import * as React from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { NodeResizer } from '@reactflow/node-resizer'
import { X, Maximize, Minimize, Globe, Link, ExternalLink, RefreshCw } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

// Styled handle
function StyledHandle({ type, position, id }: { type: 'source' | 'target'; position: Position; id?: string }) {
  return (
    <Handle
      type={type}
      position={position}
      id={id}
      className="w-3! h-3! bg-muted-foreground/60! border-2! border-background! hover:bg-primary! hover:scale-125! transition-all duration-150 rounded-full"
    />
  )
}

export interface EmbedNodeData {
  label?: string
  url?: string
  isMaximized?: boolean
}

export function EmbedNode({ id, data, selected }: NodeProps<EmbedNodeData>) {
  const [url, setUrl] = React.useState(data?.url || '')
  const [isEditing, setIsEditing] = React.useState(!data?.url)
  const [inputValue, setInputValue] = React.useState(data?.url || '')
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const iframeRef = React.useRef<HTMLIFrameElement>(null)
  const isMaximized = data?.isMaximized || false

  // Ensure URL has protocol
  const normalizeUrl = (input: string) => {
    if (!input) return ''
    if (input.startsWith('http://') || input.startsWith('https://')) {
      return input
    }
    return `https://${input}`
  }

  const handleSubmit = () => {
    if (inputValue.trim()) {
      const normalized = normalizeUrl(inputValue.trim())
      setUrl(normalized)
      setIsEditing(false)
      setError(null)
      setIsLoading(true)
      window.dispatchEvent(
        new CustomEvent('canvas-node-update', {
          detail: { id, data: { ...data, url: normalized } },
        }),
      )
    }
  }

  const handleRefresh = () => {
    if (iframeRef.current) {
      setIsLoading(true)
      iframeRef.current.src = url
    }
  }

  const handleOpenExternal = () => {
    if (url) {
      window.open(url, '_blank')
    }
  }

  const handleClose = React.useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      window.dispatchEvent(new CustomEvent('canvas-node-close', { detail: { id } }))
    },
    [id],
  )

  const handleMaximize = React.useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      window.dispatchEvent(new CustomEvent('canvas-node-maximize', { detail: { id } }))
    },
    [id],
  )

  // Extract domain for display
  const domain = React.useMemo(() => {
    try {
      return new URL(url).hostname
    } catch {
      return url
    }
  }, [url])

  return (
    <div
      className={`
        canvas-node group relative
        bg-card border rounded-lg shadow-md overflow-hidden
        min-w-[300px] min-h-[200px] h-full w-full
        ${selected ? 'border-primary ring-2 ring-primary/20' : 'border-border'}
        ${isMaximized ? 'canvas-node-maximized' : ''}
      `}
      data-maximized={isMaximized}>
      {/* Resizer */}
      {!isMaximized && (
        <NodeResizer
          color="var(--primary)"
          isVisible={selected}
          minWidth={300}
          minHeight={200}
          handleClassName="w-2! h-2! bg-primary! border-0! rounded-sm!"
        />
      )}

      {/* Header */}
      <div
        className={`
          flex items-center justify-between gap-2 px-2 py-1.5 border-b border-border/50 bg-muted/30
          ${isMaximized ? 'rounded-none' : 'rounded-t-lg'}
        `}>
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <Globe className="h-3 w-3 text-muted-foreground shrink-0" />
          <span className="text-xs font-medium text-foreground truncate">{data?.label || domain || 'Web Embed'}</span>
        </div>
        <div
          className={`
            flex items-center gap-0.5 transition-opacity shrink-0
            ${isMaximized ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
          `}>
          {url && (
            <>
              <button
                type="button"
                onClick={handleRefresh}
                className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                title="Refresh">
                <RefreshCw className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={handleOpenExternal}
                className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                title="Open in browser">
                <ExternalLink className="h-3 w-3" />
              </button>
            </>
          )}
          <button
            type="button"
            onClick={handleMaximize}
            className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            title={isMaximized ? 'Exit fullscreen' : 'Maximize'}>
            {isMaximized ? <Minimize className="h-3 w-3" /> : <Maximize className="h-3 w-3" />}
          </button>
          {!isMaximized && (
            <button
              type="button"
              onClick={handleClose}
              className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
              title="Remove">
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 h-[calc(100%-36px)] nodrag nowheel">
        {isEditing || !url ? (
          <div className="flex flex-col items-center justify-center gap-3 p-4 h-full">
            <Globe className="h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">Embed a website</p>
            <div className="flex gap-2 w-full max-w-sm">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="https://example.com"
                className="text-xs h-8"
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                onMouseDown={(e) => e.stopPropagation()}
              />
              <Button size="sm" className="h-8" onClick={handleSubmit}>
                <Link className="h-3 w-3" />
              </Button>
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        ) : (
          <div className="relative w-full h-full">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted/50 z-10">
                <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}
            <iframe
              ref={iframeRef}
              src={url}
              className="w-full h-full border-0"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              onLoad={() => setIsLoading(false)}
              onError={() => {
                setIsLoading(false)
                setError('Failed to load website')
              }}
              title={data?.label || 'Web embed'}
            />
          </div>
        )}
      </div>

      {/* Handles */}
      {!isMaximized && (
        <>
          <StyledHandle type="target" position={Position.Top} id="top" />
          <StyledHandle type="source" position={Position.Bottom} id="bottom" />
          <StyledHandle type="target" position={Position.Left} id="left" />
          <StyledHandle type="source" position={Position.Right} id="right" />
        </>
      )}
    </div>
  )
}
