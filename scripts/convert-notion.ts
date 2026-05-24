/**
 * Convert Notion exports to .note and .data files
 *
 * Usage: npx tsx scripts/convert-notion.ts
 */

import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { parse } from 'csv-parse/sync'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const REF_DIR = path.join(__dirname, '../.ref')
const OUTPUT_DIR = path.join(__dirname, '../.ref/converted')

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

interface NotionPerson {
  name: string
  class?: string
  birthday?: string
  hometown?: string
  siblings?: string[]
  parents?: string[]
  children?: string[]
  companies?: string[]
  website?: string
  bio?: string
  phone?: string
  email?: string
  fullName?: string
  age?: string
  quotes?: string[]
  content?: string
}

interface NotionNote {
  id: string
  name: string
  author?: string
  status?: string
  pinned?: boolean
  projects?: string[]
  created?: string
  updated?: string
  content?: string
}

interface DataFileItem {
  id: string
  slug: string
  [key: string]: any
}

// ═══════════════════════════════════════════════════════════════════════════
// Utilities
// ═══════════════════════════════════════════════════════════════════════════

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)
}

function parseNotionLinks(text: string): string[] {
  if (!text) return []
  // Format: "Name (path/to/file.md), Name2 (path/to/file2.md)"
  const matches = text.match(/([^,]+?)\s*\([^)]+\)/g) || []
  return matches.map((m) => m.replace(/\s*\([^)]+\)/, '').trim()).filter(Boolean)
}

function parseMarkdownProperties(content: string): Record<string, string> {
  const props: Record<string, string> = {}
  const lines = content.split('\n')

  for (const line of lines) {
    // Match "Property: Value" format
    const match = line.match(/^([A-Za-z\s]+):\s*(.+)$/)
    if (match) {
      const key = match[1].trim().toLowerCase().replace(/\s+/g, '_')
      props[key] = match[2].trim()
    }
  }

  return props
}

function extractMarkdownContent(content: string): string {
  const lines = content.split('\n')
  let inHeader = true
  const contentLines: string[] = []

  for (const line of lines) {
    // Skip H1 title
    if (line.startsWith('# ')) continue

    // Skip property lines at the start
    if (inHeader && /^[A-Za-z\s]+:\s*.+$/.test(line)) continue

    // First non-property line ends header section
    if (inHeader && line.trim() && !/^[A-Za-z\s]+:\s*.+$/.test(line)) {
      inHeader = false
    }

    if (!inHeader) {
      contentLines.push(line)
    }
  }

  return contentLines.join('\n').trim()
}

// ═══════════════════════════════════════════════════════════════════════════
// Parsers
// ═══════════════════════════════════════════════════════════════════════════

function parsePeopleCSV(csvPath: string): Map<string, Partial<NotionPerson>> {
  const content = fs.readFileSync(csvPath, 'utf-8')
  const records = parse(content, { columns: true, skip_empty_lines: true })

  const people = new Map<string, Partial<NotionPerson>>()

  for (const row of records) {
    const name = row['Name']?.trim()
    if (!name) continue

    people.set(name, {
      name,
      class: row['Class']?.trim() || undefined,
      birthday: row['Birthday']?.trim() || undefined,
      hometown: row['Hometown']?.trim() || undefined,
      siblings: parseNotionLinks(row['Siblings']),
      parents: parseNotionLinks(row['Parents']),
      children: parseNotionLinks(row['Children']),
      companies: parseNotionLinks(row['Related Companies']),
      website: row['Website']?.trim() || undefined,
      bio: row['Bio']?.trim() || undefined,
    })
  }

  return people
}

function parseNotesCSV(csvPath: string): Map<string, Partial<NotionNote>> {
  const content = fs.readFileSync(csvPath, 'utf-8')
  const records = parse(content, { columns: true, skip_empty_lines: true })

  const notes = new Map<string, Partial<NotionNote>>()

  for (const row of records) {
    const name = row['Name']?.trim()
    if (!name) continue

    notes.set(name, {
      id: row['ID']?.trim() || undefined,
      name,
      author: row['Author']?.trim() || undefined,
      status: row['Status']?.trim() || undefined,
      pinned: row['Pinned']?.toLowerCase() === 'yes',
      projects: parseNotionLinks(row['Projects']),
      created: row['Created']?.trim() || undefined,
      updated: row['Updated']?.trim() || undefined,
    })
  }

  return notes
}

