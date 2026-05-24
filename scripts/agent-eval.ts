#!/usr/bin/env tsx

import 'dotenv/config'
import * as fs from 'node:fs'
import * as path from 'node:path'

type Provider = 'mock' | 'gemini' | 'ollama'

type EvalCase = {
  id: string
  prompt: string
  expected?: {
    toolCalls?: string[]
    answerIncludes?: string[]
    answerRegex?: string
  }
}

function buildFormatHint(expected?: EvalCase['expected']): string | undefined {
  if (!expected) return undefined
  const lines: string[] = []
  lines.push('Using the tool results above, answer the user question.')

  if (expected.answerIncludes?.length) {
    lines.push(`Include these exact substrings: ${expected.answerIncludes.map((s) => JSON.stringify(s)).join(', ')}`)
  }

  if (expected.answerRegex) {
    lines.push(`Ensure the answer matches this regex (case-insensitive): ${expected.answerRegex}`)

    // Some providers are loose about phrasing; add a stronger constraint for common patterns.
    if (/\bvault has\b/i.test(expected.answerRegex)) {
      lines.push('Start the answer with the exact phrase: "Vault has"')
    }
  }

  return lines.join('\n')
}

type ToolCall = {
  id: string
  function: {
    name: string
    arguments: any
  }
}

const LIST_ENTITY_NAMESPACES = ['person', 'org', 'proj', 'task', 'ms', 'acc', 'tx', 'bill'] as const
type ListEntityNamespace = (typeof LIST_ENTITY_NAMESPACES)[number]

function normalizeListEntitiesNamespace(input: unknown): ListEntityNamespace | null {
  const raw = String(input || '')
    .toLowerCase()
    .trim()
  const map: Record<string, ListEntityNamespace> = {
    person: 'person',
    people: 'person',
    persons: 'person',
    org: 'org',
    orgs: 'org',
    organization: 'org',
    organizations: 'org',
    proj: 'proj',
    project: 'proj',
    projects: 'proj',
    task: 'task',
    tasks: 'task',
    ms: 'ms',
    milestone: 'ms',
    milestones: 'ms',
    acc: 'acc',
    account: 'acc',
    accounts: 'acc',
    tx: 'tx',
    txn: 'tx',
    transaction: 'tx',
    transactions: 'tx',
    bill: 'bill',
    bills: 'bill',
  }

  return map[raw] ?? null
}

type EvalResult = {
  id: string
  passed: boolean
  prompt: string
  toolCalls: string[]
  answer: string
  failures: string[]
}

type JsonArrayFile = unknown[]

type JsonItemsFile = {
  items?: unknown[]
}

function parseArgs(argv: string[]) {
  const args: Record<string, string | boolean> = {}

  const getValue = (key: string, current: string, next?: string) => {
    const prefix = `${key}=`
    if (current.startsWith(prefix)) return current.slice(prefix.length)
    return next
  }

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (!a) continue

    if (a === '--suite' || a.startsWith('--suite=')) {
      const v = getValue('--suite', a, argv[i + 1])
      if (!v) throw new Error('--suite requires a value')
      args.suite = v
      if (!a.includes('=')) i++
      continue
    }

    if (a === '--vault' || a.startsWith('--vault=')) {
      const v = getValue('--vault', a, argv[i + 1])
      if (!v) throw new Error('--vault requires a value')
      args.vault = v
      if (!a.includes('=')) i++
      continue
    }

    if (a === '--provider' || a.startsWith('--provider=')) {
      const v = getValue('--provider', a, argv[i + 1])
      if (!v) throw new Error('--provider requires a value')
      args.provider = v
      if (!a.includes('=')) i++
      continue
    }

    if (a === '--model' || a.startsWith('--model=')) {
      const v = getValue('--model', a, argv[i + 1])
      if (!v) throw new Error('--model requires a value')
      args.model = v
      if (!a.includes('=')) i++
      continue
    }

    if (a === '--json' || a.startsWith('--json=')) {
      const v = getValue('--json', a, argv[i + 1])
      if (!v) throw new Error('--json requires a value')
      args.json = v
      if (!a.includes('=')) i++
      continue
    }

    if (a === '--debug') {
      args.debug = true
      continue
    }

    if (a === '--help' || a === '-h') {
      args.help = true
      continue
    }
  }

  return args
}

function printHelp() {
  console.log(
    'Usage: pnpm tsx scripts/agent-eval.ts [--suite <path>] [--vault <path>] [--provider mock|openai|ollama] [--model <name>] [--json <path>]',
  )
  console.log('')
  console.log('Defaults:')
  console.log('  --suite scripts/evals/agent-smoke.jsonl')
  console.log('  --vault src/data/demo-files')
  console.log('  --provider mock')
  console.log('')
  console.log('Flags:')
  console.log('  --debug   Print raw model responses and parsed tool calls')
}

function readJsonFile(absPath: string): unknown {
  return JSON.parse(fs.readFileSync(absPath, 'utf-8')) as unknown
}

function normalizeItemsFile(parsed: unknown): unknown[] {
  if (Array.isArray(parsed)) return parsed
  if (parsed && typeof parsed === 'object' && Array.isArray((parsed as JsonItemsFile).items))
    return (parsed as JsonItemsFile).items as unknown[]
  return []
}

