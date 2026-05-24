/**
 * Canvas Utilities
 *
 * Pro-level features for HomeCanvas:
 * - Auto-layout using dagre
 * - Helper lines (alignment guides)
 * - Copy-paste functionality
 */

import Dagre from '@dagrejs/dagre'
import { Position, getConnectedEdges, type Node, type Edge, type NodePositionChange } from 'reactflow'

// ============================================
// AUTO-LAYOUT
// ============================================

export type LayoutDirection = 'TB' | 'LR' | 'BT' | 'RL'

const getHandlePositions = (direction: LayoutDirection) => {
  switch (direction) {
    case 'TB':
      return { source: Position.Bottom, target: Position.Top }
    case 'BT':
      return { source: Position.Top, target: Position.Bottom }
    case 'LR':
      return { source: Position.Right, target: Position.Left }
    case 'RL':
      return { source: Position.Left, target: Position.Right }
    default:
      return { source: Position.Bottom, target: Position.Top }
  }
}

export interface LayoutOptions {
  direction?: LayoutDirection
  nodeSpacing?: number
  rankSpacing?: number
}

export function getLayoutedElements(
  nodes: Node[],
  edges: Edge[],
  options: LayoutOptions = {},
): { nodes: Node[]; edges: Edge[] } {
  const { direction = 'TB', nodeSpacing = 80, rankSpacing = 100 } = options

  if (nodes.length === 0) {
    return { nodes, edges }
  }

  const g = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}))

  g.setGraph({
    rankdir: direction,
    nodesep: nodeSpacing,
    ranksep: rankSpacing,
    marginx: 50,
    marginy: 50,
  })

  nodes.forEach((node) => {
    const measured = (node as any).measured as { width?: number; height?: number } | undefined
    const width = (node.style?.width as number) || measured?.width || 200
    const height = (node.style?.height as number) || measured?.height || 150
    g.setNode(node.id, { width, height })
  })

  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target)
  })

  Dagre.layout(g)

  const { source: sourcePos, target: targetPos } = getHandlePositions(direction)

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = g.node(node.id)
    const measured = (node as any).measured as { width?: number; height?: number } | undefined
    const width = (node.style?.width as number) || measured?.width || 200
    const height = (node.style?.height as number) || measured?.height || 150

    return {
      ...node,
      position: {
        x: nodeWithPosition.x - width / 2,
        y: nodeWithPosition.y - height / 2,
      },
      sourcePosition: sourcePos,
      targetPosition: targetPos,
    }
  })

  return { nodes: layoutedNodes, edges }
}

// ============================================
// GRID LAYOUT
// ============================================

export interface GridLayoutOptions {
  columns?: number
  gapX?: number
  gapY?: number
}

export function getGridLayoutedElements(
  nodes: Node[],
  edges: Edge[],
  options: GridLayoutOptions = {},
): { nodes: Node[]; edges: Edge[] } {
  const { columns, gapX = 48, gapY = 48 } = options

  if (nodes.length === 0) {
    return { nodes, edges }
  }

  const bounds = nodes.reduce(
    (acc, n) => {
      return {
        minX: Math.min(acc.minX, n.position.x),
        maxX: Math.max(acc.maxX, n.position.x),
        minY: Math.min(acc.minY, n.position.y),
        maxY: Math.max(acc.maxY, n.position.y),
      }
    },
    { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity },
  )

  const measuredSizes = nodes.map((node) => {
    const measured = (node as any).measured as { width?: number; height?: number } | undefined
    const width = (node.style?.width as number) || measured?.width || 200
    const height = (node.style?.height as number) || measured?.height || 150
    return { width, height }
  })

  const maxWidth = Math.max(...measuredSizes.map((s) => s.width))
  const maxHeight = Math.max(...measuredSizes.map((s) => s.height))

  const cols = Math.max(1, columns ?? Math.ceil(Math.sqrt(nodes.length)))
  const startX = bounds.minX
  const startY = bounds.minY

  const layoutedNodes = nodes.map((node, index) => {
    const col = index % cols
    const row = Math.floor(index / cols)

    return {
      ...node,
      position: {
        x: startX + col * (maxWidth + gapX),
        y: startY + row * (maxHeight + gapY),
      },
    }
  })

  return { nodes: layoutedNodes, edges }
}

