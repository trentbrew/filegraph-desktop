/**
 * Link Indexer - Vault-wide reference indexing service
 * RFC-001: docs/architecture/RFC-001-Universal-Linking.md
 *
 * Integrates link parsing with the TQL EAV store for:
 * - Full vault indexing on startup
 * - Incremental updates on file changes
 * - Backlink queries
 */

import { invoke } from '@tauri-apps/api/core'
import type { EAVStore, Link } from '../tql/eav-store'
import {
  parseFile,
  isSupportedFileType,
  createEmptyIndex,
  addFileToIndex,
  removeFileFromIndex,
  getBacklinks,
  getOutgoingLinks,
  findBrokenReferences,
  getIndexStats,
  type ParsedReference,
  type ReferenceIndex,
} from './linkParser'

// ============================================================================
// Types
// ============================================================================

export interface LinkIndexerStats {
  totalReferences: number
  uniqueTargets: number
  sourceFiles: number
  brokenReferences: number
  indexedAt: Date
}

export interface LinkIndexerOptions {
  /** EAV store to persist links to */
  store?: EAVStore
  /** Callback for progress updates */
  onProgress?: (progress: IndexProgress) => void
  /** Whether to include hidden files */
  includeHidden?: boolean
}

export interface IndexProgress {
  phase: 'scanning' | 'parsing' | 'indexing'
  processed: number
  total: number
  currentFile?: string
}

// ============================================================================
// Link Indexer Class
// ============================================================================

export class LinkIndexer {
  private index: ReferenceIndex
  private store: EAVStore | null = null
  private vaultPath: string | null = null
  private knownEntityIds: Set<string> = new Set()
  private onProgress: ((progress: IndexProgress) => void) | null = null
  private includeHidden: boolean = false

  constructor(options: LinkIndexerOptions = {}) {
    this.index = createEmptyIndex()
    this.store = options.store || null
    this.onProgress = options.onProgress || null
    this.includeHidden = options.includeHidden || false
  }

  /**
   * Set the EAV store for persistence
   */
  setStore(store: EAVStore): void {
    this.store = store
  }

  /**
   * Register known entity IDs (for broken reference detection)
   */
  registerEntityIds(ids: Iterable<string>): void {
    for (const id of ids) {
      this.knownEntityIds.add(id)
    }
  }

  /**
   * Clear registered entity IDs
   */
  clearEntityIds(): void {
    this.knownEntityIds.clear()
  }

  /**
   * Index the entire vault
   */
  async indexVault(vaultPath: string): Promise<LinkIndexerStats> {
    this.vaultPath = vaultPath
    this.index = createEmptyIndex()

    // Phase 1: Discover all supported files
    this.emitProgress({ phase: 'scanning', processed: 0, total: 0 })
    const files = await this.discoverFiles(vaultPath)

    // Phase 2: Parse each file
    const total = files.length
    for (let i = 0; i < files.length; i++) {
      const filePath = files[i]
      this.emitProgress({
        phase: 'parsing',
        processed: i + 1,
        total,
        currentFile: this.getRelativePath(filePath),
      })

      await this.indexFile(filePath)
    }

    // Phase 3: Sync to EAV store
    this.emitProgress({ phase: 'indexing', processed: total, total })
    this.syncToStore()

    this.index.indexedAt = new Date()
    return this.getStats()
  }

  /**
   * Index a single file (for incremental updates)
   */
  async indexFile(filePath: string): Promise<ParsedReference[]> {
    if (!isSupportedFileType(filePath)) {
      return []
    }

    try {
      const response = await invoke<{ content: string }>('read_text_file', { filePath })
      const content = response.content
      const refs = parseFile(filePath, content)
      addFileToIndex(this.index, filePath, refs)

      // Also register any entity IDs found in this file
      this.extractAndRegisterEntityIds(content, filePath)

      return refs
    } catch (e) {
      console.warn(`[LinkIndexer] Failed to index file: ${filePath}`, e)
      return []
    }
  }

  /**
   * Handle file modification (update index)
   */
  async onFileModified(filePath: string): Promise<void> {
    if (!isSupportedFileType(filePath)) {
      return
    }

    // Remove old references and re-index
    removeFileFromIndex(this.index, filePath)
    await this.indexFile(filePath)
    this.syncFileToStore(filePath)
  }

  /**
   * Handle file deletion
   */
  onFileDeleted(filePath: string): void {
    removeFileFromIndex(this.index, filePath)
    this.removeFileFromStore(filePath)
  }

  /**
   * Handle file creation
   */
  async onFileCreated(filePath: string): Promise<void> {
    await this.indexFile(filePath)
    this.syncFileToStore(filePath)
  }

  /**
   * Get all references pointing to a target
   */
  getBacklinks(targetId: string): ParsedReference[] {
    return getBacklinks(this.index, targetId)
  }

