/**
 * Image Node for Canvas
 * Displays images from URL or local file path
 */

import * as React from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { NodeResizer } from '@reactflow/node-resizer'
import { X, Maximize, Minimize, Image as ImageIcon, Link, Upload } from 'lucide-react'
import { invoke } from '@tauri-apps/api/core'
import { convertFileSrc } from '@tauri-apps/api/core'
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

export interface ImageNodeData {
  label?: string
  src?: string // URL or file path
  alt?: string
  objectFit?: 'cover' | 'contain' | 'fill'
  isMaximized?: boolean
}

export function ImageNode({ id, data, selected }: NodeProps<ImageNodeData>) {
  const [src, setSrc] = React.useState(data?.src || '')
  const [isEditing, setIsEditing] = React.useState(!data?.src)
  const [inputValue, setInputValue] = React.useState(data?.src || '')
  const [error, setError] = React.useState<string | null>(null)
  const [resolvedSrc, setResolvedSrc] = React.useState<string | null>(null)
  const isMaximized = data?.isMaximized || false
  const objectFit = data?.objectFit || 'contain'

  // Resolve image source (handle local file paths)
  React.useEffect(() => {
    if (!src) {
      setResolvedSrc(null)
      return
    }

    // If it's a URL, use directly
    if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:')) {
      setResolvedSrc(src)
      return
    }

    // If it's a local file path, convert it
    try {
      const converted = convertFileSrc(src)
      setResolvedSrc(converted)
    } catch (e) {
      setError('Failed to load image')
      setResolvedSrc(null)
    }
  }, [src])

  const handleSubmit = () => {
    if (inputValue.trim()) {
      setSrc(inputValue.trim())
      setIsEditing(false)
      setError(null)
      // Notify parent of content change
      window.dispatchEvent(
        new CustomEvent('canvas-node-update', {
          detail: { id, data: { ...data, src: inputValue.trim() } },
        }),
      )
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

  return (
    <div
      className={`
        canvas-node group relative
        bg-card border rounded-lg shadow-md overflow-hidden
        min-w-[150px] min-h-[100px] h-full w-full
        ${selected ? 'border-primary ring-2 ring-primary/20' : 'border-border'}
        ${isMaximized ? 'canvas-node-maximized' : ''}
      `}
      data-maximized={isMaximized}>
      {/* Resizer */}
      {!isMaximized && (
        <NodeResizer
          color="var(--primary)"
          isVisible={selected}
          minWidth={150}
          minHeight={100}
          handleClassName="w-2! h-2! bg-primary! border-0! rounded-sm!"
        />
      )}

      {/* Header */}
      <div
        className={`
          flex items-center justify-between gap-2 px-2 py-1.5 border-b border-border/50 bg-muted/30
          ${isMaximized ? 'rounded-none' : 'rounded-t-lg'}
        `}>
        <div className="flex items-center gap-1.5">
          <ImageIcon className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs font-medium text-foreground truncate">{data?.label || 'Image'}</span>
        </div>
        <div
          className={`
            flex items-center gap-0.5 transition-opacity
            ${isMaximized ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
          `}>
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
      <div className="flex-1 flex items-center justify-center p-2 h-[calc(100%-36px)] nodrag">
        {isEditing || !resolvedSrc ? (
          <div className="flex flex-col items-center gap-3 p-4 w-full">
            <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
            <div className="flex gap-2 w-full max-w-xs">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Image URL or path..."
                className="text-xs h-8"
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              />
              <Button size="sm" className="h-8" onClick={handleSubmit}>
                <Link className="h-3 w-3" />
              </Button>
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        ) : (
          <img
            src={resolvedSrc}
            alt={data?.alt || 'Image'}
            className="w-full h-full rounded"
            style={{ objectFit: 'contain' }}
            onError={() => setError('Failed to load image')}
            onDoubleClick={() => setIsEditing(true)}
          />
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
