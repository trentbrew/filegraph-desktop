/**
 * Home Canvas Store
 *
 * Manages the home canvas state with file-backed persistence.
 * Each node's content is stored in a separate file, while layout
 * (positions, dimensions, edges) is stored in a layout file.
 */

import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { Node, Edge, Viewport } from 'reactflow'
import {
  readLayout,
  writeLayout,
  createNodeFile,
  generateNodeFileName,
  archiveNode,
  restoreNode,
  cleanupExpiredArchive,
  listArchivedNodes,
  getNodeFilePath,
  layoutToReactFlowNode,
  reactFlowNodeToLayout,
  isHomeNodeFile,
  readSpacesIndex,
  writeSpacesIndex,
  readSpaceLayout,
  writeSpaceLayout,
  createSpace,
  deleteSpace,
  updateSpaceMetadata,
  getSpacePath,
  migrateFromLegacySpaces,
} from './utils'
import {
  DEFAULT_HOME_LAYOUT,
  DEFAULT_ARCHIVE_RETENTION_DAYS,
  NODE_TYPE_TO_EXTENSION,
  type HomeCanvasLayout,
  type NodeLayout,
  type EdgeLayout,
  type ArchivedNode,
  type SpaceMetadata,
  type SpacesIndex,
  type Group,
  GROUP_COLORS,
} from './types'
import { findNonOverlappingPosition } from './canvasUtils'

// ─────────────────────────────────────────────────────────────────────────────
// Store Types
// ─────────────────────────────────────────────────────────────────────────────

interface HomeCanvasState {
  // Space management
  spaces: SpaceMetadata[]
  activeSpaceId: string
  currentSpacePath: string | null

  // Layout state
  nodes: Node[]
  edges: Edge[]
  viewport: Viewport

  // Groups
  groups: Group[]

  // Loading/error state
  isLoading: boolean
  error: string | null

  // Dirty state for save indicator
  hasUnsavedChanges: boolean

  isDragging: boolean

  isSaving: boolean

  savePerf: {
    saveCount: number
    lastSaveAt: string | null
    lastTotalMs: number | null
    lastLayoutBuildMs: number | null
    lastWriteMs: number | null
    lastMetadataMs: number | null
  }

  // Archive
  archivedNodes: ArchivedNode[]
  archiveRetentionDays: number

  // Initialization
  isInitialized: boolean
}

interface HomeCanvasActions {
  // Initialization
  initialize: () => Promise<void>

  // Space management
  switchSpace: (spaceId: string) => Promise<void>
  createNewSpace: (name: string, icon?: string) => Promise<void>
  deleteExistingSpace: (spaceId: string) => Promise<void>
  updateSpace: (spaceId: string, updates: Partial<{ name: string; icon: string }>) => Promise<void>
  refreshSpaces: () => Promise<void>

  // Node operations
  addNode: (
    nodeType: string,
    position: { x: number; y: number },
    label?: string,
    initialContent?: unknown | Record<string, unknown>,
  ) => Promise<string>
  removeNode: (nodeId: string) => Promise<void>
  updateNodePosition: (nodeId: string, position: { x: number; y: number }) => void
  updateNodeDimensions: (nodeId: string, dimensions: { width: number; height: number }) => void
  setNodes: (nodes: Node[] | ((nodes: Node[]) => Node[])) => void
  setNodesTransient: (nodes: Node[] | ((nodes: Node[]) => Node[])) => void

  // Edge operations
  addEdge: (edge: Edge) => void
  removeEdge: (edgeId: string) => void
  setEdges: (edges: Edge[] | ((edges: Edge[]) => Edge[])) => void
  setEdgesTransient: (edges: Edge[] | ((edges: Edge[]) => Edge[])) => void

  // Viewport
  setViewport: (viewport: Viewport) => void

  // Drag state
  setDragging: (isDragging: boolean) => void

  // Persistence
  save: () => Promise<void>

  // Archive operations
  restoreArchivedNode: (archivedNodeId: string) => Promise<void>
  cleanupArchive: () => Promise<number>
  refreshArchivedNodes: () => Promise<void>
  setArchiveRetentionDays: (days: number) => void

  // File drop support
  addFileNode: (
    filePath: string,
    position: { x: number; y: number },
    dimensions?: { width: number; height: number },
  ) => string

  addFolderNode: (
    folderPath: string,
    position: { x: number; y: number },
    dimensions?: { width: number; height: number },
  ) => string

  // Group operations
  createGroup: (nodeIds: string[], label?: string) => string
  ungroup: (groupId: string) => void
  deleteGroup: (groupId: string) => void
  setGroups: (groups: Group[] | ((groups: Group[]) => Group[])) => void
}

