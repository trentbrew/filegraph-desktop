#!/usr/bin/env tsx
/**
 * TQL Complex Queries
 *
 * Runs complex queries and logs results to .filegraph/logs/
 */

import { EAVStore, type Fact, type Link } from '../src/lib/tql/eav-store'
import { EntityIdManager } from '../src/lib/tql/entity-ids'
import {
  createFileFacts,
  createContainsLink,
  normalizePath,
  isHidden,
  getExtension,
  getParentPath,
} from '../src/lib/tql/facts'
import { homedir } from 'os'
import { join } from 'path'
import { readdir, stat, mkdir, writeFile, readFile } from 'fs/promises'

const VAULT_PATH = join(homedir(), '.filegraph')
const LOGS_DIR = join(VAULT_PATH, '.filegraph', 'logs')
const LOG_FILE = join(LOGS_DIR, `tql-queries-${new Date().toISOString().replace(/[:.]/g, '-')}.log`)

interface FileStats {
  path: string
  name: string
  file_type: 'file' | 'folder'
  size: number
  modified: number
  created: number
  extension?: string
  is_hidden: boolean
}

interface QueryLog {
  timestamp: string
  query: string
  description: string
  duration_ms: number
  result_count: number
  raw_output: any
}

const logs: QueryLog[] = []

function log(query: string, description: string, duration: number, resultCount: number, rawOutput: any) {
  const entry: QueryLog = {
    timestamp: new Date().toISOString(),
    query,
    description,
    duration_ms: duration,
    result_count: resultCount,
    raw_output: rawOutput,
  }
  logs.push(entry)

  console.log(`\n${'═'.repeat(80)}`)
  console.log(`📝 ${description}`)
  console.log(`${'─'.repeat(80)}`)
  console.log(`QUERY: ${query}`)
  console.log(`${'─'.repeat(80)}`)
  console.log(`Results: ${resultCount} | Duration: ${duration.toFixed(2)}ms`)
  console.log(`${'─'.repeat(80)}`)
}

async function scanDirectory(dirPath: string): Promise<FileStats[]> {
  const results: FileStats[] = []

  try {
    const entries = await readdir(dirPath, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = join(dirPath, entry.name)
      if (isHidden(fullPath)) continue

      try {
        const stats = await stat(fullPath)
        results.push({
          path: fullPath,
          name: entry.name,
          file_type: entry.isDirectory() ? 'folder' : 'file',
          size: stats.size,
          modified: stats.mtimeMs,
          created: stats.birthtimeMs,
          extension: getExtension(fullPath) || undefined,
          is_hidden: isHidden(fullPath),
        })

        if (entry.isDirectory()) {
          const children = await scanDirectory(fullPath)
          results.push(...children)
        }
      } catch {}
    }
  } catch {}

  return results
}

