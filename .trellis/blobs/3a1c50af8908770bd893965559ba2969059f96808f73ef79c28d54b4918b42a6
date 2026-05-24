/**
 * Home Canvas Component
 *
 * A file-backed canvas for the home dashboard.
 * Each node's content is stored in ~/.filegraph/@home/nodes/
 */

import * as React from 'react'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type EdgeChange,
  type Node as RFNode,
  type NodeChange,
  type ReactFlowInstance,
  type Viewport,
  BackgroundVariant,
} from 'reactflow'
import 'reactflow/dist/style.css'
import '@reactflow/node-resizer/dist/style.css'
import '@/features/preview/viewers/canvasViewer.css'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import {
  Loader2,
  Type,
  StickyNote,
  Globe,
  Palette,
  Trash2,
  RotateCcw,
  Image,
  Table,
  Shapes,
  Square,
  Circle,
  Diamond,
  Triangle,
  Hexagon,
  Plus,
  FileText,
  Icon,
  Save,
  Video,
  Home,
  Music,
  Download,
  MapPin,
  Code,
  Terminal,
  ZoomIn,
  Activity,
  ArrowLeft,
  RefreshCw,
  List,
  LayoutGrid,
  Columns3,
  FolderTree,
  Pin,
  Calendar,
  Mic,
  User,
  PenTool,
  CalendarDays,
} from 'lucide-react'
import { toast } from 'sonner'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/stores/useUIStore'
import { useVault } from '@/contexts/VaultContext'
import { convertFileSrc, invoke } from '@tauri-apps/api/core'
import { useHomeCanvasStore } from './useHomeCanvasStore'
import type { NodePositionChange } from 'reactflow'
import { GroupNode } from './nodes/GroupNode'
import { getStroke } from 'perfect-freehand'

import { useAgentCanvasActivity } from './useAgentCanvasActivity'
import { useHomeCanvasHistory } from './useHomeCanvasHistory'
import { useCanvasClipboard } from './useCanvasClipboard'
import { NodeDetailsSheet } from './NodeDetailsSheet'
import { FreehandOverlay, type FreehandPoint } from './FreehandOverlay'
import { HelperLines } from './HelperLines'
import { CanvasToolbar } from './CanvasToolbar'
import { FullscreenTabs } from './FullscreenTabs'
import { getEffectiveExtension } from '@/lib/utils/fileExtensions'
import { getFileTypeFromExtension } from '@/features/preview/components/UnifiedPreviewCanvas/types'
import {
  getLayoutedElements,
  getGridLayoutedElements,
  getHelperLines,
  alignNodes,
  distributeNodes,
  getSelectedCount,
  getClipboardCount,
  type LayoutDirection,
  type AlignmentType,
  type DistributionType,
  type HelperLines as HelperLinesType,
} from './canvasUtils'
import {
  FileRichTextNode,
  FileStickyNoteNode,
  FileTableNode,
  FileWebEmbedNode,
  FileYoutubeNode,
  FileSpotifyNode,
  HomeFilePreviewNode,
  FolderNode,
  HomeTerminalNode,
  FreehandNode,
  WrappedImageNode,
  WrappedAudioNode,
  WrappedShapeNode,
  WrappedPdfNode,
  WrappedLocationNode,
  WrappedCodeBlockNode,
  PersonNode,
  CalendarNode,
  EventNode,
  PlaceholderNode,
  AgentNode,
  EMBED_NODE_TYPES,
} from './nodes'
import { CursorProvider, CursorZone, CursorTrigger, useCursor } from '@/components/Cursor'
import { Bot, Settings2, Undo2, Redo2, Folder, X, PanelLeftOpen, PanelLeftClose } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'

// Import constants from canvasViewer
import { STICKY_COLORS, SHAPE_COLORS } from '@/features/preview/viewers/canvasViewer/nodes'

type RecentContextMenuItem = {
  key: string
  nodeType: string
  label: string
  menuText: string
  extraData?: Record<string, unknown>
}

const HOME_CANVAS_RECENT_CONTEXT_MENU_KEY = 'filegraph.homeCanvas.recentContextMenu'
const HOME_CANVAS_RECENT_CONTEXT_MENU_MAX = 6

// Zoom indicator timeout duration
const ZOOM_INDICATOR_TIMEOUT = 2000

function readHomeCanvasRecentContextMenu(): RecentContextMenuItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(HOME_CANVAS_RECENT_CONTEXT_MENU_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item): item is RecentContextMenuItem => {
      if (!item || typeof item !== 'object') return false
      const rec = item as Partial<RecentContextMenuItem>
      return (
        typeof rec.key === 'string' &&
        typeof rec.nodeType === 'string' &&
        typeof rec.label === 'string' &&
        typeof rec.menuText === 'string'
      )
    })
  } catch {
    return []
  }
}

function writeHomeCanvasRecentContextMenu(items: RecentContextMenuItem[]) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(HOME_CANVAS_RECENT_CONTEXT_MENU_KEY, JSON.stringify(items))
  } catch {
    return
  }
}

function makeHomeCanvasRecentContextMenuKey(nodeType: string, label: string, extraData?: Record<string, unknown>) {
  let extra = ''
  try {
    extra = extraData ? JSON.stringify(extraData) : ''
  } catch {
    extra = ''
  }
  return `${nodeType}:${label}:${extra}`
}

function formatMs(value: number | null | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—'
  return `${Math.round(value)}ms`
}

function formatTime(value: string | null | undefined) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  } catch {
    return '—'
  }
}

function getFpsTone(fps: number) {
  if (!Number.isFinite(fps)) return 'text-muted-foreground'
  if (fps >= 55) return 'text-emerald-500'
  if (fps >= 35) return 'text-amber-500'
  return 'text-rose-500'
}

function getMsTone(ms: number | null | undefined, goodMax: number, warnMax: number) {
  if (typeof ms !== 'number' || !Number.isFinite(ms)) return 'text-muted-foreground'
  if (ms <= goodMax) return 'text-emerald-500'
  if (ms <= warnMax) return 'text-amber-500'
  return 'text-rose-500'
}

function sparklinePath(values: number[], width: number, height: number, min?: number, max?: number) {
  if (values.length < 2) return ''
  const minV = typeof min === 'number' ? min : Math.min(...values)
  const maxV = typeof max === 'number' ? max : Math.max(...values)
  const span = maxV - minV || 1

  return values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * width
      const y = height - ((v - minV) / span) * height
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
}

type IntrinsicDimensions = { width: number; height: number }

function clampMediaDimensions({ width, height }: IntrinsicDimensions): IntrinsicDimensions {
  // Avoid spawning huge nodes for high-res media.
  const MAX_W = 1200
  const MAX_H = 900

  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return { width: 400, height: 300 }
  }

  const scale = Math.min(1, MAX_W / width, MAX_H / height)
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  const timeout = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(label)), ms)
  })

  return Promise.race([promise, timeout]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId)
  })
}

async function getIntrinsicMediaDimensions(filePath: string): Promise<IntrinsicDimensions | null> {
  const fileName = filePath.split(/[/\\]/).pop() || ''
  const extension = getEffectiveExtension(fileName)
  if (!extension) return null

  const fileType = getFileTypeFromExtension(extension)
  if (fileType !== 'image' && fileType !== 'video') return null

  let assetUrl = ''
  try {
    assetUrl = convertFileSrc(filePath)
  } catch {
    return null
  }

  if (fileType === 'image') {
    const img = new window.Image()
    img.decoding = 'async'

    const dims = await withTimeout(
      new Promise<IntrinsicDimensions>((resolve, reject) => {
        img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
        img.onerror = () => reject(new Error('Failed to load image metadata'))
        img.src = assetUrl
      }),
      4000,
      'Timed out loading image metadata',
    )

    return clampMediaDimensions(dims)
  }

  const video = document.createElement('video')
  video.preload = 'metadata'
  video.muted = true

  const dims = await withTimeout(
    new Promise<IntrinsicDimensions>((resolve, reject) => {
      const cleanup = () => {
        video.onloadedmetadata = null
        video.onerror = null
        video.removeAttribute('src')
        video.load()
      }

      video.onloadedmetadata = () => {
        const width = video.videoWidth
        const height = video.videoHeight
        cleanup()
        resolve({ width, height })
      }

      video.onerror = () => {
        cleanup()
        reject(new Error('Failed to load video metadata'))
      }

      video.src = assetUrl
    }),
    5000,
    'Timed out loading video metadata',
  )

  return clampMediaDimensions(dims)
}

// Base node type registry for ReactFlow
const baseNodeTypes = {
  group: GroupNode,
  richText: FileRichTextNode,
  stickyNote: FileStickyNoteNode,
  image: WrappedImageNode,
  audio: WrappedAudioNode,
  embed: FileWebEmbedNode,
  shape: WrappedShapeNode,
  table: FileTableNode,
  pdf: WrappedPdfNode,
  youtube: FileYoutubeNode,
  spotify: FileSpotifyNode,
  location: WrappedLocationNode,
  codeBlock: WrappedCodeBlockNode,
  person: PersonNode,
  filePreview: HomeFilePreviewNode,
  widget: HomeFilePreviewNode,
  folder: FolderNode,
  terminal: HomeTerminalNode,
  freehand: FreehandNode,
  calendar: CalendarNode,
  event: EventNode,
  placeholder: PlaceholderNode,
  agent: AgentNode,
}

const GROUP_PADDING_X = 12
const GROUP_PADDING_TOP = 40
const GROUP_PADDING_BOTTOM = 12

function getNodeSize(node: RFNode) {
  const measured = (node as any).measured as { width?: number; height?: number } | undefined
  const width = (node.style?.width as number) || (node.width as number) || measured?.width || 200
  const height = (node.style?.height as number) || (node.height as number) || measured?.height || 150
  return { width, height }
}

function normalizeGroupNodes(nodes: RFNode[]): RFNode[] {
  const groupNodes = nodes.filter((n) => n.type === 'group')
  if (groupNodes.length === 0) return nodes

  const childrenByGroupId = new Map<string, RFNode[]>()
  for (const n of nodes) {
    if (!n.parentId) continue
    const list = childrenByGroupId.get(n.parentId)
    if (list) list.push(n)
    else childrenByGroupId.set(n.parentId, [n])
  }

  let next = nodes
  let mutated = false

  const upsert = (nodeId: string, updater: (n: RFNode) => RFNode) => {
    const idx = next.findIndex((n) => n.id === nodeId)
    if (idx === -1) return
    const prev = next[idx]
    const updated = updater(prev)
    if (updated === prev) return
    if (!mutated) {
      next = next.slice()
      mutated = true
    }
    next[idx] = updated
  }

  for (const group of groupNodes) {
    const children = childrenByGroupId.get(group.id)
    if (!children || children.length === 0) continue

    let minX = Infinity
    let minY = Infinity
    let maxRight = -Infinity
    let maxBottom = -Infinity

    for (const child of children) {
      const { width, height } = getNodeSize(child)
      minX = Math.min(minX, child.position.x)
      minY = Math.min(minY, child.position.y)
      maxRight = Math.max(maxRight, child.position.x + width)
      maxBottom = Math.max(maxBottom, child.position.y + height)
    }

    const deltaX = minX - GROUP_PADDING_X
    const deltaY = minY - GROUP_PADDING_TOP

    const EPS = 0.5

    if (Math.abs(deltaX) > EPS || Math.abs(deltaY) > EPS) {
      upsert(group.id, (g) => ({
        ...g,
        position: {
          x: g.position.x + deltaX,
          y: g.position.y + deltaY,
        },
      }))

      for (const child of children) {
        upsert(child.id, (c) => ({
          ...c,
          position: {
            x: c.position.x - deltaX,
            y: c.position.y - deltaY,
          },
        }))
      }

      maxRight -= deltaX
      maxBottom -= deltaY
    }

    const targetWidth = Math.max(1, maxRight + GROUP_PADDING_X)
    const targetHeight = Math.max(1, maxBottom + GROUP_PADDING_BOTTOM)

    upsert(group.id, (g) => {
      const prevW = (g.style?.width as number) || 0
      const prevH = (g.style?.height as number) || 0
      if (Math.abs(prevW - targetWidth) < 0.5 && Math.abs(prevH - targetHeight) < 0.5) return g

      return {
        ...g,
        style: {
          ...(g.style as React.CSSProperties | undefined),
          width: targetWidth,
          height: targetHeight,
        },
      }
    })
  }

  return mutated ? next : nodes
}

interface HomeCanvasProps {
  className?: string
  onOpenBackgroundSettings?: () => void
}

