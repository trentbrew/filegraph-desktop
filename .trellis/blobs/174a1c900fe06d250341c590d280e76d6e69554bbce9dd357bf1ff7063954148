#!/usr/bin/env npx tsx
/**
 * Synthesize Entity Relationships
 * 
 * Creates edges between:
 * 1. Projects ↔ People (lead, team members)
 * 2. Projects ↔ Notes (related content)
 * 3. Notes ↔ People (mentions)
 */

import * as fs from 'fs'
import * as path from 'path'

const VAULT_PATH = path.join(process.env.HOME || '', '.filegraph')
const ENTITIES_PATH = path.join(VAULT_PATH, '@entities')
const NOTES_PATH = path.join(VAULT_PATH, '@notes')
const EDGES_FILE = path.join(ENTITIES_PATH, '_entity_edges_.data')

const DRY_RUN = !process.argv.includes('--apply')

interface Edge {
  source: string
  target: string
  type: 'leads' | 'member-of' | 'related-to' | 'mentions' | 'works-on' | 'client-of'
  confidence: 'high' | 'medium' | 'low'
  context?: string
  createdAt: string
}

interface Person {
  id: string
  slug: string
  name: string
  role?: string
  email?: string
}

interface Project {
  id: string
  slug: string
  name: string
  status: string
  lead?: string
  team?: string[]
  client?: string
  notes?: string[]
}

interface Note {
  '@id': string
  title: string
  blocks?: Array<{ 
    content?: string | Array<{ text?: string; value?: string }>
    type?: string 
  }>
}

// Extract text from block content (handles both string and array formats)
function extractBlockText(content: any): string {
  if (!content) return ''
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content.map(item => {
      if (typeof item === 'string') return item
      return item.text || item.value || ''
    }).join(' ')
  }
  return ''
}

// Load JSON data file
function loadDataFile<T>(filePath: string): T | null {
  if (!fs.existsSync(filePath)) return null
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  } catch (e) {
    console.error(`Error loading ${filePath}:`, e)
    return null
  }
}

// Get all note files
function getAllNotes(): Map<string, Note> {
  const notes = new Map<string, Note>()
  if (!fs.existsSync(NOTES_PATH)) return notes
  
  const files = fs.readdirSync(NOTES_PATH).filter(f => f.endsWith('.note'))
  for (const file of files) {
    try {
      const content = JSON.parse(fs.readFileSync(path.join(NOTES_PATH, file), 'utf-8'))
      const title = content.title?.toLowerCase() || ''
      notes.set(title, content)
      // Also index by @id
      if (content['@id']) {
        notes.set(content['@id'].toLowerCase(), content)
      }
    } catch (e) {
      // Skip invalid files
    }
  }
  return notes
}

// Find note by title (fuzzy match)
function findNoteByTitle(notes: Map<string, Note>, title: string): Note | undefined {
  const normalizedTitle = title.toLowerCase().trim()
  
  // Exact match
  if (notes.has(normalizedTitle)) {
    return notes.get(normalizedTitle)
  }
  
  // Partial match
  for (const [key, note] of notes.entries()) {
    if (key.includes(normalizedTitle) || normalizedTitle.includes(key)) {
      return note
    }
  }
  
  return undefined
}

// Find person by ID or name
function findPersonId(people: Person[], ref: string): string | undefined {
  // Direct ID match
  const direct = people.find(p => p.id === ref)
  if (direct) return direct.id
  
  // Slug match
  const slug = ref.replace('person:', '').split(':')[0]
  const bySlug = people.find(p => p.slug === slug)
  if (bySlug) return bySlug.id
  
  // Name match
  const byName = people.find(p => 
    p.name.toLowerCase() === slug.toLowerCase().replace(/-/g, ' ')
  )
  if (byName) return byName.id
  
  return undefined
}

