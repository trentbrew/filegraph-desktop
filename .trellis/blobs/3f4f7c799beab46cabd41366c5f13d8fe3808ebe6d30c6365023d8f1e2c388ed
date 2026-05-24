import * as React from 'react'
import { path as tauriPath } from '@tauri-apps/api'
import * as d3 from 'd3'
import { Network, RefreshCw, Scan, Filter, X, FileText } from 'lucide-react'
import { invoke } from '@tauri-apps/api/core'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useTQL } from '@/hooks/useTQL'
import type { GlobalGraph } from '@/lib/tql'

const MAX_NODES_DEFAULT = 500

interface SimNode {
  id: string
  label: string
  namespace: string
  file: string
  type: string
  x?: number
  y?: number
  vx?: number
  vy?: number
  fx?: number | null
  fy?: number | null
}

interface SimLink {
  source: string | SimNode
  target: string | SimNode
}

function getNamespaceColor(namespace: string): string {
  const colors: Record<string, string> = {
    '@entities': '#3b82f6',
    '@finance': '#10b981',
    '@calendar': '#f59e0b',
    '@notes': '#8b5cf6',
    '@brand': '#ec4899',
    '@system': '#64748b',
    '@web': '#0ea5e9',
  }
  return colors[namespace] || '#6b7280'
}

function D3NetworkGraph({
  graph,
  maxNodes,
  onHover,
  onClick,
}: {
  graph: GlobalGraph
  maxNodes: number
  onHover?: (node: SimNode | null) => void
  onClick?: (node: SimNode) => void
}) {
  const svgRef = React.useRef<SVGSVGElement>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!svgRef.current || !containerRef.current || !graph) return

    const container = containerRef.current
    const width = container.clientWidth
    const height = container.clientHeight

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const truncated = graph.nodes.length > maxNodes
    const limitedNodes = truncated ? graph.nodes.slice(0, maxNodes) : graph.nodes
    const nodeIds = new Set(limitedNodes.map((n) => n.id))

    const nodes: SimNode[] = limitedNodes.map((n) => ({
      id: n.id,
      label: n.label,
      namespace: n.namespace,
      file: n.file,
      type: n.type,
    }))

    const nodeMap = new Map(nodes.map((n) => [n.id, n]))

    const links: SimLink[] = graph.edges
      .filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target))
      .slice(0, 2000)
      .map((e) => ({
        source: e.source,
        target: e.target,
      }))

    const nodeCount = nodes.length
    const chargeStrength = Math.max(-300, -80 - nodeCount * 0.3)
    const linkDistance = Math.max(30, 50 + nodeCount * 0.02)

    const simulation = d3
      .forceSimulation(nodes)
      .force('charge', d3.forceManyBody().strength(chargeStrength).distanceMax(300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force(
        'link',
        d3
          .forceLink(links)
          .id((d: any) => d.id)
          .distance(linkDistance)
          .strength(0.3),
      )
      .force('collide', (d3 as any).forceCollide(8).strength(0.8))
      .force('x', (d3 as any).forceX(width / 2).strength(0.05))
      .force('y', (d3 as any).forceY(height / 2).strength(0.05))

    const g = svg.append('g')

    // Labels group - created early so zoom can reference it
    const labelsGroup = g.append('g').attr('class', 'labels')

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .filter((event) => {
        // Figma-style: allow wheel zoom and touch/drag pan
        // Prevent default scroll hijacking - only zoom on ctrl+wheel or pinch
        if (event.type === 'wheel') {
          return event.ctrlKey || event.metaKey
        }
        return true
      })
      .on('zoom', (event) => {
        g.attr('transform', event.transform)
        // Show labels only when zoomed in enough
        const scale = event.transform.k
        labelsGroup.style('opacity', scale > 0.8 ? Math.min(1, (scale - 0.8) * 2.5) : 0)
      })

    // Enable 2-finger pan (trackpad scroll without ctrl)
    svg.on('wheel.pan', (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) {
        event.preventDefault()
        const currentTransform = d3.zoomTransform(svg.node()!)
        const newTransform = currentTransform.translate(-event.deltaX, -event.deltaY)
        svg.call(zoom.transform, newTransform)
      }
    })

    svg.call(zoom)
    svg.call(zoom.transform, d3.zoomIdentity.translate(width / 4, height / 4).scale(0.7))

    const link = g
      .append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', 'hsl(var(--muted-foreground))')
      .attr('stroke-opacity', 0.15)
      .attr('stroke-width', 1)

    const node = g
      .append('g')
      .attr('class', 'nodes')
      .selectAll('circle')
      .data(nodes)
      .join('circle')
      .attr('r', 5)
      .attr('fill', (d) => getNamespaceColor(d.namespace))
      .attr('stroke', 'hsl(var(--background))')
      .attr('stroke-width', 1)
      .style('cursor', 'pointer')
      .on('mouseenter', function (event, d) {
        d3.select(this).attr('r', 8).attr('stroke-width', 2)
        onHover?.(d)
      })
      .on('mouseleave', function () {
        d3.select(this).attr('r', 5).attr('stroke-width', 1)
        onHover?.(null)
      })
      .on('click', function (event, d) {
        event.stopPropagation()
        onClick?.(d)
      })

    // Use existing labelsGroup created earlier for zoom-based visibility
    const label = labelsGroup
      .selectAll('text')
      .data(nodes)
      .join('text')
      .text((d) => d.label)
      .attr('font-size', 9)
      .attr('dx', 8)
      .attr('dy', 3)
      .style('fill', '#e4e4e7')
      .style('pointer-events', 'none')

    // Set initial opacity based on initial zoom scale (0.7)
    labelsGroup.style('opacity', 0)

    simulation.on('tick', () => {
      link
        .attr('x1', (d) => (d.source as SimNode).x ?? 0)
        .attr('y1', (d) => (d.source as SimNode).y ?? 0)
        .attr('x2', (d) => (d.target as SimNode).x ?? 0)
        .attr('y2', (d) => (d.target as SimNode).y ?? 0)

      node.attr('cx', (d) => d.x ?? 0).attr('cy', (d) => d.y ?? 0)

      label.attr('x', (d) => d.x ?? 0).attr('y', (d) => d.y ?? 0)
    })

    simulation.alpha(1).restart()

    return () => {
      simulation.stop()
    }
  }, [graph, maxNodes, onHover])

  return (
    <div ref={containerRef} className="w-full h-full">
      <svg ref={svgRef} className="w-full h-full" style={{ background: 'transparent' }} />
    </div>
  )
}

