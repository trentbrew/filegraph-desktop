#!/usr/bin/env tsx
/**
 * TQL Complex Queries v2
 *
 * Enhanced queries that properly parse the .data file schema (items[], not @graph)
 */

import { EAVStore, type Fact, type Link } from '../src/lib/tql/eav-store'
import { EntityIdManager } from '../src/lib/tql/entity-ids'
import {
  createFileFacts,
  createContainsLink,
  normalizePath,
  isHidden,
  getExtension,
  getParentPath,
} from '../src/lib/tql/facts'
import { homedir } from 'os'
import { join } from 'path'
import { readdir, stat, mkdir, writeFile, readFile } from 'fs/promises'

const VAULT_PATH = join(homedir(), '.filegraph')
const LOGS_DIR = join(VAULT_PATH, '.filegraph', 'logs')
const LOG_FILE = join(LOGS_DIR, `tql-v2-${new Date().toISOString().replace(/[:.]/g, '-')}.log`)

interface QueryLog {
  timestamp: string
  query: string
  plainEnglish: string
  description: string
  duration_ms: number
  result_count: number
  raw_output: any
}

const logs: QueryLog[] = []

function log(query: string, plainEnglish: string, description: string, duration: number, resultCount: number, rawOutput: any) {
  const entry: QueryLog = {
    timestamp: new Date().toISOString(),
    query,
    plainEnglish,
    description,
    duration_ms: duration,
    result_count: resultCount,
    raw_output: rawOutput,
  }
  logs.push(entry)

  console.log(`\n${'═'.repeat(80)}`)
  console.log(`📝 ${description}`)
  console.log(`${'─'.repeat(80)}`)
  console.log(`💬 ${plainEnglish}`)
  console.log(`${'─'.repeat(80)}`)
  console.log(`QUERY:\n${query}`)
  console.log(`${'─'.repeat(80)}`)
  console.log(`Results: ${resultCount} | Duration: ${duration.toFixed(2)}ms`)
  console.log(`${'─'.repeat(80)}`)
  console.log(JSON.stringify(rawOutput, null, 2).slice(0, 2000))
  if (JSON.stringify(rawOutput).length > 2000) console.log('... (truncated)')
}

async function readDataFile(filePath: string): Promise<any> {
  try {
    const content = await readFile(filePath, 'utf-8')
    return JSON.parse(content)
  } catch {
    return null
  }
}

async function getAllDataFiles(): Promise<Array<{ path: string; data: any }>> {
  const results: Array<{ path: string; data: any }> = []

  async function scanDir(dir: string) {
    try {
      const entries = await readdir(dir, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = join(dir, entry.name)
        if (entry.name.startsWith('.')) continue

        if (entry.isDirectory()) {
          await scanDir(fullPath)
        } else if (entry.name.endsWith('.data')) {
          const data = await readDataFile(fullPath)
          if (data) {
            results.push({ path: fullPath.replace(VAULT_PATH, '~'), data })
          }
        }
      }
    } catch {}
  }

  await scanDir(VAULT_PATH)
  return results
}

// ═══════════════════════════════════════════════════════════════════════════
// ENTITY QUERIES - Parse actual data content
// ═══════════════════════════════════════════════════════════════════════════

async function query1_AllPeopleWithSkills() {
  const start = performance.now()

  const query = `
SELECT ?id ?name ?role ?skills ?organization
FROM <@entities/people.data>
WHERE {
  ?person IN items[] .
  ?person.id AS ?id .
  ?person.name AS ?name .
  ?person.role AS ?role .
  ?person.skills AS ?skills .
  ?person.organization AS ?organization .
}`

  const data = await readDataFile(join(VAULT_PATH, '@entities', 'people.data'))
  const results = (data?.items || []).map((p: any) => ({
    id: p.id,
    name: p.name,
    role: p.role,
    skills: p.skills,
    organization: p.organization,
    rate: p.rate,
    capacity: p.capacity,
  }))

  const duration = performance.now() - start
  log(
    query.trim(),
    'Show me all the people in the vault, including their name, role, skills, and which organization they belong to.',
    'All people with skills and organization',
    duration,
    results.length,
    results
  )
  return results
}