async function main() {
  console.log('🔗 Synthesize Entity Relationships\n')
  console.log(`Mode: ${DRY_RUN ? '🔍 DRY RUN' : '✏️  APPLYING'}\n`)

  // Load data
  const peopleData = loadDataFile<{ items: Person[] }>(path.join(ENTITIES_PATH, 'people.data'))
  const projectsData = loadDataFile<{ items: Project[] }>(path.join(ENTITIES_PATH, 'projects.data'))
  
  if (!peopleData || !projectsData) {
    console.error('Failed to load people.data or projects.data')
    process.exit(1)
  }

  const people = peopleData.items
  const projects = projectsData.items
  const notes = getAllNotes()

  console.log(`Loaded: ${people.length} people, ${projects.length} projects, ${notes.size} notes\n`)

  const edges: Edge[] = []
  const stats = {
    projectPerson: 0,
    projectNote: 0,
    notePerson: 0,
    errors: 0,
  }

  // 1. Project → Person relationships (lead, team)
  console.log('═══ Project ↔ Person Relationships ═══')
  for (const project of projects) {
    // Project lead
    if (project.lead) {
      const personId = findPersonId(people, project.lead)
      if (personId) {
        edges.push({
          source: personId,
          target: project.id,
          type: 'leads',
          confidence: 'high',
          context: `${project.name} project lead`,
          createdAt: new Date().toISOString()
        })
        stats.projectPerson++
      }
    }

    // Team members
    if (project.team) {
      for (const memberRef of project.team) {
        const personId = findPersonId(people, memberRef)
        if (personId) {
          edges.push({
            source: personId,
            target: project.id,
            type: 'works-on',
            confidence: 'high',
            context: `Team member on ${project.name}`,
            createdAt: new Date().toISOString()
          })
          stats.projectPerson++
        }
      }
    }

    // Client relationship
    if (project.client) {
      edges.push({
        source: project.id,
        target: project.client,
        type: 'client-of',
        confidence: 'medium',
        context: `Client project`,
        createdAt: new Date().toISOString()
      })
      stats.projectPerson++
    }
  }

  console.log(`  ✓ ${stats.projectPerson} project-person edges\n`)

  // 2. Project → Note relationships
  console.log('═══ Project ↔ Note Relationships ═══')
  for (const project of projects) {
    if (!project.notes) continue
    
    for (const noteTitle of project.notes) {
      const note = findNoteByTitle(notes, noteTitle)
      if (note && note['@id']) {
        edges.push({
          source: project.id,
          target: note['@id'],
          type: 'related-to',
          confidence: 'high',
          context: `Project documentation for ${project.name}`,
          createdAt: new Date().toISOString()
        })
        stats.projectNote++
      }
    }
  }

  console.log(`  ✓ ${stats.projectNote} project-note edges\n`)

  // 3. Note → Person relationships (scan note content for mentions)
  console.log('═══ Note ↔ Person Mentions ═══')
  const personNames = people.map(p => ({
    id: p.id,
    name: p.name,
    nameLower: p.name.toLowerCase()
  })).filter(p => p.name.length > 3) // Skip very short names

  for (const [, note] of notes) {
    if (!note.blocks || !note['@id']) continue
    
    // Get all text content (handling nested array format)
    const textContent = note.blocks
      .map(b => extractBlockText(b.content))
      .join(' ')
      .toLowerCase()
    
    // Also include the title
    const fullText = (note.title + ' ' + textContent).toLowerCase()
    
    // Look for person mentions
    for (const person of personNames) {
      if (fullText.includes(person.nameLower)) {
        edges.push({
          source: note['@id'],
          target: person.id,
          type: 'mentions',
          confidence: 'medium',
          context: `Mentioned in ${note.title}`,
          createdAt: new Date().toISOString()
        })
        stats.notePerson++
      }
    }
  }

  console.log(`  ✓ ${stats.notePerson} note-person mention edges\n`)

  // Summary
  console.log('═══════════════════════════════════════')
  console.log('Summary:')
  console.log(`  Total edges: ${edges.length}`)
  console.log(`  - Project ↔ Person: ${stats.projectPerson}`)
  console.log(`  - Project ↔ Note: ${stats.projectNote}`)
  console.log(`  - Note → Person: ${stats.notePerson}`)

  // Group edges by type
  const byType = edges.reduce((acc, e) => {
    acc[e.type] = (acc[e.type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  console.log('\nBy edge type:')
  for (const [type, count] of Object.entries(byType).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${type}: ${count}`)
  }

  // Sample edges
  console.log('\nSample edges:')
  for (const edge of edges.slice(0, 8)) {
    console.log(`  "${edge.source}" --[${edge.type}]--> "${edge.target}"`)
  }

  // Write edges file
  const edgesData = {
    "@context": {
      "fg": "https://filegraph.local/"
    },
    "@id": "fg:entities:_entity_edges_",
    "@type": "EdgeCollection",
    "description": "Synthesized relationships between entities",
    "generatedAt": new Date().toISOString(),
    "edges": edges,
    "stats": {
      total: edges.length,
      byType
    }
  }

  if (DRY_RUN) {
    console.log('\n📝 Would write', edges.length, 'edges to _entity_edges_.data')
    console.log('\nTo apply changes, run:')
    console.log('  npx tsx scripts/synthesize-entity-edges.ts --apply')
  } else {
    // Backup existing
    if (fs.existsSync(EDGES_FILE)) {
      fs.copyFileSync(EDGES_FILE, EDGES_FILE + '.backup')
    }
    
    fs.writeFileSync(EDGES_FILE, JSON.stringify(edgesData, null, 2))
    console.log('\n✅ Wrote', edges.length, 'edges to _entity_edges_.data')
  }
}

main().catch(console.error)
