#!/usr/bin/env npx tsx
/**
 * Synthesize People Relationships
 * 
 * Layer 1: Link people to organizations based on project roles
 * Layer 2: Find people mentioned in notes who aren't in people.data
 * Layer 3: Create relationship edges between people
 */

import * as fs from 'fs'
import * as path from 'path'

const VAULT_PATH = path.join(process.env.HOME || '', '.filegraph')
const ENTITIES_PATH = path.join(VAULT_PATH, '@entities')
const NOTES_PATH = path.join(VAULT_PATH, '@notes')

const DRY_RUN = !process.argv.includes('--apply')

interface Person {
  id: string
  slug: string
  name: string
  role?: string
  email?: string
  phone?: string
  organization?: string
}

interface Project {
  id: string
  slug: string
  name: string
  lead?: string
  team?: string[]
  client?: string
}

interface Organization {
  id: string
  slug: string
  name: string
  type: string
  members?: string[]
}

interface Edge {
  source: string
  target: string
  type: string
  confidence: 'high' | 'medium' | 'low'
  context?: string
  createdAt: string
}

// Load JSON data file
function loadDataFile<T>(filePath: string): T | null {
  if (!fs.existsSync(filePath)) return null
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  } catch (e) {
    return null
  }
}

// Convert name to slug
function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

// Extract text from block content
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

// Get all notes
function getAllNotes(): Array<{ id: string; title: string; text: string }> {
  const notes: Array<{ id: string; title: string; text: string }> = []
  if (!fs.existsSync(NOTES_PATH)) return notes
  
  const files = fs.readdirSync(NOTES_PATH).filter(f => f.endsWith('.note'))
  for (const file of files) {
    try {
      const content = JSON.parse(fs.readFileSync(path.join(NOTES_PATH, file), 'utf-8'))
      const text = (content.blocks || []).map((b: any) => extractBlockText(b.content)).join(' ')
      notes.push({
        id: content['@id'] || `note:${file.replace('.note', '')}`,
        title: content.title || file,
        text: `${content.title} ${text}`
      })
    } catch (e) {
      // Skip invalid files
    }
  }
  return notes
}