type HomeCanvasStore = HomeCanvasState & HomeCanvasActions

// ─────────────────────────────────────────────────────────────────────────────
// Store Implementation
// ─────────────────────────────────────────────────────────────────────────────

export const useHomeCanvasStore = create<HomeCanvasStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    spaces: [],
    activeSpaceId: 'default',
    currentSpacePath: null,
    nodes: [],
    edges: [],
    viewport: DEFAULT_HOME_LAYOUT.viewport,
    groups: [],
    isLoading: false,
    error: null,
    hasUnsavedChanges: false,
    isDragging: false,
    isSaving: false,
    savePerf: {
      saveCount: 0,
      lastSaveAt: null,
      lastTotalMs: null,
      lastLayoutBuildMs: null,
      lastWriteMs: null,
      lastMetadataMs: null,
    },
    archivedNodes: [],
    archiveRetentionDays: DEFAULT_ARCHIVE_RETENTION_DAYS,
    isInitialized: false,

    // ─────────────────────────────────────────────────────────────────────────
    // Initialization
    // ─────────────────────────────────────────────────────────────────────────

    initialize: async () => {
      if (get().isInitialized) return

      set({ isLoading: true, error: null })

      try {
        // Migrate from legacy @home/spaces/ structure if needed
        await migrateFromLegacySpaces()

        // Load spaces index
        const spacesIndex = await readSpacesIndex()
        const activeSpaceId = spacesIndex.activeSpaceId

        // Load active space layout
        const layout = await readSpaceLayout(activeSpaceId)

        // Get current space path (space root = where node files live)
        const currentSpacePath = await getSpacePath(activeSpaceId)

        // Convert layout nodes to ReactFlow nodes — deduplicate by ID so corrupted layouts self-heal
        const seenInit = new Set<string>()
        const nodes: Node[] = layout.nodes
          .map((nl) => layoutToReactFlowNode(nl))
          .filter((n) => {
            if (seenInit.has(n.id)) {
              console.warn('[HomeCanvas] Deduplicated duplicate node on load:', n.id)
              return false
            }
            seenInit.add(n.id)
            return true
          })

        // Convert layout edges to ReactFlow edges
        const edges: Edge[] = layout.edges.map((el) => {
          const kind = (el.data as any)?.kind as string | undefined
          const defaultSourceHandle = kind === 'folder-child' ? 'right' : 'bottom'
          const defaultTargetHandle = kind === 'folder-child' ? 'left' : 'top'

          return {
            id: el.id,
            source: el.source,
            target: el.target,
            sourceHandle: el.sourceHandle ?? defaultSourceHandle,
            targetHandle: el.targetHandle ?? defaultTargetHandle,
            type: el.type,
            data: el.data,
          }
        })

        // Load archived nodes
        const archivedNodes = await listArchivedNodes()

        // Cleanup expired archive in the background
        cleanupExpiredArchive().catch(console.error)

        set({
          spaces: spacesIndex.spaces,
          activeSpaceId,
          currentSpacePath,
          nodes,
          edges,
          viewport: layout.viewport,
          archivedNodes,
          isLoading: false,
          isInitialized: true,
        })
      } catch (err) {
        console.error('[HomeCanvas] Failed to initialize:', err)
        set({
          error: err instanceof Error ? err.message : 'Failed to load home canvas',
          isLoading: false,
          isInitialized: true,
        })
      }
    },

    // ─────────────────────────────────────────────────────────────────────────
    // Space Management
    // ─────────────────────────────────────────────────────────────────────────

    switchSpace: async (spaceId) => {
      const state = get()

      if (spaceId === state.activeSpaceId) return

      // Save current space before switching
      if (state.hasUnsavedChanges) {
        await get().save()
      }

      set({ isLoading: true, error: null })

      try {
        // Load new space layout
        const layout = await readSpaceLayout(spaceId)
        const currentSpacePath = await getSpacePath(spaceId)

        // Convert to ReactFlow format — deduplicate by ID so corrupted layouts self-heal
        const seenSwitch = new Set<string>()
        const nodes: Node[] = layout.nodes
          .map((nl) => layoutToReactFlowNode(nl))
          .filter((n) => {
            if (seenSwitch.has(n.id)) {
              console.warn('[HomeCanvas] Deduplicated duplicate node on switch:', n.id)
              return false
            }
            seenSwitch.add(n.id)
            return true
          })
        const edges: Edge[] = layout.edges.map((el) => ({
          id: el.id,
          source: el.source,
          target: el.target,
          sourceHandle: el.sourceHandle ?? 'bottom',
          targetHandle: el.targetHandle ?? 'top',
          type: el.type,
          data: el.data,
        }))

        // Update spaces index
        const spacesIndex = await readSpacesIndex()
        spacesIndex.activeSpaceId = spaceId
        await writeSpacesIndex(spacesIndex)

        set({
          activeSpaceId: spaceId,
          currentSpacePath,
          nodes,
          edges,
          viewport: layout.viewport,
          hasUnsavedChanges: false,
          isLoading: false,
        })

        // Notify sidebar that space changed
        window.dispatchEvent(new CustomEvent('space-changed', { detail: { spacePath: currentSpacePath } }))

        // Trigger fitView after switching spaces
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('canvas-fit-view'))
        }, 100)
      } catch (err) {
        console.error('[HomeCanvas] Failed to switch space:', err)
        set({
          error: err instanceof Error ? err.message : 'Failed to switch space',
          isLoading: false,
        })
      }
    },

    createNewSpace: async (name, icon) => {
      try {
        const newSpace = await createSpace(name, icon)

        // Refresh spaces list
        const spacesIndex = await readSpacesIndex()
        set({ spaces: spacesIndex.spaces })

        // Switch to new space
        await get().switchSpace(newSpace.id)

        // Create a welcome note in the center of the new space
        const welcomeContent = {
          type: 'doc',
          content: [
            {
              type: 'heading',
              attrs: { level: 1 },
              content: [{ type: 'text', text: `Welcome to ${name}` }],
            },
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'This is your new canvas space. You can:' }],
            },
            {
              type: 'bulletList',
              content: [
                {
                  type: 'listItem',
                  content: [
                    {
                      type: 'paragraph',
                      content: [{ type: 'text', text: 'Right-click to add nodes (text, sticky notes, images, etc.)' }],
                    },
                  ],
                },
                {
                  type: 'listItem',
                  content: [
                    {
                      type: 'paragraph',
                      content: [{ type: 'text', text: 'Drag files from the sidebar onto the canvas' }],
                    },
                  ],
                },
                {
                  type: 'listItem',
                  content: [
                    {
                      type: 'paragraph',
                      content: [{ type: 'text', text: 'Connect nodes by dragging from one to another' }],
                    },
                  ],
                },
                {
                  type: 'listItem',
                  content: [
                    {
                      type: 'paragraph',
                      content: [{ type: 'text', text: 'Scroll to pan, pinch to zoom' }],
                    },
                  ],
                },
              ],
            },
            {
              type: 'paragraph',
              content: [],
            },
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'Feel free to delete this note and start building!' }],
            },
          ],
        }

        const welcomeNodeId = await get().addNode('richText', { x: 0, y: 0 }, 'Welcome', welcomeContent)

        // Update the welcome note to have larger dimensions
        get().updateNodeDimensions(welcomeNodeId, { width: 500, height: 400 })

        // Trigger selection on the welcome note after a short delay
        setTimeout(() => {
          // First fit the view to show all content
          window.dispatchEvent(new CustomEvent('canvas-fit-view'))

          // Then select the welcome note
          setTimeout(() => {
            get().setNodes((currentNodes) =>
              currentNodes.map((n) => ({ ...n, selected: n.id === welcomeNodeId })),
            )
          }, 300)
        }, 200)
      } catch (err) {
        console.error('[HomeCanvas] Failed to create space:', err)
        throw err
      }
    },

    deleteExistingSpace: async (spaceId) => {
      try {
        await deleteSpace(spaceId)

        // Refresh spaces list
        const spacesIndex = await readSpacesIndex()
        set({ spaces: spacesIndex.spaces })
      } catch (err) {
        console.error('[HomeCanvas] Failed to delete space:', err)
        throw err
      }
    },

    updateSpace: async (spaceId, updates) => {
      try {
        await updateSpaceMetadata(spaceId, updates)

        // Refresh spaces list
        const spacesIndex = await readSpacesIndex()
        set({ spaces: spacesIndex.spaces })
      } catch (err) {
        console.error('[HomeCanvas] Failed to update space:', err)
        throw err
      }
    },

    refreshSpaces: async () => {
      try {
        const spacesIndex = await readSpacesIndex()
        set({ spaces: spacesIndex.spaces })
      } catch (err) {
        console.error('[HomeCanvas] Failed to refresh spaces:', err)
      }
    },

    // ─────────────────────────────────────────────────────────────────────────
    // Node Operations
    // ─────────────────────────────────────────────────────────────────────────

    addNode: async (nodeType, position, label, initialContent) => {
      try {
        const state = get()
        const isFileBacked = NODE_TYPE_TO_EXTENSION[nodeType] != null

        // Transform content for specific node types
        let transformedContent = initialContent
        if (nodeType === 'richText' && initialContent) {
          const content = initialContent as Record<string, unknown>
          // If agent passes {content: "text"}, convert to TipTap JSON format
          if (typeof content.content === 'string') {
            transformedContent = {
              type: 'doc',
              content: content.content.split('\n').map((line: string) => ({
                type: 'paragraph',
                content: line ? [{ type: 'text', text: line }] : [],
              })),
            }
          }
        }

        let filePath: string | undefined
        if (isFileBacked) {
          // Generate filename and create the node file in current space
          const fileName = generateNodeFileName(nodeType, label)
          const { join } = await import('@tauri-apps/api/path')
          const fullPath = state.currentSpacePath
            ? await join(state.currentSpacePath, fileName)
            : await getNodeFilePath(fileName)

          const { invoke } = await import('@tauri-apps/api/core')
          let content: string
          switch (nodeType) {
            case 'richText':
              content = JSON.stringify(
                transformedContent || { type: 'doc', content: [{ type: 'paragraph', content: [] }] },
                null,
                2,
              )
              break
            case 'stickyNote':
              content = JSON.stringify(transformedContent || { text: '', color: 'yellow' }, null, 2)
              break
            case 'embed':
            case 'youtube':
              content = JSON.stringify(
                transformedContent || { url: '', title: nodeType === 'youtube' ? 'YouTube' : 'Web' },
                null,
                2,
              )
              break
            case 'table':
              content = JSON.stringify(
                transformedContent || { headers: ['Column 1', 'Column 2'], rows: [['', '']] },
                null,
                2,
              )
              break
            default:
              content = JSON.stringify(transformedContent || {}, null, 2)
          }

          await invoke('write_text_file', { filePath: fullPath, content })
          filePath = fullPath
        }

        // Generate node ID
        const nodeId = `node-${crypto.randomUUID()}`

        // Default dimensions based on type
        let width: number | undefined = 300
        let height: number | undefined = 200
        if (nodeType === 'stickyNote') {
          width = 200
          height = 150
        } else if (nodeType === 'richText') {
          width = 350
          height = 250
        } else if (nodeType === 'shape') {
          width = 150
          height = 100
        } else if (nodeType === 'image') {
          width = 300
          height = 200
        } else if (nodeType === 'spotify') {
          width = 600
          height = 600
        } else if (nodeType === 'embed') {
          width = 1200
          height = 900
        } else if (nodeType === 'youtube') {
          width = 400
          height = 225
        } else if (nodeType === 'pdf') {
          width = 400
          height = 500
        } else if (nodeType === 'location') {
          width = 300
          height = 200
        } else if (nodeType === 'codeBlock') {
          width = 600
          height = 400
        } else if (nodeType === 'terminal') {
          width = 600
          height = 350
        } else if (nodeType === 'audio') {
          width = 320
          height = 140
        } else if (nodeType === 'freehand') {
          const initialSize = (initialContent as any)?.initialSize as { width?: number; height?: number } | undefined
          if (typeof initialSize?.width === 'number' && typeof initialSize?.height === 'number') {
            width = initialSize.width
            height = initialSize.height
          }
        } else if (nodeType === 'table') {
          // Calculate dimensions from table content
          const tableData = initialContent as { headers?: string[]; rows?: string[][] } | undefined
          const numCols = tableData?.headers?.length || 3
          const numRows = tableData?.rows?.length || 2
          width = Math.min(numCols * 120 + 40, 900)
          height = Math.min((numRows + 1) * 32 + 60, 600) // +1 for header row, +60 for padding/buttons
        } else if (nodeType === 'event') {
          // Event nodes auto-size to content
          width = 280
          height = undefined
        } else if (nodeType === 'calendar') {
          // Calendar nodes have fixed dimensions
          width = 300
          height = 420
        }

        // Find a non-overlapping position for the new node
        const safeDims = width !== undefined && height !== undefined ? { width, height } : undefined
        const safePosition = findNonOverlappingPosition(state.nodes, position, nodeType, safeDims)

        // Merge extra data from initialContent if it's an object (for color, shape, etc.)
        const extraData =
          typeof initialContent === 'object' && initialContent !== null
            ? (initialContent as Record<string, unknown>)
            : {}

        // Build style object, only including defined dimensions
        const style: Record<string, number | undefined> = {}
        if (width !== undefined) style.width = width
        if (height !== undefined) style.height = height

        // Create ReactFlow node
        const newNode: Node = {
          id: nodeId,
          type: nodeType,
          position: safePosition,
          ...(Object.keys(style).length > 0 ? { style } : {}),
          data: {
            ...(filePath ? { file: filePath } : {}),
            label: label || nodeType.charAt(0).toUpperCase() + nodeType.slice(1),
            ...extraData,
          },
        }

        set((state) => ({
          nodes: [...state.nodes, newNode],
          hasUnsavedChanges: true,
        }))

        // Auto-save
        get().save()

        return nodeId
      } catch (err) {
        console.error('[HomeCanvas] Failed to add node:', err)
        throw err
      }
    },

    removeNode: async (nodeId) => {
      const state = get()
      const node = state.nodes.find((n) => n.id === nodeId)

      if (!node) return

      const filePath = node.data?.file as string | undefined

      // Archive the node file if it's a home node
      if (filePath && (await isHomeNodeFile(filePath))) {
        try {
          await archiveNode(nodeId, filePath, state.archiveRetentionDays)
        } catch (err) {
          console.error('[HomeCanvas] Failed to archive node:', err)
          // Continue with removal even if archive fails
        }
      }

      // Remove node from any groups it belongs to
      const updatedGroups = state.groups
        .map((group) => ({
          ...group,
          nodeIds: group.nodeIds.filter((id) => id !== nodeId),
        }))
        .filter((group) => group.nodeIds.length > 0) // Remove empty groups

      // Remove node and connected edges
      set((state) => ({
        nodes: state.nodes.filter((n) => n.id !== nodeId),
        edges: state.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
        groups: updatedGroups,
        hasUnsavedChanges: true,
      }))

      // Refresh archived nodes list
      get().refreshArchivedNodes()

      // Auto-save
      get().save()
    },

    updateNodePosition: (nodeId, position) => {
      set((state) => ({
        nodes: state.nodes.map((n) => (n.id === nodeId ? { ...n, position } : n)),
        hasUnsavedChanges: true,
      }))
    },

    updateNodeDimensions: (nodeId, dimensions) => {
      set((state) => ({
        nodes: state.nodes.map((n) =>
          n.id === nodeId ? { ...n, style: { ...n.style, width: dimensions.width, height: dimensions.height } } : n,
        ),
        hasUnsavedChanges: true,
      }))
    },

    setNodes: (nodesOrFn) => {
      if (typeof nodesOrFn === 'function') {
        set((state) => {
          const next = nodesOrFn(state.nodes)
          if (next === state.nodes) return {}
          return { nodes: next, hasUnsavedChanges: true }
        })
      } else {
        set((state) => (nodesOrFn === state.nodes ? {} : { nodes: nodesOrFn, hasUnsavedChanges: true }))
      }
    },

    setNodesTransient: (nodesOrFn) => {
      if (typeof nodesOrFn === 'function') {
        set((state) => {
          const next = nodesOrFn(state.nodes)
          if (next === state.nodes) return {}
          return { nodes: next }
        })
      } else {
        set((state) => (nodesOrFn === state.nodes ? {} : { nodes: nodesOrFn }))
      }
    },

    // ─────────────────────────────────────────────────────────────────────────
    // Edge Operations
    // ─────────────────────────────────────────────────────────────────────────

    addEdge: (edge) => {
      set((state) => ({
        edges: [...state.edges, edge],
        hasUnsavedChanges: true,
      }))
    },

    removeEdge: (edgeId) => {
      set((state) => ({
        edges: state.edges.filter((e) => e.id !== edgeId),
        hasUnsavedChanges: true,
      }))
    },

    setEdges: (edgesOrFn) => {
      if (typeof edgesOrFn === 'function') {
        set((state) => {
          const next = edgesOrFn(state.edges)
          if (next === state.edges) return {}
          return { edges: next, hasUnsavedChanges: true }
        })
      } else {
        set((state) => (edgesOrFn === state.edges ? {} : { edges: edgesOrFn, hasUnsavedChanges: true }))
      }
    },

    setEdgesTransient: (edgesOrFn) => {
      if (typeof edgesOrFn === 'function') {
        set((state) => {
          const next = edgesOrFn(state.edges)
          if (next === state.edges) return {}
          return { edges: next }
        })
      } else {
        set((state) => (edgesOrFn === state.edges ? {} : { edges: edgesOrFn }))
      }
    },

    // ─────────────────────────────────────────────────────────────────────────
    // Viewport
    // ─────────────────────────────────────────────────────────────────────────

    setViewport: (viewport) => {
      set({ viewport, hasUnsavedChanges: true })
    },

    // ─────────────────────────────────────────────────────────────────────────
    // Drag state
    // ─────────────────────────────────────────────────────────────────────────

    setDragging: (isDragging) => {
      set({ isDragging })
    },

    // ─────────────────────────────────────────────────────────────────────────
    // Persistence
    // ─────────────────────────────────────────────────────────────────────────

    save: async () => {
      const state = get()

      if (!state.hasUnsavedChanges) return

      try {
        set({ isSaving: true })
        const totalStart = performance.now()

        const layoutBuildStart = performance.now()
        // Convert ReactFlow nodes to layout nodes
        const nodeLayouts: NodeLayout[] = state.nodes.map((n) => reactFlowNodeToLayout(n as any))

        // Convert ReactFlow edges to layout edges
        const edgeLayouts: EdgeLayout[] = state.edges.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle: e.sourceHandle ?? undefined,
          targetHandle: e.targetHandle ?? undefined,
          type: e.type,
          data: e.data as Record<string, unknown> | undefined,
        }))

        const layoutBuildMs = performance.now() - layoutBuildStart

        const layout: HomeCanvasLayout = {
          version: 1,
          viewport: state.viewport,
          nodes: nodeLayouts,
          edges: edgeLayouts,
        }

        const writeStart = performance.now()
        // Save to active space
        await writeSpaceLayout(state.activeSpaceId, layout)
        const writeMs = performance.now() - writeStart

        const currentSpace = state.spaces.find((s) => s.id === state.activeSpaceId)
        const nextNodeCount = state.nodes.length
        const nextEdgeCount = state.edges.length

        let metadataMs: number | null = null

        // Avoid extra IO on every save; only update when counts actually changed.
        if (!currentSpace || currentSpace.nodeCount !== nextNodeCount || currentSpace.edgeCount !== nextEdgeCount) {
          const metadataStart = performance.now()
          const updatedAt = new Date().toISOString()
          await updateSpaceMetadata(state.activeSpaceId, {
            nodeCount: nextNodeCount,
            edgeCount: nextEdgeCount,
            updatedAt,
          })

          metadataMs = performance.now() - metadataStart

          set((s) => ({
            spaces: s.spaces.map((space) =>
              space.id === state.activeSpaceId
                ? {
                    ...space,
                    nodeCount: nextNodeCount,
                    edgeCount: nextEdgeCount,
                    updatedAt,
                  }
                : space,
            ),
          }))
        }

        const totalMs = performance.now() - totalStart
        const lastSaveAt = new Date().toISOString()

        set((s) => ({
          hasUnsavedChanges: false,
          isSaving: false,
          savePerf: {
            saveCount: s.savePerf.saveCount + 1,
            lastSaveAt,
            lastTotalMs: totalMs,
            lastLayoutBuildMs: layoutBuildMs,
            lastWriteMs: writeMs,
            lastMetadataMs: metadataMs,
          },
        }))
      } catch (err) {
        console.error('[HomeCanvas] Failed to save:', err)
        set({
          error: err instanceof Error ? err.message : 'Failed to save',
          isSaving: false,
        })
      }
    },

    // ─────────────────────────────────────────────────────────────────────────
    // Archive Operations
    // ─────────────────────────────────────────────────────────────────────────

    restoreArchivedNode: async (archivedNodeId) => {
      try {
        const restored = await restoreNode(archivedNodeId)

        if (restored) {
          // Re-add the node to the canvas
          const ext = restored.originalPath.substring(restored.originalPath.lastIndexOf('.'))
          const nodeType =
            {
              '.note': 'richText',
              '.sticky': 'stickyNote',
              '.web': 'embed',
              '.data': 'widget',
            }[ext] || 'filePreview'

          const fileName = restored.originalPath.substring(restored.originalPath.lastIndexOf('/') + 1)
          const label = fileName
            .replace(/\.[^.]+$/, '')
            .replace(/-\d+$/, '')
            .replace(/-/g, ' ')

          const restorePosition = findNonOverlappingPosition(
            get().nodes, { x: 100, y: 100 }, nodeType, { width: 300, height: 200 },
          )

          const newNode: Node = {
            id: restored.id,
            type: nodeType,
            position: restorePosition,
            style: { width: 300, height: 200 },
            data: {
              file: restored.originalPath,
              label: label.charAt(0).toUpperCase() + label.slice(1),
            },
          }

          set((state) => ({
            nodes: [...state.nodes, newNode],
            hasUnsavedChanges: true,
          }))

          // Refresh archived nodes list
          await get().refreshArchivedNodes()

          // Auto-save
          get().save()
        }
      } catch (err) {
        console.error('[HomeCanvas] Failed to restore node:', err)
        throw err
      }
    },

    cleanupArchive: async () => {
      const deleted = await cleanupExpiredArchive()
      await get().refreshArchivedNodes()
      return deleted
    },

    refreshArchivedNodes: async () => {
      const archivedNodes = await listArchivedNodes()
      set({ archivedNodes })
    },

    setArchiveRetentionDays: (days) => {
      set({ archiveRetentionDays: days })
    },

    // ─────────────────────────────────────────────────────────────────────────
    // File Drop Support
    // ─────────────────────────────────────────────────────────────────────────

    addFileNode: (filePath, position, dimensions) => {
      const nodeId = `file-${crypto.randomUUID()}`
      const fileName = filePath.substring(filePath.lastIndexOf('/') + 1)
      const isDataFile = fileName.endsWith('.data')
      const isCsvFile = fileName.endsWith('.csv')

      // CSV files get their own table node type with resizable: true
      if (isCsvFile) {
        const csvDims = { width: dimensions?.width || 500, height: dimensions?.height || 300 }
        const safePosition = findNonOverlappingPosition(get().nodes, position, 'table', csvDims)

        const newNode: Node = {
          id: nodeId,
          type: 'table',
          position: safePosition,
          style: csvDims,
          data: {
            file: filePath,
            label: fileName,
            resizable: true, // CSV file drops are resizable
          },
        }

        set((state) => ({
          nodes: [...state.nodes, newNode],
          hasUnsavedChanges: true,
        }))

        get().save()
        return nodeId
      }

      const fileDims = {
        width: dimensions?.width || (isDataFile ? 1000 : 400),
        height: dimensions?.height || (isDataFile ? 480 : 300),
      }
      const safePosition = findNonOverlappingPosition(get().nodes, position, 'filePreview', fileDims)

      const newNode: Node = {
        id: nodeId,
        type: 'filePreview',
        position: safePosition,
        style: fileDims,
        data: {
          file: filePath,
          filePath,
          fileName,
          label: fileName,
        },
      }

      set((state) => ({
        nodes: [...state.nodes, newNode],
        hasUnsavedChanges: true,
      }))

      // Auto-save
      get().save()

      return nodeId
    },

    addFolderNode: (folderPath, position, dimensions) => {
      const nodeId = `folder-${crypto.randomUUID()}`
      const folderName = folderPath.split(/[/\\]/).pop() || 'Folder'

      const folderDims = { width: dimensions?.width || 360, height: dimensions?.height || 260 }
      const safePosition = findNonOverlappingPosition(get().nodes, position, 'folder', folderDims)

      const newNode: Node = {
        id: nodeId,
        type: 'folder',
        position: safePosition,
        style: folderDims,
        data: {
          folderPath,
          label: folderName,
        },
      }

      set((state) => ({
        nodes: [...state.nodes, newNode],
        hasUnsavedChanges: true,
      }))

      // Auto-save
      get().save()

      return nodeId
    },

    // ─────────────────────────────────────────────────────────────────────────
    // Group Operations
    // ─────────────────────────────────────────────────────────────────────────

    createGroup: (nodeIds, label) => {
      const state = get()
      if (nodeIds.length < 2) {
        throw new Error('At least 2 nodes are required to create a group')
      }

      // Validate that all nodes exist
      const nodesToGroup = nodeIds
        .map((id) => state.nodes.find((n) => n.id === id))
        .filter((n): n is Node => n !== undefined)
      if (nodesToGroup.length !== nodeIds.length) {
        throw new Error('Some nodes do not exist')
      }

      // Check if any nodes are already in a group (prevent nested groups)
      const alreadyGroupedNodes = nodesToGroup.filter((n) => n.parentId)
      if (alreadyGroupedNodes.length > 0) {
        throw new Error(
          `${alreadyGroupedNodes.length} node${alreadyGroupedNodes.length > 1 ? 's' : ''} already in a group. Ungroup them first.`,
        )
      }

      // Calculate bounding box of selected nodes
      let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity

      nodesToGroup.forEach((node) => {
        const measured = (node as any).measured as { width?: number; height?: number } | undefined
        const width =
          (node.style?.width as number) || (node.width as number) || measured?.width || (node.data as any)?.width || 200
        const height =
          (node.style?.height as number) ||
          (node.height as number) ||
          measured?.height ||
          (node.data as any)?.height ||
          150
        minX = Math.min(minX, node.position.x)
        minY = Math.min(minY, node.position.y)
        maxX = Math.max(maxX, node.position.x + width)
        maxY = Math.max(maxY, node.position.y + height)
      })

      const paddingX = 12
      const paddingTop = 40
      const paddingBottom = 12
      const groupId = `group-${crypto.randomUUID()}`
      const colorIndex = state.groups.length % GROUP_COLORS.length
      const color = GROUP_COLORS[colorIndex]

      // Create group node
      const groupNode: Node = {
        id: groupId,
        type: 'group',
        position: { x: minX - paddingX, y: minY - paddingTop },
        style: {
          width: maxX - minX + paddingX * 2,
          height: maxY - minY + paddingTop + paddingBottom,
        },
        data: {
          label: label || `Group ${state.groups.length + 1}`,
          color,
        },
        draggable: true,
        selectable: true,
      }

      // Update child nodes to have parentId and expandParent
      const updatedNodes = state.nodes.map((node) => {
        if (nodeIds.includes(node.id)) {
          return {
            ...node,
            parentId: groupId,
            position: {
              x: node.position.x - groupNode.position.x,
              y: node.position.y - groupNode.position.y,
            },
            expandParent: true,
          }
        }
        return node
      })

      const newGroup: Group = {
        id: groupId,
        label: label || `Group ${state.groups.length + 1}`,
        nodeIds,
        color,
        createdAt: new Date().toISOString(),
      }

      set((state) => ({
        nodes: [groupNode, ...updatedNodes],
        groups: [...state.groups, newGroup],
        hasUnsavedChanges: true,
      }))

      // Auto-save
      get().save()

      return groupId
    },

    ungroup: (groupId) => {
      const state = get()
      const groupNode = state.nodes.find((n) => n.id === groupId)
      if (!groupNode) {
        throw new Error('Group not found')
      }

      // Find child nodes and remove parentId
      const updatedNodes = state.nodes.map((node) => {
        if (node.parentId === groupId) {
          // Reposition node to absolute coordinates
          const groupPosition = groupNode.position
          return {
            ...node,
            parentId: undefined,
            position: {
              x: node.position.x + groupPosition.x,
              y: node.position.y + groupPosition.y,
            },
            expandParent: undefined,
          }
        }
        return node
      })

      // Remove the group node
      const nodesWithoutGroup = updatedNodes.filter((n) => n.id !== groupId)

      set((state) => ({
        nodes: nodesWithoutGroup,
        groups: state.groups.filter((g) => g.id !== groupId),
        hasUnsavedChanges: true,
      }))

      // Auto-save
      get().save()
    },

    deleteGroup: (groupId) => {
      const state = get()
      const group = state.groups.find((g) => g.id === groupId)
      if (!group) {
        throw new Error('Group not found')
      }

      // Remove the group
      set((state) => ({
        groups: state.groups.filter((g) => g.id !== groupId),
        hasUnsavedChanges: true,
      }))

      // Auto-save
      get().save()
    },

    setGroups: (groups) => {
      set((state) => ({
        groups: typeof groups === 'function' ? groups(state.groups) : groups,
        hasUnsavedChanges: true,
      }))
    },
  })),
)

