/**
 * Home Canvas Utilities
 *
 * File operations for managing home canvas nodes and layout
 */

import { invoke } from '@tauri-apps/api/core'
import { homeDir, join } from '@tauri-apps/api/path'
import {
  HOME_PATHS,
  DEFAULT_HOME_LAYOUT,
  DEFAULT_NOTE_CONTENT,
  DEFAULT_STICKY_CONTENT,
  DEFAULT_WEB_CONTENT,
  DEFAULT_TABLE_CONTENT,
  DEFAULT_AGENT_CHAT_CONTENT,
  DEFAULT_ARCHIVE_RETENTION_DAYS,
  NODE_TYPE_TO_EXTENSION,
  EXTENSION_TO_NODE_TYPE,
  type HomeCanvasLayout,
  type NodeLayout,
  type StickyNoteContent,
  type WebEmbedContent,
  type AgentChatContent,
  type ArchiveManifest,
  type ArchivedNode,
} from './types'

// ─────────────────────────────────────────────────────────────────────────────
// Path Utilities
// ─────────────────────────────────────────────────────────────────────────────

let cachedSpacesRoot: string | null = null
let cachedLegacyRoot: string | null = null

/**
 * Get the absolute path to the spaces root directory (~/.filegraph/@spaces/)
 */
export async function getHomeCanvasPath(): Promise<string> {
  if (cachedSpacesRoot) return cachedSpacesRoot

  const home = await homeDir()
  cachedSpacesRoot = await join(home, HOME_PATHS.ROOT)
  return cachedSpacesRoot
}

/**
 * Get the absolute path to the legacy home directory (~/.filegraph/@home/)
 */
export async function getLegacyHomePath(): Promise<string> {
  if (cachedLegacyRoot) return cachedLegacyRoot

  const home = await homeDir()
  cachedLegacyRoot = await join(home, HOME_PATHS.LEGACY_ROOT)
  return cachedLegacyRoot
}

/**
 * Get the path to the layout file (legacy — prefer getSpaceLayoutPath)
 */
export async function getLayoutPath(): Promise<string> {
  const spacePath = await getSpacePath('default')
  return await join(spacePath, HOME_PATHS.LAYOUT_DIR, HOME_PATHS.LAYOUT_FILE)
}

/**
 * Get the path to the nodes directory (legacy — now returns space root)
 */
export async function getNodesPath(): Promise<string> {
  return await getSpacePath('default')
}

/**
 * Get the path to the archive directory (legacy — prefer getSpaceArchivePath)
 */
export async function getArchivePath(): Promise<string> {
  return await getSpaceArchivePath('default')
}

/**
 * Get the path to a specific node file in the default space
 */
export async function getNodeFilePath(fileName: string): Promise<string> {
  const spacePath = await getSpacePath('default')
  return await join(spacePath, fileName)
}

// ─────────────────────────────────────────────────────────────────────────────
// Directory Initialization
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Ensure the spaces root directory exists
 */