export function GraphDockView({ className }: { className?: string }) {
  const [tqlState, tqlActions] = useTQL()
  const [graph, setGraph] = React.useState<GlobalGraph | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [maxNodes, setMaxNodes] = React.useState(MAX_NODES_DEFAULT)
  const [hoveredNode, setHoveredNode] = React.useState<SimNode | null>(null)
  const [selectedNode, setSelectedNode] = React.useState<SimNode | null>(null)
  const [fileContent, setFileContent] = React.useState<string | null>(null)
  const [fileLoading, setFileLoading] = React.useState(false)

  // Load file content when a node is selected
  const handleNodeClick = React.useCallback(async (node: SimNode) => {
    setSelectedNode(node)
    setFileLoading(true)
    setFileContent(null)
    try {
      // Build full path: vaultDir + namespace + file
      // node.file is relative to namespace (e.g. "README.md" in "@notes")
      const homeDir = await tauriPath.homeDir()
      const vaultDir = homeDir.endsWith('/') ? `${homeDir}.filegraph` : `${homeDir}/.filegraph`
      const fullPath = node.file.startsWith('/') ? node.file : `${vaultDir}/${node.namespace}/${node.file}`

      const result = await invoke<{ content: string }>('read_text_file', { filePath: fullPath })
      setFileContent(result.content)
    } catch (err) {
      console.error('[GraphDockView] Failed to load file:', err)
      setFileContent(`Error loading file: ${err}`)
    } finally {
      setFileLoading(false)
    }
  }, [])

  const loadGraph = React.useCallback(async () => {
    const runtime = tqlActions.getRuntime()
    if (!runtime) return

    setLoading(true)
    try {
      const g = await runtime.buildGlobalGraph()
      setGraph(g)
    } catch (err) {
      console.error('[GraphDockView] Failed to build graph:', err)
      setGraph(null)
    } finally {
      setLoading(false)
    }
  }, [tqlActions])

  const handleScanHomeVault = React.useCallback(async () => {
    setLoading(true)
    try {
      const homeDir = await tauriPath.homeDir()
      const vaultDir = `${homeDir}/.filegraph`
      await tqlActions.scanDirectory(vaultDir)
      await loadGraph()
    } catch (err) {
      console.error('[GraphDockView] Scan ~/.filegraph failed:', err)
    } finally {
      setLoading(false)
    }
  }, [tqlActions, loadGraph])

  // Auto-scan when TQL runtime is initialized
  React.useEffect(() => {
    if (tqlState.initialized) {
      void handleScanHomeVault()
    }
  }, [tqlState.initialized, handleScanHomeVault])

  const truncated = graph ? graph.nodes.length > maxNodes : false

  return (
    <div className={cn('flex h-full w-full flex-col bg-background/50', className)}>
      <div className="flex items-center justify-between gap-2 border-b bg-background/50 px-3 py-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Network className="h-4 w-4" />
          Graph
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleScanHomeVault}
            disabled={tqlState.scanning || loading}
            title="Scan ~/.filegraph">
            <Scan />
            Scan ~/.filegraph
          </Button>
          <Button size="sm" variant="outline" onClick={loadGraph} disabled={loading} title="Refresh graph">
            <RefreshCw />
            Refresh
          </Button>
        </div>
      </div>

      <div className="relative flex-1 flex w-full">
        {/* Graph area */}
        <div className={cn('relative flex-1 transition-all', selectedNode ? 'mr-80' : '')}>
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50 text-sm text-muted-foreground">
              Building graph…
            </div>
          )}

          {graph && (
            <D3NetworkGraph graph={graph} maxNodes={maxNodes} onHover={setHoveredNode} onClick={handleNodeClick} />
          )}

          {hoveredNode && !selectedNode && (
            <div className="absolute top-3 right-3 bg-background/95 border border-border rounded-md px-3 py-2 text-xs shadow-lg max-w-[280px]">
              <div className="font-semibold text-sm mb-1">{hoveredNode.label}</div>
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: getNamespaceColor(hoveredNode.namespace) }}
                />
                <span className="text-muted-foreground">{hoveredNode.namespace}</span>
              </div>
              <div className="text-muted-foreground truncate">
                <span className="font-medium">File:</span> {hoveredNode.file}
              </div>
            </div>
          )}

          {graph && (
            <div className="absolute bottom-3 left-3 bg-background/90 border border-border rounded-md px-2 py-1 text-xs text-muted-foreground flex items-center gap-2">
              <Filter className="h-3 w-3" />
              <span>
                {Math.min(maxNodes, graph.nodes.length)} nodes, {Math.min(2000, graph.edges.length)} edges
              </span>
              {truncated && (
                <button
                  onClick={() => setMaxNodes((m) => Math.min(m + 500, 3000))}
                  className="text-primary hover:underline font-medium">
                  Load more
                </button>
              )}
            </div>
          )}
        </div>

        {/* File preview sidebar */}
        {selectedNode && (
          <div className="absolute right-0 top-0 bottom-0 w-80 bg-background border-l border-border flex flex-col">
            <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="text-sm font-medium truncate">{selectedNode.label}</span>
              </div>
              <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={() => setSelectedNode(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 border-b border-border bg-muted/30">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: getNamespaceColor(selectedNode.namespace) }}
              />
              <span className="text-xs text-muted-foreground truncate">{selectedNode.file}</span>
            </div>
            <div className="flex-1 overflow-auto p-3">
              {fileLoading ? (
                <div className="text-sm text-muted-foreground">Loading…</div>
              ) : fileContent ? (
                <pre className="text-xs font-mono whitespace-pre-wrap break-words text-foreground/80">
                  {fileContent}
                </pre>
              ) : (
                <div className="text-sm text-muted-foreground">No content</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
