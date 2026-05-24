/**
 * Convert demo files from collection format to JSON-LD array format
 * This ensures new users get proper JSON-LD structure from onboarding
 */

import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const DEMO_FILES_DIR = join(__dirname, '../src/data/demo-files')

interface ConversionConfig {
  file: string
  itemsPath: string // Path to items array in collection format
  namespace: string
  type: string
}

const FILES_TO_CONVERT: ConversionConfig[] = [
  {
    file: '@entities/organizations.data',
    itemsPath: 'items',
    namespace: 'org',
    type: 'Organization',
  },
  {
    file: '@entities/projects.data',
    itemsPath: 'items',
    namespace: 'proj',
    type: 'Project',
  },
  {
    file: '@entities/tasks.data',
    itemsPath: 'items',
    namespace: 'task',
    type: 'Task',
  },
  {
    file: '@entities/milestones.data',
    itemsPath: 'items',
    namespace: 'ms',
    type: 'Milestone',
  },
  {
    file: '@finance/accounts.data',
    itemsPath: 'items',
    namespace: 'acc',
    type: 'Account',
  },
  {
    file: '@finance/bills.data',
    itemsPath: 'items',
    namespace: 'bill',
    type: 'Bill',
  },
  {
    file: '@finance/transactions.data',
    itemsPath: 'items',
    namespace: 'tx',
    type: 'Transaction',
  },
  {
    file: '@finance/goals.data',
    itemsPath: 'items',
    namespace: 'goal',
    type: 'Goal',
  },
]

function convertToJSONLD(config: ConversionConfig): void {
  const filePath = join(DEMO_FILES_DIR, config.file)

  try {
    const content = readFileSync(filePath, 'utf-8')
    const data = JSON.parse(content)

    // Check if already in array format
    if (Array.isArray(data)) {
      console.log(`✓ ${config.file} already in array format`)
      return
    }

    // Extract items from collection
    const items = data[config.itemsPath]
    if (!Array.isArray(items)) {
      console.warn(`⚠️  ${config.file}: No items array found`)
      return
    }

    // Convert each item to JSON-LD
    const jsonldItems = items.map((item: any) => {
      const { id, slug, organization, bio, ...rest } = item

      const jsonld: any = {
        '@context': 'https://filegraph.dev/context.jsonld',
        '@id': `fg:${id}`,
        '@type': ['Entity', config.type],
        id,
        slug,
        ...rest,
      }

      // Convert 'bio' to 'description' (Schema.org standard)
      if (bio) {
        jsonld.description = bio
      }

      // Convert 'organization' to 'worksFor' with fg: prefix
      if (organization) {
        jsonld.worksFor = `fg:${organization}`
      }

      return jsonld
    })

    // Write back as array
    writeFileSync(filePath, JSON.stringify(jsonldItems, null, 2) + '\n', 'utf-8')
    console.log(`✅ Converted ${config.file} (${jsonldItems.length} entities)`)
  } catch (error) {
    console.error(`❌ Failed to convert ${config.file}:`, error)
  }
}

function main() {
  console.log('🔄 Converting demo files to JSON-LD format...\n')

  FILES_TO_CONVERT.forEach(convertToJSONLD)

  console.log('\n✨ Conversion complete!')
  console.log('\nNext steps:')
  console.log('1. Review converted files')
  console.log('2. Test onboarding flow')
  console.log('3. Verify Schema Browser shows 100% compliance')
}

main()