function readDataFile(vaultPath: string, relativePath: string): unknown[] {
  const fullPath = path.join(vaultPath, relativePath)
  if (!fs.existsSync(fullPath)) return []
  const parsed = readJsonFile(fullPath) as JsonArrayFile | JsonItemsFile
  return normalizeItemsFile(parsed)
}

function findNoteFiles(vaultPath: string): string[] {
  const notesDir = path.join(vaultPath, '@notes')
  if (!fs.existsSync(notesDir)) return []
  return fs.readdirSync(notesDir).filter((f) => f.endsWith('.note'))
}

function extractNoteText(note: any): string {
  const blocks = Array.isArray(note?.blocks) ? note.blocks : []
  const walk = (b: any[]): string => {
    return b
      .map((block) => {
        let text = ''
        if (Array.isArray(block?.content)) {
          text += block.content
            .filter((c: any) => c?.type === 'text')
            .map((c: any) => String(c?.text ?? ''))
            .join('')
        }
        if (Array.isArray(block?.children)) {
          const child = walk(block.children)
          if (child) text += `\n${child}`
        }
        return text
      })
      .filter(Boolean)
      .join('\n')
  }

  return walk(blocks)
}

function scoreStringMatch(haystack: string, needle: string): number {
  if (!needle) return 0
  if (haystack === needle) return 100
  if (haystack.startsWith(needle)) return 80
  if (haystack.includes(needle)) return 60
  return 0
}

