/**
 * Link Resolver - Reference Target Resolution
 * RFC-001: docs/architecture/RFC-001-Universal-Linking.md
 *
 * Maps link targets to actual files/entities in the vault:
 * - Entity IDs → File containing the entity + entity data
 * - File paths → Validated absolute paths
 * - Wikilink slugs → Matching entity or file
 */

import { invoke } from '@tauri-apps/api/core'
import type { ParsedReference, ReferenceIndex } from './linkParser'
import { NAMESPACE_FILES } from '@/lib/namespaces'

// ============================================================================
// Types
// ============================================================================

/** Resolution result status */
export type ResolutionStatus = 'resolved' | 'not-found' | 'ambiguous' | 'error'

/** A successfully resolved reference */
export interface ResolvedReference {
  status: 'resolved'
  /** The original target being resolved */
  target: string
  /** Absolute path to the file containing the entity/target */
  filePath: string
  /** Relative path from vault root */
  relativePath: string
  /** For entity IDs: the entity data if found */
  entityData?: Record<string, unknown>
  /** For entity IDs: the array/collection the entity belongs to */
  collectionKey?: string
  /** For entity IDs: the index in the collection */
  collectionIndex?: number
}

/** A reference that couldn't be found */
export interface NotFoundReference {
  status: 'not-found'
  target: string
  /** Suggested files where this entity might belong */
  suggestions?: string[]
}

/** A reference with multiple possible matches */
export interface AmbiguousReference {
  status: 'ambiguous'
  target: string
  /** All possible matches */
  candidates: Array<{
    filePath: string
    relativePath: string
    entityData?: Record<string, unknown>
  }>
}

/** A resolution that failed with an error */
export interface ErrorReference {
  status: 'error'
  target: string
  error: string
}

export type ResolutionResult = ResolvedReference | NotFoundReference | AmbiguousReference | ErrorReference

/** Entity location in a file */
export interface EntityLocation {
  filePath: string
  relativePath: string
  collectionKey: string
  collectionIndex: number
  entityData: Record<string, unknown>
}

// ============================================================================
// Patterns & Constants
// ============================================================================

/** Entity ID pattern: namespace:slug:index */
const ENTITY_ID_PATTERN = /^([a-z]+):([a-z0-9-]+):(\d{3})$/i

/** File path pattern */
const FILE_PATH_PATTERN = /^[@.]?[\w\-./]+\.(data|note|md|canvas)$/

/**
 * Namespace Registry (RFC-002)
 * Re-exported from @/lib/namespaces for backwards compatibility.
 */
export const NAMESPACE_REGISTRY = NAMESPACE_FILES

/**
 * Get the canonical source file for an entity namespace.
 */
export function getEntitySourceFile(entityId: string): string | null {
  const namespace = entityId.split(':')[0]
  return NAMESPACE_FILES[namespace] ?? null
}

/** Legacy namespace to directory mapping (for fallback scanning) */
const NAMESPACE_DIRECTORIES: Record<string, string[]> = {
  // Primary: @entities/ namespace (RFC-002)
  person: ['@entities', '@people'],
  org: ['@entities', '@organizations'],
  proj: ['@entities', '@projects'],
  task: ['@entities', '@tasks'],
  ms: ['@entities', '@milestones'],
  note: ['@entities', '@notes'],
  canvas: ['@entities', '@canvases'],

  // Domain-specific namespaces
  acc: ['@finance'],
  tx: ['@finance'],
  bill: ['@finance'],
  goal: ['@finance'],
  inc: ['@finance'],
  ins: ['@finance'],
  exp: ['@finance'],
  tax: ['@finance'],

  // AI namespace
  agent: ['@ai'],
  persona: ['@ai'],
  prompt: ['@ai'],

  // Calendar namespace
  event: ['@calendar'],
  reminder: ['@calendar'],
}

// ============================================================================
// Link Resolver Class
// ============================================================================

