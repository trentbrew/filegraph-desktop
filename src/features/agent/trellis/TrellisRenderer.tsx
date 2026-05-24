/**
 * TrellisRenderer - Renders TDF (Trellis Document Format) blocks
 *
 * Converts structured block arrays into rich, interactive content.
 * Reuses visual patterns from SketchViewer for consistency.
 */

import * as React from 'react'
import { invoke } from '@tauri-apps/api/core'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import DOMPurify from 'dompurify'
import {
  Info,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Lightbulb,
  StickyNote,
  FileText,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Loader2,
  Code2,
  GitBranch,
  BarChart3,
  Check,
  Circle,
} from 'lucide-react'
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
import { cn } from '@/lib/utils'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import type {
  TrellisBlock,
  TrellisResponse,
  TextBlock,
  CodeBlock,
  MermaidBlock,
  ChartBlock,
  TableBlock,
  LinkBlock,
  EmbedBlock,
  ImageBlock,
  CalloutBlock,
  ListBlock,
  DividerBlock,
  ColumnsBlock,
  CollapsibleBlock,
  CalloutVariant,
} from './types'

// ─────────────────────────────────────────────────────────────────────────────
// Callout Icons & Colors
// ─────────────────────────────────────────────────────────────────────────────

const CALLOUT_CONFIG: Record<CalloutVariant, { icon: React.ElementType; className: string }> = {
  info: { icon: Info, className: 'bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400' },
  success: { icon: CheckCircle2, className: 'bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400' },
  warning: {
    icon: AlertTriangle,
    className: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-600 dark:text-yellow-400',
  },
  error: { icon: AlertCircle, className: 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400' },
  tip: { icon: Lightbulb, className: 'bg-purple-500/10 border-purple-500/30 text-purple-600 dark:text-purple-400' },
  note: { icon: StickyNote, className: 'bg-muted border-border text-muted-foreground' },
}

// ─────────────────────────────────────────────────────────────────────────────
// Block Renderers
// ─────────────────────────────────────────────────────────────────────────────

function TextBlockRenderer({ block }: { block: TextBlock }) {
  const style = block.style || 'paragraph'

  const styleClasses: Record<string, string> = {
    paragraph: 'text-sm leading-relaxed',
    heading: 'text-lg font-semibold mt-4 mb-2',
    subheading: 'text-base font-medium mt-3 mb-1.5 text-muted-foreground',
    callout: 'text-sm font-medium bg-muted/50 px-3 py-2 rounded-md',
    quote: 'text-sm italic border-l-2 border-primary/50 pl-3 text-muted-foreground',
    caption: 'text-xs text-muted-foreground',
  }

  return (
    <div className={cn('trellis-text', styleClasses[style])}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{block.content}</ReactMarkdown>
    </div>
  )
}

function CodeBlockRenderer({ block }: { block: CodeBlock }) {
  return (
    <div className="trellis-code my-3 rounded-lg overflow-hidden border border-zinc-700 bg-zinc-900">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 border-b border-zinc-700">
        <Code2 className="h-3.5 w-3.5 text-zinc-400" />
        <span className="text-xs text-zinc-400 font-mono">{block.language}</span>
        {block.filename && (
          <>
            <span className="text-zinc-600">•</span>
            <span className="text-xs text-zinc-500 font-mono">{block.filename}</span>
          </>
        )}
      </div>
      <pre className="p-3 text-sm font-mono text-zinc-100 overflow-x-auto">
        <code>{block.code}</code>
      </pre>
    </div>
  )
}

function sanitizeMermaidCode(code: string): string {
  // Replace @ with underscore in node IDs/labels (@ is reserved in Mermaid)
  // Match patterns like [@system] or A[@entities] and replace @ with _
  return code
    .replace(/@([a-zA-Z])/g, '_$1') // @system -> _system
    .replace(/\[@/g, '[_') // [@system] -> [_system]
}

function MermaidBlockRenderer({ block }: { block: MermaidBlock }) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [svg, setSvg] = React.useState<string>('')
  const [error, setError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(true)
  const idRef = React.useRef(`mermaid-${Math.random().toString(36).slice(2, 9)}`)

  React.useEffect(() => {
    const renderMermaid = async () => {
      try {
        setLoading(true)
        const mermaid = (await import('mermaid')).default
        mermaid.initialize({
          startOnLoad: false,
          theme: 'dark',
          securityLevel: 'strict',
          suppressErrorRendering: true,
        })
        mermaid.setParseErrorHandler(() => {})
        const sanitizedCode = sanitizeMermaidCode(block.code)
        await mermaid.parse(sanitizedCode)
        const { svg } = await mermaid.render(idRef.current, sanitizedCode)
        const sanitized = DOMPurify.sanitize(svg, {
          USE_PROFILES: { svg: true, svgFilters: true, html: false },
        })
        setSvg(sanitized)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to render diagram')
      } finally {
        setLoading(false)
      }
    }

    if (block.code) {
      renderMermaid()
    }
  }, [block.code])

  return (
    <div className="trellis-mermaid my-3 rounded-lg border bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/30 border-b">
        <GitBranch className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Diagram</span>
      </div>
      <div ref={containerRef} className="p-4 flex items-center justify-center min-h-[100px]">
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : error ? (
          <div className="text-sm text-destructive">{error}</div>
        ) : (
          <div dangerouslySetInnerHTML={{ __html: svg }} className="mermaid-svg" />
        )}
      </div>
      {block.caption && <div className="px-3 pb-2 text-xs text-muted-foreground text-center">{block.caption}</div>}
    </div>
  )
}

function ChartBlockRenderer({ block }: { block: ChartBlock }) {
  const transformedData = React.useMemo(() => {
    if (!block.data.labels || !block.data.datasets) return []
    return block.data.labels.map((label, index) => {
      const item: Record<string, unknown> = { name: label }
      block.data.datasets.forEach((dataset, dsIndex) => {
        const key = dataset.label || `series-${dsIndex}`
        item[key] = dataset.data?.[index] ?? 0
      })
      return item
    })
  }, [block.data])

  const colors = ['#3b82f6', '#ef4444', '#22c55e', '#eab308', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316']

  const renderChart = () => {
    const { datasets } = block.data

    if (block.chartType === 'pie' || block.chartType === 'doughnut') {
      if (!datasets.length) return <div className="text-muted-foreground text-sm">No data</div>
      const dataset = datasets[0]
      const pieData = block.data.labels.map((label, index) => ({
        name: label,
        value: dataset.data?.[index] ?? 0,
      }))

      return (
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={block.chartType === 'doughnut' ? '60%' : 0}
              outerRadius="80%"
              paddingAngle={2}
              dataKey="value">
              {pieData.map((_, index) => (
                <Cell key={index} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <RechartsTooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      )
    }

    const ChartComponent =
      {
        bar: BarChart,
        line: LineChart,
        area: AreaChart,
        scatter: ScatterChart,
      }[block.chartType] || BarChart

    return (
      <ResponsiveContainer width="100%" height={200}>
        <ChartComponent data={transformedData}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
          <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} />
          <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} />
          <RechartsTooltip
            contentStyle={{
              backgroundColor: 'var(--card)',
              borderColor: 'var(--border)',
              borderRadius: '6px',
            }}
          />
          <Legend />
          {datasets.map((ds, i) => {
            const bgColor = ds.backgroundColor
            const color = ds.borderColor || (Array.isArray(bgColor) ? bgColor[0] : bgColor) || colors[i % colors.length]
            const key = ds.label || `series-${i}`

            if (block.chartType === 'bar') return <Bar key={i} dataKey={key} fill={color} radius={[3, 3, 0, 0]} />
            if (block.chartType === 'line')
              return <Line key={i} type="monotone" dataKey={key} stroke={color} strokeWidth={2} dot={{ r: 3 }} />
            if (block.chartType === 'area')
              return <Area key={i} type="monotone" dataKey={key} fill={color} stroke={color} fillOpacity={0.2} />
            return null
          })}
        </ChartComponent>
      </ResponsiveContainer>
    )
  }

  return (
    <div className="trellis-chart my-3 rounded-lg border bg-card overflow-hidden">
      {block.title && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/30 border-b">
          <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{block.title}</span>
        </div>
      )}
      <div className="p-3">{renderChart()}</div>
    </div>
  )
}

function TableBlockRenderer({ block }: { block: TableBlock }) {
  return (
    <div className="trellis-table my-3 overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b bg-muted/30">
            {block.headers.map((header, i) => (
              <th key={i} className="px-3 py-2 text-left font-medium text-muted-foreground">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="border-b border-border/50">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-3 py-2">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {block.caption && <div className="text-xs text-muted-foreground mt-1">{block.caption}</div>}
    </div>
  )
}

function LinkBlockRenderer({ block }: { block: LinkBlock }) {
  const isEntityId = block.target.includes(':')
  const displayText = block.display || block.target

  return (
    <span
      className={cn(
        'trellis-link inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-sm font-medium cursor-pointer transition-colors',
        isEntityId ? 'bg-primary/10 text-primary hover:bg-primary/20' : 'bg-muted text-foreground hover:bg-muted/80',
      )}>
      {isEntityId ? <FileText className="h-3 w-3" /> : <ExternalLink className="h-3 w-3" />}
      {displayText}
    </span>
  )
}

function EmbedBlockRenderer({ block }: { block: EmbedBlock }) {
  const [content, setContent] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [isOpen, setIsOpen] = React.useState(!block.collapsed)
  const fileName = block.path.split('/').pop() || 'File'

  React.useEffect(() => {
    const loadFile = async () => {
      try {
        const result = await invoke<{ content: string }>('read_text_file', { filePath: block.path })
        let text = result.content
        if (block.lines) {
          const lines = text.split('\n')
          text = lines.slice(block.lines[0] - 1, block.lines[1]).join('\n')
        }
        setContent(text.slice(0, 2000) + (text.length > 2000 ? '\n...' : ''))
      } catch {
        setContent('Failed to load file')
      } finally {
        setLoading(false)
      }
    }
    loadFile()
  }, [block.path, block.lines])

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="trellis-embed my-3">
      <div className="rounded-lg border bg-card overflow-hidden">
        <CollapsibleTrigger className="w-full flex items-center gap-2 px-3 py-2 bg-muted/30 border-b hover:bg-muted/50 transition-colors">
          {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-mono text-muted-foreground flex-1 text-left">{fileName}</span>
          {block.lines && (
            <span className="text-xs text-muted-foreground/70">
              L{block.lines[0]}-{block.lines[1]}
            </span>
          )}
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="p-3 max-h-[300px] overflow-auto">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap">{content}</pre>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}

function ImageBlockRenderer({ block }: { block: ImageBlock }) {
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState(false)

  return (
    <div className="trellis-image my-3">
      <div className="rounded-lg border bg-card overflow-hidden">
        {loading && !error && (
          <div className="h-32 flex items-center justify-center bg-muted/30">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}
        {error ? (
          <div className="h-32 flex items-center justify-center bg-muted/30 text-muted-foreground text-sm">
            Failed to load image
          </div>
        ) : (
          <img
            src={block.src}
            alt={block.alt || 'Image'}
            className={cn('w-full object-contain max-h-[400px]', loading && 'hidden')}
            onLoad={() => setLoading(false)}
            onError={() => {
              setLoading(false)
              setError(true)
            }}
          />
        )}
      </div>
      {block.caption && <div className="text-xs text-muted-foreground text-center mt-1">{block.caption}</div>}
    </div>
  )
}

function CalloutBlockRenderer({ block }: { block: CalloutBlock }) {
  const config = CALLOUT_CONFIG[block.variant]
  const Icon = config.icon

  return (
    <div className={cn('trellis-callout my-3 rounded-lg border p-3', config.className)}>
      <div className="flex gap-2">
        <Icon className="h-4 w-4 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          {block.title && <div className="font-medium text-sm mb-1">{block.title}</div>}
          <div className="text-sm">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{block.content}</ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  )
}

function ListBlockRenderer({ block }: { block: ListBlock }) {
  const renderItem = (item: ListBlock['items'][0], index: number) => {
    const bullet =
      block.style === 'numbered' ? (
        <span className="text-muted-foreground mr-2">{index + 1}.</span>
      ) : block.style === 'checklist' ? (
        item.checked ? (
          <Check className="h-4 w-4 text-green-500 mr-2 shrink-0" />
        ) : (
          <Circle className="h-4 w-4 text-muted-foreground mr-2 shrink-0" />
        )
      ) : (
        <span className="text-muted-foreground mr-2">•</span>
      )

    return (
      <li key={index} className="flex items-start py-0.5">
        {bullet}
        <div className="flex-1">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{item.content}</ReactMarkdown>
          {item.children && item.children.length > 0 && (
            <ul className="ml-4 mt-1">{item.children.map((child, i) => renderItem(child, i))}</ul>
          )}
        </div>
      </li>
    )
  }

  return (
    <ul className="trellis-list my-2 text-sm list-none">{block.items.map((item, index) => renderItem(item, index))}</ul>
  )
}

function DividerBlockRenderer() {
  return <hr className="trellis-divider my-4 border-border/50" />
}

function ColumnsBlockRenderer({ block }: { block: ColumnsBlock }) {
  return (
    <div
      className="trellis-columns my-3 grid gap-4"
      style={{ gridTemplateColumns: `repeat(${block.columns.length}, 1fr)` }}>
      {block.columns.map((column, i) => (
        <div key={i} className="min-w-0">
          {column.map((b, j) => (
            <BlockRenderer key={j} block={b} />
          ))}
        </div>
      ))}
    </div>
  )
}

function CollapsibleBlockRenderer({ block }: { block: CollapsibleBlock }) {
  const [isOpen, setIsOpen] = React.useState(block.defaultOpen ?? false)

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="trellis-collapsible my-3">
      <div className="rounded-lg border bg-card overflow-hidden">
        <CollapsibleTrigger className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/50 transition-colors">
          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <span className="font-medium text-sm">{block.title}</span>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-3 pb-3 pt-1">
            {block.blocks.map((b, i) => (
              <BlockRenderer key={i} block={b} />
            ))}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Block Router
// ─────────────────────────────────────────────────────────────────────────────

function BlockRenderer({ block }: { block: TrellisBlock }) {
  switch (block.type) {
    case 'text':
      return <TextBlockRenderer block={block} />
    case 'code':
      return <CodeBlockRenderer block={block} />
    case 'mermaid':
      return <MermaidBlockRenderer block={block} />
    case 'chart':
      return <ChartBlockRenderer block={block} />
    case 'table':
      return <TableBlockRenderer block={block} />
    case 'link':
      return <LinkBlockRenderer block={block} />
    case 'embed':
      return <EmbedBlockRenderer block={block} />
    case 'image':
      return <ImageBlockRenderer block={block} />
    case 'callout':
      return <CalloutBlockRenderer block={block} />
    case 'list':
      return <ListBlockRenderer block={block} />
    case 'divider':
      return <DividerBlockRenderer />
    case 'columns':
      return <ColumnsBlockRenderer block={block} />
    case 'collapsible':
      return <CollapsibleBlockRenderer block={block} />
    default:
      return <div className="text-xs text-muted-foreground">[Unknown block type]</div>
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

interface TrellisRendererProps {
  response: TrellisResponse
  className?: string
}

export function TrellisRenderer({ response, className }: TrellisRendererProps) {
  return (
    <div className={cn('trellis-renderer', className)}>
      {response.blocks.map((block, index) => (
        <BlockRenderer key={index} block={block} />
      ))}
    </div>
  )
}
