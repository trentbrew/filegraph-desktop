/**
 * SketchViewer - Agent's ephemeral visual sketchpad
 *
 * A specialized canvas for the agent to visualize ideas, diagrams, files,
 * images, charts, connections, and more. This is the agent's "show don't tell" canvas.
 *
 * File format: .sketch (JSON)
 * {
 *   "@type": "AgentSketch",
 *   "title": "Sketch Title",
 *   "created_at": "ISO timestamp",
 *   "updated_at": "ISO timestamp",
 *   "items": [
 *     { "type": "text", "id": "...", "content": "...", "position": { x, y }, "style": {...} },
 *     { "type": "image", "id": "...", "src": "...", "position": { x, y }, "size": { w, h } },
 *     { "type": "file", "id": "...", "path": "...", "position": { x, y } },
 *     { "type": "embed", "id": "...", "url": "...", "position": { x, y } },
 *     { "type": "mermaid", "id": "...", "code": "...", "position": { x, y } },
 *     { "type": "chart", "id": "...", "data": {...}, "chartType": "bar|line|pie", "position": { x, y } },
 *     { "type": "code", "id": "...", "code": "...", "language": "...", "position": { x, y } },
 *     { "type": "connection", "id": "...", "from": "item-id", "to": "item-id", "label": "..." }
 *   ],
 *   "viewport": { x, y, zoom }
 * }
 */

import * as React from 'react'
import { invoke } from '@tauri-apps/api/core'
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
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  useReactFlow,
  useStore,
  NodeToolbar,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { NodeResizer } from '@reactflow/node-resizer'
import '@reactflow/node-resizer/dist/style.css'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import './sketchViewer.css'
import {
  Bot,
  Loader2,
  RefreshCw,
  FileText,
  Image as ImageIcon,
  Code2,
  Globe,
  GitBranch,
  BarChart3,
  Type,
  Sparkles,
  Trash2,
  Plus,
  StickyNote,
  AlertCircle,
  Shapes,
  Table,
  Wand2,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Button } from '@/components/ui/button'
import DOMPurify from 'dompurify'
import { getAdapter, PROVIDERS } from '@/lib/providers'
import { useChatStore } from '@/features/agent/hooks/useChatStore'
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
import { cn } from '@/lib/utils'
import { useFileStore } from '@/stores/useFileStore'
import {
  RichTextNode,
  StickyNoteNode,
  STICKY_COLORS,
  ImageNode as CanvasImageNode,
  EmbedNode as CanvasEmbedNode,
  ShapeNode,
  SHAPE_COLORS,
  TableNode,
} from './canvasViewer/nodes'

interface SketchViewerProps {
  filePath: string
  fileName?: string
}

interface SketchItem {
  type: 'text' | 'image' | 'file' | 'embed' | 'mermaid' | 'chart' | 'code' | 'connection'
  id: string
  content?: string
  src?: string
  path?: string
  url?: string
  code?: string
  language?: string
  // Chart-specific properties
  chartType?: 'bar' | 'line' | 'pie' | 'area' | 'scatter' | 'doughnut'
  data?: {
    labels?: string[]
    datasets?: Array<{
      label?: string
      data?: number[]
      backgroundColor?: string | string[]
      borderColor?: string
    }>
  }
  title?: string
  // Connection properties
  from?: string
  to?: string
  label?: string
  position?: { x: number; y: number }
  size?: { w: number; h: number }
  style?: Record<string, any>
}

interface SketchData {
  '@type': 'AgentSketch'
  title?: string
  created_at?: string
  updated_at?: string
  items: SketchItem[]
  viewport?: Viewport
}

type SketchNode = Node<Record<string, unknown>>
type SketchEdge = Edge<Record<string, unknown>>

const DEFAULT_VIEWPORT: Viewport = { x: 0, y: 0, zoom: 1 }

// ─────────────────────────────────────────────────────────────────────────────
// Node Components
// ─────────────────────────────────────────────────────────────────────────────

function StyledHandle({ type, position, id }: { type: 'source' | 'target'; position: Position; id?: string }) {
  return (
    <Handle
      type={type}
      position={position}
      id={id}
      className="w-2! h-2! bg-muted-foreground/40! border-2! border-background! hover:bg-primary! hover:scale-125! transition-all duration-150 rounded-full"
    />
  )
}

// Text Node - for agent explanations, labels, annotations
function TextNode({ id, data, selected }: { id: string; data: any; selected: boolean }) {
  const content = data?.content || ''
  const style = data?.style || {}

  return (
    <div
      className={cn(
        'sketch-node group relative bg-card/80 backdrop-blur-sm border rounded-lg shadow-sm p-4 w-full h-full min-w-[200px] min-h-[80px]',
        selected ? 'border-primary ring-2 ring-primary/20' : 'border-border/50',
      )}
      style={style}>
      <NodeResizer
        color="var(--primary)"
        isVisible={selected}
        minWidth={200}
        minHeight={80}
        handleClassName="w-2! h-2! bg-primary! border-0! rounded-sm!"
      />
      <div className="flex items-start gap-2 h-full">
        <Type className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
        <div className="text-sm text-foreground markdown-content w-full h-full overflow-auto">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </div>
      </div>
      <StyledHandle type="target" position={Position.Top} id="top" />
      <StyledHandle type="source" position={Position.Bottom} id="bottom" />
      <StyledHandle type="target" position={Position.Left} id="left" />
      <StyledHandle type="source" position={Position.Right} id="right" />
    </div>
  )
}

