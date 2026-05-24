#!/usr/bin/env tsx
/**
 * Query Synthesized Edges
 * 
 * Demonstrates querying the auto-generated edges from note synthesis
 */

import { homedir } from 'os'
import { join } from 'path'
import { readFile } from 'fs/promises'

const VAULT_PATH = join(homedir(), '.filegraph')

interface SynthesizedEdge {
  source: string
  target: string
  type: 'mentions' | 'references' | 'related' | 'wikilink'
  confidence: 'high' | 'medium' | 'low'
  context?: string
}

async function loadNotes(): Promise<Map<string, { title: string; path: string }>> {
  const notes = new Map()
  const notesDir = join(VAULT_PATH, '@notes')
  const { readdir } = await import('fs/promises')
  
  const entries = await readdir(notesDir, { withFileTypes: true })
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.note')) continue
    if (entry.name.startsWith('.') || entry.name.startsWith('_')) continue
    
    try {
      const content = await readFile(join(notesDir, entry.name), 'utf-8')
      const data = JSON.parse(content)
      const id = data['@id'] || data.id
      if (id) {
        notes.set(id, { title: data.title, path: entry.name })
      }
    } catch {}
  }
  
  return notes
}

async function main() {
  console.log('🔍 Query Synthesized Edges\n')
  
  // Load synthesized edges
  const edgesFile = join(VAULT_PATH, '@notes', '_synthesized_edges_.data')
  const edgesData = JSON.parse(await readFile(edgesFile, 'utf-8'))
  const edges: SynthesizedEdge[] = edgesData.items
  
  // Load notes for title resolution
  const notes = await loadNotes()
  
  console.log('═'.repeat(80))
  console.log(`📊 SYNTHESIZED EDGE STATISTICS`)
  console.log('─'.repeat(80))
  console.log(`Total edges: ${edges.length}`)
  console.log(`Generated at: ${edgesData.generatedAt}`)
  
  // By type
  const byType: Record<string, number> = {}
  edges.forEach(e => { byType[e.type] = (byType[e.type] || 0) + 1 })
  console.log('\nBy type:')
  Object.entries(byType).forEach(([type, count]) => console.log(`  ${type}: ${count}`))
  
  // By confidence
  const byConf: Record<string, number> = {}
  edges.forEach(e => { byConf[e.confidence] = (byConf[e.confidence] || 0) + 1 })
  console.log('\nBy confidence:')
  Object.entries(byConf).forEach(([conf, count]) => console.log(`  ${conf}: ${count}`))
  
  // Most connected notes
  console.log('\n' + '═'.repeat(80))
  console.log('🔗 MOST CONNECTED NOTES')
  console.log('─'.repeat(80))
  
  const outgoing: Record<string, number> = {}
  const incoming: Record<string, number> = {}
  edges.forEach(e => {
    outgoing[e.source] = (outgoing[e.source] || 0) + 1
    incoming[e.target] = (incoming[e.target] || 0) + 1
  })
  
  const topOutgoing = Object.entries(outgoing).sort((a, b) => b[1] - a[1]).slice(0, 10)
  const topIncoming = Object.entries(incoming).sort((a, b) => b[1] - a[1]).slice(0, 10)
  
  console.log('\nMost references (outgoing):')
  topOutgoing.forEach(([id, count]) => {
    const note = notes.get(id)
    console.log(`  ${count.toString().padStart(3)} → ${note?.title || id}`)
  })
  
  console.log('\nMost referenced (incoming):')
  topIncoming.forEach(([id, count]) => {
    const note = notes.get(id)
    console.log(`  ${count.toString().padStart(3)} ← ${note?.title || id}`)
  })
  
  // Query: Find all notes related to a specific topic
  console.log('\n' + '═'.repeat(80))
  console.log('🔎 SAMPLE QUERIES')
  console.log('─'.repeat(80))
  
  // Query 1: Find notes related to "A Killer Demo"
  const killerDemoId = [...notes.entries()].find(([, n]) => n.title === 'A Killer Demo')?.[0]
  if (killerDemoId) {
    console.log('\nQuery: Notes related to "A Killer Demo"')
    const related = edges.filter(e => 
      (e.source === killerDemoId || e.target === killerDemoId) && e.type === 'related'
    )
    console.log(`Found ${related.length} related notes:`)
    related.slice(0, 5).forEach(e => {
      const otherId = e.source === killerDemoId ? e.target : e.source
      const otherNote = notes.get(otherId)
      console.log(`  • ${otherNote?.title || otherId}`)
      if (e.context) console.log(`    ${e.context}`)
    })
  }
  
  // Query 2: Find high-confidence reference chains
  console.log('\nQuery: High-confidence reference edges')
  const highConfRefs = edges.filter(e => e.confidence === 'high' && e.type === 'references')
  console.log(`Found ${highConfRefs.length} high-confidence references:`)
  highConfRefs.slice(0, 5).forEach(e => {
    const srcNote = notes.get(e.source)
    const tgtNote = notes.get(e.target)
    console.log(`  "${srcNote?.title}" → "${tgtNote?.title}"`)
  })
  
  // Query 3: Find clusters (notes with multiple bidirectional connections)
  console.log('\nQuery: Bidirectional connections (mutual references)')
  const edgeSet = new Set(edges.map(e => `${e.source}|${e.target}`))
  const bidirectional: Array<{ a: string; b: string }> = []
  
  for (const edge of edges) {
    const reverse = `${edge.target}|${edge.source}`
    if (edgeSet.has(reverse)) {
      const key = [edge.source, edge.target].sort().join('|')
      if (!bidirectional.some(b => [b.a, b.b].sort().join('|') === key)) {
        bidirectional.push({ a: edge.source, b: edge.target })
      }
    }
  }
  
  console.log(`Found ${bidirectional.length} bidirectional connections:`)
  bidirectional.slice(0, 5).forEach(({ a, b }) => {
    const noteA = notes.get(a)
    const noteB = notes.get(b)
    console.log(`  "${noteA?.title}" ↔ "${noteB?.title}"`)
  })
  
  // Query 4: Orphaned notes (no edges)
  console.log('\nQuery: Orphaned notes (no synthesized edges)')
  const connectedNotes = new Set([
    ...edges.map(e => e.source),
    ...edges.map(e => e.target),
  ])
  const orphaned = [...notes.entries()].filter(([id]) => !connectedNotes.has(id))
  console.log(`Found ${orphaned.length} orphaned notes out of ${notes.size} total`)
  console.log('Sample orphans:')
  orphaned.slice(0, 5).forEach(([, note]) => {
    console.log(`  • ${note.title}`)
  })
  
  console.log('\n' + '═'.repeat(80))
}

main().catch(console.error)
