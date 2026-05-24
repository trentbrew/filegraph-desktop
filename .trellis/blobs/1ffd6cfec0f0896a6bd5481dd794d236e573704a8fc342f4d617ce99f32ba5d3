#!/usr/bin/env npx tsx
/**
 * Import Notion Projects into FileGraph
 * 
 * Parses the Notion projects CSV and markdown files to create:
 * 1. Updated projects.data with real project information
 * 2. Synthesized relationships between projects, people, and notes
 */

import * as fs from 'fs'
import * as path from 'path'

const VAULT_PATH = path.join(process.env.HOME || '', '.filegraph')
const PROJECTS_PATH = path.join(VAULT_PATH, '@entities', 'projects.data')
const NOTION_PROJECTS_DIR = path.join(process.cwd(), '.ref', 'notion:projects', 'Private & Shared', 'Projects')
const NOTION_CSV = path.join(process.cwd(), '.ref', 'notion:projects', 'Private & Shared', 'Projects 16cfb245194e80fbb7adfb7afaecddac_all.csv')

const DRY_RUN = !process.argv.includes('--apply')

interface Project {
  id: string
  slug: string
  name: string
  description?: string
  status: string
  notionId?: string
  lead?: string
  team?: string[]
  client?: string
  notes?: string[]
  github?: string
  productionUrl?: string
  stagingUrl?: string
  toolkit?: string[]
  tags?: string[]
}

// Parse CSV line handling quoted fields
function parseCSVLine(line: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      fields.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  fields.push(current.trim())
  return fields
}

// Convert project name to slug
function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

// Extract person references from Notion links
function extractPersonRef(text: string): string | undefined {
  if (!text) return undefined
  // Look for person name patterns
  const name = text.split('(')[0].trim()
  if (name && name !== '') {
    return `person:${toSlug(name)}`
  }
  return undefined
}

