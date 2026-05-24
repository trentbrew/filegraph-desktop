#!/usr/bin/env tsx
/**
 * TQL CLI - Node.js compatible version
 *
 * Directly scans filesystem and builds TQL index without Tauri
 */

import { EAVStore } from '../src/lib/tql/eav-store'
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
import { readdir, stat } from 'fs/promises'

const VAULT_PATH = join(homedir(), '.filegraph')
const APP_DATA_DIR = join(homedir(), '.filegraph', '.filegraph')

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

async function scanDirectory(dirPath: string): Promise<FileStats[]> {
  const results: FileStats[] = []

  try {
    const entries = await readdir(dirPath, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = join(dirPath, entry.name)

      // Skip hidden files
      if (isHidden(fullPath)) continue

      try {
        const stats = await stat(fullPath)
        const fileStats: FileStats = {
          path: fullPath,
          name: entry.name,
          file_type: entry.isDirectory() ? 'folder' : 'file',
          size: stats.size,
          modified: stats.mtimeMs,
          created: stats.birthtimeMs,
          extension: getExtension(fullPath) || undefined,
          is_hidden: isHidden(fullPath),
        }

        results.push(fileStats)

        // Recurse into directories
        if (entry.isDirectory()) {
          const children = await scanDirectory(fullPath)
          results.push(...children)
        }
      } catch (err) {
        console.error(`Failed to stat ${fullPath}:`, err)
      }
    }
  } catch (err) {
    console.error(`Failed to read directory ${dirPath}:`, err)
  }

  return results
}

async function buildIndex(vaultPath: string) {
  console.log(`\n📂 Scanning vault: ${vaultPath}\n`)

  const store = new EAVStore()
  const idManager = new EntityIdManager()

  // Load existing indexes if available
  try {
    await idManager.load(APP_DATA_DIR)
    console.log('✓ Loaded existing entity ID mappings\n')
  } catch {
    console.log('✓ Starting fresh index\n')
  }

  // Scan filesystem
  const startTime = Date.now()
  const files = await scanDirectory(vaultPath)
  const scanTime = Date.now() - startTime

  console.log(`Found ${files.length} items in ${(scanTime / 1000).toFixed(2)}s\n`)
  console.log('Building index...\n')

  // Index all files
  const indexStart = Date.now()
  for (const file of files) {
    const normalizedPath = normalizePath(file.path)
    const entityId = idManager.getOrCreateId(normalizedPath)

    // Create facts
    const facts = createFileFacts(entityId, file)
    store.addFacts(facts)

    // Create parent→child link
    const parentPath = getParentPath(normalizedPath)
    if (parentPath) {
      const parentId = idManager.getId(parentPath)
      if (parentId) {
        const link = createContainsLink(parentId, entityId)
        store.addLinks([link])
      }
    }
  }

  const indexTime = Date.now() - indexStart

  // Save indexes
  await idManager.save(APP_DATA_DIR)

  const stats = store.getStats()
  const idStats = idManager.getStats()

  console.log('✅ Index built successfully!\n')
  console.log('📊 Statistics:')
  console.log(`  Entities: ${stats.entityCount}`)
  console.log(`  Facts: ${stats.factCount}`)
  console.log(`  Links: ${stats.linkCount}`)
  console.log(`  Total Entities: ${idStats.totalEntities}`)
  console.log(`  Index Time: ${(indexTime / 1000).toFixed(2)}s`)
  console.log(`  Total Time: ${((Date.now() - startTime) / 1000).toFixed(2)}s\n`)

  return { store, idManager }
}

