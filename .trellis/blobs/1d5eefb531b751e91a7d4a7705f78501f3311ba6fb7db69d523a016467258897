#!/usr/bin/env tsx
/**
 * Manual Curation of Orphaned Notes
 * 
 * Adds curated edges for notes that didn't get automatic links.
 * Run with --apply to write changes.
 */

import { homedir } from 'os'
import { join } from 'path'
import { readFile, writeFile } from 'fs/promises'

const VAULT_PATH = join(homedir(), '.filegraph')
const DRY_RUN = !process.argv.includes('--apply')

interface CuratedEdge {
  source: string
  target: string
  type: 'related' | 'references' | 'part-of' | 'example-of'
  confidence: 'high' | 'medium'
  context: string
  curatedBy: 'manual'
  createdAt: string
}

// Manual curation based on content review
// Format: [sourceId, targetTitle, type, context]
// NOTE: targetTitle must match an existing note title exactly!
const curatedLinks: Array<[string, string, CuratedEdge['type'], string]> = [
  // ═══════════════════════════════════════════════════════════════════════════
  // AGENT/AI RELATED
  // ═══════════════════════════════════════════════════════════════════════════
  ['note:notion-255', 'Agent Architecture', 'related', 'Agent autonomy prompt for LLM agents'],
  ['note:notion-250', 'Agent Architecture', 'related', 'Daria is an AI agent persona'],
  ['note:notion-99', 'Agent Architecture', 'related', 'Telly is a Docket AI agent'],
  ['note:notion-391', 'Agent Architecture', 'related', 'Magic - agent behavior patterns'],
  ['note:notion-255', 'BMO (Custom Agents)', 'related', 'LLM autonomy prompts'],
  ['note:notion-250', 'BMO (Custom Agents)', 'example-of', 'Example agent persona'],
  ['note:notion-255', 'Multi-agent architecture', 'related', 'Agent autonomy patterns'],
  ['note:"generate-content"', 'Agent Architecture', 'related', 'Workflow mockups for agents'],
  
  // ═══════════════════════════════════════════════════════════════════════════
  // DOCKET TV / BROADCASTING
  // ═══════════════════════════════════════════════════════════════════════════
  ['note:notion-74', 'DocketTV Manifesto', 'related', 'Cablecast competitor pricing'],
  ['note:notion-57', 'DocketTV Manifesto', 'related', 'Current state of TV guides'],
  ['note:notion-318', 'DocketTV Manifesto', 'related', 'Cablecast VOD training'],
  ['note:notion-99', 'DocketTV Manifesto', 'part-of', 'Telly is Docket AI agent'],
  ['note:notion-40', 'DocketTV Manifesto', 'related', 'Content submission form for SF Commons'],
  ['note:notion-74', 'Docket TV | GTM', 'related', 'Competitor pricing analysis'],
  ['note:notion-57', 'Docket TV | GTM', 'related', 'Market context for TV guides'],
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SCHEMA / DATA MODELING / ARCHITECTURE
  // ═══════════════════════════════════════════════════════════════════════════
  ['note:notion-317', 'Architecture', 'related', 'Schema definitions'],
  ['note:notion-441', 'Architecture', 'related', 'JSON-LD task template'],
  ['note:notion-46', 'Architecture', 'related', 'Type definitions'],
  ['note:notion-346', 'Architecture', 'related', 'Spec document'],
  ['note:notion-268', 'Architecture', 'related', 'IndexedDB adapter implementation'],
  ['note:notion-281', 'Architecture', 'related', 'Query resolver design'],
  ['note:notion-438', 'Architecture', 'related', 'Primitive objects'],
  ['note:notion-143', 'Architecture', 'related', 'Plugins architecture'],
  ['note:notion-308', 'Architecture', 'related', 'Multi-tenant flow'],
  ['note:notion-361', 'Architecture', 'related', 'VizTerm visual terminal'],
  ['note:notion-424', 'Architecture', 'related', 'Story config redesign'],
  ['note:notion-222', 'Architecture', 'related', 'ACL access control'],
  ['note:number;', 'Architecture', 'related', 'Syntax definitions'],
  ['note:entity-link-showcase', 'Architecture', 'example-of', 'Entity links demo'],
  
  // ═══════════════════════════════════════════════════════════════════════════
  // DSL / LANGUAGE DESIGN
  // ═══════════════════════════════════════════════════════════════════════════
  ['note:notion-409', 'LD-C for RAG', 'related', 'Layout DSL design'],
  ['note:notion-400', 'LD-C for RAG', 'related', 'LD-CY YAML expansion'],
  ['note:notion-407', 'LD-C for RAG', 'related', 'Why LD-C for RAG'],
  ['note:notion-178', 'LD-C for RAG', 'related', 'Pilot DSLs for different domains'],
  ['note:notion-409', 'LD-C + Nodebook → YC', 'related', 'Layout DSL for nodebook'],
  ['note:notion-400', 'LD-C + Nodebook → YC', 'related', 'LD-CY syntax'],
  
  // ═══════════════════════════════════════════════════════════════════════════
  // PROJECT PLANNING / TIMELINE
  // ═══════════════════════════════════════════════════════════════════════════
  ['note:notion-273', 'Timeline', 'part-of', 'Cycle 1 planning'],
  ['note:notion-320', 'Timeline', 'part-of', 'Patch plan'],
  ['note:notion-289', 'Timeline', 'related', 'Phase planning'],
  ['note:notion-155', 'Timeline', 'part-of', 'Final sprint tasks'],
  ['note:notion-383', 'Timeline', 'related', 'State of project update'],
  
  // ═══════════════════════════════════════════════════════════════════════════
  // DESIGN / BRANDING
  // ═══════════════════════════════════════════════════════════════════════════
  ['note:notion-329', 'Brand Guide', 'related', 'Logo designs'],
  ['note:notion-183', 'Brand Guide', 'related', 'Logo 2.0 iteration'],
  ['note:notion-166', 'Brand Guide', 'related', 'Design concepts v2'],
  ['note:notion-120', 'Brand Guide', 'related', 'Initial brand concepts'],
  ['note:notion-206', 'Brand Guide', 'related', 'Landing page headers'],
  ['note:notion-32', 'Brand Guide', 'related', 'Blog thumbnails'],
  ['note:notion-329', 'Turtle Labs | Brand Manifesto', 'related', 'Logo concepts'],
  ['note:notion-183', 'Turtle Labs | Brand Manifesto', 'related', 'Logo iteration'],
  
  // ═══════════════════════════════════════════════════════════════════════════
  // FEATURES
  // ═══════════════════════════════════════════════════════════════════════════
  ['note:ideas', 'Features', 'related', 'Feature ideas brainstorm'],
  ['note:notion-161', 'Features', 'related', 'Bug tracking and fixes'],
  ['note:notion-347', 'Features', 'related', 'Deno task runner features'],
  ['note:notion-365', 'Features', 'related', 'Unit testing features'],
  
  // ═══════════════════════════════════════════════════════════════════════════
  // RESEARCH / DEEP RESEARCH
  // ═══════════════════════════════════════════════════════════════════════════
  ['note:notion-263', 'Deep Research', 'related', 'Akshay Kothari interview notes'],
  ['note:notion-251', 'Deep Research', 'related', 'Video-language cognitive bridge'],
  ['note:notion-278', 'Deep Research', 'related', 'SAM.gov API research'],
  ['note:notion-171', 'Deep Research', 'related', 'Groundedness framework'],
  ['note:notion-185', 'Deep Research', 'related', 'Purpose exploration'],
  
  // ═══════════════════════════════════════════════════════════════════════════
  // OVERVIEW / ANALYSIS
  // ═══════════════════════════════════════════════════════════════════════════
  ['note:notion-26', 'Analysis', 'related', 'Nigeria vs US LLC comparison'],
  ['note:notion-279', 'Analysis', 'related', 'RFP questions analysis'],
  ['note:notion-211', 'Analysis', 'related', 'PRECISE framework'],
  
  // ═══════════════════════════════════════════════════════════════════════════
  // MISC - Link to most relevant existing notes
  // ═══════════════════════════════════════════════════════════════════════════
  ['note:notion-449', 'Overview', 'related', 'Final project notes'],
  ['note:notion-144', 'Overview', 'related', 'July edits'],
  ['note:notion-367', 'Overview', 'related', 'Product dimensions'],
  ['note:notion-230', 'Overview', 'related', 'Sortitude project'],
  ['note:notion-337', 'Overview', 'related', 'Intake form'],
  
  // ═══════════════════════════════════════════════════════════════════════════
  // REMAINING MEANINGFUL ORPHANS
  // ═══════════════════════════════════════════════════════════════════════════
  ['note:notion-121', 'Overview', 'related', '50% Sync project carousel'],
  ['note:notion-141', 'Architecture', 'related', 'Sitemaps Claude conversation'],
  ['note:notion-174', 'Overview', 'related', 'March 2025 artist website discussion'],
  ['note:syntax', 'Architecture', 'example-of', 'Component syntax examples'],
  ['note:workflow-mockups', 'Agent Architecture', 'example-of', 'Workflow mockups with agent code'],
  ['note:notion-405', 'Overview', 'related', 'Stories notes'],
  ['note:notion-283', 'Overview', 'related', 'Wordpress audit notes'],
]

