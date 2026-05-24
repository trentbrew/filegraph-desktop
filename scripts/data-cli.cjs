#!/usr/bin/env node
/**
 * Filegraph Data CLI
 *
 * CRUD operations for .data files with reference validation.
 *
 * Usage:
 *   node scripts/data-cli.js list <file.data>
 *   node scripts/data-cli.js get <file.data> <entity-id>
 *   node scripts/data-cli.js add <file.data> --id <id> --name <name> [--field value...]
 *   node scripts/data-cli.js update <file.data> <entity-id> --field value [--field value...]
 *   node scripts/data-cli.js delete <file.data> <entity-id>
 *   node scripts/data-cli.js validate <file.data>
 *   node scripts/data-cli.js refs <vault-path>
 */

const fs = require('fs')
const path = require('path')

// Global options
let outputFormat = 'human' // 'human' or 'json'
let vaultRoot = null // Will be detected from file path

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
}

/**
 * Output result in appropriate format
 */
function output(data) {
  if (outputFormat === 'json') {
    console.log(JSON.stringify(data, null, 2))
  }
}

/**
 * Output error in appropriate format
 */
function outputError(code, message, details = {}) {
  if (outputFormat === 'json') {
    console.log(
      JSON.stringify(
        {
          success: false,
          error: { code, message, details },
        },
        null,
        2,
      ),
    )
  } else {
    console.error(`${colors.red}${message}${colors.reset}`)
    if (details.invalid_refs) {
      details.invalid_refs.forEach((ref) => {
        const suggestions = details.suggestions?.[ref]
        if (suggestions && suggestions.length > 0) {
          console.error(`  ${colors.yellow}${ref}${colors.reset} → Did you mean: ${suggestions.join(', ')}?`)
        } else {
          console.error(`  ${colors.yellow}${ref}${colors.reset} → No similar IDs found`)
        }
      })
    }
  }
  process.exit(1)
}

/**
 * Detect vault root from file path
 */
function detectVaultRoot(filePath) {
  const absPath = path.resolve(filePath)
  let dir = path.dirname(absPath)

  // Walk up looking for .filegraph directory
  while (dir !== path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, '.filegraph'))) {
      return dir
    }
    // Check if we're in a namespace directory
    const base = path.basename(dir)
    if (base.startsWith('@')) {
      return path.dirname(dir)
    }
    dir = path.dirname(dir)
  }

  // Fallback to parent of file
  return path.dirname(path.dirname(absPath))
}

// Entity ID pattern: namespace:slug:index
const ENTITY_ID_PATTERN = /^([a-z]+):([a-z0-9-]+):(\d{3})$/i

// Namespace registry (RFC-002)
const NAMESPACE_REGISTRY = {
  person: '@entities/people.data',
  org: '@entities/organizations.data',
  proj: '@entities/projects.data',
  task: '@entities/tasks.data',
  ms: '@entities/milestones.data',
  acc: '@finance/accounts.data',
  tx: '@finance/transactions.data',
  bill: '@finance/bills.data',
  goal: '@finance/goals.data',
  inc: '@finance/income.data',
  ins: '@finance/insurance.data',
  exp: '@finance/expenses.data',
  tax: '@finance/taxes.data',
}

/**
 * Read and parse a .data file
 */
function readDataFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8')
  return JSON.parse(content)
}

/**
 * Write a .data file with pretty formatting
 */
function writeDataFile(filePath, data) {
  const content = JSON.stringify(data, null, 2)
  fs.writeFileSync(filePath, content + '\n')
}

/**
 * Find the items array in a data document
 */
function findItemsArray(doc) {
  if (Array.isArray(doc.items)) return { key: 'items', array: doc.items }
  if (Array.isArray(doc.members)) return { key: 'members', array: doc.members }
  if (Array.isArray(doc.entries)) return { key: 'entries', array: doc.entries }
  if (Array.isArray(doc.nodes)) return { key: 'nodes', array: doc.nodes }

  // Look for any array property
  for (const [key, value] of Object.entries(doc)) {
    if (Array.isArray(value) && !key.startsWith('@')) {
      return { key, array: value }
    }
  }

  return { key: null, array: [] }
}

