/**
 * Wrapped Canvas Nodes
 *
 * These wrap the canvasViewer nodes with the CanvasNodeWrapper
 * to provide consistent toolbar behavior on the home canvas.
 */

import * as React from 'react'
import { NodeProps } from 'reactflow'
import { convertFileSrc, invoke } from '@tauri-apps/api/core'
import {
  Table,
  Image as ImageIcon,
  Music,
  Globe,
  Square,
  Circle,
  Diamond,
  Triangle,
  Hexagon,
  Plus,
  Loader2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  RotateCw,
  Maximize2,
  ArrowLeftRight,
  ChevronDown,
} from 'lucide-react'
import { CanvasNodeWrapper, MaximizedHeader } from './CanvasNodeWrapper'
import { cn } from '@/lib/utils'
import { useFileStore } from '@/stores/useFileStore'

// Import original node internals
import {
  TableNodeData as OriginalTableNodeData,
  ImageNodeData as OriginalImageNodeData,
  EmbedNodeData as OriginalEmbedNodeData,
  ShapeNodeData as OriginalShapeNodeData,
  ShapeType,
  SHAPE_COLORS,
} from '@/features/preview/viewers/canvasViewer/nodes'

// ─────────────────────────────────────────────────────────────────────────────
// Re-export types
// ─────────────────────────────────────────────────────────────────────────────

export type TableNodeData = OriginalTableNodeData
export type ImageNodeData = OriginalImageNodeData
export type EmbedNodeData = OriginalEmbedNodeData
export type ShapeNodeData = OriginalShapeNodeData
export { SHAPE_COLORS }

export interface AudioNodeData {
  src?: string
  label?: string
  isMaximized?: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// Wrapped Table Node
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_HEADERS = ['Column 1', 'Column 2', 'Column 3']
const DEFAULT_ROWS = [
  ['', '', ''],
  ['', '', ''],
]

export function WrappedTableNode({
  id,
  data,
  selected,
  groupColor,
}: NodeProps<TableNodeData> & { groupColor?: string }) {
  const [headers, setHeaders] = React.useState<string[]>(data?.headers || DEFAULT_HEADERS)
  const [rows, setRows] = React.useState<string[][]>(data?.rows || DEFAULT_ROWS)
  const [isInteractive, setIsInteractive] = React.useState(false)
  const isMaximized = data?.isMaximized || false

  // Exit interactive mode when deselected
  React.useEffect(() => {
    if (!selected) setIsInteractive(false)
  }, [selected])

  // Notify parent of changes
  const notifyChange = React.useCallback(
    (newHeaders: string[], newRows: string[][]) => {
      window.dispatchEvent(
        new CustomEvent('canvas-node-update', {
          detail: { id, data: { ...data, headers: newHeaders, rows: newRows } },
        }),
      )
    },
    [id, data],
  )

  const handleHeaderChange = (index: number, value: string) => {
    const newHeaders = [...headers]
    newHeaders[index] = value
    setHeaders(newHeaders)
    notifyChange(newHeaders, rows)
  }

  const handleCellChange = (rowIndex: number, colIndex: number, value: string) => {
    const newRows = rows.map((row, ri) =>
      ri === rowIndex ? row.map((cell, ci) => (ci === colIndex ? value : cell)) : row,
    )
    setRows(newRows)
    notifyChange(headers, newRows)
  }

  const addRow = () => {
    const newRow = headers.map(() => '')
    const newRows = [...rows, newRow]
    setRows(newRows)
    notifyChange(headers, newRows)
  }

  const addColumn = () => {
    const newHeaders = [...headers, `Column ${headers.length + 1}`]
    const newRows = rows.map((row) => [...row, ''])
    setHeaders(newHeaders)
    setRows(newRows)
    notifyChange(newHeaders, newRows)
  }

  const removeRow = (index: number) => {
    if (rows.length <= 1) return
    const newRows = rows.filter((_, i) => i !== index)
    setRows(newRows)
    notifyChange(headers, newRows)
  }

  const removeColumn = (index: number) => {
    if (headers.length <= 1) return
    const newHeaders = headers.filter((_, i) => i !== index)
    const newRows = rows.map((row) => row.filter((_, i) => i !== index))
    setHeaders(newHeaders)
    setRows(newRows)
    notifyChange(newHeaders, newRows)
  }

  const handleMaximize = React.useCallback(() => {
    window.dispatchEvent(new CustomEvent('canvas-node-maximize', { detail: { id } }))
  }, [id])

  // Maximized view
  if (isMaximized) {
    return (
      <div className="h-full w-full flex flex-col bg-background">
        <MaximizedHeader
          icon={<Table className="h-4 w-4 text-muted-foreground" />}
          label={data?.label || 'Table'}
          extra={
            <button
              onClick={addColumn}
              className="flex items-center gap-1 px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent rounded transition-colors"
              title="Add column">
              <Plus className="h-3 w-3" />
              Col
            </button>
          }
          onExit={handleMaximize}
        />
        <div className="flex-1 overflow-auto nodrag nowheel">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-muted/50 sticky top-0 z-10">
                {headers.map((header, colIndex) => (
                  <th
                    key={colIndex}
                    className="border-b border-r border-border/50 p-0 font-medium text-left">
                    <input
                      type="text"
                      value={header}
                      onChange={(e) => handleHeaderChange(colIndex, e.target.value)}
                      className="w-full px-3 py-2 bg-transparent focus:bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={rowIndex} className="hover:bg-muted/30">
                  {row.map((cell, colIndex) => (
                    <td key={colIndex} className="border-b border-r border-border/50 p-0">
                      <input
                        type="text"
                        value={cell}
                        onChange={(e) => handleCellChange(rowIndex, colIndex, e.target.value)}
                        className="w-full px-3 py-2 bg-transparent focus:bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                        placeholder="..."
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {/* Add row button below the table */}
          <button
            onClick={addRow}
            className="w-full py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors flex items-center justify-center gap-1 border-b border-border/50">
            <Plus className="h-4 w-4" />
            Add row
          </button>
        </div>
      </div>
    )
  }

  return (
    <CanvasNodeWrapper
      id={id}
      selected={selected}
      isEditing={isInteractive}
      onEditingChange={setIsInteractive}
      isMaximized={isMaximized}
      groupColor={groupColor}
      icon={<Table className="h-3.5 w-3.5 text-muted-foreground" />}
      label={data?.label || 'Table'}
      minWidth={200}
      minHeight={120}>
      {/* Table Content - scrollable within fixed node bounds */}
      <div className={cn('h-full w-full overflow-auto', isInteractive ? 'nodrag nowheel' : 'pointer-events-none')}>
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-muted/50 sticky top-0 z-10">
              {headers.map((header, colIndex) => (
                <th
                  key={colIndex}
                  className="border-b border-r border-border/50 p-0 font-medium text-left min-w-[100px]">
                  <input
                    type="text"
                    value={header}
                    onChange={(e) => handleHeaderChange(colIndex, e.target.value)}
                    className="w-full px-2 py-1.5 bg-transparent focus:bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-muted/30">
                {row.map((cell, colIndex) => (
                  <td key={colIndex} className="border-b border-r border-border/50 p-0">
                    <input
                      type="text"
                      value={cell}
                      onChange={(e) => handleCellChange(rowIndex, colIndex, e.target.value)}
                      className="w-full px-2 py-1.5 bg-transparent focus:bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="..."
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {/* Add row button below the table */}
        <button
          onClick={addRow}
          className="w-full py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors flex items-center justify-center gap-1 border-t border-border/50">
          <Plus className="h-3 w-3" />
          Add row
        </button>
      </div>
    </CanvasNodeWrapper>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Fullscreen Image Viewer
// ─────────────────────────────────────────────────────────────────────────────

const FS_MIN_ZOOM = 0.05
const FS_MAX_ZOOM = 20
const clampZoom = (z: number) => Math.max(FS_MIN_ZOOM, Math.min(FS_MAX_ZOOM, z))

function FullscreenImageViewer({
  src,
  alt,
  label,
}: {
  src: string
  alt?: string
  label?: string
}) {
  const [zoom, setZoom] = React.useState(1)
  const [rotation, setRotation] = React.useState(0)
  const [pan, setPan] = React.useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = React.useState(false)
  const [dragStart, setDragStart] = React.useState({ x: 0, y: 0, panX: 0, panY: 0 })
  const [lastPinchDist, setLastPinchDist] = React.useState<number | null>(null)
  const [showConvertMenu, setShowConvertMenu] = React.useState(false)
  const imgRef = React.useRef<HTMLImageElement>(null)

  const handleReset = React.useCallback(() => {
    setZoom(1)
    setRotation(0)
    setPan({ x: 0, y: 0 })
  }, [])

  const handleZoomIn = React.useCallback(() => setZoom((z) => clampZoom(z * 1.25)), [])
  const handleZoomOut = React.useCallback(() => setZoom((z) => clampZoom(z / 1.25)), [])
  const handleRotateCW = React.useCallback(() => setRotation((r) => (r + 90) % 360), [])
  const handleRotateCCW = React.useCallback(() => setRotation((r) => (r - 90 + 360) % 360), [])

  const handleWheel = React.useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1
    setZoom((z) => clampZoom(z * factor))
  }, [])

  const handleMouseDown = React.useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return
      setIsDragging(true)
      setDragStart({ x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y })
      e.preventDefault()
    },
    [pan],
  )

  const handleMouseMove = React.useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return
      setPan({
        x: dragStart.panX + (e.clientX - dragStart.x),
        y: dragStart.panY + (e.clientY - dragStart.y),
      })
    },
    [isDragging, dragStart],
  )

  const handleMouseUp = React.useCallback(() => setIsDragging(false), [])

  const handleTouchStart = React.useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      )
      setLastPinchDist(dist)
    }
  }, [])

  const handleTouchMove = React.useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2 && lastPinchDist !== null) {
        e.preventDefault()
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY,
        )
        setZoom((z) => clampZoom(z * (dist / lastPinchDist)))
        setLastPinchDist(dist)
      }
    },
    [lastPinchDist],
  )

  const handleTouchEnd = React.useCallback(() => setLastPinchDist(null), [])

  const convertImage = React.useCallback(
    async (format: 'image/png' | 'image/jpeg' | 'image/webp') => {
      const img = imgRef.current
      if (!img) return

      const isRotated90 = rotation % 180 !== 0
      const canvas = document.createElement('canvas')
      canvas.width = isRotated90 ? img.naturalHeight : img.naturalWidth
      canvas.height = isRotated90 ? img.naturalWidth : img.naturalHeight

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      ctx.save()
      ctx.translate(canvas.width / 2, canvas.height / 2)
      ctx.rotate((rotation * Math.PI) / 180)
      ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2)
      ctx.restore()

      const ext = format === 'image/jpeg' ? 'jpg' : format === 'image/webp' ? 'webp' : 'png'
      const basename = (label || 'image').replace(/\.[^.]+$/, '')
      const filename = `${basename}.${ext}`

      canvas.toBlob(
        (blob) => {
          if (!blob) return
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = filename
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(url)
        },
        format,
        0.92,
      )
      setShowConvertMenu(false)
    },
    [rotation, label],
  )

