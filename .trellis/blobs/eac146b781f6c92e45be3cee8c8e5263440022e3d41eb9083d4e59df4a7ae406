#!/usr/bin/env tsx
/**
 * Edge Synthesis Watcher
 *
 * Monitors entity and note files for changes and incrementally synthesizes edges.
 *
 * Features:
 * - File system watcher with debouncing
 * - Incremental synthesis (only processes changed entities)
 * - Background worker that runs continuously
 * - Status API for UI integration
 * - Automatic recovery from errors
 *
 * Usage:
 *   tsx scripts/edge-synthesis-watcher.ts          # Start watcher
 *   tsx scripts/edge-synthesis-watcher.ts --once   # Run once and exit
 */

import { watch } from 'fs'
import { join, basename } from 'path'
import { homedir } from 'os'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { FSWatcherQueue, type FSEvent, type FSEventBatch } from '../src/lib/tql/watcher-queue'

// Paths
const VAULT_PATH = join(process.cwd(), 'src', 'data', 'demo-files')
const ENTITIES_PATH = join(VAULT_PATH, '@entities')
const NOTES_PATH = join(VAULT_PATH, '@notes')
const STATUS_FILE = join(VAULT_PATH, '.filegraph', 'edge-synthesis-status.json')
const LOG_FILE = join(VAULT_PATH, '.filegraph', 'edge-synthesis.log')

// Configuration
const DEBOUNCE_MS = 1000 // Wait 1s after last change before processing
const WATCH_CONTINUOUS = !process.argv.includes('--once')

// Status tracking
interface SynthesisStatus {
  isRunning: boolean
  lastRun: string | null
  lastRunDuration: number | null
  pendingFiles: string[]
  processedCount: number
  edgesGenerated: number
  errors: string[]
  nextRun: string | null
}

let status: SynthesisStatus = {
  isRunning: false,
  lastRun: null,
  lastRunDuration: null,
  pendingFiles: [],
  processedCount: 0,
  edgesGenerated: 0,
  errors: [],
  nextRun: null,
}

// Dirty set: entities/notes that need edge updates
const dirtyFiles = new Set<string>()