// Annotation Node - for whiteboard-like annotations
function AnnotationNode({ data }: { data: any }) {
  return (
    <>
      <div className="annotation-content">
        {data.level && <div className="annotation-level">{data.level}.</div>}
        <div>{data.label}</div>
      </div>
      {data.arrowStyle && (
        <div className="annotation-arrow" style={data.arrowStyle}>
          ⤹
        </div>
      )}
    </>
  )
}

// Toolbar Node - with emoji reactions
const emojis = ['🚀', '🔥', '✨']

function ToolbarNode({ data }: { data: any }) {
  const [emoji, setEmoji] = React.useState('🚀')

  return (
    <>
      <NodeToolbar isVisible>
        <div className="flex gap-1 bg-card border rounded shadow-sm p-1">
          {emojis.map((e) => (
            <button
              key={e}
              onClick={() => setEmoji(e)}
              className="p-1 hover:bg-muted rounded text-lg leading-none"
              aria-label={`Select emoji ${e}`}>
              {e}
            </button>
          ))}
        </div>
      </NodeToolbar>
      <div className="bg-card border rounded-lg p-4 shadow-sm min-w-[150px] text-center">
        <div className="text-4xl mb-2">{emoji}</div>
        <div className="text-sm font-medium">{data.label}</div>
      </div>
      <Handle type="target" position={Position.Left} className="custom-handle" />
      <Handle type="source" position={Position.Right} className="custom-handle" />
    </>
  )
}

// Resizer Node - explicitly resizeable
function ResizerNode({ data }: { data: any }) {
  return (
    <div className="bg-card border rounded-lg p-4 shadow-sm min-w-[100px] min-h-[100px] h-full w-full flex items-center justify-center">
      <NodeResizer minWidth={100} minHeight={100} />
      <Handle type="target" position={Position.Left} className="custom-handle" />
      <div>{data.label}</div>
      <div className="resizer-node__handles">
        <Handle className="resizer-node__handle custom-handle" id="a" type="source" position={Position.Bottom} />
        <Handle className="resizer-node__handle custom-handle " id="b" type="source" position={Position.Bottom} />
      </div>
    </div>
  )
}

// Circle Node - shows position
function CircleNode({ id, xPos, yPos }: { id: string; xPos: number; yPos: number }) {
  const label = `Position x:${Math.round(xPos)} y:${Math.round(yPos)}`

  return (
    <div className="bg-card border rounded-full aspect-square flex items-center justify-center p-4 shadow-sm min-w-[100px]">
      <div className="text-xs text-center">{label || 'no node connected'}</div>
      <Handle type="target" position={Position.Left} className="custom-handle" />
    </div>
  )
}

// Text Input Node - controls dimensions of another node (demo)
const dimensionAttrs = ['width', 'height']

function TextInputNode({ id }: { id: string }) {
  const { setNodes } = useReactFlow()
  const dimensions = useStore((s) => {
    // @ts-ignore - nodeInternals is the v11 way, nodeLookup is v12
    const node = s.nodeInternals?.get('2-3') || s.nodeLookup?.get('2-3')
    if (!node || !node.width || !node.height || !s.edges.some((edge) => edge.target === id)) {
      return null
    }
    return {
      width: node.width,
      height: node.height,
    }
  })

  const updateDimension = (attr: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value)

    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === '2-3') {
          return {
            ...n,
            style: {
              ...n.style,
              [attr]: value,
            },
          }
        }
        return n
      }),
    )
  }

  return (
    <div className="bg-card border rounded-lg p-4 shadow-sm min-w-[200px]">
      {dimensionAttrs.map((attr) => (
        <React.Fragment key={attr}>
          <div className="mb-2">
            <label className="text-xs text-muted-foreground capitalize block mb-1">Node {attr}</label>
            <input
              type="number"
              value={dimensions ? parseInt(dimensions[attr as keyof typeof dimensions]) : 0}
              onChange={updateDimension(attr)}
              className="text-input-node__input xy-theme__input nodrag w-full px-2 py-1 text-sm border rounded"
              disabled={!dimensions}
            />
          </div>
        </React.Fragment>
      ))}
      {!dimensions && <div className="text-xs text-muted-foreground">Connect to see dimensions</div>}
      <Handle type="target" position={Position.Top} className="custom-handle" />
    </div>
  )
}

// Button Edge - edge with a delete button
function ButtonEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
}: any) {
  const { setEdges } = useReactFlow()
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  const onEdgeClick = () => {
    setEdges((edges) => edges.filter((edge) => edge.id !== id))
  }

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
      <EdgeLabelRenderer>
        <div
          className="button-edge__label nodrag nopan"
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
          }}>
          <button className="button-edge__button" onClick={onEdgeClick}>
            ×
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  )
}