// ─────────────────────────────────────────────────────────────────────────────
// Debounced Save Hook
// ─────────────────────────────────────────────────────────────────────────────

let saveTimeout: ReturnType<typeof setTimeout> | null = null

/**
 * Subscribe to changes and auto-save with debounce
 */
useHomeCanvasStore.subscribe(
  (state) => state.hasUnsavedChanges,
  (hasUnsavedChanges) => {
    if (!hasUnsavedChanges) return
    if (useHomeCanvasStore.getState().isDragging) return

    if (saveTimeout) {
      clearTimeout(saveTimeout)
    }

    saveTimeout = setTimeout(() => {
      useHomeCanvasStore.getState().save()
    }, 1000) // 1 second debounce
  },
)

// Trigger save when drag ends if there are unsaved changes
useHomeCanvasStore.subscribe(
  (state) => state.isDragging,
  (isDragging, prevIsDragging) => {
    // Only trigger when drag ends (was true, now false)
    if (prevIsDragging && !isDragging) {
      const state = useHomeCanvasStore.getState()
      if (state.hasUnsavedChanges) {
        if (saveTimeout) {
          clearTimeout(saveTimeout)
        }
        saveTimeout = setTimeout(() => {
          useHomeCanvasStore.getState().save()
        }, 1000)
      }
    }
  },
)