export class LinkResolver {
  private vaultPath: string
  private entityIndex: Map<string, EntityLocation> = new Map()
  private fileIndex: Set<string> = new Set()

  constructor(vaultPath: string) {
    this.vaultPath = vaultPath
  }

  /**
   * Build the entity index from vault files
   * This should be called after the link parser has indexed the vault
   */
  async buildEntityIndex(): Promise<void> {
    this.entityIndex.clear()
    this.fileIndex.clear()

    await this.scanDirectory(this.vaultPath)
  }

  /**
   * Resolve a reference target to its file/entity location
   */
  async resolve(target: string): Promise<ResolutionResult> {
    // Normalize the target
    const normalizedTarget = this.normalizeTarget(target)

    try {
      // Try different resolution strategies in order

      // 1. Check if it's an entity ID
      if (ENTITY_ID_PATTERN.test(normalizedTarget)) {
        return await this.resolveEntityId(normalizedTarget)
      }

      // 2. Check if it's a file path
      if (FILE_PATH_PATTERN.test(normalizedTarget) || normalizedTarget.includes('/')) {
        return await this.resolveFilePath(normalizedTarget)
      }

      // 3. Try slug-based resolution (for wikilinks without namespace)
      return await this.resolveSlug(normalizedTarget)
    } catch (e) {
      return {
        status: 'error',
        target,
        error: e instanceof Error ? e.message : 'Unknown resolution error',
      }
    }
  }

  /**
   * Resolve multiple targets at once (for batch operations)
   */
  async resolveMany(targets: string[]): Promise<Map<string, ResolutionResult>> {
    const results = new Map<string, ResolutionResult>()

    for (const target of targets) {
      results.set(target, await this.resolve(target))
    }

    return results
  }

  /**
   * Check if a target can be resolved
   */
  async canResolve(target: string): Promise<boolean> {
    const result = await this.resolve(target)
    return result.status === 'resolved'
  }

  /**
   * Get suggestions for where a new entity should be created
   */
  getSuggestedLocation(entityId: string): string[] {
    const match = ENTITY_ID_PATTERN.exec(entityId)
    if (!match) return []

    const [, namespace] = match
    const directories = NAMESPACE_DIRECTORIES[namespace.toLowerCase()] || []

    return directories.map((dir) => {
      // Suggest a file name based on namespace
      const fileName = this.getDefaultFileName(namespace)
      return `${dir}/${fileName}`
    })
  }

  /**
   * Register an entity location (called during indexing)
   */
  registerEntity(entityId: string, location: EntityLocation): void {
    this.entityIndex.set(entityId, location)
  }

  /**
   * Register a file path (called during indexing)
   */
  registerFile(relativePath: string): void {
    this.fileIndex.add(relativePath)
  }

  /**
   * Get all registered entity IDs
   */
  getRegisteredEntityIds(): string[] {
    return Array.from(this.entityIndex.keys())
  }

