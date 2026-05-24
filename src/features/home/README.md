# Home Feature

ReactFlow-based spatial canvas workspace. The "home" is a visual surface where nodes represent files, agents, terminals, people, events, and more. Nodes are file-backed — each persists to a file in the vault.

---

## Directory Structure

```
home/
├── HomeCanvas.tsx          # Main orchestrator — layout + ReactFlow setup (133 KB, pending split)
├── HomeCanvasHeader.tsx    # Top toolbar (space tabs, title, controls)
├── HomeCanvasSidebar.tsx   # Left sidebar (app rail for home view)
├── HomeCanvasFileBrowser.tsx # Left panel file browser (vault-aware, @namespace directories)
├── CanvasToolbar.tsx       # Floating toolbar (add node, zoom, etc.)
├── FullscreenTabs.tsx      # Fullscreen node tab experience
├── SpaceTabs.tsx / SpaceTabsNew.tsx  # Space switching tabs
├── NodeDetailsSheet.tsx    # Right sheet panel for node details
├── FreehandOverlay.tsx     # Freehand drawing overlay
├── HelperLines.tsx         # Snap-to-grid helper lines
├── useHomeCanvasStore.ts   # Zustand store — nodes, edges, viewport, spaces, file sync
├── useHomeCanvasHistory.ts # Undo/redo history
├── useCanvasClipboard.ts   # Copy/paste for nodes
├── useAgentCanvasActivity.ts # Agent-initiated canvas changes
├── canvasUtils.ts          # Layout algorithms (dagre, elk, grid, align, distribute)
├── tableOps.ts             # Table node CRUD operations
├── tableOps.test.ts        # Table operation tests
├── types.ts                # All canvas types (CanvasNode, CanvasEdge, NodeData, etc.)
├── utils.ts                # Canvas utility functions
├── index.ts                # Barrel
└── nodes/
    ├── index.ts            # NODE_TYPES map + exports
    ├── FileBackedNodes.tsx  # Nodes backed by .data/.note/.canvas files (57 KB)
    ├── WrappedNodes.tsx     # All node wrappers with shared behaviors (68 KB)
    ├── AgentNode.tsx        # Agent chat node
    ├── CalendarNode.tsx     # Calendar view node
    ├── HomeTerminalNode.tsx # Terminal node
    ├── PersonNode.tsx       # Person entity node
    ├── EventNode.tsx        # Calendar event node
    ├── FolderNode.tsx       # Directory node
    ├── GroupNode.tsx        # Group/frame node
    ├── FreehandNode.tsx     # Freehand drawing node
    ├── PlaceholderNode.tsx  # Loading/empty state node
    ├── EmptyFileNode.tsx    # Empty file placeholder
    ├── HomeFilePreviewNode.tsx   # Inline file preview node
    └── CanvasNodeWrapper.tsx    # Shared wrapper (selection, resize, context menu)
```

---

## Key Types (`types.ts`)

```typescript
type CanvasNodeType =
  | 'richText' | 'stickyNote' | 'image' | 'embed' | 'youtube'
  | 'shape' | 'table' | 'file' | 'note' | 'agent' | 'terminal'
  | 'person' | 'calendar' | 'event' | 'folder' | 'group' | 'freehand'

interface CanvasNodeData {
  type: CanvasNodeType
  label?: string
  file?: string        // Vault-relative path for file-backed nodes
  content?: unknown    // Inline content (non-file-backed)
  locked?: boolean
  width?: number
  height?: number
}
```

---

## File-Backed Nodes

Most node types are **file-backed**: their content lives in a vault file, and the node is just a reference to that file. Creating a node creates a file; deleting a node deletes the file (with confirmation).

File-backed node types: `file`, `note`, `embed`, `youtube`, `image`, `canvas`, `sketch`, `whiteboard`, `web`, `agent`, `terminal`

---

## Store (`useHomeCanvasStore.ts`)

Key state:
- `nodes` / `edges` — ReactFlow elements
- `currentSpacePath` — Active space (vault sub-path)
- `spaces` — All spaces (multi-canvas support)
- `fileVersions` — File content cache (for real-time node updates)

Key actions:
- `addNode(type, position, data?)` — Add node, create backing file if needed
- `removeNode(nodeId)` — Remove node + delete backing file
- `updateNodeData(nodeId, data)` — Patch node data
- `saveLayout()` — Persist layout to `_layout_.json`

---

## Invariants

1. **File-backed nodes**: `node.data.file` is the vault-relative path. Always resolve via `useVault().vaultPath + '/' + node.data.file`.
2. **Layout persistence**: Layout saves to `@home/spaces/{spaceName}/_layout_.json` on change (debounced).
3. **Node IDs**: Use `nanoid()` for new node IDs. Never reuse IDs.
4. **ReactFlow constraint**: All node components must be wrapped in `React.memo` to prevent unnecessary re-renders.

---

## How to Add a Node Type

1. Create `nodes/[Name]Node.tsx` — must be `React.memo`-wrapped
2. Add to `NODE_TYPES` map in `nodes/index.ts`
3. Add type to `CanvasNodeType` union in `types.ts`
4. Add creation logic in `useHomeCanvasStore.addNode()` if file-backed
5. Add to `CanvasToolbar.tsx` if user-creatable