/**
 * Get entity ID from an item
 */
function getEntityId(item) {
  return item.id || item['@id']
}

/**
 * List all entities in a file
 */
function listEntities(filePath) {
  const doc = readDataFile(filePath)
  const { array } = findItemsArray(doc)

  console.log(`${colors.cyan}${path.basename(filePath)}${colors.reset} (${array.length} entities)\n`)

  array.forEach((item, index) => {
    const id = getEntityId(item)
    const name = item.name || item.title || item.label || item.description || '(unnamed)'
    console.log(`  ${colors.dim}${index + 1}.${colors.reset} ${colors.green}${id}${colors.reset}`)
    console.log(`     ${name}`)
  })
}

/**
 * Get a specific entity by ID
 */
function getEntity(filePath, entityId) {
  const doc = readDataFile(filePath)
  const { array } = findItemsArray(doc)

  const entity = array.find((item) => getEntityId(item) === entityId)

  if (!entity) {
    console.error(`${colors.red}Entity not found: ${entityId}${colors.reset}`)
    process.exit(1)
  }

  console.log(JSON.stringify(entity, null, 2))
}

/**
 * Validate references in an entity object against known IDs
 * Returns { valid: boolean, invalid: string[], suggestions: Map<string, string[]> }
 */
function validateEntityRefs(entity, knownIds) {
  const refs = new Set()

  function traverse(obj) {
    if (typeof obj === 'string') {
      if (ENTITY_ID_PATTERN.test(obj)) {
        refs.add(obj)
      }
    } else if (Array.isArray(obj)) {
      obj.forEach(traverse)
    } else if (typeof obj === 'object' && obj !== null) {
      for (const [key, value] of Object.entries(obj)) {
        if (key.startsWith('@') || key === 'id' || key === 'slug') continue
        traverse(value)
      }
    }
  }

  traverse(entity)

  const invalid = []
  const suggestions = new Map()

  refs.forEach((ref) => {
    if (!knownIds.has(ref)) {
      invalid.push(ref)
      // Find similar IDs
      const namespace = ref.split(':')[0]
      const similar = Array.from(knownIds.keys())
        .filter((id) => id.startsWith(namespace + ':'))
        .slice(0, 3)
      if (similar.length > 0) {
        suggestions.set(ref, similar)
      }
    }
  })

  return { valid: invalid.length === 0, invalid, suggestions }
}

/**
 * Add a new entity
 */
function addEntity(filePath, fields, options = {}) {
  const doc = readDataFile(filePath)
  const { key, array } = findItemsArray(doc)

  if (!key) {
    outputError('NO_ITEMS_ARRAY', 'Cannot find items array in file')
  }

  // Auto-generate ID if namespace and slug provided
  if (!fields.id && fields.namespace && fields.slug) {
    fields.id = generateNextId(filePath, fields.namespace, fields.slug)
    delete fields.namespace
  }

  // Validate required id field
  if (!fields.id) {
    outputError('MISSING_ID', 'Missing required --id field (or --namespace and --slug for auto-generation)')
  }

  // Validate ID format
  if (!ENTITY_ID_PATTERN.test(fields.id)) {
    outputError('INVALID_ID_FORMAT', 'Invalid entity ID format. Use: namespace:slug:index (e.g., person:john:001)')
  }

  // Check for duplicate ID
  if (array.some((item) => getEntityId(item) === fields.id)) {
    outputError('DUPLICATE_ID', `Entity with ID ${fields.id} already exists`)
  }

  // Extract slug from ID
  const match = fields.id.match(ENTITY_ID_PATTERN)
  if (match) {
    fields.slug = match[2]
  }

  // Validate references unless --skip-validation
  if (!options.skipValidation) {
    const vault = vaultRoot || detectVaultRoot(filePath)
    const knownIds = findAllEntityIds(vault)
    // Add IDs from current file
    array.forEach((item) => {
      const id = getEntityId(item)
      if (id) knownIds.set(id, { file: 'current' })
    })
    // Add the new entity's ID
    knownIds.set(fields.id, { file: 'current' })

    const validation = validateEntityRefs(fields, knownIds)
    if (!validation.valid) {
      const suggestionsList = {}
      validation.suggestions.forEach((v, k) => {
        suggestionsList[k] = v
      })
      outputError('INVALID_REFERENCE', `Entity contains invalid references: ${validation.invalid.join(', ')}`, {
        invalid_refs: validation.invalid,
        suggestions: suggestionsList,
      })
    }
  }

  // Add entity
  array.push(fields)
  writeDataFile(filePath, doc)

  if (outputFormat === 'json') {
    output({ success: true, command: 'data.add', result: { id: fields.id, file: filePath } })
  } else {
    console.log(`${colors.green}✓ Added entity: ${fields.id}${colors.reset}`)
  }
}