// Logger
function log(message: string, level: 'info' | 'warn' | 'error' = 'info') {
  const timestamp = new Date().toISOString()
  const logLine = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`

  console.log(logLine.trimEnd())

  // Append to log file (fire and forget)
  appendLog(logLine).catch(() => {})
}

async function appendLog(line: string) {
  try {
    const { appendFile } = await import('fs/promises')
    await appendFile(LOG_FILE, line)
  } catch {
    // Ignore log write errors
  }
}

// Save status to file for UI to read
async function saveStatus() {
  try {
    await mkdir(join(VAULT_PATH, '.filegraph'), { recursive: true })
    await writeFile(STATUS_FILE, JSON.stringify(status, null, 2))
  } catch (err) {
    log(`Failed to save status: ${err}`, 'error')
  }
}

// Load a data file
async function loadDataFile<T = any>(filePath: string): Promise<T | null> {
  try {
    const content = await readFile(filePath, 'utf-8')
    return JSON.parse(content)
  } catch (err) {
    log(`Failed to load ${filePath}: ${err}`, 'error')
    return null
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// INCREMENTAL SYNTHESIS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Incrementally synthesize edges for changed files only
 */
async function synthesizeIncremental(changedFiles: string[]): Promise<number> {
  const startTime = Date.now()
  log(`Starting incremental synthesis for ${changedFiles.length} files`)

  let totalEdges = 0

  try {
    // Load existing graph
    const graphPath = join(ENTITIES_PATH, '_graph_.data')
    let graphData = await loadDataFile<{
      nodes: any[]
      edges: any[]
      lastUpdated?: string
    }>(graphPath)

    if (!graphData) {
      graphData = { nodes: [], edges: [], lastUpdated: new Date().toISOString() }
    }

    const existingEdges = new Map(graphData.edges.map((e: any) => [`${e.source}-${e.label}-${e.target}`, e]))

    // Process each changed file
    for (const file of changedFiles) {
      const filename = basename(file)

      // Handle .data files (entities)
      if (filename.endsWith('.data') && !filename.startsWith('_')) {
        const newEdges = await synthesizeDataFileEdges(file, graphData)
        totalEdges += newEdges.length

        // Merge new edges (avoiding duplicates)
        for (const edge of newEdges) {
          const key = `${edge.source}-${edge.label}-${edge.target}`
          if (!existingEdges.has(key)) {
            graphData.edges.push(edge)
            existingEdges.set(key, edge)
          }
        }
      }

      // Handle .note files
      else if (filename.endsWith('.note')) {
        const newEdges = await synthesizeNoteEdges(file, graphData)
        totalEdges += newEdges.length

        for (const edge of newEdges) {
          const key = `${edge.source}-${edge.label}-${edge.target}`
          if (!existingEdges.has(key)) {
            graphData.edges.push(edge)
            existingEdges.set(key, edge)
          }
        }
      }
    }

    // Update graph metadata
    graphData.lastUpdated = new Date().toISOString()

    // Write updated graph
    await writeFile(graphPath, JSON.stringify(graphData, null, 2))

    const duration = Date.now() - startTime
    log(`Synthesis complete: ${totalEdges} new edges in ${duration}ms`)

    return totalEdges
  } catch (err) {
    log(`Synthesis failed: ${err}`, 'error')
    throw err
  }
}

/**
 * Synthesize edges from a .data file (people, projects, tasks, etc.)
 */
async function synthesizeDataFileEdges(filePath: string, graphData: any): Promise<any[]> {
  const edges: any[] = []
  const data = await loadDataFile<{ items?: any[] }>(filePath)

  if (!data || !data.items) return edges

  const filename = basename(filePath)

  // Process based on file type
  if (filename === 'people.data') {
    // People → Organization edges
    for (const person of data.items) {
      if (person.organization) {
        edges.push({
          source: person.id,
          target: person.organization,
          label: 'works_at',
        })
      }
    }
  } else if (filename === 'projects.data') {
    for (const project of data.items) {
      // Project → Client edges
      if (project.client) {
        edges.push({
          source: project.id,
          target: project.client,
          label: 'client',
        })
      }

      // Project → Lead edges
      if (project.lead) {
        edges.push({
          source: project.id,
          target: project.lead,
          label: 'lead',
        })
      }

      // Project → Team member edges
      if (project.team) {
        for (const member of project.team) {
          edges.push({
            source: project.id,
            target: member,
            label: 'team_member',
          })
        }
      }
    }
  } else if (filename === 'tasks.data') {
    for (const task of data.items) {
      // Task → Project edges
      if (task.project) {
        edges.push({
          source: task.id,
          target: task.project,
          label: 'project',
        })
      }

      // Task → Assignee edges
      if (task.assignee) {
        edges.push({
          source: task.id,
          target: task.assignee,
          label: 'assignee',
        })
      }

      // Task → Milestone edges
      if (task.milestone) {
        edges.push({
          source: task.id,
          target: task.milestone,
          label: 'milestone',
        })
      }
    }
  }

  return edges
}

/**
 * Synthesize edges from a .note file
 */
async function synthesizeNoteEdges(filePath: string, graphData: any): Promise<any[]> {
  const edges: any[] = []
  const note = await loadDataFile<{
    '@id'?: string
    blocks?: any[]
    title?: string
  }>(filePath)

  if (!note || !note['@id']) return edges

  // Extract entity mentions from note content
  const entityIdPattern = /\b(person|org|proj|task|ms|event):[a-z0-9-]+:[0-9]+\b/g
  const fullText = JSON.stringify(note.blocks || [])

  const matches = fullText.match(entityIdPattern) || []
  const uniqueMatches = [...new Set(matches)]

  for (const entityId of uniqueMatches) {
    edges.push({
      source: note['@id'],
      target: entityId,
      label: 'mentions',
    })
  }

  return edges
}

// ═══════════════════════════════════════════════════════════════════════════
// FILE WATCHER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Process a batch of file system events
 */
async function processBatch(batch: FSEventBatch) {
  log(`Processing batch of ${batch.events.length} events`)

  // Add changed files to dirty set
  for (const event of batch.events) {
    if (event.kind === 'remove') {
      dirtyFiles.delete(event.path)
      continue
    }

    const filename = basename(event.path)

    // Only track .data and .note files, ignore internal files
    if ((filename.endsWith('.data') || filename.endsWith('.note')) && !filename.startsWith('_')) {
      dirtyFiles.add(event.path)
    }
  }

  status.pendingFiles = Array.from(dirtyFiles)
  await saveStatus()

  // If we have dirty files, schedule synthesis
  if (dirtyFiles.size > 0 && !status.isRunning) {
    await runSynthesis()
  }
}

/**
 * Run synthesis for all dirty files
 */
async function runSynthesis() {
  if (status.isRunning) {
    log('Synthesis already running, skipping')
    return
  }

  const filesToProcess = Array.from(dirtyFiles)
  if (filesToProcess.length === 0) {
    log('No files to process')
    return
  }

  status.isRunning = true
  status.errors = []
  await saveStatus()

  const startTime = Date.now()

  try {
    const edgeCount = await synthesizeIncremental(filesToProcess)

    // Clear processed files
    for (const file of filesToProcess) {
      dirtyFiles.delete(file)
    }

    const duration = Date.now() - startTime

    status.isRunning = false
    status.lastRun = new Date().toISOString()
    status.lastRunDuration = duration
    status.processedCount += filesToProcess.length
    status.edgesGenerated += edgeCount
    status.pendingFiles = Array.from(dirtyFiles)
    status.nextRun = null

    await saveStatus()
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    status.isRunning = false
    status.errors.push(errorMsg)

    log(`Synthesis error: ${errorMsg}`, 'error')
    await saveStatus()
  }
}

/**
 * Start the watcher
 */
async function startWatcher() {
  log('🔍 Starting edge synthesis watcher')
  log(`Watching: ${ENTITIES_PATH}`)
  log(`Watching: ${NOTES_PATH}`)
  log(`Status file: ${STATUS_FILE}`)

  // Initialize status
  await saveStatus()

  // Create watcher queue
  const queue = new FSWatcherQueue(DEBOUNCE_MS, processBatch)

  // Watch entities directory
  const entitiesWatcher = watch(ENTITIES_PATH, { recursive: false }, (eventType, filename) => {
    if (!filename) return

    const fullPath = join(ENTITIES_PATH, filename)
    queue.push({
      kind: eventType === 'rename' ? 'remove' : 'modify',
      path: fullPath,
      timestamp: Date.now(),
    })
  })

  // Watch notes directory
  const notesWatcher = watch(NOTES_PATH, { recursive: false }, (eventType, filename) => {
    if (!filename) return

    const fullPath = join(NOTES_PATH, filename)
    queue.push({
      kind: eventType === 'rename' ? 'remove' : 'modify',
      path: fullPath,
      timestamp: Date.now(),
    })
  })

  log('✅ Watcher started. Press Ctrl+C to stop.')

  // Keep process alive
  process.on('SIGINT', async () => {
    log('\n🛑 Stopping watcher...')
    entitiesWatcher.close()
    notesWatcher.close()
    await queue.flushNow()
    process.exit(0)
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('🔗 Edge Synthesis Watcher\n')

  if (WATCH_CONTINUOUS) {
    await startWatcher()
  } else {
    log('Running one-time synthesis...')
    // Force synthesis of all entity and note files
    const { readdir } = await import('fs/promises')

    const entityFiles = (await readdir(ENTITIES_PATH))
      .filter((f) => f.endsWith('.data') && !f.startsWith('_'))
      .map((f) => join(ENTITIES_PATH, f))

    const noteFiles = (await readdir(NOTES_PATH)).filter((f) => f.endsWith('.note')).map((f) => join(NOTES_PATH, f))

    for (const file of [...entityFiles, ...noteFiles]) {
      dirtyFiles.add(file)
    }

    await runSynthesis()
    log('✅ One-time synthesis complete')
  }
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
