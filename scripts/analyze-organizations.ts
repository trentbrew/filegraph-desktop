#!/usr/bin/env npx tsx
/**
 * Analyze and Synthesize Organizations & People
 *
 * Layer 1 (Deterministic): Extract from explicit project references
 * Layer 2 (Heuristic): Pattern matching in notes and content
 * Layer 3 (Future): AI-assisted entity resolution
 */

import * as fs from 'fs'
import * as path from 'path'

const VAULT_PATH = path.join(process.env.HOME || '', '.filegraph')
const ENTITIES_PATH = path.join(VAULT_PATH, '@entities')
const NOTES_PATH = path.join(VAULT_PATH, '@notes')

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
  status: string
  lead?: string
  team?: string[]
  client?: string
  notes?: string[]
  description?: string
}

interface Organization {
  id: string
  slug: string
  name: string
  type: 'client' | 'company' | 'agency' | 'studio' | 'llc' | 'personal' | 'unknown'
  industry?: string
  website?: string
  description?: string
  contact?: { email?: string; phone?: string }
  primaryContact?: string
  projects?: string[]
  members?: string[]
}

interface Note {
  '@id': string
  title: string
  blocks?: Array<{ content?: any }>
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
function getAllNotes(): Note[] {
  const notes: Note[] = []
  if (!fs.existsSync(NOTES_PATH)) return notes

  const files = fs.readdirSync(NOTES_PATH).filter(f => f.endsWith('.note'))
  for (const file of files) {
    try {
      const content = JSON.parse(fs.readFileSync(path.join(NOTES_PATH, file), 'utf-8'))
      notes.push(content)
    } catch (e) {
      // Skip invalid files
    }
  }
  return notes
}

// Detect organization type from name/context
function detectOrgType(name: string, context?: string): Organization['type'] {
  const nameLower = name.toLowerCase()
  const contextLower = (context || '').toLowerCase()

  if (nameLower.includes('llc') || nameLower.includes('l.l.c')) return 'llc'
  if (nameLower.includes('inc') || nameLower.includes('corp')) return 'company'
  if (nameLower.includes('studio') || nameLower.includes('studios')) return 'studio'
  if (nameLower.includes('agency')) return 'agency'
  if (contextLower.includes('client')) return 'client'

  return 'unknown'
}

// Extract website from name if it looks like a domain
function extractWebsite(name: string): string | undefined {
  if (name.includes('.com') || name.includes('.org') || name.includes('.tv') ||
      name.includes('.tech') || name.includes('.film') || name.includes('.so')) {
    return `https://${name}`
  }
  return undefined
}

async function main() {
  console.log('🔍 Analyze & Synthesize Organizations\n')

  // Load existing data
  const peopleData = loadDataFile<{ items: Person[] }>(path.join(ENTITIES_PATH, 'people.data'))
  const projectsData = loadDataFile<{ items: Project[] }>(path.join(ENTITIES_PATH, 'projects.data'))
  const orgsData = loadDataFile<{ items: Organization[] }>(path.join(ENTITIES_PATH, 'organizations.data'))

  if (!peopleData || !projectsData) {
    console.error('Failed to load people.data or projects.data')
    process.exit(1)
  }

  const people = peopleData.items
  const projects = projectsData.items
  const existingOrgs = orgsData?.items || []
  const notes = getAllNotes()

  console.log(`Loaded: ${people.length} people, ${projects.length} projects, ${existingOrgs.length} existing orgs, ${notes.length} notes\n`)

  // ═══════════════════════════════════════════════════════════════════════════
  // LAYER 1: DETERMINISTIC - Extract from explicit references
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('═══ LAYER 1: DETERMINISTIC EXTRACTION ═══\n')

  const synthesizedOrgs = new Map<string, Organization>()
  const personOrgLinks = new Map<string, string[]>() // person -> orgs
  const orgProjectLinks = new Map<string, string[]>() // org -> projects

  // 1a. Extract organizations from project clients
  console.log('1a. Extracting from project clients...')
  for (const project of projects) {
    if (!project.client) continue

    // Client refs are like "org:steven-landow" or "org:turtle-labs-llc"
    const orgSlug = project.client.replace('org:', '')
    const orgId = project.client

    if (!synthesizedOrgs.has(orgId)) {
      // Try to find matching person for this client
      const matchingPerson = people.find(p =>
        p.slug === orgSlug ||
        p.slug.includes(orgSlug) ||
        toSlug(p.name) === orgSlug
      )

      let orgName = orgSlug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
      let primaryContact: string | undefined
      let orgType = detectOrgType(orgSlug, 'client')

      if (matchingPerson) {
        orgName = matchingPerson.name
        primaryContact = matchingPerson.id

        // Check if this is a company (LLC, Inc) or a personal client
        if (matchingPerson.role?.includes('Client') ||
            !orgSlug.includes('llc') && !orgSlug.includes('inc')) {
          orgType = 'personal'
        }
      }

      synthesizedOrgs.set(orgId, {
        id: orgId,
        slug: orgSlug,
        name: orgName,
        type: orgType,
        website: extractWebsite(project.name),
        primaryContact,
        projects: [],
        members: primaryContact ? [primaryContact] : []
      })
    }

    // Track project links
    if (!orgProjectLinks.has(orgId)) {
      orgProjectLinks.set(orgId, [])
    }
    orgProjectLinks.get(orgId)!.push(project.id)
  }

  console.log(`   Found ${synthesizedOrgs.size} organizations from clients\n`)

  // 1b. Link people to organizations based on roles
  console.log('1b. Linking people to organizations...')
  let linkCount = 0

  // Find primary organization members
  const mainOrgId = 'org:filegraph-labs'
  if (!synthesizedOrgs.has(mainOrgId)) {
    synthesizedOrgs.set(mainOrgId, {
      id: mainOrgId,
      slug: 'filegraph-labs',
      name: 'Filegraph Labs',
      type: 'llc',
      website: 'https://filegraph.app',
      projects: [],
      members: []
    })
  }

  // Link Filegraph Contributor to main org
  const mainContributor = people.find(p => p.name === 'Filegraph Contributor' || p.slug === 'sample-user')
  if (mainContributor) {
    const mainOrg = synthesizedOrgs.get(mainOrgId)!
    if (!mainOrg.members) mainOrg.members = []
    if (!mainOrg.members.includes(mainContributor.id)) {
      mainOrg.members.push(mainContributor.id)
      mainOrg.primaryContact = mainContributor.id
      linkCount++
    }
  }

  // Find Studio LAFA (team member on faires.film)
  const studioLafa = people.find(p => p.slug.includes('studio-lafa'))
  if (studioLafa) {
    const studioLafaOrg: Organization = {
      id: 'org:studio-lafa-llc',
      slug: 'studio-lafa-llc',
      name: 'Studio LAFA LLC',
      type: 'studio',
      primaryContact: studioLafa.id,
      members: [studioLafa.id],
      projects: []
    }
    synthesizedOrgs.set(studioLafaOrg.id, studioLafaOrg)
    linkCount++
  }

  console.log(`   Created ${linkCount} person-org links\n`)

  // 1c. Update project links
  console.log('1c. Linking organizations to projects...')
  for (const [orgId, projectIds] of orgProjectLinks) {
    const org = synthesizedOrgs.get(orgId)
    if (org) {
      org.projects = projectIds
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LAYER 2: HEURISTIC - Pattern matching in content
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('═══ LAYER 2: HEURISTIC PATTERN MATCHING ═══\n')

  // 2a. Find organization mentions in notes
  console.log('2a. Scanning notes for organization mentions...')

  const orgPatterns = [
    /(\b[A-Z][a-z]+\s+(?:LLC|Inc|Corp|Labs|Studio|Studios|Agency|Group|Foundation)\b)/g,
    /(\b(?:Turtle\s+Labs|Docket\s+TV|STEM\s+World|NewRoot)\b)/gi,
  ]

  const orgMentions = new Map<string, { count: number; notes: string[] }>()

  for (const note of notes) {
    if (!note.blocks) continue

    const textContent = note.title + ' ' + note.blocks.map(b => extractBlockText(b.content)).join(' ')

    for (const pattern of orgPatterns) {
      const matches = textContent.matchAll(pattern)
      for (const match of matches) {
        const orgName = match[1].trim()
        if (orgName.length < 4) continue

        const slug = toSlug(orgName)
        if (!orgMentions.has(slug)) {
          orgMentions.set(slug, { count: 0, notes: [] })
        }
        orgMentions.get(slug)!.count++
        if (!orgMentions.get(slug)!.notes.includes(note['@id'])) {
          orgMentions.get(slug)!.notes.push(note['@id'])
        }
      }
    }
  }

  // Add frequently mentioned orgs
  let heuristicOrgsAdded = 0
  for (const [slug, { count, notes: noteRefs }] of orgMentions) {
    if (count < 2) continue // Skip single mentions

    const orgId = `org:${slug}`
    if (synthesizedOrgs.has(orgId)) continue

    // Reconstruct name from slug
    const name = slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

    synthesizedOrgs.set(orgId, {
      id: orgId,
      slug,
      name,
      type: detectOrgType(name),
      projects: [],
      members: []
    })
    heuristicOrgsAdded++
  }

  console.log(`   Found ${orgMentions.size} unique mentions, added ${heuristicOrgsAdded} new orgs\n`)

  // 2b. Find people who should be linked to organizations
  console.log('2b. Finding people-organization relationships...')

  const peopleUpdates: Array<{ personId: string; orgId: string; reason: string }> = []

  // People with "Founder" role likely founded their own org
  for (const person of people) {
    if (!person.role?.includes('Founder')) continue

    // Check if there's a project where they're the client
    const clientProjects = projects.filter(p => {
      const clientSlug = p.client?.replace('org:', '')
      return clientSlug === person.slug || toSlug(person.name) === clientSlug
    })

    if (clientProjects.length > 0) {
      const orgId = `org:${person.slug}`
      peopleUpdates.push({
        personId: person.id,
        orgId,
        reason: `Founder/owner of client organization`
      })
    }
  }

  // People with "Client" role are linked to their own org
  for (const person of people) {
    if (!person.role?.includes('Client')) continue

    const orgId = `org:${person.slug}`
    if (synthesizedOrgs.has(orgId)) {
      peopleUpdates.push({
        personId: person.id,
        orgId,
        reason: `Primary contact for client org`
      })
    }
  }

  console.log(`   Found ${peopleUpdates.length} people-org links\n`)

  // ═══════════════════════════════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('SYNTHESIS SUMMARY')
  console.log('═══════════════════════════════════════════════════════════════\n')

  const allOrgs = Array.from(synthesizedOrgs.values())

  // Group by type
  const byType = allOrgs.reduce((acc, o) => {
    acc[o.type] = (acc[o.type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  console.log(`Total organizations: ${allOrgs.length}`)
  console.log('\nBy type:')
  for (const [type, count] of Object.entries(byType).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${type}: ${count}`)
  }

  // Sample orgs
  console.log('\nSample organizations:')
  for (const org of allOrgs.slice(0, 10)) {
    console.log(`  • ${org.name} [${org.type}]`)
    if (org.projects?.length) console.log(`    Projects: ${org.projects.length}`)
    if (org.members?.length) console.log(`    Members: ${org.members.length}`)
  }

  // Return analysis for the apply script
  return {
    organizations: allOrgs,
    peopleUpdates,
    orgMentions: Array.from(orgMentions.entries()).map(([slug, data]) => ({
      slug,
      ...data
    }))
  }
}

main().catch(console.error)