export async function ensureHomeDirectories(): Promise<void> {
  const spacesRoot = await getHomeCanvasPath()

  try {
    await invoke('create_directory', { path: spacesRoot })
  } catch (err) {
    console.debug(`[HomeCanvas] Directory check for ${spacesRoot}:`, err)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Layout Operations
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Read the home canvas layout
 */
export async function readLayout(): Promise<HomeCanvasLayout> {
  const layoutPath = await getLayoutPath()

  try {
    const result = await invoke<{ content: string }>('read_text_file', {
      filePath: layoutPath,
      maxBytes: 1024 * 1024, // 1MB limit
    })

    if (result?.content?.trim()) {
      const parsed = JSON.parse(result.content) as HomeCanvasLayout
      // Validate version
      if (parsed.version !== 1) {
        console.warn('[HomeCanvas] Unknown layout version, using default')
        return { ...DEFAULT_HOME_LAYOUT }
      }
      return parsed
    }
  } catch (err) {
    console.debug('[HomeCanvas] Layout file not found or invalid, creating default:', err)
  }

  return { ...DEFAULT_HOME_LAYOUT }
}

/**
 * Write the home canvas layout
 */
export async function writeLayout(layout: HomeCanvasLayout): Promise<void> {
  await ensureHomeDirectories()
  const layoutPath = await getLayoutPath()

  const content = JSON.stringify(
    {
      ...layout,
      updatedAt: new Date().toISOString(),
    },
    null,
    2,
  )

  await invoke('write_text_file', {
    filePath: layoutPath,
    content,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Node File Operations
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate a unique node file name
 */
export function generateNodeFileName(nodeType: string, label?: string): string {
  const extension = NODE_TYPE_TO_EXTENSION[nodeType]
  if (!extension) {
    throw new Error(`Unknown node type: ${nodeType}`)
  }

  // Sanitize label for filename
  const sanitizedLabel = (label || nodeType)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 32)

  const timestamp = Date.now()
  return `${sanitizedLabel}-${timestamp}${extension}`
}

/**
 * Get the node type from a file path/extension
 */
export function getNodeTypeFromFile(filePath: string): string | null {
  const ext = filePath.substring(filePath.lastIndexOf('.'))
  return EXTENSION_TO_NODE_TYPE[ext] || null
}

/**
 * Create a new node file with default content
 */
export async function createNodeFile(nodeType: string, fileName: string, initialContent?: unknown): Promise<string> {
  await ensureHomeDirectories()
  const filePath = await getNodeFilePath(fileName)

  let content: string

  switch (nodeType) {
    case 'richText':
      content = JSON.stringify(initialContent || DEFAULT_NOTE_CONTENT, null, 2)
      break
    case 'stickyNote':
      content = JSON.stringify(initialContent || DEFAULT_STICKY_CONTENT, null, 2)
      break
    case 'embed':
      content = JSON.stringify(initialContent || DEFAULT_WEB_CONTENT, null, 2)
      break
    case 'youtube':
      content = JSON.stringify(
        initialContent || { ...DEFAULT_WEB_CONTENT, title: 'YouTube', provider: 'youtube' },
        null,
        2,
      )
      break
    case 'widget':
      content = JSON.stringify(initialContent || { type: 'custom' }, null, 2)
      break
    case 'table': {
      // Table nodes use CSV format
      const tableData = (initialContent as { headers?: string[]; rows?: string[][] }) || DEFAULT_TABLE_CONTENT
      const headers = tableData.headers || DEFAULT_TABLE_CONTENT.headers
      const rows = tableData.rows || DEFAULT_TABLE_CONTENT.rows
      const escapeField = (field: string): string => {
        if (field.includes(',') || field.includes('"') || field.includes('\n')) {
          return `"${field.replace(/"/g, '""')}"`
        }
        return field
      }
      const headerLine = headers.map(escapeField).join(',')
      const dataLines = rows.map((row) => row.map(escapeField).join(','))
      content = [headerLine, ...dataLines].join('\n')
      break
    }
    case 'agent':
      content = JSON.stringify(
        initialContent || {
          ...DEFAULT_AGENT_CHAT_CONTENT,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        null,
        2,
      )
      break
    default:
      throw new Error(`Cannot create node file for type: ${nodeType}`)
  }

  await invoke('write_text_file', {
    filePath,
    content,
  })

  return filePath
}

/**
 * Read a node file's content
 */
export async function readNodeFile<T = unknown>(filePath: string): Promise<T | null> {
  try {
    const result = await invoke<{ content: string }>('read_text_file', {
      filePath,
      maxBytes: 5 * 1024 * 1024, // 5MB limit
    })

    if (result?.content?.trim()) {
      return JSON.parse(result.content) as T
    }
  } catch (err) {
    console.error('[HomeCanvas] Failed to read node file:', filePath, err)
  }

  return null
}

/**
 * Write content to a node file
 */
export async function writeNodeFile(filePath: string, content: unknown): Promise<void> {
  const contentStr = typeof content === 'string' ? content : JSON.stringify(content, null, 2)

  await invoke('write_text_file', {
    filePath,
    content: contentStr,
  })
}

/**
 * Check if a file path is within the home canvas nodes directory
 */
export async function isHomeNodeFile(filePath: string): Promise<boolean> {
  const nodesPath = await getNodesPath()
  return filePath.startsWith(nodesPath)
}

// ─────────────────────────────────────────────────────────────────────────────
// Archive Operations
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Read the archive manifest
 */
async function readArchiveManifest(): Promise<ArchiveManifest> {
  const archivePath = await getArchivePath()
  const manifestPath = await join(archivePath, HOME_PATHS.ARCHIVE_MANIFEST)

  try {
    const result = await invoke<{ content: string }>('read_text_file', {
      filePath: manifestPath,
      maxBytes: 1024 * 1024,
    })

    if (result?.content?.trim()) {
      return JSON.parse(result.content) as ArchiveManifest
    }
  } catch {
    // Manifest doesn't exist yet
  }

  return { version: 1, nodes: [] }
}

/**
 * Write the archive manifest
 */
async function writeArchiveManifest(manifest: ArchiveManifest): Promise<void> {
  const archivePath = await getArchivePath()
  const manifestPath = await join(archivePath, HOME_PATHS.ARCHIVE_MANIFEST)

  await invoke('write_text_file', {
    filePath: manifestPath,
    content: JSON.stringify(manifest, null, 2),
  })
}

/**
 * Archive a node (soft delete)
 */
export async function archiveNode(
  nodeId: string,
  filePath: string,
  retentionDays: number = DEFAULT_ARCHIVE_RETENTION_DAYS,
): Promise<void> {
  await ensureHomeDirectories()

  const archivePath = await getArchivePath()
  const fileName = filePath.substring(filePath.lastIndexOf('/') + 1)
  const archiveFilePath = await join(archivePath, `${Date.now()}-${fileName}`)

  // Move file to archive using move_items
  try {
    await invoke('move_items', {
      sourcePaths: [filePath],
      destinationPath: archivePath,
    })
    // Rename to include timestamp
    const movedPath = await join(archivePath, fileName)
    // Read, write with new name, delete old
    const content = await invoke<{ content: string }>('read_text_file', {
      filePath: movedPath,
      maxBytes: 10 * 1024 * 1024,
    })
    if (content?.content) {
      await invoke('write_text_file', {
        filePath: archiveFilePath,
        content: content.content,
      })
      await invoke('delete_item', { path: movedPath })
    }
  } catch (err) {
    console.error('[HomeCanvas] Failed to move file to archive:', err)
    // If move fails, try copy + delete
    try {
      const content = await invoke<{ content: string }>('read_text_file', {
        filePath,
        maxBytes: 10 * 1024 * 1024,
      })
      if (content?.content) {
        await invoke('write_text_file', {
          filePath: archiveFilePath,
          content: content.content,
        })
        await invoke('delete_item', { path: filePath })
      }
    } catch (copyErr) {
      console.error('[HomeCanvas] Failed to copy file to archive:', copyErr)
      throw copyErr
    }
  }

  // Update manifest
  const manifest = await readArchiveManifest()
  const now = new Date()
  const expiresAt = new Date(now.getTime() + retentionDays * 24 * 60 * 60 * 1000)

  manifest.nodes.push({
    id: nodeId,
    originalPath: filePath,
    archivePath: archiveFilePath,
    archivedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  })

  await writeArchiveManifest(manifest)
}

/**
 * Restore a node from archive
 */
export async function restoreNode(archivedNodeId: string): Promise<ArchivedNode | null> {
  const manifest = await readArchiveManifest()
  const nodeIndex = manifest.nodes.findIndex((n) => n.id === archivedNodeId)

  if (nodeIndex === -1) {
    console.warn('[HomeCanvas] Archived node not found:', archivedNodeId)
    return null
  }

  const archivedNode = manifest.nodes[nodeIndex]

  // Restore file from archive using copy + delete
  try {
    const content = await invoke<{ content: string }>('read_text_file', {
      filePath: archivedNode.archivePath,
      maxBytes: 10 * 1024 * 1024,
    })
    if (content?.content) {
      await invoke('write_text_file', {
        filePath: archivedNode.originalPath,
        content: content.content,
      })
      await invoke('delete_item', { path: archivedNode.archivePath })
    }
  } catch (err) {
    console.error('[HomeCanvas] Failed to restore file from archive:', err)
    throw err
  }

  // Remove from manifest
  manifest.nodes.splice(nodeIndex, 1)
  await writeArchiveManifest(manifest)

  return archivedNode
}

/**
 * Permanently delete expired archived nodes
 */
export async function cleanupExpiredArchive(): Promise<number> {
  const manifest = await readArchiveManifest()
  const now = new Date()
  let deletedCount = 0

  const remaining: ArchivedNode[] = []

  for (const node of manifest.nodes) {
    if (node.expiresAt && new Date(node.expiresAt) <= now) {
      // Delete the archived file
      try {
        await invoke('delete_item', { path: node.archivePath })
        deletedCount++
      } catch (err) {
        console.error('[HomeCanvas] Failed to delete expired archive:', node.archivePath, err)
        remaining.push(node) // Keep in manifest if delete fails
      }
    } else {
      remaining.push(node)
    }
  }

  if (deletedCount > 0) {
    manifest.nodes = remaining
    await writeArchiveManifest(manifest)
  }

  return deletedCount
}

/**
 * List all archived nodes
 */
export async function listArchivedNodes(): Promise<ArchivedNode[]> {
  const manifest = await readArchiveManifest()
  return manifest.nodes
}

// ─────────────────────────────────────────────────────────────────────────────
// Conversion Utilities
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convert a NodeLayout to a ReactFlow node
 */
export function layoutToReactFlowNode(layout: NodeLayout): {
  id: string
  type: string
  position: { x: number; y: number }
  style?: { width?: number; height?: number }
  data: Record<string, unknown>
  zIndex?: number
  parentId?: string
} {
  // File-backed node
  if (layout.file) {
    const nodeType = layout.type || getNodeTypeFromFile(layout.file) || 'filePreview'
    const fileName = layout.file.substring(layout.file.lastIndexOf('/') + 1)
    const label = fileName
      .replace(/\.[^.]+$/, '')
      .replace(/-\d+$/, '')
      .replace(/-/g, ' ')

    // Use saved dimensions, with fallback for table nodes that had none
    const style =
      nodeType === 'table' && (!layout.dimensions.width || !layout.dimensions.height)
        ? { width: 400, height: 300 }
        : {
            width: layout.dimensions.width,
            height: layout.dimensions.height,
          }

    return {
      id: layout.id,
      type: nodeType,
      position: layout.position,
      style,
      data: {
        file: layout.file,
        label: label.charAt(0).toUpperCase() + label.slice(1),
      },
      ...(layout.zIndex !== undefined && { zIndex: layout.zIndex }),
      ...(layout.parentId && { parentId: layout.parentId }),
    }
  }

  // Non-file-backed node (inline data)
  const nodeType = layout.type || 'default'

  // Use saved dimensions, with fallback for table nodes that had none
  const style =
    nodeType === 'table' && (!layout.dimensions.width || !layout.dimensions.height)
      ? { width: 400, height: 300 }
      : {
          width: layout.dimensions.width,
          height: layout.dimensions.height,
        }

  return {
    id: layout.id,
    type: nodeType,
    position: layout.position,
    style,
    data: layout.data || {},
    ...(layout.zIndex !== undefined && { zIndex: layout.zIndex }),
    ...(layout.parentId && { parentId: layout.parentId }),
  }
}

/**
 * Convert a ReactFlow node to a NodeLayout
 */
export function reactFlowNodeToLayout(node: {
  id: string
  type?: string
  position: { x: number; y: number }
  style?: { width?: number; height?: number }
  measured?: { width?: number; height?: number }
  data?: Record<string, unknown>
  zIndex?: number
  parentId?: string
}): NodeLayout {
  const file = node.data?.file as string | undefined

  const measured = node.measured as { width?: number; height?: number } | undefined

  // For file-backed nodes, only store the file reference
  // For non-file-backed nodes, store type and full data
  const baseLayout: NodeLayout = {
    id: node.id,
    position: node.position,
    dimensions: {
      width: (node.style?.width as number) || measured?.width || 300,
      height: (node.style?.height as number) || measured?.height || 200,
    },
    ...(node.zIndex !== undefined && { zIndex: node.zIndex }),
    ...(node.parentId && { parentId: node.parentId }),
  }

  if (file) {
    // File-backed node
    if (file.endsWith('.web') && node.type) {
      return { ...baseLayout, file, type: node.type }
    }

    return { ...baseLayout, file }
  } else {
    // Non-file-backed node - store type and data inline
    const { isMaximized, ...persistedData } = (node.data || {}) as Record<string, unknown>
    return {
      ...baseLayout,
      type: node.type,
      data: persistedData,
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Space Management
// ─────────────────────────────────────────────────────────────────────────────

import type { SpacesIndex, SpaceMetadata } from './types'

/**
 * Get the path to the spaces index file
 * New location: ~/.filegraph/@spaces/_index_.json
 */
export async function getSpacesIndexPath(): Promise<string> {
  const spacesRoot = await getHomeCanvasPath()
  return await join(spacesRoot, HOME_PATHS.SPACES_INDEX)
}

/**
 * Get the path to a specific space directory
 * New location: ~/.filegraph/@spaces/{spaceId}/
 */
export async function getSpacePath(spaceId: string): Promise<string> {
  const spacesRoot = await getHomeCanvasPath()
  return await join(spacesRoot, spaceId)
}

/**
 * Get the path to a space's layout file
 * New location: ~/.filegraph/@spaces/{spaceId}/.filegraph/_layout_.json
 */
export async function getSpaceLayoutPath(spaceId: string): Promise<string> {
  const spacePath = await getSpacePath(spaceId)
  return await join(spacePath, HOME_PATHS.LAYOUT_DIR, HOME_PATHS.LAYOUT_FILE)
}

/**
 * Get the path to a space's root (where node files live)
 * In the new structure, node files live at the space root — no nodes/ subdirectory
 */
export async function getSpaceNodesPath(spaceId: string): Promise<string> {
  return await getSpacePath(spaceId)
}

/**
 * Get the path to a space's archive directory
 * New location: ~/.filegraph/@spaces/{spaceId}/.filegraph/archive/
 */
export async function getSpaceArchivePath(spaceId: string): Promise<string> {
  const spacePath = await getSpacePath(spaceId)
  return await join(spacePath, HOME_PATHS.ARCHIVE_DIR)
}

/**
 * Read the spaces index
 */
export async function readSpacesIndex(): Promise<SpacesIndex> {
  const indexPath = await getSpacesIndexPath()

  try {
    const result = await invoke<{ content: string }>('read_text_file', {
      filePath: indexPath,
      maxBytes: 1024 * 1024,
    })

    if (result?.content?.trim()) {
      const parsed = JSON.parse(result.content) as SpacesIndex
      if (parsed.version !== 1) {
        console.warn('[HomeCanvas] Unknown spaces index version, creating default')
        return createDefaultSpacesIndex()
      }
      return parsed
    }
  } catch (err) {
    console.debug('[HomeCanvas] Spaces index not found, creating default:', err)
  }

  return createDefaultSpacesIndex()
}

/**
 * Write the spaces index
 */
export async function writeSpacesIndex(index: SpacesIndex): Promise<void> {
  // Ensure spaces root exists
  const spacesRoot = await getHomeCanvasPath()
  try {
    await invoke('create_directory', { path: spacesRoot })
  } catch {
    // Already exists
  }

  const indexPath = await getSpacesIndexPath()
  const content = JSON.stringify(index, null, 2)

  await invoke('write_text_file', {
    filePath: indexPath,
    content,
  })
}

/**
 * Create a default spaces index with a single "default" space
 */
function createDefaultSpacesIndex(): SpacesIndex {
  const now = new Date().toISOString()
  return {
    version: 1,
    activeSpaceId: 'default',
    spaces: [
      {
        id: 'default',
        name: 'Default',
        createdAt: now,
        updatedAt: now,
        nodeCount: 0,
        edgeCount: 0,
      },
    ],
  }
}

/**
 * Ensure a space directory structure exists
 * Creates: {spaceRoot}/ and {spaceRoot}/.filegraph/ and {spaceRoot}/.filegraph/archive/
 */
export async function ensureSpaceDirectories(spaceId: string): Promise<void> {
  const spacePath = await getSpacePath(spaceId)
  const metadataDir = await join(spacePath, HOME_PATHS.LAYOUT_DIR)
  const archivePath = await getSpaceArchivePath(spaceId)

  for (const dir of [spacePath, metadataDir, archivePath]) {
    try {
      await invoke('create_directory', { path: dir })
    } catch (err) {
      console.debug(`[HomeCanvas] Directory check for ${dir}:`, err)
    }
  }
}

/**
 * Read a space's layout
 */
export async function readSpaceLayout(spaceId: string): Promise<HomeCanvasLayout> {
  const layoutPath = await getSpaceLayoutPath(spaceId)

  try {
    const result = await invoke<{ content: string }>('read_text_file', {
      filePath: layoutPath,
      maxBytes: 1024 * 1024,
    })

    if (result?.content?.trim()) {
      const parsed = JSON.parse(result.content) as HomeCanvasLayout
      if (parsed.version !== 1) {
        console.warn('[HomeCanvas] Unknown layout version, using default')
        return { ...DEFAULT_HOME_LAYOUT }
      }
      return parsed
    }
  } catch (err) {
    console.debug('[HomeCanvas] Layout file not found for space, creating default:', err)
  }

  return { ...DEFAULT_HOME_LAYOUT }
}

/**
 * Write a space's layout
 */
export async function writeSpaceLayout(spaceId: string, layout: HomeCanvasLayout): Promise<void> {
  await ensureSpaceDirectories(spaceId)
  const layoutPath = await getSpaceLayoutPath(spaceId)

  const content = JSON.stringify(
    {
      ...layout,
      updatedAt: new Date().toISOString(),
    },
    null,
    2,
  )

  await invoke('write_text_file', {
    filePath: layoutPath,
    content,
  })
}

/**
 * Create a new space
 */
export async function createSpace(name: string, icon?: string): Promise<SpaceMetadata> {
  const index = await readSpacesIndex()

  // Generate unique ID from name
  const id =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 32) || 'space'

  // Ensure uniqueness
  let uniqueId = id
  let counter = 1
  while (index.spaces.some((s) => s.id === uniqueId)) {
    uniqueId = `${id}-${counter}`
    counter++
  }

  const now = new Date().toISOString()
  const newSpace: SpaceMetadata = {
    id: uniqueId,
    name,
    icon,
    createdAt: now,
    updatedAt: now,
    nodeCount: 0,
    edgeCount: 0,
  }

  // Create space directories (root + .filegraph/ + .filegraph/archive/)
  await ensureSpaceDirectories(uniqueId)

  // Update index
  index.spaces.push(newSpace)
  await writeSpacesIndex(index)

  return newSpace
}

/**
 * Delete a space
 */
export async function deleteSpace(spaceId: string): Promise<void> {
  const index = await readSpacesIndex()

  if (index.spaces.length <= 1) {
    throw new Error('Cannot delete the last space')
  }

  if (index.activeSpaceId === spaceId) {
    throw new Error('Cannot delete the active space. Switch to another space first.')
  }

  index.spaces = index.spaces.filter((s) => s.id !== spaceId)
  await writeSpacesIndex(index)
}

/**
 * Update space metadata
 */
export async function updateSpaceMetadata(spaceId: string, updates: Partial<SpaceMetadata>): Promise<void> {
  const index = await readSpacesIndex()
  const space = index.spaces.find((s) => s.id === spaceId)

  if (!space) {
    throw new Error(`Space not found: ${spaceId}`)
  }

  Object.assign(space, updates, { updatedAt: new Date().toISOString() })
  await writeSpacesIndex(index)
}

// ─────────────────────────────────────────────────────────────────────────────
// Migration: @home/spaces/* → @spaces/*
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Migrate legacy spaces from @home/spaces/{id}/ to @spaces/{id}/
 *
 * For each space:
 * - Creates @spaces/{id}/.filegraph/
 * - Moves nodes/* files up to @spaces/{id}/ (space root)
 * - Moves _layout_.json → .filegraph/_layout_.json
 * - Moves archive/ → .filegraph/archive/
 *
 * Also migrates @home/nodes/* → @spaces/default/ (root-level default space files)
 * Converts @home/_spaces_.json → @spaces/_index_.json
 * Leaves @home/ intact as backup.
 */
export async function migrateFromLegacySpaces(): Promise<boolean> {
  const legacyRoot = await getLegacyHomePath()
  const newRoot = await getHomeCanvasPath()

  // Check if migration is needed
  const legacyIndexPath = await join(legacyRoot, '_spaces_.json')
  const newIndexPath = await join(newRoot, HOME_PATHS.SPACES_INDEX)

  let legacyIndexExists = false
  let newIndexExists = false

  try {
    await invoke<{ content: string }>('read_text_file', { filePath: legacyIndexPath, maxBytes: 1024 })
    legacyIndexExists = true
  } catch {
    // Legacy index doesn't exist
  }

  try {
    await invoke<{ content: string }>('read_text_file', { filePath: newIndexPath, maxBytes: 1024 })
    newIndexExists = true
  } catch {
    // New index doesn't exist
  }

  // If new index already exists, migration was already done
  if (newIndexExists) {
    console.debug('[Migration] @spaces/_index_.json exists, skipping migration')
    return false
  }

  // If legacy index doesn't exist either, nothing to migrate
  if (!legacyIndexExists) {
    console.debug('[Migration] No legacy _spaces_.json found, nothing to migrate')
    return false
  }

  console.log('[Migration] Starting migration from @home/ → @spaces/...')

  // Ensure new root exists
  try {
    await invoke('create_directory', { path: newRoot })
  } catch {
    // Already exists
  }

  // Read legacy spaces index
  let legacyIndex: SpacesIndex
  try {
    const result = await invoke<{ content: string }>('read_text_file', {
      filePath: legacyIndexPath,
      maxBytes: 1024 * 1024,
    })
    legacyIndex = JSON.parse(result.content) as SpacesIndex
  } catch (err) {
    console.error('[Migration] Failed to read legacy spaces index:', err)
    return false
  }

  // Helper: list files in a directory
  async function listFiles(dirPath: string): Promise<string[]> {
    try {
      const items = await invoke<Array<{ name: string; path: string; file_type: string }>>('list_files', {
        path: dirPath,
      })
      return items.map((item) => item.name)
    } catch {
      return []
    }
  }

  // Helper: copy file (read + write)
  async function copyFile(src: string, dst: string): Promise<void> {
    try {
      const result = await invoke<{ content: string }>('read_text_file', {
        filePath: src,
        maxBytes: 10 * 1024 * 1024,
      })
      if (result?.content !== undefined) {
        await invoke('write_text_file', { filePath: dst, content: result.content })
      }
    } catch (err) {
      console.warn(`[Migration] Failed to copy ${src} → ${dst}:`, err)
    }
  }

  // 1. Migrate each space from @home/spaces/{id}/ → @spaces/{id}/
  const legacySpacesDir = await join(legacyRoot, 'spaces')

  for (const space of legacyIndex.spaces) {
    const legacySpacePath = await join(legacySpacesDir, space.id)
    const newSpacePath = await join(newRoot, space.id)
    const newMetadataDir = await join(newSpacePath, HOME_PATHS.LAYOUT_DIR)
    const newArchiveDir = await join(newSpacePath, HOME_PATHS.ARCHIVE_DIR)

    console.log(`[Migration] Migrating space "${space.name}" (${space.id})...`)

    // Create new directories
    for (const dir of [newSpacePath, newMetadataDir, newArchiveDir]) {
      try {
        await invoke('create_directory', { path: dir })
      } catch {
        // Already exists
      }
    }

    // Move _layout_.json → .filegraph/_layout_.json
    const legacyLayoutPath = await join(legacySpacePath, '_layout_.json')
    const newLayoutPath = await join(newMetadataDir, HOME_PATHS.LAYOUT_FILE)
    await copyFile(legacyLayoutPath, newLayoutPath)

    // Move nodes/* up to space root
    const legacyNodesDir = await join(legacySpacePath, 'nodes')
    const nodeFiles = await listFiles(legacyNodesDir)
    for (const fileName of nodeFiles) {
      const src = await join(legacyNodesDir, fileName)
      const dst = await join(newSpacePath, fileName)
      await copyFile(src, dst)
    }

    // Move archive/* → .filegraph/archive/*
    const legacyArchiveDir = await join(legacySpacePath, 'archive')
    const archiveFiles = await listFiles(legacyArchiveDir)
    for (const fileName of archiveFiles) {
      const src = await join(legacyArchiveDir, fileName)
      const dst = await join(newArchiveDir, fileName)
      await copyFile(src, dst)
    }
  }

  // 2. Migrate @home/nodes/* → @spaces/default/
  // (The "default" space stored its nodes at @home/nodes/ root level)
  const legacyNodesRoot = await join(legacyRoot, 'nodes')
  const defaultSpacePath = await join(newRoot, 'default')
  const defaultMetadataDir = await join(defaultSpacePath, HOME_PATHS.LAYOUT_DIR)
  const defaultArchiveDir = await join(defaultSpacePath, HOME_PATHS.ARCHIVE_DIR)

  for (const dir of [defaultSpacePath, defaultMetadataDir, defaultArchiveDir]) {
    try {
      await invoke('create_directory', { path: dir })
    } catch {
      // Already exists
    }
  }

  const rootNodeFiles = await listFiles(legacyNodesRoot)
  for (const fileName of rootNodeFiles) {
    const src = await join(legacyNodesRoot, fileName)
    const dst = await join(defaultSpacePath, fileName)
    await copyFile(src, dst)
  }

  // Also migrate @home/archive/ → @spaces/default/.filegraph/archive/
  const legacyRootArchive = await join(legacyRoot, 'archive')
  const rootArchiveFiles = await listFiles(legacyRootArchive)
  for (const fileName of rootArchiveFiles) {
    const src = await join(legacyRootArchive, fileName)
    const dst = await join(defaultArchiveDir, fileName)
    await copyFile(src, dst)
  }

  // 3. Write new spaces index
  await writeSpacesIndex(legacyIndex)

  console.log(`[Migration] Complete. Migrated ${legacyIndex.spaces.length} spaces.`)
  return true
}