// Image Node - for generated images, screenshots, diagrams
function ImageNode({ id, data, selected }: { id: string; data: any; selected: boolean }) {
  const src = data?.src || ''
  const alt = data?.alt || 'Image'
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState(false)

  return (
    <div
      className={cn(
        'sketch-node group relative bg-card border rounded-lg shadow-sm overflow-hidden min-w-[400px] min-h-[300px]',
        selected ? 'border-primary ring-2 ring-primary/20' : 'border-border/50',
      )}>
      <NodeResizer
        color="var(--primary)"
        isVisible={selected}
        minWidth={300}
        minHeight={200}
        handleClassName="w-2! h-2! bg-primary! border-0! rounded-sm!"
      />
      <div className="absolute top-2 left-2 z-10 flex items-center gap-1 px-2 py-1 bg-background/80 backdrop-blur-sm rounded text-xs text-muted-foreground">
        <ImageIcon className="h-3 w-3" />
        <span>Image</span>
      </div>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}
      {error ? (
        <div className="flex items-center justify-center h-full p-4 text-muted-foreground">
          <span>Failed to load image</span>
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-contain"
          onLoad={() => setLoading(false)}
          onError={() => {
            setLoading(false)
            setError(true)
          }}
        />
      )}
      <StyledHandle type="target" position={Position.Top} id="top" />
      <StyledHandle type="source" position={Position.Bottom} id="bottom" />
      <StyledHandle type="target" position={Position.Left} id="left" />
      <StyledHandle type="source" position={Position.Right} id="right" />
    </div>
  )
}

// Code Node - for code snippets with syntax highlighting
function CodeNode({ id, data, selected }: { id: string; data: any; selected: boolean }) {
  const code = data?.code || ''
  const language = data?.language || 'text'

  return (
    <div
      className={cn(
        'sketch-node group relative bg-zinc-900 border rounded-lg shadow-sm overflow-hidden min-w-[450px] min-h-[200px]',
        selected ? 'border-primary ring-2 ring-primary/20' : 'border-zinc-700',
      )}>
      <NodeResizer
        color="var(--primary)"
        isVisible={selected}
        minWidth={350}
        minHeight={150}
        handleClassName="w-2! h-2! bg-primary! border-0! rounded-sm!"
      />
      <div className="flex items-center gap-2 px-3 py-2 bg-zinc-800 border-b border-zinc-700">
        <Code2 className="h-3.5 w-3.5 text-zinc-400" />
        <span className="text-xs text-zinc-400 font-mono">{language}</span>
      </div>
      <pre className="p-3 text-sm font-mono text-zinc-100 overflow-auto max-h-[400px]">
        <code>{code}</code>
      </pre>
      <StyledHandle type="target" position={Position.Top} id="top" />
      <StyledHandle type="source" position={Position.Bottom} id="bottom" />
      <StyledHandle type="target" position={Position.Left} id="left" />
      <StyledHandle type="source" position={Position.Right} id="right" />
    </div>
  )
}

// Mermaid Node - for diagrams (flowcharts, sequence diagrams, etc.)
function MermaidNode({ id, data, selected }: { id: string; data: any; selected: boolean }) {
  const code = data?.code || ''
  const containerRef = React.useRef<HTMLDivElement>(null)
  const renderTargetRef = React.useRef<HTMLDivElement>(null)
  const [svg, setSvg] = React.useState<string>('')
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    const renderMermaid = async () => {
      try {
        // Dynamically import mermaid
        const mermaid = (await import('mermaid')).default
        mermaid.initialize({
          startOnLoad: false,
          theme: 'dark',
          securityLevel: 'strict',
          suppressErrorRendering: true,
        })
        mermaid.setParseErrorHandler(() => {})
        await mermaid.parse(code)
        const { svg } = await mermaid.render(`mermaid-${id}`, code, renderTargetRef.current ?? undefined)
        const sanitized = DOMPurify.sanitize(svg, {
          USE_PROFILES: { svg: true, svgFilters: true, html: false },
        })
        setSvg(sanitized)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to render diagram')
      }
    }

    if (code) {
      renderMermaid()
    }
  }, [code, id])

  return (
    <div
      className={cn(
        'sketch-node group relative bg-card border rounded-lg shadow-sm overflow-hidden min-w-[500px] min-h-[350px]',
        selected ? 'border-primary ring-2 ring-primary/20' : 'border-border/50',
      )}>
      <NodeResizer
        color="var(--primary)"
        isVisible={selected}
        minWidth={400}
        minHeight={280}
        handleClassName="w-2! h-2! bg-primary! border-0! rounded-sm!"
      />
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 border-b border-border/50">
        <GitBranch className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Diagram</span>
      </div>
      <div ref={containerRef} className="p-4 flex items-center justify-center">
        {error ? (
          <div className="text-sm text-destructive">{error}</div>
        ) : svg ? (
          <div dangerouslySetInnerHTML={{ __html: svg }} className="mermaid-svg" />
        ) : (
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        )}
      </div>
      <div ref={renderTargetRef} className="sr-only" />
      <StyledHandle type="target" position={Position.Top} id="top" />
      <StyledHandle type="source" position={Position.Bottom} id="bottom" />
      <StyledHandle type="target" position={Position.Left} id="left" />
      <StyledHandle type="source" position={Position.Right} id="right" />
    </div>
  )
}