  /**
   * Get all references from a source file
   */
  getOutgoingLinks(sourceFile: string): ParsedReference[] {
    return getOutgoingLinks(this.index, sourceFile)
  }

  /**
   * Find all broken references in the vault
   */
  getBrokenReferences(): ParsedReference[] {
    return findBrokenReferences(this.index, this.knownEntityIds)
  }

  /**
   * Get statistics about the index
   */
  getStats(): LinkIndexerStats {
    const stats = getIndexStats(this.index)
    const broken = this.getBrokenReferences()

    return {
      totalReferences: stats.totalReferences,
      uniqueTargets: stats.uniqueTargets,
      sourceFiles: stats.sourceFiles,
      brokenReferences: broken.length,
      indexedAt: stats.indexedAt,
    }
  }

  /**
   * Get the raw reference index
   */
  getIndex(): ReferenceIndex {
    return this.index
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private emitProgress(progress: IndexProgress): void {
    this.onProgress?.(progress)
  }

  private getRelativePath(absolutePath: string): string {
    if (this.vaultPath && absolutePath.startsWith(this.vaultPath)) {
      return absolutePath.slice(this.vaultPath.length + 1)
    }
    return absolutePath
  }

  /**
   * Discover all supported files in the vault
   */
  private async discoverFiles(dirPath: string): Promise<string[]> {
    const files: string[] = []

    try {
      const items = await invoke<{ name: string; path: string; file_type: string }[]>('list_directory', {
        path: dirPath,
      })

      for (const item of items) {
        // Skip hidden files unless configured otherwise
        if (!this.includeHidden && item.name.startsWith('.')) {
          continue
        }

        if (item.file_type === 'folder') {
          // Recursively scan subdirectories
          const subFiles = await this.discoverFiles(item.path)
          files.push(...subFiles)
        } else if (isSupportedFileType(item.path)) {
          files.push(item.path)
        }
      }
    } catch (e) {
      console.warn(`[LinkIndexer] Failed to list directory: ${dirPath}`, e)
    }

    return files
  }

  /**
   * Extract entity IDs from a file and register them
   * This is used for broken reference detection
   */
  private extractAndRegisterEntityIds(content: string, filePath: string): void {
    const ext = filePath.split('.').pop()?.toLowerCase()

    if (ext === 'data') {
      try {
        const doc = JSON.parse(content)
        this.extractEntityIdsFromDoc(doc)
      } catch {
        // Ignore parse errors
      }
    }
  }

  private extractEntityIdsFromDoc(obj: unknown): void {
    if (obj === null || obj === undefined) return

    if (typeof obj === 'object') {
      if (Array.isArray(obj)) {
        for (const item of obj) {
          this.extractEntityIdsFromDoc(item)
        }
      } else {
        const record = obj as Record<string, unknown>
        // Register the id field if it matches entity ID pattern
        if (typeof record.id === 'string' && /^[a-z]+:[a-z0-9-]+:\d{3}$/i.test(record.id)) {
          this.knownEntityIds.add(record.id)
        }
        // Recurse into nested objects
        for (const value of Object.values(record)) {
          this.extractEntityIdsFromDoc(value)
        }
      }
    }
  }

  /**
   * Sync all references to the EAV store
   */
  private syncToStore(): void {
    if (!this.store) return

    const links: Link[] = []

    for (const [sourceFile, refs] of this.index.bySourceFile) {
      for (const ref of refs) {
        links.push({
          e1: sourceFile,
          a: ref.linkType,
          e2: ref.targetId,
        })
      }
    }

    this.store.addLinks(links)
  }

  /**
   * Sync references from a single file to the store
   */
  private syncFileToStore(filePath: string): void {
    if (!this.store) return

    // Remove old links first (for incremental updates)
    this.store.removeLinksFromSource(filePath)

    // Add new links
    const refs = this.index.bySourceFile.get(filePath) || []
    const links: Link[] = refs.map((ref) => ({
      e1: filePath,
      a: ref.linkType,
      e2: ref.targetId,
    }))

    if (links.length > 0) {
      this.store.addLinks(links)
    }
  }

  /**
   * Remove references from a file from the store
   */
  private removeFileFromStore(filePath: string): void {
    if (!this.store) return
    this.store.removeLinksFromSource(filePath)
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let _linkIndexer: LinkIndexer | null = null

/**
 * Get the global link indexer instance
 */
export function getLinkIndexer(options?: LinkIndexerOptions): LinkIndexer {
  if (!_linkIndexer) {
    _linkIndexer = new LinkIndexer(options)
  }
  return _linkIndexer
}

/**
 * Reset the global link indexer (for testing)
 */
export function resetLinkIndexer(): void {
  _linkIndexer = null
}