/**
 * Update an existing entity
 */
function updateEntity(filePath, entityId, updates, options = {}) {
  const doc = readDataFile(filePath)
  const { array } = findItemsArray(doc)

  const index = array.findIndex((item) => getEntityId(item) === entityId)

  if (index === -1) {
    outputError('ENTITY_NOT_FOUND', `Entity not found: ${entityId}`)
  }

  // Create merged entity for validation
  const merged = { ...array[index], ...updates }

  // Validate references unless --skip-validation
  if (!options.skipValidation) {
    const vault = vaultRoot || detectVaultRoot(filePath)
    const knownIds = findAllEntityIds(vault)
    // Add IDs from current file
    array.forEach((item) => {
      const id = getEntityId(item)
      if (id) knownIds.set(id, { file: 'current' })
    })

    const validation = validateEntityRefs(merged, knownIds)
    if (!validation.valid) {
      const suggestionsList = {}
      validation.suggestions.forEach((v, k) => {
        suggestionsList[k] = v
      })
      outputError('INVALID_REFERENCE', `Update contains invalid references: ${validation.invalid.join(', ')}`, {
        invalid_refs: validation.invalid,
        suggestions: suggestionsList,
      })
    }
  }

  // Apply update
  array[index] = merged
  writeDataFile(filePath, doc)

  if (outputFormat === 'json') {
    output({ success: true, command: 'data.update', result: { id: entityId, file: filePath } })
  } else {
    console.log(`${colors.green}✓ Updated entity: ${entityId}${colors.reset}`)
  }
}

/**
 * Delete an entity
 */
function deleteEntity(filePath, entityId) {
  const doc = readDataFile(filePath)
  const { key, array } = findItemsArray(doc)

  const index = array.findIndex((item) => getEntityId(item) === entityId)

  if (index === -1) {
    console.error(`${colors.red}Entity not found: ${entityId}${colors.reset}`)
    process.exit(1)
  }

  array.splice(index, 1)
  writeDataFile(filePath, doc)

  console.log(`${colors.green}✓ Deleted entity: ${entityId}${colors.reset}`)
}

/**
 * Find all entity IDs in the vault
 */
function findAllEntityIds(vaultPath) {
  const entityIds = new Map() // id -> { file, name }

  function scanDir(dirPath) {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name)

      if (entry.isDirectory() && !entry.name.startsWith('.')) {
        scanDir(fullPath)
      } else if (entry.name.endsWith('.data')) {
        try {
          const doc = readDataFile(fullPath)
          const { array } = findItemsArray(doc)
          const relPath = path.relative(vaultPath, fullPath)

          array.forEach((item) => {
            const id = getEntityId(item)
            if (id && ENTITY_ID_PATTERN.test(id)) {
              entityIds.set(id, {
                file: relPath,
                name: item.name || item.title || item.label || '(unnamed)',
              })
            }
          })
        } catch (e) {
          // Skip unparseable files
        }
      }
    }
  }

  scanDir(vaultPath)
  return entityIds
}

/**
 * Find all references in a document
 */