function enrichFromMarkdown(basePath: string, items: Map<string, any>, type: 'people' | 'notes'): void {
  const mdDir = path.join(basePath, type === 'people' ? 'People' : 'Notes')

  if (!fs.existsSync(mdDir)) {
    console.log(`  ⚠️  Directory not found: ${mdDir}`)
    return
  }

  const files = fs.readdirSync(mdDir).filter((f) => f.endsWith('.md'))
  console.log(`  📄 Found ${files.length} markdown files`)

  for (const file of files) {
    const filePath = path.join(mdDir, file)
    const content = fs.readFileSync(filePath, 'utf-8')

    // Extract name from H1 or filename
    const h1Match = content.match(/^#\s+(.+)$/m)
    const name = h1Match?.[1]?.trim() || file.replace(/\s+[a-f0-9]+\.md$/i, '')

    const existing = items.get(name)
    if (existing) {
      // Merge markdown properties
      const props = parseMarkdownProperties(content)
      const bodyContent = extractMarkdownContent(content)

      if (type === 'people') {
        existing.phone = props.phone || existing.phone
        existing.email = props.email || existing.email
        existing.fullName = props.full_name || existing.fullName
        existing.age = props.age || existing.age
        existing.content = bodyContent || undefined
      } else {
        existing.content = bodyContent || undefined
      }
    } else {
      // Create new entry from markdown only
      const props = parseMarkdownProperties(content)
      const bodyContent = extractMarkdownContent(content)

      if (type === 'people') {
        items.set(name, {
          name,
          class: props.class,
          birthday: props.birthday,
          phone: props.phone,
          email: props.email,
          website: props.website,
          fullName: props.full_name,
          age: props.age,
          content: bodyContent || undefined,
        })
      } else {
        items.set(name, {
          id: props.id,
          name,
          author: props.author,
          status: props.status,
          pinned: props.pinned?.toLowerCase() === 'yes',
          content: bodyContent || undefined,
        })
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Converters
// ═══════════════════════════════════════════════════════════════════════════

function convertPeopleToData(people: Map<string, NotionPerson>): string {
  const items: DataFileItem[] = []
  let index = 1

  for (const [name, person] of people) {
    const slug = slugify(name)
    const id = `person:${slug}:${String(index).padStart(3, '0')}`

    const item: DataFileItem = {
      id,
      slug,
      name: person.fullName || name,
    }

    // Add optional fields
    if (person.class) item.role = person.class
    if (person.email) item.email = person.email
    if (person.phone) item.phone = person.phone
    if (person.website) item.website = person.website
    if (person.birthday) item.birthday = person.birthday
    if (person.hometown) item.hometown = person.hometown
    if (person.bio) item.bio = person.bio

    // Convert relationships to entity references (use direct IDs, not wikilinks)
    if (person.parents?.length) {
      item.parents = person.parents.map((p) => `person:${slugify(p)}:001`)
    }
    if (person.siblings?.length) {
      item.siblings = person.siblings.map((s) => `person:${slugify(s)}:001`)
    }
    if (person.children?.length) {
      item.children = person.children.map((c) => `person:${slugify(c)}:001`)
    }
    if (person.companies?.length) {
      item.organizations = person.companies.map((c) => `org:${slugify(c)}:001`)
    }

    items.push(item)
    index++
  }

  // Return JSON-LD format matching demo-files structure
  const data = {
    '@context': {
      fg: 'https://filegraph.local/',
    },
    '@id': 'fg:entities:notion-people',
    '@type': 'PersonCollection',
    description: 'People imported from Notion',
    items,
  }

  return JSON.stringify(data, null, 2)
}

function convertNoteToStructured(note: NotionNote): string {
  const noteId = note.id?.replace('NOTE-', 'note:notion-') || `note:${slugify(note.name)}:001`

  // Convert markdown content to blocks
  const blocks = markdownToBlocks(note.content || '', note.name)

  const data = {
    '@context': { schema: 'https://schema.org/' },
    '@type': 'Note',
    '@id': noteId,
    title: note.name,
    author: note.author ? `person:${slugify(note.author)}:001` : undefined,
    status: note.status?.toLowerCase() || 'draft',
    created_at: parseNotionDate(note.created),
    updated_at: parseNotionDate(note.updated),
    blocks: blocks,
  }

  // Remove undefined fields
  Object.keys(data).forEach((key) => {
    if ((data as any)[key] === undefined) delete (data as any)[key]
  })

  return JSON.stringify(data, null, 2)
}

function parseNotionDate(dateStr?: string): string | undefined {
  if (!dateStr) return undefined
  try {
    const date = new Date(dateStr)
    return date.toISOString()
  } catch {
    return undefined
  }
}

function markdownToBlocks(content: string, title: string): any[] {
  const blocks: any[] = []
  let blockId = 1

  // Add title heading
  blocks.push({
    id: `b-${blockId++}`,
    type: 'heading',
    level: 1,
    content: [{ type: 'text', text: title }],
  })

  if (!content.trim()) return blocks

  const lines = content.split('\n')
  let currentList: any[] | null = null

  for (const line of lines) {
    // Heading
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/)
    if (headingMatch) {
      if (currentList) {
        blocks.push({ id: `b-${blockId++}`, type: 'bulletList', children: currentList })
        currentList = null
      }
      blocks.push({
        id: `b-${blockId++}`,
        type: 'heading',
        level: headingMatch[1].length,
        content: [{ type: 'text', text: headingMatch[2] }],
      })
      continue
    }

    // List item
    const listMatch = line.match(/^[-*]\s+(.+)$/)
    if (listMatch) {
      if (!currentList) currentList = []
      currentList.push({
        id: `b-${blockId++}`,
        type: 'paragraph',
        content: [{ type: 'text', text: listMatch[1] }],
      })
      continue
    }

    // Checkbox
    const checkMatch = line.match(/^-\s+\[([ x])\]\s+(.+)$/i)
    if (checkMatch) {
      if (!currentList) currentList = []
      currentList.push({
        id: `b-${blockId++}`,
        type: 'paragraph',
        content: [{ type: 'text', text: `${checkMatch[1] === 'x' ? '✓' : '☐'} ${checkMatch[2]}` }],
      })
      continue
    }

    // Regular paragraph (non-empty line)
    if (line.trim()) {
      if (currentList) {
        blocks.push({ id: `b-${blockId++}`, type: 'bulletList', children: currentList })
        currentList = null
      }
      blocks.push({
        id: `b-${blockId++}`,
        type: 'paragraph',
        content: [{ type: 'text', text: line.trim() }],
      })
    }
  }

  // Flush remaining list
  if (currentList) {
    blocks.push({ id: `b-${blockId++}`, type: 'bulletList', children: currentList })
  }

  return blocks
}

// ═══════════════════════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('🔄 Converting Notion exports to .note and .data files\n')

  // Ensure output directory exists
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  fs.mkdirSync(path.join(OUTPUT_DIR, '@entities'), { recursive: true })
  fs.mkdirSync(path.join(OUTPUT_DIR, '@notes'), { recursive: true })

  // ─────────────────────────────────────────────────────────────────────────
  // Convert People
  // ─────────────────────────────────────────────────────────────────────────

  const peoplePath = path.join(REF_DIR, 'notion:people')
  const peopleCsvFiles = fs.readdirSync(peoplePath).filter((f) => f.endsWith('.csv') && !f.includes('_all'))

  if (peopleCsvFiles.length > 0) {
    console.log('👥 Processing People...')
    const csvPath = path.join(peoplePath, peopleCsvFiles[0])
    console.log(`  📊 Reading CSV: ${peopleCsvFiles[0]}`)

    const people = parsePeopleCSV(csvPath)
    console.log(`  📋 Found ${people.size} people in CSV`)

    enrichFromMarkdown(peoplePath, people, 'people')
    console.log(`  📋 Total after enrichment: ${people.size} people`)

    const dataContent = convertPeopleToData(people as Map<string, NotionPerson>)
    const outputPath = path.join(OUTPUT_DIR, '@entities', 'people.data')
    fs.writeFileSync(outputPath, dataContent)
    console.log(`  ✅ Wrote ${outputPath}\n`)
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Convert Notes
  // ─────────────────────────────────────────────────────────────────────────

  const notesPath = path.join(REF_DIR, 'notion:notes')
  const notesCsvFiles = fs.readdirSync(notesPath).filter((f) => f.endsWith('.csv') && !f.includes('_all'))

  if (notesCsvFiles.length > 0) {
    console.log('📝 Processing Notes...')
    const csvPath = path.join(notesPath, notesCsvFiles[0])
    console.log(`  📊 Reading CSV: ${notesCsvFiles[0]}`)

    const notes = parseNotesCSV(csvPath)
    console.log(`  📋 Found ${notes.size} notes in CSV`)

    enrichFromMarkdown(notesPath, notes, 'notes')
    console.log(`  📋 Total after enrichment: ${notes.size} notes`)

    let converted = 0
    for (const [name, note] of notes) {
      if (!note.name) continue

      const slug = slugify(name)
      const filename = `${slug}.note`
      const content = convertNoteToStructured(note as NotionNote)

      const outputPath = path.join(OUTPUT_DIR, '@notes', filename)
      fs.writeFileSync(outputPath, content)
      converted++
    }

    console.log(`  ✅ Wrote ${converted} .note files to ${path.join(OUTPUT_DIR, '@notes')}\n`)
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Summary
  // ─────────────────────────────────────────────────────────────────────────

  console.log('═'.repeat(60))
  console.log('📦 Conversion Complete!')
  console.log(`   Output: ${OUTPUT_DIR}`)
  console.log('═'.repeat(60))
}

main().catch(console.error)
