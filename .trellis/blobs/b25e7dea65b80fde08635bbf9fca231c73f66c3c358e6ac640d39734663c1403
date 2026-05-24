/**
 * Link Parser - Universal Reference Extraction Engine
 * RFC-001: docs/architecture/RFC-001-Universal-Linking.md
 *
 * Extracts references from any file type into a unified format for:
 * - Global reference registry
 * - Backlinks computation
 * - Broken reference detection
 * - Cross-file-type linking
 */

import { LinkTypes, type LinkType } from '../tql/linkTypes'

// ============================================================================
// Types
// ============================================================================

/** The kind of reference being extracted */
export type ReferenceType = 'entity-id' | 'wikilink' | 'file-path' | 'url'

/** A single parsed reference from a file */
export interface ParsedReference {
  /** The raw reference value (e.g., "acc:checking:001", "[[person:sarah]]") */
  value: string
  /** Normalized target ID (e.g., "acc:checking:001" or "person:sarah") */
  targetId: string
  /** The type of reference syntax used */
  type: ReferenceType
  /** Link type for TQL storage */
  linkType: LinkType
  /** Absolute path to the source file */
  sourceFile: string
  /** 1-indexed line number where reference appears (if available) */
  lineNumber?: number
  /** Full JSON path for .data files (e.g., "recurring[2].account") */
  propertyPath?: string
  /** Display text if different from target (e.g., [[id|Display Text]]) */
  displayText?: string
}

/** Index of all references in the vault */
export interface ReferenceIndex {
  /** All parsed references, keyed by source file */
  bySourceFile: Map<string, ParsedReference[]>
  /** Reverse index: target ID → files that reference it */
  byTargetId: Map<string, ParsedReference[]>
  /** All unique target IDs found */
  allTargetIds: Set<string>
  /** All unique source files */
  allSourceFiles: Set<string>
  /** Timestamp of last full index */
  indexedAt: Date
}

// ============================================================================
// Patterns
// ============================================================================

/** Entity ID pattern: namespace:slug:index (e.g., acc:checking:001) */
const ENTITY_ID_PATTERN = /^[a-z]+:[a-z0-9-]+:\d{3}$/i

/** Wikilink pattern: [[target]] or [[target|display]] */
const WIKILINK_PATTERN = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g

/** File path pattern: relative paths starting with @ or ./ */
const FILE_PATH_PATTERN = /^[@.][\w\-./]+\.(data|note|md|canvas)$/

/** URL pattern */
const URL_PATTERN = /^https?:\/\//i

// ============================================================================
// Entity ID Parser (for .data files)
// ============================================================================

/**
 * Recursively extract all entity IDs from a JSON document
 * Tracks the full property path for each reference
 */
export function extractEntityIdsFromObject(
  obj: unknown,
  sourceFile: string,
  currentPath: string = '',
): ParsedReference[] {
  const refs: ParsedReference[] = []

  if (typeof obj === 'string') {
    // Check if this string is an entity ID
    if (ENTITY_ID_PATTERN.test(obj)) {
      refs.push({
        value: obj,
        targetId: obj,
        type: 'entity-id',
        linkType: LinkTypes.DATA_REF,
        sourceFile,
        propertyPath: currentPath || undefined,
      })
    }
    // Could also be a wikilink in a string field
    else if (obj.includes('[[')) {
      const wikiRefs = extractWikilinksFromString(obj, sourceFile)
      wikiRefs.forEach((ref) => {
        ref.propertyPath = currentPath || undefined
      })
      refs.push(...wikiRefs)
    }
  } else if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      const arrayPath = currentPath ? `${currentPath}[${index}]` : `[${index}]`
      refs.push(...extractEntityIdsFromObject(item, sourceFile, arrayPath))
    })
  } else if (obj !== null && typeof obj === 'object') {
    for (const [key, value] of Object.entries(obj)) {
      // Skip metadata fields that shouldn't be parsed as references
      if (key === '@context' || key === '@type' || key === '@id' || key === 'id' || key === 'slug') {
        continue
      }
      const propPath = currentPath ? `${currentPath}.${key}` : key
      refs.push(...extractEntityIdsFromObject(value, sourceFile, propPath))
    }
  }

  return refs
}

