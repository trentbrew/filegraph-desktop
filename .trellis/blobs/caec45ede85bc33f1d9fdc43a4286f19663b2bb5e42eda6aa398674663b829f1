#!/usr/bin/env tsx
/**
 * Analyze Note Links
 * 
 * Discovers potential links in imported Notion notes using multiple strategies:
 * 1. Existing structured mentions (type: "mention")
 * 2. Title references (note titles mentioned in other notes)
 * 3. Entity ID patterns (person:, proj:, etc.)
 * 4. Common topic extraction (headings, keywords)
 */

import { homedir } from 'os'
import { join } from 'path'
import { readdir, readFile, writeFile, mkdir } from 'fs/promises'

const VAULT_PATH = join(homedir(), '.filegraph')
const LOGS_DIR = join(VAULT_PATH, '.filegraph', 'logs')

interface NoteData {
  path: string
  id: string
  title: string
  status: string
  blocks: any[]
  fullText: string
  headings: string[]
  existingMentions: string[]
}

interface PotentialLink {
  sourceNote: string
  sourceTitle: string
  targetNote?: string
  targetTitle?: string
  targetEntityId?: string
  linkType: 'title_reference' | 'entity_mention' | 'existing_mention' | 'topic_overlap' | 'heading_match'
  confidence: 'high' | 'medium' | 'low'
  context: string
}

async function readNoteFile(filePath: string): Promise<any> {
  try {
    const content = await readFile(filePath, 'utf-8')
    return JSON.parse(content)
  } catch {
    return null
  }
}

async function getAllNotes(): Promise<NoteData[]> {
  const results: NoteData[] = []
  const notesDir = join(VAULT_PATH, '@notes')
  
  try {
    const entries = await readdir(notesDir, { withFileTypes: true })
    
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.note')) continue
      if (entry.name.startsWith('.') || entry.name.startsWith('_')) continue
      
      const fullPath = join(notesDir, entry.name)
      const data = await readNoteFile(fullPath)
      if (!data) continue
      
      // Extract full text from blocks
      let fullText = ''
      const headings: string[] = []
      const existingMentions: string[] = []
      
      function extractFromBlocks(blocks: any[]) {
        for (const block of blocks || []) {
          if (block.type === 'heading') {
            const headingText = (block.content || [])
              .map((c: any) => c.text || '')
              .join('')
            headings.push(headingText)
          }
          
          for (const content of block.content || []) {
            if (content.type === 'text') {
              fullText += ' ' + content.text
            } else if (content.type === 'mention' && content.entityId) {
              existingMentions.push(content.entityId)
            }
          }
          
          if (block.children) {
            extractFromBlocks(block.children)
          }
        }
      }
      
      extractFromBlocks(data.blocks || [])
      
      results.push({
        path: fullPath.replace(VAULT_PATH, '~'),
        id: data['@id'] || data.id || entry.name,
        title: data.title || entry.name.replace('.note', ''),
        status: data.status || 'unknown',
        blocks: data.blocks || [],
        fullText: fullText.toLowerCase(),
        headings,
        existingMentions,
      })
    }
  } catch (err) {
    console.error('Error scanning notes:', err)
  }
  
  return results
}

function findTitleReferences(notes: NoteData[]): PotentialLink[] {
  const links: PotentialLink[] = []
  
  // Build a map of normalized titles
  const titleMap = new Map<string, NoteData>()
  for (const note of notes) {
    const normalized = note.title.toLowerCase().trim()
    if (normalized.length > 3) { // Skip very short titles
      titleMap.set(normalized, note)
    }
  }
  
  // Search each note for mentions of other titles
  for (const sourceNote of notes) {
    for (const [title, targetNote] of titleMap) {
      if (sourceNote.id === targetNote.id) continue // Don't self-link
      if (title.length < 5) continue // Skip very short titles to reduce noise
      
      // Check if title appears in full text
      if (sourceNote.fullText.includes(title)) {
        // Find context
        const idx = sourceNote.fullText.indexOf(title)
        const context = sourceNote.fullText.slice(Math.max(0, idx - 50), idx + title.length + 50).trim()
        
        links.push({
          sourceNote: sourceNote.path,
          sourceTitle: sourceNote.title,
          targetNote: targetNote.path,
          targetTitle: targetNote.title,
          linkType: 'title_reference',
          confidence: title.length > 15 ? 'high' : 'medium',
          context: `...${context}...`,
        })
      }
    }
  }
  
  return links
}