function findReferencesInDoc(doc) {
  const refs = new Set()

  function traverse(obj) {
    if (typeof obj === 'string') {
      if (ENTITY_ID_PATTERN.test(obj)) {
        refs.add(obj)
      }
    } else if (Array.isArray(obj)) {
      obj.forEach(traverse)
    } else if (typeof obj === 'object' && obj !== null) {
      for (const [key, value] of Object.entries(obj)) {
        // Skip metadata fields
        if (key.startsWith('@') || key === 'id' || key === 'slug') continue
        traverse(value)
      }
    }
  }

  traverse(doc)
  return refs
}

/**
 * Validate references in a file
 */
function validateFile(filePath, vaultPath) {
  const doc = readDataFile(filePath)
  const refs = findReferencesInDoc(doc)

  // Get all known entity IDs
  const vault = vaultPath || path.dirname(filePath)
  const knownIds = findAllEntityIds(vault)

  // Add IDs defined in this file
  const { array } = findItemsArray(doc)
  array.forEach((item) => {
    const id = getEntityId(item)
    if (id) knownIds.set(id, { file: 'current', name: item.name || '(self)' })
  })

  const missing = []
  refs.forEach((ref) => {
    if (!knownIds.has(ref)) {
      missing.push(ref)
    }
  })

  console.log(`${colors.cyan}${path.basename(filePath)}${colors.reset}`)
  console.log(`  References: ${refs.size}`)

  if (missing.length === 0) {
    console.log(`  ${colors.green}✓ All references valid${colors.reset}`)
  } else {
    console.log(`  ${colors.red}✗ Missing references: ${missing.length}${colors.reset}`)
    missing.forEach((ref) => {
      const namespace = ref.split(':')[0]
      const suggestedFile = NAMESPACE_REGISTRY[namespace] || 'unknown'
      console.log(`    ${colors.yellow}${ref}${colors.reset} → ${suggestedFile}`)
    })
    process.exit(1)
  }
}

/**
 * Show all references across the vault
 */
function showVaultRefs(vaultPath) {
  const knownIds = findAllEntityIds(vaultPath)
  const allRefs = new Map() // ref -> [{ file, context }]
  const brokenRefs = []

  function scanDir(dirPath) {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name)

      if (entry.isDirectory() && !entry.name.startsWith('.')) {
        scanDir(fullPath)
      } else if (entry.name.endsWith('.data')) {
        try {
          const doc = readDataFile(fullPath)
          const refs = findReferencesInDoc(doc)
          const relPath = path.relative(vaultPath, fullPath)

          refs.forEach((ref) => {
            if (!allRefs.has(ref)) allRefs.set(ref, [])
            allRefs.get(ref).push(relPath)

            if (!knownIds.has(ref)) {
              brokenRefs.push({ ref, file: relPath })
            }
          })
        } catch (e) {
          // Skip unparseable files
        }
      }
    }
  }

  scanDir(vaultPath)

  console.log(`${colors.cyan}Vault Reference Report${colors.reset}`)
  console.log(`  Entities: ${knownIds.size}`)
  console.log(`  References: ${allRefs.size}`)
  console.log()

  if (brokenRefs.length === 0) {
    console.log(`${colors.green}✓ All references valid${colors.reset}`)
  } else {
    console.log(`${colors.red}✗ Broken references: ${brokenRefs.length}${colors.reset}\n`)

    // Group by namespace
    const byNamespace = {}
    brokenRefs.forEach(({ ref, file }) => {
      const ns = ref.split(':')[0]
      if (!byNamespace[ns]) byNamespace[ns] = []
      byNamespace[ns].push({ ref, file })
    })

    for (const [ns, refs] of Object.entries(byNamespace)) {
      const target = NAMESPACE_REGISTRY[ns] || '(unknown namespace)'
      console.log(`  ${colors.yellow}${ns}:*${colors.reset} → ${target}`)
      refs.forEach(({ ref, file }) => {
        console.log(`    ${ref} ${colors.dim}(from ${file})${colors.reset}`)
      })
    }

    process.exit(1)
  }
}

/**
 * Find similar IDs for a given reference
 */