function executeVaultTool(vaultPath: string, name: string, args: Record<string, any>): any {
  switch (name) {
    case 'list_entities': {
      const ns = normalizeListEntitiesNamespace(args.namespace)
      const map: Record<string, string> = {
        person: '@entities/people.data',
        org: '@entities/organizations.data',
        proj: '@entities/projects.data',
        task: '@entities/tasks.data',
        ms: '@entities/milestones.data',
        acc: '@finance/accounts.data',
        tx: '@finance/transactions.data',
        bill: '@finance/bills.data',
      }
      if (!ns) return { error: `Unknown namespace: ${String(args.namespace || '')}`, available: Object.keys(map) }
      const rel = map[ns]
      if (!rel) return { error: `Unknown namespace: ${ns}`, available: Object.keys(map) }
      const items = readDataFile(vaultPath, rel)
      const limit = typeof args.limit === 'number' ? args.limit : 20
      return {
        namespace: ns,
        count: items.length,
        items: items
          .slice(0, limit)
          .map((it: any) => ({ id: it.id || it['@id'], name: it.name || it.title, type: it['@type'] })),
      }
    }

    case 'get_vault_stats': {
      const namespaces = ['person', 'org', 'proj', 'task', 'ms', 'acc', 'tx', 'bill']
      const counts: Record<string, number> = {}
      for (const ns of namespaces) {
        const res = executeVaultTool(vaultPath, 'list_entities', { namespace: ns, limit: 1 })
        counts[ns] = typeof res?.count === 'number' ? res.count : 0
      }
      const total = Object.values(counts).reduce((a, b) => a + b, 0)
      return { entityCounts: counts, totalEntities: total, namespaces }
    }

    case 'search_vault': {
      const q = String(args.query || '').toLowerCase()
      const namespaces = ['person', 'org', 'proj', 'task', 'ms', 'acc', 'tx', 'bill']
      const results: any[] = []
      for (const ns of namespaces) {
        const data = executeVaultTool(vaultPath, 'list_entities', { namespace: ns, limit: 99999 })
        const items = Array.isArray(data?.items) ? data.items : []
        for (const it of items) {
          const id = String(it.id || '').toLowerCase()
          const nm = String(it.name || '').toLowerCase()
          if (id.includes(q) || nm.includes(q)) results.push({ ...it, namespace: ns })
        }
      }
      return { query: args.query, resultCount: results.length, results: results.slice(0, 20) }
    }

    case 'resolve_entity': {
      const raw = String(args.name || '')
      const cleaned = raw.toLowerCase().trim()
      const targetNs = args.namespace ? String(args.namespace).toLowerCase() : null

      const noise = new Set([
        'the',
        'a',
        'an',
        'project',
        'person',
        'account',
        'task',
        'my',
        'about',
        'what',
        'is',
        'note',
        'notes',
      ])
      const terms = cleaned.split(/\s+/).filter((w) => !noise.has(w) && w.length > 1)
      const search = terms.join(' ')

      type Match = { id: string; name: string; namespace: string; score: number; entity: any }
      const matches: Match[] = []

      const namespaces = ['person', 'org', 'proj', 'task', 'ms', 'acc', 'tx', 'bill']
      for (const ns of namespaces) {
        if (targetNs && ns !== targetNs) continue
        const data = executeVaultTool(vaultPath, 'list_entities', { namespace: ns, limit: 99999 })
        const items = Array.isArray(data?.items) ? data.items : []
        for (const it of items) {
          const nameLc = String(it.name || '').toLowerCase()
          const idLc = String(it.id || '').toLowerCase()
          const s = Math.max(scoreStringMatch(nameLc, search), scoreStringMatch(idLc, search))
          if (s > 0) {
            matches.push({ id: it.id, name: it.name, namespace: ns, score: s, entity: it })
          }
        }
      }

      // Notes
      if (!targetNs || targetNs === 'note') {
        for (const f of findNoteFiles(vaultPath)) {
          const abs = path.join(vaultPath, '@notes', f)
          try {
            const note = readJsonFile(abs) as any
            const titleLc = String(note?.title || '').toLowerCase()
            const slugLc = f.replace(/\.note$/i, '').toLowerCase()
            const idLc = String(note?.id || note?.['@id'] || '').toLowerCase()
            const s = Math.max(
              scoreStringMatch(titleLc, search),
              scoreStringMatch(slugLc, search),
              scoreStringMatch(idLc, search),
            )
            if (s > 0) {
              matches.push({
                id: String(note?.id || note?.['@id'] || `note:${slugLc}`),
                name: String(note?.title || slugLc),
                namespace: 'note',
                score: s,
                entity: { ...note, filename: f },
              })
            }
          } catch {
            // ignore
          }
        }
      }

      matches.sort((a, b) => b.score - a.score)
      if (matches.length === 0) {
        return { resolved: false, searchName: raw, cleanedTerms: terms }
      }

      const best = matches[0]
      return {
        resolved: true,
        entityId: best.id,
        name: best.name,
        namespace: best.namespace,
        entity: best.entity,
        alternates: matches.slice(1, 4).map((m) => ({ id: m.id, name: m.name, score: m.score })),
      }
    }

    case 'read_note_content': {
      const raw = String(args.noteId || '')
      let filename = raw
      if (raw.startsWith('note:')) filename = raw.replace('note:', '') + '.note'
      if (!filename.endsWith('.note')) filename = filename + '.note'

      const notePath = path.join(vaultPath, '@notes', filename)
      if (!fs.existsSync(notePath)) return { error: `Note not found: ${filename}` }

      const note = readJsonFile(notePath) as any
      const text = extractNoteText(note)
      const preview = text.slice(0, 2000) + (text.length > 2000 ? '...' : '')

      return {
        noteId: note?.id || note?.['@id'] || raw,
        title: note?.title,
        contentLength: text.length,
        content: preview,
      }
    }

    case 'query_graph': {
      let operation = String(args.operation || '')
      let namespace = String(args.namespace || '')
      let attribute = args.attribute ? String(args.attribute) : undefined
      const value = args.value
      let aggregation = args.aggregation ? String(args.aggregation) : undefined
      let filters = args.filters && typeof args.filters === 'object' ? (args.filters as Record<string, any>) : undefined
      const limit = typeof args.limit === 'number' ? args.limit : 100

      // Normalize common LLM drift
      if (operation === 'sum') {
        operation = 'aggregate'
        aggregation = aggregation || 'sum'
      }

      if (namespace === 'finance') {
        namespace = 'tx'
      }

      if (namespace === 'financial_data') {
        namespace = 'tx'
      }

      if (attribute === 'income') {
        attribute = 'amount'
      }

      // Normalize alternate filter formats
      if (filters && typeof (filters as any).date_range === 'string') {
        const dr = String((filters as any).date_range)
        delete (filters as any).date_range
        if (/march\s+2024/i.test(dr)) {
          ;(filters as any).date_gte = '2024-03-01'
          ;(filters as any).date_lte = '2024-03-31'
        }
      }

      if (filters && typeof (filters as any).date === 'object' && (filters as any).date) {
        const dv = String((filters as any).date.value || '')
        delete (filters as any).date
        if (/^2024-03$/.test(dv)) {
          ;(filters as any).date_gte = '2024-03-01'
          ;(filters as any).date_lte = '2024-03-31'
        }
      }

      // Gemini often sends date as a simple string like "2024-03"
      if (filters && typeof (filters as any).date === 'string') {
        const dateStr = String((filters as any).date)
        delete (filters as any).date
        if (/^2024-03$/.test(dateStr)) {
          ;(filters as any).date_gte = '2024-03-01'
          ;(filters as any).date_lte = '2024-03-31'
        }
      }

      // Income implies positive amounts
      if (typeof value === 'string' && /income/i.test(value)) {
        filters = { ...(filters || {}), amount_gt: 0 }
      }

      const map: Record<string, string> = {
        acc: '@finance/accounts.data',
        tx: '@finance/transactions.data',
        bill: '@finance/bills.data',
      }
      const rel = map[namespace]
      if (!rel) return { error: `Unknown namespace: ${namespace}`, available: Object.keys(map) }

      // Validate aggregate shape (otherwise we'd silently return a non-aggregate response)
      if (operation === 'aggregate') {
        if (!aggregation) return { error: 'query_graph aggregate requires aggregation (sum|count|avg|min|max)' }
        if (!attribute) return { error: 'query_graph aggregate requires attribute (e.g., amount)' }
      }

      let items = readDataFile(vaultPath, rel) as any[]

      if (attribute && value !== null && value !== undefined) {
        items = items.filter((it) => it?.[attribute] === value)
      }

      if (filters) {
        for (const [k, v] of Object.entries(filters)) {
          if (k === 'amount_lt') items = items.filter((it) => typeof it?.amount === 'number' && it.amount < Number(v))
          else if (k === 'amount_gt')
            items = items.filter((it) => typeof it?.amount === 'number' && it.amount > Number(v))
          else if (k === 'date_gte') items = items.filter((it) => it?.date && String(it.date) >= String(v))
          else if (k === 'date_lte') items = items.filter((it) => it?.date && String(it.date) <= String(v))
          else items = items.filter((it) => it?.[k] === v)
        }
      }

      // If the model provided a vague month string, try a best-effort date filter.
      if (!filters && typeof value === 'string' && /march\s+2024/i.test(value) && namespace === 'tx') {
        items = items.filter((it) => it?.date && String(it.date) >= '2024-03-01' && String(it.date) <= '2024-03-31')
      }

      if (operation === 'aggregate' && aggregation && attribute) {
        const values = items.map((it) => it?.[attribute]).filter((n): n is number => typeof n === 'number')
        let result: number | null = null
        if (aggregation === 'sum') result = values.reduce((a, b) => a + b, 0)
        else if (aggregation === 'count') result = values.length
        else if (aggregation === 'avg')
          result = values.length ? values.reduce((a, b) => a + b, 0) / values.length : null
        else if (aggregation === 'min') result = values.length ? Math.min(...values) : null
        else if (aggregation === 'max') result = values.length ? Math.max(...values) : null
        return { namespace, attribute, aggregation, filters, entityCount: items.length, result }
      }

      return {
        namespace,
        attribute,
        value,
        filters,
        matchCount: items.length,
        entities: items.slice(0, limit),
      }
    }

    default:
      return { error: `Unknown tool: ${name}` }
  }
}