// Extract note titles from Notion links
function extractNoteTitles(text: string): string[] {
  if (!text) return []
  // Extract note names from Notion links like "Title (https://...)"
  const titles: string[] = []
  const parts = text.split('),')
  for (const part of parts) {
    const match = part.match(/^([^(]+)\s*\(/)
    if (match) {
      titles.push(match[1].trim())
    }
  }
  return titles
}

// Map Notion status to our status
function mapStatus(notionStatus: string): string {
  const statusMap: Record<string, string> = {
    'Development Phase': 'active',
    'Active': 'active',
    'In Progress': 'active',
    'Archived': 'archived',
    'Completed': 'completed',
    'Backlog': 'backlog',
    'Planning': 'planning',
    'On Hold': 'on-hold',
    'Cancelled': 'cancelled',
    '': 'draft'
  }
  return statusMap[notionStatus] || 'draft'
}

async function main() {
  console.log('📦 Import Notion Projects\n')
  console.log(`Mode: ${DRY_RUN ? '🔍 DRY RUN' : '✏️  APPLYING'}\n`)

  // Read CSV file
  if (!fs.existsSync(NOTION_CSV)) {
    console.error(`CSV not found: ${NOTION_CSV}`)
    process.exit(1)
  }

  const csvContent = fs.readFileSync(NOTION_CSV, 'utf-8')
  const lines = csvContent.split('\n').filter(l => l.trim())
  
  if (lines.length < 2) {
    console.error('CSV has no data rows')
    process.exit(1)
  }

  // Parse header
  const headers = parseCSVLine(lines[0])
  console.log('CSV Headers:', headers.slice(0, 10).join(', '), '...\n')

  // Find column indices
  const cols = {
    name: headers.indexOf('Name'),
    status: headers.indexOf('Project Status'),
    id: headers.indexOf('ID'),
    lead: headers.indexOf('Project Lead'),
    team: headers.indexOf('Team Members'),
    client: headers.indexOf('Client'),
    notes: headers.indexOf('Notes'),
    github: headers.indexOf('GitHub'),
    prodUrl: headers.indexOf('Production URL'),
    stagingUrl: headers.indexOf('Staging URL'),
    toolkit: headers.indexOf('Toolkit'),
    description: headers.indexOf('Description'),
    relatedContent: headers.indexOf('Related Content'),
  }

  // Parse rows
  const projects: Project[] = []
  const skipped: string[] = []

  for (let i = 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i])
    const name = fields[cols.name]?.trim()
    
    if (!name || name === '' || name.includes('[TEMPLATE]')) {
      if (name) skipped.push(name)
      continue
    }

    const slug = toSlug(name)
    const project: Project = {
      id: `proj:${slug}`,
      slug,
      name,
      status: mapStatus(fields[cols.status] || ''),
      notionId: fields[cols.id] || undefined,
    }

    // Optional fields
    if (fields[cols.description]?.trim()) {
      project.description = fields[cols.description].trim()
    }
    
    if (fields[cols.lead]?.trim()) {
      const leadName = fields[cols.lead].trim()
      if (leadName !== '') {
        project.lead = `person:${toSlug(leadName)}`
      }
    }

    if (fields[cols.team]?.trim()) {
      const teamNames = fields[cols.team].split(',').map(t => t.trim()).filter(t => t)
      if (teamNames.length > 0) {
        project.team = teamNames.map(name => `person:${toSlug(name)}`)
      }
    }

    if (fields[cols.client]?.trim()) {
      const clientRef = extractPersonRef(fields[cols.client])
      if (clientRef) {
        project.client = clientRef.replace('person:', 'org:')
      }
    }

    // Extract related notes
    const noteRefs: string[] = []
    if (fields[cols.notes]?.trim()) {
      noteRefs.push(...extractNoteTitles(fields[cols.notes]))
    }
    if (fields[cols.relatedContent]?.trim()) {
      noteRefs.push(...extractNoteTitles(fields[cols.relatedContent]))
    }
    if (noteRefs.length > 0) {
      project.notes = [...new Set(noteRefs)] // dedupe
    }

    if (fields[cols.github]?.trim()) {
      project.github = fields[cols.github].trim()
    }

    if (fields[cols.prodUrl]?.trim()) {
      project.productionUrl = fields[cols.prodUrl].trim()
    }

    if (fields[cols.stagingUrl]?.trim()) {
      project.stagingUrl = fields[cols.stagingUrl].trim()
    }

    if (fields[cols.toolkit]?.trim()) {
      const tools = extractNoteTitles(fields[cols.toolkit])
      if (tools.length > 0) {
        project.toolkit = tools
      }
    }

    // Add tags based on project type
    const tags: string[] = []
    if (name.includes('.com') || name.includes('.org') || name.includes('.tv')) {
      tags.push('website')
    }
    if (project.toolkit?.some(t => /react|vue|svelte|next/i.test(t))) {
      tags.push('frontend')
    }
    if (project.toolkit?.some(t => /node|deno|python|rust/i.test(t))) {
      tags.push('backend')
    }
    if (tags.length > 0) {
      project.tags = tags
    }

    projects.push(project)
  }

  console.log(`✓ Parsed ${projects.length} projects`)
  if (skipped.length > 0) {
    console.log(`✓ Skipped ${skipped.length} entries (templates/empty)`)
  }

  // Group by status
  const byStatus = projects.reduce((acc, p) => {
    acc[p.status] = (acc[p.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  console.log('\nBy status:')
  for (const [status, count] of Object.entries(byStatus).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${status}: ${count}`)
  }

  // Show sample projects
  console.log('\nSample projects:')
  for (const p of projects.slice(0, 5)) {
    console.log(`  • ${p.name} [${p.status}]`)
    if (p.lead) console.log(`    Lead: ${p.lead}`)
    if (p.notes?.length) console.log(`    Notes: ${p.notes.length} linked`)
  }

  // Create projects.data
  const projectsData = {
    "@context": {
      "fg": "https://filegraph.local/"
    },
    "@id": "fg:entities:projects",
    "@type": "ProjectCollection",
    "description": "All projects in the vault",
    "items": projects,
    "totalCount": { "@expr": "items.length" },
    "activeCount": { "@expr": "items.filter(p => p.status == 'active').length" },
    "archivedCount": { "@expr": "items.filter(p => p.status == 'archived').length" },
    "byStatus": { "@expr": "items.reduce((acc, p) => { acc[p.status] = (acc[p.status] || 0) + 1; return acc }, {})" }
  }

  if (DRY_RUN) {
    console.log('\n📝 Would write projects.data with', projects.length, 'projects')
    console.log('\nTo apply changes, run:')
    console.log('  npx tsx scripts/import-notion-projects.ts --apply')
  } else {
    // Backup existing
    if (fs.existsSync(PROJECTS_PATH)) {
      fs.copyFileSync(PROJECTS_PATH, PROJECTS_PATH + '.backup')
    }
    
    fs.writeFileSync(PROJECTS_PATH, JSON.stringify(projectsData, null, 2))
    console.log('\n✅ Wrote projects.data with', projects.length, 'projects')
    console.log(`   Backup saved to: ${PROJECTS_PATH}.backup`)
  }

  // Return projects for relationship synthesis
  return projects
}

main().catch(console.error)