function findSimilarIds(refId, knownIds, maxResults = 5) {
  const namespace = refId.split(':')[0]
  const slug = refId.split(':')[1] || ''

  const candidates = Array.from(knownIds.keys())
    .filter((id) => id.startsWith(namespace + ':'))
    .map((id) => {
      // Score based on slug similarity
      const candidateSlug = id.split(':')[1] || ''
      let score = 0
      if (candidateSlug === slug) score += 100
      else if (candidateSlug.includes(slug) || slug.includes(candidateSlug)) score += 50
      else {
        // Levenshtein-like simple scoring
        const shorter = Math.min(slug.length, candidateSlug.length)
        for (let i = 0; i < shorter; i++) {
          if (slug[i] === candidateSlug[i]) score += 5
        }
      }
      return { id, score }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .map((c) => c.id)

  return candidates
}

/**
 * Find all broken references in a file and return repair suggestions
 */
function findBrokenRefsInFile(filePath, knownIds) {
  const doc = readDataFile(filePath)
  const { array } = findItemsArray(doc)
  const broken = []

  array.forEach((item, itemIndex) => {
    const entityId = getEntityId(item)

    function traverse(obj, fieldPath = []) {
      if (typeof obj === 'string') {
        if (ENTITY_ID_PATTERN.test(obj) && !knownIds.has(obj)) {
          broken.push({
            entityId,
            itemIndex,
            fieldPath: fieldPath.join('.'),
            invalidRef: obj,
            suggestions: findSimilarIds(obj, knownIds),
          })
        }
      } else if (Array.isArray(obj)) {
        obj.forEach((v, i) => traverse(v, [...fieldPath, i]))
      } else if (typeof obj === 'object' && obj !== null) {
        for (const [key, value] of Object.entries(obj)) {
          if (key.startsWith('@') || key === 'id' || key === 'slug') continue
          traverse(value, [...fieldPath, key])
        }
      }
    }

    traverse(item)
  })

  return broken
}

/**
 * Apply a repair to a document
 */
function applyRepair(doc, itemIndex, fieldPath, newValue) {
  const { array } = findItemsArray(doc)
  const item = array[itemIndex]

  const parts = fieldPath.split('.')
  let current = item

  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i]
    current = Array.isArray(current) ? current[parseInt(key)] : current[key]
  }

  const lastKey = parts[parts.length - 1]
  if (Array.isArray(current)) {
    current[parseInt(lastKey)] = newValue
  } else {
    current[lastKey] = newValue
  }
}

/**
 * Repair broken references in a file
 */
