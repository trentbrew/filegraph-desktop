/**
 * Home Canvas Types
 *
 * The home canvas uses a file-backed architecture where each node's content
 * is stored in a separate file. This enables:
 * - Persistent content across sessions
 * - Reuse of existing file viewers/projections
 * - Drag & drop of any file to create nodes
 * - Consistent behavior with workspace file previews
 */

import type { Viewport } from 'reactflow'

// ─────────────────────────────────────────────────────────────────────────────
// Node File Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * File extensions for home canvas node types
 */
export const HOME_NODE_EXTENSIONS = {
  note: '.note', // Rich text (TipTap JSON)
  sticky: '.sticky', // Sticky note (simple JSON)
  web: '.web', // Web embed (JSON with URL)
  data: '.data', // Data/widget (JSON-LD or JSON)
  table: '.csv', // Table data (CSV format)
  chat: '.chat', // Agent chat conversation (JSON)
} as const

export type HomeNodeExtension = (typeof HOME_NODE_EXTENSIONS)[keyof typeof HOME_NODE_EXTENSIONS]

/**
 * Node type to extension mapping
 */
export const NODE_TYPE_TO_EXTENSION: Record<string, HomeNodeExtension | null> = {
  richText: HOME_NODE_EXTENSIONS.note,
  stickyNote: HOME_NODE_EXTENSIONS.sticky,
  embed: HOME_NODE_EXTENSIONS.web,
  youtube: HOME_NODE_EXTENSIONS.web,
  spotify: HOME_NODE_EXTENSIONS.web,
  widget: HOME_NODE_EXTENSIONS.data,
  table: HOME_NODE_EXTENSIONS.table,
  agent: HOME_NODE_EXTENSIONS.chat,
  // These node types reference external files, not home-specific ones
  filePreview: null,
  folder: null,
  image: null,
  audio: null,
  shape: null,
  terminal: null,
  codeBlock: null,
  freehand: null,
  pdf: null,
  location: null,
  // Calendar nodes store data inline (not file-backed)
  calendar: null,
  event: null,
}

/**
 * Extension to node type mapping
 */
export const EXTENSION_TO_NODE_TYPE: Record<string, string> = {
  '.note': 'richText',
  '.sticky': 'stickyNote',
  '.web': 'embed',
  '.data': 'widget',
  '.csv': 'table',
  '.chat': 'agent',
}

// ─────────────────────────────────────────────────────────────────────────────
// Node Content Schemas
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sticky note file content
 */
export interface StickyNoteContent {
  text: string
  color?: string
}

/**
 * Web embed file content
 */
export interface WebEmbedContent {
  url: string
  title?: string
  favicon?: string
  provider?: string
  videoId?: string
  spotifyId?: string
  spotifyType?: string
}

/**
 * Widget/data file content (flexible JSON)
 */
export interface WidgetContent {
  type: string
  config?: Record<string, unknown>
  data?: unknown
}

/**
 * Table file content
 */
export interface TableContent {
  headers: string[]
  rows: string[][]
}

/**
 * Agent chat message stored in .chat files
 */
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  attachments?: Array<{
    id: string
    name: string
    type: string
    size: number
    data?: string
    previewUrl?: string
  }>
}

/**
 * Agent chat file content (.chat)
 */