async function query2_PeopleByOrganization() {
  const start = performance.now()

  const query = `
SELECT ?org_id ?org_name ?members
FROM <@entities/people.data>, <@entities/organizations.data>
WHERE {
  ?person IN people.items[] .
  ?org IN orgs.items[] .
  ?person.organization = ?org.id .
}
GROUP BY ?org_id`

  const people = await readDataFile(join(VAULT_PATH, '@entities', 'people.data'))
  const orgs = await readDataFile(join(VAULT_PATH, '@entities', 'organizations.data'))

  const orgMap: Record<string, { org_id: string; org_name: string; members: any[] }> = {}

  for (const person of people?.items || []) {
    const orgId = person.organization
    if (!orgMap[orgId]) {
      const org = (orgs?.items || []).find((o: any) => o.id === orgId)
      orgMap[orgId] = {
        org_id: orgId,
        org_name: org?.name || 'Unknown',
        members: [],
      }
    }
    orgMap[orgId].members.push({ id: person.id, name: person.name, role: person.role })
  }

  const results = Object.values(orgMap)
  const duration = performance.now() - start
  log(
    query.trim(),
    'Group all people by their organization, so I can see which team members belong to each company.',
    'People grouped by organization (JOIN)',
    duration,
    results.length,
    results
  )
  return results
}

async function query3_TasksByProject() {
  const start = performance.now()

  const query = `
SELECT ?project ?status ?task_count ?tasks
FROM <@entities/tasks.data>, <@entities/projects.data>
WHERE {
  ?task IN tasks.items[] .
  ?task.project = ?project .
}
GROUP BY ?project, ?status`

  const tasks = await readDataFile(join(VAULT_PATH, '@entities', 'tasks.data'))
  const projects = await readDataFile(join(VAULT_PATH, '@entities', 'projects.data'))

  const byProject: Record<string, { project: string; project_name: string; by_status: Record<string, any[]> }> = {}

  for (const task of tasks?.items || []) {
    const projId = task.project || 'unassigned'
    if (!byProject[projId]) {
      const proj = (projects?.items || []).find((p: any) => p.id === projId)
      byProject[projId] = {
        project: projId,
        project_name: proj?.name || projId,
        by_status: {},
      }
    }
    const status = task.status || 'unknown'
    if (!byProject[projId].by_status[status]) {
      byProject[projId].by_status[status] = []
    }
    byProject[projId].by_status[status].push({
      id: task.id,
      title: task.title || task.name,
      priority: task.priority,
      assignee: task.assignee,
    })
  }

  const results = Object.values(byProject).map((p) => ({
    ...p,
    total_tasks: Object.values(p.by_status).flat().length,
    status_counts: Object.fromEntries(Object.entries(p.by_status).map(([k, v]) => [k, v.length])),
  }))

  const duration = performance.now() - start
  log(
    query.trim(),
    'Show me all tasks organized by project, then broken down by status (done, in-progress, todo). Include a count of tasks in each status.',
    'Tasks grouped by project and status',
    duration,
    results.length,
    results
  )
  return results
}

async function query4_FinancialSummary() {
  const start = performance.now()

  const query = `
SELECT ?account_type ?total_balance ?account_count
FROM <@finance/accounts.data>
WHERE {
  ?account IN items[] .
  ?account.type AS ?account_type .
  ?account.balance AS ?balance .
}
GROUP BY ?account_type
AGGREGATE SUM(?balance) AS ?total_balance`

  const accounts = await readDataFile(join(VAULT_PATH, '@finance', 'accounts.data'))

  const byType: Record<string, { type: string; accounts: any[]; total: number }> = {}

  for (const acc of accounts?.items || []) {
    const type = acc.type || acc['@type'] || 'unknown'
    if (!byType[type]) {
      byType[type] = { type, accounts: [], total: 0 }
    }
    byType[type].accounts.push({ id: acc.id, name: acc.name, balance: acc.balance })
    byType[type].total += acc.balance || 0
  }

  const results = Object.values(byType).map((t) => ({
    account_type: t.type,
    account_count: t.accounts.length,
    total_balance: t.total,
    accounts: t.accounts,
  }))

  const duration = performance.now() - start
  log(
    query.trim(),
    'Summarize my financial accounts by type (checking, savings, credit, etc.) and show the total balance for each category.',
    'Financial accounts by type with totals',
    duration,
    results.length,
    results
  )
  return results
}