function repairRefs(filePath, vaultPath, options = {}) {
  const vault = vaultPath || detectVaultRoot(filePath)
  const knownIds = findAllEntityIds(vault)

  // Add IDs from current file
  const doc = readDataFile(filePath)
  const { array } = findItemsArray(doc)
  array.forEach((item) => {
    const id = getEntityId(item)
    if (id) knownIds.set(id, { file: 'current' })
  })

  const broken = findBrokenRefsInFile(filePath, knownIds)

  if (broken.length === 0) {
    if (outputFormat === 'json') {
      output({ success: true, command: 'refs.repair', result: { repaired: 0, file: filePath } })
    } else {
      console.log(`${colors.green}✓ No broken references in ${path.basename(filePath)}${colors.reset}`)
    }
    return
  }

  if (outputFormat === 'json') {
    // In JSON mode with --auto, apply best suggestions
    if (options.auto) {
      let repaired = 0
      broken.forEach(({ itemIndex, fieldPath, invalidRef, suggestions }) => {
        if (suggestions.length > 0) {
          applyRepair(doc, itemIndex, fieldPath, suggestions[0])
          repaired++
        }
      })
      writeDataFile(filePath, doc)
      output({
        success: true,
        command: 'refs.repair',
        result: {
          repaired,
          skipped: broken.length - repaired,
          file: filePath,
        },
      })
    } else {
      // Return suggestions for manual review
      output({
        success: false,
        command: 'refs.repair',
        result: {
          broken: broken.map((b) => ({
            entity: b.entityId,
            field: b.fieldPath,
            invalid: b.invalidRef,
            suggestions: b.suggestions,
          })),
          file: filePath,
        },
      })
    }
    return
  }

  // Human interactive mode
  console.log(`${colors.cyan}${path.basename(filePath)}${colors.reset}`)
  console.log(`  Found ${colors.yellow}${broken.length}${colors.reset} broken references\n`)

  if (options.dryRun) {
    broken.forEach(({ entityId, fieldPath, invalidRef, suggestions }) => {
      console.log(`  ${colors.yellow}${invalidRef}${colors.reset} in ${entityId}.${fieldPath}`)
      if (suggestions.length > 0) {
        console.log(`    → Would replace with: ${colors.green}${suggestions[0]}${colors.reset}`)
      } else {
        console.log(`    → ${colors.dim}No suggestions available${colors.reset}`)
      }
    })
    return
  }

  if (options.auto) {
    let repaired = 0
    let skipped = 0

    broken.forEach(({ entityId, fieldPath, invalidRef, suggestions }) => {
      if (suggestions.length > 0) {
        applyRepair(doc, itemIndex, fieldPath, suggestions[0])
        console.log(`  ${colors.green}✓${colors.reset} ${invalidRef} → ${suggestions[0]}`)
        repaired++
      } else {
        console.log(`  ${colors.yellow}⊘${colors.reset} ${invalidRef} (no suggestions, skipped)`)
        skipped++
      }
    })

    if (repaired > 0) {
      writeDataFile(filePath, doc)
      console.log(`\n${colors.green}✓ Repaired ${repaired} references${colors.reset}`)
    }
    if (skipped > 0) {
      console.log(`${colors.yellow}⚠ Skipped ${skipped} references (no suggestions)${colors.reset}`)
    }
    return
  }

  // Interactive mode (requires readline)
  const readline = require('readline')
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  let repaired = 0
  let currentIndex = 0

  function processNext() {
    if (currentIndex >= broken.length) {
      rl.close()
      if (repaired > 0) {
        writeDataFile(filePath, doc)
        console.log(`\n${colors.green}✓ Repaired ${repaired} references${colors.reset}`)
      }
      return
    }

    const { entityId, fieldPath, invalidRef, suggestions, itemIndex } = broken[currentIndex]
    console.log(`\n  ${colors.yellow}${invalidRef}${colors.reset} in ${entityId}.${fieldPath}`)

    if (suggestions.length === 0) {
      console.log(`    ${colors.dim}No suggestions available${colors.reset}`)
      rl.question(`    [s]kip, [r]emove, or enter ID manually: `, (answer) => {
        if (answer === 'r' || answer === 'remove') {
          applyRepair(doc, itemIndex, fieldPath, null)
          repaired++
          console.log(`    ${colors.green}✓ Removed${colors.reset}`)
        } else if (answer && answer !== 's' && answer !== 'skip') {
          applyRepair(doc, itemIndex, fieldPath, answer)
          repaired++
          console.log(`    ${colors.green}✓ Set to ${answer}${colors.reset}`)
        }
        currentIndex++
        processNext()
      })
    } else {
      console.log(`    Suggestions:`)
      suggestions.forEach((s, i) => console.log(`      ${i + 1}. ${s}`))
      rl.question(`    [1-${suggestions.length}] to replace, [s]kip, [r]emove: `, (answer) => {
        const num = parseInt(answer)
        if (num >= 1 && num <= suggestions.length) {
          applyRepair(doc, itemIndex, fieldPath, suggestions[num - 1])
          repaired++
          console.log(`    ${colors.green}✓ Replaced with ${suggestions[num - 1]}${colors.reset}`)
        } else if (answer === 'r' || answer === 'remove') {
          applyRepair(doc, itemIndex, fieldPath, null)
          repaired++
          console.log(`    ${colors.green}✓ Removed${colors.reset}`)
        }
        currentIndex++
        processNext()
      })
    }
  }

  processNext()
}