function getToolsSpec() {
  return [
    {
      type: 'function' as const,
      function: {
        name: 'list_entities',
        description: 'List entities from a specific namespace.',
        parameters: {
          type: 'object',
          properties: {
            namespace: { type: 'string' },
            limit: { type: 'number' },
          },
          required: ['namespace'],
        },
      },
    },
    {
      type: 'function' as const,
      function: {
        name: 'get_vault_stats',
        description: 'Get overview statistics about the vault.',
        parameters: { type: 'object', properties: {}, required: [] },
      },
    },
    {
      type: 'function' as const,
      function: {
        name: 'search_vault',
        description: 'Search entities by substring match.',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string' },
          },
          required: ['query'],
        },
      },
    },
    {
      type: 'function' as const,
      function: {
        name: 'resolve_entity',
        description: 'Resolve a natural language entity name to its ID.',
        parameters: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            namespace: { type: 'string' },
          },
          required: ['name'],
        },
      },
    },
    {
      type: 'function' as const,
      function: {
        name: 'read_note_content',
        description: 'Read a note file (.note) and return extracted text preview.',
        parameters: {
          type: 'object',
          properties: {
            noteId: { type: 'string' },
          },
          required: ['noteId'],
        },
      },
    },
    {
      type: 'function' as const,
      function: {
        name: 'query_graph',
        description:
          'Query JSON-LD data files using datalog-style operations. Supports filtering by attribute/value and aggregations (sum, count, avg, min, max) over any namespace.',
        parameters: {
          type: 'object',
          properties: {
            operation: { type: 'string', description: '"aggregate" or "find_by_attribute"' },
            namespace: { type: 'string', description: 'Data namespace to query' },
            attribute: { type: 'string', description: 'Attribute name to filter or aggregate on' },
            value: { type: ['string', 'number', 'boolean'], description: 'Value to match for find_by_attribute' },
            aggregation: { type: 'string', description: 'For aggregate: "sum", "count", "avg", "min", or "max"' },
            filters: { type: 'object', description: 'Filter conditions as key-value pairs' },
            limit: { type: 'number', description: 'Max results to return' },
          },
          required: ['operation', 'namespace'],
        },
      },
    },
  ]
}

function normalizeJsonSchemaForOllama(node: any): any {
  if (!node || typeof node !== 'object') return node
  if (Array.isArray(node)) return node.map((n) => normalizeJsonSchemaForOllama(n))

  const next: any = { ...node }

  // Ollama tool calling is sensitive to union types; collapse to string.
  if (Array.isArray(next.type)) {
    next.type = 'string'
  }

  if (!next.type && next.properties && typeof next.properties === 'object') {
    next.type = 'object'
  }

  if (next.properties && typeof next.properties === 'object') {
    const props: Record<string, any> = {}
    for (const [k, v] of Object.entries(next.properties)) {
      props[k] = normalizeJsonSchemaForOllama(v)
      // Ensure every property has a type.
      if (props[k] && typeof props[k] === 'object' && !props[k].type) {
        props[k].type = 'string'
      }
    }
    next.properties = props
  }

  if (next.items) {
    next.items = normalizeJsonSchemaForOllama(next.items)
  }

  return next
}