async function query5_BillsDueThisMonth() {
  const start = performance.now()

  const query = `
SELECT ?id ?name ?amount ?due_date ?status
FROM <@finance/bills.data>
WHERE {
  ?bill IN items[] .
  ?bill.dueDate >= NOW().startOfMonth() .
  ?bill.dueDate <= NOW().endOfMonth() .
}
ORDER BY ?due_date`

  const bills = await readDataFile(join(VAULT_PATH, '@finance', 'bills.data'))
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

  const results = (bills?.items || [])
    .filter((bill: any) => {
      if (!bill.dueDate) return false
      const due = new Date(bill.dueDate)
      return due >= startOfMonth && due <= endOfMonth
    })
    .map((bill: any) => ({
      id: bill.id,
      name: bill.name || bill.title,
      amount: bill.amount,
      due_date: bill.dueDate,
      status: bill.status,
      category: bill.category,
    }))
    .sort((a: any, b: any) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())

  const duration = performance.now() - start
  log(
    query.trim(),
    'What bills are due this month? List them in order by due date, with amounts and status.',
    'Bills due this month',
    duration,
    results.length,
    results
  )
  return results
}

async function query6_CalendarEventsWithParticipants() {
  const start = performance.now()

  const query = `
SELECT ?event ?participants ?participant_names
FROM <@calendar/events.data>, <@entities/people.data>
WHERE {
  ?event IN events.items[] .
  ?event.participants AS ?participant_ids .
  ?person IN people.items[] .
  ?person.id IN ?participant_ids .
}
RESOLVE ?participant_ids -> ?participant_names`

  const events = await readDataFile(join(VAULT_PATH, '@calendar', 'events.data'))
  const people = await readDataFile(join(VAULT_PATH, '@entities', 'people.data'))

  const peopleMap: Record<string, string> = {}
  for (const p of people?.items || []) {
    peopleMap[p.id] = p.name
  }

  const results = (events?.items || [])
    .filter((e: any) => e.participants?.length > 0)
    .slice(0, 10)
    .map((event: any) => ({
      id: event.id,
      name: event.name || event.title,
      startDate: event.startDate,
      label: event.label,
      participants: event.participants,
      participant_names: (event.participants || []).map((pid: string) => peopleMap[pid] || pid),
    }))

  const duration = performance.now() - start
  log(
    query.trim(),
    'Show me calendar events and resolve the participant IDs to their actual names by joining with the people data.',
    'Calendar events with resolved participant names',
    duration,
    results.length,
    results
  )
  return results
}