/**
 * Find all references to a specific entity
 */
function findRefsTo(entityId, vaultPath) {
  const refs = []

  function scanDir(dirPath) {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name)

      if (entry.isDirectory() && !entry.name.startsWith('.')) {
        scanDir(fullPath)
      } else if (entry.name.endsWith('.data')) {
        try {
          const doc = readDataFile(fullPath)
          const { array } = findItemsArray(doc)
          const relPath = path.relative(vaultPath, fullPath)

          array.forEach((item) => {
            const itemId = getEntityId(item)

            function traverse(obj, fieldPath = []) {
              if (typeof obj === 'string' && obj === entityId) {
                refs.push({
                  file: relPath,
                  entity: itemId,
                  field: fieldPath.join('.'),
                })
              } else if (Array.isArray(obj)) {
                obj.forEach((v, i) => traverse(v, [...fieldPath, i]))
              } else if (typeof obj === 'object' && obj !== null) {
                for (const [key, value] of Object.entries(obj)) {
                  if (key.startsWith('@') || key === 'id' || key === 'slug') continue
                  traverse(value, [...fieldPath, key])
                }
              }
            }

            traverse(item)
          })
        } catch (e) {
          // Skip unparseable files
        }
      }
    }
  }

  scanDir(vaultPath)

  if (outputFormat === 'json') {
    output({ success: true, command: 'refs.find', result: { entityId, references: refs } })
  } else {
    console.log(`${colors.cyan}References to ${entityId}${colors.reset}\n`)
    if (refs.length === 0) {
      console.log(`  ${colors.dim}No references found${colors.reset}`)
    } else {
      refs.forEach(({ file, entity, field }) => {
        console.log(`  ${colors.green}${file}${colors.reset} → ${entity}.${field}`)
      })
      console.log(`\n  Total: ${refs.length} references`)
    }
  }
}

/**
 * Generate next available ID for a namespace
 */
function generateNextId(filePath, namespace, slug) {
  const doc = readDataFile(filePath)
  const { array } = findItemsArray(doc)

  // Find highest index for this namespace
  let maxIndex = 0
  array.forEach((item) => {
    const id = getEntityId(item)
    if (id) {
      const match = id.match(ENTITY_ID_PATTERN)
      if (match && match[1] === namespace) {
        const idx = parseInt(match[3], 10)
        if (idx > maxIndex) maxIndex = idx
      }
    }
  })

  const nextIndex = String(maxIndex + 1).padStart(3, '0')
  return `${namespace}:${slug}:${nextIndex}`
}

/**
 * Parse CLI arguments into fields object
 */
function parseFields(args) {
  const fields = {}

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg.startsWith('--')) {
      const key = arg.slice(2)
      const value = args[++i]

      // Try to parse as JSON for arrays/objects
      try {
        fields[key] = JSON.parse(value)
      } catch {
        // Try to parse numbers
        if (/^\d+$/.test(value)) {
          fields[key] = parseInt(value, 10)
        } else if (/^\d+\.\d+$/.test(value)) {
          fields[key] = parseFloat(value)
        } else if (value === 'true') {
          fields[key] = true
        } else if (value === 'false') {
          fields[key] = false
        } else {
          fields[key] = value
        }
      }
    }
  }

  return fields
}

/**
 * Print usage
 */
