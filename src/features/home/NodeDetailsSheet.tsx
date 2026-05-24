/**
 * NodeDetailsPanel - Shows detailed information about a selected node
 *
 * Displays metadata, properties, edit history, and actions for a canvas node.
 * Renders as an inline panel within the canvas container (not a viewport-level sheet).
 */

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Info,
  History,
  Settings2,
  Copy,
  Trash2,
  Undo2,
  Redo2,
  Bot,
  User,
  FileText,
  StickyNote,
  Image,
  Globe,
  Table,
  Shapes,
  Clock,
  Hash,
  Move,
  Maximize2,
  X,
  GripVertical,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Node } from 'reactflow'
import { useHomeCanvasHistory, formatActionDescription, type CanvasAction } from './useHomeCanvasHistory'
import { useHomeCanvasStore } from './useHomeCanvasStore'
import { toast } from 'sonner'

interface NodeDetailsPanelProps {
  node: Node | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onWidthChange?: (width: number) => void
}

const NODE_TYPE_ICONS: Record<string, React.ReactNode> = {
  richText: <FileText className="h-4 w-4" />,
  stickyNote: <StickyNote className="h-4 w-4" />,
  image: <Image className="h-4 w-4" />,
  embed: <Globe className="h-4 w-4" />,
  table: <Table className="h-4 w-4" />,
  shape: <Shapes className="h-4 w-4" />,
}

const NODE_TYPE_LABELS: Record<string, string> = {
  richText: 'Rich Text',
  stickyNote: 'Sticky Note',
  image: 'Image',
  embed: 'Web Embed',
  table: 'Table',
  shape: 'Shape',
}