export interface AgentChatContent {
  title?: string
  messages: ChatMessage[]
  modelConfig?: {
    provider: string
    model: string
  }
  createdAt: string
  updatedAt: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Layout Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Node position and dimensions in the canvas layout
 */
export interface NodeLayout {
  id: string
  /** Path to the node's content file (relative to home dir or absolute) */
  file?: string
  /** Node type (required for non-file-backed nodes) */
  type?: string
  /** Inline data for non-file-backed nodes (tables, shapes, images, embeds) */
  data?: Record<string, unknown>
  position: { x: number; y: number }
  dimensions: { width: number; height: number }
  /** Optional z-index for layering */
  zIndex?: number
  /** Parent node ID for group children (positions are relative to parent) */
  parentId?: string
}

/**
 * Edge/connection between nodes
 */
export interface EdgeLayout {
  id: string
  source: string
  target: string
  sourceHandle?: string
  targetHandle?: string
  type?: string
  data?: Record<string, unknown>
}

/**
 * Complete home canvas layout file schema
 */
export interface HomeCanvasLayout {
  version: 1
  viewport: Viewport
  nodes: NodeLayout[]
  edges: EdgeLayout[]
  /** Last modified timestamp */
  updatedAt?: string
}

/**
 * Space metadata
 */
export interface SpaceMetadata {
  id: string
  name: string
  icon?: string
  createdAt: string
  updatedAt: string
  nodeCount: number
  edgeCount: number
}

/**
 * Spaces index file schema
 */
export interface SpacesIndex {
  version: 1
  activeSpaceId: string
  spaces: SpaceMetadata[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Archive Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Archived node metadata
 */
export interface ArchivedNode {
  /** Original node ID */
  id: string
  /** Original file path */
  originalPath: string
  /** Path in archive */
  archivePath: string
  /** When it was archived */
  archivedAt: string
  /** When it should be permanently deleted (if auto-delete enabled) */
  expiresAt?: string
}

/**
 * Archive manifest file schema
 */
export interface ArchiveManifest {
  version: 1
  nodes: ArchivedNode[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Paths & Constants
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Home canvas directory structure
 * ~/.filegraph/@spaces/
 *   _index_.json          - Spaces index (active space, metadata)
 *   default/
 *     .filegraph/
 *       _layout_.json     - Node positions, dimensions, edges
 *       archive/          - Soft-deleted nodes
 *         _manifest_.json
 *     welcome.note        - Node files live at space root
 *     todo.sticky
 *   snake-game/
 *     .filegraph/
 *       _layout_.json
 *       archive/
 *     index.html          - Project files coexist with node files
 *     game.js
 */
export const HOME_PATHS = {
  /** Root spaces directory (relative to user home) */
  ROOT: '.filegraph/@spaces',
  /** Legacy root (for migration detection) */
  LEGACY_ROOT: '.filegraph/@home',
  /** Spaces index file name */
  SPACES_INDEX: '_index_.json',
  /** Canvas metadata subdirectory inside each space */
  LAYOUT_DIR: '.filegraph',
  /** Layout file name */
  LAYOUT_FILE: '_layout_.json',
  /** Archive subdirectory (inside .filegraph/) */
  ARCHIVE_DIR: '.filegraph/archive',
  /** Archive manifest file name */
  ARCHIVE_MANIFEST: '_manifest_.json',
} as const

/**
 * Default archive retention period in days
 */
export const DEFAULT_ARCHIVE_RETENTION_DAYS = 30

// ─────────────────────────────────────────────────────────────────────────────
// Default Content Templates
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Default content for new rich text notes
 */
export const DEFAULT_NOTE_CONTENT = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [],
    },
  ],
}

/**
 * Default content for new sticky notes
 */
export const DEFAULT_STICKY_CONTENT: StickyNoteContent = {
  text: '',
  color: 'yellow',
}

/**
 * Default content for new tables
 */
export const DEFAULT_TABLE_CONTENT: TableContent = {
  headers: ['Column 1', 'Column 2', 'Column 3'],
  rows: [
    ['', '', ''],
    ['', '', ''],
  ],
}

/**
 * Available sticky note colors
 */
export const STICKY_COLORS = ['yellow', 'pink', 'blue', 'green', 'purple', 'orange'] as const
export type StickyColor = (typeof STICKY_COLORS)[number]

/**
 * Default content for new web embeds
 */
export const DEFAULT_WEB_CONTENT: WebEmbedContent = {
  url: '',
  title: 'Web',
}

/**
 * Default content for new agent chat nodes
 */
export const DEFAULT_AGENT_CHAT_CONTENT: AgentChatContent = {
  title: 'Chat',
  messages: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

/**
 * Default layout for a fresh home canvas
 */
export const DEFAULT_HOME_LAYOUT: HomeCanvasLayout = {
  version: 1,
  viewport: { x: 0, y: 0, zoom: 1 },
  nodes: [],
  edges: [],
}

// ─────────────────────────────────────────────────────────────────────────────
// Group Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Group of nodes on the canvas
 */
export interface Group {
  id: string
  label: string
  nodeIds: string[]
  color?: string
  createdAt: string
}

/**
 * Available group colors for visual distinction
 */
export const GROUP_COLORS = ['violet', 'blue', 'green', 'orange', 'red', 'pink', 'cyan', 'yellow'] as const

export type GroupColor = (typeof GROUP_COLORS)[number]