async function runQueries(store: EAVStore, idManager: EntityIdManager) {
  console.log('🔍 Sample Queries:\n')

  // Query 1: Find all .data files
  console.log('1️⃣  Find all .data files:')
  const allPaths = idManager.getAllPaths()
  const dataFiles = allPaths.filter((p) => p.endsWith('.data'))
  console.log(`   Found ${dataFiles.length} .data files\n`)

  dataFiles.slice(0, 5).forEach((path) => {
    const id = idManager.getId(path)
    const facts = store.getFactsByEntity(id!)
    const sizeFact = facts.find((f) => f.a === 'size')
    console.log(`   ${path.replace(VAULT_PATH, '~/.filegraph')}`)
    console.log(`     Entity ID: ${id}`)
    console.log(`     Size: ${sizeFact?.v || 'unknown'} bytes`)
  })

  if (dataFiles.length > 5) {
    console.log(`   ... and ${dataFiles.length - 5} more\n`)
  }

  // Query 2: Find all markdown files
  console.log('\n2️⃣  Find all markdown/note files:')
  const markdownFiles = allPaths.filter((p) => p.endsWith('.md') || p.endsWith('.note'))
  console.log(`   Found ${markdownFiles.length} markdown files\n`)

  markdownFiles.slice(0, 5).forEach((path) => {
    console.log(`   ${path.replace(VAULT_PATH, '~/.filegraph')}`)
  })

  if (markdownFiles.length > 5) {
    console.log(`   ... and ${markdownFiles.length - 5} more\n`)
  }

  // Query 3: Explore a specific entity
  console.log('\n3️⃣  Explore @entities/people.data:')
  const peoplePath = join(VAULT_PATH, '@entities', 'people.data')
  const peopleId = idManager.getId(normalizePath(peoplePath))

  if (peopleId) {
    const facts = store.getFactsByEntity(peopleId)
    console.log(`   Entity ID: ${peopleId}`)
    console.log('   Facts:')
    facts.forEach((f) => {
      console.log(`     ${f.a}: ${f.v}`)
    })

    const outgoing = store.getOutgoingLinks(peopleId)
    const incoming = store.getBacklinks(peopleId)
    console.log(`\n   Outgoing links: ${outgoing.length}`)
    console.log(`   Incoming links (backlinks): ${incoming.length}`)

    if (incoming.length > 0) {
      console.log('   Backlinks from:')
      incoming.slice(0, 3).forEach((link) => {
        const sourcePath = idManager.getPath(link.e1)
        console.log(`     ${link.a} <- ${sourcePath?.replace(VAULT_PATH, '~/.filegraph')}`)
      })
    }
  } else {
    console.log('   ⚠️  File not found in index')
  }

  // Query 4: Find files by extension
  console.log('\n4️⃣  Find files by extension (.json):')
  const jsonFiles = allPaths.filter((p) => p.endsWith('.json'))
  console.log(`   Found ${jsonFiles.length} JSON files\n`)

  jsonFiles.slice(0, 5).forEach((path) => {
    console.log(`   ${path.replace(VAULT_PATH, '~/.filegraph')}`)
  })

  // Query 5: Find largest files
  console.log('\n5️⃣  Find 5 largest files:')
  const filesWithSize: Array<{ path: string; size: number }> = []

  for (const path of allPaths) {
    const id = idManager.getId(path)
    if (id) {
      const facts = store.getFactsByEntity(id)
      const sizeFact = facts.find((f) => f.a === 'size')
      const typeFact = facts.find((f) => f.a === 'file_type')

      if (sizeFact && typeFact?.v === 'file') {
        filesWithSize.push({ path, size: sizeFact.v as number })
      }
    }
  }

  filesWithSize.sort((a, b) => b.size - a.size)
  filesWithSize.slice(0, 5).forEach(({ path, size }) => {
    const sizeKB = (size / 1024).toFixed(2)
    console.log(`   ${path.replace(VAULT_PATH, '~/.filegraph')} (${sizeKB} KB)`)
  })

  // Query 6: Explore directory structure
  console.log('\n6️⃣  Explore @entities directory:')
  const entitiesPath = join(VAULT_PATH, '@entities')
  const entitiesId = idManager.getId(normalizePath(entitiesPath))

  if (entitiesId) {
    const children = store.getOutgoingLinks(entitiesId).filter((link) => link.a === 'fs:contains')

    console.log(`   Contains ${children.length} items:`)
    children.forEach((link) => {
      const childPath = idManager.getPath(link.e2)
      const childId = link.e2
      const facts = store.getFactsByEntity(childId)
      const typeFact = facts.find((f) => f.a === 'file_type')
      const icon = typeFact?.v === 'folder' ? '📁' : '📄'

      console.log(`   ${icon} ${childPath?.split('/').pop()}`)
    })
  }
}

async function main() {
  console.log('🔍 TQL CLI - Filesystem Query Tool\n')

  try {
    const { store, idManager } = await buildIndex(VAULT_PATH)
    await runQueries(store, idManager)

    console.log('\n✨ Query complete!\n')
    console.log('💡 To run custom queries, use the store and idManager objects:')
    console.log('   - store.getFactsByEntity(entityId)')
    console.log('   - store.getBacklinks(entityId)')
    console.log('   - store.getOutgoingLinks(entityId)')
    console.log('   - idManager.getId(path)')
    console.log('   - idManager.getPath(entityId)')
    console.log('   - idManager.getAllPaths()\n')
  } catch (error) {
    console.error('\n❌ Error:', error)
    process.exit(1)
  }
}

main()