function HomeCanvasInner({ className, onOpenBackgroundSettings }: HomeCanvasProps) {
  const PERF_HUD_ENABLED = false
  const PERF_HISTORY_SIZE = 60

  const { vaultPath } = useVault()
  const { globalSidebarOpen, toggleGlobalSidebar } = useUIStore()
  const {
    spaces,
    activeSpaceId,
    nodes,
    edges,
    viewport,
    groups,
    isLoading,
    error,
    hasUnsavedChanges,
    isSaving,
    savePerf,
    archivedNodes,
    isInitialized,
    initialize,
    switchSpace,
    createNewSpace,
    addNode,
    removeNode,
    setNodes,
    setEdges,
    setViewport,
    updateNodeDimensions,
    setDragging,
    save,
    restoreArchivedNode,
    addFileNode,
    addFolderNode,
    createGroup,
    ungroup,
  } = useHomeCanvasStore()

  const [createSpaceOpen, setCreateSpaceOpen] = React.useState(false)
  const [createSpaceName, setCreateSpaceName] = React.useState('')

  const handleCreateSpace = React.useCallback(() => {
    setCreateSpaceName('')
    setCreateSpaceOpen(true)
  }, [])

  const handleConfirmCreateSpace = React.useCallback(() => {
    const name = createSpaceName.trim()
    if (!name) return
    setCreateSpaceOpen(false)
    void createNewSpace(name)
  }, [createSpaceName, createNewSpace])

  // Use baseNodeTypes directly - grouping is handled via parentId
  const nodeTypes = React.useMemo(() => baseNodeTypes, [])

  const applyIntrinsicMediaSizing = React.useCallback(
    (nodeId: string, filePath: string) => {
      getIntrinsicMediaDimensions(filePath)
        .then((dims) => {
          if (!dims) return
          updateNodeDimensions(nodeId, dims)
        })
        .catch(() => {
          // Best-effort only; never block node creation on metadata.
        })
    },
    [updateNodeDimensions],
  )

  // Agent activity state
  const { isActive: agentIsActive, activeNodeIds, currentAction } = useAgentCanvasActivity()

  // History for undo/redo
  const { undo, redo, canUndo, canRedo, pushAction } = useHomeCanvasHistory()

  const historyTimeoutRef = React.useRef<number | null>(null)
  const skipNextHistoryRef = React.useRef(false)

  const pushSnapshotToHistory = React.useCallback(
    (
      description: string,
      before: { nodes: RFNode[]; edges: typeof edges },
      after: { nodes: RFNode[]; edges: typeof edges },
      meta?: { nodeId?: string; edgeId?: string },
    ) => {
      if (skipNextHistoryRef.current) {
        skipNextHistoryRef.current = false
        return
      }

      pushAction({
        type: 'batch',
        actor: 'user',
        description,
        nodeId: meta?.nodeId,
        edgeId: meta?.edgeId,
        before: { nodes: before.nodes, edges: before.edges },
        after: { nodes: after.nodes, edges: after.edges },
      })
    },
    [pushAction],
  )

  const debouncedPushSnapshot = React.useCallback(
    (
      description: string,
      before: { nodes: RFNode[]; edges: typeof edges },
      after: { nodes: RFNode[]; edges: typeof edges },
      meta?: { nodeId?: string; edgeId?: string },
    ) => {
      if (historyTimeoutRef.current) {
        clearTimeout(historyTimeoutRef.current)
      }

      historyTimeoutRef.current = window.setTimeout(() => {
        pushSnapshotToHistory(description, before, after, meta)
      }, 300)
    },
    [pushSnapshotToHistory],
  )

  // Node details sheet state
  const [detailsSheetNode, setDetailsSheetNode] = React.useState<RFNode | null>(null)
  const [detailsSheetOpen, setDetailsSheetOpen] = React.useState(false)
  const [detailsPanelWidth, setDetailsPanelWidth] = React.useState(320)

  const containerRef = React.useRef<HTMLDivElement>(null)
  const instanceRef = React.useRef<ReactFlowInstance | null>(null)
  const nodesRef = React.useRef(nodes)
  const edgesRef = React.useRef(edges)
  const lastZoomRef = React.useRef<number | null>(null)
  const [contextMenuPosition, setContextMenuPosition] = React.useState<{ x: number; y: number } | null>(null)
  const [isDraggingOver, setIsDraggingOver] = React.useState(false)

  // Zoom indicator state
  const [showZoomIndicator, setShowZoomIndicator] = React.useState(false)
  const [currentZoom, setCurrentZoom] = React.useState(1)
  const zoomIndicatorTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)

  // Minimap visibility - show when nodes are outside viewport
  const [hasNodesOutsideViewport, setHasNodesOutsideViewport] = React.useState(false)

  // Track hovered node for embed scroll passthrough
  // When hovering a selected embed node at zoom >= 50%, disable canvas pan to allow iframe scrolling
  const [hoveredNodeId, setHoveredNodeId] = React.useState<string | null>(null)

  const [recentContextMenuItems, setRecentContextMenuItems] = React.useState<RecentContextMenuItem[]>(() =>
    readHomeCanvasRecentContextMenu(),
  )

  const [showPerfHud, setShowPerfHud] = React.useState(PERF_HUD_ENABLED)
  const [fpsStats, setFpsStats] = React.useState({
    fps: 0,
    avgFrameMs: 0,
    worstFrameMs: 0,
    jankWindow: 0,
    jankTotal: 0,
  })
  const [fpsHistory, setFpsHistory] = React.useState<number[]>([])
  const [saveTotalHistory, setSaveTotalHistory] = React.useState<number[]>([])
  const jankTotalRef = React.useRef(0)

  React.useEffect(() => {
    let rafId = 0
    let last = performance.now()
    let windowStart = last
    let frames = 0
    let frameSum = 0
    let worst = 0
    let jankWindow = 0

    const tick = (now: number) => {
      const dt = now - last
      last = now

      frames += 1
      frameSum += dt
      if (dt > worst) worst = dt
      if (dt >= 50) {
        jankWindow += 1
        jankTotalRef.current += 1
      }

      if (now - windowStart >= 500) {
        const windowMs = now - windowStart
        const fps = windowMs > 0 ? (frames * 1000) / windowMs : 0
        const avgFrameMs = frames > 0 ? frameSum / frames : 0
        setFpsStats({
          fps,
          avgFrameMs,
          worstFrameMs: worst,
          jankWindow,
          jankTotal: jankTotalRef.current,
        })

        setFpsHistory((current) => {
          const next = [...current, fps]
          if (next.length > PERF_HISTORY_SIZE) next.splice(0, next.length - PERF_HISTORY_SIZE)
          return next
        })

        windowStart = now
        frames = 0
        frameSum = 0
        worst = 0
        jankWindow = 0
      }

      rafId = window.requestAnimationFrame(tick)
    }

    rafId = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(rafId)
  }, [PERF_HUD_ENABLED, PERF_HISTORY_SIZE, showPerfHud])

  React.useEffect(() => {
    if (!PERF_HUD_ENABLED) return
    if (typeof savePerf.lastTotalMs !== 'number') return

    setSaveTotalHistory((current) => {
      const next = [...current, savePerf.lastTotalMs as number]
      if (next.length > PERF_HISTORY_SIZE) next.splice(0, next.length - PERF_HISTORY_SIZE)
      return next
    })
  }, [PERF_HUD_ENABLED, PERF_HISTORY_SIZE, savePerf.lastTotalMs, savePerf.saveCount])

  const freehandStrokeOptions = React.useMemo(
    () => ({
      size: 7,
      thinning: 0.5,
      smoothing: 0.5,
      streamline: 0.5,
      easing: (t: number) => t,
      start: { taper: 0, easing: (t: number) => t, cap: true },
      end: { taper: 0.1, easing: (t: number) => t, cap: true },
    }),
    [],
  )

  const getSvgPathFromStroke = React.useCallback((stroke: number[][]) => {
    if (!stroke.length) return ''

    const d = stroke.reduce(
      (acc, [x0, y0], i, arr) => {
        const [x1, y1] = arr[(i + 1) % arr.length]
        acc.push(x0, y0, ',', (x0 + x1) / 2, (y0 + y1) / 2)
        return acc
      },
      ['M', ...stroke[0], 'Q'] as (string | number)[],
    )

    d.push('Z')
    return d.join(' ')
  }, [])

  const getFreehandPath = React.useCallback(
    (points: FreehandPoint[], scale = 1) => {
      const stroke = getStroke(points, {
        ...freehandStrokeOptions,
        size: freehandStrokeOptions.size * scale,
      })
      return getSvgPathFromStroke(stroke)
    },
    [freehandStrokeOptions, getSvgPathFromStroke],
  )

  const transformFreehandPoints = React.useCallback(
    (points: FreehandPoint[], screenToFlowPosition: (pos: { x: number; y: number }) => { x: number; y: number }) => {
      let minX = Infinity
      let minY = Infinity
      let maxX = -Infinity
      let maxY = -Infinity

      const transformedPoints: FreehandPoint[] = []

      for (const point of points) {
        const { x, y } = screenToFlowPosition({ x: point[0], y: point[1] })
        minX = Math.min(minX, x)
        minY = Math.min(minY, y)
        maxX = Math.max(maxX, x)
        maxY = Math.max(maxY, y)
        transformedPoints.push([x, y, point[2]])
      }

      const padding = freehandStrokeOptions.size * 0.5
      minX -= padding
      minY -= padding
      maxX += padding
      maxY += padding

      for (const point of transformedPoints) {
        point[0] -= minX
        point[1] -= minY
      }

      const width = maxX - minX
      const height = maxY - minY

      return {
        position: { x: minX, y: minY },
        width,
        height,
        data: {
          points: transformedPoints,
          initialSize: { width, height },
        },
      }
    },
    [freehandStrokeOptions.size],
  )

  // Helper lines state for alignment guides
  const [helperLines, setHelperLines] = React.useState<HelperLinesType>({ horizontal: null, vertical: null })

  const [layoutMode, setLayoutMode] = React.useState<'custom' | 'LR' | 'TB' | 'grid'>('custom')
  const [animateLayout, setAnimateLayout] = React.useState(false)

  const [activeTool, setActiveTool] = React.useState<'select' | 'freehand' | 'shapes'>('select')
  const isDrawingMode = activeTool === 'freehand'
  const isShapesTool = activeTool === 'shapes'

  const handleToolChange = React.useCallback((tool: 'select' | 'freehand' | 'shapes') => {
    setActiveTool(tool)
  }, [])

  // Keyboard shortcut: hold 'D' to draw, release to reset
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'd' || e.key === 'D') {
        const target = e.target as HTMLElement
        const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable
        if (isInput) return
        e.preventDefault()
        setActiveTool('freehand')
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'd' || e.key === 'D') {
        const target = e.target as HTMLElement
        const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable
        if (isInput) return
        e.preventDefault()
        setActiveTool((current) => (current === 'freehand' ? 'select' : current))
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('keyup', handleKeyUp)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  const handleFreehandComplete = React.useCallback(
    (points: FreehandPoint[]) => {
      if (!instanceRef.current) return
      if (points.length < 2) return

      const before = { nodes: nodesRef.current, edges: edgesRef.current }
      const freehandBounds = containerRef.current?.getBoundingClientRect()
      const nodeData = transformFreehandPoints(points, (pos) =>
        instanceRef.current!.screenToFlowPosition({
          x: pos.x + (freehandBounds?.left ?? 0),
          y: pos.y + (freehandBounds?.top ?? 0),
        }),
      )
      const nodeId = `node-${crypto.randomUUID()}`

      const nextNodes = [
        ...nodesRef.current,
        {
          id: nodeId,
          type: 'freehand',
          position: nodeData.position,
          style: { width: nodeData.width, height: nodeData.height },
          data: {
            label: 'Freehand',
            ...nodeData.data,
          },
        },
      ]

      pushSnapshotToHistory('Draw freehand', before, { nodes: nextNodes, edges: before.edges }, { nodeId })
      setNodes(nextNodes)
    },
    [pushSnapshotToHistory, setNodes, transformFreehandPoints],
  )

  const applyHistoryAction = React.useCallback(
    (action: ReturnType<typeof undo> | ReturnType<typeof redo>, direction: 'undo' | 'redo') => {
      if (!action) return
      const snapshot = direction === 'undo' ? action.before : action.after
      if (!snapshot.nodes || !snapshot.edges) return
      setNodes(snapshot.nodes as RFNode[])
      setEdges(snapshot.edges as typeof edges)
    },
    [setEdges, setNodes],
  )

  // Selection box tracking for draw-to-create placeholder nodes
  const selectionStartRef = React.useRef<{ x: number; y: number } | null>(null)
  const selectionStartTimeRef = React.useRef<number | null>(null)
  const isSelectionDraggingRef = React.useRef(false)

  const [invalidSelectionBox, setInvalidSelectionBox] = React.useState<{
    id: string
    x: number
    y: number
    width: number
    height: number
  } | null>(null)

  // Handle selection box start (mouse down on empty area)
  const handleSelectionStart = React.useCallback(
    (event: React.MouseEvent) => {
      // Only track left-click (button 0), ignore right-click context menu
      if (event.button !== 0) return

      // Only track if we're starting a selection drag (not clicking on a node)
      const target = event.target as HTMLElement
      const isOnNode = target.closest('.react-flow__node')
      const isOnPane = target.closest('.react-flow__pane')

      if (isOnPane && !isOnNode && !isDrawingMode && !isShapesTool) {
        selectionStartRef.current = { x: event.clientX, y: event.clientY }
        selectionStartTimeRef.current = performance.now()
        isSelectionDraggingRef.current = true
      }
    },
    [isDrawingMode, isShapesTool],
  )

  // Handle selection box end (mouse up after drawing selection)
  const handleSelectionEnd = React.useCallback(
    (event: React.MouseEvent) => {
      if (
        !isSelectionDraggingRef.current ||
        !selectionStartRef.current ||
        !instanceRef.current ||
        !containerRef.current
      )
        return

      const startPos = selectionStartRef.current
      const endPos = { x: event.clientX, y: event.clientY }
      const startTime = selectionStartTimeRef.current
      const durationMs = startTime ? performance.now() - startTime : null

      // Reset tracking
      selectionStartRef.current = null
      selectionStartTimeRef.current = null
      isSelectionDraggingRef.current = false

      // Calculate the selection box dimensions
      const minX = Math.min(startPos.x, endPos.x)
      const minY = Math.min(startPos.y, endPos.y)
      const width = Math.abs(endPos.x - startPos.x)
      const height = Math.abs(endPos.y - startPos.y)

      // Ignore plain clicks (no meaningful drag) to avoid noisy feedback
      const CLICK_TOLERANCE = 6
      if (width < CLICK_TOLERANCE && height < CLICK_TOLERANCE) return

      // Guardrails: make draw-to-create hard to trigger accidentally
      const MIN_SIZE = 50
      const MIN_DURATION_MS = 250
      const isTooSmall = width < MIN_SIZE || height < MIN_SIZE
      const isTooFast = durationMs !== null && durationMs < MIN_DURATION_MS

      if (isTooSmall || isTooFast) {
        const bounds = containerRef.current.getBoundingClientRect()
        setInvalidSelectionBox({
          id: crypto.randomUUID(),
          x: minX - bounds.left,
          y: minY - bounds.top,
          width,
          height,
        })

        window.setTimeout(() => {
          setInvalidSelectionBox((prev) => (prev?.id ? null : prev))
        }, 650)

        return
      }

      // Only create placeholder if the selection box is large enough
      // (size/duration validated above)

      // Check if any nodes are selected after this selection
      // Use a small delay to let ReactFlow process the selection first
      setTimeout(() => {
        const selectedNodes = nodesRef.current.filter((n) => n.selected)
        if (selectedNodes.length > 0) return // Nodes were selected, don't create placeholder

        // Convert screen coordinates to flow coordinates
        const flowPosition = instanceRef.current!.screenToFlowPosition({
          x: minX,
          y: minY,
        })

        // Get zoom level to scale dimensions
        const zoom = instanceRef.current!.getViewport().zoom
        const flowWidth = width / zoom
        const flowHeight = height / zoom

        // Create a placeholder node at the drawn position
        const nodeId = `placeholder-${crypto.randomUUID()}`
        const newNode: RFNode = {
          id: nodeId,
          type: 'placeholder',
          position: flowPosition,
          style: { width: flowWidth, height: flowHeight },
          data: { label: 'New Node' },
          selected: true,
        }

        setNodes((currentNodes) => [...currentNodes.map((n) => ({ ...n, selected: false })), newNode])
      }, 50)
    },
    [setNodes],
  )

  // Maximized node state - persisted to localStorage per space
  const fullscreenStorageKey = `home-canvas-fullscreen-${activeSpaceId}`
  const [maximizedNodeState, setMaximizedNodeState] = React.useState<{ spaceId: string; nodeId: string } | null>(null)
  const maximizedNodeId = maximizedNodeState?.spaceId === activeSpaceId ? maximizedNodeState.nodeId : null
  const preMaximizeViewportRef = React.useRef<Viewport | null>(null)
  // Store original styles for ALL nodes that get maximized (keyed by node ID)
  const preMaximizeNodeStylesRef = React.useRef<
    Map<
      string,
      {
        width?: number
        height?: number
        position: { x: number; y: number }
      }
    >
  >(new Map())
  const hasRestoredFullscreen = React.useRef(false)
  const maximizeNodeRef = React.useRef<(nodeId: string) => void>(() => {})

  React.useEffect(() => {
    hasRestoredFullscreen.current = false
    preMaximizeViewportRef.current = null
    preMaximizeNodeStylesRef.current.clear()
    setMaximizedNodeState(null)
  }, [fullscreenStorageKey])

  // Persist fullscreen state to localStorage
  React.useEffect(() => {
    if (typeof window === 'undefined') return
    if (!hasRestoredFullscreen.current && !maximizedNodeId) return
    try {
      if (maximizedNodeId) {
        window.localStorage.setItem(fullscreenStorageKey, maximizedNodeId)
      } else {
        window.localStorage.removeItem(fullscreenStorageKey)
      }
    } catch {
      // Ignore storage errors
    }
  }, [maximizedNodeId, fullscreenStorageKey])

  // Generate tabs data from ALL nodes when in fullscreen mode
  const fullscreenTabs = React.useMemo(() => {
    if (!maximizedNodeId) return []

    return nodes
      .filter((node) => node.type !== 'placeholder') // Exclude placeholder nodes
      .map((node) => {
        const fileRef: string = node.data?.fileName || node.data?.file || ''
        const dotIndex = fileRef.lastIndexOf('.')
        const fileExtension: string | undefined = fileRef && dotIndex > -1
          ? fileRef.slice(dotIndex + 1).toLowerCase()
          : undefined
        return {
          id: node.id,
          title: node.data?.label || node.data?.name || node.data?.title || 'Untitled',
          nodeType: node.type || 'unknown',
          shapeType: node.data?.shape as string | undefined,
          fileExtension,
          isActive: node.id === maximizedNodeId,
        }
      })
  }, [nodes, maximizedNodeId])

  const handlePaneClick = React.useCallback(
    async (event: React.MouseEvent) => {
      if (!isShapesTool || maximizedNodeId) return
      if (!instanceRef.current || !containerRef.current) return

      const target = event.target as HTMLElement
      const isOnNode = target.closest('.react-flow__node')
      if (isOnNode) return

      const position = instanceRef.current.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })

      try {
        await addNode('shape', position, 'Rectangle', { shape: 'rectangle' })
      } catch {
        // ignore
      } finally {
        setActiveTool('select')
      }
    },
    [addNode, isShapesTool, maximizedNodeId],
  )

  // Keep nodesRef in sync
  React.useEffect(() => {
    nodesRef.current = nodes
  }, [nodes])

  // Check if nodes are outside viewport (reusable helper)
  const checkNodesOutsideViewport = React.useCallback(() => {
    if (!containerRef.current || !instanceRef.current || nodes.length === 0) {
      setHasNodesOutsideViewport(false)
      return
    }

    const vp = instanceRef.current.getViewport()
    const containerRect = containerRef.current.getBoundingClientRect()
    const viewportWidth = containerRect.width
    const viewportHeight = containerRect.height

    // Calculate visible area in flow coordinates
    const visibleLeft = -vp.x / vp.zoom
    const visibleTop = -vp.y / vp.zoom
    const visibleRight = visibleLeft + viewportWidth / vp.zoom
    const visibleBottom = visibleTop + viewportHeight / vp.zoom

    // Check if any node is outside the visible area
    const hasOutside = nodes.some((node) => {
      const measured = (node as any).measured as { width?: number; height?: number } | undefined
      const nodeWidth = (node.style?.width as number) || measured?.width || 200
      const nodeHeight = (node.style?.height as number) || measured?.height || 150

      const nodeLeft = node.position.x
      const nodeTop = node.position.y
      const nodeRight = nodeLeft + nodeWidth
      const nodeBottom = nodeTop + nodeHeight

      return nodeLeft < visibleLeft || nodeRight > visibleRight || nodeTop < visibleTop || nodeBottom > visibleBottom
    })

    setHasNodesOutsideViewport(hasOutside)
  }, [nodes])

  // Re-check when nodes change
  React.useEffect(() => {
    checkNodesOutsideViewport()
  }, [checkNodesOutsideViewport])

  React.useEffect(() => {
    setLayoutMode('custom')
  }, [activeSpaceId])

  const isCustomLayout = layoutMode === 'custom'

  React.useEffect(() => {
    setAnimateLayout(true)
    const timeout = window.setTimeout(() => setAnimateLayout(false), 260)
    return () => window.clearTimeout(timeout)
  }, [layoutMode])

  const activeLayoutLabel = React.useMemo(() => {
    switch (layoutMode) {
      case 'custom':
        return 'Custom'
      case 'LR':
        return 'Left→Right'
      case 'TB':
        return 'Top→Bottom'
      case 'grid':
        return 'Grid'
      default:
        return 'Layout'
    }
  }, [layoutMode])

  React.useEffect(() => {
    if (isCustomLayout) return
    setHelperLines({ horizontal: null, vertical: null })
  }, [isCustomLayout])

  const projectedNodes = React.useMemo(() => {
    if (isCustomLayout) return nodes

    if (layoutMode === 'grid') {
      return getGridLayoutedElements(nodes, edges).nodes
    }

    return getLayoutedElements(nodes, edges, { direction: layoutMode }).nodes
  }, [isCustomLayout, layoutMode, nodes, edges])

  const nodesForRender = React.useMemo(() => {
    const shouldAnimate = animateLayout
    return projectedNodes.map((n) => {
      if (!shouldAnimate) return n
      return {
        ...n,
        style: {
          ...(n.style as React.CSSProperties | undefined),
          transition: 'transform 220ms ease',
        },
      }
    })
  }, [animateLayout, projectedNodes])

  React.useEffect(() => {
    edgesRef.current = edges
  }, [edges])

  // Check if any node is currently selected (for focus mode styling)
  const hasSelectedNode = React.useMemo(() => nodes.some((n) => n.selected), [nodes])

  // Determine if canvas panning should be disabled to allow embed iframe scrolling
  // Conditions: zoom >= 50% AND hovering a selected embed-type node
  const shouldDisablePanForEmbed = React.useMemo(() => {
    if (currentZoom < 0.5) return false
    if (!hoveredNodeId) return false

    const hoveredNode = nodes.find((n) => n.id === hoveredNodeId)
    if (!hoveredNode) return false

    // Must be selected (single-click) or in editing mode to enable scroll passthrough
    if (!hoveredNode.selected) return false

    // Must be an embed-type node (web embed, youtube, spotify)
    const nodeType = hoveredNode.type as string
    return EMBED_NODE_TYPES.includes(nodeType as (typeof EMBED_NODE_TYPES)[number])
  }, [currentZoom, hoveredNodeId, nodes])

  // Mouse handlers for tracking hovered node
  const handleNodeMouseEnter = React.useCallback((_event: React.MouseEvent, node: RFNode) => {
    setHoveredNodeId(node.id)
  }, [])

  const handleNodeMouseLeave = React.useCallback(() => {
    setHoveredNodeId(null)
  }, [])

  // Cmd/Ctrl+click to zoom/focus on a node
  const handleNodeClick = React.useCallback((event: React.MouseEvent, node: RFNode) => {
    // Check for Cmd (Mac) or Ctrl (Windows/Linux)
    if (event.metaKey || event.ctrlKey) {
      event.preventDefault()
      event.stopPropagation()

      // Zoom to fit the clicked node with padding
      if (instanceRef.current) {
        instanceRef.current.fitView({
          nodes: [node],
          padding: 0.5,
          duration: 400,
          maxZoom: 1.5,
        })
      }
    }
  }, [])

  const addPersonNodeFromEntityId = React.useCallback(
    async (entityId: string) => {
      const containerRect = containerRef.current?.getBoundingClientRect()
      const centerX = containerRect ? containerRect.left + containerRect.width / 2 : 400
      const centerY = containerRect ? containerRect.top + containerRect.height / 2 : 300

      // If ReactFlow instance is available, use its conversion helper.
      // Otherwise, fall back to stored viewport math.
      const jitterX = (Math.random() - 0.5) * 100
      const jitterY = (Math.random() - 0.5) * 100
      const position = instanceRef.current
        ? instanceRef.current.screenToFlowPosition({ x: centerX + jitterX, y: centerY + jitterY })
        : {
            x: (centerX + jitterX - viewport.x) / viewport.zoom,
            y: (centerY + jitterY - viewport.y) / viewport.zoom,
          }

      const [, slug] = entityId.split(':')
      const label = (slug || 'Person').replace(/-/g, ' ')

      await addNode('person', position, label, { entityId })
      toast.success('Added person card to canvas')
    },
    [addNode, viewport],
  )

  // Cursor context
  // const { setMessage, setVariant, setPressed, reset } = useCursor()

  // Initialize on mount
  React.useEffect(() => {
    if (!isInitialized) {
      initialize()
    }
  }, [isInitialized, initialize])

  // Handle node changes (position, selection, etc.)
  const handleNodesChange = React.useCallback(
    (changes: NodeChange[]) => {
      const currentNodes = nodesRef.current
      const currentEdges = edgesRef.current

      if (!isCustomLayout) {
        const filteredChanges = changes.filter((c) => c.type !== 'position')
        const updatedNodes = applyNodeChanges(filteredChanges, currentNodes)
        setNodes(updatedNodes)
        nodesRef.current = updatedNodes
        return
      }

      const hasPositionChange = changes.some((c) => c.type === 'position' && (c as any).dragging === false)
      const hasDimensionChange = changes.some((c) => c.type === 'dimensions')
      const hasAddRemove = changes.some((c) => c.type === 'add' || c.type === 'remove')

      // Helper lines: Check for position changes during drag
      const positionChange = changes.find(
        (change): change is NodePositionChange => change.type === 'position' && (change as any).dragging === true,
      )

      if (positionChange && positionChange.position) {
        const { helperLines: newHelperLines, snappedPosition } = getHelperLines(
          positionChange,
          currentNodes,
          positionChange.id,
        )
        setHelperLines(newHelperLines)

        // Apply snapped position
        if (snappedPosition) {
          positionChange.position = snappedPosition
        }
      } else {
        // Clear helper lines when not dragging
        const isDragging = changes.some(
          (change) => change.type === 'position' && (change as NodePositionChange).dragging,
        )
        if (!isDragging) {
          setHelperLines({ horizontal: null, vertical: null })
        }
      }

      const primaryNodeId = (() => {
        for (const change of changes) {
          const anyChange = change as any
          if (typeof anyChange?.id === 'string') return anyChange.id as string
          if (anyChange?.item && typeof anyChange.item.id === 'string') return anyChange.item.id as string
        }
        return undefined
      })()

      // When maximized, filter out selection changes to prevent the node from being deselected
      const filteredChanges = maximizedNodeId ? changes.filter((change) => change.type !== 'select') : changes
      const updatedNodes = applyNodeChanges(filteredChanges, currentNodes)
      const normalizedNodes =
        hasPositionChange || hasDimensionChange || hasAddRemove ? normalizeGroupNodes(updatedNodes) : updatedNodes

      if (hasAddRemove) {
        pushSnapshotToHistory(
          'Update nodes',
          { nodes: currentNodes, edges: currentEdges },
          { nodes: normalizedNodes, edges: currentEdges },
          { nodeId: primaryNodeId },
        )
      } else if (hasPositionChange || hasDimensionChange) {
        debouncedPushSnapshot(
          'Update nodes',
          { nodes: currentNodes, edges: currentEdges },
          { nodes: normalizedNodes, edges: currentEdges },
          { nodeId: primaryNodeId },
        )
      }

      setNodes(normalizedNodes)
      nodesRef.current = normalizedNodes
    },
    [isCustomLayout, setNodes, maximizedNodeId, pushSnapshotToHistory, debouncedPushSnapshot],
  )

  // Handle edge changes
  const handleEdgesChange = React.useCallback(
    (changes: EdgeChange[]) => {
      const currentNodes = nodesRef.current
      const currentEdges = edgesRef.current
      const effectiveChanges = changes.filter((change) => {
        if (change.type !== 'remove') return true
        const anyChange = change as any
        const edgeId = (typeof anyChange?.id === 'string' ? anyChange.id : undefined) as string | undefined
        const edge = edgeId ? currentEdges.find((e) => e.id === edgeId) : undefined
        return !(edge?.data && (edge.data as any).locked === true)
      })

      const updatedEdges = applyEdgeChanges(effectiveChanges, currentEdges)

      const hasAddRemove = effectiveChanges.some((c) => c.type === 'add' || c.type === 'remove')
      const primaryEdgeId = (() => {
        for (const change of effectiveChanges) {
          const anyChange = change as any
          if (typeof anyChange?.id === 'string') return anyChange.id as string
          if (anyChange?.item && typeof anyChange.item.id === 'string') return anyChange.item.id as string
        }
        return undefined
      })()
      if (hasAddRemove) {
        pushSnapshotToHistory(
          'Update edges',
          { nodes: currentNodes, edges: currentEdges },
          { nodes: currentNodes, edges: updatedEdges },
          { edgeId: primaryEdgeId },
        )
      }

      setEdges(updatedEdges)
      edgesRef.current = updatedEdges
    },
    [setEdges, pushSnapshotToHistory],
  )

  // Handle new connections
  const handleConnect = React.useCallback(
    (connection: Connection) => {
      const beforeNodes = nodesRef.current
      const beforeEdges = edgesRef.current
      const edgeId = `edge-${crypto.randomUUID()}`
      const newEdges = addEdge(
        {
          ...connection,
          id: edgeId,
          type: 'default',
        },
        beforeEdges,
      )
      pushSnapshotToHistory(
        'Connect nodes',
        { nodes: beforeNodes, edges: beforeEdges },
        { nodes: beforeNodes, edges: newEdges },
        { nodeId: connection.source ?? undefined, edgeId },
      )
      setEdges(newEdges)
      edgesRef.current = newEdges
    },
    [setEdges, pushSnapshotToHistory],
  )

  // Update CSS variable for zoom-aware resize handles (called during move)
  const handleMove = React.useCallback((_event: any, newViewport: Viewport) => {
    // Update zoom CSS variable only when zoom changes
    if (lastZoomRef.current !== newViewport.zoom) {
      lastZoomRef.current = newViewport.zoom
      if (containerRef.current) {
        containerRef.current.style.setProperty('--rf-zoom', String(newViewport.zoom))
      }

      // Show zoom indicator
      setCurrentZoom(newViewport.zoom)
      setShowZoomIndicator(true)

      // Clear existing timeout
      if (zoomIndicatorTimeoutRef.current) {
        clearTimeout(zoomIndicatorTimeoutRef.current)
      }

      // Set new timeout to hide indicator
      zoomIndicatorTimeoutRef.current = setTimeout(() => {
        setShowZoomIndicator(false)
      }, ZOOM_INDICATOR_TIMEOUT)
    }

    // Check if any nodes are outside the viewport
    if (!containerRef.current || nodesRef.current.length === 0) {
      setHasNodesOutsideViewport(false)
      return
    }

    const containerRect = containerRef.current.getBoundingClientRect()
    const viewportWidth = containerRect.width
    const viewportHeight = containerRect.height

    // Calculate visible area in flow coordinates
    const visibleLeft = -newViewport.x / newViewport.zoom
    const visibleTop = -newViewport.y / newViewport.zoom
    const visibleRight = visibleLeft + viewportWidth / newViewport.zoom
    const visibleBottom = visibleTop + viewportHeight / newViewport.zoom

    // Check if any node is outside the visible area
    const hasOutside = nodesRef.current.some((node) => {
      const measured = (node as any).measured as { width?: number; height?: number } | undefined
      const nodeWidth = (node.style?.width as number) || measured?.width || 200
      const nodeHeight = (node.style?.height as number) || measured?.height || 150

      const nodeLeft = node.position.x
      const nodeTop = node.position.y
      const nodeRight = nodeLeft + nodeWidth
      const nodeBottom = nodeTop + nodeHeight

      // Node is outside if any part extends beyond viewport
      return nodeLeft < visibleLeft || nodeRight > visibleRight || nodeTop < visibleTop || nodeBottom > visibleBottom
    })

    setHasNodesOutsideViewport(hasOutside)
  }, [])

  // Handle viewport changes - persist and update CSS variable
  const handleMoveEnd = React.useCallback(
    (_event: any, newViewport: Viewport) => {
      setViewport(newViewport)
      if (containerRef.current) {
        containerRef.current.style.setProperty('--rf-zoom', newViewport.zoom.toString())
      }
    },
    [setViewport],
  )

  // Handle node drag start - suppress autosave during drag
  const handleNodeDragStart = React.useCallback(() => {
    setDragging(true)
  }, [setDragging])

  // Handle node drag stop - allow autosave to proceed
  const handleNodeDragStop = React.useCallback(() => {
    setDragging(false)
  }, [setDragging])

  // Handle init
  const handleInit = React.useCallback((instance: ReactFlowInstance) => {
    instanceRef.current = instance
    // Set initial zoom CSS variable
    if (containerRef.current) {
      const vp = instance.getViewport()
      containerRef.current.style.setProperty('--rf-zoom', String(vp.zoom))
      lastZoomRef.current = vp.zoom
    }
    // Fit view after a short delay unless fullscreen restore takes over
    setTimeout(() => {
      if (hasRestoredFullscreen.current || nodesRef.current.length === 0) {
        return
      }

      try {
        const storedNodeId = window.localStorage.getItem(fullscreenStorageKey)
        if (storedNodeId && nodesRef.current.some((node) => node.id === storedNodeId)) {
          hasRestoredFullscreen.current = true
          maximizeNodeRef.current(storedNodeId)
          return
        }
      } catch {
        // Ignore storage errors
      }

      instance.fitView({ padding: 0.2, duration: 300 })
      if (containerRef.current) {
        const vp = instance.getViewport()
        containerRef.current.style.setProperty('--rf-zoom', String(vp.zoom))
        lastZoomRef.current = vp.zoom
      }
    }, 100)
  }, [fullscreenStorageKey])

  // Maximize node to fill viewport
  const maximizeNode = React.useCallback(
    (nodeId: string) => {
      if (!instanceRef.current || !containerRef.current) return

      const node = nodesRef.current.find((n) => n.id === nodeId)
      if (!node) return

      // Store current viewport to restore later (only on first maximize)
      if (!preMaximizeViewportRef.current) {
        preMaximizeViewportRef.current = instanceRef.current.getViewport()
      }

      // Store original node dimensions AND position (only if not already stored)
      if (!preMaximizeNodeStylesRef.current.has(nodeId)) {
        const measured = (node as any).measured as { width?: number; height?: number } | undefined
        preMaximizeNodeStylesRef.current.set(nodeId, {
          width: (node.style?.width as number) || measured?.width,
          height: (node.style?.height as number) || measured?.height,
          position: { ...node.position },
        })
      }

      // Get container dimensions
      const containerRect = containerRef.current.getBoundingClientRect()
      const containerWidth = containerRect.width
      const containerHeight = containerRect.height

      // Position viewport at origin since we'll move the node there
      const newViewport: Viewport = {
        x: 0,
        y: 0,
        zoom: 1,
      }

      // Update node with new dimensions, position at origin, and maximized state
      setNodes((currentNodes: RFNode[]) =>
        currentNodes.map((n) => ({
          ...n,
          selected: n.id === nodeId,
          // Move node to origin when maximized
          position: n.id === nodeId ? { x: 0, y: 0 } : n.position,
          data: {
            ...n.data,
            isMaximized: n.id === nodeId,
          },
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
      setMaximizedNodeState({ spaceId: activeSpaceId, nodeId })

      // Animate to the new viewport
      instanceRef.current.setViewport(newViewport, { duration: 300 })
      setViewport(newViewport)

      containerRef.current.style.setProperty('--rf-zoom', String(newViewport.zoom))
      lastZoomRef.current = newViewport.zoom
    },
    [activeSpaceId, setNodes, setViewport],
  )

  React.useEffect(() => {
    maximizeNodeRef.current = maximizeNode
  }, [maximizeNode])

  const restoreFullscreenState = React.useCallback(() => {
    if (hasRestoredFullscreen.current) return
    if (typeof window === 'undefined') return
    if (!instanceRef.current || !containerRef.current) return
    if (nodesRef.current.length === 0) return

    try {
      const storedNodeId = window.localStorage.getItem(fullscreenStorageKey)
      hasRestoredFullscreen.current = true
      if (!storedNodeId) return

      const nodeExists = nodesRef.current.some((n) => n.id === storedNodeId)
      if (!nodeExists) {
        window.localStorage.removeItem(fullscreenStorageKey)
        return
      }

      maximizeNode(storedNodeId)
    } catch {
      hasRestoredFullscreen.current = true
    }
  }, [fullscreenStorageKey, maximizeNode])

  // Restore fullscreen state once React Flow and nodes are both ready
  React.useEffect(() => {
    restoreFullscreenState()
  }, [nodes, restoreFullscreenState])

  // Handle fullscreen tab switching
  const handleTabClick = React.useCallback(
    (tabId: string) => {
      if (tabId !== maximizedNodeId) {
        maximizeNode(tabId)
      }
    },
    [maximizedNodeId, maximizeNode],
  )

  // Exit maximized mode
  const exitMaximizedMode = React.useCallback(() => {
    if (!maximizedNodeId || !instanceRef.current) return

    // Restore ALL nodes' original dimensions, positions, and clear isMaximized data
    setNodes((currentNodes: RFNode[]) =>
      currentNodes.map((n) => {
        const originalStyle = preMaximizeNodeStylesRef.current.get(n.id)
        if (originalStyle) {
          return {
            ...n,
            position: originalStyle.position,
            data: {
              ...n.data,
              isMaximized: false,
            },
            style: {
              ...n.style,
              width: originalStyle.width,
              height: originalStyle.height,
            },
          }
        }
        return {
          ...n,
          data: {
            ...n.data,
            isMaximized: false,
          },
        }
      }),
    )

    // Clear all stored dimensions
    preMaximizeNodeStylesRef.current.clear()

    // Restore previous viewport
    if (preMaximizeViewportRef.current) {
      instanceRef.current.setViewport(preMaximizeViewportRef.current, { duration: 300 })
      setViewport(preMaximizeViewportRef.current)

      if (containerRef.current) {
        containerRef.current.style.setProperty('--rf-zoom', String(preMaximizeViewportRef.current.zoom))
      }
      lastZoomRef.current = preMaximizeViewportRef.current.zoom
      preMaximizeViewportRef.current = null
    }

    setMaximizedNodeState(null)
  }, [maximizedNodeId, setNodes, setViewport])

  // Keep maximized node sized to container on resize
  React.useEffect(() => {
    if (!maximizedNodeId || !containerRef.current) return

    const container = containerRef.current

    let rafId: number | null = null
    const resizeObserver = new ResizeObserver((entries) => {
      if (rafId != null) cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => {
        rafId = null
        for (const entry of entries) {
          const { width, height } = entry.contentRect
          if (width === 0 || height === 0) continue

          // Update the maximized node dimensions to fill the container
          setNodes((currentNodes: RFNode[]) =>
            currentNodes.map((n) =>
              n.id === maximizedNodeId
                ? { ...n, style: { ...n.style, width, height } }
                : n,
            ),
          )

          // Ensure viewport stays at origin with zoom 1
          if (instanceRef.current) {
            instanceRef.current.setViewport({ x: 0, y: 0, zoom: 1 })
          }
        }
      })
    })

    resizeObserver.observe(container)
    return () => {
      resizeObserver.disconnect()
      if (rafId != null) cancelAnimationFrame(rafId)
    }
  }, [maximizedNodeId, setNodes])

  // Handle fullscreen tab reordering (reorder nodes in state)
  const handleReorderFullscreenTabs = React.useCallback(
    (reorderedTabs: { id: string; title: string; nodeType: string; shapeType?: string; isActive: boolean }[]) => {
      setNodes((currentNodes) => {
        const reorderedIds = reorderedTabs.map((t) => t.id)
        const placeholders = currentNodes.filter((n) => n.type === 'placeholder')
        const nonPlaceholders = currentNodes.filter((n) => n.type !== 'placeholder')

        // Build a map for quick lookup
        const nodeMap = new Map(nonPlaceholders.map((n) => [n.id, n]))

        // Reorder based on tab order
        const reordered = reorderedIds.map((id) => nodeMap.get(id)).filter(Boolean) as typeof currentNodes

        // Add any nodes not in the reordered list (shouldn't happen, but safety)
        const reorderedSet = new Set(reorderedIds)
        const remaining = nonPlaceholders.filter((n) => !reorderedSet.has(n.id))

        return [...reordered, ...remaining, ...placeholders]
      })
    },
    [setNodes],
  )

  // Handle fullscreen tab closing (delete node)
  const handleTabClose = React.useCallback(
    (tabId: string) => {
      // Get remaining nodes (excluding placeholder nodes and the one being closed)
      const remainingNodes = nodes.filter((n) => n.id !== tabId && n.type !== 'placeholder')

      // If this was the active tab, switch to another tab or exit fullscreen
      if (tabId === maximizedNodeId) {
        if (remainingNodes.length > 0) {
          // Switch to the next available node
          const nextNodeId = remainingNodes[0].id
          maximizeNode(nextNodeId)
        } else {
          // No more nodes, exit fullscreen
          exitMaximizedMode()
        }
      }

      // Delete the node
      removeNode(tabId)
    },
    [nodes, maximizedNodeId, maximizeNode, exitMaximizedMode, removeNode],
  )

  // Context menu handling
  const handleContextMenu = React.useCallback((event: React.MouseEvent) => {
    if (!instanceRef.current || !containerRef.current) return

    const flowPosition = instanceRef.current.screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    })

    setContextMenuPosition(flowPosition)
  }, [])

  const fitViewOptions = React.useMemo(() => ({ padding: 0.2 }), [])
  const proOptions = React.useMemo(() => ({ hideAttribution: true }), [])

  const handleCanvasContextMenu = React.useCallback(
    (e: React.MouseEvent) => {
      if (maximizedNodeId) {
        e.preventDefault()
        return
      }
      handleContextMenu(e)
    },
    [maximizedNodeId, handleContextMenu],
  )

  // Create node from context menu
  const handleCreateNode = React.useCallback(
    async (nodeType: string, label: string, extraData?: Record<string, unknown>) => {
      if (!contextMenuPosition) return

      try {
        const nodeId = await addNode(nodeType, contextMenuPosition, label, extraData)
        toast.success(`Created ${label}`)

        setRecentContextMenuItems((current) => {
          const key = makeHomeCanvasRecentContextMenuKey(nodeType, label, extraData)
          const menuText =
            nodeType === 'stickyNote' ? `Sticky Note (${label})` : nodeType === 'shape' ? `Shape (${label})` : label
          const next: RecentContextMenuItem[] = [
            { key, nodeType, label, menuText, ...(extraData ? { extraData } : {}) },
            ...current.filter((i) => i.key !== key),
          ].slice(0, HOME_CANVAS_RECENT_CONTEXT_MENU_MAX)
          writeHomeCanvasRecentContextMenu(next)
          return next
        })

        // Auto-focus the new node after a brief delay to let it render
        if (nodeId) {
          setTimeout(() => {
            window.dispatchEvent(
              new CustomEvent('canvas-node-focus', {
                detail: { id: nodeId },
              }),
            )
          }, 100)
        }
      } catch (err) {
        console.error('Failed to create node:', err)
        toast.error('Failed to create node')
      }
    },
    [contextMenuPosition, addNode],
  )

  // Handle drag over
  const handleDragOver = React.useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
    setIsDraggingOver(true)
  }, [])

  // Handle drag leave
  const handleDragLeave = React.useCallback((event: React.DragEvent) => {
    if (event.currentTarget === event.target) {
      setIsDraggingOver(false)
    }
  }, [])

  // Handle file drop
  const handleDrop = React.useCallback(
    async (event: React.DragEvent) => {
      event.preventDefault()
      setIsDraggingOver(false)

      if (!instanceRef.current || !containerRef.current) return

      const parseUriList = (raw: string): string[] =>
        raw
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter((l) => l.length > 0 && !l.startsWith('#'))

      const decodeFileUriToPath = (uri: string): string | null => {
        try {
          const u = new URL(uri)
          if (u.protocol !== 'file:') return null
          return decodeURIComponent(u.pathname)
        } catch {
          return null
        }
      }

      const filesPayload = event.dataTransfer.getData('application/x-filegraph-files')
      if (filesPayload) {
        try {
          const parsed = JSON.parse(filesPayload) as {
            items?: Array<{ path: string; name?: string; file_type?: string }>
          }
          const items = Array.isArray(parsed.items) ? parsed.items : []
          if (items.length > 0) {
            const cols = Math.max(1, Math.ceil(Math.sqrt(items.length)))
            const spacing = 48

            items.forEach((item, idx) => {
              const screenX = event.clientX + (idx % cols) * spacing
              const screenY = event.clientY + Math.floor(idx / cols) * spacing
              const position = instanceRef.current!.screenToFlowPosition({ x: screenX, y: screenY })
              if (item.file_type === 'folder') {
                addFolderNode(item.path, position)
              } else {
                const nodeId = addFileNode(item.path, position)
                applyIntrinsicMediaSizing(nodeId, item.path)
              }
            })

            toast.success(`Added ${items.length} item${items.length > 1 ? 's' : ''} to canvas`)
            return
          }
        } catch (err) {
          console.error('Failed to parse file data:', err)
        }
      }

      const fileData = event.dataTransfer.getData('application/x-filegraph-file')
      if (fileData) {
        try {
          const { path, name, file_type } = JSON.parse(fileData) as {
            path: string
            name?: string
            file_type?: string
          }
          const position = instanceRef.current.screenToFlowPosition({
            x: event.clientX,
            y: event.clientY,
          })

          if (file_type === 'folder') {
            addFolderNode(path, position)
            toast.success(`Added ${name ?? 'folder'} to canvas`)
          } else {
            const nodeId = addFileNode(path, position)
            applyIntrinsicMediaSizing(nodeId, path)
            toast.success(`Added ${name ?? 'file'} to canvas`)
          }
        } catch (err) {
          console.error('Failed to parse file data:', err)
        }
        return
      }

      const uriListRaw = event.dataTransfer.getData('text/uri-list')
      const uriList = uriListRaw ? parseUriList(uriListRaw) : []

      const plainText = event.dataTransfer.getData('text/plain')
      const plainLines = plainText
        ? plainText
            .split(/\r?\n/)
            .map((l) => l.trim())
            .filter(Boolean)
        : []
      const plainTextUrls = plainLines.filter((l) => /^https?:\/\//i.test(l))
      const plainTextPaths = plainLines
        .map((l) => {
          if (l.startsWith('file://')) return decodeFileUriToPath(l)
          if (l.startsWith('/')) return l
          return null
        })
        .filter((p): p is string => typeof p === 'string' && p.length > 0)

      const httpUrls = [...uriList.filter((u) => /^https?:\/\//i.test(u))]
      if (plainTextUrls.length > 0) httpUrls.push(...plainTextUrls)
      const uniqueHttpUrls = Array.from(new Set(httpUrls))

      const filePathsFromUriList = uriList
        .map((u) => decodeFileUriToPath(u))
        .filter((p): p is string => typeof p === 'string' && p.length > 0)

      const nativeFiles = Array.from(event.dataTransfer.files) as Array<File & { path?: string }>
      console.log('[HomeCanvas] Native files dropped:', nativeFiles.map(f => ({ name: f.name, type: f.type, path: f.path, size: f.size })))
      const filePathsFromNativeFiles = nativeFiles
        .map((f) => f.path)
        .filter((p): p is string => typeof p === 'string' && p.length > 0)
      console.log('[HomeCanvas] Extracted file paths:', filePathsFromNativeFiles)

      if (uniqueHttpUrls.length > 0) {
        const cols = Math.max(1, Math.ceil(Math.sqrt(uniqueHttpUrls.length)))
        const spacing = 56

        const extractVideoId = (url: string): string | null => {
          const watchMatch = url.match(/[?&]v=([^&]+)/)
          if (watchMatch) return watchMatch[1]

          const shortMatch = url.match(/youtu\.be\/([^?]+)/)
          if (shortMatch) return shortMatch[1]

          const embedMatch = url.match(/youtube\.com\/embed\/([^?]+)/)
          if (embedMatch) return embedMatch[1]

          const shortsMatch = url.match(/youtube\.com\/shorts\/([^?]+)/)
          if (shortsMatch) return shortsMatch[1]

          if (url.length === 11 && !url.includes('/') && !url.includes('?')) {
            return url
          }

          return null
        }

        await Promise.all(
          uniqueHttpUrls.map(async (url, idx) => {
            const screenX = event.clientX + (idx % cols) * spacing
            const screenY = event.clientY + Math.floor(idx / cols) * spacing
            const position = instanceRef.current!.screenToFlowPosition({ x: screenX, y: screenY })

            const isYouTube = /(?:youtube\.com|youtu\.be)/i.test(url)
            const videoId = isYouTube ? extractVideoId(url) : null

            const extractSpotifyInfo = (input: string): { type: string; id: string } | null => {
              const trackMatch = input.match(/spotify\.com\/track\/([^?]+)/)
              if (trackMatch) return { type: 'track', id: trackMatch[1] }

              const albumMatch = input.match(/spotify\.com\/album\/([^?]+)/)
              if (albumMatch) return { type: 'album', id: albumMatch[1] }

              const playlistMatch = input.match(/spotify\.com\/playlist\/([^?]+)/)
              if (playlistMatch) return { type: 'playlist', id: playlistMatch[1] }

              const artistMatch = input.match(/spotify\.com\/artist\/([^?]+)/)
              if (artistMatch) return { type: 'artist', id: artistMatch[1] }

              const episodeMatch = input.match(/spotify\.com\/episode\/([^?]+)/)
              if (episodeMatch) return { type: 'episode', id: episodeMatch[1] }

              const showMatch = input.match(/spotify\.com\/show\/([^?]+)/)
              if (showMatch) return { type: 'show', id: showMatch[1] }

              return null
            }

            const isSpotify = /spotify\.com/i.test(url)
            const spotifyInfo = isSpotify ? extractSpotifyInfo(url) : null

            if (isYouTube && videoId) {
              await addNode('youtube', position, 'YouTube', { url, videoId, title: 'YouTube', provider: 'youtube' })
            } else if (isSpotify && spotifyInfo) {
              await addNode('spotify', position, 'Spotify', {
                url,
                spotifyId: spotifyInfo.id,
                spotifyType: spotifyInfo.type,
                title: 'Spotify',
                provider: 'spotify',
              })
            } else {
              let label = 'Web'
              try {
                label = new URL(url).hostname.replace(/^www\./, '') || 'Web'
              } catch {
                // ignore
              }

              await addNode('embed', position, label, { url, title: 'Web' })
            }
          }),
        )

        toast.success(`Added ${uniqueHttpUrls.length} link${uniqueHttpUrls.length > 1 ? 's' : ''} to canvas`)
        return
      }

      const droppedPaths = Array.from(
        new Set([...filePathsFromUriList, ...filePathsFromNativeFiles, ...plainTextPaths]),
      )
      if (droppedPaths.length > 0) {
        const { invoke } = await import('@tauri-apps/api/core')

        const isDirectory = async (path: string): Promise<boolean> => {
          try {
            await invoke('list_directory', { path })
            return true
          } catch {
            return false
          }
        }

        const infos = await Promise.all(droppedPaths.map(async (path) => ({ path, isDir: await isDirectory(path) })))

        const cols = Math.max(1, Math.ceil(Math.sqrt(infos.length)))
        const spacing = 48

        infos.forEach((item, idx) => {
          const screenX = event.clientX + (idx % cols) * spacing
          const screenY = event.clientY + Math.floor(idx / cols) * spacing
          const position = instanceRef.current!.screenToFlowPosition({ x: screenX, y: screenY })

          if (item.isDir) {
            addFolderNode(item.path, position)
          } else {
            const nodeId = addFileNode(item.path, position)
            applyIntrinsicMediaSizing(nodeId, item.path)
          }
        })

        toast.success(`Added ${infos.length} item${infos.length > 1 ? 's' : ''} to canvas`)
        return
      }

      // Handle calendar event drops (from CalendarNode)
      const eventData = event.dataTransfer.getData('application/x-filegraph-event')
      if (eventData) {
        try {
          const calendarEvent = JSON.parse(eventData)
          const position = instanceRef.current.screenToFlowPosition({
            x: event.clientX,
            y: event.clientY,
          })

          // Create an event node with the calendar event data
          void addNode('event', position, calendarEvent.name || 'Event', { event: calendarEvent })
          toast.success(`Added "${calendarEvent.name || 'event'}" to canvas`)
        } catch (err) {
          console.error('Failed to parse event data:', err)
        }
        return
      }

      // Handle native file drops
      const files = Array.from(event.dataTransfer.files)
      if (files.length > 0) {
        // For now, just show a message - native files would need to be copied
        toast.info('Drag files from the workspace to add them')
      }
    },
    [addFileNode, addFolderNode, addNode],
  )

  // Listen for file selection from sidebar to update empty file nodes
  React.useEffect(() => {
    const handleSidebarFileSelect = async (event: Event) => {
      const customEvent = event as CustomEvent<{ filePath: string; nodeId?: string }>
      const { filePath, nodeId } = customEvent.detail || {}

      if (!filePath || !nodeId) return

      // Find the empty file node that requested this sidebar opening
      const emptyFileNode = nodesRef.current.find(
        (n) => n.type === 'filePreview' && !(n.data as any)?.filePath && !(n.data as any)?.file,
      )

      if (emptyFileNode && emptyFileNode.id === nodeId) {
        // Update the empty file node with the selected file
        setNodes((currentNodes) =>
          currentNodes.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, filePath, file: filePath } } : n)),
        )
      }
    }

    window.addEventListener('canvas-open-sidebar', handleSidebarFileSelect)
    return () => window.removeEventListener('canvas-open-sidebar', handleSidebarFileSelect)
  }, [setNodes, nodesRef])

  // Node close handler
  React.useEffect(() => {
    const handleNodeClose = (event: Event) => {
      const customEvent = event as CustomEvent<{ id?: string }>
      const nodeId = customEvent.detail?.id
      if (nodeId) {
        removeNode(nodeId)
      }
    }

    window.addEventListener('canvas-node-close', handleNodeClose)
    return () => window.removeEventListener('canvas-node-close', handleNodeClose)
  }, [removeNode])

  // Node maximize handler (triggered by double-click on node header)
  React.useEffect(() => {
    const handleNodeMaximize = (event: Event) => {
      const customEvent = event as CustomEvent<{ id?: string }>
      const nodeId = customEvent.detail?.id
      if (nodeId) {
        if (maximizedNodeId === nodeId) {
          exitMaximizedMode()
        } else {
          maximizeNode(nodeId)
        }
      }
    }

    window.addEventListener('canvas-node-maximize', handleNodeMaximize)
    return () => window.removeEventListener('canvas-node-maximize', handleNodeMaximize)
  }, [maximizedNodeId, maximizeNode, exitMaximizedMode])

  // Sidebar file click handler — adds file node to canvas and focuses/maximizes it
  React.useEffect(() => {
    const handleSidebarFileClick = (event: Event) => {
      const { path } = (event as CustomEvent<{ path: string; name: string }>).detail || {}
      if (!path) return

      // Check if a node for this file already exists on the canvas
      const existingNode = nodesRef.current.find(
        (n) => n.data?.file === path || n.data?.filePath === path,
      )

      if (existingNode) {
        // File already on canvas — just focus or maximize it
        if (maximizedNodeId) {
          maximizeNode(existingNode.id)
        } else if (instanceRef.current) {
          instanceRef.current.fitView({ nodes: [existingNode], padding: 0.5, duration: 400, maxZoom: 1.5 })
        }
        return
      }

      // Calculate viewport center for the new node position
      const containerRect = containerRef.current?.getBoundingClientRect()
      const centerX = containerRect ? containerRect.left + containerRect.width / 2 : 400
      const centerY = containerRect ? containerRect.top + containerRect.height / 2 : 300
      const jitterX = (Math.random() - 0.5) * 60
      const jitterY = (Math.random() - 0.5) * 60
      const position = instanceRef.current
        ? instanceRef.current.screenToFlowPosition({ x: centerX + jitterX, y: centerY + jitterY })
        : { x: jitterX, y: jitterY }

      const nodeId = addFileNode(path, position)

      // Wait a tick for React to render the new node before focusing
      setTimeout(() => {
        const currentNodes = useHomeCanvasStore.getState().nodes
        const newNode = currentNodes.find((n) => n.id === nodeId)

        if (newNode) {
          if (maximizedNodeId) {
            maximizeNode(nodeId)
          } else if (instanceRef.current) {
            instanceRef.current.fitView({ nodes: [newNode], padding: 0.5, duration: 400, maxZoom: 1.5 })
          }
        }
      }, 50)
    }

    window.addEventListener('canvas-sidebar-file-click', handleSidebarFileClick)
    return () => window.removeEventListener('canvas-sidebar-file-click', handleSidebarFileClick)
  }, [maximizedNodeId, maximizeNode, addFileNode])

  // Node details handler (triggered by info button in toolbar)
  React.useEffect(() => {
    const handleNodeDetails = (event: Event) => {
      const customEvent = event as CustomEvent<{ id?: string }>
      const nodeId = customEvent.detail?.id
      if (nodeId) {
        const node = nodesRef.current.find((n) => n.id === nodeId)
        if (node) {
          setDetailsSheetNode(node)
          setDetailsSheetOpen(true)
        }
      }
    }

    window.addEventListener('canvas-node-details', handleNodeDetails)
    return () => window.removeEventListener('canvas-node-details', handleNodeDetails)
  }, [])

  // Node resize handler (triggered by auto-sizing nodes like tables)
  React.useEffect(() => {
    const handleNodeResize = (event: Event) => {
      const customEvent = event as CustomEvent<{ id?: string; width?: number; height?: number }>
      const { id: nodeId, width, height } = customEvent.detail || {}
      if (nodeId && (width || height)) {
        setNodes((currentNodes) =>
          currentNodes.map((n) =>
            n.id === nodeId
              ? {
                  ...n,
                  style: {
                    ...n.style,
                    // For auto-sizing nodes, we set exact dimensions
                    width,
                    height,
                  },
                }
              : n,
          ),
        )
      }
    }

    window.addEventListener('canvas-node-resize', handleNodeResize)
    return () => window.removeEventListener('canvas-node-resize', handleNodeResize)
  }, [setNodes])

  // Fit view handler - triggered when switching spaces or creating new spaces
  React.useEffect(() => {
    const handleFitView = () => {
      if (instanceRef.current) {
        instanceRef.current.fitView({ padding: 0.2, duration: 400 })
      }
    }

    window.addEventListener('canvas-fit-view', handleFitView)
    return () => window.removeEventListener('canvas-fit-view', handleFitView)
  }, [])

  // Placeholder node selection handler - transforms placeholder into selected node type
  React.useEffect(() => {
    const handlePlaceholderSelect = async (event: Event) => {
      const customEvent = event as CustomEvent<{ nodeId: string; nodeType: string }>
      const { nodeId, nodeType } = customEvent.detail || {}
      if (!nodeId || !nodeType) return

      // Find the placeholder node
      const placeholderNode = nodesRef.current.find((n) => n.id === nodeId)
      if (!placeholderNode || placeholderNode.type !== 'placeholder') return

      // Get the placeholder's position and dimensions
      const position = placeholderNode.position
      const measured = (placeholderNode as any).measured as { width?: number; height?: number } | undefined
      const width = (placeholderNode.style?.width as number) || measured?.width || 200
      const height = (placeholderNode.style?.height as number) || measured?.height || 150

      // Remove the placeholder node
      await removeNode(nodeId)

      // Create the new node at the same position with the same dimensions
      const newNodeId = await addNode(nodeType, position, nodeType.charAt(0).toUpperCase() + nodeType.slice(1))

      // Update the new node's dimensions to match the placeholder
      if (newNodeId) {
        updateNodeDimensions(newNodeId, { width, height })
      }

      toast.success(`Created ${nodeType} node`)
    }

    window.addEventListener('placeholder-node-select', handlePlaceholderSelect)
    return () => window.removeEventListener('placeholder-node-select', handlePlaceholderSelect)
  }, [addNode, removeNode, updateNodeDimensions])

  React.useEffect(() => {
    const handleNodeUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<{ id?: string; data?: Record<string, unknown> }>
      const nodeId = customEvent.detail?.id
      const nextData = customEvent.detail?.data
      if (!nodeId || !nextData) return

      setNodes((currentNodes) =>
        currentNodes.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...nextData } } : n)),
      )
    }

    window.addEventListener('canvas-node-update', handleNodeUpdate)
    return () => window.removeEventListener('canvas-node-update', handleNodeUpdate)
  }, [setNodes])

  // Node focus handler - smoothly zoom and center on a node when entering edit mode
  React.useEffect(() => {
    const handleNodeFocus = (event: Event) => {
      const customEvent = event as CustomEvent<{ id?: string }>
      const nodeId = customEvent.detail?.id

      if (!nodeId || !instanceRef.current) return

      // Select the focused node (deselect all others) so it renders highlighted
      setNodes((prev) => prev.map((n) => ({ ...n, selected: n.id === nodeId })))

      // Wrap fitView in rAF so ReactFlow has measured the node's DOM bounds
      requestAnimationFrame(() => {
        if (!instanceRef.current) return
        instanceRef.current.fitView({
          nodes: [{ id: nodeId }],
          padding: 0.2,
          maxZoom: 1.2,
          duration: 400,
        })
      })
    }

    window.addEventListener('canvas-node-focus', handleNodeFocus)
    return () => window.removeEventListener('canvas-node-focus', handleNodeFocus)
  }, [setNodes])

  // Fullscreen toggle handler - agent can maximize/minimize nodes via tool calls
  React.useEffect(() => {
    const handleToggleFullscreen = (event: Event) => {
      const customEvent = event as CustomEvent<{ nodeId?: string; action?: 'maximize' | 'minimize' | 'toggle' }>
      const { nodeId, action = 'toggle' } = customEvent.detail ?? {}

      if (action === 'minimize') {
        exitMaximizedMode()
        return
      }

      if (action === 'maximize' && nodeId) {
        maximizeNode(nodeId)
        return
      }

      // toggle: if this node is already maximized, exit; otherwise maximize it
      if (nodeId) {
        if (maximizedNodeId === nodeId) {
          exitMaximizedMode()
        } else {
          maximizeNode(nodeId)
        }
      } else {
        // No nodeId: toggle current state
        if (maximizedNodeId) {
          exitMaximizedMode()
        }
      }
    }

    window.addEventListener('canvas-toggle-fullscreen', handleToggleFullscreen)
    return () => window.removeEventListener('canvas-toggle-fullscreen', handleToggleFullscreen)
  }, [maximizedNodeId, maximizeNode, exitMaximizedMode])

  // Entity link click handler - creates entity card nodes on canvas
  React.useEffect(() => {
    const handleEntityClick = async (event: Event) => {
      const customEvent = event as CustomEvent<{ entityId: string }>
      const entityId = customEvent.detail?.entityId

      if (!entityId || !instanceRef.current) return

      const [namespace] = entityId.split(':')

      // Only handle person entities for now
      if (namespace === 'person') {
        try {
          await addPersonNodeFromEntityId(entityId)
        } catch (err) {
          console.error('Failed to add person node:', err)
          toast.error('Failed to add person card')
        }
      }
    }

    window.addEventListener('canvas-entity-click', handleEntityClick)
    return () => window.removeEventListener('canvas-entity-click', handleEntityClick)
  }, [addPersonNodeFromEntityId])

  // EntityLink dispatches filegraph:navigate; translate person:* into a person node on the home canvas.
  React.useEffect(() => {
    const handleNavigate = async (event: Event) => {
      const customEvent = event as CustomEvent<{ target?: string }>
      const target = customEvent.detail?.target
      if (!target || typeof target !== 'string') return

      const [namespace] = target.split(':')
      if (namespace !== 'person') return

      try {
        await addPersonNodeFromEntityId(target)
      } catch (err) {
        console.error('Failed to add person node from navigate:', err)
        toast.error('Failed to add person card')
      }
    }

    document.addEventListener('filegraph:navigate', handleNavigate)
    return () => document.removeEventListener('filegraph:navigate', handleNavigate)
  }, [addPersonNodeFromEntityId])

  // Canvas toolbar callbacks
  const handleCustomLayout = React.useCallback(() => {
    setLayoutMode('custom')
    toast.message('Custom layout is active')
  }, [])

  const handleAutoLayout = React.useCallback((direction: LayoutDirection) => {
    if (direction !== 'LR' && direction !== 'TB') {
      setLayoutMode('TB')
    } else {
      setLayoutMode(direction)
    }

    if (instanceRef.current) {
      window.requestAnimationFrame(() => {
        instanceRef.current?.fitView({ padding: 0.2, duration: 400 })
      })
    }

    toast.success(`Applied ${direction === 'LR' ? 'Left→Right' : 'Top→Bottom'} projection`)
  }, [])

  const handleGridLayout = React.useCallback(() => {
    setLayoutMode('grid')

    if (instanceRef.current) {
      window.requestAnimationFrame(() => {
        instanceRef.current?.fitView({ padding: 0.2, duration: 400 })
      })
    }

    toast.success('Applied Grid projection')
  }, [])

  const handleAlign = React.useCallback(
    (alignment: AlignmentType) => {
      if (!isCustomLayout) {
        toast.message('Switch to Custom to edit layout')
        return
      }

      const currentNodes = nodesRef.current
      const currentEdges = edgesRef.current
      const alignedNodes = alignNodes(currentNodes, alignment)

      pushSnapshotToHistory(
        `Align ${alignment}`,
        { nodes: currentNodes, edges: currentEdges },
        { nodes: alignedNodes, edges: currentEdges },
      )

      setNodes(alignedNodes)
      toast.success(`Aligned ${alignment}`)
    },
    [isCustomLayout, setNodes, pushSnapshotToHistory],
  )

  const handleDistribute = React.useCallback(
    (distribution: DistributionType) => {
      if (!isCustomLayout) {
        toast.message('Switch to Custom to edit layout')
        return
      }

      const currentNodes = nodesRef.current
      const currentEdges = edgesRef.current
      const distributedNodes = distributeNodes(currentNodes, distribution)

      pushSnapshotToHistory(
        `Distribute ${distribution}`,
        { nodes: currentNodes, edges: currentEdges },
        { nodes: distributedNodes, edges: currentEdges },
      )

      setNodes(distributedNodes)
      toast.success(`Distributed ${distribution}ly`)
    },
    [isCustomLayout, setNodes, pushSnapshotToHistory],
  )

  // Get viewport center for paste positioning
  const getViewportCenter = React.useCallback(() => {
    const vp = instanceRef.current?.getViewport()
    const containerRect = containerRef.current?.getBoundingClientRect()
    if (!vp || !containerRect) {
      return { x: 400, y: 300 }
    }
    return {
      x: (-vp.x + containerRect.width / 2) / vp.zoom,
      y: (-vp.y + containerRect.height / 2) / vp.zoom,
    }
  }, [])

  // Clipboard handling with system clipboard integration
  const { handleCopy, handlePaste, handleCut } = useCanvasClipboard({
    addNode,
    addFileNode,
    addFolderNode,
    getViewportCenter,
    setNodes,
    setEdges,
    nodesRef,
    edgesRef,
    pushSnapshotToHistory,
  })

  const handleGroup = React.useCallback(() => {
    const selectedNodes = nodes.filter((n) => n.selected)
    if (selectedNodes.length < 2) {
      toast.info('Select at least 2 nodes to create a group')
      return
    }

    try {
      const before = { nodes: nodesRef.current, edges: edgesRef.current }
      const selectedIds = selectedNodes.map((n) => n.id)
      createGroup(selectedIds)
      const after = useHomeCanvasStore.getState()
      toast.success(`Created group with ${selectedIds.length} nodes`)
      pushSnapshotToHistory(`Group ${selectedIds.length} nodes`, before, { nodes: after.nodes, edges: after.edges })
    } catch (err) {
      toast.error((err as Error).message)
    }
  }, [createGroup, nodes, pushSnapshotToHistory])

  const handleUngroup = React.useCallback(() => {
    const selectedNodes = nodes.filter((n) => n.selected)
    const selectedIds = new Set(selectedNodes.map((n) => n.id))

    const before = { nodes: nodesRef.current, edges: edgesRef.current }

    const groupIdsToUngroup = new Set<string>()

    // If any selected node is a child of a group, ungroup its parent
    selectedNodes.forEach((n) => {
      if (n.parentId) groupIdsToUngroup.add(n.parentId)
    })

    // Find groups that contain any of the selected nodes
    groups.forEach((g: { id: string; nodeIds: string[] }) => {
      if (selectedIds.has(g.id)) {
        groupIdsToUngroup.add(g.id)
        return
      }
      if (g.nodeIds.some((id: string) => selectedIds.has(id))) {
        groupIdsToUngroup.add(g.id)
      }
    })

    const groupsToUngroup = groups.filter((g: { id: string }) => groupIdsToUngroup.has(g.id))

    if (groupsToUngroup.length > 0) {
      groupsToUngroup.forEach((g: { id: string }) => {
        ungroup(g.id)
      })
      toast.success(`Ungrouped ${groupsToUngroup.length} group${groupsToUngroup.length > 1 ? 's' : ''}`)

      const after = useHomeCanvasStore.getState()
      pushSnapshotToHistory(`Ungroup ${groupsToUngroup.length} group${groupsToUngroup.length > 1 ? 's' : ''}`, before, {
        nodes: after.nodes,
        edges: after.edges,
      })
    } else {
      toast.info('No groups found among selected nodes')
    }
  }, [groups, nodes, ungroup, pushSnapshotToHistory])

  const handleDeleteSelected = React.useCallback(() => {
    const currentNodes = nodesRef.current
    const currentEdges = edgesRef.current
    const selectedNodeIds = new Set(currentNodes.filter((n) => n.selected).map((n) => n.id))

    if (selectedNodeIds.size === 0) return

    const newNodes = currentNodes.filter((n) => !n.selected)
    const newEdges = currentEdges.filter((e) => !selectedNodeIds.has(e.source) && !selectedNodeIds.has(e.target))

    pushSnapshotToHistory(
      'Delete nodes',
      { nodes: currentNodes, edges: currentEdges },
      { nodes: newNodes, edges: newEdges },
    )
    setNodes(newNodes)
    setEdges(newEdges)
    toast.success(`Deleted ${selectedNodeIds.size} node${selectedNodeIds.size > 1 ? 's' : ''}`)
  }, [setNodes, setEdges, pushSnapshotToHistory])

  // Selected count for toolbar
  const selectedCount = React.useMemo(() => getSelectedCount(nodes), [nodes])
  const clipboardCount = getClipboardCount()

  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey

      // Don't handle shortcuts when typing in inputs
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return
      }

      // Escape - Exit maximized mode or dismiss placeholder nodes
      if (e.key === 'Escape') {
        if (maximizedNodeId) {
          e.preventDefault()
          exitMaximizedMode()
          return
        }
        // Dismiss any selected placeholder nodes
        const placeholderNodes = nodesRef.current.filter((n) => n.type === 'placeholder' && n.selected)
        if (placeholderNodes.length > 0) {
          e.preventDefault()
          setNodes((currentNodes) => currentNodes.filter((n) => n.type !== 'placeholder' || !n.selected))
          return
        }
      }

      // Cmd+S - Save
      if (isMod && e.key === 's') {
        e.preventDefault()
        save()
        toast.success('Saved')
        return
      }

      // Cmd+Z - Undo
      if (isMod && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        applyHistoryAction(undo(), 'undo')
        return
      }

      // Cmd+Shift+Z - Redo
      if (isMod && e.key === 'z' && e.shiftKey) {
        e.preventDefault()
        applyHistoryAction(redo(), 'redo')
        return
      }

      // Cmd+C - Copy
      if (isMod && e.key === 'c') {
        handleCopy()
        return
      }

      // Cmd+V - Paste is handled by the paste event listener in useCanvasClipboard
      // Don't intercept here - let the native paste event fire

      // Cmd+X - Cut
      if (isMod && e.key === 'x') {
        handleCut()
        return
      }

      // Cmd+A - Select all
      if (isMod && e.key === 'a') {
        e.preventDefault()
        setNodes((currentNodes) => currentNodes.map((n) => ({ ...n, selected: true })))
        return
      }

      // Cmd+G - Group selected nodes
      if (isMod && e.key === 'g' && !e.shiftKey) {
        e.preventDefault()
        const selectedNodes = nodes.filter((n) => n.selected)
        if (selectedNodes.length >= 2) {
          try {
            const selectedIds = selectedNodes.map((n) => n.id)
            createGroup(selectedIds)
            toast.success(`Created group with ${selectedIds.length} nodes`)
          } catch (err) {
            toast.error((err as Error).message)
          }
        } else {
          toast.info('Select at least 2 nodes to create a group')
        }
        return
      }

      // Cmd+Shift+G - Ungroup selected nodes
      if (isMod && e.key === 'g' && e.shiftKey) {
        e.preventDefault()
        const selectedNodes = nodes.filter((n) => n.selected)
        const selectedIds = new Set(selectedNodes.map((n) => n.id))

        // Find groups that contain any of the selected nodes
        const groupsToUngroup = groups.filter((g: { nodeIds: string[] }) =>
          g.nodeIds.some((id: string) => selectedIds.has(id)),
        )

        if (groupsToUngroup.length > 0) {
          groupsToUngroup.forEach((g: { id: string }) => {
            ungroup(g.id)
          })
          toast.success(`Ungrouped ${groupsToUngroup.length} group${groupsToUngroup.length > 1 ? 's' : ''}`)
        } else {
          toast.info('No groups found among selected nodes')
        }
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    applyHistoryAction,
    exitMaximizedMode,
    groups,
    handleCopy,
    handleCut,
    maximizedNodeId,
    nodes,
    redo,
    save,
    setNodes,
    undo,
  ])

  React.useEffect(() => {
    return () => {
      if (historyTimeoutRef.current) {
        clearTimeout(historyTimeoutRef.current)
      }
      if (zoomIndicatorTimeoutRef.current) {
        clearTimeout(zoomIndicatorTimeoutRef.current)
      }
    }
  }, [])

  // Command palette event handlers
  React.useEffect(() => {
    const handleCreateNode = async (event: Event) => {
      const customEvent = event as CustomEvent<{ nodeType?: string }>
      const nodeType = customEvent.detail?.nodeType
      if (!nodeType) return

      // Get viewport center for node placement
      const vp = instanceRef.current?.getViewport()
      const containerRect = containerRef.current?.getBoundingClientRect()
      if (!vp || !containerRect) return

      const centerX = (-vp.x + containerRect.width / 2) / vp.zoom
      const centerY = (-vp.y + containerRect.height / 2) / vp.zoom

      try {
        const nodeId = await addNode(nodeType, { x: centerX, y: centerY }, nodeType)
        toast.success(`Created ${nodeType}`)
        if (nodeId) {
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('canvas-node-focus', { detail: { id: nodeId } }))
          }, 100)
        }
      } catch (err) {
        toast.error(`Failed to create ${nodeType}`)
      }
    }

    const handleAutoLayoutCmd = () => {
      setLayoutMode('TB')
      if (instanceRef.current) {
        window.requestAnimationFrame(() => {
          instanceRef.current?.fitView({ padding: 0.2, duration: 400 })
        })
      }
      toast.success('Applied Top→Bottom projection')
    }

    const handleGridLayoutCmd = () => {
      setLayoutMode('grid')
      if (instanceRef.current) {
        window.requestAnimationFrame(() => {
          instanceRef.current?.fitView({ padding: 0.2, duration: 400 })
        })
      }
      toast.success('Applied Grid projection')
    }

    const handleAlignNodesCmd = (event: Event) => {
      const customEvent = event as CustomEvent<{ alignment?: string }>
      const alignment = customEvent.detail?.alignment as AlignmentType
      if (alignment) handleAlign(alignment)
    }

    const handleDistributeNodesCmd = (event: Event) => {
      const customEvent = event as CustomEvent<{ direction?: string }>
      const direction = customEvent.detail?.direction as DistributionType
      if (direction) handleDistribute(direction)
    }

    const handleGroupNodesCmd = () => handleGroup()
    const handleUngroupNodesCmd = () => handleUngroup()

    const handleAddSourcesToCanvas = async (event: Event) => {
      const customEvent = event as CustomEvent<{ sources: Array<{ url?: string; title?: string }> }>
      const sources = customEvent.detail?.sources || []
      if (sources.length === 0) return

      // Filter valid sources
      const validSources = sources.filter((s) => s.url)
      if (validSources.length === 0) return

      // Layout configuration - compact nodes with generous spacing
      const nodeWidth = 280
      const nodeHeight = 200
      const gapX = 40 // Horizontal gap between nodes
      const gapY = 40 // Vertical gap between nodes
      const existingGap = 80 // Gap below existing content

      // Calculate square grid dimensions
      const cols = Math.ceil(Math.sqrt(validSources.length))
      const gridWidth = cols * nodeWidth + (cols - 1) * gapX

      // Find empty space below all existing nodes so new nodes never overlap
      const existingNodes = nodesRef.current
      let baseX: number
      let baseY: number

      if (existingNodes.length === 0) {
        // Empty canvas - use viewport center
        const vp = instanceRef.current?.getViewport()
        const containerRect = containerRef.current?.getBoundingClientRect()
        let centerX = 0
        let centerY = 0
        if (vp && containerRect) {
          centerX = (-vp.x + containerRect.width / 2) / vp.zoom
          centerY = (-vp.y + containerRect.height / 2) / vp.zoom
        }
        baseX = centerX - gridWidth / 2
        baseY = centerY
      } else {
        // Compute bounding box of all existing nodes
        let minX = Infinity
        let maxX = -Infinity
        let maxBottomY = -Infinity

        for (const n of existingNodes) {
          const x = n.position.x
          const y = n.position.y
          const w = (n as any).measured?.width ?? (n as any).width ?? nodeWidth
          const h = (n as any).measured?.height ?? (n as any).height ?? nodeHeight
          if (x < minX) minX = x
          if (x + w > maxX) maxX = x + w
          if (y + h > maxBottomY) maxBottomY = y + h
        }

        // Center new grid horizontally over existing content, place it below
        const existingCenterX = (minX + maxX) / 2
        baseX = existingCenterX - gridWidth / 2
        baseY = maxBottomY + existingGap
      }

      const addedNodeIds: string[] = []

      for (let i = 0; i < validSources.length; i++) {
        const source = validSources[i]
        if (!source.url) continue

        const col = i % cols
        const row = Math.floor(i / cols)
        const x = baseX + col * (nodeWidth + gapX)
        const y = baseY + row * (nodeHeight + gapY)

        const hostname = new URL(source.url).hostname
        const nodeId = await addNode('embed', { x, y }, source.title || hostname, {
          url: source.url,
          title: source.title || hostname,
        })

        // Resize the node to our compact dimensions
        updateNodeDimensions(nodeId, { width: nodeWidth, height: nodeHeight })
        addedNodeIds.push(nodeId)
      }

      toast.success(`Added ${validSources.length} source${validSources.length !== 1 ? 's' : ''} to canvas`)

      // Auto-zoom to the newly added nodes after React has flushed the state update
      if (addedNodeIds.length > 0 && instanceRef.current) {
        setTimeout(() => {
          instanceRef.current?.fitView({
            nodes: addedNodeIds.map((id) => ({ id })),
            padding: 0.3,
            duration: 600,
          })
        }, 50)
      }
    }

    window.addEventListener('canvas-create-node', handleCreateNode)
    window.addEventListener('canvas-auto-layout', handleAutoLayoutCmd)
    window.addEventListener('canvas-grid-layout', handleGridLayoutCmd)
    window.addEventListener('canvas-align-nodes', handleAlignNodesCmd)
    window.addEventListener('canvas-distribute-nodes', handleDistributeNodesCmd)
    window.addEventListener('canvas-group-nodes', handleGroupNodesCmd)
    window.addEventListener('canvas-ungroup-nodes', handleUngroupNodesCmd)
    window.addEventListener('agent:add-sources-to-canvas', handleAddSourcesToCanvas)

    return () => {
      window.removeEventListener('canvas-create-node', handleCreateNode)
      window.removeEventListener('canvas-auto-layout', handleAutoLayoutCmd)
      window.removeEventListener('canvas-grid-layout', handleGridLayoutCmd)
      window.removeEventListener('canvas-align-nodes', handleAlignNodesCmd)
      window.removeEventListener('canvas-distribute-nodes', handleDistributeNodesCmd)
      window.removeEventListener('canvas-group-nodes', handleGroupNodesCmd)
      window.removeEventListener('canvas-ungroup-nodes', handleUngroupNodesCmd)
      window.removeEventListener('agent:add-sources-to-canvas', handleAddSourcesToCanvas)
    }
  }, [addNode, handleAlign, handleDistribute, handleGroup, handleUngroup, setLayoutMode, updateNodeDimensions])

  if (isLoading) {
    return (
      <div className={cn('h-full w-full flex items-center justify-center', className)}>
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className={cn('h-full w-full flex items-center justify-center', className)}>
        <div className="text-center">
          <p className="text-destructive mb-2">Failed to load canvas</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('h-full w-full relative', className)}>
      <div
        ref={containerRef}
        className="h-full w-full relative"
        style={{
          cursor: isDrawingMode
            ? 'url(\'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>\') 0 24, auto'
            : 'default',
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}>
        {/* Floating sidebar toggle — visible when not in fullscreen mode */}
        {!maximizedNodeId && (
          <div className="absolute top-3 left-3 z-10">
            <Button
              variant="outline"
              size="icon"
              onClick={toggleGlobalSidebar}
              className="h-7 w-7 rounded-lg bg-background/80 backdrop-blur-sm border-border/50 text-muted-foreground hover:text-foreground shadow-sm"
              aria-label={globalSidebarOpen ? 'Hide sidebar' : 'Show sidebar'}>
              {globalSidebarOpen
                ? <PanelLeftClose className="h-3.5 w-3.5" />
                : <PanelLeftOpen className="h-3.5 w-3.5" />}
            </Button>
          </div>
        )}

        {/* Fullscreen Tabs - show when in fullscreen mode */}
        {maximizedNodeId && fullscreenTabs.length > 0 && (
        <FullscreenTabs
          tabs={fullscreenTabs}
          activeTabId={maximizedNodeId}
          onTabClick={handleTabClick}
          onTabClose={handleTabClose}
          onReorderTabs={handleReorderFullscreenTabs}
          onExit={exitMaximizedMode}
        />
      )}

      <ContextMenu>
        <ContextMenuTrigger asChild disabled={!!maximizedNodeId}>
          <div
            className="absolute inset-0"
            onContextMenu={handleCanvasContextMenu}
            onMouseDown={handleSelectionStart}
            onMouseUp={handleSelectionEnd}>
            <ReactFlow
              nodes={nodesForRender}
              edges={edges}
              nodeTypes={nodeTypes}
              onInit={handleInit}
              onKeyDownCapture={(e) => { if (e.key.startsWith('Arrow')) e.stopPropagation() }}
              nodesDraggable={!maximizedNodeId && isCustomLayout && !isDrawingMode && !isShapesTool}
              nodesConnectable={!maximizedNodeId && !isDrawingMode && !isShapesTool}
              elementsSelectable={!maximizedNodeId && !isDrawingMode && !isShapesTool}
              onNodesChange={handleNodesChange}
              onEdgesChange={handleEdgesChange}
              onConnect={handleConnect}
              onMove={handleMove}
              onMoveEnd={handleMoveEnd}
              onNodeDragStart={handleNodeDragStart}
              onNodeDragStop={handleNodeDragStop}
              onPaneClick={handlePaneClick}
              onNodeClick={handleNodeClick}
              onNodeMouseEnter={handleNodeMouseEnter}
              onNodeMouseLeave={handleNodeMouseLeave}
              // Figma-like gestures: scroll to pan, pinch to zoom, drag to select
              // Disable all canvas navigation when a node is maximized (fullscreen)
              // Disable pan when hovering selected embed nodes at zoom >= 50% to allow iframe scrolling
              panOnDrag={false}
              panOnScroll={!maximizedNodeId && !shouldDisablePanForEmbed}
              zoomOnPinch={!maximizedNodeId}
              zoomOnScroll={!maximizedNodeId}
              zoomOnDoubleClick={!maximizedNodeId}
              selectNodesOnDrag={true}
              selectionOnDrag={!isDrawingMode && !isShapesTool}
              multiSelectionKeyCode="Shift"
              fitView
              fitViewOptions={fitViewOptions}
              minZoom={0.05}
              maxZoom={4}
              defaultViewport={viewport}
              deleteKeyCode={maximizedNodeId ? [] : ['Backspace', 'Delete']}
              className={`home-canvas-flow border rounded-xl ${maximizedNodeId ? 'canvas-maximized-mode' : ''} ${hasSelectedNode ? 'has-selection' : ''}`}
              proOptions={proOptions}>
              <Background
                variant={BackgroundVariant.Dots}
                gap={16}
                size={2}
                color="var(--border)"
                className="bg-background"
              />

              <AnimatePresence>
                {hasNodesOutsideViewport && !maximizedNodeId && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}>
                    <MiniMap
                      className={cn('backdrop-blur-sm border bg-transparent! scale-75 translate-x-6.5 translate-y-5.5 rounded transition-all duration-200 ease-in-out')}
                      nodeColor={cn('var(--muted-foreground)')}
                      maskColor={cn('rgba(0, 0, 0, 0.75)')}
                      nodeStrokeColor={cn('var(--border)')}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
              <HelperLines horizontal={helperLines.horizontal} vertical={helperLines.vertical} />

              {isDrawingMode && !maximizedNodeId && (
                <FreehandOverlay
                  containerRef={containerRef}
                  getFreehandPath={getFreehandPath}
                  getZoom={() => instanceRef.current?.getViewport().zoom ?? 1}
                  onComplete={handleFreehandComplete}
                />
              )}
            </ReactFlow>

            {/* Zoom Indicator */}
            <AnimatePresence>
              {showZoomIndicator && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  className="absolute bottom-4 left-4 flex gap-0 pointer-events-none bg-card/90 backdrop-blur-sm border rounded-md px-2.5 py-1.5 shadow-lg">
                  <ZoomIn className="mr-2 h-4 w-4 opacity-50" />
                  <div className="text-xs font-mono text-muted-foreground">{Math.round(currentZoom * 100)}%</div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {invalidSelectionBox && (
                <motion.div
                  key={invalidSelectionBox.id}
                  initial={{ opacity: 0, scale: 1 }}
                  animate={{
                    opacity: 1,
                    x: [0, -6, 6, -5, 5, -3, 3, 0],
                  }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.45, ease: 'easeInOut' }}
                  className="absolute pointer-events-none border-2 border-destructive/70 bg-destructive/10 rounded-sm"
                  style={{
                    left: invalidSelectionBox.x,
                    top: invalidSelectionBox.y,
                    width: invalidSelectionBox.width,
                    height: invalidSelectionBox.height,
                  }}
                />
              )}
            </AnimatePresence>

            {/* Drop zone indicator */}
            {isDraggingOver && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 bg-primary/5 border-2 border-dashed border-primary/30 rounded-xl pointer-events-none flex items-center justify-center">
                <div className="bg-background/95 backdrop-blur-sm px-4 py-2 rounded-lg shadow-lg">
                  <p className="text-sm font-medium text-primary">Drop files here to add to canvas</p>
                </div>
              </motion.div>
            )}

            {/* Saving indicator - hidden in fullscreen */}
            <AnimatePresence>
              {!maximizedNodeId && isSaving && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 12 }}
                  transition={{ duration: 0.25 }}
                  className="absolute bottom-4 left-1/2 -translate-x-1/2 px-2 py-1 bg-warning/20 text-warning text-xs rounded pointer-events-none flex items-center gap-1">
                  <Save className="w-3 h-3 opacity-50" />
                  <span className="opacity-50">Saving...</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Bottom-center dock - Canvas Tools - hidden in fullscreen */}
            {!maximizedNodeId && (
              <div
                className="absolute bottom-3 z-40 flex items-end justify-center pointer-events-none"
                style={{
                  left: '0.75rem',
                  right: detailsSheetOpen ? `calc(${detailsPanelWidth}px + 1.5rem)` : '0.75rem',
                }}>
                <CanvasToolbar
                  selectedCount={selectedCount}
                  clipboardCount={clipboardCount}
                  isCustomLayout={isCustomLayout}
                  activeLayoutLabel={activeLayoutLabel}
                  activeTool={activeTool}
                  onToolChange={handleToolChange}
                  onAutoLayout={handleAutoLayout}
                  onCustomLayout={handleCustomLayout}
                  onGridLayout={handleGridLayout}
                  onAlign={handleAlign}
                  onDistribute={handleDistribute}
                  onCopy={handleCopy}
                  onPaste={handlePaste}
                  onCut={handleCut}
                  onDelete={handleDeleteSelected}
                  onGroup={handleGroup}
                  onUngroup={handleUngroup}
                  className="bg-card border rounded-xl shadow-sm pointer-events-auto"
                />
              </div>
            )}

            {PERF_HUD_ENABLED && !maximizedNodeId && (
              <div
                className="absolute bottom-4 z-40 flex flex-col items-end gap-2 transition-[right] duration-300 ease-out"
                style={{
                  right: detailsSheetOpen ? `calc(${detailsPanelWidth}px + 2rem)` : '1rem',
                  bottom: '4.5rem',
                }}>
                {showPerfHud && (
                  <div className="bg-card/95 backdrop-blur-sm border rounded-lg shadow-sm px-3 py-2 text-[11px] leading-tight min-w-64">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">FPS</span>
                      <span className={cn('font-mono tabular-nums', getFpsTone(fpsStats.fps))}>
                        {Math.round(fpsStats.fps)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Avg frame</span>
                      <span className={cn('font-mono tabular-nums', getMsTone(fpsStats.avgFrameMs, 20, 33))}>
                        {formatMs(fpsStats.avgFrameMs)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Worst</span>
                      <span className={cn('font-mono tabular-nums', getMsTone(fpsStats.worstFrameMs, 33, 50))}>
                        {formatMs(fpsStats.worstFrameMs)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Jank</span>
                      <span
                        className={cn(
                          'font-mono tabular-nums',
                          fpsStats.jankWindow === 0 ? 'text-emerald-500' : 'text-amber-500',
                        )}>
                        {fpsStats.jankWindow} / {fpsStats.jankTotal}
                      </span>
                    </div>

                    {fpsHistory.length > 1 && (
                      <svg className="mt-1" width="240" height="26" viewBox="0 0 240 26">
                        <path
                          d={sparklinePath(fpsHistory, 240, 26, 0, Math.max(60, ...fpsHistory))}
                          fill="none"
                          className={cn('stroke-2', getFpsTone(fpsStats.fps).replace('text-', 'stroke-'))}
                        />
                      </svg>
                    )}

                    <div className="h-px bg-border my-2" />

                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Nodes</span>
                      <span className="font-mono tabular-nums">{nodes.length}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Edges</span>
                      <span className="font-mono tabular-nums">{edges.length}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Zoom</span>
                      <span className="font-mono tabular-nums">{viewport.zoom.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Save</span>
                      <span
                        className={cn(
                          'font-mono tabular-nums',
                          isSaving ? 'text-amber-500' : hasUnsavedChanges ? 'text-rose-500' : 'text-emerald-500',
                        )}>
                        {isSaving ? 'saving…' : hasUnsavedChanges ? 'dirty' : 'clean'}
                      </span>
                    </div>

                    <div className="h-px bg-border my-2" />

                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Last</span>
                      <span className="font-mono tabular-nums">{formatTime(savePerf.lastSaveAt)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Total</span>
                      <span className={cn('font-mono tabular-nums', getMsTone(savePerf.lastTotalMs, 60, 200))}>
                        {formatMs(savePerf.lastTotalMs)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Build</span>
                      <span className={cn('font-mono tabular-nums', getMsTone(savePerf.lastLayoutBuildMs, 20, 80))}>
                        {formatMs(savePerf.lastLayoutBuildMs)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Write</span>
                      <span className={cn('font-mono tabular-nums', getMsTone(savePerf.lastWriteMs, 30, 120))}>
                        {formatMs(savePerf.lastWriteMs)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Meta</span>
                      <span className={cn('font-mono tabular-nums', getMsTone(savePerf.lastMetadataMs, 10, 40))}>
                        {formatMs(savePerf.lastMetadataMs)}
                      </span>
                    </div>

                    {saveTotalHistory.length > 1 && (
                      <svg className="mt-1" width="240" height="26" viewBox="0 0 240 26">
                        <path
                          d={sparklinePath(saveTotalHistory, 240, 26, 0, Math.max(200, ...saveTotalHistory))}
                          fill="none"
                          className={cn(
                            'stroke-2',
                            getMsTone(savePerf.lastTotalMs, 60, 200).replace('text-', 'stroke-'),
                          )}
                        />
                      </svg>
                    )}
                  </div>
                )}

                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowPerfHud((v) => !v)}
                  className={cn(
                    'h-9 w-9 bg-muted backdrop-blur-sm border shadow-sm hover:bg-card',
                    showPerfHud ? 'ring-1 ring-primary/40' : undefined,
                  )}>
                  <Activity className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Agent activity indicator - hidden in fullscreen */}
            <AnimatePresence>
              {agentIsActive && !maximizedNodeId && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                  className="absolute top-14 left-3 flex items-center gap-2 px-3 py-1.5 bg-primary/10 backdrop-blur-sm border border-primary/30 rounded-full pointer-events-none">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    className="relative">
                    <Bot className="w-4 h-4 text-primary" />
                    <motion.div
                      className="absolute inset-0 rounded-full border-2 border-primary/50 border-t-transparent"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    />
                  </motion.div>
                  <span className="text-xs font-medium text-primary">{currentAction || 'Agent working...'}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </ContextMenuTrigger>

        <ContextMenuContent className="w-56">
          {recentContextMenuItems.length > 2 && (
            <>
              <ContextMenuLabel className="text-xs text-muted-foreground">Recently used</ContextMenuLabel>
              <div className="flex flex-row gap-1 py-1 px-1">
                {recentContextMenuItems.map((item) => {
                  const extra = item.extraData
                  const stickyColorName =
                    item.nodeType === 'stickyNote' && typeof extra?.color === 'string' ? extra.color : undefined
                  const stickyColor = stickyColorName
                    ? STICKY_COLORS.find((c) => c.name === stickyColorName)
                    : undefined

                  const shapeColorName =
                    item.nodeType === 'shape' && typeof extra?.color === 'string' ? extra.color : undefined
                  const shapeColor = shapeColorName ? SHAPE_COLORS.find((c) => c.name === shapeColorName) : undefined

                  const shapeType =
                    item.nodeType === 'shape' && typeof extra?.shape === 'string' ? extra.shape : undefined
                  const ShapeIcon =
                    shapeType === 'circle'
                      ? Circle
                      : shapeType === 'diamond'
                        ? Diamond
                        : shapeType === 'triangle'
                          ? Triangle
                          : shapeType === 'hexagon'
                            ? Hexagon
                            : Square

                  // Always use lucide icons for consistency - no colored squares
                  const IconComponent =
                    item.nodeType === 'richText'
                      ? Type
                      : item.nodeType === 'stickyNote'
                        ? StickyNote
                        : item.nodeType === 'image'
                          ? Image
                          : item.nodeType === 'youtube'
                            ? Video
                            : item.nodeType === 'embed'
                              ? Globe
                              : item.nodeType === 'spotify'
                                ? Music
                                : item.nodeType === 'pdf'
                                  ? FileText
                                  : item.nodeType === 'table'
                                    ? Table
                                    : item.nodeType === 'codeBlock'
                                      ? Code
                                      : item.nodeType === 'terminal'
                                        ? Terminal
                                        : item.nodeType === 'location'
                                          ? MapPin
                                          : item.nodeType === 'calendar'
                                            ? Calendar
                                            : item.nodeType === 'shape'
                                              ? ShapeIcon
                                              : Plus

                  return (
                    <Tooltip key={item.key}>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => handleCreateNode(item.nodeType, item.label, item.extraData)}
                          className={cn(
                            'flex h-6 w-6 items-center justify-center rounded-md bg-muted border hover:bg-accent hover:text-accent-foreground transition-colors',
                          )}>
                          <IconComponent className="h-4 w-4 opacity-80" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <p>{item.menuText}</p>
                      </TooltipContent>
                    </Tooltip>
                  )
                })}
              </div>
              <ContextMenuSeparator />
            </>
          )}
          <ContextMenuItem onClick={() => handleCreateNode('richText', 'Note')}>
            <Type className="mr-2 h-4 w-4" />
            Rich Text Note
          </ContextMenuItem>
          <ContextMenuSub>
            <ContextMenuSubTrigger>
              <StickyNote className="mr-2 h-4 w-4" />
              Sticky Note
            </ContextMenuSubTrigger>
            <ContextMenuSubContent className="w-40">
              {STICKY_COLORS.map((color) => (
                <ContextMenuItem
                  key={color.name}
                  onClick={() => handleCreateNode('stickyNote', color.name, { color: color.name })}>
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

          {/* Media - grouped */}
          <ContextMenuSub>
            <ContextMenuSubTrigger>
              <Image className="mr-2 h-4 w-4" />
              Media
            </ContextMenuSubTrigger>
            <ContextMenuSubContent className="w-40">
              <ContextMenuItem onClick={() => handleCreateNode('image', 'Image')}>
                <Image className="mr-2 h-4 w-4" />
                Image
              </ContextMenuItem>
              <ContextMenuItem onClick={() => handleCreateNode('youtube', 'YouTube')}>
                <Video className="mr-2 h-4 w-4" />
                YouTube
              </ContextMenuItem>
              <ContextMenuItem onClick={() => handleCreateNode('embed', 'Web Embed')}>
                <Globe className="mr-2 h-4 w-4" />
                Web Embed
              </ContextMenuItem>
              <ContextMenuItem onClick={() => handleCreateNode('spotify', 'Spotify')}>
                <Music className="mr-2 h-4 w-4" />
                Spotify
              </ContextMenuItem>
              <ContextMenuItem onClick={() => handleCreateNode('pdf', 'PDF')}>
                <FileText className="mr-2 h-4 w-4" />
                PDF
              </ContextMenuItem>
              <ContextMenuItem onClick={() => handleCreateNode('audio', 'Audio')}>
                <Mic className="mr-2 h-4 w-4" />
                Audio
              </ContextMenuItem>
            </ContextMenuSubContent>
          </ContextMenuSub>

          {/* Data & Code - grouped */}
          <ContextMenuSub>
            <ContextMenuSubTrigger>
              <Table className="mr-2 h-4 w-4" />
              Data & Code
            </ContextMenuSubTrigger>
            <ContextMenuSubContent className="w-40">
              <ContextMenuItem onClick={() => handleCreateNode('table', 'Table')}>
                <Table className="mr-2 h-4 w-4" />
                Table
              </ContextMenuItem>
              <ContextMenuItem onClick={() => handleCreateNode('codeBlock', 'Code Block')}>
                <Code className="mr-2 h-4 w-4" />
                Code Block
              </ContextMenuItem>
              <ContextMenuItem onClick={() => handleCreateNode('terminal', 'Terminal')}>
                <Terminal className="mr-2 h-4 w-4" />
                Terminal
              </ContextMenuItem>
            </ContextMenuSubContent>
          </ContextMenuSub>

          {/* Shapes */}
          <ContextMenuSub>
            <ContextMenuSubTrigger>
              <Shapes className="mr-2 h-4 w-4" />
              Shapes
            </ContextMenuSubTrigger>
            <ContextMenuSubContent className="w-40">
              <ContextMenuItem onClick={() => handleCreateNode('shape', 'Rectangle', { shape: 'rectangle' })}>
                <Square className="mr-2 h-4 w-4" />
                Rectangle
              </ContextMenuItem>
              <ContextMenuItem onClick={() => handleCreateNode('shape', 'Circle', { shape: 'circle' })}>
                <Circle className="mr-2 h-4 w-4" />
                Circle
              </ContextMenuItem>
              <ContextMenuItem onClick={() => handleCreateNode('shape', 'Diamond', { shape: 'diamond' })}>
                <Diamond className="mr-2 h-4 w-4" />
                Diamond
              </ContextMenuItem>
              <ContextMenuItem onClick={() => handleCreateNode('shape', 'Triangle', { shape: 'triangle' })}>
                <Triangle className="mr-2 h-4 w-4" />
                Triangle
              </ContextMenuItem>
              <ContextMenuItem onClick={() => handleCreateNode('shape', 'Hexagon', { shape: 'hexagon' })}>
                <Hexagon className="mr-2 h-4 w-4" />
                Hexagon
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuSub>
                <ContextMenuSubTrigger>Colored</ContextMenuSubTrigger>
                <ContextMenuSubContent className="w-36">
                  {SHAPE_COLORS.map((color) => (
                    <ContextMenuItem
                      key={color.name}
                      onClick={() => handleCreateNode('shape', color.name, { shape: 'rectangle', color: color.name })}>
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

          {/* AI & Tools */}
          <ContextMenuItem onClick={() => handleCreateNode('agent', 'Agent')}>
            <Bot className="mr-2 h-4 w-4" />
            Agent
          </ContextMenuItem>

          <ContextMenuSeparator />

          {/* Specialty items */}
          <ContextMenuItem onClick={() => handleCreateNode('calendar', 'Calendar')}>
            <Calendar className="mr-2 h-4 w-4" />
            Calendar
          </ContextMenuItem>
          <ContextMenuItem onClick={() => handleCreateNode('event', 'Event')}>
            <CalendarDays className="mr-2 h-4 w-4" />
            Event
          </ContextMenuItem>
          <ContextMenuItem onClick={() => handleCreateNode('location', 'Location')}>
            <MapPin className="mr-2 h-4 w-4" />
            Location
          </ContextMenuItem>
          <ContextMenuItem onClick={() => handleCreateNode('person', 'Person')}>
            <User className="mr-2 h-4 w-4" />
            Person
          </ContextMenuItem>
          <ContextMenuItem onClick={() => handleCreateNode('folder', 'Folder')}>
            <Folder className="mr-2 h-4 w-4" />
            Folder
          </ContextMenuItem>
          <ContextMenuItem onClick={() => handleCreateNode('freehand', 'Freehand')}>
            <PenTool className="mr-2 h-4 w-4" />
            Freehand
          </ContextMenuItem>

          {/* Canvas settings */}
          {onOpenBackgroundSettings && (
            <>
              <ContextMenuSeparator />
              <ContextMenuItem onClick={onOpenBackgroundSettings}>
                <Palette className="mr-2 h-4 w-4" />
                Background...
              </ContextMenuItem>
            </>
          )}

          {/* Archived nodes - collapsed into submenu */}
          {archivedNodes.length > 0 && (
            <>
              <ContextMenuSeparator />
              <ContextMenuSub>
                <ContextMenuSubTrigger className="text-muted-foreground">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Archived ({archivedNodes.length})
                </ContextMenuSubTrigger>
                <ContextMenuSubContent className="w-52 max-h-64 overflow-y-auto">
                  {archivedNodes.map((node) => {
                    const fileName = node.originalPath.split('/').pop() || 'Unknown'
                    // Truncate long filenames
                    const displayName = fileName.length > 28 ? fileName.slice(0, 25) + '...' : fileName
                    return (
                      <ContextMenuItem
                        key={node.id}
                        onClick={() => restoreArchivedNode(node.id)}
                        className="text-xs"
                        title={fileName}>
                        <RotateCcw className="mr-2 h-3 w-3 shrink-0" />
                        <span className="truncate">{displayName}</span>
                      </ContextMenuItem>
                    )
                  })}
                </ContextMenuSubContent>
              </ContextMenuSub>
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>

      {/* Node Details Sheet - hidden in fullscreen */}
      {!maximizedNodeId && (
        <NodeDetailsSheet
          node={detailsSheetNode}
          open={detailsSheetOpen}
          onOpenChange={setDetailsSheetOpen}
          onWidthChange={setDetailsPanelWidth}
        />
      )}

      {/* Create Space Dialog */}
      <Dialog open={createSpaceOpen} onOpenChange={setCreateSpaceOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Create New Space</DialogTitle>
            <DialogDescription>Give your new canvas space a name.</DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            placeholder="Space name"
            value={createSpaceName}
            onChange={(e) => setCreateSpaceName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleConfirmCreateSpace()
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateSpaceOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmCreateSpace} disabled={!createSpaceName.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  )
}

export function HomeCanvas(props: HomeCanvasProps) {
  return (
    <ReactFlowProvider>
      <HomeCanvasInner {...props} />
    </ReactFlowProvider>
  )
}