// ============================================
// HELPER LINES (Alignment Guides)
// ============================================

export interface HelperLines {
  horizontal: number | null
  vertical: number | null
}

const SNAP_THRESHOLD = 8

export function getHelperLines(
  change: NodePositionChange,
  nodes: Node[],
  nodeId: string,
): {
  helperLines: HelperLines
  snappedPosition: { x: number; y: number } | null
} {
  const movingNode = nodes.find((n) => n.id === nodeId)
  if (!movingNode || !change.position) {
    return {
      helperLines: { horizontal: null, vertical: null },
      snappedPosition: null,
    }
  }

  const measured = (movingNode as any).measured as { width?: number; height?: number } | undefined
  const movingNodeWidth = (movingNode.style?.width as number) || measured?.width || 200
  const movingNodeHeight = (movingNode.style?.height as number) || measured?.height || 150

  const movingBounds = {
    left: change.position.x,
    right: change.position.x + movingNodeWidth,
    top: change.position.y,
    bottom: change.position.y + movingNodeHeight,
    centerX: change.position.x + movingNodeWidth / 2,
    centerY: change.position.y + movingNodeHeight / 2,
  }

  let horizontalLine: number | null = null
  let verticalLine: number | null = null
  let snappedX = change.position.x
  let snappedY = change.position.y

  for (const node of nodes) {
    if (node.id === nodeId) continue

    const nodeMeasured = (node as any).measured as { width?: number; height?: number } | undefined
    const nodeWidth = (node.style?.width as number) || nodeMeasured?.width || 200
    const nodeHeight = (node.style?.height as number) || nodeMeasured?.height || 150

    const nodeBounds = {
      left: node.position.x,
      right: node.position.x + nodeWidth,
      top: node.position.y,
      bottom: node.position.y + nodeHeight,
      centerX: node.position.x + nodeWidth / 2,
      centerY: node.position.y + nodeHeight / 2,
    }

    // Check vertical alignment (left, center, right)
    if (Math.abs(movingBounds.left - nodeBounds.left) < SNAP_THRESHOLD) {
      verticalLine = nodeBounds.left
      snappedX = nodeBounds.left
    } else if (Math.abs(movingBounds.centerX - nodeBounds.centerX) < SNAP_THRESHOLD) {
      verticalLine = nodeBounds.centerX
      snappedX = nodeBounds.centerX - movingNodeWidth / 2
    } else if (Math.abs(movingBounds.right - nodeBounds.right) < SNAP_THRESHOLD) {
      verticalLine = nodeBounds.right
      snappedX = nodeBounds.right - movingNodeWidth
    } else if (Math.abs(movingBounds.left - nodeBounds.right) < SNAP_THRESHOLD) {
      verticalLine = nodeBounds.right
      snappedX = nodeBounds.right
    } else if (Math.abs(movingBounds.right - nodeBounds.left) < SNAP_THRESHOLD) {
      verticalLine = nodeBounds.left
      snappedX = nodeBounds.left - movingNodeWidth
    }

    // Check horizontal alignment (top, center, bottom)
    if (Math.abs(movingBounds.top - nodeBounds.top) < SNAP_THRESHOLD) {
      horizontalLine = nodeBounds.top
      snappedY = nodeBounds.top
    } else if (Math.abs(movingBounds.centerY - nodeBounds.centerY) < SNAP_THRESHOLD) {
      horizontalLine = nodeBounds.centerY
      snappedY = nodeBounds.centerY - movingNodeHeight / 2
    } else if (Math.abs(movingBounds.bottom - nodeBounds.bottom) < SNAP_THRESHOLD) {
      horizontalLine = nodeBounds.bottom
      snappedY = nodeBounds.bottom - movingNodeHeight
    } else if (Math.abs(movingBounds.top - nodeBounds.bottom) < SNAP_THRESHOLD) {
      horizontalLine = nodeBounds.bottom
      snappedY = nodeBounds.bottom
    } else if (Math.abs(movingBounds.bottom - nodeBounds.top) < SNAP_THRESHOLD) {
      horizontalLine = nodeBounds.top
      snappedY = nodeBounds.top - movingNodeHeight
    }
  }

  return {
    helperLines: { horizontal: horizontalLine, vertical: verticalLine },
    snappedPosition: horizontalLine !== null || verticalLine !== null ? { x: snappedX, y: snappedY } : null,
  }
}