// Embed Node - for web embeds (iframes)
function EmbedNode({ id, data, selected }: { id: string; data: any; selected: boolean }) {
  const url = data?.url || ''
  const title = data?.title || 'Web Embed'

  return (
    <div
      className={cn(
        'sketch-node group relative bg-card border rounded-lg shadow-sm overflow-hidden min-w-[600px] min-h-[450px]',
        selected ? 'border-primary ring-2 ring-primary/20' : 'border-border/50',
      )}>
      <NodeResizer
        color="var(--primary)"
        isVisible={selected}
        minWidth={500}
        minHeight={350}
        handleClassName="w-2! h-2! bg-primary! border-0! rounded-sm!"
      />
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 border-b border-border/50">
        <Globe className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground truncate flex-1">{title}</span>
      </div>
      <iframe src={url} className="w-full h-full border-0" title={title} sandbox="allow-scripts allow-same-origin" />
      <StyledHandle type="target" position={Position.Top} id="top" />
      <StyledHandle type="source" position={Position.Bottom} id="bottom" />
      <StyledHandle type="target" position={Position.Left} id="left" />
      <StyledHandle type="source" position={Position.Right} id="right" />
    </div>
  )
}

// File Preview Node - for showing vault files
function FilePreviewNode({ id, data, selected }: { id: string; data: any; selected: boolean }) {
  const path = data?.path || ''
  const fileName = path.split('/').pop() || 'File'
  const [content, setContent] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    const loadFile = async () => {
      try {
        const result = await invoke<{ content: string }>('read_text_file', { filePath: path })
        setContent(result.content.slice(0, 1000) + (result.content.length > 1000 ? '\n...' : ''))
      } catch {
        setContent('Failed to load file')
      } finally {
        setLoading(false)
      }
    }
    if (path) loadFile()
  }, [path])

  return (
    <div
      className={cn(
        'sketch-node group relative bg-card border rounded-lg shadow-sm overflow-hidden min-w-[450px] min-h-[320px]',
        selected ? 'border-primary ring-2 ring-primary/20' : 'border-border/50',
      )}>
      <NodeResizer
        color="var(--primary)"
        isVisible={selected}
        minWidth={350}
        minHeight={250}
        handleClassName="w-2! h-2! bg-primary! border-0! rounded-sm!"
      />
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 border-b border-border/50">
        <FileText className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground font-mono truncate">{fileName}</span>
      </div>
      <div className="p-3 overflow-auto max-h-[300px]">
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : (
          <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap">{content}</pre>
        )}
      </div>
      <StyledHandle type="target" position={Position.Top} id="top" />
      <StyledHandle type="source" position={Position.Bottom} id="bottom" />
      <StyledHandle type="target" position={Position.Left} id="left" />
      <StyledHandle type="source" position={Position.Right} id="right" />
    </div>
  )
}