  React.useEffect(() => {
    if (!showConvertMenu) return
    const handleClick = () => setShowConvertMenu(false)
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [showConvertMenu])

  const zoomPercent = Math.round(zoom * 100)

  return (
    <div
      className={cn(
        'relative flex-1 overflow-hidden bg-muted/10 flex items-center justify-center select-none nodrag nowheel',
        isDragging ? 'cursor-grabbing' : 'cursor-grab',
      )}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}>
      {/* Image with zoom/rotate/pan transforms */}
      <img
        ref={imgRef}
        src={src}
        alt={alt || ''}
        style={{
          maxWidth: '100%',
          maxHeight: '100%',
          objectFit: 'contain',
          display: 'block',
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotate(${rotation}deg)`,
          transformOrigin: 'center center',
          transition: isDragging ? 'none' : 'transform 0.06s ease-out',
          userSelect: 'none',
          WebkitUserDrag: 'none',
        } as React.CSSProperties}
        draggable={false}
        crossOrigin="anonymous"
      />

      {/* Floating controls toolbar */}
      <div
        className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-0.5 bg-background/90 backdrop-blur-sm border border-border rounded-xl px-2 py-1.5 shadow-xl"
        onMouseDown={(e) => e.stopPropagation()}
        onWheel={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={handleZoomOut}
          className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          title="Zoom out">
          <ZoomOut className="h-3.5 w-3.5" />
        </button>

        <span className="text-xs text-muted-foreground min-w-14 text-center font-mono tabular-nums">
          {zoomPercent}%
        </span>

        <button
          type="button"
          onClick={handleZoomIn}
          className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          title="Zoom in">
          <ZoomIn className="h-3.5 w-3.5" />
        </button>

        <div className="w-px h-5 bg-border mx-1" />

        <button
          type="button"
          onClick={handleRotateCCW}
          className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          title="Rotate counter-clockwise">
          <RotateCcw className="h-3.5 w-3.5" />
        </button>

        <button
          type="button"
          onClick={handleRotateCW}
          className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          title="Rotate clockwise">
          <RotateCw className="h-3.5 w-3.5" />
        </button>

        <div className="w-px h-5 bg-border mx-1" />

        <button
          type="button"
          onClick={handleReset}
          className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          title="Reset view">
          <Maximize2 className="h-3.5 w-3.5" />
        </button>

        <div className="w-px h-5 bg-border mx-1" />

        <div className="relative">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setShowConvertMenu((m) => !m)
            }}
            className="h-7 px-2 flex items-center gap-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors text-xs"
            title="Save as...">
            <ArrowLeftRight className="h-3.5 w-3.5" />
            <ChevronDown className="h-3 w-3" />
          </button>
          {showConvertMenu && (
            <div className="absolute bottom-full mb-2 right-0 bg-background border border-border rounded-lg shadow-xl py-1 min-w-[130px] z-50">
              <button
                type="button"
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted transition-colors"
                onClick={() => convertImage('image/png')}>
                Save as PNG
              </button>
              <button
                type="button"
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted transition-colors"
                onClick={() => convertImage('image/jpeg')}>
                Save as JPEG
              </button>
              <button
                type="button"
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted transition-colors"
                onClick={() => convertImage('image/webp')}>
                Save as WebP
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Wrapped Image Node
// ─────────────────────────────────────────────────────────────────────────────

export function WrappedImageNode({
  id,
  data,
  selected,
  groupColor,
}: NodeProps<ImageNodeData> & { groupColor?: string }) {
  const [src, setSrc] = React.useState(data?.src || '')
  const [isEditing, setIsEditing] = React.useState(!data?.src)
  const [isInteractive, setIsInteractive] = React.useState(false)
  const [inputValue, setInputValue] = React.useState(data?.src || '')
  const [error, setError] = React.useState<string | null>(null)
  const [resolvedSrc, setResolvedSrc] = React.useState<string | null>(null)
  const [isDragging, setIsDragging] = React.useState(false)
  const isMaximized = data?.isMaximized || false
  const objectFit = data?.objectFit || 'cover'

  // Exit interactive mode when deselected
  React.useEffect(() => {
    if (!selected) setIsInteractive(false)
  }, [selected])

  // Resolve image source (handle local file paths)
  React.useEffect(() => {
    if (!src) {
      setResolvedSrc(null)
      return
    }

    // If it's a URL, use directly
    if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:') || src.startsWith('blob:')) {
      setResolvedSrc(src)
      return
    }

    // If it's a local file path, convert it
    try {
      const converted = convertFileSrc(src)
      console.log('[WrappedImageNode] convertFileSrc result:', { src, converted })
      setResolvedSrc(converted)
    } catch (e) {
      console.error('[WrappedImageNode] convertFileSrc failed:', e)
      setError('Failed to load image')
      setResolvedSrc(null)
    }
  }, [src])

  const handleSubmit = () => {
    if (inputValue.trim()) {
      setSrc(inputValue.trim())
      setIsEditing(false)
      setError(null)
      window.dispatchEvent(
        new CustomEvent('canvas-node-update', {
          detail: { id, data: { ...data, src: inputValue.trim() } },
        }),
      )
    }
  }

  const handleMaximize = React.useCallback(() => {
    window.dispatchEvent(new CustomEvent('canvas-node-maximize', { detail: { id } }))
  }, [id])

  const handleDrop = React.useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const url = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain')
      if (url) {
        setSrc(url)
        setInputValue(url)
        setIsEditing(false)
        window.dispatchEvent(
          new CustomEvent('canvas-node-update', {
            detail: { id, data: { ...data, src: url } },
          }),
        )
      }
    },
    [id, data],
  )

  // Maximized view
  if (isMaximized) {
    return (
      <div className="canvas-node canvas-node-maximized h-full w-full flex flex-col bg-background border border-border rounded-lg shadow-md">
        <MaximizedHeader
          icon={<ImageIcon className="h-4 w-4 text-muted-foreground" />}
          label={data?.label || 'Image'}
          onExit={handleMaximize}
        />
        {resolvedSrc ? (
          <FullscreenImageViewer src={resolvedSrc} alt={data?.alt} label={data?.label} />
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">No image</div>
        )}
      </div>
    )
  }

  return (
    <CanvasNodeWrapper
      id={id}
      selected={selected}
      isEditing={isInteractive}
      onEditingChange={setIsInteractive}
      isMaximized={isMaximized}
      groupColor={groupColor}
      icon={<ImageIcon className="h-3.5 w-3.5 text-muted-foreground" />}
      label={data?.label || 'Image'}
      minWidth={200}
      minHeight={150}
      keepAspectRatio>
      <div
        className={cn(
          'flex-1 overflow-hidden relative',
          isMaximized || isInteractive ? 'nodrag nowheel' : 'pointer-events-none',
        )}
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}>
        {isEditing ? (
          <div className="p-3 flex flex-col gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="Enter image URL or paste..."
              className="w-full px-2 py-1.5 text-sm bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              onClick={handleSubmit}
              className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90">
              Load Image
            </button>
          </div>
        ) : resolvedSrc ? (
          <div className="relative w-full h-full bg-muted/20">
            <img
              src={resolvedSrc}
              alt={data?.alt || ''}
              className="w-full h-full"
              style={{ objectFit }}
              onError={() => setError('Failed to load image')}
              onDoubleClick={() => setIsEditing(true)}
            />
            {isDragging && (
              <div className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary flex items-center justify-center">
                <span className="text-sm text-primary font-medium">Drop to replace</span>
              </div>
            )}
          </div>
        ) : (
          <div
            className={cn(
              'flex flex-col items-center justify-center h-full text-muted-foreground cursor-pointer transition-colors',
              isDragging ? 'bg-primary/10 border-2 border-dashed border-primary' : 'hover:bg-muted/50',
            )}
            onClick={() => setIsEditing(true)}>
            <ImageIcon className="h-8 w-8 mb-2" />
            <span className="text-xs">{isDragging ? 'Drop image here' : 'Click to add image or drag & drop'}</span>
          </div>
        )}
        {error && (
          <div className="absolute bottom-2 left-2 right-2 text-xs text-destructive bg-background/90 px-2 py-1 rounded">
            {error}
          </div>
        )}
      </div>
    </CanvasNodeWrapper>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Wrapped Audio Node
// ─────────────────────────────────────────────────────────────────────────────

export function WrappedAudioNode({
  id,
  data,
  selected,
  groupColor,
}: NodeProps<AudioNodeData> & { groupColor?: string }) {
  const [src, setSrc] = React.useState(data?.src || '')
  const [isEditing, setIsEditing] = React.useState(!data?.src)
  const [isInteractive, setIsInteractive] = React.useState(false)
  const [inputValue, setInputValue] = React.useState(data?.src || '')
  const [error, setError] = React.useState<string | null>(null)
  const [resolvedSrc, setResolvedSrc] = React.useState<string | null>(null)
  const isMaximized = data?.isMaximized || false

  // Exit interactive mode when deselected
  React.useEffect(() => {
    if (!selected) setIsInteractive(false)
  }, [selected])

  // Resolve audio source (handle local file paths)
  React.useEffect(() => {
    if (!src) {
      setResolvedSrc(null)
      return
    }

    if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:') || src.startsWith('blob:')) {
      setResolvedSrc(src)
      return
    }

    try {
      setResolvedSrc(convertFileSrc(src))
    } catch {
      setError('Failed to load audio')
      setResolvedSrc(null)
    }
  }, [src])

  const handleSubmit = () => {
    if (inputValue.trim()) {
      const next = inputValue.trim()
      setSrc(next)
      setIsEditing(false)
      setError(null)
      window.dispatchEvent(
        new CustomEvent('canvas-node-update', {
          detail: { id, data: { ...data, src: next } },
        }),
      )
    }
  }

  const handleMaximize = React.useCallback(() => {
    window.dispatchEvent(new CustomEvent('canvas-node-maximize', { detail: { id } }))
  }, [id])

  // Maximized view
  if (isMaximized) {
    return (
      <div className="canvas-node canvas-node-maximized h-full w-full flex flex-col bg-background border border-border rounded-lg shadow-md">
        <MaximizedHeader
          icon={<Music className="h-4 w-4 text-muted-foreground" />}
          label={data?.label || 'Audio'}
          onExit={handleMaximize}
        />
        <div className="flex-1 overflow-hidden flex items-center justify-center p-6">
          {resolvedSrc ? (
            <audio
              src={resolvedSrc}
              controls
              preload="metadata"
              className="w-full"
              onError={() => setError('Failed to load audio')}
            />
          ) : (
            <div className="text-sm text-muted-foreground">No audio</div>
          )}
        </div>
        {error && <div className="px-3 pb-3 text-xs text-destructive">{error}</div>}
      </div>
    )
  }

  return (
    <CanvasNodeWrapper
      id={id}
      selected={selected}
      isEditing={isInteractive}
      onEditingChange={setIsInteractive}
      isMaximized={isMaximized}
      groupColor={groupColor}
      icon={<Music className="h-3.5 w-3.5 text-muted-foreground" />}
      label={data?.label || 'Audio'}
      minWidth={280}
      minHeight={120}>
      <div
        className={cn('flex-1 min-h-0 p-3', isMaximized || isInteractive ? 'nodrag nowheel' : 'pointer-events-none')}>
        {isEditing ? (
          <div className="flex flex-col gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="Paste file path or URL…"
              className="w-full px-2 py-1.5 text-sm bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              type="button"
              onClick={handleSubmit}
              className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90">
              Load Audio
            </button>
          </div>
        ) : resolvedSrc ? (
          <div className="flex flex-col gap-2" onDoubleClick={() => setIsEditing(true)}>
            <audio
              src={resolvedSrc}
              controls
              preload="metadata"
              className="w-full"
              onError={() => setError('Failed to load audio')}
            />
          </div>
        ) : (
          <div
            className="flex flex-col items-center justify-center h-full text-muted-foreground cursor-pointer hover:bg-muted/30 rounded"
            onClick={() => setIsEditing(true)}>
            <Music className="h-8 w-8 mb-2" />
            <span className="text-xs">Click to add audio</span>
          </div>
        )}

        {error && <div className="mt-2 text-xs text-destructive">{error}</div>}
      </div>
    </CanvasNodeWrapper>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Wrapped Embed Node
// ─────────────────────────────────────────────────────────────────────────────

import { ChevronLeft, ChevronRight, RefreshCw, ExternalLink, Eye, EyeOff } from 'lucide-react'

export function WrappedEmbedNode({
  id,
  data,
  selected,
  groupColor,
}: NodeProps<EmbedNodeData> & { groupColor?: string }) {
  const [url, setUrl] = React.useState(data?.url || '')
  const [isEditing, setIsEditing] = React.useState(!data?.url)
  const [isInteractive, setIsInteractive] = React.useState(false)
  const [inputValue, setInputValue] = React.useState(data?.url || '')
  const [isLoading, setIsLoading] = React.useState(false)
  const [showBrowserBar, setShowBrowserBar] = React.useState(true)
  const [urlBarValue, setUrlBarValue] = React.useState(data?.url || '')
  const iframeRef = React.useRef<HTMLIFrameElement>(null)
  const isMaximized = data?.isMaximized || false

  // Exit interactive mode when deselected
  React.useEffect(() => {
    if (!selected) setIsInteractive(false)
  }, [selected])

  // Sync URL bar value with current URL
  React.useEffect(() => {
    setUrlBarValue(url)
  }, [url])

  // Auto-refresh iframe when agent writes project files (only for localhost previews)
  React.useEffect(() => {
    const isLocalhost = url.startsWith('http://localhost') || url.startsWith('http://127.0.0.1')
    if (!isLocalhost) return

    const handlePreviewReload = () => {
      if (iframeRef.current && url) {
        setIsLoading(true)
        iframeRef.current.src = url
      }
    }

    window.addEventListener('canvas-preview-reload', handlePreviewReload)
    return () => window.removeEventListener('canvas-preview-reload', handlePreviewReload)
  }, [url])

  const normalizeUrl = (input: string) => {
    if (!input) return ''
    if (input.startsWith('http://') || input.startsWith('https://')) return input
    return `https://${input}`
  }

  const handleSubmit = () => {
    if (inputValue.trim()) {
      const normalized = normalizeUrl(inputValue.trim())
      setUrl(normalized)
      setIsEditing(false)
      setIsLoading(true)
      window.dispatchEvent(
        new CustomEvent('canvas-node-update', {
          detail: { id, data: { ...data, url: normalized } },
        }),
      )
    }
  }

  const handleUrlBarSubmit = (e: React.KeyboardEvent | React.FormEvent) => {
    e.preventDefault()
    if (urlBarValue.trim()) {
      const normalized = normalizeUrl(urlBarValue.trim())
      setUrl(normalized)
      setIsLoading(true)
      window.dispatchEvent(
        new CustomEvent('canvas-node-update', {
          detail: { id, data: { ...data, url: normalized } },
        }),
      )
    }
  }

  const handleRefresh = () => {
    if (iframeRef.current && url) {
      setIsLoading(true)
      iframeRef.current.src = url
    }
  }

  const handleOpenExternal = () => {
    if (url) {
      window.open(url, '_blank')
    }
  }

  const handleMaximize = React.useCallback(() => {
    window.dispatchEvent(new CustomEvent('canvas-node-maximize', { detail: { id } }))
  }, [id])

  const domain = React.useMemo(() => {
    try {
      return new URL(url).hostname
    } catch {
      return url
    }
  }, [url])

  // Browser bar height for padding calculation
  const browserBarHeight = showBrowserBar ? 36 : 0

  // Maximized view
  if (isMaximized) {
    return (
      <div className="canvas-node canvas-node-maximized h-full w-full flex flex-col bg-background border border-border rounded-lg shadow-md">
        <MaximizedHeader
          icon={<Globe className="h-4 w-4 text-muted-foreground" />}
          label={domain || 'Embed'}
          onExit={handleMaximize}
        />
        {/* Browser Bar in maximized mode */}
        {url && (
          <div className="flex items-center gap-1 px-2 py-1.5 bg-muted/40 border-b border-border/50">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isLoading}
              className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              title="Refresh">
              <RefreshCw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} />
            </button>
            <form onSubmit={handleUrlBarSubmit} className="flex-1 flex items-center">
              <input
                type="text"
                value={urlBarValue}
                onChange={(e) => setUrlBarValue(e.target.value)}
                className="flex-1 px-2.5 py-1 text-xs bg-background/50 border border-border/50 rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50 text-muted-foreground"
                placeholder="Enter URL..."
              />
            </form>
            <button
              type="button"
              onClick={handleOpenExternal}
              className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
              title="Open in browser">
              <ExternalLink className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-hidden">
          {url && (
            <iframe
              ref={iframeRef}
              src={url}
              className="w-full h-full border-0"
              title={domain}
              onLoad={() => setIsLoading(false)}
              onError={() => setIsLoading(false)}
            />
          )}
        </div>
      </div>
    )
  }

  return (
    <CanvasNodeWrapper
      id={id}
      selected={selected}
      isEditing={isInteractive}
      onEditingChange={setIsInteractive}
      isMaximized={isMaximized}
      groupColor={groupColor}
      icon={<Globe className="h-3.5 w-3.5 text-muted-foreground" />}
      label={domain || 'Embed'}
      minWidth={300}
      minHeight={200}
      toolbarLeftExtra={isLoading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
      toolbarRightExtra={
        url && (
          <button
            type="button"
            onClick={() => setShowBrowserBar(!showBrowserBar)}
            className="rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            title={showBrowserBar ? 'Hide URL bar' : 'Show URL bar'}>
            {showBrowserBar ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
          </button>
        )
      }>
      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
      <div
        className={cn(
          'flex flex-col flex-1 overflow-hidden',
          isMaximized || isInteractive ? 'nodrag nowheel' : 'pointer-events-none',
        )}
        tabIndex={isInteractive ? 0 : undefined}
        onKeyDown={
          isInteractive
            ? (e) => {
                // Prevent arrow keys and game-relevant keys from reaching ReactFlow
                // so they can be used inside the embedded content (e.g., games)
                const suppressedKeys = [
                  'ArrowUp',
                  'ArrowDown',
                  'ArrowLeft',
                  'ArrowRight',
                  ' ',
                  'Enter',
                  'Backspace',
                  'Tab',
                  'w',
                  'a',
                  's',
                  'd',
                  'W',
                  'A',
                  'S',
                  'D',
                ]
                if (suppressedKeys.includes(e.key)) {
                  e.stopPropagation()
                }
              }
            : undefined
        }>
        {isEditing ? (
          <div className="p-3 flex flex-col gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="Enter URL..."
              className="w-full px-2 py-1.5 text-sm bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              onClick={handleSubmit}
              className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90">
              Embed
            </button>
          </div>
        ) : url ? (
          <div className="flex flex-col flex-1 min-h-0">
            {/* Browser-style toolbar */}
            {showBrowserBar && (
              <div className="flex items-center gap-0.5 px-1.5 py-1 bg-muted/40 border-b border-border/50 shrink-0">
                {/* Navigation buttons (decorative, since iframes can't access history) */}
                <button
                  type="button"
                  disabled
                  className="p-1 rounded text-muted-foreground/40 cursor-not-allowed"
                  title="Back (not available in embed)">
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  disabled
                  className="p-1 rounded text-muted-foreground/40 cursor-not-allowed"
                  title="Forward (not available in embed)">
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleRefresh}
                  disabled={isLoading}
                  className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                  title="Refresh">
                  <RefreshCw className={cn('h-3 w-3', isLoading && 'animate-spin')} />
                </button>
                {/* URL bar */}
                <form onSubmit={handleUrlBarSubmit} className="flex-1 flex items-center mx-1">
                  <input
                    type="text"
                    value={urlBarValue}
                    onChange={(e) => setUrlBarValue(e.target.value)}
                    className="w-full px-2 py-0.5 text-[11px] bg-background/60 border border-border/40 rounded focus:outline-none focus:ring-1 focus:ring-primary/50 text-muted-foreground truncate"
                    placeholder="Enter URL..."
                  />
                </form>
                <button
                  type="button"
                  onClick={handleOpenExternal}
                  className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                  title="Open in browser">
                  <ExternalLink className="h-3 w-3" />
                </button>
              </div>
            )}
            {/* Iframe with dynamic top padding based on browser bar visibility */}
            <div className="flex-1 min-h-0 relative">
              <iframe
                ref={iframeRef}
                src={url}
                className="absolute inset-0 w-full h-full border-0"
                title={domain}
                onLoad={() => setIsLoading(false)}
                onError={() => setIsLoading(false)}
              />
            </div>
          </div>
        ) : (
          <div
            className="flex flex-col items-center justify-center h-full text-muted-foreground cursor-pointer hover:bg-muted/50"
            onClick={() => setIsEditing(true)}>
            <Globe className="h-8 w-8 mb-2" />
            <span className="text-xs">Click to embed URL</span>
          </div>
        )}
      </div>
    </CanvasNodeWrapper>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PDF Node
// ─────────────────────────────────────────────────────────────────────────────

import { FileText, Video, MapPin, Code } from 'lucide-react'

export interface PdfNodeData {
  label?: string
  url?: string
  isMaximized?: boolean
}

export function WrappedPdfNode({ id, data, selected, groupColor }: NodeProps<PdfNodeData> & { groupColor?: string }) {
  const [url, setUrl] = React.useState(data?.url || '')
  const [isEditing, setIsEditing] = React.useState(!data?.url)
  const [isInteractive, setIsInteractive] = React.useState(false)
  const [inputValue, setInputValue] = React.useState(data?.url || '')
  const isMaximized = data?.isMaximized || false

  // Exit interactive mode when deselected
  React.useEffect(() => {
    if (!selected) setIsInteractive(false)
  }, [selected])

  const handleSubmit = () => {
    if (inputValue.trim()) {
      setUrl(inputValue.trim())
      setIsEditing(false)
      window.dispatchEvent(
        new CustomEvent('canvas-node-update', {
          detail: { id, data: { ...data, url: inputValue.trim() } },
        }),
      )
    }
  }

  const handleMaximize = React.useCallback(() => {
    window.dispatchEvent(new CustomEvent('canvas-node-maximize', { detail: { id } }))
  }, [id])

  // Maximized view
  if (isMaximized) {
    return (
      <div className="canvas-node canvas-node-maximized h-full w-full flex flex-col bg-background border border-border rounded-lg shadow-md">
        <MaximizedHeader
          icon={<FileText className="h-4 w-4 text-muted-foreground" />}
          label={data?.label || 'PDF'}
          onExit={handleMaximize}
        />
        <div className="flex-1 overflow-hidden">
          {url && <iframe src={url} className="w-full h-full border-0" title="PDF Document" />}
        </div>
      </div>
    )
  }

  return (
    <CanvasNodeWrapper
      id={id}
      selected={selected}
      isEditing={isInteractive}
      onEditingChange={setIsInteractive}
      isMaximized={isMaximized}
      groupColor={groupColor}
      icon={<FileText className="h-3.5 w-3.5 text-muted-foreground" />}
      label={data?.label || 'PDF'}
      minWidth={300}
      minHeight={400}>
      <div
        className={cn(
          'flex-1 overflow-hidden',
          isMaximized || isInteractive ? 'nodrag nowheel' : 'pointer-events-none',
        )}>
        {isEditing ? (
          <div className="p-3 flex flex-col gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="Enter PDF URL..."
              className="w-full px-2 py-1.5 text-sm bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              onClick={handleSubmit}
              className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90">
              Load PDF
            </button>
          </div>
        ) : url ? (
          <iframe src={url} className="w-full h-full border-0" title="PDF Document" />
        ) : (
          <div
            className="flex flex-col items-center justify-center h-full text-muted-foreground cursor-pointer hover:bg-muted/50"
            onClick={() => setIsEditing(true)}>
            <FileText className="h-8 w-8 mb-2" />
            <span className="text-xs">Click to add PDF</span>
          </div>
        )}
      </div>
    </CanvasNodeWrapper>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// YouTube Node
// ─────────────────────────────────────────────────────────────────────────────

export interface YoutubeNodeData {
  label?: string
  url?: string
  videoId?: string
  isMaximized?: boolean
}

export function WrappedYoutubeNode({
  id,
  data,
  selected,
  groupColor,
}: NodeProps<YoutubeNodeData> & { groupColor?: string }) {
  const [url, setUrl] = React.useState(data?.url || '')
  const [videoId, setVideoId] = React.useState(data?.videoId || '')
  const [isEditing, setIsEditing] = React.useState(!data?.url && !data?.videoId)
  const [isInteractive, setIsInteractive] = React.useState(false)
  const [inputValue, setInputValue] = React.useState(data?.url || '')
  const isMaximized = data?.isMaximized || false

  // Exit interactive mode when deselected
  React.useEffect(() => {
    if (!selected) setIsInteractive(false)
  }, [selected])

  const extractVideoId = (input: string): string | null => {
    // Handle youtube.com/watch?v=ID
    const watchMatch = input.match(/[?&]v=([^&]+)/)
    if (watchMatch) return watchMatch[1]

    // Handle youtu.be/ID
    const shortMatch = input.match(/youtu\.be\/([^?]+)/)
    if (shortMatch) return shortMatch[1]

    // Handle embed URLs
    const embedMatch = input.match(/youtube\.com\/embed\/([^?]+)/)
    if (embedMatch) return embedMatch[1]

    // Assume it's just the ID if no match
    if (input.length === 11 && !input.includes('/') && !input.includes('?')) {
      return input
    }

    return null
  }

  const handleSubmit = () => {
    if (inputValue.trim()) {
      const id = extractVideoId(inputValue.trim())
      if (id) {
        setVideoId(id)
        setUrl(inputValue.trim())
        setIsEditing(false)
        window.dispatchEvent(
          new CustomEvent('canvas-node-update', {
            detail: { id, data: { ...data, url: inputValue.trim(), videoId: id } },
          }),
        )
      }
    }
  }

  const handleMaximize = React.useCallback(() => {
    window.dispatchEvent(new CustomEvent('canvas-node-maximize', { detail: { id } }))
  }, [id])

  const embedUrl = videoId ? `https://www.youtube.com/embed/${videoId}` : ''

  // Maximized view
  if (isMaximized) {
    return (
      <div className="canvas-node canvas-node-maximized h-full w-full flex flex-col bg-background border border-border rounded-lg shadow-md">
        <MaximizedHeader
          icon={<Video className="h-4 w-4 text-muted-foreground" />}
          label={data?.label || 'YouTube'}
          onExit={handleMaximize}
        />
        <div className="flex-1 overflow-hidden">
          {embedUrl && (
            <iframe
              src={embedUrl}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title="YouTube video"
            />
          )}
        </div>
      </div>
    )
  }

  return (
    <CanvasNodeWrapper
      id={id}
      selected={selected}
      isEditing={isInteractive}
      onEditingChange={setIsInteractive}
      isMaximized={isMaximized}
      groupColor={groupColor}
      icon={<Video className="h-3.5 w-3.5 text-muted-foreground" />}
      label={data?.label || 'YouTube'}
      minWidth={400}
      minHeight={225}>
      <div
        className={cn(
          'flex-1 overflow-hidden',
          isMaximized || isInteractive ? 'nodrag nowheel' : 'pointer-events-none',
        )}>
        {isEditing ? (
          <div className="p-3 flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="YouTube URL or video ID..."
              className="w-full px-2 py-1.5 text-sm bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              onClick={handleSubmit}
              className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 min-w-fit">
              Embed Video
            </button>
          </div>
        ) : embedUrl ? (
          <iframe
            src={embedUrl}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title="YouTube video"
          />
        ) : (
          <div
            className="flex flex-col items-center justify-center h-full text-muted-foreground cursor-pointer hover:bg-muted/50"
            onClick={() => setIsEditing(true)}>
            <Video className="h-8 w-8 mb-2" />
            <span className="text-xs">Click to add YouTube video</span>
          </div>
        )}
      </div>
    </CanvasNodeWrapper>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Location/Map Node
// ─────────────────────────────────────────────────────────────────────────────

export interface LocationNodeData {
  label?: string
  address?: string
  lat?: number
  lng?: number
  isMaximized?: boolean
}

export function WrappedLocationNode({
  id,
  data,
  selected,
  groupColor,
}: NodeProps<LocationNodeData> & { groupColor?: string }) {
  const [address, setAddress] = React.useState(data?.address || '')
  const [isEditing, setIsEditing] = React.useState(!data?.address)
  const [isInteractive, setIsInteractive] = React.useState(false)
  const [inputValue, setInputValue] = React.useState(data?.address || '')
  const isMaximized = data?.isMaximized || false

  // Exit interactive mode when deselected
  React.useEffect(() => {
    if (!selected) setIsInteractive(false)
  }, [selected])

  const handleSubmit = () => {
    if (inputValue.trim()) {
      setAddress(inputValue.trim())
      setIsEditing(false)
      window.dispatchEvent(
        new CustomEvent('canvas-node-update', {
          detail: { id, data: { ...data, address: inputValue.trim() } },
        }),
      )
    }
  }

  const handleMaximize = React.useCallback(() => {
    window.dispatchEvent(new CustomEvent('canvas-node-maximize', { detail: { id } }))
  }, [id])

  // Generate Google Maps embed URL
  const mapUrl = address
    ? `https://www.google.com/maps/embed/v1/place?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''}&q=${encodeURIComponent(address)}`
    : ''

  // Maximized view
  if (isMaximized) {
    return (
      <div className="canvas-node canvas-node-maximized h-full w-full flex flex-col bg-background border border-border rounded-lg shadow-md">
        <MaximizedHeader
          icon={<MapPin className="h-4 w-4 text-muted-foreground" />}
          label={data?.label || address || 'Location'}
          onExit={handleMaximize}
        />
        <div className="flex-1 overflow-hidden">
          {mapUrl && <iframe src={mapUrl} className="w-full h-full border-0" title="Map" />}
        </div>
      </div>
    )
  }

  return (
    <CanvasNodeWrapper
      id={id}
      selected={selected}
      isEditing={isInteractive}
      onEditingChange={setIsInteractive}
      isMaximized={isMaximized}
      groupColor={groupColor}
      icon={<MapPin className="h-3.5 w-3.5 text-muted-foreground" />}
      label={data?.label || address || 'Location'}
      minWidth={300}
      minHeight={200}>
      <div
        className={cn(
          'flex-1 overflow-hidden',
          isMaximized || isInteractive ? 'nodrag nowheel' : 'pointer-events-none',
        )}>
        {isEditing ? (
          <div className="p-3 flex flex-col gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="Enter location or address..."
              className="w-full px-2 py-1.5 text-sm bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              onClick={handleSubmit}
              className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90">
              Show on Map
            </button>
          </div>
        ) : mapUrl ? (
          <iframe src={mapUrl} className="w-full h-full border-0" title="Map" />
        ) : (
          <div
            className="flex flex-col items-center justify-center h-full text-muted-foreground cursor-pointer hover:bg-muted/50"
            onClick={() => setIsEditing(true)}>
            <MapPin className="h-8 w-8 mb-2" />
            <span className="text-xs">Click to add location</span>
          </div>
        )}
      </div>
    </CanvasNodeWrapper>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Code Block Node
// ─────────────────────────────────────────────────────────────────────────────

export interface CodeBlockNodeData {
  label?: string
  code?: string
  language?: string
  filePath?: string
  isMaximized?: boolean
}

// Lazy-load shiki for syntax highlighting in read-only code blocks
const LazyShikiHighlight = React.lazy(() =>
  import('shiki').then((mod) => ({
    default: function ShikiHighlight({
      code,
      language,
      isDark,
    }: {
      code: string
      language: string
      isDark: boolean
    }) {
      const [html, setHtml] = React.useState<string>('')

      React.useEffect(() => {
        let cancelled = false
        mod
          .codeToHtml(code, {
            lang: language || 'text',
            theme: isDark ? 'vitesse-dark' : 'vitesse-light',
          })
          .then((result) => {
            if (!cancelled) setHtml(result)
          })
          .catch(() => {
            // Fallback: render as plain text if language not supported
            if (!cancelled) setHtml('')
          })
        return () => {
          cancelled = true
        }
      }, [code, language, isDark])

      if (!html) {
        return (
          <pre className="font-mono text-xs p-2 text-foreground whitespace-pre-wrap break-words">
            <code>{code}</code>
          </pre>
        )
      }

      return (
        <div
          className="shiki-highlight font-mono text-xs p-2 overflow-auto h-full [&>pre]:!bg-transparent [&>pre]:!p-0 [&>pre]:!m-0 [&_code]:!text-xs"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )
    },
  })),
)

// Lazy-load Monaco editor for interactive code editing
const LazyMonacoEditor = React.lazy(() =>
  import('@monaco-editor/react').then((mod) => ({ default: mod.default })),
)

export function WrappedCodeBlockNode({
  id,
  data,
  selected,
  groupColor,
}: NodeProps<CodeBlockNodeData> & { groupColor?: string }) {
  const [code, setCode] = React.useState(data?.code || '')
  const [language, setLanguage] = React.useState(data?.language || 'javascript')
  const [isInteractive, setIsInteractive] = React.useState(false)
  const [fileLoaded, setFileLoaded] = React.useState(false)
  const [fileDirty, setFileDirty] = React.useState(false)
  const isMaximized = data?.isMaximized || false
  const filePath = data?.filePath
  const saveTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const editorRef = React.useRef<any>(null)
  const monacoRef = React.useRef<any>(null)
  const activeDecorationsRef = React.useRef<string[]>([])
  const highlightTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingHighlightRef = React.useRef<{ startLine: number; endLine: number } | null>(null)

  // Subscribe to external file changes (e.g. agent edits)
  const fileVersion = useFileStore((state) => (filePath ? state.getFileVersion(filePath) : 0))

  const isDark =
    document.documentElement.classList.contains('dark') ||
    window.matchMedia('(prefers-color-scheme: dark)').matches

  // Load content from file on mount, and reload when agent externally writes the file
  React.useEffect(() => {
    if (!filePath) return
    // Don't reload if the user has unsaved local edits
    if (fileDirty) return
    let cancelled = false

    const loadFile = async () => {
      try {
        const result = await invoke<{ content: string }>('read_text_file', { filePath })
        if (cancelled) return
        setCode(result.content)
        setFileLoaded(true)
        setFileDirty(false)
      } catch (err) {
        console.error('[CodeBlockNode] Failed to load file:', filePath, err)
        if (!cancelled) setFileLoaded(true)
      }
    }
    loadFile()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filePath, fileVersion])

  // Debounce-save to disk when filePath is set and code changes
  React.useEffect(() => {
    if (!filePath || !fileLoaded || !fileDirty) return

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      try {
        await invoke('write_text_file', { filePath, content: code })
        setFileDirty(false)
      } catch (err) {
        console.error('[CodeBlockNode] Failed to save file:', filePath, err)
      }
    }, 800)

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [code, filePath, fileLoaded, fileDirty])

  // Exit interactive mode when deselected
  React.useEffect(() => {
    if (!selected) setIsInteractive(false)
  }, [selected])

  const applyHighlight = React.useCallback((editor: any, monaco: any, startLine: number, endLine: number) => {
    editor.revealLineInCenter(startLine)
    activeDecorationsRef.current = editor.deltaDecorations(activeDecorationsRef.current, [])
    const newDecorations = editor.deltaDecorations([], [
      {
        range: new monaco.Range(startLine, 1, endLine, 1),
        options: { isWholeLine: true, className: 'agent-code-changed-line' },
      },
    ])
    activeDecorationsRef.current = newDecorations
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current)
    highlightTimerRef.current = setTimeout(() => {
      if (editorRef.current) {
        activeDecorationsRef.current = editorRef.current.deltaDecorations(activeDecorationsRef.current, [])
      }
    }, 2000)
  }, [])

  // Flash-highlight changed lines + auto-scroll when agent edits this file
  React.useEffect(() => {
    const handleCodeHighlight = (event: Event) => {
      const { filePath: evtPath, startLine, endLine } = (event as CustomEvent).detail ?? {}
      if (!evtPath || evtPath !== filePath) return

      const sl = startLine ?? 1
      const el = endLine ?? sl

      if (editorRef.current && monacoRef.current) {
        // Editor already mounted — apply immediately
        applyHighlight(editorRef.current, monacoRef.current, sl, el)
      } else {
        // Editor not mounted yet — store pending highlight and open interactive mode
        pendingHighlightRef.current = { startLine: sl, endLine: el }
        setIsInteractive(true)
      }
    }

    window.addEventListener('canvas-code-highlight', handleCodeHighlight)
    return () => window.removeEventListener('canvas-code-highlight', handleCodeHighlight)
  }, [filePath, applyHighlight])

  const handleEditorMount = React.useCallback((editor: any, monaco: any) => {
    editorRef.current = editor
    monacoRef.current = monaco
    // Apply any highlight that arrived before the editor was mounted
    const pending = pendingHighlightRef.current
    if (pending) {
      pendingHighlightRef.current = null
      requestAnimationFrame(() => applyHighlight(editor, monaco, pending.startLine, pending.endLine))
    }
  }, [applyHighlight])

  const handleCodeChange = (newCode: string) => {
    setCode(newCode)
    if (filePath) {
      setFileDirty(true)
    } else {
      window.dispatchEvent(
        new CustomEvent('canvas-node-update', {
          detail: { id, data: { ...data, code: newCode } },
        }),
      )
    }
  }

  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage)
    window.dispatchEvent(
      new CustomEvent('canvas-node-update', {
        detail: { id, data: { ...data, language: newLanguage } },
      }),
    )
  }

  const handleMaximize = React.useCallback(() => {
    window.dispatchEvent(new CustomEvent('canvas-node-maximize', { detail: { id } }))
  }, [id])

  // Derive label: prefer explicit label, then filename from filePath, then language
  const fileName = filePath ? filePath.split(/[/\\]/).pop() : null
  const nodeLabel = data?.label || fileName || `Code (${language})`

  // Monaco editor options (shared between normal and maximized)
  const monacoOptions = React.useMemo(
    () => ({
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      fontSize: 12,
      lineNumbers: 'on' as const,
      wordWrap: 'on' as const,
      automaticLayout: true,
      padding: { top: 8 },
      scrollbar: { verticalScrollbarSize: 6, horizontalScrollbarSize: 6 },
    }),
    [],
  )

  // Maximized view
  if (isMaximized) {
    return (
      <div className="canvas-node canvas-node-maximized h-full w-full flex flex-col bg-background border border-border rounded-lg shadow-md">
        <MaximizedHeader
          icon={<Code className="h-4 w-4 text-muted-foreground" />}
          label={nodeLabel}
          onExit={handleMaximize}
        />
        <div className="flex-1 overflow-hidden">
          <React.Suspense
            fallback={
              <pre className="font-mono text-xs p-4 text-foreground">
                <code>{code}</code>
              </pre>
            }>
            <LazyMonacoEditor
              height="100%"
              language={language}
              value={code}
              onChange={(val) => handleCodeChange(val || '')}
              theme={isDark ? 'vs-dark' : 'light'}
              options={monacoOptions}
              onMount={handleEditorMount}
            />
          </React.Suspense>
        </div>
      </div>
    )
  }

  return (
    <CanvasNodeWrapper
      id={id}
      selected={selected}
      isEditing={isInteractive}
      onEditingChange={setIsInteractive}
      isMaximized={isMaximized}
      groupColor={groupColor}
      icon={<Code className="h-3.5 w-3.5 text-muted-foreground" />}
      label={nodeLabel}
      minWidth={600}
      minHeight={400}>
      <div
        className={cn(
          'flex-1 overflow-hidden',
          isMaximized || isInteractive ? 'nodrag nowheel' : 'pointer-events-none',
        )}>
        <div className="h-full flex flex-col">
          <div className="px-2 py-1 bg-muted/30 border-b border-border flex items-center justify-between">
            <select
              value={language}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="text-xs bg-transparent border-none focus:outline-none text-muted-foreground">
              <option value="javascript">JavaScript</option>
              <option value="typescript">TypeScript</option>
              <option value="python">Python</option>
              <option value="rust">Rust</option>
              <option value="go">Go</option>
              <option value="html">HTML</option>
              <option value="css">CSS</option>
              <option value="json">JSON</option>
              <option value="markdown">Markdown</option>
            </select>
            {filePath && (
              <span className={cn('text-[10px]', fileDirty ? 'text-amber-500' : 'text-muted-foreground/50')}>
                {fileDirty ? '● unsaved' : '✓ saved'}
              </span>
            )}
          </div>
          {isInteractive ? (
            <React.Suspense
              fallback={
                <pre className="font-mono text-xs p-2 text-foreground flex-1">
                  <code>{code}</code>
                </pre>
              }>
              <LazyMonacoEditor
                height="100%"
                language={language}
                value={code}
                onChange={(val) => handleCodeChange(val || '')}
                theme={isDark ? 'vs-dark' : 'light'}
                options={{ ...monacoOptions, lineNumbers: 'off' }}
                onMount={handleEditorMount}
              />
            </React.Suspense>
          ) : (
            <div className="flex-1 overflow-auto bg-muted/10">
              <React.Suspense
                fallback={
                  <pre className="font-mono text-xs p-2 text-foreground">
                    <code>{code}</code>
                  </pre>
                }>
                <LazyShikiHighlight code={code} language={language} isDark={isDark} />
              </React.Suspense>
            </div>
          )}
        </div>
      </div>
    </CanvasNodeWrapper>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Wrapped Shape Node
// ─────────────────────────────────────────────────────────────────────────────

const SHAPE_ICONS: Record<ShapeType, React.ComponentType<{ className?: string }>> = {
  rectangle: Square,
  circle: Circle,
  diamond: Diamond,
  triangle: Triangle,
  hexagon: Hexagon,
}

export function WrappedShapeNode({
  id,
  data,
  selected,
  groupColor,
}: NodeProps<ShapeNodeData> & { groupColor?: string }) {
  const shape = data?.shape || 'rectangle'
  const colorName = data?.color || 'Gray'
  const colorConfig = SHAPE_COLORS.find((c) => c.name === colorName) || SHAPE_COLORS[0]
  const label = data?.label || ''
  const isMaximized = data?.isMaximized || false
  const ShapeIcon = SHAPE_ICONS[shape] || Square

  const renderShape = () => {
    const commonProps = {
      fill: colorConfig.fill,
      stroke: colorConfig.stroke,
      strokeWidth: 2,
    }

    switch (shape) {
      case 'circle':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
            <ellipse cx="50" cy="50" rx="48" ry="48" {...commonProps} />
          </svg>
        )
      case 'diamond':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
            <polygon points="50,2 98,50 50,98 2,50" {...commonProps} />
          </svg>
        )
      case 'triangle':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
            <polygon points="50,5 95,95 5,95" {...commonProps} />
          </svg>
        )
      case 'hexagon':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
            <polygon points="25,5 75,5 98,50 75,95 25,95 2,50" {...commonProps} />
          </svg>
        )
      default:
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
            <rect x="2" y="2" width="96" height="96" rx="4" {...commonProps} />
          </svg>
        )
    }
  }

  return (
    <CanvasNodeWrapper
      id={id}
      selected={selected}
      isMaximized={isMaximized}
      groupColor={groupColor}
      icon={
        <span style={{ color: colorConfig.stroke }}>
          <ShapeIcon className="h-3.5 w-3.5" />
        </span>
      }
      label={label}
      minWidth={150}
      minHeight={150}
      resizable={false}
      autoSize
      borderClass="border-2"
      bgClass={colorConfig.fill}>
      <div className="absolute inset-0">{renderShape()}</div>
      {label && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-xs font-medium text-foreground text-center px-2">{label}</span>
        </div>
      )}
    </CanvasNodeWrapper>
  )
}