function findEntityPatterns(notes: NoteData[]): PotentialLink[] {
  const links: PotentialLink[] = []
  const entityPattern = /\b(person|proj|org|task|ms|acc|bill|event|goal|note):[a-z0-9_-]+(?::[0-9]+)?\b/gi
  
  for (const note of notes) {
    const matches = note.fullText.match(entityPattern) || []
    
    for (const match of matches) {
      // Skip if already in existing mentions
      if (note.existingMentions.includes(match)) continue
      
      const idx = note.fullText.indexOf(match.toLowerCase())
      const context = note.fullText.slice(Math.max(0, idx - 30), idx + match.length + 30).trim()
      
      links.push({
        sourceNote: note.path,
        sourceTitle: note.title,
        targetEntityId: match,
        linkType: 'entity_mention',
        confidence: 'high',
        context: `...${context}...`,
      })
    }
  }
  
  return links
}

function findTopicOverlaps(notes: NoteData[]): PotentialLink[] {
  const links: PotentialLink[] = []
  
  // Extract meaningful keywords from headings
  const stopWords = new Set(['the', 'and', 'for', 'with', 'from', 'that', 'this', 'what', 'how', 'why', 'when', 'where', 'who', 'which', 'your', 'our', 'their', 'about', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'under', 'over', 'out', 'off', 'down', 'away', 'more', 'most', 'other', 'some', 'such', 'only', 'same', 'than', 'too', 'very', 'just', 'also', 'back', 'been', 'being', 'both', 'but', 'can', 'did', 'does', 'doing', 'done', 'each', 'few', 'get', 'got', 'had', 'has', 'have', 'having', 'here', 'herself', 'himself', 'itself', 'myself', 'ourselves', 'themselves', 'yourself'])
  
  const noteKeywords = new Map<NoteData, Set<string>>()
  
  for (const note of notes) {
    const keywords = new Set<string>()
    
    // Extract from headings (more weight)
    for (const heading of note.headings) {
      const words = heading.toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 4 && !stopWords.has(w))
      
      words.forEach(w => keywords.add(w))
    }
    
    // Extract from title
    const titleWords = note.title.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 4 && !stopWords.has(w))
    
    titleWords.forEach(w => keywords.add(w))
    
    noteKeywords.set(note, keywords)
  }
  
  // Find overlapping keywords between notes
  const checked = new Set<string>()
  
  for (const [note1, keywords1] of noteKeywords) {
    for (const [note2, keywords2] of noteKeywords) {
      if (note1.id === note2.id) continue
      
      const pairKey = [note1.id, note2.id].sort().join('|')
      if (checked.has(pairKey)) continue
      checked.add(pairKey)
      
      const overlap = [...keywords1].filter(k => keywords2.has(k))
      
      if (overlap.length >= 3) {
        links.push({
          sourceNote: note1.path,
          sourceTitle: note1.title,
          targetNote: note2.path,
          targetTitle: note2.title,
          linkType: 'topic_overlap',
          confidence: overlap.length >= 5 ? 'high' : 'medium',
          context: `Shared topics: ${overlap.slice(0, 10).join(', ')}`,
        })
      }
    }
  }
  
  return links
}

function countExistingMentions(notes: NoteData[]): Map<string, number> {
  const counts = new Map<string, number>()
  
  for (const note of notes) {
    for (const mention of note.existingMentions) {
      counts.set(mention, (counts.get(mention) || 0) + 1)
    }
  }
  
  return counts
}