function formatDate(timestamp: number | string | undefined): string {
  if (!timestamp) return 'Unknown'
  const date = new Date(timestamp)
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function HistoryItem({ action }: { action: CanvasAction }) {
  const isAgent = action.actor === 'agent'

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
      <div
        className={cn(
          'mt-0.5 p-1.5 rounded-full',
          isAgent ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
        )}>
        {isAgent ? <Bot className="h-3 w-3" /> : <User className="h-3 w-3" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{action.description}</p>
        <p className="text-xs text-muted-foreground">
          {isAgent ? 'Agent' : 'You'} • {formatDate(action.timestamp)}
        </p>
      </div>
    </motion.div>
  )
}

const MIN_WIDTH = 280
const MAX_WIDTH = 600
const DEFAULT_WIDTH = 320

export function NodeDetailsPanel({ node, open, onOpenChange, onWidthChange }: NodeDetailsPanelProps) {
  const { getNodeHistory, undo, redo, canUndo, canRedo } = useHomeCanvasHistory()
  const { removeNode, setNodes, setEdges } = useHomeCanvasStore()

  // Resize state
  const [panelWidth, setPanelWidth] = React.useState(DEFAULT_WIDTH)
  const isResizing = React.useRef(false)
  const startX = React.useRef(0)
  const startWidth = React.useRef(DEFAULT_WIDTH)

  const handleResizeStart = React.useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      isResizing.current = true
      startX.current = e.clientX
      startWidth.current = panelWidth
      document.body.style.cursor = 'ew-resize'
      document.body.style.userSelect = 'none'
    },
    [panelWidth],
  )

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return
      const delta = startX.current - e.clientX
      const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth.current + delta))
      setPanelWidth(newWidth)
      onWidthChange?.(newWidth)
    }

    const handleMouseUp = () => {
      if (isResizing.current) {
        isResizing.current = false
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  const nodeHistory = React.useMemo(() => {
    if (!node) return []
    return getNodeHistory(node.id, 20)
  }, [node, getNodeHistory])

  const handleCopyId = React.useCallback(() => {
    if (!node) return
    navigator.clipboard.writeText(node.id)
    toast.success('Node ID copied to clipboard')
  }, [node])

  const handleDelete = React.useCallback(async () => {
    if (!node) return
    await removeNode(node.id)
    onOpenChange(false)
    toast.success('Node deleted')
  }, [node, removeNode, onOpenChange])

  const handleUndo = React.useCallback(() => {
    const action = undo()
    if (action) {
      if (action.before.nodes) {
        setNodes(action.before.nodes)
      }
      if (action.before.edges) {
        setEdges(action.before.edges)
      }
      toast.success('Undone: ' + action.description)
    }
  }, [undo, setNodes, setEdges])

  const handleRedo = React.useCallback(() => {
    const action = redo()
    if (action) {
      if (action.after.nodes) {
        setNodes(action.after.nodes)
      }
      if (action.after.edges) {
        setEdges(action.after.edges)
      }
      toast.success('Redone: ' + action.description)
    }
  }, [redo, setNodes, setEdges])

  const nodeType = node?.type || 'unknown'
  const nodeLabel = node?.data?.label || nodeType
  const filePath = node?.data?.file as string | undefined
  const position = node?.position || { x: 0, y: 0 }
  const width = (node?.style?.width as number) || (node?.width as number) || 300
  const height = (node?.style?.height as number) || (node?.height as number) || 200

  return (
    <AnimatePresence>
      {open && node && (
        <motion.div
          initial={{ x: '100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          style={{ width: panelWidth }}
          className="absolute top-4 right-4 bottom-4 z-50 bg-card/80 backdrop-blur-xl border border-border rounded-lg shadow-lg flex flex-col overflow-hidden">
          {/* Resize handle */}
          <div
            onMouseDown={handleResizeStart}
            className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-primary/30 active:bg-primary/50 transition-colors group z-10 flex items-center">
            <div className="absolute left-0 w-3 h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
          {/* Header */}
          <div className="p-3 pb-2 border-b border-border flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-muted">
              {NODE_TYPE_ICONS[nodeType] || <Shapes className="h-3.5 w-3.5" />}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium truncate">{nodeLabel}</h3>
              <p className="text-xs text-muted-foreground">{NODE_TYPE_LABELS[nodeType] || nodeType}</p>
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => onOpenChange(false)}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="details" className="flex-1 flex flex-col min-h-0">
            <TabsList className="w-full justify-start px-0 h-8 bg-transparent border-b  border-border rounded-none shrink-0">
              <TabsTrigger value="details" className="text-xs gap-2 h-8 px-3 bg-transparent!">
                <Info className="h-3 w-3" />
                Details
              </TabsTrigger>
              <TabsTrigger value="history" className="text-xs gap-2 h-8 px-3 bg-transparent!">
                <History className="h-3 w-3" />
                History
                {nodeHistory.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                    {nodeHistory.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="m-0 p-0 flex-1 min-h-0">
              <ScrollArea className="h-full ">
                <div className="p-3 space-y-3 overflow-x-hidden max-w-full">
                  {/* Metadata Section */}
                  <div className="space-y-1.5" style={{ maxWidth: '100%' }}>
                    <h4 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Metadata</h4>
                    <div className="space-y-1" style={{ maxWidth: '100%' }}>
                      <div
                        className="flex items-center justify-between gap-2 py-1 px-2 rounded-md bg-muted/0"
                        style={{ maxWidth: '100%' }}>
                        <span
                          className="text-[11px] text-muted-foreground flex items-center gap-1 min-w-0"
                          style={{ maxWidth: '50%' }}>
                          <Hash className="h-2.5 w-2.5" />
                          ID
                        </span>
                        <div className="flex items-center gap-1 min-w-0" style={{ maxWidth: '50%' }}>
                          <code className="text-[10px] font-mono truncate block flex-1 min-w-0" title={node.id}>
                            {node.id}
                          </code>
                          <Button variant="ghost" size="icon" className="h-4 w-4" onClick={handleCopyId}>
                            <Copy className="h-2.5 w-2.5" />
                          </Button>
                        </div>
                      </div>
                      <div
                        className="flex items-center justify-between gap-2 py-1 px-2 rounded-md "
                        style={{ maxWidth: '100%' }}>
                        <span className="text-[11px] text-muted-foreground min-w-0" style={{ maxWidth: '50%' }}>
                          Type
                        </span>
                        <div className="min-w-0" style={{ maxWidth: '50%' }}>
                          <Badge variant="outline" className="text-[10px] h-5 max-w-full truncate">
                            {NODE_TYPE_LABELS[nodeType] || nodeType}
                          </Badge>
                        </div>
                      </div>
                      {filePath && (
                        <div
                          className="flex items-center justify-between gap-2 py-1 px-2 rounded-md bg-muted/0"
                          style={{ maxWidth: '100%' }}>
                          <span
                            className="text-[11px] text-muted-foreground flex items-center gap-1 min-w-0"
                            style={{ maxWidth: '50%' }}>
                            <FileText className="h-2.5 w-2.5" />
                            File
                          </span>
                          <div className="min-w-0" style={{ maxWidth: '60%' }}>
                            <code className="text-[10px] font-mono truncate block" title={filePath}>
                              {filePath}
                            </code>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* Position & Dimensions */}
                  <div className="space-y-1.5">
                    <h4 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                      Properties
                    </h4>
                    <div className="grid grid-cols-2 gap-1.5">
                      <div className="p-1.5 rounded-md bg-muted/0">
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1 mb-0.5">
                          <Move className="h-2.5 w-2.5" />
                          Position
                        </span>
                        <p className="text-xs font-mono">
                          {Math.round(position.x)}, {Math.round(position.y)}
                        </p>
                      </div>
                      <div className="p-1.5 rounded-md bg-muted/0">
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1 mb-0.5">
                          <Maximize2 className="h-2.5 w-2.5" />
                          Size
                        </span>
                        <p className="text-xs font-mono">
                          {Math.round(width)} × {Math.round(height)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Node-specific data */}
                  {node.data && Object.keys(node.data).length > 0 && (
                    <>
                      <div className="space-y-1.5">
                        <h4 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                          Node Data
                        </h4>
                        <div className="p-1.5 rounded-md bg-muted/0 overflow-hidden">
                          <pre className="text-[10px] font-mono whitespace-pre-wrap break-all overflow-x-auto max-h-[150px]">
                            {JSON.stringify(node.data, null, 2)}
                          </pre>
                        </div>
                      </div>
                      <Separator />
                    </>
                  )}

                  {/* Actions */}
                  <div className="space-y-1.5">
                    <h4 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Actions</h4>
                    <div className="flex flex-wrap gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-[10px] h-6 px-2"
                        onClick={handleUndo}
                        disabled={!canUndo()}>
                        <Undo2 className="h-2.5 w-2.5 mr-1" />
                        Undo
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-[10px] h-6 px-2"
                        onClick={handleRedo}
                        disabled={!canRedo()}>
                        <Redo2 className="h-2.5 w-2.5 mr-1" />
                        Redo
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-[10px] h-6 px-2 text-destructive hover:text-destructive"
                        onClick={handleDelete}>
                        <Trash2 className="h-2.5 w-2.5 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="history" className="m-0 p-0 flex-1 min-h-0">
              <ScrollArea className="h-full">
                <div className="p-3">
                  {nodeHistory.length === 0 ? (
                    <div className="text-center py-6">
                      <History className="h-6 w-6 mx-auto text-muted-foreground/50 mb-2" />
                      <p className="text-xs text-muted-foreground">No edit history yet</p>
                      <p className="text-[10px] text-muted-foreground/70 mt-1">Changes will appear here</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {nodeHistory.map((action) => (
                        <HistoryItem key={action.id} action={action} />
                      ))}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Keep legacy export for backwards compatibility
export { NodeDetailsPanel as NodeDetailsSheet }
