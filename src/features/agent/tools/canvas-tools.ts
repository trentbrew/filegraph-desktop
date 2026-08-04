/**
 * Agent Tools — Home Canvas Domain
 *
 * Tools for reading and manipulating the Home canvas (nodes, edges, layout, history).
 */

import { join } from '@tauri-apps/api/path'
import { invoke } from '@tauri-apps/api/core'
import { getVaultPath, withAgentActivity, recordAgentAction, textToTipTapJson } from './helpers'
import {
  alignNodes,
  distributeNodes,
  getGridLayoutedElements,
  getLayoutedElements,
  type AlignmentType,
  type DistributionType,
  type LayoutDirection,
} from '@/features/home/canvasUtils'
import {
  addTableColumn,
  addTableRow,
  normalizeTableContent,
  removeTableColumn,
  removeTableRow,
  setTableCell,
  setTableHeader,
} from '@/features/home/tableOps'

// ─────────────────────────────────────────────────────────────────────────────
// Tool definitions
// ─────────────────────────────────────────────────────────────────────────────

export const CANVAS_TOOL_DEFINITIONS = [
  {
    type: 'function',
    name: 'get_home_canvas',
    description: `Read the current state of the user's Home canvas. The Home canvas is the user's persistent dashboard where they organize widgets, notes, files, and other content.

**Returns:**
- nodes: Array of nodes with id, type, position, dimensions, and data
- edges: Array of connections between nodes
- viewport: Current pan/zoom state
- nodeCount: Total number of nodes
- isEmpty: Whether the canvas is empty

**Node types on Home canvas:**
richText, stickyNote, embed, filePreview, image, shape, table, youtube, pdf, location, codeBlock, terminal, folder, freehand, person

**When to use:**
- To understand what the user has on their Home canvas
- Before adding new nodes (to position them appropriately)
- When the user asks about their Home canvas content`,
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        includeData: { type: ['boolean', 'null'], description: 'Include full node data (default: false, returns summary only)' },
      },
      required: ['includeData'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'add_home_node',
    description: `Add a new node to the user's Home canvas.

**Node types:**
- "stickyNote": Quick sticky note - data: {text, color: "yellow"|"pink"|"blue"|"green"|"purple"|"orange"}
- "richText": Rich text note - data: {content: "markdown or plain text"}
- "embed": Web embed - data: {url: "https://...", title?: "optional"}
- "youtube": YouTube video - data: {url: "https://youtube.com/..."}
- "filePreview": Vault file - data: {filePath: "/path/to/file"}
- "image": Image - data: {src: "https://..." or "/path/to/image"}
- "shape": Shape - data: {shape: "circle"|"diamond", color: "any color"}
- "table": Data table - data: {headers: ["Col1", "Col2"], rows: [["a", "b"]]}
- "codeBlock": Code editor - data: {code: "...", language?: "javascript", filePath?: "/path"}
- "terminal": Terminal - data: {cwd?: "/path"}
- "folder": Folder browser - data: {folderPath: "/path/to/folder"}
- "person": Person card - data: {entityId: "person:sarah:001"}`,
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        nodeType: { type: 'string', description: 'Type of node: stickyNote, richText, embed, youtube, filePreview, image, shape, table, pdf, location, codeBlock, terminal, folder, freehand, person' },
        position: {
          type: 'object',
          description: 'Position {x, y} on canvas',
          properties: { x: { type: 'number' }, y: { type: 'number' } },
          required: ['x', 'y'],
          additionalProperties: false,
        },
        label: { type: ['string', 'null'], description: 'Label/title for the node' },
        data: { type: ['object', 'null'], description: 'Node-specific data (varies by nodeType)' },
      },
      required: ['nodeType', 'position', 'label', 'data'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'remove_home_node',
    description: `Remove a node from the user's Home canvas. Use get_home_canvas first to find the node ID.`,
    strict: true,
    parameters: {
      type: 'object',
      properties: { nodeId: { type: 'string', description: 'ID of the node to remove' } },
      required: ['nodeId'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'update_home_node',
    description: `Update an existing node on the user's Home canvas. You can change its position, dimensions, or data. Use get_home_canvas first to find the node ID.`,
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        nodeId: { type: 'string', description: 'ID of the node to update' },
        position: { type: ['object', 'null'], description: 'New position {x, y} (null to keep current)' },
        dimensions: { type: ['object', 'null'], description: 'New dimensions {width, height} (null to keep current)' },
        data: { type: ['object', 'null'], description: 'Data to merge into node data (null to keep current)' },
      },
      required: ['nodeId', 'position', 'dimensions', 'data'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'add_home_edge',
    description: `Add a connection (edge) between two nodes on the Home canvas.`,
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        sourceId: { type: 'string', description: 'ID of the source node' },
        targetId: { type: 'string', description: 'ID of the target node' },
        label: { type: ['string', 'null'], description: 'Optional label for the edge' },
      },
      required: ['sourceId', 'targetId', 'label'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'remove_home_edge',
    description: `Remove a connection (edge) from the Home canvas. Provide edgeId to remove a specific edge, or provide sourceId+targetId to remove matching edges.`,
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        edgeId: { type: ['string', 'null'], description: 'Edge ID to remove (preferred). Null to remove by source/target.' },
        sourceId: { type: ['string', 'null'], description: 'Source node ID (used when edgeId is null).' },
        targetId: { type: ['string', 'null'], description: 'Target node ID (used when edgeId is null).' },
      },
      required: ['edgeId', 'sourceId', 'targetId'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'auto_layout_home_canvas',
    description: `Auto-layout nodes on the Home canvas using a graph layout (dagre). By default, layouts all top-level nodes (nodes without a parentId) so groups remain intact.`,
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        nodeIds: { type: ['array', 'null'], description: 'Optional list of node IDs to layout. Null layouts all top-level nodes.', items: { type: 'string' } },
        direction: { type: ['string', 'null'], description: 'Layout direction: TB, LR, BT, RL (default: TB).' },
        nodeSpacing: { type: ['number', 'null'], description: 'Spacing between nodes (default: 80).' },
        rankSpacing: { type: ['number', 'null'], description: 'Spacing between ranks/rows (default: 100).' },
      },
      required: ['nodeIds', 'direction', 'nodeSpacing', 'rankSpacing'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'grid_layout_home_canvas',
    description: `Arrange nodes on the Home canvas into a grid. By default, layouts all top-level nodes.`,
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        nodeIds: { type: ['array', 'null'], description: 'Optional list of node IDs to layout. Null layouts all top-level nodes.', items: { type: 'string' } },
        columns: { type: ['number', 'null'], description: 'Number of columns (default: sqrt(n)).' },
        gapX: { type: ['number', 'null'], description: 'Horizontal gap between nodes (default: 48).' },
        gapY: { type: ['number', 'null'], description: 'Vertical gap between nodes (default: 48).' },
      },
      required: ['nodeIds', 'columns', 'gapX', 'gapY'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'align_home_nodes',
    description: `Align multiple nodes on the Home canvas. Equivalent to the Align commands in the canvas toolbar.`,
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        nodeIds: { type: 'array', description: 'Node IDs to align (must be 2+).', items: { type: 'string' } },
        alignment: { type: 'string', description: 'One of: left, center, right, top, middle, bottom.' },
      },
      required: ['nodeIds', 'alignment'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'distribute_home_nodes',
    description: `Distribute multiple nodes evenly on the Home canvas. Equivalent to the Distribute commands in the canvas toolbar.`,
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        nodeIds: { type: 'array', description: 'Node IDs to distribute (must be 3+).', items: { type: 'string' } },
        direction: { type: 'string', description: 'One of: horizontal, vertical.' },
      },
      required: ['nodeIds', 'direction'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'create_home_group',
    description: `Group multiple nodes into a group container on the Home canvas.`,
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        nodeIds: { type: 'array', description: 'Node IDs to group (must be 2+).', items: { type: 'string' } },
        label: { type: ['string', 'null'], description: 'Optional label for the group.' },
      },
      required: ['nodeIds', 'label'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'ungroup_home_nodes',
    description: `Ungroup a group container on the Home canvas, returning its child nodes to top-level positioning.`,
    strict: true,
    parameters: {
      type: 'object',
      properties: { groupId: { type: 'string', description: 'Group node ID to ungroup.' } },
      required: ['groupId'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'update_home_node_content',
    description: `Update the content of a file-backed node on the Home canvas (rich text notes, sticky notes).

**IMPORTANT:** This is different from update_home_node which only updates position/dimensions.
Use this tool to change the actual TEXT CONTENT inside a node.

**Supported node types:**
- richText: Updates the .note file content. Provide content as plain text or markdown.
- stickyNote: Updates the .sticky file. Provide text and optionally color.`,
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        nodeId: { type: 'string', description: 'ID of the node to update content for' },
        content: { type: 'string', description: 'New text content for the node. For richText: plain text or markdown. For stickyNote: the note text.' },
        color: { type: ['string', 'null'], description: 'For stickyNote only: color (yellow, pink, blue, green, purple, orange)' },
      },
      required: ['nodeId', 'content', 'color'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'edit_home_table',
    description: `Perform a surgical edit on a table node on the Home canvas.

Operations:
- set_cell: update one cell
- rename_column: rename a header
- add_row: insert a row (or append)
- remove_row: delete a row
- add_column: insert a column (or append)
- remove_column: delete a column`,
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        nodeId: { type: 'string', description: 'ID of the table node to edit' },
        operation: { type: 'string', description: 'One of: set_cell, rename_column, add_row, remove_row, add_column, remove_column' },
        rowIndex: { type: 'number', description: 'Row index for set_cell/remove_row (0-based).' },
        colIndex: { type: 'number', description: 'Column index for set_cell/rename_column/remove_column (0-based).' },
        value: { type: 'string', description: 'Cell value for set_cell.' },
        header: { type: 'string', description: 'New header for rename_column, or header for add_column.' },
        index: { type: 'number', description: 'Insert index for add_row/add_column. Omit to append.' },
        values: { type: 'array', description: 'Row values for add_row, or column values for add_column.', items: { type: 'string' } },
      },
      required: ['nodeId', 'operation'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'undo_canvas_action',
    description: `Undo the last change made to the Home canvas. This can undo your own changes or the user's changes.`,
    strict: true,
    parameters: { type: 'object', properties: {}, required: [], additionalProperties: false },
  },
  {
    type: 'function',
    name: 'redo_canvas_action',
    description: `Redo the last undone change on the Home canvas.`,
    strict: true,
    parameters: { type: 'object', properties: {}, required: [], additionalProperties: false },
  },
  {
    type: 'function',
    name: 'get_canvas_history',
    description: `Get the recent edit history for the Home canvas. Shows what changes have been made and by whom (user or agent).`,
    strict: true,
    parameters: {
      type: 'object',
      properties: { limit: { type: ['number', 'null'], description: 'Maximum number of history entries to return (default: 10)' } },
      required: ['limit'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'focus_home_node',
    description: `Zoom and smoothly animate the canvas to center on a specific node. Use this to visually guide the user through your work.

**Guided-tour pattern for file editing:**
1. Before editing → focus_home_node on the codeBlock node
2. After editing → focus_home_node on the same node
3. After verification → focus_home_node on the embed/preview node

**nodeType shortcuts:** "embed" → localhost preview, "terminal" → terminal node, "codeBlock" → code editor`,
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        nodeId: { type: ['string', 'null'], description: 'Exact node ID to focus (preferred over nodeType when you have the ID).' },
        nodeType: { type: ['string', 'null'], description: 'Focus the first node of this type: embed, terminal, codeBlock, group, stickyNote, richText, etc.' },
      },
      required: ['nodeId', 'nodeType'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'toggle_canvas_fullscreen',
    description: `Maximize or minimize a canvas node to fill the entire viewport.

**action values:**
- "maximize" + nodeId → fills viewport with that node
- "minimize" → restores all nodes to their original sizes/positions
- "toggle" (default) → maximize if not already, minimize if it is`,
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        nodeId: { type: ['string', 'null'], description: 'Node ID to maximize. Required for maximize/toggle.' },
        action: { type: ['string', 'null'], enum: ['maximize', 'minimize', 'toggle', null], description: 'maximize, minimize, or toggle (default).' },
      },
      required: ['nodeId', 'action'],
      additionalProperties: false,
    },
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Handlers
// ─────────────────────────────────────────────────────────────────────────────

export async function getHomeCanvas(includeData?: boolean | null): Promise<any> {
  try {
    if (typeof window === 'undefined') return { error: 'Home canvas tools only work in browser context' }

    const { useHomeCanvasStore } = await import('@/features/home/useHomeCanvasStore')
    const store = useHomeCanvasStore.getState()
    if (!store.isInitialized) await store.initialize()

    const { nodes, edges, viewport } = useHomeCanvasStore.getState()

    if (nodes.length === 0) return { isEmpty: true, nodeCount: 0, edgeCount: 0, nodes: [], edges: [], viewport, message: 'Home canvas is empty' }

    const formattedNodes = nodes.map((node) => {
      const base: Record<string, any> = {
        id: node.id, type: node.type, position: node.position,
        dimensions: { width: (node.style?.width as number) || 300, height: (node.style?.height as number) || 200 },
        label: node.data?.label || null,
      }
      if (includeData) { base.data = node.data }
      else {
        if (node.data?.file) base.file = node.data.file
        if (node.data?.filePath) base.filePath = node.data.filePath
        if (node.data?.url) base.url = node.data.url
        if (node.data?.shape) base.shape = node.data.shape
        if (node.data?.color) base.color = node.data.color
      }
      return base
    })

    const formattedEdges = edges.map((edge) => ({ id: edge.id, source: edge.source, target: edge.target, label: edge.data?.label || null }))

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
    for (const node of nodes) {
      const w = (node.style?.width as number) || 300
      const h = (node.style?.height as number) || 200
      minX = Math.min(minX, node.position.x); maxX = Math.max(maxX, node.position.x + w)
      minY = Math.min(minY, node.position.y); maxY = Math.max(maxY, node.position.y + h)
    }

    return { isEmpty: false, nodeCount: nodes.length, edgeCount: edges.length, nodes: formattedNodes, edges: formattedEdges, viewport, bounds: { minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY } }
  } catch (err) {
    return { error: `Failed to read Home canvas: ${err}` }
  }
}

export async function addHomeNode(nodeType: string, position: { x: number; y: number }, label?: string | null, data?: Record<string, any> | string | null): Promise<any> {
  return withAgentActivity('Adding node', [], async () => {
    try {
      if (typeof window === 'undefined') return { error: 'Home canvas tools only work in browser context' }

      const { useHomeCanvasStore } = await import('@/features/home/useHomeCanvasStore')
      const store = useHomeCanvasStore.getState()
      if (!store.isInitialized) await store.initialize()

      const currentNodes = useHomeCanvasStore.getState().nodes
      const { findNonOverlappingPosition } = await import('@/features/home/canvasUtils')
      const safePosition = findNonOverlappingPosition(currentNodes, position, nodeType)

      let parsedData: Record<string, any> | null | undefined = typeof data === 'object' ? data : undefined
      if (typeof data === 'string') {
        try { parsedData = JSON.parse(data) as Record<string, any> }
        catch { parsedData = { text: data } }
      }

      if (nodeType === 'filePreview' && parsedData?.filePath) {
        const nodesBefore = [...store.nodes]
        const nodeId = store.addFileNode(parsedData.filePath, safePosition, parsedData.dimensions)
        await recordAgentAction('add_node', `Added file preview node "${label || parsedData.filePath}"`, nodeId, undefined, { nodes: nodesBefore }, { nodes: [...useHomeCanvasStore.getState().nodes] })
        window.dispatchEvent(new CustomEvent('canvas-node-focus', { detail: { id: nodeId } }))
        return { success: true, nodeId, message: `Added file preview node for ${parsedData.filePath}` }
      }

      if (nodeType === 'folder' && parsedData?.folderPath) {
        const nodesBefore = [...store.nodes]
        const nodeId = store.addFolderNode(parsedData.folderPath, safePosition, parsedData.dimensions)
        await recordAgentAction('add_node', `Added folder node "${label || parsedData.folderPath}"`, nodeId, undefined, { nodes: nodesBefore }, { nodes: [...useHomeCanvasStore.getState().nodes] })
        window.dispatchEvent(new CustomEvent('canvas-node-focus', { detail: { id: nodeId } }))
        return { success: true, nodeId, message: `Added folder node for ${parsedData.folderPath}` }
      }

      const nodesBefore = [...store.nodes]
      const nodeId = await store.addNode(nodeType, safePosition, label || undefined, parsedData || undefined)
      await recordAgentAction('add_node', `Added ${nodeType} node "${label || nodeType}"`, nodeId, undefined, { nodes: nodesBefore }, { nodes: [...useHomeCanvasStore.getState().nodes] })
      window.dispatchEvent(new CustomEvent('canvas-node-focus', { detail: { id: nodeId } }))
      return { success: true, nodeId, message: `Added ${nodeType} node "${label || nodeType}" at (${safePosition.x}, ${safePosition.y})` }
    } catch (err) {
      return { error: `Failed to add Home node: ${err}` }
    }
  })
}

export async function removeHomeNode(nodeId: string): Promise<any> {
  return withAgentActivity('Removing node', [nodeId], async () => {
    try {
      if (typeof window === 'undefined') return { error: 'Home canvas tools only work in browser context' }
      const { useHomeCanvasStore } = await import('@/features/home/useHomeCanvasStore')
      const store = useHomeCanvasStore.getState()
      const node = store.nodes.find((n) => n.id === nodeId)
      if (!node) return { error: `Node not found: ${nodeId}` }
      const nodesBefore = [...store.nodes]
      await store.removeNode(nodeId)
      await recordAgentAction('remove_node', `Removed node ${node.data?.label || nodeId}`, nodeId, undefined, { nodes: nodesBefore, nodeData: node }, { nodes: [...useHomeCanvasStore.getState().nodes] })
      return { success: true, message: `Removed node ${nodeId} (archived for recovery)` }
    } catch (err) {
      return { error: `Failed to remove Home node: ${err}` }
    }
  })
}

export async function updateHomeNode(nodeId: string, position?: { x: number; y: number } | null, dimensions?: { width: number; height: number } | null, data?: Record<string, any> | string | null): Promise<any> {
  return withAgentActivity('Updating node', [nodeId], async () => {
    try {
      if (typeof window === 'undefined') return { error: 'Home canvas tools only work in browser context' }
      const { useHomeCanvasStore } = await import('@/features/home/useHomeCanvasStore')
      const store = useHomeCanvasStore.getState()
      const node = store.nodes.find((n) => n.id === nodeId)
      if (!node) return { error: `Node not found: ${nodeId}` }

      let parsedData: Record<string, any> | null | undefined = typeof data === 'object' ? data : undefined
      if (typeof data === 'string') {
        try { parsedData = JSON.parse(data) as Record<string, any> }
        catch { parsedData = { text: data } }
      }

      const updates: string[] = []
      const nodeBefore = { ...node, data: { ...node.data } }

      if (position) { store.updateNodePosition(nodeId, position); updates.push(`position to (${position.x}, ${position.y})`) }
      if (dimensions) { store.updateNodeDimensions(nodeId, dimensions); updates.push(`dimensions to ${dimensions.width}x${dimensions.height}`) }
      if (parsedData) { store.setNodes((nodes) => nodes.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...parsedData } } : n))); updates.push('data') }

      await store.save()
      const nodeAfter = useHomeCanvasStore.getState().nodes.find((n) => n.id === nodeId)
      if (updates.length > 0) await recordAgentAction('update_node', `Updated ${updates.join(', ')}`, nodeId, undefined, { nodeData: nodeBefore }, { nodeData: nodeAfter })

      return { success: true, message: updates.length > 0 ? `Updated node ${nodeId}: ${updates.join(', ')}` : `No changes made to node ${nodeId}` }
    } catch (err) {
      return { error: `Failed to update Home node: ${err}` }
    }
  })
}

export async function updateHomeNodeContent(nodeId: string, content: string, color?: string | null): Promise<any> {
  return withAgentActivity('Updating content', [nodeId], async () => {
    try {
      if (typeof window === 'undefined') return { error: 'Home canvas tools only work in browser context' }
      const { useHomeCanvasStore } = await import('@/features/home/useHomeCanvasStore')
      const store = useHomeCanvasStore.getState()
      const node = store.nodes.find((n) => n.id === nodeId)
      if (!node) return { error: `Node not found: ${nodeId}` }

      const filePath = node.data?.file as string | undefined
      if (!filePath) return { error: `Node ${nodeId} is not file-backed. Use update_home_node for inline data nodes.` }

      const vaultPath = await getVaultPath()
      const fullPath = filePath.startsWith('/') ? filePath : await join(vaultPath, filePath)

      if (node.type === 'richText' || node.type === 'note') {
        const tiptapContent = textToTipTapJson(content)
        await invoke('write_text_file', { filePath: fullPath, content: JSON.stringify(tiptapContent, null, 2) })
        if (typeof window !== 'undefined') {
          const { useFileStore } = await import('@/stores/useFileStore')
          if (filePath !== fullPath) useFileStore.getState().notifyFileChanged(filePath)
          useFileStore.getState().notifyFileChanged(fullPath)
        }
        return { success: true, message: `Updated rich text content in node ${nodeId}`, filePath }
      } else if (node.type === 'stickyNote' || node.type === 'sticky') {
        const stickyContent = { text: content, color: color || 'yellow' }
        await invoke('write_text_file', { filePath: fullPath, content: JSON.stringify(stickyContent, null, 2) })
        if (typeof window !== 'undefined') {
          const { useFileStore } = await import('@/stores/useFileStore')
          if (filePath !== fullPath) useFileStore.getState().notifyFileChanged(filePath)
          useFileStore.getState().notifyFileChanged(fullPath)
        }
        return { success: true, message: `Updated sticky note content in node ${nodeId}`, filePath }
      } else {
        return { error: `Node type "${node.type}" does not support content updates. Only richText and stickyNote are supported.` }
      }
    } catch (err) {
      return { error: `Failed to update node content: ${err}` }
    }
  })
}

export async function editHomeTable(nodeId: string, operation: string, rowIndex?: number | null, colIndex?: number | null, value?: string | null, header?: string | null, index?: number | null, values?: string[] | null): Promise<any> {
  return withAgentActivity('Editing table', [nodeId], async () => {
    try {
      if (typeof window === 'undefined') return { error: 'Home canvas tools only work in browser context' }
      const { useHomeCanvasStore } = await import('@/features/home/useHomeCanvasStore')
      const store = useHomeCanvasStore.getState()
      if (!store.isInitialized) await store.initialize()

      const node = store.nodes.find((n) => n.id === nodeId)
      if (!node) return { error: `Node not found: ${nodeId}` }
      if (node.type !== 'table') return { error: `Node ${nodeId} is not a table node (type: ${node.type})` }

      const filePath = node.data?.file as string | undefined
      if (!filePath) return { error: `Table node ${nodeId} is not file-backed` }

      const vaultPath = await getVaultPath()
      const fullPath = filePath.startsWith('/') ? filePath : await join(vaultPath, filePath)

      const beforeRaw = await invoke<{ content: string }>('read_text_file', { filePath: fullPath, maxBytes: 5 * 1024 * 1024 })
      const beforeTable = normalizeTableContent(beforeRaw?.content ? JSON.parse(beforeRaw.content) : null)
      let afterTable = beforeTable

      switch (operation) {
        case 'set_cell':
          if (rowIndex === null || rowIndex === undefined) return { error: 'rowIndex is required for set_cell' }
          if (colIndex === null || colIndex === undefined) return { error: 'colIndex is required for set_cell' }
          if (value === null || value === undefined) return { error: 'value is required for set_cell' }
          afterTable = setTableCell(beforeTable, rowIndex, colIndex, value)
          break
        case 'rename_column':
          if (colIndex === null || colIndex === undefined) return { error: 'colIndex is required for rename_column' }
          if (header === null || header === undefined) return { error: 'header is required for rename_column' }
          afterTable = setTableHeader(beforeTable, colIndex, header)
          break
        case 'add_row': afterTable = addTableRow(beforeTable, index ?? null, values ?? null); break
        case 'remove_row':
          if (rowIndex === null || rowIndex === undefined) return { error: 'rowIndex is required for remove_row' }
          afterTable = removeTableRow(beforeTable, rowIndex)
          break
        case 'add_column': afterTable = addTableColumn(beforeTable, index ?? null, header ?? null, values ?? null); break
        case 'remove_column':
          if (colIndex === null || colIndex === undefined) return { error: 'colIndex is required for remove_column' }
          afterTable = removeTableColumn(beforeTable, colIndex)
          break
        default: return { error: `Unknown table operation: ${operation}` }
      }

      await invoke('write_text_file', { filePath: fullPath, content: JSON.stringify(afterTable, null, 2) })
      if (typeof window !== 'undefined') {
        const { useFileStore } = await import('@/stores/useFileStore')
        if (filePath !== fullPath) useFileStore.getState().notifyFileChanged(filePath)
        useFileStore.getState().notifyFileChanged(fullPath)
      }
      await recordAgentAction('update_node_content', `Edited table ${node.data?.label || nodeId}: ${operation}`, nodeId, undefined, { table: beforeTable }, { table: afterTable })

      return { success: true, message: `Edited table ${nodeId}: ${operation}`, filePath, table: { headers: afterTable.headers, rowCount: afterTable.rows.length, columnCount: afterTable.headers.length } }
    } catch (err) {
      return { error: `Failed to edit table: ${err}` }
    }
  })
}

export async function addHomeEdge(sourceId: string, targetId: string, label?: string | null): Promise<any> {
  return withAgentActivity('Adding connection', [sourceId, targetId], async () => {
    try {
      if (typeof window === 'undefined') return { error: 'Home canvas tools only work in browser context' }
      const { useHomeCanvasStore } = await import('@/features/home/useHomeCanvasStore')
      const store = useHomeCanvasStore.getState()
      const sourceNode = store.nodes.find((n) => n.id === sourceId)
      const targetNode = store.nodes.find((n) => n.id === targetId)
      if (!sourceNode) return { error: `Source node not found: ${sourceId}` }
      if (!targetNode) return { error: `Target node not found: ${targetId}` }
      const edgeId = `edge-${Date.now()}`
      store.addEdge({ id: edgeId, source: sourceId, target: targetId, data: label ? { label } : undefined })
      await store.save()
      return { success: true, edgeId, message: `Added edge from ${sourceId} to ${targetId}${label ? ` with label "${label}"` : ''}` }
    } catch (err) {
      return { error: `Failed to add Home edge: ${err}` }
    }
  })
}

export async function removeHomeEdge(edgeId?: string | null, sourceId?: string | null, targetId?: string | null): Promise<any> {
  return withAgentActivity('Removing connection', [], async () => {
    try {
      if (typeof window === 'undefined') return { error: 'Home canvas tools only work in browser context' }
      const { useHomeCanvasStore } = await import('@/features/home/useHomeCanvasStore')
      const store = useHomeCanvasStore.getState()
      if (!store.isInitialized) await store.initialize()

      const edgesBefore = [...store.edges]
      let removedEdgeIds: string[] = []

      if (edgeId) {
        const exists = store.edges.some((e) => e.id === edgeId)
        if (!exists) return { error: `Edge not found: ${edgeId}` }
        store.removeEdge(edgeId)
        removedEdgeIds = [edgeId]
      } else {
        if (!sourceId || !targetId) return { error: 'Provide edgeId, or provide both sourceId and targetId' }
        const matches = store.edges.filter((e) => e.source === sourceId && e.target === targetId)
        if (matches.length === 0) return { error: `No edges found from ${sourceId} to ${targetId}` }
        matches.forEach((e) => store.removeEdge(e.id))
        removedEdgeIds = matches.map((e) => e.id)
      }

      await store.save()
      await recordAgentAction('remove_edge', `Removed ${removedEdgeIds.length} edge(s)`, undefined, removedEdgeIds[0], { edges: edgesBefore }, { edges: [...useHomeCanvasStore.getState().edges] })
      return { success: true, removedCount: removedEdgeIds.length, edgeIds: removedEdgeIds }
    } catch (err) {
      return { error: `Failed to remove edge: ${err}` }
    }
  })
}

export async function autoLayoutHomeCanvas(nodeIds?: string[] | null, direction?: string | null, nodeSpacing?: number | null, rankSpacing?: number | null): Promise<any> {
  return withAgentActivity('Auto-layout', [], async () => {
    try {
      if (typeof window === 'undefined') return { error: 'Home canvas tools only work in browser context' }
      const { useHomeCanvasStore } = await import('@/features/home/useHomeCanvasStore')
      const store = useHomeCanvasStore.getState()
      if (!store.isInitialized) await store.initialize()

      const nodesBefore = [...store.nodes]
      const allNodes = store.nodes
      const allowedDirection: LayoutDirection = (direction === 'LR' || direction === 'BT' || direction === 'RL' || direction === 'TB') ? direction : 'TB'
      const topLevelNodes = allNodes.filter((n) => !n.parentId)
      const targetNodeIds = Array.isArray(nodeIds) ? nodeIds : topLevelNodes.map((n) => n.id)
      const selectedNodes = allNodes.filter((n) => targetNodeIds.includes(n.id))
      const missing = targetNodeIds.filter((id) => !allNodes.some((n) => n.id === id))
      if (missing.length > 0) return { error: `Some nodes were not found: ${missing.slice(0, 5).join(', ')}` }
      const nested = selectedNodes.filter((n) => n.parentId)
      if (nested.length > 0) return { error: `Some nodes are inside a group and cannot be auto-laid out directly. Ungroup first.` }

      const nodeSet = new Set(targetNodeIds)
      const relevantEdges = store.edges.filter((e) => nodeSet.has(e.source) && nodeSet.has(e.target))
      const { nodes: layouted } = getLayoutedElements(selectedNodes as any, relevantEdges as any, { direction: allowedDirection, nodeSpacing: nodeSpacing ?? undefined, rankSpacing: rankSpacing ?? undefined })
      const posById = new Map(layouted.map((n: any) => [n.id, n]))

      store.setNodes((prev) => prev.map((n) => {
        const ln = posById.get(n.id)
        if (!ln) return n
        return { ...n, position: ln.position, sourcePosition: ln.sourcePosition, targetPosition: ln.targetPosition }
      }))
      await store.save()
      await recordAgentAction('update_node', `Auto-laid out ${targetNodeIds.length} node(s) (${allowedDirection})`, undefined, undefined, { nodes: nodesBefore }, { nodes: [...useHomeCanvasStore.getState().nodes] })
      return { success: true, nodeCount: targetNodeIds.length, direction: allowedDirection }
    } catch (err) {
      return { error: `Failed to auto-layout Home canvas: ${err}` }
    }
  })
}

export async function gridLayoutHomeCanvas(nodeIds?: string[] | null, columns?: number | null, gapX?: number | null, gapY?: number | null): Promise<any> {
  return withAgentActivity('Grid layout', [], async () => {
    try {
      if (typeof window === 'undefined') return { error: 'Home canvas tools only work in browser context' }
      const { useHomeCanvasStore } = await import('@/features/home/useHomeCanvasStore')
      const store = useHomeCanvasStore.getState()
      if (!store.isInitialized) await store.initialize()

      const nodesBefore = [...store.nodes]
      const allNodes = store.nodes
      const topLevelNodes = allNodes.filter((n) => !n.parentId)
      const targetNodeIds = Array.isArray(nodeIds) ? nodeIds : topLevelNodes.map((n) => n.id)
      const selectedNodes = allNodes.filter((n) => targetNodeIds.includes(n.id))
      const missing = targetNodeIds.filter((id) => !allNodes.some((n) => n.id === id))
      if (missing.length > 0) return { error: `Some nodes were not found: ${missing.slice(0, 5).join(', ')}` }
      const nested = selectedNodes.filter((n) => n.parentId)
      if (nested.length > 0) return { error: `Some nodes are inside a group and cannot be grid-laid out directly. Ungroup first.` }

      const { nodes: layouted } = getGridLayoutedElements(selectedNodes as any, [] as any, { columns: columns ?? undefined, gapX: gapX ?? undefined, gapY: gapY ?? undefined })
      const posById = new Map(layouted.map((n: any) => [n.id, n]))
      store.setNodes((prev) => prev.map((n) => { const ln = posById.get(n.id); if (!ln) return n; return { ...n, position: ln.position } }))
      await store.save()
      await recordAgentAction('update_node', `Grid-laid out ${targetNodeIds.length} node(s)`, undefined, undefined, { nodes: nodesBefore }, { nodes: [...useHomeCanvasStore.getState().nodes] })
      return { success: true, nodeCount: targetNodeIds.length, columns: columns ?? null, gapX: gapX ?? null, gapY: gapY ?? null }
    } catch (err) {
      return { error: `Failed to grid-layout Home canvas: ${err}` }
    }
  })
}

export async function alignHomeNodes(nodeIds: string[], alignment: string): Promise<any> {
  return withAgentActivity('Aligning nodes', nodeIds, async () => {
    try {
      if (typeof window === 'undefined') return { error: 'Home canvas tools only work in browser context' }
      const { useHomeCanvasStore } = await import('@/features/home/useHomeCanvasStore')
      const store = useHomeCanvasStore.getState()
      if (!store.isInitialized) await store.initialize()
      if (!Array.isArray(nodeIds) || nodeIds.length < 2) return { error: 'nodeIds must include at least 2 nodes' }

      const allowed: AlignmentType = (['left', 'center', 'right', 'top', 'middle', 'bottom'].includes(alignment) ? alignment : 'left') as AlignmentType
      const allNodes = store.nodes
      const missing = nodeIds.filter((id) => !allNodes.some((n) => n.id === id))
      if (missing.length > 0) return { error: `Some nodes were not found: ${missing.slice(0, 5).join(', ')}` }
      const nested = allNodes.filter((n) => nodeIds.includes(n.id) && n.parentId)
      if (nested.length > 0) return { error: `Some nodes are inside a group and cannot be aligned directly. Ungroup first.` }

      const nodesBefore = [...store.nodes]
      const selectedSet = new Set(nodeIds)
      const prevSelectedById = new Map(store.nodes.map((n) => [n.id, (n as any).selected]))
      const working = store.nodes.map((n) => ({ ...n, selected: selectedSet.has(n.id) }))
      const aligned = alignNodes(working as any, allowed)
      const restored = aligned.map((n: any) => ({ ...n, selected: prevSelectedById.get(n.id) }))
      store.setNodes(restored)
      await store.save()
      await recordAgentAction('update_node', `Aligned ${nodeIds.length} node(s) (${allowed})`, undefined, undefined, { nodes: nodesBefore }, { nodes: [...useHomeCanvasStore.getState().nodes] })
      return { success: true, nodeCount: nodeIds.length, alignment: allowed }
    } catch (err) {
      return { error: `Failed to align nodes: ${err}` }
    }
  })
}

export async function distributeHomeNodes(nodeIds: string[], direction: string): Promise<any> {
  return withAgentActivity('Distributing nodes', nodeIds, async () => {
    try {
      if (typeof window === 'undefined') return { error: 'Home canvas tools only work in browser context' }
      const { useHomeCanvasStore } = await import('@/features/home/useHomeCanvasStore')
      const store = useHomeCanvasStore.getState()
      if (!store.isInitialized) await store.initialize()
      if (!Array.isArray(nodeIds) || nodeIds.length < 3) return { error: 'nodeIds must include at least 3 nodes' }

      const allowed: DistributionType = (direction === 'vertical' || direction === 'horizontal') ? direction : 'horizontal'
      const allNodes = store.nodes
      const missing = nodeIds.filter((id) => !allNodes.some((n) => n.id === id))
      if (missing.length > 0) return { error: `Some nodes were not found: ${missing.slice(0, 5).join(', ')}` }

      const nodesBefore = [...store.nodes]
      const selectedSet = new Set(nodeIds)
      const prevSelectedById = new Map(store.nodes.map((n) => [n.id, (n as any).selected]))
      const working = store.nodes.map((n) => ({ ...n, selected: selectedSet.has(n.id) }))
      const distributed = distributeNodes(working as any, allowed)
      const restored = distributed.map((n: any) => ({ ...n, selected: prevSelectedById.get(n.id) }))
      store.setNodes(restored)
      await store.save()
      await recordAgentAction('update_node', `Distributed ${nodeIds.length} node(s) (${allowed})`, undefined, undefined, { nodes: nodesBefore }, { nodes: [...useHomeCanvasStore.getState().nodes] })
      return { success: true, nodeCount: nodeIds.length, direction: allowed }
    } catch (err) {
      return { error: `Failed to distribute nodes: ${err}` }
    }
  })
}

export async function createHomeGroup(nodeIds: string[], label?: string | null): Promise<any> {
  return withAgentActivity('Grouping nodes', nodeIds, async () => {
    try {
      if (typeof window === 'undefined') return { error: 'Home canvas tools only work in browser context' }
      const { useHomeCanvasStore } = await import('@/features/home/useHomeCanvasStore')
      const store = useHomeCanvasStore.getState()
      if (!store.isInitialized) await store.initialize()
      if (!Array.isArray(nodeIds) || nodeIds.length < 2) return { error: 'nodeIds must include at least 2 nodes' }
      const nodesBefore = [...store.nodes]
      const groupId = store.createGroup(nodeIds, label ?? undefined)
      await recordAgentAction('add_node', `Created group${label ? ` "${label}"` : ''}`, groupId, undefined, { nodes: nodesBefore }, { nodes: [...useHomeCanvasStore.getState().nodes] })
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('canvas-node-focus', { detail: { id: groupId } }))
      return { success: true, groupId }
    } catch (err) {
      return { error: `Failed to create group: ${err}` }
    }
  })
}

export async function ungroupHomeNodes(groupId: string): Promise<any> {
  return withAgentActivity('Ungrouping', [groupId], async () => {
    try {
      if (typeof window === 'undefined') return { error: 'Home canvas tools only work in browser context' }
      const { useHomeCanvasStore } = await import('@/features/home/useHomeCanvasStore')
      const store = useHomeCanvasStore.getState()
      if (!store.isInitialized) await store.initialize()
      const nodesBefore = [...store.nodes]
      const group = store.groups.find((g) => g.id === groupId)
      if (!group) return { error: `Group not found: ${groupId}` }
      store.ungroup(groupId)
      await recordAgentAction('remove_node', `Ungrouped ${group.label || groupId}`, groupId, undefined, { nodes: nodesBefore }, { nodes: [...useHomeCanvasStore.getState().nodes] })
      return { success: true, groupId, nodeIds: group.nodeIds }
    } catch (err) {
      return { error: `Failed to ungroup: ${err}` }
    }
  })
}

export async function undoCanvasAction(): Promise<any> {
  try {
    if (typeof window === 'undefined') return { error: 'Canvas tools only work in browser context' }
    const { useHomeCanvasHistory } = await import('@/features/home/useHomeCanvasHistory')
    const { useHomeCanvasStore } = await import('@/features/home/useHomeCanvasStore')
    const history = useHomeCanvasHistory.getState()
    const store = useHomeCanvasStore.getState()
    if (!history.canUndo()) return { error: 'Nothing to undo' }
    const action = history.undo()
    if (!action) return { error: 'Failed to undo' }
    if (action.before.nodes) { store.setNodes(action.before.nodes); await store.save() }
    return { success: true, message: `Undone: ${action.description}`, actor: action.actor }
  } catch (err) {
    return { error: `Failed to undo: ${err}` }
  }
}

export async function redoCanvasAction(): Promise<any> {
  try {
    if (typeof window === 'undefined') return { error: 'Canvas tools only work in browser context' }
    const { useHomeCanvasHistory } = await import('@/features/home/useHomeCanvasHistory')
    const { useHomeCanvasStore } = await import('@/features/home/useHomeCanvasStore')
    const history = useHomeCanvasHistory.getState()
    const store = useHomeCanvasStore.getState()
    if (!history.canRedo()) return { error: 'Nothing to redo' }
    const action = history.redo()
    if (!action) return { error: 'Failed to redo' }
    if (action.after.nodes) { store.setNodes(action.after.nodes); await store.save() }
    return { success: true, message: `Redone: ${action.description}`, actor: action.actor }
  } catch (err) {
    return { error: `Failed to redo: ${err}` }
  }
}

export async function getCanvasHistory(limit?: number | null): Promise<any> {
  try {
    if (typeof window === 'undefined') return { error: 'Canvas tools only work in browser context' }
    const { useHomeCanvasHistory } = await import('@/features/home/useHomeCanvasHistory')
    const history = useHomeCanvasHistory.getState()
    const actions = history.getHistory(limit || 10)
    return { canUndo: history.canUndo(), canRedo: history.canRedo(), historyCount: actions.length, history: actions.map((a: any) => ({ id: a.id, type: a.type, description: a.description, actor: a.actor, timestamp: a.timestamp, nodeId: a.nodeId })) }
  } catch (err) {
    return { error: `Failed to get history: ${err}` }
  }
}

export async function focusHomeNode(nodeId?: string | null, nodeType?: string | null): Promise<any> {
  if (typeof window === 'undefined') return { success: false, error: 'Canvas not available' }
  let targetId: string | null = nodeId ?? null
  if (!targetId && nodeType) {
    const { useHomeCanvasStore } = await import('@/features/home/useHomeCanvasStore')
    const nodes = useHomeCanvasStore.getState().nodes
    const match = nodes.find((n) => n.type === nodeType)
    if (match) targetId = match.id
  }
  if (targetId) {
    window.dispatchEvent(new CustomEvent('canvas-node-focus', { detail: { id: targetId } }))
    return { success: true, nodeId: targetId }
  }
  return { success: false, error: nodeType ? `No node of type "${nodeType}" found` : 'No nodeId or nodeType provided' }
}

export function toggleCanvasFullscreen(nodeId?: string | null, action?: string | null): any {
  if (typeof window === 'undefined') return { success: false, error: 'Canvas not available' }
  const resolvedAction = action ?? 'toggle'
  const resolvedNodeId = nodeId ?? null
  window.dispatchEvent(new CustomEvent('canvas-toggle-fullscreen', { detail: { nodeId: resolvedNodeId, action: resolvedAction } }))
  return { success: true, nodeId: resolvedNodeId, action: resolvedAction }
}