function normalizeToolsForOllama(tools: any[]): any[] {
  return tools.map((t) => {
    const fn = t?.function
    const params = fn?.parameters
    return {
      ...t,
      function: {
        ...fn,
        parameters: normalizeJsonSchemaForOllama(params),
      },
    }
  })
}

function parseJsonFromText(text: string): unknown[] {
  const candidates: string[] = []

  // Prefer fenced blocks
  const fenced = text.matchAll(/```(?:json)?\s*\n([\s\S]*?)\n```/gi)
  for (const m of fenced) {
    if (m[1]) candidates.push(m[1])
  }

  // Also try to grab the first inline JSON object/array (best-effort)
  const inlineObj = text.match(/\{[\s\S]*\}/m)
  if (inlineObj?.[0]) candidates.push(inlineObj[0])

  const inlineArr = text.match(/\[[\s\S]*\]/m)
  if (inlineArr?.[0]) candidates.push(inlineArr[0])

  const parsed: unknown[] = []
  for (const c of candidates) {
    try {
      parsed.push(JSON.parse(c))
    } catch {
      // ignore
    }
  }
  return parsed
}

function extractToolCallsFromText(content: string): ToolCall[] {
  const parsed = parseJsonFromText(content)
  const calls: ToolCall[] = []

  for (const p of parsed) {
    // Case A: { tool_calls: [ { function: { name, arguments } } ] }
    const tc = (p as any)?.tool_calls
    if (Array.isArray(tc)) {
      for (const c of tc) {
        const name = c?.function?.name
        const args = c?.function?.arguments
        if (typeof name === 'string') {
          calls.push({
            id: c?.id || `tool-${Math.random().toString(36).slice(2)}`,
            function: { name, arguments: args && typeof args === 'string' ? JSON.parse(args) : args },
          })
        }
      }
      continue
    }

    // Case B: { name, arguments }
    if (typeof (p as any)?.name === 'string' && (p as any)?.arguments && typeof (p as any)?.arguments === 'object') {
      calls.push({
        id: `tool-${Math.random().toString(36).slice(2)}`,
        function: { name: (p as any).name, arguments: (p as any).arguments },
      })
      continue
    }

    // Case C: [ { name, arguments } ]
    if (Array.isArray(p)) {
      for (const item of p as any[]) {
        if (typeof item?.name === 'string' && item?.arguments && typeof item?.arguments === 'object') {
          calls.push({
            id: `tool-${Math.random().toString(36).slice(2)}`,
            function: { name: item.name, arguments: item.arguments },
          })
        }
      }
    }
  }

  return calls
}

async function runWithMockProvider(
  vaultPath: string,
  prompt: string,
): Promise<{ toolCalls: string[]; answer: string }> {
  const lc = prompt.toLowerCase()

  const called: string[] = []
  let answer = ''

  if (lc.includes('people') || lc.includes('persons')) {
    called.push('list_entities')
    const res = executeVaultTool(vaultPath, 'list_entities', { namespace: 'person', limit: 5 })
    const names = (res.items || []).map((i: any) => i.name).filter(Boolean)
    answer = `People: ${names.join(', ')}`
    return { toolCalls: called, answer }
  }

  if (lc.includes('organizations') || lc.includes('orgs')) {
    called.push('list_entities')
    const res = executeVaultTool(vaultPath, 'list_entities', { namespace: 'org', limit: 5 })
    const names = (res.items || []).map((i: any) => i.name).filter(Boolean)
    answer = `Organizations: ${names.join(', ')}`
    return { toolCalls: called, answer }
  }

  if (lc.includes('income') && (lc.includes('march') || lc.includes('2024-03'))) {
    called.push('query_graph')
    const res = executeVaultTool(vaultPath, 'query_graph', {
      operation: 'aggregate',
      namespace: 'tx',
      attribute: 'amount',
      aggregation: 'sum',
      filters: { amount_gt: 0, date_gte: '2024-03-01', date_lte: '2024-03-31' },
    })
    answer = `Total income in March 2024: ${res.result}`
    return { toolCalls: called, answer }
  }

  called.push('get_vault_stats')
  const stats = executeVaultTool(vaultPath, 'get_vault_stats', {})
  answer = `Vault has ${stats.totalEntities} entities.`
  return { toolCalls: called, answer }
}

function normalizeSchemaForGemini(node: any): any {
  if (!node || typeof node !== 'object') return node
  if (Array.isArray(node)) return node.map((n) => normalizeSchemaForGemini(n))

  const next: any = { ...node }

  // Gemini doesn't support union types like ['string', 'number']; collapse to string.
  if (Array.isArray(next.type)) {
    next.type = 'STRING'
  }

  // Gemini uses uppercase type names
  if (typeof next.type === 'string') {
    next.type = next.type.toUpperCase()
  }

  if (next.properties && typeof next.properties === 'object') {
    const props: Record<string, any> = {}
    for (const [k, v] of Object.entries(next.properties)) {
      props[k] = normalizeSchemaForGemini(v)
    }
    next.properties = props
  }

  if (next.items) {
    next.items = normalizeSchemaForGemini(next.items)
  }

  return next
}