async function query7_CrossNamespaceEntityReferences() {
  const start = performance.now()

  const query = `
SELECT ?source_file ?source_entity ?target_entity ?reference_type
FROM <**/*.data>
WHERE {
  ?entity IN items[] .
  ?entity.* MATCHES /^(person|org|proj|task|acc|bill):.*/ AS ?ref .
}
EXTRACT references`

  const dataFiles = await getAllDataFiles()
  const references: Array<{
    source_file: string
    source_entity: string
    target_entity: string
    field: string
  }> = []

  const entityIdPattern = /^(person|org|proj|task|acc|bill|ms|event|goal|sub):[a-z0-9-]+:[0-9]+$/

  function extractRefs(obj: any, sourceFile: string, sourceEntity: string, path: string = '') {
    if (!obj || typeof obj !== 'object') return

    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key

      if (typeof value === 'string' && entityIdPattern.test(value) && key !== 'id' && key !== '@id') {
        references.push({
          source_file: sourceFile,
          source_entity: sourceEntity,
          target_entity: value,
          field: currentPath,
        })
      } else if (Array.isArray(value)) {
        for (const item of value) {
          if (typeof item === 'string' && entityIdPattern.test(item)) {
            references.push({
              source_file: sourceFile,
              source_entity: sourceEntity,
              target_entity: item,
              field: currentPath,
            })
          } else if (typeof item === 'object') {
            extractRefs(item, sourceFile, sourceEntity, currentPath)
          }
        }
      } else if (typeof value === 'object') {
        extractRefs(value, sourceFile, sourceEntity, currentPath)
      }
    }
  }

  for (const { path, data } of dataFiles) {
    const items = data.items || data['@graph'] || []
    for (const item of items) {
      const entityId = item.id || item['@id'] || 'unknown'
      extractRefs(item, path, entityId)
    }
  }

  // Group by target
  const byTarget: Record<string, typeof references> = {}
  for (const ref of references) {
    if (!byTarget[ref.target_entity]) byTarget[ref.target_entity] = []
    byTarget[ref.target_entity].push(ref)
  }

  const summary = {
    total_references: references.length,
    unique_targets: Object.keys(byTarget).length,
    by_target_namespace: {} as Record<string, number>,
    sample_references: references.slice(0, 20),
    most_referenced: Object.entries(byTarget)
      .sort(([, a], [, b]) => b.length - a.length)
      .slice(0, 5)
      .map(([target, refs]) => ({ target, reference_count: refs.length })),
  }

  for (const ref of references) {
    const ns = ref.target_entity.split(':')[0]
    summary.by_target_namespace[ns] = (summary.by_target_namespace[ns] || 0) + 1
  }

  const duration = performance.now() - start
  log(
    query.trim(),
    'Find all cross-references between entities in different namespaces. These are the "backlinks" - where one entity refers to another.',
    'Cross-namespace entity references (backlink candidates)',
    duration,
    references.length,
    summary
  )
  return summary
}

async function query8_SkillsInventory() {
  const start = performance.now()

  const query = `
SELECT ?skill (COUNT(?person) AS ?people_count) ?people
FROM <@entities/people.data>
WHERE {
  ?person IN items[] .
  ?skill IN ?person.skills[] .
}
GROUP BY ?skill
ORDER BY DESC(?people_count)`

  const people = await readDataFile(join(VAULT_PATH, '@entities', 'people.data'))

  const skillMap: Record<string, { skill: string; people: Array<{ id: string; name: string }> }> = {}

  for (const person of people?.items || []) {
    for (const skill of person.skills || []) {
      if (!skillMap[skill]) {
        skillMap[skill] = { skill, people: [] }
      }
      skillMap[skill].people.push({ id: person.id, name: person.name })
    }
  }

  const results = Object.values(skillMap)
    .map((s) => ({ ...s, people_count: s.people.length }))
    .sort((a, b) => b.people_count - a.people_count)

  const duration = performance.now() - start
  log(
    query.trim(),
    'List all unique skills across all people, and show which people have each skill.',
    'Skills inventory with people count',
    duration,
    results.length,
    results
  )
  return results
}

