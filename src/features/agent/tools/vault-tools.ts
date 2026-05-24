/**
 * Agent Tools — Vault Domain
 *
 * Tools for reading and writing entities, files, and querying the TQL graph.
 */

import { invoke } from '@tauri-apps/api/core'
import { join } from '@tauri-apps/api/path'
import { NAMESPACE_FILES } from '@/lib/namespaces'
import {
  getVaultPath,
  readDataFile,
  getEAVStore,
  getTQLRuntime,
  pickFields,
  findReferences,
  focusCanvasNodeForFile,
} from './helpers'

// ─────────────────────────────────────────────────────────────────────────────
// Tool definitions
// ─────────────────────────────────────────────────────────────────────────────

export const VAULT_TOOL_DEFINITIONS = [
  {
    type: 'function',
    name: 'get_entity',
    description: 'Fetch a specific entity by its ID from the vault. Entity IDs follow the format namespace:slug:index (e.g., person:sarah:001, proj:filegraph:001).',
    strict: true,
    parameters: {
      type: 'object',
      properties: { entityId: { type: 'string', description: 'Entity ID in namespace:slug:index format' } },
      required: ['entityId'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'list_entities',
    description: 'List entities from a specific namespace. Available namespaces: person, org, proj, task, ms (milestone), acc (account), bill, event, email, note. Use "email" namespace to list emails from inbox.',
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        namespace: { type: 'string', description: 'Entity namespace (person, org, proj, task, ms, acc, bill, event, email, note). Use "email" to access emails.' },
        limit: { type: ['number', 'null'], description: 'Maximum number of entities to return (default: 20)' },
      },
      required: ['namespace', 'limit'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'get_backlinks',
    description: 'Find all entities that reference the given entity ID. Returns a list of entities that link to the target.',
    strict: true,
    parameters: {
      type: 'object',
      properties: { targetId: { type: 'string', description: 'Entity ID to find backlinks for' } },
      required: ['targetId'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'search_vault',
    description: 'Search the vault for files and entities matching a query. Searches file names, entity names, and content.',
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query string' },
        namespace: { type: ['string', 'null'], description: 'Optional: limit search to a specific namespace' },
      },
      required: ['query', 'namespace'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'read_file',
    description: 'Read the contents of a file in the vault. Use relative paths from vault root (e.g., @entities/people.data).',
    strict: true,
    parameters: {
      type: 'object',
      properties: { path: { type: 'string', description: 'Relative path from vault root' } },
      required: ['path'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'write_file',
    description: `Write content to a file in the vault. Creates the file if it doesn't exist, or overwrites if it does.
Use relative paths from vault root (e.g., @notes/my-note.note, @entities/people.data).
For .note files, content should be valid JSON with TipTap block structure.
For .data files, content should be valid JSON with items array.
For other files, content is written as-is.
Returns success status and the full path of the written file.`,
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Relative path from vault root (e.g., @notes/new-note.note)' },
        content: { type: 'string', description: 'Content to write to the file (string or JSON stringified)' },
        createDirectories: { type: ['boolean', 'null'], description: 'Create parent directories if they do not exist (default: true)' },
      },
      required: ['path', 'content', 'createDirectories'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'edit_file',
    description: `Make a surgical edit to a file by replacing a specific string with new content.
The old_string must be UNIQUE in the file - include enough surrounding context to make it unique.
If old_string is not found or found multiple times, the edit will fail safely.
Use this for modifying existing files. For creating new files, use write_file instead.`,
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Relative path from vault root' },
        old_string: { type: 'string', description: 'The exact string to find and replace (must be unique in file)' },
        new_string: { type: 'string', description: 'The string to replace it with' },
        replace_all: { type: ['boolean', 'null'], description: 'Replace all occurrences instead of requiring uniqueness (default: false)' },
      },
      required: ['path', 'old_string', 'new_string', 'replace_all'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'get_vault_stats',
    description: 'Get overview statistics about the vault: number of entities by type, file counts, etc.',
    strict: true,
    parameters: { type: 'object', properties: {}, required: [], additionalProperties: false },
  },
  {
    type: 'function',
    name: 'get_related_entities',
    description: 'Find entities related to a given entity via links (both incoming and outgoing). Useful for finding connections in the knowledge graph.',
    strict: true,
    parameters: {
      type: 'object',
      properties: { entityId: { type: 'string', description: 'Entity ID to find relations for (e.g., person:sarah:001)' } },
      required: ['entityId'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'read_note_content',
    description: `Read the full content of a note file. Notes are stored as .note files in @notes/.
Use this when the user asks about the contents or details of a specific note.
Returns the note's title, metadata, and extracted plain text content.`,
    strict: true,
    parameters: {
      type: 'object',
      properties: { noteId: { type: 'string', description: 'Note ID (e.g., "note:welcome") or filename (e.g., "welcome.note")' } },
      required: ['noteId'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'resolve_entity',
    description: `Resolve a natural language entity name to its ID. Use this FIRST when a user mentions an entity by name.
Example: "nodebook" → "proj:nodebook:001"
Does fuzzy matching on entity names/titles across all namespaces, or a specific namespace if provided.
Returns the full entity with all its attributes if found.`,
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Entity name to resolve (e.g., "nodebook", "sarah", "checking account")' },
        namespace: { type: ['string', 'null'], description: 'Optional: limit to namespace (person, proj, acc, etc.)' },
      },
      required: ['name', 'namespace'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'query_graph',
    description: `Query the TQL knowledge graph using EAV primitives. Primary tool for complex queries, aggregations, and relationship traversal.

Operations:
- "get_facts": Get all attributes for an entity
- "get_links": Get all links involving an entity
- "get_backlinks": Get entities that reference a target
- "get_outgoing": Get entities that a source references
- "find_by_attribute": Find entities matching an attribute value
- "aggregate": Compute sum/count/avg/min/max on attributes

Special filters (use in filters object):
- "amount_lt": Filter amount < value (for expenses)
- "amount_gt": Filter amount > value (for income)
- "date_gte": Filter date >= value (YYYY-MM-DD)
- "date_lte": Filter date <= value (YYYY-MM-DD)

Example - Total expenses in March 2024:
{ "operation": "aggregate", "attribute": "amount", "aggregation": "sum", "namespace": "tx", "filters": { "amount_lt": 0, "date_gte": "2024-03-01", "date_lte": "2024-03-31" } }`,
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        operation: { type: 'string', description: 'The graph operation: get_facts, get_links, get_backlinks, get_outgoing, find_by_attribute, aggregate' },
        entityId: { type: ['string', 'null'], description: 'Entity ID for get_facts, get_links, get_backlinks, get_outgoing operations' },
        attribute: { type: ['string', 'null'], description: 'Attribute name for find_by_attribute or aggregate operations' },
        value: { type: ['string', 'number', 'boolean', 'null'], description: 'Value to match for find_by_attribute operation' },
        namespace: { type: ['string', 'null'], description: 'Filter to entities in a specific namespace (e.g., tx, acc, person)' },
        aggregation: { type: ['string', 'null'], description: 'Aggregation function for aggregate operation: sum, count, avg, min, max' },
        filters: { type: ['object', 'null'], description: 'Filters: {attr: value} for exact match, or special: amount_lt, amount_gt, date_gte, date_lte' },
        limit: { type: ['number', 'null'], description: 'Maximum results to return (default: 100)' },
      },
      required: ['operation', 'entityId', 'attribute', 'value', 'namespace', 'aggregation', 'filters', 'limit'],
      additionalProperties: false,
    },
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Handlers
// ─────────────────────────────────────────────────────────────────────────────

export async function getEntity(entityId: string): Promise<any> {
  const [namespace] = entityId.split(':')
  const filePath = NAMESPACE_FILES[namespace]
  if (!filePath) return { error: `Unknown namespace: ${namespace}` }
  const data = await readDataFile(filePath)
  const items = data?.items || data?.['@graph']
  if (!items) return { error: `Could not read ${filePath}` }
  const entity = items.find((item: any) => item.id === entityId || item['@id'] === entityId)
  if (!entity) return { error: `Entity not found: ${entityId}` }
  return entity
}

export async function listEntities(namespace: string, limit?: number | null): Promise<any> {
  const filePath = NAMESPACE_FILES[namespace]
  if (!filePath) return { error: `Unknown namespace: ${namespace}`, availableNamespaces: Object.keys(NAMESPACE_FILES) }
  const data = await readDataFile(filePath)
  const allItems = data?.items || data?.['@graph']
  if (!allItems) return { error: `Could not read ${filePath} or no items/@graph found` }
  const items = allItems.slice(0, limit || 20)
  return {
    namespace,
    count: allItems.length,
    items: items.map((item: any) => ({
      id: item.id || item['@id'],
      name: item.name || item.title,
      type: item['@type'],
      ...pickFields(item, ['role', 'status', 'email', 'organization']),
    })),
  }
}

export async function getBacklinks(targetId: string): Promise<any> {
  const store = getEAVStore()
  if (store) {
    const links = store.getBacklinks(targetId)
    const backlinks = links.map((link: any) => ({ sourceId: link.e1, linkType: link.a, targetId: link.e2 }))
    return { targetId, backlinkCount: backlinks.length, backlinks: backlinks.slice(0, 30), source: 'tql' }
  }

  const backlinks: Array<{ sourceId: string; sourceFile: string; field: string }> = []
  for (const [, filePath] of Object.entries(NAMESPACE_FILES)) {
    if (filePath.startsWith('@notes')) continue
    const data = await readDataFile(filePath)
    const items = data?.items || data?.['@graph']
    if (!items) continue
    for (const item of items) {
      const itemId = item.id || item['@id']
      findReferences(item, itemId, filePath, targetId, backlinks)
    }
  }
  return { targetId, backlinkCount: backlinks.length, backlinks: backlinks.slice(0, 20), source: 'file-scan' }
}

export async function searchVault(query: string, namespace?: string | null): Promise<any> {
  const results: Array<{ id: string; name: string; type: string; file?: string; matchField?: string; score?: number }> = []
  const queryLower = query.toLowerCase()
  const store = getEAVStore()

  if (store) {
    const allFacts = store.getAllFacts()
    const matchedEntities = new Map<string, { score: number; matchField: string }>()
    for (const fact of allFacts) {
      if (typeof fact.v !== 'string') continue
      const valueLower = fact.v.toLowerCase()
      if (valueLower.includes(queryLower)) {
        const exactMatch = valueLower === queryLower
        const startsWithMatch = valueLower.startsWith(queryLower)
        const score = exactMatch ? 100 : startsWithMatch ? 75 : 50
        const existing = matchedEntities.get(fact.e)
        if (!existing || existing.score < score) matchedEntities.set(fact.e, { score, matchField: fact.a })
      }
    }
    for (const [entityId, match] of matchedEntities) {
      if (namespace && !entityId.startsWith(namespace + ':')) continue
      const facts = store.getFactsByEntity(entityId)
      const nameFact = facts.find((f: any) => f.a === 'name' || f.a === 'title')
      const typeFact = facts.find((f: any) => f.a === 'type')
      results.push({ id: entityId, name: nameFact ? String(nameFact.v) : entityId, type: typeFact ? String(typeFact.v) : entityId.split(':')[0], matchField: match.matchField, score: match.score })
    }
    results.sort((a, b) => (b.score || 0) - (a.score || 0))
    if (results.length > 0) return { query, resultCount: results.length, results: results.slice(0, 25), source: 'tql' }
  }

  const namespaces = namespace ? [namespace] : Object.keys(NAMESPACE_FILES)
  for (const ns of namespaces) {
    const filePath = NAMESPACE_FILES[ns]
    if (!filePath || filePath.startsWith('@notes')) continue
    const data = await readDataFile(filePath)
    const items = data?.items || data?.['@graph']
    if (!items) continue
    for (const item of items) {
      const name = (item.name || item.title || '').toLowerCase()
      const id = (item.id || item['@id'] || '').toLowerCase()
      if (name.includes(queryLower) || id.includes(queryLower)) {
        results.push({ id: item.id || item['@id'], name: item.name || item.title, type: item['@type'] || ns, file: filePath, matchField: name.includes(queryLower) ? 'name' : 'id' })
      }
    }
  }
  return { query, resultCount: results.length, results: results.slice(0, 20), source: 'file-scan' }
}

export async function readFile(path: string): Promise<any> {
  try {
    const vaultPath = await getVaultPath()
    const fullPath = path.startsWith('/') ? path : await join(vaultPath, path)
    const result = await invoke<{ content: string }>('read_text_file', { filePath: fullPath })
    const content = result.content.length > 5000 ? result.content.slice(0, 5000) + '\n...(truncated)' : result.content
    return { path, size: result.content.length, content }
  } catch (err) {
    return { error: `Could not read file: ${path}`, details: String(err) }
  }
}

export async function writeFile(path: string, content: string, createDirectories?: boolean | null): Promise<any> {
  try {
    const vaultPath = await getVaultPath()
    const fullPath = path.startsWith('/') ? path : await join(vaultPath, path)

    let finalContent = content
    if (path.endsWith('.data') || path.endsWith('.note')) {
      try {
        const parsed = JSON.parse(content)
        finalContent = JSON.stringify(parsed, null, 2)
      } catch {
        return { error: `Invalid JSON content for ${path.endsWith('.data') ? '.data' : '.note'} file`, hint: 'Content must be valid JSON' }
      }
    }

    await invoke('write_text_file', { filePath: fullPath, content: finalContent })

    if (typeof window !== 'undefined') {
      const { useFileStore } = await import('@/stores/useFileStore')
      useFileStore.getState().notifyFileChanged(fullPath)
      setTimeout(() => window.dispatchEvent(new CustomEvent('canvas-preview-reload')), 300)
    }

    await focusCanvasNodeForFile(fullPath)
    return { success: true, path, fullPath, bytesWritten: content.length, message: `Successfully wrote ${content.length} bytes to ${path}` }
  } catch (err) {
    return { error: `Could not write file: ${path}`, details: String(err) }
  }
}

export async function editFile(path: string, oldString: string, newString: string, replaceAll?: boolean | null): Promise<any> {
  try {
    const vaultPath = await getVaultPath()
    const fullPath = path.startsWith('/') ? path : await join(vaultPath, path)

    let content: string
    try {
      const result = await invoke<{ content: string }>('read_text_file', { filePath: fullPath })
      content = result.content
    } catch {
      return { error: `File not found: ${path}`, hint: 'Use write_file to create new files' }
    }

    const occurrences = content.split(oldString).length - 1

    if (occurrences === 0) {
      return { error: 'old_string not found in file', path, old_string_preview: oldString.slice(0, 100) + (oldString.length > 100 ? '...' : ''), hint: 'Make sure old_string matches exactly, including whitespace and newlines' }
    }

    if (occurrences > 1 && !replaceAll) {
      return { error: `old_string found ${occurrences} times - must be unique`, path, occurrences, hint: 'Include more surrounding context to make old_string unique, or set replace_all=true' }
    }

    const newContent = replaceAll ? content.split(oldString).join(newString) : content.replace(oldString, newString)
    await invoke('write_text_file', { filePath: fullPath, content: newContent })

    try {
      const verifyResult = await invoke<{ content: string }>('read_text_file', { filePath: fullPath })
      if (!verifyResult.content.includes(newString)) {
        return { error: 'Edit verification failed - new_string not found after write', path, hint: 'The file may have been modified by another process' }
      }
    } catch {
      return { error: 'Edit verification failed - could not read file after write', path }
    }

    if (typeof window !== 'undefined') {
      const { useFileStore } = await import('@/stores/useFileStore')
      useFileStore.getState().notifyFileChanged(fullPath)
      const linesBeforeChange = content.slice(0, content.indexOf(oldString)).split('\n')
      const startLine = linesBeforeChange.length
      const endLine = startLine + newString.split('\n').length - 1
      window.dispatchEvent(new CustomEvent('canvas-code-highlight', { detail: { filePath: fullPath, startLine, endLine } }))
      setTimeout(() => window.dispatchEvent(new CustomEvent('canvas-preview-reload')), 300)
    }

    await focusCanvasNodeForFile(fullPath)
    return { success: true, path, verified: true, replacements: replaceAll ? occurrences : 1, bytesChanged: newContent.length - content.length, message: `Successfully edited ${path}` }
  } catch (err) {
    return { error: `Could not edit file: ${path}`, details: String(err) }
  }
}

export async function getVaultStats(): Promise<any> {
  const runtime = getTQLRuntime()
  const tqlStats = runtime?.getStats()
  const entityCounts: Record<string, number> = {}

  for (const [namespace, filePath] of Object.entries(NAMESPACE_FILES)) {
    if (filePath.startsWith('@notes')) continue
    const data = await readDataFile(filePath)
    const items = data?.items || data?.['@graph']
    if (items) entityCounts[namespace] = items.length
  }

  const totalEntities = Object.values(entityCounts).reduce((a, b) => a + b, 0)
  return {
    entityCounts,
    totalEntities,
    namespaces: Object.keys(NAMESPACE_FILES),
    tql: tqlStats ? { factCount: tqlStats.factCount, linkCount: tqlStats.linkCount, indexedEntities: tqlStats.entityCount } : null,
  }
}

export async function getRelatedEntities(entityId: string): Promise<any> {
  const store = getEAVStore()
  if (!store) return { error: 'TQL store not available', entityId }

  const allLinks = store.getLinksByEntity(entityId)
  const incoming: Array<{ sourceId: string; linkType: string }> = []
  const outgoing: Array<{ targetId: string; linkType: string }> = []

  for (const link of allLinks) {
    if (link.e2 === entityId) incoming.push({ sourceId: link.e1, linkType: link.a })
    else if (link.e1 === entityId) outgoing.push({ targetId: link.e2, linkType: link.a })
  }

  const enrichWithName = (id: string) => {
    const facts = store.getFactsByEntity(id)
    const nameFact = facts.find((f: any) => f.a === 'name' || f.a === 'title')
    return nameFact ? String(nameFact.v) : null
  }

  return {
    entityId,
    incoming: incoming.slice(0, 20).map((r) => ({ ...r, sourceName: enrichWithName(r.sourceId) })),
    outgoing: outgoing.slice(0, 20).map((r) => ({ ...r, targetName: enrichWithName(r.targetId) })),
    totalIncoming: incoming.length,
    totalOutgoing: outgoing.length,
  }
}

export async function readNoteContent(noteId: string): Promise<any> {
  let filename = noteId
  if (noteId.startsWith('note:')) filename = noteId.replace('note:', '') + '.note'
  else if (!noteId.endsWith('.note')) filename = noteId + '.note'

  const vaultPath = await getVaultPath()
  if (!vaultPath) return { error: 'Vault path not configured' }

  const notePath = await join(vaultPath, '@notes', filename)
  try {
    const result = await invoke<{ content: string }>('read_text_file', { filePath: notePath })
    const note = JSON.parse(result.content)
    const extractText = (blocks: any[]): string => {
      if (!blocks) return ''
      return blocks.map((block: any) => {
        let text = ''
        if (block.content) text += block.content.filter((c: any) => c.type === 'text').map((c: any) => c.text).join('')
        if (block.children) text += '\n' + extractText(block.children)
        return text
      }).filter(Boolean).join('\n')
    }
    const plainText = extractText(note.blocks || [])
    const preview = plainText.slice(0, 2000) + (plainText.length > 2000 ? '...' : '')
    return { noteId: note['@id'] || noteId, title: note.title, author: note.author, status: note.status, created_at: note.created_at, updated_at: note.updated_at, contentLength: plainText.length, content: preview }
  } catch (e) {
    return { error: `Could not read note: ${filename}`, details: String(e) }
  }
}

export async function resolveEntity(name: string, namespace?: string | null): Promise<any> {
  const rawName = name.toLowerCase()
  const targetNs = namespace?.toLowerCase()
  const noiseWords = ['the', 'a', 'an', 'project', 'person', 'account', 'task', 'my', 'about', 'what', 'is', 'note', 'notes']
  const searchTerms = rawName.split(/\s+/).filter((w: string) => !noiseWords.includes(w) && w.length > 1)
  const searchName = searchTerms.join(' ')

  type Match = { id: string; name: string; namespace: string; score: number; entity: any }
  const matches: Match[] = []

  for (const [ns, filePath] of Object.entries(NAMESPACE_FILES)) {
    if (targetNs && ns !== targetNs) continue

    if (ns === 'note' && filePath === '@notes') {
      try {
        const vaultPath = await getVaultPath()
        const notesDir = await join(vaultPath, '@notes')
        const dirItems = await invoke<Array<{ name: string; file_type: string }>>('list_directory', { path: notesDir })
        const noteFiles = dirItems.filter((item) => item.file_type === 'file' && item.name.endsWith('.note'))
        for (const noteItem of noteFiles) {
          try {
            const notePath = await join(notesDir, noteItem.name)
            const result = await invoke<{ content: string }>('read_text_file', { filePath: notePath })
            const note = JSON.parse(result.content)
            const itemName = (note.title || '').toLowerCase()
            const itemSlug = noteItem.name.replace('.note', '').toLowerCase()
            let score = 0
            if (searchName && itemName === searchName) score = 100
            else if (searchName && itemSlug === searchName) score = 95
            else if (searchName && itemName.startsWith(searchName)) score = 80
            else if (searchName && itemName.includes(searchName)) score = 60
            else if (searchName && itemSlug.includes(searchName)) score = 50
            if (score === 0) {
              for (const term of searchTerms) {
                if (itemName.includes(term)) score = Math.max(score, 55)
                else if (itemSlug.includes(term)) score = Math.max(score, 45)
              }
            }
            if (score > 0) matches.push({ id: note['@id'] || `note:${itemSlug}`, name: note.title, namespace: 'note', score, entity: { ...note, filename: noteItem.name } })
          } catch { /* skip unparseable notes */ }
        }
      } catch (e) {
        console.error('[resolveEntity] Error scanning notes:', e)
      }
      continue
    }

    const data = await readDataFile(filePath)
    const items = data?.items || data?.['@graph']
    if (!items) continue

    for (const item of items) {
      const itemName = (item.name || item.title || item.description || '').toLowerCase()
      const itemSlug = (item.slug || '').toLowerCase()
      const itemId = (item.id || item['@id'] || '').toLowerCase()
      let score = 0
      if (searchName && itemName === searchName) score = 100
      else if (searchName && itemSlug === searchName) score = 95
      else if (searchName && itemName.startsWith(searchName)) score = 80
      else if (searchName && itemName.includes(searchName)) score = 60
      else if (searchName && itemSlug.includes(searchName)) score = 50
      else if (searchName && itemId.includes(searchName)) score = 40
      if (score === 0) {
        for (const term of searchTerms) {
          if (itemName === term) score = Math.max(score, 90)
          else if (itemSlug === term) score = Math.max(score, 85)
          else if (itemName.startsWith(term)) score = Math.max(score, 70)
          else if (itemName.includes(term)) score = Math.max(score, 55)
          else if (itemSlug.includes(term)) score = Math.max(score, 45)
          else if (itemId.includes(term)) score = Math.max(score, 35)
        }
      }
      if (score > 0) matches.push({ id: item.id || item['@id'], name: item.name || item.title, namespace: ns, score, entity: item })
    }
  }

  matches.sort((a, b) => b.score - a.score)

  if (matches.length === 0) {
    return { resolved: false, searchName: name, cleanedTerms: searchTerms, suggestion: 'Try list_entities to see available entities' }
  }

  const best = matches[0]
  return { resolved: true, entityId: best.id, name: best.name, namespace: best.namespace, entity: best.entity, alternates: matches.slice(1, 4).map((m) => ({ id: m.id, name: m.name, score: m.score })) }
}

export async function queryGraph(args: {
  operation: string; entityId?: string | null; attribute?: string | null
  value?: string | number | boolean | null; namespace?: string | null; aggregation?: string | null
  filters?: Record<string, any> | null; limit?: number | null
}): Promise<any> {
  const store = getEAVStore()
  const limit = args.limit || 100

  if (!store) return await queryGraphFromFiles(args)

  switch (args.operation) {
    case 'get_facts': {
      if (!args.entityId) return { error: 'entityId required for get_facts operation' }
      const facts = store.getFactsByEntity(args.entityId)
      return { entityId: args.entityId, factCount: facts.length, facts: facts.slice(0, limit).map((f: any) => ({ attribute: f.a, value: f.v })) }
    }
    case 'get_links': {
      if (!args.entityId) return { error: 'entityId required for get_links operation' }
      const links = store.getLinksByEntity(args.entityId)
      return { entityId: args.entityId, linkCount: links.length, links: links.slice(0, limit).map((l: any) => ({ source: l.e1, relationship: l.a, target: l.e2, direction: l.e1 === args.entityId ? 'outgoing' : 'incoming' })) }
    }
    case 'get_backlinks': {
      if (!args.entityId) return { error: 'entityId required for get_backlinks operation' }
      const backlinks = store.getBacklinks(args.entityId)
      return { entityId: args.entityId, backlinkCount: backlinks.length, backlinks: backlinks.slice(0, limit).map((l: any) => ({ sourceId: l.e1, relationship: l.a })) }
    }
    case 'get_outgoing': {
      if (!args.entityId) return { error: 'entityId required for get_outgoing operation' }
      const outgoing = store.getOutgoingLinks(args.entityId)
      return { entityId: args.entityId, outgoingCount: outgoing.length, outgoing: outgoing.slice(0, limit).map((l: any) => ({ targetId: l.e2, relationship: l.a })) }
    }
    case 'find_by_attribute': {
      if (!args.attribute) return { error: 'attribute required for find_by_attribute operation' }
      const allFacts = store.getAllFacts()
      let matches = allFacts.filter((f: any) => f.a === args.attribute)
      if (args.value !== null && args.value !== undefined) matches = matches.filter((f: any) => f.v === args.value)
      if (args.namespace) matches = matches.filter((f: any) => f.e.startsWith(args.namespace + ':'))
      if (args.filters) {
        for (const [filterAttr, filterVal] of Object.entries(args.filters)) {
          const matchingEntities = new Set<string>()
          const entityIds = new Set(matches.map((f: any) => f.e))
          for (const entityId of entityIds) {
            const entityFacts = store.getFactsByEntity(entityId)
            let isMatch = false
            if (filterAttr === 'amount_lt') { const fact = entityFacts.find((f: any) => f.a === 'amount'); isMatch = !!(fact && typeof fact.v === 'number' && fact.v < (filterVal as number)) }
            else if (filterAttr === 'amount_gt') { const fact = entityFacts.find((f: any) => f.a === 'amount'); isMatch = !!(fact && typeof fact.v === 'number' && fact.v > (filterVal as number)) }
            else if (filterAttr === 'amount_lte') { const fact = entityFacts.find((f: any) => f.a === 'amount'); isMatch = !!(fact && typeof fact.v === 'number' && fact.v <= (filterVal as number)) }
            else if (filterAttr === 'amount_gte') { const fact = entityFacts.find((f: any) => f.a === 'amount'); isMatch = !!(fact && typeof fact.v === 'number' && fact.v >= (filterVal as number)) }
            else if (filterAttr === 'date_gte') { const fact = entityFacts.find((f: any) => f.a === 'date'); isMatch = !!(fact && typeof fact.v === 'string' && fact.v >= String(filterVal)) }
            else if (filterAttr === 'date_lte') { const fact = entityFacts.find((f: any) => f.a === 'date'); isMatch = !!(fact && typeof fact.v === 'string' && fact.v <= String(filterVal)) }
            else if (filterAttr === 'date_gt') { const fact = entityFacts.find((f: any) => f.a === 'date'); isMatch = !!(fact && typeof fact.v === 'string' && fact.v > String(filterVal)) }
            else if (filterAttr === 'date_lt') { const fact = entityFacts.find((f: any) => f.a === 'date'); isMatch = !!(fact && typeof fact.v === 'string' && fact.v < String(filterVal)) }
            else { isMatch = !!entityFacts.find((f: any) => f.a === filterAttr && f.v === filterVal) }
            if (isMatch) matchingEntities.add(entityId)
          }
          matches = matches.filter((f: any) => matchingEntities.has(f.e))
        }
      }
      const entityMap = new Map<string, Record<string, any>>()
      for (const fact of matches) {
        if (!entityMap.has(fact.e)) {
          const entityFacts = store.getFactsByEntity(fact.e)
          const entity: Record<string, any> = { id: fact.e }
          for (const f of entityFacts) entity[f.a] = f.v
          entityMap.set(fact.e, entity)
        }
      }
      return { attribute: args.attribute, value: args.value, namespace: args.namespace, filters: args.filters, matchCount: entityMap.size, entities: Array.from(entityMap.values()).slice(0, limit) }
    }
    case 'aggregate': {
      if (!args.attribute) return { error: 'attribute required for aggregate operation' }
      const allFacts = store.getAllFacts()
      let relevantFacts = allFacts.filter((f: any) => f.a === args.attribute && typeof f.v === 'number')
      if (args.namespace) relevantFacts = relevantFacts.filter((f: any) => f.e.startsWith(args.namespace + ':'))

      if (args.filters) {
        const matchingEntities = new Set<string>()
        const entityIds = new Set(relevantFacts.map((f: any) => f.e))
        for (const entityId of entityIds) {
          const entityFacts = store.getFactsByEntity(entityId)
          let isMatch = true
          for (const [filterAttr, filterVal] of Object.entries(args.filters)) {
            const applyFilter = (attr: string, val: any) => {
              if (attr === 'amount_lt') { const f = entityFacts.find((f: any) => f.a === 'amount'); return !!(f && typeof f.v === 'number' && f.v < (val as number)) }
              if (attr === 'amount_gt') { const f = entityFacts.find((f: any) => f.a === 'amount'); return !!(f && typeof f.v === 'number' && f.v > (val as number)) }
              if (attr === 'date_gte') { const f = entityFacts.find((f: any) => f.a === 'date'); return !!(f && typeof f.v === 'string' && f.v >= String(val)) }
              if (attr === 'date_lte') { const f = entityFacts.find((f: any) => f.a === 'date'); return !!(f && typeof f.v === 'string' && f.v <= String(val)) }
              return !!entityFacts.find((f: any) => f.a === attr && f.v === val)
            }
            if (!applyFilter(filterAttr, filterVal)) { isMatch = false; break }
          }
          if (isMatch) matchingEntities.add(entityId)
        }
        relevantFacts = relevantFacts.filter((f: any) => matchingEntities.has(f.e))
      }

      const values = relevantFacts.map((f: any) => f.v as number)
      if (values.length === 0) return { attribute: args.attribute, aggregation: args.aggregation, namespace: args.namespace, filters: args.filters, result: null, count: 0 }

      let result: number
      switch (args.aggregation) {
        case 'sum': result = values.reduce((a, b) => a + b, 0); break
        case 'count': result = values.length; break
        case 'avg': result = values.reduce((a, b) => a + b, 0) / values.length; break
        case 'min': result = Math.min(...values); break
        case 'max': result = Math.max(...values); break
        default: return { error: `Unknown aggregation: ${args.aggregation}. Use: sum, count, avg, min, max` }
      }

      return { attribute: args.attribute, aggregation: args.aggregation, namespace: args.namespace, filters: args.filters, result, count: values.length }
    }
    default:
      return { error: `Unknown operation: ${args.operation}. Use: get_facts, get_links, get_backlinks, get_outgoing, find_by_attribute, aggregate` }
  }
}

async function queryGraphFromFiles(args: {
  operation: string; entityId?: string | null; attribute?: string | null
  value?: string | number | boolean | null; namespace?: string | null; aggregation?: string | null
  filters?: Record<string, any> | null; limit?: number | null
}): Promise<any> {
  const limit = args.limit || 100

  if (args.operation === 'get_facts' && args.entityId) {
    const entity = await getEntity(args.entityId)
    if (entity.error) return entity
    const facts = Object.entries(entity)
      .filter(([key]) => !['id', '@id', '@type', '@context'].includes(key))
      .map(([a, v]) => ({ attribute: a, value: v }))
    return { entityId: args.entityId, factCount: facts.length, facts: facts.slice(0, limit), source: 'file-fallback' }
  }

  if (args.operation === 'find_by_attribute' && args.attribute) {
    const namespaces = args.namespace ? [args.namespace] : Object.keys(NAMESPACE_FILES)
    const matches: any[] = []
    for (const ns of namespaces) {
      const filePath = NAMESPACE_FILES[ns]
      if (!filePath || filePath.startsWith('@notes')) continue
      const data = await readDataFile(filePath)
      const items = data?.items || data?.['@graph']
      if (!items) continue
      for (const item of items) {
        const attrValue = item[args.attribute!]
        if (args.value !== null && args.value !== undefined) {
          if (attrValue !== args.value) continue
        } else if (attrValue === undefined) {
          continue
        }
        matches.push({ id: item.id || item['@id'], ...item })
      }
    }
    return { attribute: args.attribute, value: args.value, namespace: args.namespace, matchCount: matches.length, entities: matches.slice(0, limit), source: 'file-fallback' }
  }

  return { error: 'TQL store not available. Limited to get_facts and find_by_attribute operations.', operation: args.operation, hint: 'Start the TQL runtime by opening the vault.' }
}