function printUsage() {
  console.log(`
${colors.cyan}Filegraph Data CLI (FCI)${colors.reset}
${colors.dim}Reference: RFC-003${colors.reset}

${colors.yellow}Usage:${colors.reset}
  fci <command> [options] [arguments]

${colors.yellow}Data Commands:${colors.reset}
  ${colors.green}list${colors.reset} <file.data>                          List all entities
  ${colors.green}get${colors.reset} <file.data> <entity-id>               Get entity by ID
  ${colors.green}add${colors.reset} <file.data> --id <id> [--field value] Add new entity (validates refs)
  ${colors.green}update${colors.reset} <file.data> <id> --field value     Update entity fields (validates refs)
  ${colors.green}delete${colors.reset} <file.data> <entity-id>            Delete entity
  ${colors.green}next-id${colors.reset} <file.data> <namespace> <slug>    Generate next ID

${colors.yellow}Reference Commands:${colors.reset}
  ${colors.green}validate${colors.reset} <file.data> [vault-path]         Validate references in file
  ${colors.green}refs${colors.reset} <vault-path>                         Show all vault references
  ${colors.green}repair${colors.reset} <file.data> [vault-path]           Repair broken references (interactive)
  ${colors.green}find-refs${colors.reset} <entity-id> [vault-path]        Find all references to an entity

${colors.yellow}Global Options:${colors.reset}
  --json                Output in JSON format (for AI agents)
  --vault <path>        Specify vault root path
  --skip-validation     Skip reference validation on add/update
  --auto                Auto-repair with best suggestions (for repair)
  --dry-run             Show what would be repaired without changing files

${colors.yellow}Entity ID Format:${colors.reset}
  namespace:slug:index (e.g., person:john:001, acc:checking:001)

${colors.yellow}Valid Namespaces:${colors.reset}
  person, org, proj, task, ms, acc, tx, bill, goal, inc, ins, exp, tax

${colors.yellow}Examples:${colors.reset}
  ${colors.dim}# List entities${colors.reset}
  fci list @entities/people.data

  ${colors.dim}# Add with explicit ID${colors.reset}
  fci add @finance/accounts.data --id acc:savings:002 --name "High Yield Savings"

  ${colors.dim}# Add with auto-generated ID${colors.reset}
  fci add @entities/people.data --namespace person --slug jane-doe --name "Jane Doe"

  ${colors.dim}# Update (validates references)${colors.reset}
  fci update @entities/tasks.data task:cleanup:001 --status done

  ${colors.dim}# JSON output for AI agents${colors.reset}
  fci list @entities/people.data --json

  ${colors.dim}# Validate entire vault${colors.reset}
  fci refs ~/.filegraph

  ${colors.dim}# Repair broken references (interactive)${colors.reset}
  fci repair @finance/transactions.data

  ${colors.dim}# Auto-repair with best suggestions${colors.reset}
  fci repair @finance/transactions.data --auto

  ${colors.dim}# Preview repairs without changing files${colors.reset}
  fci repair @finance/transactions.data --dry-run

  ${colors.dim}# Find all references to an entity${colors.reset}
  fci find-refs person:sarah:001 ~/.filegraph
`)
}

/**
 * Parse global options from args
 */
function parseGlobalOptions(args) {
  const options = { skipValidation: false, auto: false, dryRun: false }
  const filtered = []

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--json') {
      outputFormat = 'json'
    } else if (arg === '--vault') {
      vaultRoot = args[++i]
    } else if (arg === '--skip-validation') {
      options.skipValidation = true
    } else if (arg === '--auto') {
      options.auto = true
    } else if (arg === '--dry-run') {
      options.dryRun = true
    } else {
      filtered.push(arg)
    }
  }

  return { args: filtered, options }
}

// Main
const rawArgs = process.argv.slice(2)
const { args: parsedArgs, options: globalOptions } = parseGlobalOptions(rawArgs)
const [command, ...args] = parsedArgs

switch (command) {
  case 'list':
    listEntities(args[0])
    break

  case 'get':
    getEntity(args[0], args[1])
    break

  case 'add':
    addEntity(args[0], parseFields(args.slice(1)), globalOptions)
    break

  case 'update':
    updateEntity(args[0], args[1], parseFields(args.slice(2)), globalOptions)
    break

  case 'delete':
    deleteEntity(args[0], args[1])
    break

  case 'validate':
    validateFile(args[0], args[1])
    break

  case 'refs':
    showVaultRefs(args[0])
    break

  case 'repair':
    repairRefs(args[0], args[1], globalOptions)
    break

  case 'find-refs':
    findRefsTo(args[0], args[1] || detectVaultRoot(args[0]))
    break

  case 'next-id':
    console.log(generateNextId(args[0], args[1], args[2]))
    break

  default:
    printUsage()
}