// Chart Node - for data visualizations
function ChartNode({ id, data, selected }: { id: string; data: any; selected: boolean }) {
  const chartType = data?.chartType || 'bar'
  const chartRawData = data?.data || {}
  const title = data?.title || 'Chart'

  // Transform data for Recharts
  const transformedData = React.useMemo(() => {
    if (!chartRawData.labels || !chartRawData.datasets) return []

    return chartRawData.labels.map((label: string, index: number) => {
      const item: any = { name: label }
      chartRawData.datasets.forEach((dataset: any, dsIndex: number) => {
        const key = dataset.label || `series-${dsIndex}`
        item[key] = dataset.data?.[index] ?? 0
      })
      return item
    })
  }, [chartRawData])

  const renderChart = () => {
    const datasets = chartRawData.datasets || []
    const colors = [
      '#3b82f6', // blue-500
      '#ef4444', // red-500
      '#22c55e', // green-500
      '#eab308', // yellow-500
      '#8b5cf6', // violet-500
      '#ec4899', // pink-500
      '#06b6d4', // cyan-500
      '#f97316', // orange-500
    ]

    const CommonAxis = () => (
      <>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} vertical={false} />
        <XAxis
          dataKey="name"
          stroke="var(--muted-foreground)"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          dy={10}
        />
        <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} dx={-10} />
        <RechartsTooltip
          cursor={{ fill: 'var(--muted)', opacity: 0.2 }}
          contentStyle={{
            backgroundColor: 'var(--card)',
            borderColor: 'var(--border)',
            borderRadius: '8px',
            color: 'var(--foreground)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          }}
          itemStyle={{ color: 'var(--foreground)' }}
          labelStyle={{ color: 'var(--muted-foreground)', marginBottom: '0.25rem' }}
        />
        <Legend
          wrapperStyle={{ paddingTop: '20px' }}
          formatter={(value) => <span className="text-sm text-foreground ml-1">{value}</span>}
        />
      </>
    )

    if (chartType === 'pie' || chartType === 'doughnut') {
      if (datasets.length === 0) return <div className="text-muted-foreground text-sm">No data available</div>

      const dataset = datasets[0]
      const pieData = (chartRawData.labels || []).map((label: string, index: number) => ({
        name: label,
        value: dataset.data?.[index] ?? 0,
      }))

      return (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={chartType === 'doughnut' ? '60%' : 0}
              outerRadius="80%"
              paddingAngle={2}
              dataKey="value">
              {pieData.map((entry: any, index: number) => (
                <Cell
                  key={`cell-${index}`}
                  fill={
                    (Array.isArray(dataset.backgroundColor)
                      ? dataset.backgroundColor[index % dataset.backgroundColor.length]
                      : undefined) || colors[index % colors.length]
                  }
                  stroke="var(--card)"
                  strokeWidth={2}
                />
              ))}
            </Pie>
            <RechartsTooltip
              contentStyle={{
                backgroundColor: 'var(--card)',
                borderColor: 'var(--border)',
                borderRadius: '8px',
                color: 'var(--foreground)',
              }}
              itemStyle={{ color: 'var(--foreground)' }}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value) => <span className="text-sm text-foreground ml-1">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      )
    }

    // Common props for cartesian charts
    const chartComponents: Record<string, any> = {
      bar: BarChart,
      line: LineChart,
      area: AreaChart,
      scatter: ScatterChart,
    }
    const Container = chartComponents[chartType] || BarChart

    return (
      <ResponsiveContainer width="100%" height="100%">
        <Container data={transformedData}>
          <CommonAxis />
          {datasets.map((ds: any, i: number) => {
            const color =
              (Array.isArray(ds.backgroundColor) ? ds.backgroundColor[0] : ds.backgroundColor) ||
              ds.borderColor ||
              colors[i % colors.length]

            if (chartType === 'bar') {
              return (
                <Bar key={i} dataKey={ds.label || `series-${i}`} fill={color} radius={[4, 4, 0, 0]} maxBarSize={60} />
              )
            }
            if (chartType === 'line') {
              return (
                <Line
                  key={i}
                  type="monotone"
                  dataKey={ds.label || `series-${i}`}
                  stroke={ds.borderColor || color}
                  strokeWidth={2}
                  dot={{ r: 4, strokeWidth: 2, fill: 'var(--card)' }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              )
            }
            if (chartType === 'area') {
              return (
                <Area
                  key={i}
                  type="monotone"
                  dataKey={ds.label || `series-${i}`}
                  fill={color}
                  stroke={ds.borderColor || color}
                  fillOpacity={0.2}
                />
              )
            }
            if (chartType === 'scatter') {
              return (
                <Scatter
                  key={i}
                  name={ds.label || `series-${i}`}
                  data={transformedData.map((d: any) => ({
                    name: d.name,
                    value: d[ds.label || `series-${i}`],
                  }))}
                  fill={color}
                />
              )
            }
            return null
          })}
        </Container>
      </ResponsiveContainer>
    )
  }

  return (
    <div
      className={cn(
        'sketch-node group relative bg-card border rounded-lg shadow-sm overflow-hidden min-w-[450px] min-h-[320px]',
        selected ? 'border-primary ring-2 ring-primary/20' : 'border-border/50',
      )}>
      <NodeResizer
        color="var(--primary)"
        isVisible={selected}
        minWidth={350}
        minHeight={250}
        handleClassName="w-2! h-2! bg-primary! border-0! rounded-sm!"
      />
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 border-b border-border/50">
        <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">{title}</span>
      </div>
      <div className="p-4 h-[calc(100%-40px)] w-full">{renderChart()}</div>
      <StyledHandle type="target" position={Position.Top} id="top" />
      <StyledHandle type="source" position={Position.Bottom} id="bottom" />
      <StyledHandle type="target" position={Position.Left} id="left" />
      <StyledHandle type="source" position={Position.Right} id="right" />
    </div>
  )
}

const nodeTypes = {
  // Agent-generated node types
  text: TextNode,
  image: ImageNode,
  code: CodeNode,
  mermaid: MermaidNode,
  embed: EmbedNode,
  file: FilePreviewNode,
  chart: ChartNode,
  // Human-editable node types (from canvasViewer)
  richText: RichTextNode,
  stickyNote: StickyNoteNode,
  canvasImage: CanvasImageNode,
  canvasEmbed: CanvasEmbedNode,
  shape: ShapeNode,
  table: TableNode,
  annotation: AnnotationNode,
  tools: ToolbarNode,
  resizer: ResizerNode,
  circle: CircleNode,
  textinput: TextInputNode,
}