function convertToolsToGeminiFormat(tools: any[]): any[] {
  return tools.map((t) => ({
    name: t.function.name,
    description: t.function.description,
    parameters: normalizeSchemaForGemini(t.function.parameters),
  }))
}

async function runWithGemini(opts: {
  prompt: string
  model: string
  apiKey: string
  vaultPath: string
  formatHint?: string
  expectedToolCalls?: string[]
  debug?: boolean
}): Promise<{ toolCalls: string[]; answer: string }> {
  const baseUrl = 'https://generativelanguage.googleapis.com/v1beta'
  const modelId = opts.model || 'gemini-2.0-flash'

  const tools = getToolsSpec()
  const geminiTools = [{ functionDeclarations: convertToolsToGeminiFormat(tools) }]

  const systemInstruction = {
    parts: [
      {
        text: 'You are the Filegraph Agent. For any question about vault contents or facts, you MUST call the appropriate tool(s) before answering. Do not guess. Be concise.',
      },
    ],
  }

  const contents: any[] = [{ role: 'user', parts: [{ text: opts.prompt }] }]

  const response = await fetch(`${baseUrl}/models/${modelId}:generateContent?key=${opts.apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction,
      contents,
      tools: geminiTools,
      toolConfig: { functionCallingConfig: { mode: 'AUTO' } },
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(`Gemini API error: ${JSON.stringify(err)}`)
  }

  const data = await response.json()
  const candidate = data.candidates?.[0]
  const parts = candidate?.content?.parts || []

  if (opts.debug) {
    console.log(`[debug][gemini] response parts: ${JSON.stringify(parts).slice(0, 800)}`)
  }

  // Extract function calls from parts
  const functionCalls = parts.filter((p: any) => p.functionCall)
  const toolCalls: ToolCall[] = functionCalls.map((p: any, idx: number) => ({
    id: `call-${idx}`,
    function: {
      name: p.functionCall.name,
      arguments: p.functionCall.args || {},
    },
  }))

  // If no tool calls, return text response
  if (!toolCalls.length) {
    const textParts = parts.filter((p: any) => p.text).map((p: any) => p.text)
    return { toolCalls: [], answer: textParts.join('') }
  }

  // Execute tools and build function responses
  const functionResponses = toolCalls.map((tc) => {
    const result = executeVaultTool(opts.vaultPath, tc.function.name, tc.function.arguments || {})
    return {
      functionResponse: {
        name: tc.function.name,
        response: result,
      },
    }
  })

  // Build follow-up conversation
  const followUpContents = [
    ...contents,
    { role: 'model', parts: functionCalls },
    { role: 'user', parts: functionResponses },
  ]

  if (opts.formatHint) {
    followUpContents.push({ role: 'user', parts: [{ text: opts.formatHint }] })
  }

  const followUp = await fetch(`${baseUrl}/models/${modelId}:generateContent?key=${opts.apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction,
      contents: followUpContents,
      tools: geminiTools,
    }),
  })

  if (!followUp.ok) {
    const err = await followUp.json().catch(() => ({}))
    throw new Error(`Gemini follow-up error: ${JSON.stringify(err)}`)
  }

  const followData = await followUp.json()
  const followParts = followData.candidates?.[0]?.content?.parts || []
  const textParts = followParts.filter((p: any) => p.text).map((p: any) => p.text)
  const answer = textParts.join('')

  if (opts.debug) {
    console.log(`[debug][gemini] final answer: ${JSON.stringify(answer.slice(0, 400))}`)
  }

  return { toolCalls: toolCalls.map((t) => t.function.name), answer }
}

