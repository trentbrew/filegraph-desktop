#!/usr/bin/env tsx
/**
 * List Orphaned Notes for Manual Curation
 * 
 * Shows orphaned notes with their titles and first few lines of content
 * to help decide what they should link to.
 */

import { homedir } from 'os'
import { join } from 'path'
import { readFile, readdir } from 'fs/promises'

const VAULT_PATH = join(homedir(), '.filegraph')

async function main() {
  // Load synthesized edges
  const edgesFile = join(VAULT_PATH, '@notes', '_synthesized_edges_.data')
  const edgesData = JSON.parse(await readFile(edgesFile, 'utf-8'))
  
  const connectedNotes = new Set([
    ...edgesData.items.map((e: any) => e.source),
    ...edgesData.items.map((e: any) => e.target),
  ])
  
  // Load all notes
  const notesDir = join(VAULT_PATH, '@notes')
  const entries = await readdir(notesDir, { withFileTypes: true })
  
  const orphans: Array<{
    id: string
    title: string
    filename: string
    status: string
    headings: string[]
    excerpt: string
    blockCount: number
  }> = []
  
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.note')) continue
    if (entry.name.startsWith('.') || entry.name.startsWith('_')) continue
    
    try {
      const content = await readFile(join(notesDir, entry.name), 'utf-8')
      const data = JSON.parse(content)
      const id = data['@id'] || data.id
      
      if (!connectedNotes.has(id)) {
        // Extract content preview
        let excerpt = ''
        const headings: string[] = []
        
        for (const block of (data.blocks || []).slice(0, 10)) {
          if (block.type === 'heading') {
            const text = (block.content || []).map((c: any) => c.text || '').join('')
            headings.push(text)
          } else if (block.type === 'paragraph') {
            const text = (block.content || []).map((c: any) => c.text || '').join('')
            if (text && excerpt.length < 200) {
              excerpt += text + ' '
            }
          }
        }
        
        orphans.push({
          id,
          title: data.title || entry.name.replace('.note', ''),
          filename: entry.name,
          status: data.status || 'unknown',
          headings: headings.slice(0, 3),
          excerpt: excerpt.trim().slice(0, 200),
          blockCount: (data.blocks || []).length,
        })
      }
    } catch {}
  }
  
  // Sort by title
  orphans.sort((a, b) => a.title.localeCompare(b.title))
  
  console.log(`\n📋 ORPHANED NOTES (${orphans.length} total)\n`)
  console.log('These notes have no synthesized edges. Review for manual linking.\n')
  console.log('─'.repeat(80))
  
  orphans.forEach((note, i) => {
    console.log(`\n${i + 1}. "${note.title}" (${note.blockCount} blocks)`)
    console.log(`   ID: ${note.id}`)
    console.log(`   Status: ${note.status}`)
    if (note.headings.length > 0) {
      console.log(`   Headings: ${note.headings.join(' | ')}`)
    }
    if (note.excerpt) {
      console.log(`   Preview: ${note.excerpt.slice(0, 150)}${note.excerpt.length > 150 ? '...' : ''}`)
    }
  })
  
  // Output as JSON for easier processing
  const outputFile = join(VAULT_PATH, '.filegraph', 'logs', 'orphaned-notes.json')
  await import('fs/promises').then(fs => 
    fs.writeFile(outputFile, JSON.stringify(orphans, null, 2))
  )
  console.log(`\n\n📄 Full list saved to: ${outputFile.replace(VAULT_PATH, '~')}`)
}

main().catch(console.error)
