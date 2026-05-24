import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'
import { migrateEntityToJSONLD, FILEGRAPH_CONTEXT_URL } from '../src/lib/jsonld'

const VAULT_PATH = process.argv[2] || '~/.filegraph'
const DRY_RUN = process.argv.includes('--dry-run')

interface MigrationStats {
  filesProcessed: number
  entitiesMigrated: number
  alreadyJSONLD: number
  errors: number
}

function isDataFile(filename: string): boolean {
  return filename.endsWith('.data')
}

function hasJSONLDContext(entity: any): boolean {
  return '@context' in entity || '@id' in entity || '@type' in entity
}

function migrateFile(filePath: string, stats: MigrationStats): void {
  try {
    const content = readFileSync(filePath, 'utf-8')
    const entities = JSON.parse(content)

    if (!Array.isArray(entities)) {
      console.warn(`⚠️  Skipping ${filePath}: not an array`)
      return
    }

    let modified = false
    const migratedEntities = entities.map((entity) => {
      if (hasJSONLDContext(entity)) {
        stats.alreadyJSONLD++
        return entity
      }

      stats.entitiesMigrated++
      modified = true

      const relativePath = filePath.replace(VAULT_PATH, '').replace(/^\//, '')
      return migrateEntityToJSONLD(entity, relativePath)
    })

    if (modified && !DRY_RUN) {
      const output = JSON.stringify(migratedEntities, null, 2)
      writeFileSync(filePath, output, 'utf-8')
      console.log(`✅ Migrated ${filePath}`)
    } else if (modified) {
      console.log(`🔍 Would migrate ${filePath} (dry run)`)
    }

    stats.filesProcessed++
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error)
    stats.errors++
  }
}

function walkDirectory(dir: string, stats: MigrationStats): void {
  const entries = readdirSync(dir)

  for (const entry of entries) {
    const fullPath = join(dir, entry)
    const stat = statSync(fullPath)

    if (stat.isDirectory()) {
      walkDirectory(fullPath, stats)
    } else if (isDataFile(entry)) {
      migrateFile(fullPath, stats)
    }
  }
}

function main() {
  console.log('🚀 Filegraph JSON-LD Migration Tool\n')
  console.log(`Vault: ${VAULT_PATH}`)
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}\n`)

  const stats: MigrationStats = {
    filesProcessed: 0,
    entitiesMigrated: 0,
    alreadyJSONLD: 0,
    errors: 0,
  }

  walkDirectory(VAULT_PATH, stats)

  console.log('\n📊 Migration Summary:')
  console.log(`Files processed: ${stats.filesProcessed}`)
  console.log(`Entities migrated: ${stats.entitiesMigrated}`)
  console.log(`Already JSON-LD: ${stats.alreadyJSONLD}`)
  console.log(`Errors: ${stats.errors}`)

  if (DRY_RUN) {
    console.log('\n💡 Run without --dry-run to apply changes')
  } else {
    console.log('\n✨ Migration complete!')
  }
}

main()