/**
 * Parse a .data file and extract all references
 */
export function parseDataFile(filePath: string, content: string): ParsedReference[] {
  // Skip empty or whitespace-only content
  const trimmed = content.trim()
  if (!trimmed) {
    return []
  }
  
  try {
    const doc = JSON.parse(trimmed)
    return extractEntityIdsFromObject(doc, filePath)
  } catch (e) {
    // Only log warning once per file to avoid console spam
    console.warn(`[LinkParser] Failed to parse .data file: ${filePath} – ${e}`)
    return []
  }
}

// ============================================================================
// Wikilink Parser (for .note/.md files)
// ============================================================================

/**
 * Extract wikilinks from a string
 */
function extractWikilinksFromString(text: string, sourceFile: string): ParsedReference[] {
  const refs: ParsedReference[] = []
  let match: RegExpExecArray | null

  // Reset regex state
  WIKILINK_PATTERN.lastIndex = 0

  while ((match = WIKILINK_PATTERN.exec(text)) !== null) {
    const [fullMatch, target, displayText] = match
    const normalizedTarget = normalizeWikilinkTarget(target)

    refs.push({
      value: fullMatch,
      targetId: normalizedTarget,
      type: 'wikilink',
      linkType: LinkTypes.REFERENCES,
      sourceFile,
      displayText: displayText || undefined,
    })
  }

  return refs
}

/**
 * Normalize a wikilink target to a consistent ID format
 * [[person:sarah]] → person:sarah
 * [[Sarah Johnson]] → sarah-johnson (slug format)
 * [[path/to/file.note]] → path/to/file.note
 */
