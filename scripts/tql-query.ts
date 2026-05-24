#!/usr/bin/env tsx
/**
 * TQL Query CLI
 *
 * Run TQL queries against your vault from the command line.
 * Usage: pnpm tsx scripts/tql-query.ts [query]
 */

import { TQLRuntime } from '../src/lib/tql/runtime'
import { homedir } from 'os'
import { join } from 'path'

const VAULT_PATH = join(homedir(), '.filegraph')
const APP_DATA_DIR = join(homedir(), '.filegraph', '.filegraph')

async function main() {
  const args = process.argv.slice(2)

  console.log('🔍 TQL Query CLI\n')
  console.log(`Vault: ${VAULT_PATH}`)
  console.log(`App Data: ${APP_DATA_DIR}\n`)

  // Initialize runtime
  const runtime = new TQLRuntime()

  try {
    console.log('Initializing TQL runtime...')
    await runtime.initialize(APP_DATA_DIR)

    // Check if we need to scan
    const stats = runtime.getStats()
    console.log(`\nCurrent Index Stats:`)
    console.log(`  Entities: ${stats.entityCount}`)
    console.log(`  Facts: ${stats.factCount}`)
    console.log(`  Links: ${stats.linkCount}`)
    console.log(`  Indexed Paths: ${stats.indexedPaths}`)

    if (stats.entityCount === 0) {
      console.log('\n⚠️  No entities indexed. Running initial scan...\n')
      await runtime.initialScan(VAULT_PATH, (progress) => {
        const percent = ((progress.processed / progress.total) * 100).toFixed(1)
        const rate = progress.rate?.toFixed(0) || '?'
        const eta = progress.eta?.toFixed(0) || '?'
        process.stdout.write(
          `\r  ${progress.phase}: ${progress.processed}/${progress.total} (${percent}%) | ${rate} files/sec | ETA: ${eta}s`,
        )
      })
      console.log('\n\n✅ Scan complete!\n')

      const newStats = runtime.getStats()
      console.log(`Updated Index Stats:`)
      console.log(`  Entities: ${newStats.entityCount}`)
      console.log(`  Facts: ${newStats.factCount}`)
      console.log(`  Links: ${newStats.linkCount}`)
      console.log(`  Indexed Paths: ${newStats.indexedPaths}\n`)
    }

    // Interactive mode or single query
    if (args.length === 0) {
      console.log('\n📊 Available Query Methods:\n')
      console.log('Direct Store Access:')
      console.log('  runtime.getStore().getFactsByEntity(entityId)')
      console.log('  runtime.getStore().getBacklinks(entityId)')
      console.log('  runtime.getStore().getOutgoingLinks(entityId)')
      console.log('  runtime.getEntityIdManager().getId(path)')
      console.log('  runtime.getEntityIdManager().getPath(entityId)')

      console.log('\n💡 Examples:')
      console.log('  # Get entity ID for a path')
      console.log(
        '  const id = runtime.getEntityIdManager().getId("~/.filegraph/@entities/people.data")',
      )
      console.log('  ')
      console.log('  # Get facts for an entity')
      console.log('  const facts = runtime.getStore().getFactsByEntity(id)')
      console.log('  ')
      console.log('  # Get all backlinks to an entity')
      console.log('  const backlinks = runtime.getStore().getBacklinks(id)')

      console.log('\n🔧 Interactive REPL coming soon! For now, use the runtime directly in code.\n')

      // Show some sample queries
      console.log('📝 Sample Query Results:\n')

      // Find all .data files
      const allEntities = runtime.getEntityIdManager().getAllPaths()
      const dataFiles = allEntities.filter((path) => path.endsWith('.data'))
      console.log(`Found ${dataFiles.length} .data files:`)
      dataFiles.slice(0, 10).forEach((path) => {
        const id = runtime.getEntityIdManager().getId(path)
        console.log(`  ${path} -> ${id}`)
      })

      if (dataFiles.length > 10) {
        console.log(`  ... and ${dataFiles.length - 10} more`)
      }

      // Show some file stats
      console.log('\n📁 Sample File Facts:')
      const samplePath = dataFiles[0]
      if (samplePath) {
        const id = runtime.getEntityIdManager().getId(samplePath)
        if (id) {
          const facts = runtime.getStore().getFactsByEntity(id)
          console.log(`\n${samplePath}:`)
          facts.forEach((fact) => {
            console.log(`  ${fact.a}: ${fact.v}`)
          })

          // Show links
          const outgoing = runtime.getStore().getOutgoingLinks(id)
          const incoming = runtime.getStore().getBacklinks(id)
          console.log(`\n  Outgoing links: ${outgoing.length}`)
          console.log(`  Incoming links: ${incoming.length}`)
        }
      }
    } else {
      const query = args.join(' ')
      console.log(`\nExecuting query: ${query}\n`)

      // For now, just show that query parsing is not yet implemented
      console.log('⚠️  EQL-S query parsing not yet implemented.')
      console.log('Use direct store access methods for now (see examples above).\n')
    }
  } catch (error) {
    console.error('\n❌ Error:', error)
    process.exit(1)
  }
}

main()