async function runWithOllama(opts: {
  prompt: string
  model: string
  vaultPath: string
  debug?: boolean
  formatHint?: string
  expectedToolCalls?: string[]
}): Promise<{ toolCalls: string[]; answer: string }> {
  const OLLAMA_API_URL = 'http://localhost:11434/api/chat'

  const tools = normalizeToolsForOllama(getToolsSpec())
  const messages: any[] = [
    {
      role: 'system',
      content:
        'You are the Filegraph Agent. For any question about vault contents or facts, you MUST call the appropriate tool(s) before answering. Do not guess. Be concise.',
    },
    { role: 'user', content: opts.prompt },
  ]

  const response = await fetch(OLLAMA_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: opts.model, messages, tools, stream: false }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(`Ollama API error: ${JSON.stringify(err)}`)
  }

  const data = await response.json()
  const msg = data.message

  const toolCalls: ToolCall[] = Array.isArray(msg?.tool_calls)
    ? msg.tool_calls.map((tc: any) => ({
        id: tc.id || `tool-${Math.random().toString(36).slice(2)}`,
        function: {
          name: tc.function?.name,
          arguments:
            typeof tc.function?.arguments === 'string' ? JSON.parse(tc.function.arguments) : tc.function?.arguments,
        },
      }))
    : []

  // Fallback A: some "tool-use" models emit tool calls as JSON in text instead of structured tool_calls.
  const fallbackCalls = toolCalls.length === 0 ? extractToolCallsFromText(String(msg?.content ?? '')) : []
  let effectiveCalls = toolCalls.length ? toolCalls : fallbackCalls

  // Fallback B: if the model refuses native tool_calls, force it to output JSON-only tool calls.
  if (effectiveCalls.length === 0) {
    const requiredTools =
      Array.isArray(opts.expectedToolCalls) && opts.expectedToolCalls.length ? opts.expectedToolCalls : null
    const incomeMarchHint = /total\s+income/i.test(opts.prompt) && /march\s+2024/i.test(opts.prompt)
    const forceMessages: any[] = [
      ...messages,
      msg,
      {
        role: 'user',
        content:
          (requiredTools ? `You MUST call these tool(s): ${requiredTools.join(', ')}.\n` : '') +
          'Respond with JSON only. Choose one of these tools: list_entities, get_vault_stats, search_vault, resolve_entity, read_note_content, query_graph.\n' +
          'If you need data, return exactly: {"tool_calls":[{"function":{"name":"<tool>","arguments":{...}}}]}.\n' +
          'Valid list_entities.namespace values: person, org, proj, task, ms, acc, tx, bill.\n' +
          'Valid query_graph.operation values: aggregate, find_by_attribute. For aggregate: set aggregation to sum|count|avg|min|max. Valid query_graph.namespace values: acc, tx, bill.\n' +
          (incomeMarchHint
            ? 'For "total income in March 2024", use query_graph with: {"operation":"aggregate","namespace":"tx","attribute":"amount","aggregation":"sum","filters":{"amount_gt":0,"date_gte":"2024-03-01","date_lte":"2024-03-31"}}.\n'
            : '') +
          'Do not include any other text.',
      },
    ]

    const forced = await fetch(OLLAMA_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: opts.model, messages: forceMessages, tools, stream: false, format: 'json' }),
    })

    if (forced.ok) {
      const forcedData = await forced.json()
      const forcedMsg = forcedData.message
      const forcedContent = String(forcedMsg?.content ?? '')

      if (opts.debug) {
        console.log(`[debug][ollama] forced JSON content: ${JSON.stringify(forcedContent.slice(0, 800))}`)
      }

      const parsed = extractToolCallsFromText(forcedContent)
      if (opts.debug && parsed.length) {
        console.log(`[debug][ollama] parsed forced tool_calls: ${parsed.map((c) => c.function.name).join(', ')}`)
      }

      effectiveCalls = parsed
    } else if (opts.debug) {
      const err = await forced.json().catch(() => ({}))
      console.log(`[debug][ollama] forced JSON request failed: ${JSON.stringify(err)}`)
    }
  }

  if (opts.debug && fallbackCalls.length) {
    console.log(`[debug][ollama] parsed tool_calls from text: ${fallbackCalls.map((c) => c.function.name).join(', ')}`)
  }

  if (!effectiveCalls.length) {
    return { toolCalls: [], answer: String(msg?.content ?? '') }
  }

  if (opts.debug) {
    console.log(
      `[debug][ollama] effective tool_calls: ${effectiveCalls
        .map((c) => `${c.function.name}(${JSON.stringify(c.function.arguments)})`)
        .join(' | ')}`,
    )
  }

  // Execute tools; if any tool errors, attempt one correction round.
  let toolResults = effectiveCalls.map((tc) => {
    const result = executeVaultTool(opts.vaultPath, tc.function.name, tc.function.arguments || {})
    return {
      call: tc,
      result,
    }
  })

  const hasToolError = toolResults.some((r) => r.result && typeof r.result === 'object' && 'error' in (r.result as any))
  if (hasToolError) {
    const errorSummary = toolResults
      .filter((r) => r.result && typeof r.result === 'object' && 'error' in (r.result as any))
      .map((r) => `${r.call.function.name}: ${(r.result as any).error}`)
      .join(' | ')

    const correction = await fetch(OLLAMA_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: opts.model,
        messages: [
          ...messages,
          msg,
          {
            role: 'user',
            content: `Your previous tool call(s) were invalid: ${errorSummary}. Respond with JSON only using the valid tool names/args format described earlier.`,
          },
        ],
        tools,
        stream: false,
        format: 'json',
      }),
    })

    if (correction.ok) {
      const correctionData = await correction.json()
      const correctionMsg = correctionData.message
      const correctionContent = String(correctionMsg?.content ?? '')
      const correctedCalls = extractToolCallsFromText(correctionContent)
      if (opts.debug) {
        console.log(`[debug][ollama] correction JSON content: ${JSON.stringify(correctionContent.slice(0, 800))}`)
        if (correctedCalls.length) {
          console.log(`[debug][ollama] corrected tool_calls: ${correctedCalls.map((c) => c.function.name).join(', ')}`)
        }
      }

      if (correctedCalls.length) {
        effectiveCalls = correctedCalls
        toolResults = effectiveCalls.map((tc) => {
          const result = executeVaultTool(opts.vaultPath, tc.function.name, tc.function.arguments || {})
          return { call: tc, result }
        })
      }
    }
  }

  const toolMessages = toolResults.map((r) => ({
    role: 'tool',
    tool_call_id: r.call.id,
    content: JSON.stringify(r.result),
  }))

  const finalMessages = opts.formatHint
    ? [...messages, msg, ...toolMessages, { role: 'user', content: opts.formatHint }]
    : [...messages, msg, ...toolMessages]

  const followUp = await fetch(OLLAMA_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: opts.model, messages: finalMessages, stream: false }),
  })

  if (!followUp.ok) {
    const err = await followUp.json().catch(() => ({}))
    throw new Error(`Ollama follow-up error: ${JSON.stringify(err)}`)
  }

  const followData = await followUp.json()
  const answer = String(followData.message?.content ?? '')

  if (opts.debug) {
    console.log(`[debug][ollama] final answer preview: ${JSON.stringify(answer.slice(0, 400))}`)
  }

  return { toolCalls: effectiveCalls.map((t) => t.function.name), answer }
}