const edgeTypes = {
  button: ButtonEdge,
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export function SketchViewer(props: SketchViewerProps) {
  return (
    <ReactFlowProvider>
      <SketchViewerInner {...props} />
    </ReactFlowProvider>
  )
}

function SketchViewerInner({ filePath, fileName }: SketchViewerProps) {
  const [nodes, setNodes] = React.useState<SketchNode[]>([])
  const [edges, setEdges] = React.useState<SketchEdge[]>([])
  const [viewport, setViewport] = React.useState<Viewport>(DEFAULT_VIEWPORT)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [title, setTitle] = React.useState<string>('')
  const [viewMode, setViewMode] = React.useState<'visual' | 'code'>('visual')
  const [rawContent, setRawContent] = React.useState<string>('')
  const [isFixing, setIsFixing] = React.useState(false)

  const instanceRef = React.useRef<ReactFlowInstance | null>(null)
  const nodesRef = React.useRef(nodes)
  const edgesRef = React.useRef(edges)

  React.useEffect(() => {
    nodesRef.current = nodes
  }, [nodes])

  React.useEffect(() => {
    edgesRef.current = edges
  }, [edges])

  // Convert SketchItem[] to ReactFlow nodes/edges
  const convertItemsToFlow = React.useCallback((items: SketchItem[]): { nodes: SketchNode[]; edges: SketchEdge[] } => {
    const flowNodes: SketchNode[] = []
    const flowEdges: SketchEdge[] = []

    for (const item of items) {
      if (item.type === 'connection') {
        // Connection items become edges
        if (item.from && item.to) {
          flowEdges.push({
            id: item.id,
            source: item.from,
            target: item.to,
            label: item.label,
            animated: true,
            style: { stroke: 'var(--primary)' },
          })
        }
      } else {
        // All other items become nodes
        flowNodes.push({
          id: item.id,
          type: item.type,
          position: item.position || { x: 0, y: 0 },
          data: {
            ...item,
          },
          style: item.size ? { width: item.size.w, height: item.size.h } : undefined,
        })
      }
    }

    return { nodes: flowNodes, edges: flowEdges }
  }, [])

  // Load sketch data
  React.useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError(null)

      try {
        const result = await invoke<{ content: string }>('read_text_file', { filePath })

        if (cancelled) return

        if (!result?.content?.trim()) {
          // Empty file - create default sketch
          const defaultSketch: SketchData = {
            '@type': 'AgentSketch',
            title: fileName?.replace('.sketch', '') || 'Agent Sketch',
            created_at: new Date().toISOString(),
            items: [
              {
                type: 'text',
                id: 'welcome',
                content:
                  "This is the agent's visual sketchpad. When I want to show you something - a diagram, image, file preview, or visualization - it will appear here.",
                position: { x: 100, y: 100 },
              },
            ],
            viewport: DEFAULT_VIEWPORT,
          }

          const content = JSON.stringify(defaultSketch, null, 2)
          setRawContent(content)

          await invoke('write_text_file', {
            filePath,
            content,
          })

          const { nodes: flowNodes, edges: flowEdges } = convertItemsToFlow(defaultSketch.items)
          setNodes(flowNodes)
          setEdges(flowEdges)
          setViewport(defaultSketch.viewport || DEFAULT_VIEWPORT)
          setTitle(defaultSketch.title || '')
          setLoading(false)
          return
        }

        setRawContent(result.content)
        const data: SketchData = JSON.parse(result.content)
        const { nodes: flowNodes, edges: flowEdges } = convertItemsToFlow(data.items || [])

        setNodes(flowNodes)
        setEdges(flowEdges)
        setViewport(data.viewport || DEFAULT_VIEWPORT)
        setTitle(data.title || '')
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to parse sketch:', err)
          setError(err instanceof Error ? err.message : 'Failed to load sketch')
          setViewMode('code')
        }
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
  }, [filePath, fileName, convertItemsToFlow])

  // Listen for file changes (agent updates) via fileVersions map
  React.useEffect(() => {
    const unsubscribe = useFileStore.subscribe((state, prevState) => {
      const currentVersion = state.fileVersions.get(filePath) || 0
      const prevVersion = prevState.fileVersions.get(filePath) || 0

      if (currentVersion > prevVersion) {
        // File was changed, reload the sketch
        invoke<{ content: string }>('read_text_file', { filePath })
          .then((result) => {
            if (result?.content) {
              setRawContent(result.content)
              try {
                const data: SketchData = JSON.parse(result.content)
                const { nodes: flowNodes, edges: flowEdges } = convertItemsToFlow(data.items || [])
                setNodes(flowNodes)
                setEdges(flowEdges)
                if (data.viewport) setViewport(data.viewport)
                if (data.title) setTitle(data.title)
                setError(null)
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to parse update')
              }
            }
          })
          .catch(console.error)
      }
    })

    return unsubscribe
  }, [filePath, convertItemsToFlow])

  const handleInit = React.useCallback((instance: ReactFlowInstance) => {
    instanceRef.current = instance
    setTimeout(() => {
      instance.fitView({ padding: 0.2, duration: 300 })
    }, 50)
  }, [])

  const handleNodesChange = React.useCallback((changes: NodeChange[]) => {
    setNodes((current) => applyNodeChanges(changes, current))
  }, [])

  const handleEdgesChange = React.useCallback((changes: EdgeChange[]) => {
    setEdges((current) => applyEdgeChanges(changes, current))
  }, [])

  const handleConnect = React.useCallback((connection: Connection) => {
    setEdges((eds) => addEdge({ ...connection, animated: true, style: { stroke: 'var(--primary)' } }, eds))
  }, [])

  const handleClearSketch = React.useCallback(async () => {
    const clearedSketch: SketchData = {
      '@type': 'AgentSketch',
      title: title || 'Agent Sketch',
      created_at: new Date().toISOString(),
      items: [],
      viewport: DEFAULT_VIEWPORT,
    }

    await invoke('write_text_file', {
      filePath,
      content: JSON.stringify(clearedSketch, null, 2),
    })

    setNodes([])
    setEdges([])
    setViewport(DEFAULT_VIEWPORT)
  }, [filePath, title])

  // Auto-fix sketch using LLM
  const handleAutoFix = React.useCallback(async () => {
    if (!rawContent || isFixing) return

    setIsFixing(true)
    setError(null)

    try {
      const { provider, model, apiKey: storedApiKey } = useChatStore.getState().modelConfig

      // Get API key
      let apiKey = storedApiKey
      if (!apiKey) {
        if (provider === 'gemini') {
          apiKey = import.meta.env.VITE_GEMINI_API_KEY
        } else if (provider === 'openai' || provider === 'groq') {
          apiKey = import.meta.env.VITE_OPENAI_API_KEY
        }
      }

      const providerDef = PROVIDERS[provider]
      if (providerDef?.requiresApiKey && !apiKey) {
        setError(`${providerDef.name} API key not configured. Add it in Settings.`)
        setIsFixing(false)
        return
      }

      const adapter = getAdapter(provider)
      const config = { provider, model, apiKey }

      const response = await adapter.chat(
        {
          messages: [
            {
              role: 'system',
              content: `You are a JSON repair assistant. Fix the syntax errors in the provided JSON and return ONLY the fixed JSON, nothing else. No explanations, no markdown code blocks, just the raw corrected JSON.

The JSON should be a valid AgentSketch with this structure:
{
  "@type": "AgentSketch",
  "title": "string",
  "created_at": "ISO timestamp",
  "items": [...],
  "viewport": { "x": number, "y": number, "zoom": number }
}

Items can have types: text, image, code, mermaid, embed, file, chart, connection.
Each item needs: id, type, position: {x, y}, and type-specific fields like content/code/src.`,
            },
            {
              role: 'user',
              content: `Fix this broken JSON:\n\n${rawContent}`,
            },
          ],
          stream: false,
        },
        config,
      )

      const fixedContent = response.content?.trim()
      if (!fixedContent) {
        throw new Error('LLM returned empty response')
      }

      // Validate it's actually valid JSON
      const parsed: SketchData = JSON.parse(fixedContent)

      // Write fixed content to file
      await invoke('write_text_file', {
        filePath,
        content: JSON.stringify(parsed, null, 2),
      })

      // Update state
      setRawContent(JSON.stringify(parsed, null, 2))
      const { nodes: flowNodes, edges: flowEdges } = convertItemsToFlow(parsed.items || [])
      setNodes(flowNodes)
      setEdges(flowEdges)
      setViewport(parsed.viewport || DEFAULT_VIEWPORT)
      setTitle(parsed.title || '')
      setViewMode('visual')
      setError(null)
    } catch (err) {
      console.error('Auto-fix failed:', err)
      setError(`Auto-fix failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setIsFixing(false)
    }
  }, [rawContent, isFixing, filePath, convertItemsToFlow])

  // Context menu position for creating nodes
  const [contextMenuPosition, setContextMenuPosition] = React.useState<{ x: number; y: number } | null>(null)

  const handleContextMenu = React.useCallback((event: React.MouseEvent) => {
    const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect()
    setContextMenuPosition({
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    })
  }, [])

  // Create a new node at context menu position
  const createNode = React.useCallback(
    (type: string, label: string, extraData?: Record<string, unknown>) => {
      if (!instanceRef.current || !contextMenuPosition) return

      const position = instanceRef.current.screenToFlowPosition({
        x: contextMenuPosition.x,
        y: contextMenuPosition.y,
      })

      const newNode: SketchNode = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data: {
          label,
          content: '',
          ...extraData,
        },
      }

      setNodes((current) => [...current, newNode])
      setContextMenuPosition(null)
    },
    [contextMenuPosition],
  )

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-4 py-2 border-b border-border/50 bg-muted/30">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">{title || 'Agent Sketch'}</span>
          <span className="text-xs text-muted-foreground">
            ({nodes.length} item{nodes.length !== 1 ? 's' : ''})
          </span>
        </div>
        <div className="flex items-center gap-1">
          <div className="flex items-center bg-background border rounded-md p-0.5 mr-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode('visual')}
              className={cn(
                'h-6 px-2 text-xs rounded-sm',
                viewMode === 'visual'
                  ? 'bg-muted text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}>
              <Shapes className="h-3.5 w-3.5 mr-1.5" />
              Visual
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode('code')}
              className={cn(
                'h-6 px-2 text-xs rounded-sm',
                viewMode === 'code'
                  ? 'bg-muted text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}>
              <Code2 className="h-3.5 w-3.5 mr-1.5" />
              Code
            </Button>
          </div>
          <Button variant="ghost" size="sm" onClick={handleClearSketch} className="h-7 px-2 text-muted-foreground">
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            Clear
          </Button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="shrink-0 bg-destructive/10 border-b border-destructive/20 px-4 py-2 flex items-start gap-2 text-xs text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium">Failed to load sketch</p>
            <p className="opacity-90">{error}</p>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleAutoFix}
              disabled={isFixing}
              className="h-6 px-2 hover:bg-primary/10 text-primary">
              {isFixing ? (
                <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
              ) : (
                <Wand2 className="h-3.5 w-3.5 mr-1" />
              )}
              {isFixing ? 'Fixing...' : 'Auto-fix'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.location.reload()}
              className="h-6 px-2 hover:bg-destructive/10 text-destructive">
              <RefreshCw className="h-3.5 w-3.5 mr-1" />
              Reload
            </Button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 relative overflow-hidden">
        {viewMode === 'code' ? (
          <div className="h-full w-full bg-zinc-950 p-4 overflow-auto">
            <pre className="text-xs font-mono text-zinc-300 whitespace-pre-wrap font-medium">{rawContent}</pre>
          </div>
        ) : (
          <ContextMenu>
            <ContextMenuTrigger asChild onContextMenu={handleContextMenu}>
              <div className="h-full w-full">
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  onNodesChange={handleNodesChange}
                  onEdgesChange={handleEdgesChange}
                  onConnect={handleConnect}
                  onInit={handleInit}
                  onKeyDownCapture={(e) => { if (e.key.startsWith('Arrow')) e.stopPropagation() }}
                  nodeTypes={nodeTypes}
                  defaultViewport={viewport}
                  nodesDraggable
                  nodesConnectable
                  elementsSelectable
                  selectNodesOnDrag
                  selectionOnDrag
                  panOnScroll={true}
                  panOnScrollSpeed={1}
                  multiSelectionKeyCode="Shift"
                  fitView
                  minZoom={0.1}
                  maxZoom={2}
                  proOptions={{ hideAttribution: true }}
                  className="sketch-react-flow">
                  <Background color="var(--border)" gap={20} size={1} />
                  <Controls />
                  <MiniMap nodeColor="var(--primary)" maskColor="var(--background)" />
                </ReactFlow>
              </div>
            </ContextMenuTrigger>
            <ContextMenuContent className="w-56">
              {/* Text nodes */}
              <ContextMenuItem onClick={() => createNode('text', 'Text Note')}>
                <Type className="mr-2 h-4 w-4" />
                Text Note
              </ContextMenuItem>
              <ContextMenuItem onClick={() => createNode('richText', 'Rich Text')}>
                <Type className="mr-2 h-4 w-4" />
                Rich Text
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
              <ContextMenuItem onClick={() => createNode('canvasImage', 'Image')}>
                <ImageIcon className="mr-2 h-4 w-4" />
                Image
              </ContextMenuItem>
              <ContextMenuItem onClick={() => createNode('canvasEmbed', 'Web Embed')}>
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
                    Rectangle
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => createNode('shape', '', { shape: 'circle' })}>Circle</ContextMenuItem>
                  <ContextMenuItem onClick={() => createNode('shape', '', { shape: 'diamond' })}>
                    Diamond
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

              {/* Agent node types */}
              <ContextMenuSub>
                <ContextMenuSubTrigger>
                  <Bot className="mr-2 h-4 w-4" />
                  Agent Nodes
                </ContextMenuSubTrigger>
                <ContextMenuSubContent className="w-48">
                  <ContextMenuItem
                    onClick={() => createNode('code', 'Code', { code: '// Your code here', language: 'typescript' })}>
                    <Code2 className="mr-2 h-4 w-4" />
                    Code Block
                  </ContextMenuItem>
                  <ContextMenuItem
                    onClick={() => createNode('mermaid', 'Diagram', { code: 'flowchart TD\n  A[Start] --> B[End]' })}>
                    <GitBranch className="mr-2 h-4 w-4" />
                    Mermaid Diagram
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => createNode('chart', 'Chart', { chartType: 'bar' })}>
                    <BarChart3 className="mr-2 h-4 w-4" />
                    Chart
                  </ContextMenuItem>
                </ContextMenuSubContent>
              </ContextMenuSub>

              <ContextMenuSeparator />
              <div className="px-2 py-1.5 text-xs text-muted-foreground">Right-click to add • Shift+drag to select</div>
            </ContextMenuContent>
          </ContextMenu>
        )}

        {/* Empty state (only in visual mode) */}
        {viewMode === 'visual' && nodes.length === 0 && !error && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center p-8 bg-card/80 backdrop-blur-sm rounded-xl border border-border/50">
              <Sparkles className="h-12 w-12 text-primary/50 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Agent's Sketchpad</h3>
              <p className="text-sm text-muted-foreground max-w-[300px]">
                When I want to show you something visual - diagrams, images, code, or data - it will appear here.
              </p>
              <p className="text-xs text-muted-foreground mt-3">Right-click to add your own nodes</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default SketchViewer