  /**
   * Get entity location by ID
   */
  getEntityLocation(entityId: string): EntityLocation | undefined {
    return this.entityIndex.get(entityId)
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private normalizeTarget(target: string): string {
    // Remove wikilink brackets if present
    let normalized = target.replace(/^\[\[|\]\]$/g, '')

    // Remove display text (e.g., [[id|Display]] → id)
    if (normalized.includes('|')) {
      normalized = normalized.split('|')[0]
    }

    return normalized.trim()
  }

  /**
   * Resolve an entity ID (namespace:slug:index)
   */
  private async resolveEntityId(entityId: string): Promise<ResolutionResult> {
    // Check if we already have it indexed
    const location = this.entityIndex.get(entityId)
    if (location) {
      return {
        status: 'resolved',
        target: entityId,
        filePath: location.filePath,
        relativePath: location.relativePath,
        entityData: location.entityData,
        collectionKey: location.collectionKey,
        collectionIndex: location.collectionIndex,
      }
    }

    // Try to find it by scanning
    const found = await this.findEntityInVault(entityId)

    if (found.length === 0) {
      return {
        status: 'not-found',
        target: entityId,
        suggestions: this.getSuggestedLocation(entityId),
      }
    }

    if (found.length === 1) {
      const loc = found[0]
      // Cache for future lookups
      this.entityIndex.set(entityId, loc)

      return {
        status: 'resolved',
        target: entityId,
        filePath: loc.filePath,
        relativePath: loc.relativePath,
        entityData: loc.entityData,
        collectionKey: loc.collectionKey,
        collectionIndex: loc.collectionIndex,
      }
    }

    // Multiple matches - ambiguous
    return {
      status: 'ambiguous',
      target: entityId,
      candidates: found.map((loc) => ({
        filePath: loc.filePath,
        relativePath: loc.relativePath,
        entityData: loc.entityData,
      })),
    }
  }

  /**
   * Resolve a file path
   */
  private async resolveFilePath(path: string): Promise<ResolutionResult> {
    // Normalize the path
    let absolutePath: string
    let relativePath: string

    if (path.startsWith('@') || path.startsWith('./')) {
      relativePath = path.startsWith('@') ? path : path.slice(2)
      absolutePath = `${this.vaultPath}/${relativePath}`
    } else if (path.startsWith('/')) {
      absolutePath = path
      relativePath = path.startsWith(this.vaultPath) ? path.slice(this.vaultPath.length + 1) : path
    } else {
      relativePath = path
      absolutePath = `${this.vaultPath}/${path}`
    }

    // Check if file exists
    try {
      await invoke('file_exists', { path: absolutePath })
      return {
        status: 'resolved',
        target: path,
        filePath: absolutePath,
        relativePath,
      }
    } catch {
      // file_exists might not exist, try reading instead
      try {
        await invoke('read_text_file', { filePath: absolutePath })
        return {
          status: 'resolved',
          target: path,
          filePath: absolutePath,
          relativePath,
        }
      } catch {
        return {
          status: 'not-found',
          target: path,
        }
      }
    }
  }

  /**
   * Resolve a slug (for plain wikilinks like [[Sarah Johnson]])
   */
  private async resolveSlug(slug: string): Promise<ResolutionResult> {
    const normalizedSlug = this.slugify(slug)
    const candidates: EntityLocation[] = []

    // Search through indexed entities for matching slugs
    for (const [entityId, location] of this.entityIndex) {
      const entitySlug = this.extractSlugFromId(entityId)
      if (entitySlug && this.slugify(entitySlug) === normalizedSlug) {
        candidates.push(location)
      }

      // Also check entity data for name/title matches
      if (location.entityData) {
        const name = location.entityData.name || location.entityData.title || location.entityData.label
        if (typeof name === 'string' && this.slugify(name) === normalizedSlug) {
          if (!candidates.includes(location)) {
            candidates.push(location)
          }
        }
      }
    }

    // Also check for matching files
    for (const filePath of this.fileIndex) {
      const fileName =
        filePath
          .split('/')
          .pop()
          ?.replace(/\.[^.]+$/, '') || ''
      if (this.slugify(fileName) === normalizedSlug) {
        const absolutePath = `${this.vaultPath}/${filePath}`
        // Don't duplicate if already found as entity
        if (!candidates.some((c) => c.filePath === absolutePath)) {
          candidates.push({
            filePath: absolutePath,
            relativePath: filePath,
            collectionKey: '',
            collectionIndex: -1,
            entityData: {},
          })
        }
      }
    }

    if (candidates.length === 0) {
      return {
        status: 'not-found',
        target: slug,
      }
    }

    if (candidates.length === 1) {
      const loc = candidates[0]
      return {
        status: 'resolved',
        target: slug,
        filePath: loc.filePath,
        relativePath: loc.relativePath,
        entityData: loc.entityData,
        collectionKey: loc.collectionKey,
        collectionIndex: loc.collectionIndex,
      }
    }

    return {
      status: 'ambiguous',
      target: slug,
      candidates: candidates.map((loc) => ({
        filePath: loc.filePath,
        relativePath: loc.relativePath,
        entityData: loc.entityData,
      })),
    }
  }

  /**
   * Scan the vault directory and build indexes
   */
  private async scanDirectory(dirPath: string): Promise<void> {
    try {
      const items = await invoke<{ name: string; path: string; file_type: string }[]>('list_directory', {
        path: dirPath,
      })

      for (const item of items) {
        if (item.name.startsWith('.')) continue

        if (item.file_type === 'folder') {
          await this.scanDirectory(item.path)
        } else if (item.path.endsWith('.data')) {
          await this.indexDataFile(item.path)
        } else {
          // Register other file types for path resolution
          const relativePath = item.path.startsWith(this.vaultPath)
            ? item.path.slice(this.vaultPath.length + 1)
            : item.path
          this.fileIndex.add(relativePath)
        }
      }
    } catch (e) {
      console.warn(`[LinkResolver] Failed to scan directory: ${dirPath}`, e)
    }
  }

  /**
   * Index entities from a .data file
   */
  private async indexDataFile(filePath: string): Promise<void> {
    try {
      const response = await invoke<{ content: string }>('read_text_file', { filePath })
      const content = response.content
      const doc = JSON.parse(content)
      const relativePath = filePath.startsWith(this.vaultPath) ? filePath.slice(this.vaultPath.length + 1) : filePath

      // Register the file
      this.fileIndex.add(relativePath)

      // Find and index all entities
      this.indexEntitiesInDoc(doc, filePath, relativePath)
    } catch (e) {
      console.warn(`[LinkResolver] Failed to index data file: ${filePath}`, e)
    }
  }

  /**
   * Extract and index entities from a document
   */
  private indexEntitiesInDoc(doc: unknown, filePath: string, relativePath: string, currentKey: string = ''): void {
    if (Array.isArray(doc)) {
      doc.forEach((item, index) => {
        if (typeof item === 'object' && item !== null) {
          const record = item as Record<string, unknown>
          if (typeof record.id === 'string' && ENTITY_ID_PATTERN.test(record.id)) {
            this.entityIndex.set(record.id, {
              filePath,
              relativePath,
              collectionKey: currentKey,
              collectionIndex: index,
              entityData: record,
            })
          }
        }
      })
    } else if (typeof doc === 'object' && doc !== null) {
      const record = doc as Record<string, unknown>

      // Check if this object is an entity
      if (typeof record.id === 'string' && ENTITY_ID_PATTERN.test(record.id)) {
        this.entityIndex.set(record.id, {
          filePath,
          relativePath,
          collectionKey: currentKey,
          collectionIndex: -1,
          entityData: record,
        })
      }

      // Recurse into nested objects/arrays
      for (const [key, value] of Object.entries(record)) {
        if (key === '@context' || key === '@type') continue
        if (Array.isArray(value) || (typeof value === 'object' && value !== null)) {
          this.indexEntitiesInDoc(value, filePath, relativePath, key)
        }
      }
    }
  }

  /**
   * Find an entity by ID in the vault (fallback scan)
   */
  private async findEntityInVault(entityId: string): Promise<EntityLocation[]> {
    const results: EntityLocation[] = []

    // Extract namespace to narrow search
    const match = ENTITY_ID_PATTERN.exec(entityId)
    if (!match) return results

    const [, namespace] = match
    const directories = NAMESPACE_DIRECTORIES[namespace.toLowerCase()] || []

    // Search in suggested directories first
    for (const dir of directories) {
      const dirPath = `${this.vaultPath}/${dir}`
      const found = await this.searchDirectoryForEntity(dirPath, entityId)
      results.push(...found)
    }

    // If not found, search entire vault
    if (results.length === 0) {
      const found = await this.searchDirectoryForEntity(this.vaultPath, entityId)
      results.push(...found)
    }

    return results
  }

  /**
   * Search a directory for an entity
   */
  private async searchDirectoryForEntity(dirPath: string, entityId: string): Promise<EntityLocation[]> {
    const results: EntityLocation[] = []

    try {
      const items = await invoke<{ name: string; path: string; file_type: string }[]>('list_directory', {
        path: dirPath,
      })

      for (const item of items) {
        if (item.name.startsWith('.')) continue

        if (item.file_type === 'folder') {
          const found = await this.searchDirectoryForEntity(item.path, entityId)
          results.push(...found)
        } else if (item.path.endsWith('.data')) {
          const found = await this.searchFileForEntity(item.path, entityId)
          if (found) results.push(found)
        }
      }
    } catch {
      // Directory doesn't exist or can't be read
    }

    return results
  }

  /**
   * Search a single file for an entity
   */
  private async searchFileForEntity(filePath: string, entityId: string): Promise<EntityLocation | null> {
    try {
      const response = await invoke<{ content: string }>('read_text_file', { filePath })
      const content = response.content
      const doc = JSON.parse(content)
      const relativePath = filePath.startsWith(this.vaultPath) ? filePath.slice(this.vaultPath.length + 1) : filePath

      return this.findEntityInDoc(doc, entityId, filePath, relativePath)
    } catch {
      return null
    }
  }

  /**
   * Find an entity in a document
   */
  private findEntityInDoc(
    doc: unknown,
    entityId: string,
    filePath: string,
    relativePath: string,
    currentKey: string = '',
  ): EntityLocation | null {
    if (Array.isArray(doc)) {
      for (let index = 0; index < doc.length; index++) {
        const item = doc[index]
        if (typeof item === 'object' && item !== null) {
          const record = item as Record<string, unknown>
          if (record.id === entityId) {
            return {
              filePath,
              relativePath,
              collectionKey: currentKey,
              collectionIndex: index,
              entityData: record,
            }
          }
        }
      }
    } else if (typeof doc === 'object' && doc !== null) {
      const record = doc as Record<string, unknown>

      if (record.id === entityId) {
        return {
          filePath,
          relativePath,
          collectionKey: currentKey,
          collectionIndex: -1,
          entityData: record,
        }
      }

      // Recurse
      for (const [key, value] of Object.entries(record)) {
        if (key === '@context' || key === '@type') continue
        if (Array.isArray(value) || (typeof value === 'object' && value !== null)) {
          const found = this.findEntityInDoc(value, entityId, filePath, relativePath, key)
          if (found) return found
        }
      }
    }

    return null
  }

  /**
   * Get default file name for a namespace
   */
  private getDefaultFileName(namespace: string): string {
    const fileNames: Record<string, string> = {
      person: 'people.data',
      org: 'organizations.data',
      proj: 'projects.data',
      task: 'tasks.data',
      goal: 'goals.data',
      acc: 'accounts.data',
      tx: 'transactions.data',
      bill: 'bills.data',
      sub: 'bills.data',
      annual: 'bills.data',
      cat: 'categories.data',
      inc: 'income.data',
      ins: 'insurance.data',
      note: 'notes.data',
      ms: 'milestones.data',
    }
    return fileNames[namespace.toLowerCase()] || `${namespace}.data`
  }

  /**
   * Extract slug from entity ID
   */
  private extractSlugFromId(entityId: string): string | null {
    const match = ENTITY_ID_PATTERN.exec(entityId)
    return match ? match[2] : null
  }

  /**
   * Convert a string to a slug
   */
  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
  }
}

// ============================================================================
// Singleton & Factory
// ============================================================================

let _resolver: LinkResolver | null = null

/**
 * Get or create a link resolver for the given vault
 */
export function getLinkResolver(vaultPath: string): LinkResolver {
  if (!_resolver || _resolver['vaultPath'] !== vaultPath) {
    _resolver = new LinkResolver(vaultPath)
  }
  return _resolver
}

/**
 * Reset the link resolver (for testing)
 */
export function resetLinkResolver(): void {
  _resolver = null
}