async function main() {
  console.log('🔍 Analyzing Note Links\n')
  console.log(`Vault: ${VAULT_PATH}\n`)
  
  await mkdir(LOGS_DIR, { recursive: true })
  
  // Load all notes
  console.log('Loading notes...')
  const notes = await getAllNotes()
  console.log(`✓ Loaded ${notes.length} notes\n`)
  
  // Count existing mentions
  console.log('═'.repeat(80))
  console.log('📊 EXISTING STRUCTURED MENTIONS')
  console.log('─'.repeat(80))
  const existingCounts = countExistingMentions(notes)
  const notesWithMentions = notes.filter(n => n.existingMentions.length > 0)
  console.log(`Notes with existing mentions: ${notesWithMentions.length}`)
  console.log(`Total existing mentions: ${[...existingCounts.values()].reduce((a, b) => a + b, 0)}`)
  console.log(`Unique entities mentioned: ${existingCounts.size}`)
  console.log('\nTop mentioned entities:')
  const sorted = [...existingCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)
  sorted.forEach(([entity, count]) => console.log(`  ${entity}: ${count} mentions`))
  
  // Find title references
  console.log('\n' + '═'.repeat(80))
  console.log('🔗 TITLE REFERENCES (note titles mentioned in other notes)')
  console.log('─'.repeat(80))
  const titleLinks = findTitleReferences(notes)
  const highConfTitle = titleLinks.filter(l => l.confidence === 'high')
  const medConfTitle = titleLinks.filter(l => l.confidence === 'medium')
  console.log(`Found ${titleLinks.length} potential title references`)
  console.log(`  High confidence: ${highConfTitle.length}`)
  console.log(`  Medium confidence: ${medConfTitle.length}`)
  console.log('\nSample high-confidence title references:')
  highConfTitle.slice(0, 5).forEach(link => {
    console.log(`\n  "${link.sourceTitle}" → "${link.targetTitle}"`)
    console.log(`  Context: ${link.context.slice(0, 100)}`)
  })
  
  // Find entity patterns
  console.log('\n' + '═'.repeat(80))
  console.log('🏷️  ENTITY ID PATTERNS (unlinked person:, proj:, etc.)')
  console.log('─'.repeat(80))
  const entityLinks = findEntityPatterns(notes)
  console.log(`Found ${entityLinks.length} entity ID patterns not yet linked`)
  const byType: Record<string, number> = {}
  entityLinks.forEach(l => {
    const type = l.targetEntityId?.split(':')[0] || 'unknown'
    byType[type] = (byType[type] || 0) + 1
  })
  console.log('\nBy entity type:')
  Object.entries(byType).forEach(([type, count]) => console.log(`  ${type}: ${count}`))
  console.log('\nSample entity references:')
  entityLinks.slice(0, 5).forEach(link => {
    console.log(`\n  "${link.sourceTitle}" → ${link.targetEntityId}`)
    console.log(`  Context: ${link.context.slice(0, 80)}`)
  })
  
  // Find topic overlaps
  console.log('\n' + '═'.repeat(80))
  console.log('🧩 TOPIC OVERLAPS (notes with shared keywords)')
  console.log('─'.repeat(80))
  const topicLinks = findTopicOverlaps(notes)
  const highConfTopic = topicLinks.filter(l => l.confidence === 'high')
  console.log(`Found ${topicLinks.length} topic-based connections`)
  console.log(`  High confidence (5+ shared topics): ${highConfTopic.length}`)
  console.log('\nSample high-confidence topic overlaps:')
  highConfTopic.slice(0, 10).forEach(link => {
    console.log(`\n  "${link.sourceTitle}" ↔ "${link.targetTitle}"`)
    console.log(`  ${link.context}`)
  })
  
  // Summary
  console.log('\n' + '═'.repeat(80))
  console.log('📈 SUMMARY')
  console.log('─'.repeat(80))
  console.log(`
Total notes analyzed: ${notes.length}
Notes with existing structured mentions: ${notesWithMentions.length} (${(notesWithMentions.length / notes.length * 100).toFixed(1)}%)

Potential new links discovered:
  - Title references: ${titleLinks.length} (${highConfTitle.length} high confidence)
  - Entity patterns: ${entityLinks.length}
  - Topic overlaps: ${topicLinks.length} (${highConfTopic.length} high confidence)
  
TOTAL POTENTIAL NEW LINKS: ${titleLinks.length + entityLinks.length + topicLinks.length}
`)

  // Write detailed results to log file
  const logFile = join(LOGS_DIR, `note-links-analysis-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
  const results = {
    timestamp: new Date().toISOString(),
    summary: {
      totalNotes: notes.length,
      notesWithMentions: notesWithMentions.length,
      existingMentionCount: [...existingCounts.values()].reduce((a, b) => a + b, 0),
      potentialTitleLinks: titleLinks.length,
      potentialEntityLinks: entityLinks.length,
      potentialTopicLinks: topicLinks.length,
    },
    existingMentionCounts: Object.fromEntries(existingCounts),
    titleReferences: titleLinks.slice(0, 100),
    entityPatterns: entityLinks.slice(0, 100),
    topicOverlaps: highConfTopic.slice(0, 100),
  }
  
  await writeFile(logFile, JSON.stringify(results, null, 2))
  console.log(`📄 Detailed results: ${logFile}`)
  
  // Recommendations
  console.log('\n' + '═'.repeat(80))
  console.log('💡 RECOMMENDATIONS')
  console.log('─'.repeat(80))
  console.log(`
1. DETERMINISTIC APPROACH (Low cost, high precision):
   - Convert ${entityLinks.length} entity ID patterns to structured mentions
   - This requires no AI - just regex matching and JSON updates
   - Estimated time: < 1 minute to process all notes

2. HEURISTIC APPROACH (Medium cost, good precision):  
   - Create wikilinks for ${highConfTitle.length} high-confidence title references
   - Convert topic overlaps to "related notes" edges
   - Estimated time: 1-2 minutes

3. SEMANTIC APPROACH (Higher cost, discovers novel links):
   - Use embeddings to find semantically similar notes
   - Have AI suggest links based on content understanding
   - Good for: notes with no obvious keyword overlap
   - Estimated time: ~1 token/word × ${notes.length} notes

RECOMMENDED STRATEGY:
Start with (1) and (2) first - they're free and deterministic.
Then selectively use (3) for notes that remain unconnected.
`)
}

main().catch(console.error)