async function query9_EntityGraph() {
  const start = performance.now()

  const query = `
CONSTRUCT {
  ?source --[:references]--> ?target
}
FROM <**/*.data>
WHERE {
  ?source.* REFERENCES ?target .
}
AS GRAPH`

  const dataFiles = await getAllDataFiles()
  const nodes: Set<string> = new Set()
  const edges: Array<{ from: string; to: string; type: string; via: string }> = []

  const entityIdPattern = /^(person|org|proj|task|acc|bill|ms|event):[a-z0-9-]+:[0-9]+$/

  function findRefs(obj: any, sourceId: string, sourceFile: string) {
    if (!obj || typeof obj !== 'object') return

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string' && entityIdPattern.test(value) && !['id', '@id'].includes(key)) {
        nodes.add(sourceId)
        nodes.add(value)
        edges.push({ from: sourceId, to: value, type: key, via: sourceFile })
      } else if (Array.isArray(value)) {
        for (const item of value) {
          if (typeof item === 'string' && entityIdPattern.test(item)) {
            nodes.add(sourceId)
            nodes.add(item)
            edges.push({ from: sourceId, to: item, type: key, via: sourceFile })
          }
        }
      } else if (typeof value === 'object') {
        findRefs(value, sourceId, sourceFile)
      }
    }
  }

  for (const { path, data } of dataFiles) {
    for (const item of data.items || []) {
      const id = item.id || item['@id']
      if (id) {
        nodes.add(id)
        findRefs(item, id, path)
      }
    }
  }

  const graph = {
    node_count: nodes.size,
    edge_count: edges.length,
    nodes: [...nodes].slice(0, 30),
    edges: edges.slice(0, 30),
    by_edge_type: {} as Record<string, number>,
  }

  for (const edge of edges) {
    graph.by_edge_type[edge.type] = (graph.by_edge_type[edge.type] || 0) + 1
  }

  const duration = performance.now() - start
  log(
    query.trim(),
    'Build a graph of all entities and their relationships. Show nodes (entities) and edges (references between them).',
    'Entity reference graph (nodes and edges)',
    duration,
    nodes.size,
    graph
  )
  return graph
}