async function buildIndex(vaultPath: string) {
  const store = new EAVStore()
  const idManager = new EntityIdManager()

  const files = await scanDirectory(vaultPath)

  for (const file of files) {
    const normalizedPath = normalizePath(file.path)
    const entityId = idManager.getOrCreateId(normalizedPath)
    const facts = createFileFacts(entityId, file)
    store.addFacts(facts)

    const parentPath = getParentPath(normalizedPath)
    if (parentPath) {
      const parentId = idManager.getId(parentPath)
      if (parentId) {
        store.addLinks([createContainsLink(parentId, entityId)])
      }
    }
  }

  return { store, idManager, fileCount: files.length }
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPLEX QUERIES
// ═══════════════════════════════════════════════════════════════════════════

async function query1_FindAllDataFiles(store: EAVStore, idManager: EntityIdManager) {
  const start = performance.now()

  const query = `
SELECT ?path ?size ?modified
WHERE {
  ?entity :type "file" .
  ?entity :ext "data" .
  ?entity :path ?path .
  ?entity :size ?size .
  ?entity :modified ?modified .
}`

  // Actual implementation using store methods
  const allPaths = idManager.getAllPaths()
  const results: Array<{ path: string; size: number; modified: number; entityId: string }> = []

  for (const path of allPaths) {
    if (!path.endsWith('.data')) continue
    const id = idManager.getId(path)
    if (!id) continue

    const facts = store.getFactsByEntity(id)
    const sizeFact = facts.find((f) => f.a === 'size')
    const modifiedFact = facts.find((f) => f.a === 'modified')

    results.push({
      path: path.replace(VAULT_PATH, '~'),
      size: (sizeFact?.v as number) || 0,
      modified: (modifiedFact?.v as number) || 0,
      entityId: id,
    })
  }

  const duration = performance.now() - start
  log(query.trim(), 'Find all .data files with size and modified date', duration, results.length, results)

  return results
}

async function query2_FindEntitiesByNamespace(store: EAVStore, idManager: EntityIdManager) {
  const start = performance.now()

  const query = `
SELECT ?namespace ?count
WHERE {
  ?entity :path ?path .
  BIND(REGEX_EXTRACT(?path, "@([^/]+)/") AS ?namespace)
}
GROUP BY ?namespace`

  const allPaths = idManager.getAllPaths()
  const namespaceCounts: Record<string, { count: number; files: string[] }> = {}

  for (const path of allPaths) {
    const match = path.match(/@([^/]+)\//)
    if (match) {
      const ns = match[1]
      if (!namespaceCounts[ns]) {
        namespaceCounts[ns] = { count: 0, files: [] }
      }
      namespaceCounts[ns].count++
      if (namespaceCounts[ns].files.length < 5) {
        namespaceCounts[ns].files.push(path.replace(VAULT_PATH, '~'))
      }
    }
  }

  const duration = performance.now() - start
  const resultCount = Object.keys(namespaceCounts).length
  log(query.trim(), 'Count entities by @ namespace', duration, resultCount, namespaceCounts)

  return namespaceCounts
}

async function query3_FindLargestFilesByExtension(store: EAVStore, idManager: EntityIdManager) {
  const start = performance.now()

  const query = `
SELECT ?ext ?path ?size
WHERE {
  ?entity :type "file" .
  ?entity :ext ?ext .
  ?entity :path ?path .
  ?entity :size ?size .
}
ORDER BY DESC(?size)
LIMIT 10`

  const allPaths = idManager.getAllPaths()
  const filesWithSize: Array<{ ext: string; path: string; size: number }> = []

  for (const path of allPaths) {
    const id = idManager.getId(path)
    if (!id) continue

    const facts = store.getFactsByEntity(id)
    const typeFact = facts.find((f) => f.a === 'type')
    if (typeFact?.v !== 'file') continue

    const extFact = facts.find((f) => f.a === 'ext')
    const sizeFact = facts.find((f) => f.a === 'size')

    if (extFact && sizeFact) {
      filesWithSize.push({
        ext: extFact.v as string,
        path: path.replace(VAULT_PATH, '~'),
        size: sizeFact.v as number,
      })
    }
  }

  filesWithSize.sort((a, b) => b.size - a.size)
  const top10 = filesWithSize.slice(0, 10)

  const duration = performance.now() - start
  log(query.trim(), 'Find 10 largest files by extension', duration, top10.length, top10)

  return top10
}

async function query4_TraverseDirectoryTree(store: EAVStore, idManager: EntityIdManager) {
  const start = performance.now()

  const query = `
SELECT ?parent ?child ?depth
WHERE {
  ?parent :type "folder" .
  ?parent fs:contains+ ?child .
  BIND(DEPTH(?parent, ?child) AS ?depth)
}
STARTING FROM "@entities"`

  const entitiesPath = normalizePath(join(VAULT_PATH, '@entities'))
  const entitiesId = idManager.getId(entitiesPath)

  const tree: Array<{ parent: string; child: string; depth: number; childType: string }> = []

  function traverse(parentId: string, parentPath: string, depth: number) {
    const children = store.getOutgoingLinks(parentId).filter((l) => l.a === 'fs:contains')

    for (const link of children) {
      const childPath = idManager.getPath(link.e2)
      if (!childPath) continue

      const childFacts = store.getFactsByEntity(link.e2)
      const typeFact = childFacts.find((f) => f.a === 'file_type')

      tree.push({
        parent: parentPath.replace(VAULT_PATH, '~'),
        child: childPath.replace(VAULT_PATH, '~'),
        depth,
        childType: (typeFact?.v as string) || 'unknown',
      })

      if (typeFact?.v === 'folder') {
        traverse(link.e2, childPath, depth + 1)
      }
    }
  }

  if (entitiesId) {
    traverse(entitiesId, entitiesPath, 1)
  }

  const duration = performance.now() - start
  log(query.trim(), 'Traverse @entities directory tree with depth', duration, tree.length, tree)

  return tree
}

async function query5_FindBacklinksToEntity(store: EAVStore, idManager: EntityIdManager) {
  const start = performance.now()

  const query = `
SELECT ?source ?relationship ?target
WHERE {
  ?source ?relationship <@entities/people.data> .
}`

  const peoplePath = normalizePath(join(VAULT_PATH, '@entities', 'people.data'))
  const peopleId = idManager.getId(peoplePath)

  const backlinks: Array<{ source: string; relationship: string; target: string }> = []

  if (peopleId) {
    const links = store.getBacklinks(peopleId)

    for (const link of links) {
      const sourcePath = idManager.getPath(link.e1)
      backlinks.push({
        source: sourcePath?.replace(VAULT_PATH, '~') || link.e1,
        relationship: link.a,
        target: '~/@entities/people.data',
      })
    }
  }

  const duration = performance.now() - start
  log(query.trim(), 'Find all backlinks to @entities/people.data', duration, backlinks.length, backlinks)

  return backlinks
}

async function query6_AggregateByFileType(store: EAVStore, idManager: EntityIdManager) {
  const start = performance.now()

  const query = `
SELECT ?ext (COUNT(?entity) AS ?count) (SUM(?size) AS ?total_size) (AVG(?size) AS ?avg_size)
WHERE {
  ?entity :type "file" .
  ?entity :ext ?ext .
  ?entity :size ?size .
}
GROUP BY ?ext
ORDER BY DESC(?count)`

  const allPaths = idManager.getAllPaths()
  const byExt: Record<string, { count: number; totalSize: number; files: string[] }> = {}

  for (const path of allPaths) {
    const id = idManager.getId(path)
    if (!id) continue

    const facts = store.getFactsByEntity(id)
    const typeFact = facts.find((f) => f.a === 'type')
    if (typeFact?.v !== 'file') continue

    const extFact = facts.find((f) => f.a === 'ext')
    const sizeFact = facts.find((f) => f.a === 'size')

    const ext = (extFact?.v as string) || '(no ext)'

    if (!byExt[ext]) {
      byExt[ext] = { count: 0, totalSize: 0, files: [] }
    }

    byExt[ext].count++
    byExt[ext].totalSize += (sizeFact?.v as number) || 0
    if (byExt[ext].files.length < 3) {
      byExt[ext].files.push(path.replace(VAULT_PATH, '~'))
    }
  }

  const results = Object.entries(byExt)
    .map(([ext, data]) => ({
      ext,
      count: data.count,
      total_size_kb: (data.totalSize / 1024).toFixed(2),
      avg_size_kb: (data.totalSize / data.count / 1024).toFixed(2),
      sample_files: data.files,
    }))
    .sort((a, b) => b.count - a.count)

  const duration = performance.now() - start
  log(query.trim(), 'Aggregate files by extension with size stats', duration, results.length, results)

  return results
}

async function query7_FindRecentlyModified(store: EAVStore, idManager: EntityIdManager) {
  const start = performance.now()

  const query = `
SELECT ?path ?modified ?age_hours
WHERE {
  ?entity :type "file" .
  ?entity :path ?path .
  ?entity :modified ?modified .
  BIND((NOW() - ?modified) / 3600000 AS ?age_hours)
}
ORDER BY DESC(?modified)
LIMIT 10`

  const allPaths = idManager.getAllPaths()
  const now = Date.now()
  const filesWithModified: Array<{ path: string; modified: number; age_hours: number }> = []

  for (const path of allPaths) {
    const id = idManager.getId(path)
    if (!id) continue

    const facts = store.getFactsByEntity(id)
    const typeFact = facts.find((f) => f.a === 'type')
    if (typeFact?.v !== 'file') continue

    const modifiedFact = facts.find((f) => f.a === 'modified')
    if (modifiedFact) {
      const modified = modifiedFact.v as number
      filesWithModified.push({
        path: path.replace(VAULT_PATH, '~'),
        modified,
        age_hours: parseFloat(((now - modified) / 3600000).toFixed(2)),
      })
    }
  }

  filesWithModified.sort((a, b) => b.modified - a.modified)
  const recent10 = filesWithModified.slice(0, 10).map((f) => ({
    ...f,
    modified_date: new Date(f.modified).toISOString(),
  }))

  const duration = performance.now() - start
  log(query.trim(), 'Find 10 most recently modified files', duration, recent10.length, recent10)

  return recent10
}

async function query8_GraphPathBetweenEntities(store: EAVStore, idManager: EntityIdManager) {
  const start = performance.now()

  const query = `
SELECT ?path
WHERE {
  <~/.filegraph> fs:contains* ?intermediate .
  ?intermediate fs:contains* <~/@entities/people.data> .
}`

  const rootPath = normalizePath(VAULT_PATH)
  const targetPath = normalizePath(join(VAULT_PATH, '@entities', 'people.data'))

  const rootId = idManager.getId(rootPath)
  const targetId = idManager.getId(targetPath)

  const pathToTarget: string[] = []

  if (rootId && targetId) {
    // BFS to find path
    const queue: Array<{ id: string; path: string[] }> = [{ id: rootId, path: [rootPath] }]
    const visited = new Set<string>()

    while (queue.length > 0) {
      const current = queue.shift()!
      if (visited.has(current.id)) continue
      visited.add(current.id)

      if (current.id === targetId) {
        pathToTarget.push(...current.path)
        break
      }

      const children = store.getOutgoingLinks(current.id).filter((l) => l.a === 'fs:contains')
      for (const link of children) {
        const childPath = idManager.getPath(link.e2)
        if (childPath && !visited.has(link.e2)) {
          queue.push({ id: link.e2, path: [...current.path, childPath] })
        }
      }
    }
  }

  const result = {
    from: '~/.filegraph',
    to: '~/@entities/people.data',
    path: pathToTarget.map((p) => p.replace(VAULT_PATH, '~')),
    depth: pathToTarget.length - 1,
  }

  const duration = performance.now() - start
  log(query.trim(), 'Find graph path from vault root to people.data', duration, 1, result)

  return result
}

async function query9_ReadDataFileContents(store: EAVStore, idManager: EntityIdManager) {
  const start = performance.now()

  const query = `
SELECT ?entity_id ?entity_name ?entity_type
FROM <@entities/people.data>
WHERE {
  ?entity a :Person .
  ?entity :name ?entity_name .
}`

  const peoplePath = join(VAULT_PATH, '@entities', 'people.data')
  let entities: any[] = []

  try {
    const content = await readFile(peoplePath, 'utf-8')
    const data = JSON.parse(content)

    if (data['@graph']) {
      entities = data['@graph'].map((entity: any) => ({
        id: entity['@id'] || entity.id,
        name: entity.name,
        type: entity['@type'] || 'Person',
        slug: entity.slug,
      }))
    }
  } catch (err) {
    entities = [{ error: String(err) }]
  }

  const duration = performance.now() - start
  log(query.trim(), 'Read and parse @entities/people.data contents', duration, entities.length, entities)

  return entities
}

async function query10_CrossReferenceDataFiles(store: EAVStore, idManager: EntityIdManager) {
  const start = performance.now()

  const query = `
SELECT ?data_file ?entity_count ?has_graph ?sample_ids
FROM <@entities/*.data>
WHERE {
  ?data_file :ext "data" .
  ?data_file CONTAINS ?graph .
  BIND(COUNT(?graph.entities) AS ?entity_count)
}`

  const entitiesDir = join(VAULT_PATH, '@entities')
  const dataFiles: Array<{
    file: string
    entity_count: number
    has_graph: boolean
    sample_ids: string[]
    types: string[]
  }> = []

  try {
    const entries = await readdir(entitiesDir)

    for (const entry of entries) {
      if (!entry.endsWith('.data')) continue

      const filePath = join(entitiesDir, entry)
      try {
        const content = await readFile(filePath, 'utf-8')
        const data = JSON.parse(content)

        const graph = data['@graph'] || []
        const hasGraph = '@graph' in data
        const sampleIds = graph.slice(0, 3).map((e: any) => e['@id'] || e.id || 'unknown')
        const types = [...new Set(graph.map((e: any) => e['@type']).filter(Boolean))]

        dataFiles.push({
          file: entry,
          entity_count: graph.length,
          has_graph: hasGraph,
          sample_ids: sampleIds,
          types: types as string[],
        })
      } catch {}
    }
  } catch {}

  const duration = performance.now() - start
  log(query.trim(), 'Cross-reference all @entities/*.data files', duration, dataFiles.length, dataFiles)

  return dataFiles
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('🔍 TQL Complex Queries\n')
  console.log(`Vault: ${VAULT_PATH}`)
  console.log(`Log file: ${LOG_FILE}\n`)

  // Ensure logs directory exists
  await mkdir(LOGS_DIR, { recursive: true })

  // Build index
  console.log('Building index...')
  const { store, idManager, fileCount } = await buildIndex(VAULT_PATH)
  console.log(`✓ Indexed ${fileCount} files\n`)

  // Run all queries
  await query1_FindAllDataFiles(store, idManager)
  await query2_FindEntitiesByNamespace(store, idManager)
  await query3_FindLargestFilesByExtension(store, idManager)
  await query4_TraverseDirectoryTree(store, idManager)
  await query5_FindBacklinksToEntity(store, idManager)
  await query6_AggregateByFileType(store, idManager)
  await query7_FindRecentlyModified(store, idManager)
  await query8_GraphPathBetweenEntities(store, idManager)
  await query9_ReadDataFileContents(store, idManager)
  await query10_CrossReferenceDataFiles(store, idManager)

  // Write log file
  const logContent = JSON.stringify(logs, null, 2)
  await writeFile(LOG_FILE, logContent)

  console.log(`\n${'═'.repeat(80)}`)
  console.log(`✅ Completed ${logs.length} queries`)
  console.log(`📄 Full logs written to: ${LOG_FILE}`)
  console.log(`${'═'.repeat(80)}\n`)
}

main().catch(console.error)