// ============================================
// COPY-PASTE
// ============================================

export interface ClipboardData {
  nodes: Node[]
  edges: Edge[]
}

let clipboardData: ClipboardData = { nodes: [], edges: [] }

export function copySelectedNodes(nodes: Node[], edges: Edge[]): number {
  const selectedNodes = nodes.filter((node) => node.selected)
  if (selectedNodes.length === 0) return 0

  const selectedNodeIds = new Set(selectedNodes.map((n) => n.id))
  const connectedEdges = getConnectedEdges(selectedNodes, edges).filter(
    (edge) => selectedNodeIds.has(edge.source) && selectedNodeIds.has(edge.target),
  )

  clipboardData = {
    nodes: selectedNodes.map((n) => ({ ...n })),
    edges: connectedEdges.map((e) => ({ ...e })),
  }

  return selectedNodes.length
}

export function pasteNodes(
  existingNodes: Node[],
  existingEdges: Edge[],
  offset: { x: number; y: number } = { x: 50, y: 50 },
): { nodes: Node[]; edges: Edge[]; pastedCount: number } {
  if (clipboardData.nodes.length === 0) {
    return { nodes: existingNodes, edges: existingEdges, pastedCount: 0 }
  }

  const idMapping: Record<string, string> = {}

  const newNodes = clipboardData.nodes.map((node) => {
    const newId = `node-${crypto.randomUUID()}`
    idMapping[node.id] = newId
    return {
      ...node,
      id: newId,
      position: {
        x: node.position.x + offset.x,
        y: node.position.y + offset.y,
      },
      selected: true,
    }
  })

  const newEdges = clipboardData.edges.map((edge) => ({
    ...edge,
    id: `edge-${crypto.randomUUID()}`,
    source: idMapping[edge.source],
    target: idMapping[edge.target],
  }))

  // Deselect existing nodes
  const updatedExistingNodes = existingNodes.map((n) => ({ ...n, selected: false }))

  // Update clipboard with new positions for subsequent pastes
  clipboardData = {
    nodes: newNodes.map((n) => ({ ...n, selected: false })),
    edges: newEdges,
  }

  return {
    nodes: [...updatedExistingNodes, ...newNodes],
    edges: [...existingEdges, ...newEdges],
    pastedCount: newNodes.length,
  }
}

export function cutSelectedNodes(nodes: Node[], edges: Edge[]): { nodes: Node[]; edges: Edge[]; cutCount: number } {
  const cutCount = copySelectedNodes(nodes, edges)
  if (cutCount === 0) {
    return { nodes, edges, cutCount: 0 }
  }

  const selectedNodeIds = new Set(nodes.filter((n) => n.selected).map((n) => n.id))

  return {
    nodes: nodes.filter((n) => !n.selected),
    edges: edges.filter((e) => !selectedNodeIds.has(e.source) && !selectedNodeIds.has(e.target)),
    cutCount,
  }
}

export function hasClipboardData(): boolean {
  return clipboardData.nodes.length > 0
}

export function getClipboardCount(): number {
  return clipboardData.nodes.length
}

// ============================================
// NODE PLACEMENT (Overlap Avoidance)
// ============================================