async function main() {
  console.log('👥 Synthesize People Relationships\n')
  console.log(`Mode: ${DRY_RUN ? '🔍 DRY RUN' : '✏️  APPLYING'}\n`)

  // Load existing data
  const peopleData = loadDataFile<{ items: Person[] }>(path.join(ENTITIES_PATH, 'people.data'))
  const projectsData = loadDataFile<{ items: Project[] }>(path.join(ENTITIES_PATH, 'projects.data'))
  const orgsData = loadDataFile<{ items: Organization[] }>(path.join(ENTITIES_PATH, 'organizations.data'))
  const existingEdges = loadDataFile<{ edges: Edge[] }>(path.join(ENTITIES_PATH, '_entity_edges_.data'))
  
  if (!peopleData || !projectsData || !orgsData) {
    console.error('Failed to load required data files')
    process.exit(1)
  }

  const people = peopleData.items
  const projects = projectsData.items
  const organizations = orgsData.items
  const edges = existingEdges?.edges || []
  const notes = getAllNotes()

  console.log(`Loaded: ${people.length} people, ${projects.length} projects, ${organizations.length} orgs, ${notes.length} notes\n`)

  const newEdges: Edge[] = []
  const peopleUpdates: Array<{ id: string; organization: string }> = []

  // ═══════════════════════════════════════════════════════════════════════════
  // LAYER 1: LINK PEOPLE TO ORGANIZATIONS
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('═══ LAYER 1: PEOPLE-ORGANIZATION LINKS ═══\n')

  // Map people to their organizations based on projects
  const personOrgs = new Map<string, Set<string>>()

  for (const project of projects) {
    const clientOrg = project.client
    
    // Project lead works for their org or Turtle Labs
    if (project.lead) {
      const leadSlug = project.lead.replace('person:', '').split(':')[0]
      const person = people.find(p => p.slug === leadSlug || p.slug.includes(leadSlug))
      
      if (person) {
        if (!personOrgs.has(person.id)) personOrgs.set(person.id, new Set())
        
        // If Filegraph Contributor, link to Turtle Labs
        if (person.name === 'Filegraph Contributor') {
          personOrgs.get(person.id)!.add('org:turtle-labs-llc')
        }
      }
    }

    // Team members
    if (project.team) {
      for (const memberRef of project.team) {
        const memberSlug = memberRef.replace('person:', '').split(':')[0]
        const person = people.find(p => p.slug === memberSlug || p.slug.includes(memberSlug))
        
        if (person) {
          if (!personOrgs.has(person.id)) personOrgs.set(person.id, new Set())
          
          // Check if this is a Turtle Labs internal project
          if (clientOrg === 'org:turtle-labs-llc' || 
              project.name.includes('turtle') || 
              project.name.includes('Docket') ||
              project.name.includes('FileGraph') ||
              project.name.includes('NODEBOOK')) {
            personOrgs.get(person.id)!.add('org:turtle-labs-llc')
          }
        }
      }
    }
  }

  // Link clients to their orgs
  for (const org of organizations) {
    if (org.type === 'client' || org.type === 'personal') {
      // Find matching person
      const matchingPerson = people.find(p => 
        p.slug === org.slug ||
        toSlug(p.name) === org.slug ||
        p.name.toLowerCase().includes(org.name.toLowerCase()) ||
        org.name.toLowerCase().includes(p.name.toLowerCase())
      )
      
      if (matchingPerson) {
        if (!personOrgs.has(matchingPerson.id)) personOrgs.set(matchingPerson.id, new Set())
        personOrgs.get(matchingPerson.id)!.add(org.id)
        
        // Update person's organization field
        peopleUpdates.push({ id: matchingPerson.id, organization: org.id })
      }
    }
  }

  // Create edges for person-org relationships
  for (const [personId, orgSet] of personOrgs) {
    for (const orgId of orgSet) {
      // Check if edge already exists
      const exists = edges.some(e => 
        e.source === personId && e.target === orgId && e.type === 'member-of'
      )
      if (exists) continue
      
      const org = organizations.find(o => o.id === orgId)
      newEdges.push({
        source: personId,
        target: orgId,
        type: 'member-of',
        confidence: 'high',
        context: `Works at/with ${org?.name || orgId}`,
        createdAt: new Date().toISOString()
      })
    }
  }

  console.log(`✓ Found ${personOrgs.size} people with org links`)
  console.log(`✓ Created ${newEdges.length} new member-of edges\n`)

  // ═══════════════════════════════════════════════════════════════════════════
  // LAYER 2: FIND COLLABORATOR RELATIONSHIPS
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('═══ LAYER 2: COLLABORATOR RELATIONSHIPS ═══\n')

  const collaboratorEdges: Edge[] = []

  // People who work on the same project are collaborators
  for (const project of projects) {
    const teamMembers: string[] = []
    
    if (project.lead) {
      const leadSlug = project.lead.replace('person:', '').split(':')[0]
      const person = people.find(p => p.slug === leadSlug || p.slug.includes(leadSlug))
      if (person) teamMembers.push(person.id)
    }
    
    if (project.team) {
      for (const memberRef of project.team) {
        const memberSlug = memberRef.replace('person:', '').split(':')[0]
        const person = people.find(p => p.slug === memberSlug || p.slug.includes(memberSlug))
        if (person && !teamMembers.includes(person.id)) {
          teamMembers.push(person.id)
        }
      }
    }

    // Create collaborator edges between team members
    for (let i = 0; i < teamMembers.length; i++) {
      for (let j = i + 1; j < teamMembers.length; j++) {
        const exists = edges.some(e => 
          (e.source === teamMembers[i] && e.target === teamMembers[j]) ||
          (e.source === teamMembers[j] && e.target === teamMembers[i])
        ) || collaboratorEdges.some(e =>
          (e.source === teamMembers[i] && e.target === teamMembers[j]) ||
          (e.source === teamMembers[j] && e.target === teamMembers[i])
        )
        
        if (!exists) {
          collaboratorEdges.push({
            source: teamMembers[i],
            target: teamMembers[j],
            type: 'collaborates-with',
            confidence: 'high',
            context: `Worked together on ${project.name}`,
            createdAt: new Date().toISOString()
          })
        }
      }
    }
  }

  console.log(`✓ Found ${collaboratorEdges.length} collaborator relationships\n`)

  // ═══════════════════════════════════════════════════════════════════════════
  // LAYER 3: FIND PEOPLE MENTIONED IN NOTES
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('═══ LAYER 3: PEOPLE MENTIONED IN NOTES ═══\n')

  const personMentions = new Map<string, { notes: string[]; count: number }>()

  // Build lookup of existing people names
  const existingNames = new Set(people.map(p => p.name.toLowerCase()))
  const existingSlugs = new Set(people.map(p => p.slug))

  // Scan notes for potential new people
  const namePattern = /\b([A-Z][a-z]+ [A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/g

  for (const note of notes) {
    const matches = note.text.matchAll(namePattern)
    for (const match of matches) {
      const name = match[1].trim()
      
      // Skip if already exists or is a common phrase
      if (existingNames.has(name.toLowerCase())) continue
      if (existingSlugs.has(toSlug(name))) continue
      
      // Skip common non-name patterns
      const skipPatterns = [
        'The ', 'New ', 'Next ', 'Open ', 'Deep ', 'High ', 'Full ',
        'San Francisco', 'Los Angeles', 'New York', 'United States',
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December',
        'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
        'Client Template', 'Project Overview', 'Market Analysis'
      ]
      if (skipPatterns.some(p => name.includes(p))) continue

      const slug = toSlug(name)
      if (!personMentions.has(slug)) {
        personMentions.set(slug, { notes: [], count: 0 })
      }
      personMentions.get(slug)!.count++
      if (!personMentions.get(slug)!.notes.includes(note.id)) {
        personMentions.get(slug)!.notes.push(note.id)
      }
    }
  }

  // Filter to people mentioned in 2+ notes
  const potentialPeople = Array.from(personMentions.entries())
    .filter(([, data]) => data.count >= 2)
    .sort((a, b) => b[1].count - a[1].count)

  console.log(`✓ Found ${potentialPeople.length} potential new people (mentioned 2+ times)`)
  if (potentialPeople.length > 0) {
    console.log('\nTop potential new people:')
    for (const [slug, data] of potentialPeople.slice(0, 10)) {
      const name = slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
      console.log(`  • ${name} (${data.count} mentions in ${data.notes.length} notes)`)
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n═══════════════════════════════════════════════════════════════')
  console.log('SUMMARY')
  console.log('═══════════════════════════════════════════════════════════════\n')

  const allNewEdges = [...newEdges, ...collaboratorEdges]

  console.log(`New edges to add: ${allNewEdges.length}`)
  console.log(`  - member-of: ${newEdges.length}`)
  console.log(`  - collaborates-with: ${collaboratorEdges.length}`)
  console.log(`\nPeople to update with org links: ${peopleUpdates.length}`)

  if (DRY_RUN) {
    console.log('\n📝 Would update:')
    console.log(`  - _entity_edges_.data with ${allNewEdges.length} new edges`)
    console.log(`  - ${peopleUpdates.length} people with organization field`)
    console.log('\nTo apply changes, run:')
    console.log('  npx tsx scripts/synthesize-people-relationships.ts --apply')
  } else {
    // Update edges
    const allEdges = [...edges, ...allNewEdges]
    const edgesPath = path.join(ENTITIES_PATH, '_entity_edges_.data')
    
    if (fs.existsSync(edgesPath)) {
      fs.copyFileSync(edgesPath, edgesPath + '.backup')
    }

    const edgesData = {
      "@context": { "fg": "https://filegraph.local/" },
      "@id": "fg:entities:_entity_edges_",
      "@type": "EdgeCollection",
      "description": "Synthesized relationships between entities",
      "generatedAt": new Date().toISOString(),
      "edges": allEdges,
      "stats": {
        total: allEdges.length,
        byType: allEdges.reduce((acc, e) => {
          acc[e.type] = (acc[e.type] || 0) + 1
          return acc
        }, {} as Record<string, number>)
      }
    }

    fs.writeFileSync(edgesPath, JSON.stringify(edgesData, null, 2))
    console.log(`\n✅ Updated _entity_edges_.data (${edges.length} → ${allEdges.length} edges)`)

    // Update people with organization links
    if (peopleUpdates.length > 0) {
      const peoplePath = path.join(ENTITIES_PATH, 'people.data')
      for (const update of peopleUpdates) {
        const person = people.find(p => p.id === update.id)
        if (person) {
          person.organization = update.organization
        }
      }

      fs.copyFileSync(peoplePath, peoplePath + '.backup2')
      
      const updatedPeopleData = {
        ...peopleData,
        items: people
      }
      fs.writeFileSync(peoplePath, JSON.stringify(updatedPeopleData, null, 2))
      console.log(`✅ Updated ${peopleUpdates.length} people with organization links`)
    }
  }
}

main().catch(console.error)
