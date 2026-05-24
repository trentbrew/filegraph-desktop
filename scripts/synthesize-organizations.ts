#!/usr/bin/env npx tsx
/**
 * Synthesize Organizations & Update Relationships
 *
 * Creates/updates:
 * 1. organizations.data with synthesized organizations
 * 2. Updates people.data with organization links
 * 3. Creates organization edges in _entity_edges_.data
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
  type: 'client' | 'company' | 'agency' | 'studio' | 'llc' | 'personal' | 'startup' | 'unknown'
  industry?: string
  website?: string
  description?: string
  contact?: { email?: string; phone?: string }
  primaryContact?: string
  projects?: string[]
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

// Detect organization type from name/context
function detectOrgType(name: string, context?: string): Organization['type'] {
  const nameLower = name.toLowerCase()
  const contextLower = (context || '').toLowerCase()

  if (nameLower.includes('llc') || nameLower.includes('l.l.c')) return 'llc'
  if (nameLower.includes('inc') || nameLower.includes('corp')) return 'company'
  if (nameLower.includes('studio') || nameLower.includes('studios')) return 'studio'
  if (nameLower.includes('agency')) return 'agency'
  if (nameLower.includes('startup') || contextLower.includes('startup')) return 'startup'
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

// Infer industry from project info
function inferIndustry(projects: Project[]): string | undefined {
  const keywords: Record<string, string> = {
    'video': 'Media & Entertainment',
    'film': 'Media & Entertainment',
    'media': 'Media & Entertainment',
    'tv': 'Broadcasting',
    'broadcast': 'Broadcasting',
    'web': 'Technology',
    'app': 'Technology',
    'software': 'Technology',
    'design': 'Design',
    'brand': 'Design',
    'health': 'Healthcare',
    'medical': 'Healthcare',
    'education': 'Education',
    'learning': 'Education',
  }

  for (const project of projects) {
    const text = `${project.name} ${project.description || ''}`.toLowerCase()
    for (const [keyword, industry] of Object.entries(keywords)) {
      if (text.includes(keyword)) return industry
    }
  }
  return undefined
}

async function main() {
  console.log('🏢 Synthesize Organizations\n')
  console.log(`Mode: ${DRY_RUN ? '🔍 DRY RUN' : '✏️  APPLYING'}\n`)

  // Load existing data
  const peopleData = loadDataFile<{ items: Person[] }>(path.join(ENTITIES_PATH, 'people.data'))
  const projectsData = loadDataFile<{ items: Project[] }>(path.join(ENTITIES_PATH, 'projects.data'))
  const existingEdges = loadDataFile<{ edges: Edge[] }>(path.join(ENTITIES_PATH, '_entity_edges_.data'))

  if (!peopleData || !projectsData) {
    console.error('Failed to load people.data or projects.data')
    process.exit(1)
  }

  const people = peopleData.items
  const projects = projectsData.items
  const edges = existingEdges?.edges || []

  console.log(`Loaded: ${people.length} people, ${projects.length} projects, ${edges.length} existing edges\n`)

  // ═══════════════════════════════════════════════════════════════════════════
  // SYNTHESIZE ORGANIZATIONS
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('═══ SYNTHESIZING ORGANIZATIONS ═══\n')

  const synthesizedOrgs = new Map<string, Organization>()

  // 1. Create Filegraph Labs (main organization)
  const mainContributor = people.find(p => p.name === 'Filegraph Contributor' || p.slug === 'sample-user')
  synthesizedOrgs.set('org:filegraph-labs', {
    id: 'org:filegraph-labs',
    slug: 'filegraph-labs',
    name: 'Filegraph Labs',
    type: 'llc',
    industry: 'Technology',
    website: 'https://filegraph.app',
    description: 'Design & development studio focused on creative tools and knowledge management',
    primaryContact: mainContributor?.id,
    members: mainContributor ? [mainContributor.id] : [],
    projects: []
  })

  // 2. Extract organizations from project clients
  for (const project of projects) {
    if (!project.client) continue

    const orgId = project.client
    const orgSlug = project.client.replace('org:', '')

    if (synthesizedOrgs.has(orgId)) {
      // Add project to existing org
      synthesizedOrgs.get(orgId)!.projects!.push(project.id)
      continue
    }

    // Find matching person for this client
    const matchingPerson = people.find(p =>
      p.slug === orgSlug ||
      p.slug.includes(orgSlug.replace(/-/g, '')) ||
      toSlug(p.name) === orgSlug ||
      p.name.toLowerCase().replace(/[^a-z]/g, '').includes(orgSlug.replace(/-/g, ''))
    )

    let orgName = orgSlug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    let primaryContact: string | undefined
    let orgType = detectOrgType(orgSlug, 'client')
    let email: string | undefined
    let phone: string | undefined

    if (matchingPerson) {
      orgName = matchingPerson.name
      primaryContact = matchingPerson.id
      email = matchingPerson.email
      phone = matchingPerson.phone

      // Check if this is a personal client vs a company
      const hasCompanyIndicator = orgSlug.includes('llc') || orgSlug.includes('inc') ||
                                  orgSlug.includes('studio') || orgSlug.includes('agency')
      if (!hasCompanyIndicator) {
        orgType = 'personal'
      }
    }

    // Create org
    synthesizedOrgs.set(orgId, {
      id: orgId,
      slug: orgSlug,
      name: orgName,
      type: orgType,
      website: extractWebsite(project.name),
      primaryContact,
      contact: (email || phone) ? { email, phone } : undefined,
      members: primaryContact ? [primaryContact] : [],
      projects: [project.id]
    })
  }

  // 3. Add known organizations not captured as clients
  const knownOrgs: Partial<Organization>[] = [
    {
      slug: 'stem-world-today',
      name: 'STEM World Today',
      type: 'company',
      industry: 'Education',
    },
    {
      slug: 'sf-commons',
      name: 'SF Commons',
      type: 'company',
      industry: 'Broadcasting',
    },
    {
      slug: 'speak-mpls',
      name: 'Speak MPLS',
      type: 'company',
      industry: 'Broadcasting',
    },
    {
      slug: 'grist-and-toll',
      name: 'Grist & Toll',
      type: 'company',
      industry: 'Food & Beverage',
    },
  ]

  for (const org of knownOrgs) {
    const orgId = `org:${org.slug}`
    if (!synthesizedOrgs.has(orgId)) {
      synthesizedOrgs.set(orgId, {
        id: orgId,
        slug: org.slug!,
        name: org.name!,
        type: org.type!,
        industry: org.industry,
        projects: [],
        members: []
      })
    }
  }

  // 4. Infer industry for orgs based on their projects
  for (const [orgId, org] of synthesizedOrgs) {
    if (org.industry) continue

    const orgProjects = projects.filter(p => org.projects?.includes(p.id))
    const inferredIndustry = inferIndustry(orgProjects)
    if (inferredIndustry) {
      org.industry = inferredIndustry
    }
  }

  // 5. Link project team members to Filegraph Labs
  const mainOrg = synthesizedOrgs.get('org:filegraph-labs')!
  for (const project of projects) {
    if (project.client === 'org:filegraph-labs') {
      mainOrg.projects!.push(project.id)
    }

    // Add unique team members
    if (project.team) {
      for (const memberRef of project.team) {
        const personSlug = memberRef.replace('person:', '').split(':')[0]
        const person = people.find(p => p.slug === personSlug || p.slug.includes(personSlug))
        if (person && !mainOrg.members!.includes(person.id)) {
          // Check if they work on main org projects
          const worksOnMainProject = projects.some(p =>
            p.client === 'org:filegraph-labs' &&
            (p.team?.includes(memberRef) || p.lead === memberRef)
          )
          if (worksOnMainProject) {
            mainOrg.members!.push(person.id)
          }
        }
      }
    }
  }

  // Dedupe projects
  for (const org of synthesizedOrgs.values()) {
    if (org.projects) {
      org.projects = [...new Set(org.projects)]
    }
    if (org.members) {
      org.members = [...new Set(org.members)]
    }
  }

  const allOrgs = Array.from(synthesizedOrgs.values())

  console.log(`✓ Synthesized ${allOrgs.length} organizations`)

  // Group by type
  const byType = allOrgs.reduce((acc, o) => {
    acc[o.type] = (acc[o.type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  console.log('\nBy type:')
  for (const [type, count] of Object.entries(byType).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${type}: ${count}`)
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CREATE ORGANIZATION EDGES
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n═══ CREATING ORGANIZATION EDGES ═══\n')

  const newEdges: Edge[] = []

  // 1. Person → Organization (member-of)
  for (const org of allOrgs) {
    if (!org.members) continue

    for (const memberId of org.members) {
      newEdges.push({
        source: memberId,
        target: org.id,
        type: 'member-of',
        confidence: 'high',
        context: `Member of ${org.name}`,
        createdAt: new Date().toISOString()
      })
    }

    // Primary contact relationship
    if (org.primaryContact) {
      newEdges.push({
        source: org.primaryContact,
        target: org.id,
        type: 'primary-contact',
        confidence: 'high',
        context: `Primary contact for ${org.name}`,
        createdAt: new Date().toISOString()
      })
    }
  }

  // 2. Organization → Project (owns)
  for (const org of allOrgs) {
    if (!org.projects) continue

    for (const projectId of org.projects) {
      newEdges.push({
        source: org.id,
        target: projectId,
        type: 'owns-project',
        confidence: 'high',
        context: `${org.name} client project`,
        createdAt: new Date().toISOString()
      })
    }
  }

  console.log(`✓ Created ${newEdges.length} organization edges`)

  // Edge type breakdown
  const edgeByType = newEdges.reduce((acc, e) => {
    acc[e.type] = (acc[e.type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  console.log('\nEdge types:')
  for (const [type, count] of Object.entries(edgeByType).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${type}: ${count}`)
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SAMPLE OUTPUT
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n═══ SAMPLE ORGANIZATIONS ═══\n')

  for (const org of allOrgs.slice(0, 8)) {
    console.log(`• ${org.name} [${org.type}]`)
    if (org.industry) console.log(`  Industry: ${org.industry}`)
    if (org.website) console.log(`  Website: ${org.website}`)
    if (org.projects?.length) console.log(`  Projects: ${org.projects.length}`)
    if (org.members?.length) console.log(`  Members: ${org.members.length}`)
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WRITE OUTPUT
  // ═══════════════════════════════════════════════════════════════════════════

  if (DRY_RUN) {
    console.log('\n📝 Would write:')
    console.log(`  - organizations.data with ${allOrgs.length} organizations`)
    console.log(`  - ${newEdges.length} new edges to _entity_edges_.data`)
    console.log('\nTo apply changes, run:')
    console.log('  npx tsx scripts/synthesize-organizations.ts --apply')
  } else {
    // Backup and write organizations.data
    const orgsPath = path.join(ENTITIES_PATH, 'organizations.data')
    if (fs.existsSync(orgsPath)) {
      fs.copyFileSync(orgsPath, orgsPath + '.backup')
    }

    const orgsData = {
      "@context": { "fg": "https://filegraph.local/" },
      "@id": "fg:entities:organizations",
      "@type": "OrganizationCollection",
      "description": "All organizations (companies, teams, groups) in the vault",
      "items": allOrgs,
      "totalCount": { "@expr": "items.length" },
      "byType": { "@expr": "items.reduce((acc, o) => { acc[o.type] = (acc[o.type] || 0) + 1; return acc }, {})" }
    }

    fs.writeFileSync(orgsPath, JSON.stringify(orgsData, null, 2))
    console.log(`\n✅ Wrote organizations.data with ${allOrgs.length} organizations`)

    // Merge new edges with existing
    const allEdges = [...edges, ...newEdges]
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
        newOrgEdges: newEdges.length
      }
    }

    fs.writeFileSync(edgesPath, JSON.stringify(edgesData, null, 2))
    console.log(`✅ Updated _entity_edges_.data (${edges.length} existing + ${newEdges.length} new = ${allEdges.length} total)`)
  }
}

main().catch(console.error)