/** Default node dimensions by type, used for overlap detection */
const DEFAULT_NODE_DIMS: Record<string, { width: number; height: number }> = {
  stickyNote: { width: 200, height: 150 },
  richText: { width: 350, height: 250 },
  embed: { width: 1200, height: 900 },
  youtube: { width: 400, height: 225 },
  image: { width: 300, height: 200 },
  shape: { width: 150, height: 100 },
  table: { width: 500, height: 300 },
  pdf: { width: 400, height: 500 },
  location: { width: 300, height: 200 },
  codeBlock: { width: 600, height: 400 },
  terminal: { width: 600, height: 350 },
  folder: { width: 360, height: 260 },
  audio: { width: 320, height: 140 },
  spotify: { width: 600, height: 600 },
  calendar: { width: 300, height: 420 },
  event: { width: 280, height: 200 },
}

const DEFAULT_DIM = { width: 300, height: 200 }

function getNodeDims(node: Node): { width: number; height: number } {
  const measured = (node as any).measured as { width?: number; height?: number } | undefined
  return {
    width: (node.style?.width as number) || measured?.width || DEFAULT_DIM.width,
    height: (node.style?.height as number) || measured?.height || DEFAULT_DIM.height,
  }
}

/**
 * Compute the bounding box of all existing nodes.
 * Returns null if there are no nodes.
 */
export function getExistingNodesBoundingBox(nodes: Node[]): {
  minX: number
  minY: number
  maxX: number
  maxY: number
} | null {
  if (nodes.length === 0) return null

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const n of nodes) {
    const { width, height } = getNodeDims(n)
    minX = Math.min(minX, n.position.x)
    minY = Math.min(minY, n.position.y)
    maxX = Math.max(maxX, n.position.x + width)
    maxY = Math.max(maxY, n.position.y + height)
  }

  return { minX, minY, maxX, maxY }
}

/**
 * Check if a rectangle at `pos` with `dims` overlaps any existing node.
 */
function intersectsAny(
  nodes: Node[],
  pos: { x: number; y: number },
  dims: { width: number; height: number },
  padding = 20,
): boolean {
  const ax1 = pos.x - padding
  const ay1 = pos.y - padding
  const ax2 = pos.x + dims.width + padding
  const ay2 = pos.y + dims.height + padding

  return nodes.some((n) => {
    const { width, height } = getNodeDims(n)
    const bx1 = n.position.x
    const by1 = n.position.y
    const bx2 = n.position.x + width
    const by2 = n.position.y + height
    return ax1 < bx2 && ax2 > bx1 && ay1 < by2 && ay2 > by1
  })
}

/**
 * Find a non-overlapping position for a new node.
 * Tries the requested position first, then scans rightward and downward.
 */