async function query10_VaultMetrics() {
  const start = performance.now()

  const query = `
SELECT
  COUNT(DISTINCT ?namespace) AS ?namespace_count,
  COUNT(?data_file) AS ?data_file_count,
  COUNT(?entity) AS ?total_entities,
  SUM(?file_size) AS ?total_data_size
FROM <**/*.data>
AGGREGATE`

  const dataFiles = await getAllDataFiles()

  const metrics = {
    namespace_count: 0,
    data_file_count: dataFiles.length,
    total_entities: 0,
    files_by_namespace: {} as Record<string, number>,
    entities_by_namespace: {} as Record<string, number>,
    entities_by_type: {} as Record<string, number>,
  }

  const namespaces = new Set<string>()

  for (const { path, data } of dataFiles) {
    const nsMatch = path.match(/@([^/]+)\//)
    const ns = nsMatch ? nsMatch[1] : 'root'
    namespaces.add(ns)

    metrics.files_by_namespace[ns] = (metrics.files_by_namespace[ns] || 0) + 1

    const items = data.items || data['@graph'] || []
    metrics.total_entities += items.length
    metrics.entities_by_namespace[ns] = (metrics.entities_by_namespace[ns] || 0) + items.length

    const type = data['@type'] || 'unknown'
    metrics.entities_by_type[type] = (metrics.entities_by_type[type] || 0) + items.length
  }

  metrics.namespace_count = namespaces.size

  const duration = performance.now() - start
  log(
    query.trim(),
    'Give me overall vault statistics: how many namespaces, data files, and entities exist? Break down by namespace and type.',
    'Vault-wide metrics and statistics',
    duration,
    1,
    metrics
  )
  return metrics
}

// ═══════════════════════════════════════════════════════════════════════════
// NOTE QUERIES
// ═══════════════════════════════════════════════════════════════════════════

async function getAllNoteFiles(): Promise<Array<{ path: string; data: any }>> {
  const results: Array<{ path: string; data: any }> = []

  async function scanDir(dir: string) {
    try {
      const entries = await readdir(dir, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = join(dir, entry.name)
        if (entry.name.startsWith('.')) continue

        if (entry.isDirectory()) {
          await scanDir(fullPath)
        } else if (entry.name.endsWith('.note')) {
          const data = await readDataFile(fullPath)
          if (data) {
            results.push({ path: fullPath.replace(VAULT_PATH, '~'), data })
          }
        }
      }
    } catch {}
  }

  await scanDir(VAULT_PATH)
  return results
}

async function query11_AllNotes() {
  const start = performance.now()

  const query = `
SELECT ?id ?title ?status ?block_count
FROM <@notes/*.note>
WHERE {
  ?note a Note .
  ?note.title AS ?title .
  ?note.status AS ?status .
  COUNT(?note.blocks[]) AS ?block_count .
}
ORDER BY ?title`

  const notes = await getAllNoteFiles()
  const results = notes.map(({ path, data }) => ({
    path,
    id: data['@id'] || data.id,
    title: data.title,
    status: data.status || 'unknown',
    block_count: (data.blocks || []).length,
    type: data['@type'],
  })).sort((a, b) => (a.title || '').localeCompare(b.title || ''))

  const duration = performance.now() - start
  log(
    query.trim(),
    'List all notes in the vault with their title, status, and how many content blocks each contains.',
    'All notes with block counts',
    duration,
    results.length,
    results.slice(0, 20)
  )
  return results
}

async function query12_NotesByStatus() {
  const start = performance.now()

  const query = `
SELECT ?status (COUNT(?note) AS ?count) ?notes
FROM <@notes/*.note>
WHERE {
  ?note a Note .
  ?note.status AS ?status .
}
GROUP BY ?status`

  const notes = await getAllNoteFiles()
  const byStatus: Record<string, { status: string; notes: Array<{ title: string; path: string }> }> = {}

  for (const { path, data } of notes) {
    const status = data.status || 'unknown'
    if (!byStatus[status]) {
      byStatus[status] = { status, notes: [] }
    }
    byStatus[status].notes.push({ title: data.title, path })
  }

  const results = Object.values(byStatus).map((s) => ({
    status: s.status,
    count: s.notes.length,
    sample_notes: s.notes.slice(0, 5),
  }))

  const duration = performance.now() - start
  log(
    query.trim(),
    'Group all notes by their status (draft, published, archived, etc.) and count how many are in each state.',
    'Notes grouped by status',
    duration,
    results.length,
    results
  )
  return results
}

async function query13_NotesWithHeadings() {
  const start = performance.now()

  const query = `
SELECT ?note ?title ?headings
FROM <@notes/*.note>
WHERE {
  ?note a Note .
  ?block IN ?note.blocks[] .
  ?block.type = "heading" .
}
EXTRACT headings`

  const notes = await getAllNoteFiles()
  const results: Array<{ title: string; path: string; headings: string[] }> = []

  for (const { path, data } of notes) {
    const headings: string[] = []
    for (const block of data.blocks || []) {
      if (block.type === 'heading') {
        const text = (block.content || [])
          .map((c: any) => c.text || '')
          .join('')
        if (text) headings.push(`H${block.level || 1}: ${text}`)
      }
    }
    if (headings.length > 0) {
      results.push({ title: data.title, path, headings })
    }
  }

  const duration = performance.now() - start
  log(
    query.trim(),
    'Extract all headings from notes to see the outline/structure of each document.',
    'Notes with their heading structure',
    duration,
    results.length,
    results.slice(0, 10)
  )
  return results
}

async function query14_SearchNoteContent() {
  const start = performance.now()
  const searchTerm = 'demo'

  const query = `
SELECT ?note ?title ?matching_blocks
FROM <@notes/*.note>
WHERE {
  ?note a Note .
  ?block IN ?note.blocks[] .
  ?block.content CONTAINS "${searchTerm}" .
}`

  const notes = await getAllNoteFiles()
  const results: Array<{ title: string; path: string; matches: string[] }> = []

  for (const { path, data } of notes) {
    const matches: string[] = []
    for (const block of data.blocks || []) {
      const text = (block.content || [])
        .map((c: any) => c.text || '')
        .join('')
      if (text.toLowerCase().includes(searchTerm.toLowerCase())) {
        matches.push(text.slice(0, 200))
      }
    }
    if (matches.length > 0) {
      results.push({ title: data.title, path, matches: matches.slice(0, 3) })
    }
  }

  const duration = performance.now() - start
  log(
    query.trim(),
    `Search all notes for content containing "${searchTerm}" and show matching excerpts.`,
    `Full-text search in notes for "${searchTerm}"`,
    duration,
    results.length,
    results.slice(0, 10)
  )
  return results
}

async function query15_LargestNotes() {
  const start = performance.now()

  const query = `
SELECT ?note ?title ?block_count ?word_count
FROM <@notes/*.note>
WHERE {
  ?note a Note .
}
ORDER BY DESC(?block_count)
LIMIT 10`

  const notes = await getAllNoteFiles()
  const results = notes.map(({ path, data }) => {
    let wordCount = 0
    for (const block of data.blocks || []) {
      const text = (block.content || [])
        .map((c: any) => c.text || '')
        .join(' ')
      wordCount += text.split(/\s+/).filter(Boolean).length
    }
    return {
      title: data.title,
      path,
      block_count: (data.blocks || []).length,
      word_count: wordCount,
      status: data.status,
    }
  })
    .sort((a, b) => b.block_count - a.block_count)
    .slice(0, 10)

  const duration = performance.now() - start
  log(
    query.trim(),
    'Find the 10 largest notes by block count, including word count estimates.',
    'Largest notes by content size',
    duration,
    results.length,
    results
  )
  return results
}

async function query16_NotesWithLinks() {
  const start = performance.now()

  const query = `
SELECT ?note ?title ?links ?link_targets
FROM <@notes/*.note>
WHERE {
  ?note a Note .
  ?block IN ?note.blocks[] .
  ?content IN ?block.content[] .
  ?content.type = "link" OR ?content.href EXISTS .
}
EXTRACT links`

  const notes = await getAllNoteFiles()
  const results: Array<{ title: string; path: string; links: Array<{ text: string; href?: string }> }> = []

  for (const { path, data } of notes) {
    const links: Array<{ text: string; href?: string }> = []

    function extractLinks(blocks: any[]) {
      for (const block of blocks || []) {
        for (const content of block.content || []) {
          if (content.type === 'link' || content.href) {
            links.push({ text: content.text || '', href: content.href })
          }
        }
        if (block.children) {
          extractLinks(block.children)
        }
      }
    }

    extractLinks(data.blocks)
    if (links.length > 0) {
      results.push({ title: data.title, path, links })
    }
  }

  const duration = performance.now() - start
  log(
    query.trim(),
    'Find all notes that contain links (internal or external) and extract the link targets.',
    'Notes containing links',
    duration,
    results.length,
    results.slice(0, 10)
  )
  return results
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('🔍 TQL Complex Queries v2 - Entity-Aware\n')
  console.log(`Vault: ${VAULT_PATH}`)
  console.log(`Log file: ${LOG_FILE}\n`)

  await mkdir(LOGS_DIR, { recursive: true })

  // Entity queries
  console.log('\n📊 ENTITY QUERIES\n')
  await query1_AllPeopleWithSkills()
  await query2_PeopleByOrganization()
  await query3_TasksByProject()
  await query4_FinancialSummary()
  await query5_BillsDueThisMonth()
  await query6_CalendarEventsWithParticipants()
  await query7_CrossNamespaceEntityReferences()
  await query8_SkillsInventory()
  await query9_EntityGraph()
  await query10_VaultMetrics()

  // Note queries
  console.log('\n📝 NOTE QUERIES\n')
  await query11_AllNotes()
  await query12_NotesByStatus()
  await query13_NotesWithHeadings()
  await query14_SearchNoteContent()
  await query15_LargestNotes()
  await query16_NotesWithLinks()

  // Write log file
  await writeFile(LOG_FILE, JSON.stringify(logs, null, 2))

  console.log(`\n${'═'.repeat(80)}`)
  console.log(`✅ Completed ${logs.length} queries`)
  console.log(`📄 Full logs: ${LOG_FILE}`)
  console.log(`${'═'.repeat(80)}\n`)
}

main().catch(console.error)