function normalizeWikilinkTarget(target: string): string {
  const trimmed = target.trim()

  // If it's already an entity ID, return as-is
  if (ENTITY_ID_PATTERN.test(trimmed)) {
    return trimmed
  }

  // If it's a file path, return as-is
  if (FILE_PATH_PATTERN.test(trimmed) || trimmed.includes('/')) {
    return trimmed
  }

  // Otherwise, slugify the target
  return trimmed
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * Parse a markdown/note file and extract all references
 * Includes line numbers for each reference
 */
export function parseMarkdownFile(filePath: string, content: string): ParsedReference[] {
  const refs: ParsedReference[] = []
  const lines = content.split('\n')

  lines.forEach((line, lineIndex) => {
    // Reset regex state for each line
    WIKILINK_PATTERN.lastIndex = 0

    let match: RegExpExecArray | null
    while ((match = WIKILINK_PATTERN.exec(line)) !== null) {
      const [fullMatch, target, displayText] = match
      const normalizedTarget = normalizeWikilinkTarget(target)

      refs.push({
        value: fullMatch,
        targetId: normalizedTarget,
        type: 'wikilink',
        linkType: LinkTypes.REFERENCES,
        sourceFile: filePath,
        lineNumber: lineIndex + 1, // 1-indexed
        displayText: displayText || undefined,
      })
    }

    // Also check for bare entity IDs in markdown (less common but possible)
    // Only match if surrounded by backticks or in specific contexts
    const backtickEntityPattern = /`([a-z]+:[a-z0-9-]+:\d{3})`/gi
    let entityMatch: RegExpExecArray | null
    while ((entityMatch = backtickEntityPattern.exec(line)) !== null) {
      const [, entityId] = entityMatch

      refs.push({
        value: entityId,
        targetId: entityId,
        type: 'entity-id',
        linkType: LinkTypes.MENTIONS,
        sourceFile: filePath,
        lineNumber: lineIndex + 1,
      })
    }
  })

  return refs
}

// ============================================================================
// Unified Interface
// ============================================================================

/**
 * Parse any supported file type and extract references
 */
export function parseFile(filePath: string, content: string): ParsedReference[] {
  const ext = filePath.split('.').pop()?.toLowerCase()

  switch (ext) {
    case 'data':
      return parseDataFile(filePath, content)
    case 'note':
    case 'md':
      return parseMarkdownFile(filePath, content)
    // Future: canvas, code files, etc.
    default:
      return []
  }
}

/**
 * Check if a file type is supported for reference parsing
 */
export function isSupportedFileType(filePath: string): boolean {
  const ext = filePath.split('.').pop()?.toLowerCase()
  return ['data', 'note', 'md'].includes(ext || '')
}

// ============================================================================
// Reference Index Builder
// ============================================================================

/**
 * Create an empty reference index
 */
export function createEmptyIndex(): ReferenceIndex {
  return {
    bySourceFile: new Map(),
    byTargetId: new Map(),
    allTargetIds: new Set(),
    allSourceFiles: new Set(),
    indexedAt: new Date(),
  }
}

/**
 * Add references from a single file to the index
 */
export function addFileToIndex(index: ReferenceIndex, filePath: string, refs: ParsedReference[]): void {
  // Update bySourceFile
  index.bySourceFile.set(filePath, refs)
  index.allSourceFiles.add(filePath)

  // Update byTargetId (reverse index)
  for (const ref of refs) {
    index.allTargetIds.add(ref.targetId)

    const existing = index.byTargetId.get(ref.targetId) || []
    existing.push(ref)
    index.byTargetId.set(ref.targetId, existing)
  }
}

/**
 * Remove a file from the index (for incremental updates)
 */
export function removeFileFromIndex(index: ReferenceIndex, filePath: string): void {
  const refs = index.bySourceFile.get(filePath) || []

  // Remove from byTargetId
  for (const ref of refs) {
    const existing = index.byTargetId.get(ref.targetId) || []
    const filtered = existing.filter((r) => r.sourceFile !== filePath)
    if (filtered.length > 0) {
      index.byTargetId.set(ref.targetId, filtered)
    } else {
      index.byTargetId.delete(ref.targetId)
      index.allTargetIds.delete(ref.targetId)
    }
  }

  // Remove from bySourceFile
  index.bySourceFile.delete(filePath)
  index.allSourceFiles.delete(filePath)
}

/**
 * Update a file in the index (remove old, add new)
 */
export function updateFileInIndex(index: ReferenceIndex, filePath: string, content: string): void {
  removeFileFromIndex(index, filePath)
  const refs = parseFile(filePath, content)
  addFileToIndex(index, filePath, refs)
}

// ============================================================================
// Query Helpers
// ============================================================================

/**
 * Get all files that reference a specific entity
 */
export function getBacklinks(index: ReferenceIndex, targetId: string): ParsedReference[] {
  return index.byTargetId.get(targetId) || []
}

/**
 * Get all references from a specific file
 */
export function getOutgoingLinks(index: ReferenceIndex, sourceFile: string): ParsedReference[] {
  return index.bySourceFile.get(sourceFile) || []
}

/**
 * Find broken references (references to non-existent entities)
 * @param index The reference index
 * @param knownEntityIds Set of all valid entity IDs in the vault
 */
export function findBrokenReferences(index: ReferenceIndex, knownEntityIds: Set<string>): ParsedReference[] {
  const broken: ParsedReference[] = []

  for (const [targetId, refs] of index.byTargetId) {
    // Skip file paths and URLs
    if (targetId.includes('/') || URL_PATTERN.test(targetId)) {
      continue
    }

    // Check if it's an entity ID that doesn't exist
    if (ENTITY_ID_PATTERN.test(targetId) && !knownEntityIds.has(targetId)) {
      broken.push(...refs)
    }
  }

  return broken
}

/**
 * Get statistics about the reference index
 */
export function getIndexStats(index: ReferenceIndex) {
  let totalRefs = 0
  const typeBreakdown: Record<ReferenceType, number> = {
    'entity-id': 0,
    wikilink: 0,
    'file-path': 0,
    url: 0,
  }

  for (const refs of index.bySourceFile.values()) {
    totalRefs += refs.length
    for (const ref of refs) {
      typeBreakdown[ref.type]++
    }
  }

  return {
    totalReferences: totalRefs,
    uniqueTargets: index.allTargetIds.size,
    sourceFiles: index.allSourceFiles.size,
    typeBreakdown,
    indexedAt: index.indexedAt,
  }
}