export function findNonOverlappingPosition(
  existingNodes: Node[],
  requestedPos: { x: number; y: number },
  nodeType?: string,
  nodeDims?: { width: number; height: number },
): { x: number; y: number } {
  if (existingNodes.length === 0) return requestedPos

  const dims = nodeDims || (nodeType && DEFAULT_NODE_DIMS[nodeType]) || DEFAULT_DIM

  // If the requested position doesn't overlap, use it directly
  if (!intersectsAny(existingNodes, requestedPos, dims)) {
    return requestedPos
  }

  const gap = 40

  // Try nudging locally first — keeps new node close to the user's intended position
  // rather than teleporting to the far edge of all content
  const nudges = [
    { x: requestedPos.x + dims.width + gap, y: requestedPos.y },                       // right
    { x: requestedPos.x, y: requestedPos.y + dims.height + gap },                      // below
    { x: requestedPos.x - dims.width - gap, y: requestedPos.y },                       // left
    { x: requestedPos.x + dims.width + gap, y: requestedPos.y + dims.height + gap },   // diagonal ↘
    { x: requestedPos.x, y: requestedPos.y - dims.height - gap },                      // above
    { x: requestedPos.x - dims.width - gap, y: requestedPos.y + dims.height + gap },   // diagonal ↙
  ]

  for (const candidate of nudges) {
    if (!intersectsAny(existingNodes, candidate, dims)) {
      return candidate
    }
  }

  // Scan rightward from the bounding box edge, then downward
  const bbox = getExistingNodesBoundingBox(existingNodes)!

  // Try placing to the right of all existing content
  const rightCandidate = { x: bbox.maxX + gap, y: requestedPos.y }
  if (!intersectsAny(existingNodes, rightCandidate, dims)) {
    return rightCandidate
  }

  // Try placing below all existing content
  const bottomCandidate = { x: requestedPos.x, y: bbox.maxY + gap }
  if (!intersectsAny(existingNodes, bottomCandidate, dims)) {
    return bottomCandidate
  }

  // Grid scan: try positions in a grid pattern to the right and below
  const stepX = dims.width + gap
  const stepY = dims.height + gap
  for (let row = 0; row < 20; row++) {
    for (let col = 0; col < 20; col++) {
      const candidate = {
        x: bbox.maxX + gap + col * stepX,
        y: bbox.minY + row * stepY,
      }
      if (!intersectsAny(existingNodes, candidate, dims)) {
        return candidate
      }
    }
  }

  // Fallback: place far to the right
  return { x: bbox.maxX + gap, y: bbox.minY }
}

/**
 * Compute an offset origin for a group of new nodes so they don't overlap
 * any existing nodes. Returns an {x, y} offset to add to all positions.
 */
export function findNonOverlappingRegion(
  existingNodes: Node[],
  newNodePositions: Array<{ x: number; y: number; width: number; height: number }>,
): { x: number; y: number } {
  if (existingNodes.length === 0 || newNodePositions.length === 0) {
    return { x: 0, y: 0 }
  }

  // Compute bounding box of new nodes
  let newMinX = Infinity
  let newMinY = Infinity
  let newMaxX = -Infinity
  let newMaxY = -Infinity
  for (const np of newNodePositions) {
    newMinX = Math.min(newMinX, np.x)
    newMinY = Math.min(newMinY, np.y)
    newMaxX = Math.max(newMaxX, np.x + np.width)
    newMaxY = Math.max(newMaxY, np.y + np.height)
  }

  const bbox = getExistingNodesBoundingBox(existingNodes)!
  const gap = 60

  // Offset so the new group starts to the right of existing content
  return {
    x: bbox.maxX + gap - newMinX,
    y: bbox.minY - newMinY,
  }
}

// ============================================
// SELECTION UTILITIES
// ============================================

export function selectAll(nodes: Node[]): Node[] {
  return nodes.map((n) => ({ ...n, selected: true }))
}

export function deselectAll(nodes: Node[]): Node[] {
  return nodes.map((n) => ({ ...n, selected: false }))
}

export function invertSelection(nodes: Node[]): Node[] {
  return nodes.map((n) => ({ ...n, selected: !n.selected }))
}

export function getSelectedCount(nodes: Node[]): number {
  return nodes.filter((n) => n.selected).length
}

// ============================================
// ALIGNMENT UTILITIES
// ============================================

export type AlignmentType = 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom'