async function main() {
  console.log('🔧 Manual Curation of Orphaned Notes\n')
  console.log(`Mode: ${DRY_RUN ? '🔍 DRY RUN' : '✏️  APPLYING'}\n`)
  
  // Load existing edges
  const edgesFile = join(VAULT_PATH, '@notes', '_synthesized_edges_.data')
  const edgesData = JSON.parse(await readFile(edgesFile, 'utf-8'))
  
  // Load notes for title → id mapping
  const notesDir = join(VAULT_PATH, '@notes')
  const { readdir } = await import('fs/promises')
  const entries = await readdir(notesDir, { withFileTypes: true })
  
  const titleToId = new Map<string, string>()
  const idToTitle = new Map<string, string>()
  
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.note')) continue
    try {
      const content = await readFile(join(notesDir, entry.name), 'utf-8')
      const data = JSON.parse(content)
      const id = data['@id'] || data.id
      const title = data.title
      if (id && title) {
        titleToId.set(title.toLowerCase(), id)
        titleToId.set(title, id) // Also exact match
        idToTitle.set(id, title)
      }
    } catch {}
  }
  
  // Process curated links
  const newEdges: CuratedEdge[] = []
  const skipped: string[] = []
  
  for (const [sourceId, targetTitle, type, context] of curatedLinks) {
    const targetId = titleToId.get(targetTitle) || titleToId.get(targetTitle.toLowerCase())
    
    if (!targetId) {
      skipped.push(`${sourceId} → "${targetTitle}" (target not found)`)
      continue
    }
    
    // Check if edge already exists
    const exists = edgesData.items.some((e: any) => 
      e.source === sourceId && e.target === targetId
    )
    
    if (exists) {
      skipped.push(`${sourceId} → "${targetTitle}" (already exists)`)
      continue
    }
    
    newEdges.push({
      source: sourceId,
      target: targetId,
      type,
      confidence: 'high',
      context,
      curatedBy: 'manual',
      createdAt: new Date().toISOString(),
    })
  }
  
  console.log(`✓ Curated links to add: ${newEdges.length}`)
  console.log(`✓ Skipped: ${skipped.length}`)
  
  if (skipped.length > 0 && skipped.length <= 20) {
    console.log('\nSkipped links:')
    skipped.forEach(s => console.log(`  - ${s}`))
  }
  
  console.log('\nNew edges to add:')
  newEdges.slice(0, 10).forEach(e => {
    const srcTitle = idToTitle.get(e.source) || e.source
    const tgtTitle = idToTitle.get(e.target) || e.target
    console.log(`  "${srcTitle}" --[${e.type}]--> "${tgtTitle}"`)
  })
  if (newEdges.length > 10) {
    console.log(`  ... and ${newEdges.length - 10} more`)
  }
  
  if (!DRY_RUN) {
    // Add new edges
    edgesData.items.push(...newEdges)
    edgesData.stats.curatedEdges = newEdges.length
    edgesData.stats.totalEdges = edgesData.items.length
    edgesData.lastCurated = new Date().toISOString()
    
    await writeFile(edgesFile, JSON.stringify(edgesData, null, 2))
    console.log(`\n✅ Added ${newEdges.length} curated edges`)
    console.log(`Total edges now: ${edgesData.items.length}`)
  } else {
    console.log('\nTo apply changes, run:')
    console.log('  npx tsx scripts/curate-orphan-links.ts --apply')
  }
}

main().catch(console.error)
