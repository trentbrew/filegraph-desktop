import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DEMO_DIR = path.join(__dirname, '../src/data/demo-files')

// Valid namespaces for entity IDs
const VALID_NAMESPACES = [
  'person',
  'org',
  'proj',
  'task',
  'ms',
  'acc',
  'tx',
  'bill',
  'goal',
  'note',
  'sub',
  'annual',
  'cat',
  'inc',
  'ins', // category, income, insurance
]

// ID pattern: namespace:slug:index (e.g., acc:checking:001)
const ID_PATTERN = /^([a-z]+):([a-z0-9-]+):(\d{3})$/

// Known non-reference strings that look like IDs
const IGNORE_LIST = [
  'in-progress',
  'debt-free',
  'fully-funded',
  'needs-attention',
  'on-track',
  'web-design',
  'client-meeting',
  'design-system',
  'above-line',
  'pretax',
  'itemized',
]

// Recursively get all .data files
function getFiles(dir) {
  const subdirs = fs.readdirSync(dir)
  const files = subdirs.map((subdir) => {
    const res = path.resolve(dir, subdir)
    return fs.statSync(res).isDirectory() ? getFiles(res) : res
  })
  return files.reduce((a, f) => a.concat(f), []).filter((f) => f.endsWith('.data'))
}

// Recursively get all .note and .md files
function getMarkdownFiles(dir) {
  const subdirs = fs.readdirSync(dir)
  const files = subdirs.map((subdir) => {
    const res = path.resolve(dir, subdir)
    return fs.statSync(res).isDirectory() ? getMarkdownFiles(res) : res
  })
  return files.reduce((a, f) => a.concat(f), []).filter((f) => f.endsWith('.note') || f.endsWith('.md'))
}

// Extract wikilinks from markdown content
function extractWikilinks(content) {
  const wikilinks = []
  // Match [[target]] or [[target|display]]
  const pattern = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g
  let match
  while ((match = pattern.exec(content)) !== null) {
    const target = match[1].trim()
    // Only include entity ID references (namespace:slug:index)
    if (ID_PATTERN.test(target)) {
      wikilinks.push(target)
    }
  }
  return wikilinks
}

function analyzeFiles() {
  const files = getFiles(DEMO_DIR)
  const idMap = new Map() // id -> { file, obj }
  const references = [] // { file, path, value }
  const entities = [] // { file, path, obj } - for schema validation
  let errors = 0

  console.log(`\n🔍 Scanning ${files.length} demo files...\n`)

  files.forEach((file) => {
    try {
      const content = fs.readFileSync(file, 'utf8')
      const data = JSON.parse(content)
      const relativePath = path.relative(DEMO_DIR, file)

      // Track collection @id (these use different format)
      if (data['@id']) {
        idMap.set(data['@id'], { file: relativePath, isCollection: true })
      }

      // Helper to traverse object
      function traverse(obj, pathStack = []) {
        if (!obj || typeof obj !== 'object') return

        if (Array.isArray(obj)) {
          obj.forEach((item, i) => traverse(item, [...pathStack, `[${i}]`]))
          return
        }

        // Check if this object has an entity ID
        if (obj.id && typeof obj.id === 'string') {
          const currentPath = [...pathStack, 'id'].join('.')

          // Check for duplicates
          if (idMap.has(obj.id)) {
            console.error(`❌ Duplicate ID: "${obj.id}" in ${relativePath} (already in ${idMap.get(obj.id).file})`)
            errors++
          }

          idMap.set(obj.id, { file: relativePath, obj })
          entities.push({ file: relativePath, path: currentPath, obj })
        }

        // Scan properties for references
        Object.entries(obj).forEach(([key, value]) => {
          if (key === 'id' || key === '@id') return
          const currentPath = [...pathStack, key].join('.')

          if (typeof value === 'string') {
            // Check if it looks like a reference (type:slug:index pattern)
            if (ID_PATTERN.test(value)) {
              references.push({ file: relativePath, path: currentPath, value })
            }
          } else if (typeof value === 'object') {
            traverse(value, [...pathStack, key])
          }
        })
      }

      traverse(data)
    } catch (err) {
      console.error(`❌ Parse error in ${file}: ${err.message}`)
      errors++
    }
  })

  // Also scan markdown files for wikilinks
  const mdFiles = getMarkdownFiles(DEMO_DIR)
  mdFiles.forEach((file) => {
    try {
      const content = fs.readFileSync(file, 'utf8')
      const relativePath = path.relative(DEMO_DIR, file)
      const wikilinks = extractWikilinks(content)

      wikilinks.forEach((target) => {
        references.push({ file: relativePath, path: 'wikilink', value: target })
      })
    } catch (err) {
      console.error(`❌ Read error in ${file}: ${err.message}`)
      errors++
    }
  })

  // === Validation Phase ===
  console.log(`📊 Found ${idMap.size} unique IDs`)
  console.log(`📊 Found ${entities.length} entities to validate`)
  console.log(`📊 Found ${references.length} references to check\n`)

  // 1. Validate ID format for all entities
  console.log('--- ID Format Validation ---')
  entities.forEach(({ file, path, obj }) => {
    const id = obj.id
    const match = ID_PATTERN.exec(id)

    if (!match) {
      console.error(`❌ Invalid ID format: "${id}" in ${file}`)
      console.error(`   Expected: namespace:slug:index (e.g., acc:checking:001)`)
      errors++
      return
    }

    const [, namespace, slug, index] = match

    // Check namespace is valid
    if (!VALID_NAMESPACES.includes(namespace)) {
      console.warn(`⚠️  Unknown namespace "${namespace}" in ID "${id}" (${file})`)
    }

    // Check slug property exists and matches
    if (!obj.slug) {
      console.error(`❌ Missing "slug" property for entity "${id}" in ${file}`)
      errors++
    } else if (obj.slug !== slug) {
      console.error(`❌ Slug mismatch: ID has "${slug}" but slug property is "${obj.slug}" in ${file}`)
      errors++
    }

    // Check display name property exists (name, title, or description)
    const hasDisplayName = obj.name || obj.title || obj.description
    if (!hasDisplayName) {
      console.error(`❌ Missing display name (name/title/description) for entity "${id}" in ${file}`)
      errors++
    }
  })

  // 2. Validate all references point to existing IDs
  console.log('\n--- Reference Validation ---')
  references.forEach((ref) => {
    if (IGNORE_LIST.includes(ref.value)) return
    if (/^\d{4}-\d{2}-\d{2}$/.test(ref.value)) return // Skip dates

    if (!idMap.has(ref.value)) {
      console.error(`❌ Broken reference: "${ref.value}" in ${ref.file} at ${ref.path}`)
      errors++
    }
  })

  // === Summary ===
  console.log('\n--- Summary ---')
  if (errors === 0) {
    console.log('✅ All validations passed!')
  } else {
    console.log(`❌ Found ${errors} error(s)`)
    process.exit(1)
  }
}

analyzeFiles()