export function alignNodes(nodes: Node[], alignment: AlignmentType): Node[] {
  const selectedNodes = nodes.filter((n) => n.selected)
  if (selectedNodes.length < 2) return nodes

  const selectedIds = new Set(selectedNodes.map((n) => n.id))

  // Get bounds of all selected nodes
  const bounds = selectedNodes.reduce(
    (acc, node) => {
      const measured = (node as any).measured as { width?: number; height?: number } | undefined
      const width = (node.style?.width as number) || measured?.width || 200
      const height = (node.style?.height as number) || measured?.height || 150

      return {
        minX: Math.min(acc.minX, node.position.x),
        maxX: Math.max(acc.maxX, node.position.x + width),
        minY: Math.min(acc.minY, node.position.y),
        maxY: Math.max(acc.maxY, node.position.y + height),
      }
    },
    { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity },
  )

  const centerX = (bounds.minX + bounds.maxX) / 2
  const centerY = (bounds.minY + bounds.maxY) / 2

  return nodes.map((node) => {
    if (!selectedIds.has(node.id)) return node

    const measured = (node as any).measured as { width?: number; height?: number } | undefined
    const width = (node.style?.width as number) || measured?.width || 200
    const height = (node.style?.height as number) || measured?.height || 150

    let newPosition = { ...node.position }

    switch (alignment) {
      case 'left':
        newPosition.x = bounds.minX
        break
      case 'center':
        newPosition.x = centerX - width / 2
        break
      case 'right':
        newPosition.x = bounds.maxX - width
        break
      case 'top':
        newPosition.y = bounds.minY
        break
      case 'middle':
        newPosition.y = centerY - height / 2
        break
      case 'bottom':
        newPosition.y = bounds.maxY - height
        break
    }

    return { ...node, position: newPosition }
  })
}

// ============================================
// DISTRIBUTION UTILITIES
// ============================================

export type DistributionType = 'horizontal' | 'vertical'

export function distributeNodes(nodes: Node[], distribution: DistributionType): Node[] {
  const selectedNodes = nodes.filter((n) => n.selected)
  if (selectedNodes.length < 3) return nodes

  const selectedIds = new Set(selectedNodes.map((n) => n.id))

  // Sort by position
  const sorted = [...selectedNodes].sort((a, b) =>
    distribution === 'horizontal' ? a.position.x - b.position.x : a.position.y - b.position.y,
  )

  // Calculate total space and gaps
  const first = sorted[0]
  const last = sorted[sorted.length - 1]

  const firstMeasured = (first as any).measured as { width?: number; height?: number } | undefined
  const lastMeasured = (last as any).measured as { width?: number; height?: number } | undefined

  if (distribution === 'horizontal') {
    const firstWidth = (first.style?.width as number) || firstMeasured?.width || 200
    const lastWidth = (last.style?.width as number) || lastMeasured?.width || 200

    const totalSpace = last.position.x + lastWidth - first.position.x
    const totalNodeWidth = sorted.reduce((acc, n) => {
      const m = (n as any).measured as { width?: number; height?: number } | undefined
      return acc + ((n.style?.width as number) || m?.width || 200)
    }, 0)
    const gap = (totalSpace - totalNodeWidth) / (sorted.length - 1)

    let currentX = first.position.x

    const positionMap = new Map<string, number>()
    sorted.forEach((node) => {
      positionMap.set(node.id, currentX)
      const m = (node as any).measured as { width?: number; height?: number } | undefined
      const width = (node.style?.width as number) || m?.width || 200
      currentX += width + gap
    })

    return nodes.map((node) => {
      if (!selectedIds.has(node.id)) return node
      return { ...node, position: { ...node.position, x: positionMap.get(node.id)! } }
    })
  } else {
    const firstHeight = (first.style?.height as number) || firstMeasured?.height || 150
    const lastHeight = (last.style?.height as number) || lastMeasured?.height || 150

    const totalSpace = last.position.y + lastHeight - first.position.y
    const totalNodeHeight = sorted.reduce((acc, n) => {
      const m = (n as any).measured as { width?: number; height?: number } | undefined
      return acc + ((n.style?.height as number) || m?.height || 150)
    }, 0)
    const gap = (totalSpace - totalNodeHeight) / (sorted.length - 1)

    let currentY = first.position.y

    const positionMap = new Map<string, number>()
    sorted.forEach((node) => {
      positionMap.set(node.id, currentY)
      const m = (node as any).measured as { width?: number; height?: number } | undefined
      const height = (node.style?.height as number) || m?.height || 150
      currentY += height + gap
    })

    return nodes.map((node) => {
      if (!selectedIds.has(node.id)) return node
      return { ...node, position: { ...node.position, y: positionMap.get(node.id)! } }
    })
  }
}
