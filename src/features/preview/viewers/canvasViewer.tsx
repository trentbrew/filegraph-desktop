import * as React from 'react'
import { toast } from 'sonner'
import { invoke } from '@tauri-apps/api/core'
import { useFileStore } from '@/stores'
import { getEffectiveExtension } from '@/lib/utils/fileExtensions'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  Handle,
  Position,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type ReactFlowInstance,
  type Viewport,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { NodeResizer } from '@reactflow/node-resizer'
import '@reactflow/node-resizer/dist/style.css'
import {
  AlertCircle,
  Loader2,
  RefreshCw,
  Braces,
  ChevronDown,
  GripHorizontal,
  Save,
  Undo2,
  Redo2,
  X,
  Maximize,
  Minimize,
  FileText,
  Plus,
  FileCode2,
  Code2,
  CheckSquare,
  StickyNote,
  Type,
  Image,
  Globe,
  Shapes,
  Table,
  Square,
  Circle,
  Diamond,
  Triangle,
  Hexagon,
  Palette,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import { PreviewPlaceholder } from '../components/PreviewStates'
import { CodeViewer } from './codeViewer'
import { ImageViewer } from './imageViewer'
import { MediaViewer } from './mediaViewer'
import { FontViewer } from './fontViewer'
import { TextViewer } from './textViewer'
import { TableViewer } from './tableViewer'
import './canvasViewer.css'
import { CursorZone, CursorTrigger, CursorProvider, useCursor } from '@/components/Cursor'
import { useVault } from '@/contexts/VaultContext'
import { useTabStore } from '@/stores/useTabStore'
import {
  RichTextNode,
  StickyNoteNode,
  STICKY_COLORS,
  ImageNode,
  EmbedNode,
  ShapeNode,
  SHAPE_COLORS,
  TableNode,
} from './canvasViewer/nodes'
import type { MentionItem } from './noteViewer/suggestion'

// Lazy load heavy viewers
const PdfViewer = React.lazy(() => import('./pdfViewer').then((m) => ({ default: m.PdfViewer })))
const DocxViewer = React.lazy(() => import('./docxViewer').then((m) => ({ default: m.DocxViewer })))
const MarkdownEditor = React.lazy(() => import('./markdownEditor').then((m) => ({ default: m.MarkdownEditor })))

interface CanvasViewerProps {
  filePath: string
  fileName?: string
  onOpenBackgroundSettings?: () => void
}

interface TextFileContent {
  content: string
  truncated: boolean
  encoding: string
  size: number
}

interface CanvasData {
  nodes: CanvasNode[]
  edges: CanvasEdge[]
  viewport?: Viewport
}

type CanvasNode = Node<Record<string, unknown>>
type CanvasEdge = Edge<Record<string, unknown>>

const DEFAULT_VIEWPORT: Viewport = { x: 0, y: 0, zoom: 1 }

// History state for undo/redo
interface HistoryState {
  nodes: CanvasNode[]
  edges: CanvasEdge[]
  viewport: Viewport
}

const MAX_HISTORY_LENGTH = 50

// Custom styled handle component
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

// File preview node component - embeds viewer components
function FilePreviewNode({ id, data, selected }: { id: string; data: any; selected: boolean }) {
  const label = data?.fileName || data?.label || 'File'
  const isMaximized = data?.isMaximized || false
  const filePath = data?.filePath
  const fileName = data?.fileName
  const fileType = data?.fileType
  const extension = data?.extension
  const [viewerError, setViewerError] = React.useState<string | null>(null)

  // Error boundary fallback
  const ErrorFallback = ({ error }: { error: string }) => (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center">
      <AlertCircle className="h-12 w-12 text-destructive mb-3" />
      <p className="font-semibold text-foreground mb-1">Failed to load file</p>
      <p className="text-sm text-muted-foreground mb-4">{error}</p>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => {
          setViewerError(null)
          window.dispatchEvent(new CustomEvent('canvas-node-close', { detail: { id } }))
        }}>
        Remove Node
      </Button>
    </div>
  )

  // Render appropriate viewer based on file type
  const renderViewer = () => {
    if (!filePath || !fileType) {
      return <div className="p-3 text-sm text-muted-foreground">No file loaded</div>
    }

    if (viewerError) {
      return <ErrorFallback error={viewerError} />
    }

    // Validate file path
    if (!filePath || filePath.trim() === '') {
      return <ErrorFallback error="Invalid file path" />
    }

    const viewerProps = { filePath, fileName }

    switch (fileType) {
      case 'image':
        return <ImageViewer {...viewerProps} />
      case 'video':
        return <MediaViewer {...viewerProps} mediaType="video" />
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
        return <TableViewer {...viewerProps} fileType={extension} />
      case 'code':
        return <CodeViewer {...viewerProps} extension={extension} />
      case 'text':
        return <TextViewer {...viewerProps} />
      default:
        return <div className="p-3 text-sm text-muted-foreground">Unsupported file type: {fileType}</div>
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
        canvas-node group relative cursor-none
        bg-card border rounded-lg shadow-md
        min-w-[400px] min-h-[300px] h-full w-full
        ${selected ? 'border-primary ring-0 ring-primary/20' : 'border-border'}
        ${isMaximized ? 'canvas-node-maximized' : ''}
      `}
      data-maximized={isMaximized}>
      {!isMaximized && (
        <NodeResizer
          color="var(--primary)"
          isVisible={selected}
          minWidth={400}
          minHeight={300}
          handleClassName="w-2! h-2! bg-primary! border-0! rounded-sm!"
        />
      )}

      <div
        className={`
          flex items-center justify-between gap-2 px-2 py-1.5 border-b border-border/50 bg-muted/30
          ${isMaximized ? 'rounded-none' : 'rounded-t-lg'}
        `}>
        <span className="text-xs font-medium text-foreground truncate flex-1">{label}</span>

        {/* Keyboard shortcuts hint when maximized */}
        {isMaximized && (
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground/60 mr-2">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-muted/50 rounded font-mono">Esc</kbd> Exit
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-muted/50 rounded font-mono">←/→</kbd> Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-muted/50 rounded font-mono">⌘W</kbd> Close
            </span>
          </div>
        )}

        <div
          className={`
            flex items-center gap-0.5 transition-opacity
            ${isMaximized ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
          `}>
          <button
            type="button"
            onClick={handleMaximize}
            className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            title={isMaximized ? 'Exit fullscreen (Esc)' : 'Maximize'}>
            {isMaximized ? <Minimize className="h-3 w-3" /> : <Maximize className="h-3 w-3" />}
          </button>
          {!isMaximized && (
            <button
              type="button"
              onClick={handleClose}
              className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
              title="Remove node">
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto h-full">{renderViewer()}</div>

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

// Simple text node component
function CanvasNodeComponent({ id, data, selected }: { id: string; data: any; selected: boolean }) {
  const label = data?.label || 'Node'
  const isMaximized = data?.isMaximized || false

  const handleClose = React.useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      // Dispatch a custom event to remove this node
      window.dispatchEvent(new CustomEvent('canvas-node-close', { detail: { id } }))
    },
    [id],
  )

  const handleMaximize = React.useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      // Dispatch a custom event to maximize/minimize this node
      window.dispatchEvent(new CustomEvent('canvas-node-maximize', { detail: { id } }))
    },
    [id],
  )

  return (
    <div
      className={`
        canvas-node group relative
        bg-card border rounded-lg shadow-md
        min-w-[120px] min-h-[80px] h-full w-full
        ${selected ? 'border-primary ring-2 ring-primary/20' : 'border-border'}
        ${isMaximized ? 'canvas-node-maximized' : ''}
      `}
      data-maximized={isMaximized}>
      {/* Node Resizer - hidden when maximized */}
      {!isMaximized && (
        <NodeResizer
          color="var(--primary)"
          isVisible={selected}
          minWidth={120}
          minHeight={80}
          handleClassName="w-2! h-2! bg-primary! border-0! rounded-sm!"
        />
      )}

      {/* Toolbar */}
      <div
        className={`
          flex items-center justify-between gap-2 px-2 py-1.5 border-b border-border/50 bg-muted/30
          ${isMaximized ? 'rounded-none' : 'rounded-t-lg'}
        `}>
        <span className="text-xs font-medium text-foreground truncate flex-1">{label}</span>
        <div
          className={`
            flex items-center gap-0.5 transition-opacity
            ${isMaximized ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
          `}>
          <button
            type="button"
            onClick={handleMaximize}
            className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            title={isMaximized ? 'Exit fullscreen (Esc)' : 'Maximize'}>
            {isMaximized ? <Minimize className="h-3 w-3" /> : <Maximize className="h-3 w-3" />}
          </button>
          {!isMaximized && (
            <button
              type="button"
              onClick={handleClose}
              className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
              title="Remove node">
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Content area */}
      <div className="p-3 text-sm text-muted-foreground flex-1 overflow-auto">{data?.content || ''}</div>

      {/* Handles - hidden when maximized */}
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

// Legacy alias so existing serialized nodes referencing "resizable" still resolve
const ResizableNode = CanvasNodeComponent

const nodeTypes = {
  resizable: ResizableNode,
  default: CanvasNodeComponent,
  filePreview: FilePreviewNode,
  richText: RichTextNode,
  stickyNote: StickyNoteNode,
  image: ImageNode,
  embed: EmbedNode,
  shape: ShapeNode,
  table: TableNode,
}

// Helper to determine file type from extension
function getFileTypeFromExtension(extension: string): string {
  const ext = extension.toLowerCase()

  // Images
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext)) return 'image'

  // Videos
  if (['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv'].includes(ext)) return 'video'

  // Audio
  if (['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a'].includes(ext)) return 'audio'

  // PDFs
  if (ext === 'pdf') return 'pdf'

  // DOCX
  if (ext === 'docx') return 'docx'

  // Markdown
  if (ext === 'md') return 'markdown'

  // Fonts
  if (['ttf', 'otf', 'woff', 'woff2', 'ttc', 'otc', 'font'].includes(ext)) return 'font'

  // Tables
  if (['csv', 'tsv', 'xlsx', 'xls'].includes(ext)) return 'table'

  // Code
  if (
    [
      'js',
      'ts',
      'tsx',
      'jsx',
      'html',
      'css',
      'scss',
      'sass',
      'py',
      'java',
      'cpp',
      'c',
      'h',
      'cs',
      'go',
      'rs',
      'php',
      'rb',
      'swift',
      'json',
      'xml',
      'yml',
      'yaml',
      'toml',
      'sh',
      'bash',
      'zsh',
      'sql',
    ].includes(ext)
  )
    return 'code'

  // Default to text
  return 'text'
}

export function CanvasViewer(props: CanvasViewerProps) {
  return (
    <CursorProvider>
      <ReactFlowProvider>
        <CanvasViewerInner {...props} />
      </ReactFlowProvider>
    </CursorProvider>
  )
}

function CanvasViewerInner({ filePath, fileName, onOpenBackgroundSettings }: CanvasViewerProps) {
  const [nodes, setNodes] = React.useState<CanvasNode[]>([])
  const [edges, setEdges] = React.useState<CanvasEdge[]>([])
  const [viewport, setViewport] = React.useState<Viewport>(DEFAULT_VIEWPORT)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [reloadKey, setReloadKey] = React.useState(0)
  const [showSource, setShowSource] = React.useState(() => {
    const stored = localStorage.getItem('canvasViewer.showSource')
    return stored === 'true'
  })
  const [sourceValue, setSourceValue] = React.useState('')
  const [sourceError, setSourceError] = React.useState<string | null>(null)
  const [selectedNodeIds, setSelectedNodeIds] = React.useState<string[]>([])
  const [selectedEdgeIds, setSelectedEdgeIds] = React.useState<string[]>([])
  const [maximizedNodeId, setMaximizedNodeId] = React.useState<string | null>(null)
  const [targetCursorLine, setTargetCursorLine] = React.useState<number | null>(null)
  const [sourcePanelHeight, setSourcePanelHeight] = React.useState(() => {
    const stored = localStorage.getItem('canvasViewer.sourcePanelHeight')
    return stored ? parseInt(stored, 10) : 300
  })
  const [isResizing, setIsResizing] = React.useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  const { setVariant, setMessage, reset, setPressed } = useCursor()

  // Entity state for mentions/wikilinks
  const [entities, setEntities] = React.useState<MentionItem[]>([])
  const { vaultPath } = useVault()
  const openEditorPinned = useTabStore((s) => s.openEditorPinned)
  const entitiesRef = React.useRef<MentionItem[]>([])

  // Keep entities ref updated
  React.useEffect(() => {
    entitiesRef.current = entities
  }, [entities])

  // History for undo/redo
  const [past, setPast] = React.useState<HistoryState[]>([])
  const [future, setFuture] = React.useState<HistoryState[]>([])
  const skipHistoryRef = React.useRef(false)

  const instanceRef = React.useRef<ReactFlowInstance | null>(null)
  const suppressSourceSyncRef = React.useRef(false)
  const suppressSelectionSyncRef = React.useRef(false)
  const nodesRef = React.useRef(nodes)
  const edgesRef = React.useRef(edges)
  const [isDraggingOver, setIsDraggingOver] = React.useState(false)
  const [contextMenuPosition, setContextMenuPosition] = React.useState<{ x: number; y: number } | null>(null)
  const containerRef = React.useRef<HTMLDivElement | null>(null)
  const preMaximizeViewportRef = React.useRef<Viewport | null>(null)

  const canUndo = past.length > 0
  const canRedo = future.length > 0

  React.useEffect(() => {
    nodesRef.current = nodes
  }, [nodes])

  React.useEffect(() => {
    edgesRef.current = edges
  }, [edges])

  const getStarterCanvas = React.useCallback((): CanvasData => {
    const title = fileName || 'New canvas'
    return {
      nodes: [
        {
          id: 'welcome',
          type: 'resizable',
          position: { x: 120, y: 120 },
          data: {
            label: title,
            content:
              'This canvas is empty. Add nodes from the right-click menu, drop files here, or start typing in the JSON panel below.',
          },
          style: { width: 440, height: 220 },
        },
      ],
      edges: [],
      viewport: DEFAULT_VIEWPORT,
    }
  }, [fileName])

  const serializeCanvasData = React.useCallback(
    (nextNodes: CanvasNode[], nextEdges: CanvasEdge[], nextViewport: Viewport) =>
      JSON.stringify(
        {
          nodes: nextNodes,
          edges: nextEdges,
          viewport: nextViewport,
        },
        null,
        2,
      ),
    [],
  )

  const applyCanvasData = React.useCallback(
    async (data: CanvasData, options: { persist?: boolean } = {}) => {
      const nextViewport = data.viewport ?? DEFAULT_VIEWPORT
      setNodes(data.nodes)
      setEdges(data.edges)
      setViewport(nextViewport)

      const serialized = serializeCanvasData(data.nodes, data.edges, nextViewport)
      setSourceValue(serialized)
      setSourceError(null)
      setHasUnsavedChanges(false)

      if (options.persist) {
        try {
          await invoke('write_text_file', {
            filePath,
            content: serialized,
          })
        } catch (err) {
          console.error('[CanvasViewer] Failed to seed canvas file:', err)
        }
      }
    },
    [filePath, serializeCanvasData],
  )

  // Debounced sync to avoid excessive updates during dragging
  const syncTimeoutRef = React.useRef<number | null>(null)
  const pendingSyncRef = React.useRef<{ nodes: CanvasNode[]; edges: CanvasEdge[]; viewport: Viewport } | null>(null)
  const hoverCleanupRef = React.useRef<(() => void) | null>(null)

  const syncSourceFromDiagram = React.useCallback(
    (nextNodes: CanvasNode[], nextEdges: CanvasEdge[], nextViewport: Viewport) => {
      // Store pending sync data
      pendingSyncRef.current = { nodes: nextNodes, edges: nextEdges, viewport: nextViewport }

      // Clear existing timeout
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current)
      }

      // Debounce: only sync after 50ms of no changes
      syncTimeoutRef.current = window.setTimeout(() => {
        const pending = pendingSyncRef.current
        if (!pending) return

        console.log('[CanvasViewer] syncSourceFromDiagram (debounced)', {
          nodeCount: pending.nodes.length,
          edgeCount: pending.edges.length,
        })

        suppressSourceSyncRef.current = true
        const serialized = serializeCanvasData(pending.nodes, pending.edges, pending.viewport)
        setSourceValue(serialized)
        setSourceError(null)
        pendingSyncRef.current = null

        requestAnimationFrame(() => {
          suppressSourceSyncRef.current = false
        })
      }, 50)
    },
    [serializeCanvasData],
  )

  // Cursor hinting across canvas interactions
  React.useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handlePointerMove = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null
      if (!target) return

      // Resize handles
      if (target.closest('.react-flow__resize-control')) {
        setVariant('se-resize')
        setMessage('Resize')
        return
      }

      // Connection handles
      if (target.closest('.react-flow__handle')) {
        setVariant('crosshair')
        setMessage('Connect')
        return
      }

      // Nodes (draggable)
      if (target.closest('.react-flow__node')) {
        setVariant(event.buttons ? 'grabbing' : 'grab')
        setMessage('Drag node')
        return
      }

      // Default pane
      setVariant(event.buttons ? 'grabbing' : 'grab')
      setMessage('Drag to pan • Scroll to zoom')
    }

    const handlePointerDown = () => setPressed(true)
    const handlePointerUp = () => setPressed(false)
    const handlePointerLeave = () => {
      setPressed(false)
      reset()
    }

    container.addEventListener('pointermove', handlePointerMove, { passive: true })
    container.addEventListener('pointerdown', handlePointerDown)
    container.addEventListener('pointerup', handlePointerUp)
    container.addEventListener('pointerleave', handlePointerLeave)

    hoverCleanupRef.current = () => {
      container.removeEventListener('pointermove', handlePointerMove)
      container.removeEventListener('pointerdown', handlePointerDown)
      container.removeEventListener('pointerup', handlePointerUp)
      container.removeEventListener('pointerleave', handlePointerLeave)
    }

    return () => hoverCleanupRef.current?.()
  }, [reset, setMessage, setPressed, setVariant])

  React.useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError(null)

      try {
        const file = await invoke<TextFileContent>('read_text_file', {
          filePath,
          maxBytes: 5 * 1024 * 1024, // 5MB safety limit
        })

        if (cancelled) return

        if (file?.truncated) {
          throw new Error('Canvas file is too large to preview (over 5MB).')
        }

        // Seed empty files with starter content
        if (!file?.content || !file.content.trim()) {
          await applyCanvasData(getStarterCanvas(), { persist: true })
          return
        }

        const parsed = parseCanvasContent(file.content)

        // If parsing yields no content, seed with starter template
        if (!parsed.nodes.length && !parsed.edges.length) {
          await applyCanvasData(getStarterCanvas(), { persist: true })
          return
        }

        await applyCanvasData(parsed)
      } catch (err) {
        if (cancelled) return
        console.error('[CanvasViewer] Failed to load canvas, seeding starter content:', err)
        await applyCanvasData(getStarterCanvas(), { persist: true })
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [filePath, reloadKey])

  // Load entities for mention autocomplete in rich text nodes
  React.useEffect(() => {
    const loadEntities = async () => {
      try {
        if (!vaultPath) return

        const allEntities: MentionItem[] = []

        const extractEntities = (obj: any) => {
          if (obj?.['@graph']) {
            for (const node of obj['@graph']) {
              if (node['@id'] || node.id) {
                const id = node['@id'] || node.id
                const namespace = id.split(':')[0]
                allEntities.push({
                  id,
                  label: node.name || node.title || id,
                  namespace,
                })
              }
            }
          }
          for (const [key, value] of Object.entries(obj)) {
            if (Array.isArray(value) && !key.startsWith('@')) {
              for (const item of value) {
                if (item?.id || item?.['@id']) {
                  const id = item.id || item['@id']
                  const namespace = id.split(':')[0]
                  allEntities.push({
                    id,
                    label: item.name || item.title || id,
                    namespace,
                  })
                }
              }
            }
          }
        }

        const scanDirectory = async (dirPath: string) => {
          try {
            const files = await invoke<any[]>('list_directory', { path: dirPath })
            for (const file of files) {
              if (file.file_type === 'folder') {
                await scanDirectory(file.path)
              } else if (file.extension === 'data') {
                try {
                  const response = await invoke<{ content: string }>('read_text_file', { filePath: file.path })
                  const parsed = JSON.parse(response.content)
                  extractEntities(parsed)
                } catch (e) {
                  // Ignore parse errors
                }
              }
            }
          } catch (e) {
            // Ignore scan errors
          }
        }

        await scanDirectory(vaultPath)

        const uniqueEntities = Array.from(new Map(allEntities.map((e) => [e.id, e])).values())
        console.log(`[CanvasViewer] Loaded ${uniqueEntities.length} entities for mentions`)
        setEntities(uniqueEntities)
      } catch (err) {
        console.error('[CanvasViewer] Failed to load entities:', err)
      }
    }

    loadEntities()
  }, [vaultPath])

  React.useEffect(() => {
    if (!instanceRef.current) return
    instanceRef.current.setViewport(viewport, { duration: 0 })
  }, [viewport])

  const handleReload = React.useCallback(() => {
    setReloadKey((key) => key + 1)
  }, [])

  const handleFitView = React.useCallback(() => {
    if (!instanceRef.current) return
    instanceRef.current.fitView({ padding: 0.2, duration: 400 })
    const nextViewport = instanceRef.current.getViewport()
    setViewport(nextViewport)
    syncSourceFromDiagram(nodesRef.current, edgesRef.current, nextViewport)
  }, [])

  const handleInit = React.useCallback((instance: ReactFlowInstance) => {
    console.log('CanvasViewerInner: handleInit')
    instanceRef.current = instance
    // Always fit view on initial load to center content
    setTimeout(() => {
      instance.fitView({ padding: 0.2, duration: 300 })
    }, 50)
  }, [])

  // Push current state to history (for undo/redo)
  const pushToHistory = React.useCallback(() => {
    if (skipHistoryRef.current) {
      skipHistoryRef.current = false
      return
    }
    setPast((prev) => {
      const newState: HistoryState = {
        nodes: nodesRef.current,
        edges: edgesRef.current,
        viewport,
      }
      const newPast = [...prev, newState]
      // Limit history length
      if (newPast.length > MAX_HISTORY_LENGTH) {
        return newPast.slice(-MAX_HISTORY_LENGTH)
      }
      return newPast
    })
    setFuture([]) // Clear redo stack on new action
    setHasUnsavedChanges(true)
  }, [viewport])

  // Debounced history push to avoid too many entries during dragging
  const historyTimeoutRef = React.useRef<number | null>(null)
  const debouncedPushToHistory = React.useCallback(() => {
    if (historyTimeoutRef.current) {
      clearTimeout(historyTimeoutRef.current)
    }
    historyTimeoutRef.current = window.setTimeout(() => {
      pushToHistory()
    }, 300)
  }, [pushToHistory])

  const handleNodesChange = React.useCallback(
    (changes: NodeChange[]) => {
      // Check if this is a significant change that should be recorded in history
      const hasPositionChange = changes.some((c) => c.type === 'position' && (c as any).dragging === false)
      const hasAddRemove = changes.some((c) => c.type === 'add' || c.type === 'remove')
      const hasDimensionChange = changes.some((c) => c.type === 'dimensions')

      if (hasPositionChange || hasAddRemove || hasDimensionChange) {
        debouncedPushToHistory()
      }

      setNodes((current) => {
        const next = applyNodeChanges(changes, current)
        syncSourceFromDiagram(next, edgesRef.current, viewport)
        return next
      })

      // Track selection changes
      const selectionChanges = changes.filter((c) => c.type === 'select')
      if (selectionChanges.length > 0 && !suppressSelectionSyncRef.current) {
        const selected = nodes
          .filter((n) => {
            const change = selectionChanges.find((c) => (c as any).id === n.id)
            return change ? (change as any).selected : n.selected
          })
          .map((n) => n.id)
        setSelectedNodeIds(selected)

        // Calculate line number for first selected node
        if (selected.length > 0) {
          const lineNum = calculateNodeLineNumber(selected[0], sourceValue)
          setTargetCursorLine(lineNum)
        }
      }
    },
    [syncSourceFromDiagram, viewport, nodes, sourceValue, debouncedPushToHistory],
  )

  const handleEdgesChange = React.useCallback(
    (changes: EdgeChange[]) => {
      // Check if this is a significant change that should be recorded in history
      const hasAddRemove = changes.some((c) => c.type === 'add' || c.type === 'remove')

      if (hasAddRemove) {
        debouncedPushToHistory()
      }

      setEdges((current) => {
        const next = applyEdgeChanges(changes, current)
        syncSourceFromDiagram(nodesRef.current, next, viewport)
        return next
      })

      // Track selection changes
      const selectionChanges = changes.filter((c) => c.type === 'select')
      if (selectionChanges.length > 0 && !suppressSelectionSyncRef.current) {
        const selected = edges
          .filter((e) => {
            const change = selectionChanges.find((c) => (c as any).id === e.id)
            return change ? (change as any).selected : e.selected
          })
          .map((e) => e.id)
        setSelectedEdgeIds(selected)

        // Calculate line number for first selected edge
        if (selected.length > 0) {
          const lineNum = calculateEdgeLineNumber(selected[0], sourceValue)
          setTargetCursorLine(lineNum)
        }
      }
    },
    [syncSourceFromDiagram, viewport, edges, sourceValue, debouncedPushToHistory],
  )

  const handleConnect = React.useCallback(
    (connection: Connection) => {
      pushToHistory() // Record state before adding edge
      setEdges((eds) => {
        const next = addEdge({ ...connection, animated: true }, eds)
        syncSourceFromDiagram(nodesRef.current, next, viewport)
        return next
      })
    },
    [syncSourceFromDiagram, viewport, pushToHistory],
  )

  const handleToggleSource = React.useCallback(() => {
    setShowSource((prev) => {
      const next = !prev
      localStorage.setItem('canvasViewer.showSource', String(next))
      return next
    })
  }, [])

  // Cleanup sync timeout on unmount
  React.useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current)
      }
    }
  }, [])

  // Undo action
  const handleUndo = React.useCallback(() => {
    if (past.length === 0) return

    const previous = past[past.length - 1]
    const newPast = past.slice(0, -1)

    // Save current state to future
    setFuture((prev) => [...prev, { nodes: nodesRef.current, edges: edgesRef.current, viewport }])

    // Restore previous state
    skipHistoryRef.current = true
    suppressSourceSyncRef.current = true
    setNodes(previous.nodes)
    setEdges(previous.edges)
    setViewport(previous.viewport)
    setPast(newPast)

    // Update source view
    const serialized = serializeCanvasData(previous.nodes, previous.edges, previous.viewport)
    setSourceValue(serialized)

    requestAnimationFrame(() => {
      suppressSourceSyncRef.current = false
    })
  }, [past, viewport, serializeCanvasData])

  // Redo action
  const handleRedo = React.useCallback(() => {
    if (future.length === 0) return

    const next = future[future.length - 1]
    const newFuture = future.slice(0, -1)

    // Save current state to past
    setPast((prev) => [...prev, { nodes: nodesRef.current, edges: edgesRef.current, viewport }])

    // Restore next state
    skipHistoryRef.current = true
    suppressSourceSyncRef.current = true
    setNodes(next.nodes)
    setEdges(next.edges)
    setViewport(next.viewport)
    setFuture(newFuture)

    // Update source view
    const serialized = serializeCanvasData(next.nodes, next.edges, next.viewport)
    setSourceValue(serialized)

    requestAnimationFrame(() => {
      suppressSourceSyncRef.current = false
    })
  }, [future, viewport, serializeCanvasData])

  // Save to file
  const handleSave = React.useCallback(async () => {
    if (isSaving) return

    setIsSaving(true)
    try {
      const content = serializeCanvasData(nodesRef.current, edgesRef.current, viewport)
      await invoke('write_text_file', {
        filePath,
        content,
      })
      setHasUnsavedChanges(false)
      console.log('[CanvasViewer] Saved to file:', filePath)
    } catch (err) {
      console.error('[CanvasViewer] Failed to save:', err)
      setSourceError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setIsSaving(false)
    }
  }, [filePath, viewport, serializeCanvasData, isSaving])

  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey

      // Cmd+S / Ctrl+S - Save
      if (isMod && e.key === 's') {
        e.preventDefault()
        handleSave()
        return
      }

      // Cmd+Z / Ctrl+Z - Undo
      if (isMod && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        handleUndo()
        return
      }

      // Cmd+Shift+Z / Ctrl+Shift+Z or Cmd+Y / Ctrl+Y - Redo
      if ((isMod && e.key === 'z' && e.shiftKey) || (isMod && e.key === 'y')) {
        e.preventDefault()
        handleRedo()
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleSave, handleUndo, handleRedo])

  // Cleanup history timeout on unmount
  React.useEffect(() => {
    return () => {
      if (historyTimeoutRef.current) {
        clearTimeout(historyTimeoutRef.current)
      }
    }
  }, [])

  // Auto-save: debounced save to file when changes occur
  const autoSaveTimeoutRef = React.useRef<number | null>(null)
  React.useEffect(() => {
    // Only auto-save if there are unsaved changes
    if (!hasUnsavedChanges || isSaving) return

    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current)
    }

    // Auto-save after 1 second of no changes
    autoSaveTimeoutRef.current = window.setTimeout(async () => {
      console.log('[CanvasViewer] Auto-saving...')
      try {
        const content = serializeCanvasData(nodesRef.current, edgesRef.current, viewport)
        await invoke('write_text_file', {
          filePath,
          content,
        })
        setHasUnsavedChanges(false)
        console.log('[CanvasViewer] Auto-saved successfully')
      } catch (err) {
        console.error('[CanvasViewer] Auto-save failed:', err)
      }
    }, 1000)

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
    }
  }, [hasUnsavedChanges, isSaving, filePath, viewport, serializeCanvasData])

  // Handle node close events
  React.useEffect(() => {
    const handleNodeClose = (event: Event) => {
      const customEvent = event as CustomEvent<{ id?: string }>
      const nodeId = customEvent.detail?.id
      if (!nodeId) return

      pushToHistory() // Save state before removing

      const nextNodes = nodesRef.current.filter((node) => node.id !== nodeId)
      const nextEdges = edgesRef.current.filter((edge) => edge.source !== nodeId && edge.target !== nodeId)

      setNodes(nextNodes)
      setEdges(nextEdges)
      syncSourceFromDiagram(nextNodes, nextEdges, viewport)
    }

    window.addEventListener('canvas-node-close', handleNodeClose)
    return () => window.removeEventListener('canvas-node-close', handleNodeClose)
  }, [pushToHistory, syncSourceFromDiagram, viewport])

  // Store original node dimensions before maximizing
  const preMaximizeNodeStyleRef = React.useRef<{ width?: number; height?: number } | null>(null)

  // Maximize node to fill viewport seamlessly
  const maximizeNode = React.useCallback((nodeId: string) => {
    if (!instanceRef.current || !containerRef.current) return

    const node = nodesRef.current.find((n) => n.id === nodeId)
    if (!node) return

    // Store current viewport to restore later
    preMaximizeViewportRef.current = instanceRef.current.getViewport()

    // Store original node dimensions
    const measured = (node as any).measured as { width?: number; height?: number } | undefined
    preMaximizeNodeStyleRef.current = {
      width: (node.style?.width as number) || measured?.width,
      height: (node.style?.height as number) || measured?.height,
    }

    // Get container dimensions
    const containerRect = containerRef.current.getBoundingClientRect()
    const containerWidth = containerRect.width
    const containerHeight = containerRect.height

    // RESIZE the node to exactly match container dimensions at zoom=1
    // This ensures content renders at full size, not scaled down
    const newViewport: Viewport = {
      x: -node.position.x,
      y: -node.position.y,
      zoom: 1,
    }

    // Update node with new dimensions and maximized state
    setNodes((currentNodes) =>
      currentNodes.map((n) => ({
        ...n,
        selected: n.id === nodeId,
        data: {
          ...n.data,
          isMaximized: n.id === nodeId,
        },
        // Resize the maximized node to fill container
        style:
          n.id === nodeId
            ? {
                ...n.style,
                width: containerWidth,
                height: containerHeight,
              }
            : n.style,
      })),
    )
    setMaximizedNodeId(nodeId)

    // Animate to the new viewport
    instanceRef.current.setViewport(newViewport, { duration: 300 })
    setViewport(newViewport)
  }, [])

  // Exit maximized mode
  const exitMaximizedMode = React.useCallback(() => {
    if (!maximizedNodeId || !instanceRef.current) return

    // Restore original node dimensions and clear isMaximized data
    setNodes((currentNodes) =>
      currentNodes.map((n) => ({
        ...n,
        data: {
          ...n.data,
          isMaximized: false,
        },
        // Restore original dimensions for the previously maximized node
        style:
          n.id === maximizedNodeId && preMaximizeNodeStyleRef.current
            ? {
                ...n.style,
                width: preMaximizeNodeStyleRef.current.width,
                height: preMaximizeNodeStyleRef.current.height,
              }
            : n.style,
      })),
    )

    // Clear stored dimensions
    preMaximizeNodeStyleRef.current = null

    // Restore previous viewport
    if (preMaximizeViewportRef.current) {
      instanceRef.current.setViewport(preMaximizeViewportRef.current, { duration: 300 })
      setViewport(preMaximizeViewportRef.current)
      preMaximizeViewportRef.current = null
    }

    setMaximizedNodeId(null)
  }, [maximizedNodeId])

  // Handle node maximize events from custom event
  React.useEffect(() => {
    const handleNodeMaximize = (event: Event) => {
      const customEvent = event as CustomEvent<{ id?: string }>
      const nodeId = customEvent.detail?.id
      if (!nodeId) return

      // Toggle: if already maximized, exit; otherwise maximize
      if (maximizedNodeId === nodeId) {
        exitMaximizedMode()
      } else {
        maximizeNode(nodeId)
      }
    }

    window.addEventListener('canvas-node-maximize', handleNodeMaximize)
    return () => window.removeEventListener('canvas-node-maximize', handleNodeMaximize)
  }, [maximizedNodeId, maximizeNode, exitMaximizedMode])

  // Handle keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape: Exit maximized mode
      if (e.key === 'Escape' && maximizedNodeId) {
        e.preventDefault()
        exitMaximizedMode()
        return
      }

      // Cmd/Ctrl + W: Close maximized node
      if ((e.metaKey || e.ctrlKey) && e.key === 'w' && maximizedNodeId) {
        e.preventDefault()
        window.dispatchEvent(new CustomEvent('canvas-node-close', { detail: { id: maximizedNodeId } }))
        return
      }

      // Arrow keys: Navigate between nodes when maximized
      if (maximizedNodeId && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        e.preventDefault()
        const currentIndex = nodesRef.current.findIndex((n) => n.id === maximizedNodeId)
        if (currentIndex === -1) return

        let nextIndex = currentIndex
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          nextIndex = (currentIndex + 1) % nodesRef.current.length
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          nextIndex = (currentIndex - 1 + nodesRef.current.length) % nodesRef.current.length
        }

        const nextNode = nodesRef.current[nextIndex]
        if (nextNode) {
          exitMaximizedMode()
          requestAnimationFrame(() => {
            maximizeNode(nextNode.id)
          })
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [maximizedNodeId, exitMaximizedMode, maximizeNode])

  // Handle double-click on node to maximize
  const handleNodeDoubleClick = React.useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (maximizedNodeId === node.id) {
        exitMaximizedMode()
      } else {
        maximizeNode(node.id)
      }
    },
    [maximizedNodeId, maximizeNode, exitMaximizedMode],
  )

  // Handle mention clicks in rich text nodes - navigate to entity
  const handleMentionClick = React.useCallback(
    (entityId: string) => {
      if (!vaultPath) return

      const [namespace, slug] = entityId.split(':')

      // Special handling for note: namespace
      if (namespace === 'note' && slug) {
        const noteFileName = `${slug}.note`
        invoke<any[]>('list_directory', { path: vaultPath }).then((files) => {
          const findNote = (items: any[]): any => {
            for (const item of items) {
              if (item.name === noteFileName) return item
              if (item.file_type === 'folder' && item.children) {
                const found = findNote(item.children)
                if (found) return found
              }
            }
            return null
          }
          const noteFile = findNote(files)
          if (noteFile) {
            openEditorPinned(noteFile)
          }
        })
        return
      }

      // For other entities, try to find their source .data file
      console.log(`[CanvasViewer] Mention clicked: ${entityId}`)
    },
    [vaultPath, openEditorPinned],
  )

  // Store position for context menu triggered node creation
  const handleContextMenu = React.useCallback((event: React.MouseEvent) => {
    if (!instanceRef.current || !containerRef.current) return

    const bounds = containerRef.current.getBoundingClientRect()
    const flowPosition = instanceRef.current.screenToFlowPosition({
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    })

    setContextMenuPosition(flowPosition)
  }, [])

  // Create node functions
  const createNode = React.useCallback(
    (type: string, label: string, additionalData: any = {}, style: any = {}) => {
      if (!contextMenuPosition) return

      pushToHistory()

      // Determine default size based on type
      let defaultWidth = 300
      let defaultHeight = 200
      if (type === 'filePreview') {
        defaultWidth = 600
        defaultHeight = 400
      } else if (type === 'richText') {
        defaultWidth = 350
        defaultHeight = 200
      } else if (type === 'stickyNote') {
        defaultWidth = 200
        defaultHeight = 150
      }

      const newNode: CanvasNode = {
        id: `node-${Date.now()}`,
        type,
        position: contextMenuPosition,
        data: {
          label,
          // Pass entities and handlers for rich text nodes
          entities: entitiesRef.current,
          onMentionClick: handleMentionClick,
          ...additionalData,
        },
        style: {
          width: defaultWidth,
          height: defaultHeight,
          ...style,
        },
      }
      const updatedNodes = [...nodesRef.current, newNode]
      setNodes(updatedNodes)
      syncSourceFromDiagram(updatedNodes, edgesRef.current, viewport)
    },
    [contextMenuPosition, pushToHistory, syncSourceFromDiagram, viewport, handleMentionClick],
  )

  // Handle drag over to allow drop
  const handleDragOver = React.useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
    setIsDraggingOver(true)
  }, [])

  // Handle drag leave
  const handleDragLeave = React.useCallback((event: React.DragEvent) => {
    // Only set to false if leaving the container itself, not child elements
    if (event.currentTarget === event.target) {
      setIsDraggingOver(false)
    }
  }, [])

  // Handle file drop to create preview nodes
  const handleDrop = React.useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()
      setIsDraggingOver(false)

      if (!instanceRef.current || !containerRef.current) return

      const files = Array.from(event.dataTransfer.files)
      if (files.length === 0) return

      pushToHistory() // Save state before adding nodes

      // Convert screen coordinates to flow coordinates
      const reactFlowBounds = containerRef.current.getBoundingClientRect()
      const position = instanceRef.current.screenToFlowPosition({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      })

      // Create a file preview node for each dropped file
      const newNodes: CanvasNode[] = files.map((file, index) => {
        const fileName = file.name
        const extension = getEffectiveExtension(fileName) || ''
        const fileType = getFileTypeFromExtension(extension)

        // Offset multiple files in a cascade
        const offsetX = index * 20
        const offsetY = index * 20

        return {
          id: `file-${Date.now()}-${index}`,
          type: 'filePreview',
          position: {
            x: position.x + offsetX,
            y: position.y + offsetY,
          },
          data: {
            filePath: (file as any).path || '', // Tauri provides file.path property
            fileName,
            extension,
            fileType,
            isMaximized: false,
          },
          style: {
            width: containerRef.current!.offsetWidth,
            height: containerRef.current!.offsetHeight,
          },
          selected: index === 0, // Select first file
        }
      })

      // Add new nodes and auto-maximize the first one
      const updatedNodes = [...nodesRef.current, ...newNodes]
      setNodes(updatedNodes)
      syncSourceFromDiagram(updatedNodes, edgesRef.current, viewport)

      // Auto-maximize the first dropped file
      if (newNodes.length > 0) {
        requestAnimationFrame(() => {
          maximizeNode(newNodes[0].id)
        })
      }
    },
    [pushToHistory, syncSourceFromDiagram, viewport, maximizeNode],
  )

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center text-muted-foreground">
        <AlertCircle className="h-10 w-10 text-destructive mb-3" />
        <p className="text-sm font-medium mb-1">Failed to load canvas</p>
        <p className="text-xs text-muted-foreground/80">{error}</p>
        <Button className="mt-4 gap-2" size="sm" onClick={handleReload}>
          <RefreshCw className="h-4 w-4" />
          Retry
        </Button>
      </div>
    )
  }

  const hasContent = Boolean(nodes.length || edges.length)

  return (
    <CursorZone className="flex h-full flex-col border-border/50">
      <div className="flex items-center justify-between border-b border-border/50 px-3 py-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">{fileName ?? 'Canvas'}</span>
          <span>•</span>
          <span>{nodes.length} nodes</span>
          <span>•</span>
          <span>{edges.length} edges</span>
        </div>
        <div className="flex items-center gap-1">
          {/* Undo/Redo buttons */}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={handleUndo}
            disabled={!canUndo}
            title="Undo (⌘Z)">
            <Undo2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={handleRedo}
            disabled={!canRedo}
            title="Redo (⌘⇧Z)">
            <Redo2 className="h-3.5 w-3.5" />
          </Button>

          <div className="w-px h-4 bg-border/50 mx-1" />

          {/* Save status indicator */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {isSaving ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Saving...</span>
              </>
            ) : hasUnsavedChanges ? (
              <>
                <div className="h-2 w-2 rounded-full bg-amber-500" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span>Saved</span>
              </>
            )}
          </div>

          <div className="w-px h-4 bg-border/50 mx-1" />

          <Button variant="ghost" size="sm" className="h-7 px-2 gap-1.5" onClick={handleFitView}>
            <Maximize className="h-3.5 w-3.5" />
            Fit view
          </Button>
          <Button variant="ghost" size="sm" className="h-7 px-2 gap-1.5" onClick={handleReload}>
            <RefreshCw className="h-3.5 w-3.5" />
            Reload
          </Button>
          <Button
            variant={showSource ? 'secondary' : 'ghost'}
            size="sm"
            className="h-7 px-2 gap-1.5"
            onClick={handleToggleSource}>
            <Braces className="h-3.5 w-3.5" />
            Source
          </Button>
        </div>
      </div>

      <div
        ref={containerRef}
        className={`relative flex-1 bg-muted/20 canvas-stage ${maximizedNodeId ? 'canvas-maximized' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}>
        {/* Drag indicator overlay */}
        {isDraggingOver && (
          <div className="absolute inset-0 z-50 pointer-events-none flex items-center justify-center bg-primary/50 border-primary/30 backdrop-blur-sm">
            <div className="bg-card/90 border border-primary/50 rounded-lg px-6 py-4 shadow-xl">
              <div className="flex items-center gap-3 text-primary">
                <svg
                  className="h-8 w-8"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                <div>
                  <p className="font-semibold text-foreground">Drop files here</p>
                  <p className="text-sm text-muted-foreground">Create preview nodes on canvas</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <ContextMenu>
          <ContextMenuTrigger asChild onContextMenu={handleContextMenu}>
            <CursorTrigger
              className="flex-1 h-full cursor-none"
              message="Drag to pan • Scroll to zoom"
              onMouseDown={() => setPressed(true)}
              onMouseUp={() => setPressed(false)}
              onMouseEnter={() => {
                setVariant('grab')
                setMessage('Drag to pan • Scroll to zoom')
              }}
              onMouseLeave={() => {
                reset()
                setPressed(false)
              }}>
              {hasContent ? (
                <ReactFlow
                  key={`${filePath}-${reloadKey}`}
                  className={`canvas-react-flow ${maximizedNodeId ? 'canvas-maximized-mode' : ''}`}
                  nodes={nodes}
                  edges={edges}
                  nodeTypes={nodeTypes}
                  onInit={handleInit}
                  onKeyDownCapture={(e) => { if (e.key.startsWith('Arrow')) e.stopPropagation() }}
                  nodesDraggable
                  nodesConnectable
                  elementsSelectable
                  onNodesChange={handleNodesChange}
                  onEdgesChange={handleEdgesChange}
                  onConnect={handleConnect}
                  onNodeDoubleClick={handleNodeDoubleClick}
                  onMoveEnd={(_, nextViewport) => {
                    setVariant('grab')
                    setViewport(nextViewport)
                    syncSourceFromDiagram(nodesRef.current, edgesRef.current, nextViewport)
                  }}
                  panOnDrag={false}
                  panOnScroll={true}
                  zoomOnPinch={true}
                  zoomOnScroll={false}
                  selectNodesOnDrag={true}
                  selectionOnDrag={true}
                  multiSelectionKeyCode="Shift"
                  fitView
                  fitViewOptions={{ padding: 0.2 }}
                  minZoom={0.2}
                  maxZoom={4}
                  defaultViewport={viewport}
                  proOptions={{ hideAttribution: true }}>
                  <Background gap={16} size={1.5} color="var(--border)" />
                </ReactFlow>
              ) : (
                <ReactFlow
                  key={`${filePath}-${reloadKey}-empty`}
                  className={`canvas-react-flow ${maximizedNodeId ? 'canvas-maximized-mode' : ''}`}
                  nodes={[]}
                  edges={[]}
                  nodeTypes={nodeTypes}
                  onInit={handleInit}
                  onKeyDownCapture={(e) => { if (e.key.startsWith('Arrow')) e.stopPropagation() }}
                  panOnDrag={false}
                  panOnScroll={true}
                  zoomOnPinch={true}
                  zoomOnScroll={false}
                  fitView
                  fitViewOptions={{ padding: 0.2 }}
                  minZoom={0.2}
                  maxZoom={4}
                  defaultViewport={viewport}
                  proOptions={{ hideAttribution: true }}>
                  <Background gap={16} size={1} color="var(--border)" />
                </ReactFlow>
              )}
            </CursorTrigger>
          </ContextMenuTrigger>
          <ContextMenuContent className="w-64">
            {onOpenBackgroundSettings && (
              <>
                <ContextMenuItem onClick={onOpenBackgroundSettings}>
                  <Palette className="mr-2 h-4 w-4" />
                  Background...
                </ContextMenuItem>
                <ContextMenuSeparator />
              </>
            )}

            {/* Text nodes */}
            <ContextMenuItem onClick={() => createNode('richText', 'Rich Text')}>
              <Type className="mr-2 h-4 w-4" />
              Rich Text
              <span className="ml-auto text-[10px] text-muted-foreground">@ [[</span>
            </ContextMenuItem>
            <ContextMenuSub>
              <ContextMenuSubTrigger>
                <StickyNote className="mr-2 h-4 w-4" />
                Sticky Note
              </ContextMenuSubTrigger>
              <ContextMenuSubContent className="w-48">
                {STICKY_COLORS.map((color) => (
                  <ContextMenuItem
                    key={color.name}
                    onClick={() => createNode('stickyNote', color.name, { color: color.name })}>
                    <div
                      className="mr-2 h-4 w-4 rounded-sm border"
                      style={{ backgroundColor: color.bg, borderColor: color.border }}
                    />
                    {color.name}
                  </ContextMenuItem>
                ))}
              </ContextMenuSubContent>
            </ContextMenuSub>

            <ContextMenuSeparator />

            {/* Media nodes */}
            <ContextMenuItem onClick={() => createNode('image', 'Image')}>
              <Image className="mr-2 h-4 w-4" />
              Image
            </ContextMenuItem>
            <ContextMenuItem onClick={() => createNode('embed', 'Web Embed')}>
              <Globe className="mr-2 h-4 w-4" />
              Web Embed
            </ContextMenuItem>
            <ContextMenuItem onClick={() => createNode('table', 'Table')}>
              <Table className="mr-2 h-4 w-4" />
              Table
            </ContextMenuItem>

            <ContextMenuSeparator />

            {/* Shapes */}
            <ContextMenuSub>
              <ContextMenuSubTrigger>
                <Shapes className="mr-2 h-4 w-4" />
                Shape
              </ContextMenuSubTrigger>
              <ContextMenuSubContent className="w-48">
                <ContextMenuItem onClick={() => createNode('shape', '', { shape: 'rectangle' })}>
                  <Square className="mr-2 h-4 w-4" />
                  Rectangle
                </ContextMenuItem>
                <ContextMenuItem onClick={() => createNode('shape', '', { shape: 'circle' })}>
                  <Circle className="mr-2 h-4 w-4" />
                  Circle
                </ContextMenuItem>
                <ContextMenuItem onClick={() => createNode('shape', '', { shape: 'diamond' })}>
                  <Diamond className="mr-2 h-4 w-4" />
                  Diamond
                </ContextMenuItem>
                <ContextMenuItem onClick={() => createNode('shape', '', { shape: 'triangle' })}>
                  <Triangle className="mr-2 h-4 w-4" />
                  Triangle
                </ContextMenuItem>
                <ContextMenuItem onClick={() => createNode('shape', '', { shape: 'hexagon' })}>
                  <Hexagon className="mr-2 h-4 w-4" />
                  Hexagon
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuSub>
                  <ContextMenuSubTrigger>Colors</ContextMenuSubTrigger>
                  <ContextMenuSubContent className="w-36">
                    {SHAPE_COLORS.map((color) => (
                      <ContextMenuItem
                        key={color.name}
                        onClick={() => createNode('shape', '', { shape: 'rectangle', color: color.name })}>
                        <div
                          className="mr-2 h-4 w-4 rounded-sm border"
                          style={{ backgroundColor: color.fill, borderColor: color.stroke }}
                        />
                        {color.name}
                      </ContextMenuItem>
                    ))}
                  </ContextMenuSubContent>
                </ContextMenuSub>
              </ContextMenuSubContent>
            </ContextMenuSub>

            <ContextMenuSeparator />

            {/* Legacy nodes */}
            <ContextMenuSub>
              <ContextMenuSubTrigger>
                <Plus className="mr-2 h-4 w-4" />
                More
              </ContextMenuSubTrigger>
              <ContextMenuSubContent className="w-48">
                <ContextMenuItem
                  onClick={() => createNode('default', 'Simple Text', { content: 'Double-click to edit' })}>
                  <FileText className="mr-2 h-4 w-4" />
                  Simple Text
                </ContextMenuItem>
                <ContextMenuItem
                  onClick={() => createNode('default', 'Code Snippet', { content: '// Your code here' })}>
                  <Code2 className="mr-2 h-4 w-4" />
                  Code Snippet
                </ContextMenuItem>
                <ContextMenuItem
                  onClick={() => createNode('default', 'Task List', { content: '☐ Task 1\n☐ Task 2\n☐ Task 3' })}>
                  <CheckSquare className="mr-2 h-4 w-4" />
                  Task List
                </ContextMenuItem>
              </ContextMenuSubContent>
            </ContextMenuSub>

            <ContextMenuSeparator />
            <div className="px-2 py-1.5 text-xs text-muted-foreground">Drag & drop files to embed</div>
          </ContextMenuContent>
        </ContextMenu>
      </div>

      {/* Source panel - always show header bar */}
      <div className="border-t border-border/60 flex flex-col overflow-hidden">
        {/* Source panel header - always visible */}
        <div
          className="flex items-center justify-between px-3 py-1.5 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors hidden"
          onClick={handleToggleSource}>
          <span className="text-xs text-muted-foreground font-medium">Source (JSON)</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            title={showSource ? 'Collapse source view' : 'Expand source view'}>
            <ChevronDown className={`h-4 w-4 transition-transform ${showSource ? '' : '-rotate-180'}`} />
          </Button>
        </div>

        {/* Expandable content */}
        {showSource && (
          <div className="flex flex-col overflow-hidden" style={{ height: sourcePanelHeight - 32 }}>
            {/* Resize handle */}
            <div
              className="h-2 cursor-ns-resize flex items-center justify-center hover:bg-accent/50 transition-colors group"
              onMouseDown={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setIsResizing(true)
                const startY = e.clientY
                const startHeight = sourcePanelHeight

                const handleMouseMove = (moveEvent: MouseEvent) => {
                  const delta = startY - moveEvent.clientY
                  const newHeight = Math.max(150, Math.min(600, startHeight + delta))
                  setSourcePanelHeight(newHeight)
                }

                const handleMouseUp = () => {
                  setIsResizing(false)
                  localStorage.setItem('canvasViewer.sourcePanelHeight', String(sourcePanelHeight))
                  document.removeEventListener('mousemove', handleMouseMove)
                  document.removeEventListener('mouseup', handleMouseUp)
                }

                document.addEventListener('mousemove', handleMouseMove)
                document.addEventListener('mouseup', handleMouseUp)
              }}>
              <GripHorizontal className="h-3 w-3 text-muted-foreground/50 group-hover:text-muted-foreground" />
            </div>

            {/* Code viewer */}
            <div className="flex-1 overflow-hidden">
              <CodeViewer
                filePath={filePath}
                extension="json"
                maxBytes={5 * 1024 * 1024}
                content={sourceValue || undefined}
                onContentChange={(newContent) => {
                  // User edited in CodeViewer, sync back to diagram
                  console.log('[CanvasViewer] onContentChange from CodeViewer, length:', newContent.length)
                  try {
                    const parsed = parseCanvasContent(newContent)
                    console.log('[CanvasViewer] Parsed content from CodeViewer:', {
                      nodeCount: parsed.nodes.length,
                      edgeCount: parsed.edges.length,
                    })
                    suppressSourceSyncRef.current = true
                    setNodes(parsed.nodes)
                    setEdges(parsed.edges)
                    if (parsed.viewport) {
                      setViewport(parsed.viewport)
                    }
                    setSourceValue(newContent)
                    setSourceError(null)
                    requestAnimationFrame(() => {
                      suppressSourceSyncRef.current = false
                    })
                  } catch (err) {
                    console.warn('[CanvasViewer] Failed to parse content from CodeViewer:', err)
                    setSourceError(err instanceof Error ? err.message : 'Invalid JSON')
                  }
                }}
                targetCursorLine={targetCursorLine}
                onCursorChange={(lineNumber: number) => {
                  // Sync from code to diagram: highlight node/edge at cursor
                  const elementId = findElementAtLine(lineNumber, sourceValue)
                  if (elementId) {
                    suppressSelectionSyncRef.current = true
                    const isNode = nodes.some((n) => n.id === elementId)
                    if (isNode) {
                      setNodes((current) => current.map((n) => ({ ...n, selected: n.id === elementId })))
                      setSelectedNodeIds([elementId])
                    } else {
                      setEdges((current) => current.map((e) => ({ ...e, selected: e.id === elementId })))
                      setSelectedEdgeIds([elementId])
                    }
                    setTimeout(() => {
                      suppressSelectionSyncRef.current = false
                    }, 100)
                  }
                }}
              />
            </div>
          </div>
        )}
      </div>
    </CursorZone>
  )
}

// Helper to find line number of a node by ID in JSON source
function calculateNodeLineNumber(nodeId: string, jsonSource: string): number | null {
  if (!jsonSource) return null
  const lines = jsonSource.split('\n')
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(`"id": "${nodeId}"`)) {
      return i + 1 // Monaco uses 1-indexed lines
    }
  }
  return null
}

// Helper to find line number of an edge by ID in JSON source
function calculateEdgeLineNumber(edgeId: string, jsonSource: string): number | null {
  if (!jsonSource) return null
  const lines = jsonSource.split('\n')
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(`"id": "${edgeId}"`)) {
      return i + 1
    }
  }
  return null
}

// Helper to find element ID at a given line number
function findElementAtLine(lineNumber: number, jsonSource: string): string | null {
  if (!jsonSource) return null
  const lines = jsonSource.split('\n')

  // Search upward from cursor line to find the nearest "id" field
  for (let i = lineNumber - 1; i >= 0; i--) {
    const line = lines[i]
    if (!line) continue
    const idMatch = line.match(/"id":\s*"([^"]+)"/)
    if (idMatch) {
      return idMatch[1]
    }
  }

  return null
}

function parseCanvasContent(content: string): CanvasData {
  if (typeof content !== 'string') {
    throw new Error('Canvas preview expects plain-text JSON content.')
  }

  if (!content.trim()) {
    return { nodes: [], edges: [], viewport: DEFAULT_VIEWPORT }
  }

  let parsedJson: unknown
  try {
    parsedJson = JSON.parse(content)
  } catch (error) {
    throw new Error('Canvas file must contain valid JSON data.')
  }

  return normalizeCanvasStructure(parsedJson)
}

function normalizeCanvasStructure(parsed: any): CanvasData {
  const result: CanvasData = {
    nodes: [],
    edges: [],
    viewport: DEFAULT_VIEWPORT,
  }

  if (!parsed) {
    return result
  }

  if (Array.isArray(parsed.nodes)) {
    result.nodes = sanitizeNodes(parsed.nodes)
  }

  if (Array.isArray(parsed.edges)) {
    result.edges = sanitizeEdges(parsed.edges)
  }

  if (!result.nodes.length && Array.isArray(parsed.elements)) {
    const elementNodes: any[] = []
    const elementEdges: any[] = []

    parsed.elements.forEach((element: any) => {
      if (element?.source || element?.target || element?.type === 'edge') {
        elementEdges.push(element)
      } else {
        elementNodes.push(element)
      }
    })

    if (elementNodes.length) {
      result.nodes = sanitizeNodes(elementNodes)
    }

    if (elementEdges.length) {
      result.edges = sanitizeEdges(elementEdges)
    }
  }

  if (!result.nodes.length && Array.isArray(parsed)) {
    result.nodes = sanitizeNodes(parsed)
  }

  if (!result.edges.length && Array.isArray(parsed.links)) {
    result.edges = sanitizeEdges(parsed.links)
  }

  const viewportCandidate = parsed.viewport ?? parsed.viewPort ?? parsed.defaultViewport
  if (
    viewportCandidate &&
    typeof viewportCandidate.x === 'number' &&
    typeof viewportCandidate.y === 'number' &&
    typeof viewportCandidate.zoom === 'number'
  ) {
    result.viewport = viewportCandidate
  }

  return result
}

function sanitizeNodes(rawNodes: any[]): CanvasNode[] {
  return rawNodes
    .filter((node) => node && typeof node.id === 'string')
    .map((node, index) => {
      const label = node?.data?.label ?? node.label ?? node.name ?? node.id
      const position = isValidPosition(node.position)
        ? node.position
        : {
            x: (index % 4) * 240,
            y: Math.floor(index / 4) * 140,
          }

      return {
        id: node.id,
        data: node.data ?? { label },
        position,
        type: node.type || 'resizable',
        hidden: node.hidden,
        style: node.style,
        className: node.className,
        draggable: true,
        selectable: true,
      }
    })
}

function sanitizeEdges(rawEdges: any[]): CanvasEdge[] {
  const sanitized: CanvasEdge[] = []

  rawEdges.forEach((edge, index) => {
    if (!edge) return

    const source = edge.source ?? edge.from ?? edge.output
    const target = edge.target ?? edge.to ?? edge.input

    if (typeof source !== 'string' || typeof target !== 'string') {
      return
    }

    sanitized.push({
      id: typeof edge.id === 'string' ? edge.id : `edge-${source}-${target}-${index}`,
      source,
      target,
      label: typeof edge.label === 'string' ? edge.label : edge.name,
      type: typeof edge.type === 'string' ? edge.type : 'default',
      animated: Boolean(edge.animated),
      style: typeof edge.style === 'object' ? edge.style : undefined,
      markerEnd: edge.markerEnd,
      data: typeof edge.data === 'object' && edge.data !== null ? edge.data : {},
      // Label styling - uses CSS properties (not SVG fill)
      labelStyle: {
        color: 'var(--foreground)',
        fontWeight: 500,
        fontSize: 10,
        background: 'transparent',
      },
      labelShowBg: true,
      labelBgStyle: {
        fill: 'var(--card)',
        stroke: 'var(--border)',
        strokeWidth: 1,
      },
      labelBgPadding: [6, 4] as [number, number],
      labelBgBorderRadius: 4,
    })
  })

  return sanitized
}

function isValidPosition(position: unknown): position is { x: number; y: number } {
  return (
    typeof position === 'object' &&
    position !== null &&
    typeof (position as any).x === 'number' &&
    typeof (position as any).y === 'number'
  )
}