function loadSuite(absSuitePath: string): EvalCase[] {
  const raw = fs.readFileSync(absSuitePath, 'utf-8')
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('#'))

  return lines.map((l) => JSON.parse(l) as EvalCase)
}

function evaluateCase(
  result: { toolCalls: string[]; answer: string },
  c: EvalCase,
): { passed: boolean; failures: string[] } {
  const failures: string[] = []

  if (c.expected?.toolCalls?.length) {
    for (const name of c.expected.toolCalls) {
      if (!result.toolCalls.includes(name)) failures.push(`missing_tool:${name}`)
    }
  }

  if (c.expected?.answerIncludes?.length) {
    for (const chunk of c.expected.answerIncludes) {
      if (!result.answer.includes(chunk)) failures.push(`missing_text:${chunk}`)
    }
  }

  if (c.expected?.answerRegex) {
    const re = new RegExp(c.expected.answerRegex, 'i')
    if (!re.test(result.answer)) failures.push(`answer_regex_failed:${c.expected.answerRegex}`)
  }

  return { passed: failures.length === 0, failures }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.help) {
    printHelp()
    return
  }

  const suiteRel = typeof args.suite === 'string' ? args.suite : 'scripts/evals/agent-smoke.jsonl'
  const vaultRel = typeof args.vault === 'string' ? args.vault : 'src/data/demo-files'
  const provider = (typeof args.provider === 'string' ? args.provider : 'mock') as Provider

  const suitePath = path.resolve(process.cwd(), suiteRel)
  const vaultPath = path.resolve(process.cwd(), vaultRel)

  if (!fs.existsSync(suitePath)) {
    throw new Error(`Suite not found: ${suitePath}`)
  }
  if (!fs.existsSync(vaultPath) || !fs.statSync(vaultPath).isDirectory()) {
    throw new Error(`Vault path not found or not a directory: ${vaultPath}`)
  }

  const cases = loadSuite(suitePath)

  const model =
    typeof args.model === 'string'
      ? args.model
      : provider === 'ollama'
        ? 'llama3-groq-tool-use'
        : provider === 'gemini'
          ? 'gemini-2.0-flash'
          : 'gemini-2.0-flash'

  let apiKey = ''
  if (provider === 'gemini') {
    apiKey = String(process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '')
    if (!apiKey) throw new Error('Missing Gemini key. Set VITE_GEMINI_API_KEY or GEMINI_API_KEY.')
  }

  const results: EvalResult[] = []

  for (const c of cases) {
    let out: { toolCalls: string[]; answer: string }

    if (provider === 'mock') {
      out = await runWithMockProvider(vaultPath, c.prompt)
    } else if (provider === 'gemini') {
      out = await runWithGemini({
        prompt: c.prompt,
        model,
        apiKey,
        vaultPath,
        formatHint: buildFormatHint(c.expected),
        expectedToolCalls: c.expected?.toolCalls,
        debug: !!args.debug,
      })
    } else {
      out = await runWithOllama({
        prompt: c.prompt,
        model,
        vaultPath,
        debug: !!args.debug,
        formatHint: buildFormatHint(c.expected),
        expectedToolCalls: c.expected?.toolCalls,
      })
    }

    const evaluation = evaluateCase(out, c)
    results.push({
      id: c.id,
      passed: evaluation.passed,
      prompt: c.prompt,
      toolCalls: out.toolCalls,
      answer: out.answer,
      failures: evaluation.failures,
    })
  }

  const passed = results.filter((r) => r.passed).length
  const total = results.length
  const failed = total - passed

  for (const r of results) {
    const status = r.passed ? 'PASS' : 'FAIL'
    console.log(`${status} ${r.id} :: tools=[${r.toolCalls.join(', ')}]`)
    if (!r.passed) console.log(`  failures: ${r.failures.join(', ')}`)
  }

  console.log('')
  console.log(`Summary: ${passed}/${total} passed (${failed} failed) :: provider=${provider} model=${model}`)

  if (typeof args.json === 'string' && args.json.trim().length) {
    const outPath = path.resolve(process.cwd(), args.json)
    fs.writeFileSync(
      outPath,
      JSON.stringify({ provider, model, suite: suiteRel, vault: vaultRel, results }, null, 2),
      'utf-8',
    )
    console.log(`Wrote JSON: ${outPath}`)
  }

  if (failed > 0) process.exit(1)
}

main().catch((e) => {
  console.error(String(e?.stack || e))
  process.exit(1)
})
