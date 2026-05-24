#!/usr/bin/env npx tsx
/**
 * Test script for the Filegraph Agent with REAL vault data
 *
 * Run with: pnpm tsx scripts/test-agent-real.ts "Your question"
 *
 * Examples:
 *   pnpm tsx scripts/test-agent-real.ts "How much did I spend on food?"
 *   pnpm tsx scripts/test-agent-real.ts "What are my account balances?"
 *   pnpm tsx scripts/test-agent-real.ts "Find all transactions for checking account"
 */

import 'dotenv/config'
import * as fs from 'fs'
import * as path from 'path'

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'
const OLLAMA_API_URL = 'http://localhost:11434/api/chat'
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta'
const VAULT_PATH = process.env.HOME + '/.filegraph'

// Parse CLI args for provider selection
const args = process.argv.slice(2)
const useOllama = args.includes('--ollama') || args.includes('-o')
const useGemini = args.includes('--gemini') || args.includes('-g')
const modelArg = args.find((a) => a.startsWith('--model='))?.split('=')[1]
const queryArgs = args.filter((a) => !a.startsWith('-'))

// Default models
const DEFAULT_OLLAMA_MODEL = 'llama3-groq-tool-use' // Best for function calling
const DEFAULT_OPENAI_MODEL = 'gpt-4o'
const DEFAULT_GEMINI_MODEL = 'gemini-3-flash-preview'

// Tool definitions - now includes query_graph for TQL EAV queries
const TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'list_entities',
      description: 'List entities from a specific namespace. Available: person, org, proj, task, ms, acc, tx, bill',
      parameters: {
        type: 'object',
        properties: {
          namespace: { type: 'string', description: 'Entity namespace' },
          limit: { type: 'number', description: 'Max entities to return (default: 20)' },
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
      description: 'Search the vault for entities matching a query.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'read_note_content',
      description: `Read the full content of a note file. Notes are stored as .note files in @notes/.
Use this when the user asks about the contents or details of a specific note.
Returns the note's title, metadata, and extracted plain text content.`,
      parameters: {
        type: 'object',
        properties: {
          noteId: { type: 'string', description: 'Note ID (e.g., "note:welcome") or filename (e.g., "welcome.note")' },
        },
        required: ['noteId'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'resolve_entity',
      description: `Resolve a natural language entity name to its ID. Use this FIRST when a user mentions an entity by name.
Example: "nodebook" → "proj:nodebook:001"
This does fuzzy matching on entity names/titles across all namespaces, or a specific namespace if provided.`,
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Entity name to resolve (e.g., "nodebook", "sarah", "checking account")',
          },
          namespace: { type: 'string', description: 'Optional: limit to namespace (person, proj, acc, etc.)' },
        },
        required: ['name'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'query_graph',
      description: `Query the TQL knowledge graph using EAV primitives. Operations:
- "find_by_attribute": Find entities with a specific attribute value
- "aggregate": Compute sum/count/avg/min/max on entity attributes
Use for financial queries, filtering, and aggregations.

Special filters:
- "amount_lt": Filter where amount < value (for expenses)
- "amount_gt": Filter where amount > value (for income)
- "date_gte": Filter where date >= value (YYYY-MM-DD)
- "date_lte": Filter where date <= value (YYYY-MM-DD)

Example: Total expenses in March 2024
{ "operation": "aggregate", "attribute": "amount", "aggregation": "sum", "namespace": "tx", "filters": { "amount_lt": 0, "date_gte": "2024-03-01", "date_lte": "2024-03-31" } }`,
      parameters: {
        type: 'object',
        properties: {
          operation: {
            type: 'string',
            description: 'Operation: find_by_attribute, aggregate',
          },
          attribute: {
            type: 'string',
            description: 'Attribute to query (e.g., category, amount, account)',
          },
          value: {
            type: ['string', 'number', 'boolean'],
            description: 'Value to match for find_by_attribute',
          },
          namespace: {
            type: 'string',
            description: 'Entity namespace (e.g., tx, acc, person)',
          },
          aggregation: {
            type: 'string',
            description: 'For aggregate: sum, count, avg, min, max',
          },
          filters: {
            type: 'object',
            description:
              'Filters: {attribute: value} for exact match, or special: amount_lt, amount_gt, date_gte, date_lte',
          },
          limit: {
            type: 'number',
            description: 'Max results (default: 100)',
          },
        },
        required: ['operation', 'namespace'],
      },
    },
  },
]

// Namespace to file mapping
const NAMESPACE_FILES: Record<string, string> = {
  person: '@entities/people.data',
  org: '@entities/organizations.data',
  proj: '@entities/projects.data',
  task: '@entities/tasks.data',
  ms: '@entities/milestones.data',
  acc: '@finance/accounts.data',
  tx: '@finance/transactions.data',
  bill: '@finance/bills.data',
  note: '@notes/', // Special: directory of .note files
}

function readDataFile(relativePath: string): { items: any[] } | null {
  try {
    const fullPath = path.join(VAULT_PATH, relativePath)
    if (!fs.existsSync(fullPath)) return null
    const content = fs.readFileSync(fullPath, 'utf-8')
    return JSON.parse(content)
  } catch {
    return null
  }
}

function executeRealTool(name: string, args: Record<string, any>): any {
  console.log(`\n📞 Tool: ${name}(${JSON.stringify(args)})`)

  switch (name) {
    case 'list_entities': {
      const filePath = NAMESPACE_FILES[args.namespace]
      if (!filePath) {
        return { error: `Unknown namespace: ${args.namespace}`, available: Object.keys(NAMESPACE_FILES) }
      }
      const data = readDataFile(filePath)
      if (!data?.items) {
        return { error: `Could not read ${filePath}` }
      }
      const limit = args.limit || 20
      const items = data.items.slice(0, limit).map((item: any) => ({
        id: item.id || item['@id'],
        name: item.name || item.title,
        type: item['@type'],
      }))
      console.log(`   Found ${data.items.length} entities, returning ${items.length}`)
      return { namespace: args.namespace, count: data.items.length, items }
    }

    case 'get_vault_stats': {
      const stats: Record<string, number> = {}
      for (const [ns, filePath] of Object.entries(NAMESPACE_FILES)) {
        const data = readDataFile(filePath)
        if (data?.items) stats[ns] = data.items.length
      }
      const total = Object.values(stats).reduce((a, b) => a + b, 0)
      console.log(`   Total entities: ${total}`)
      return { entityCounts: stats, totalEntities: total, namespaces: Object.keys(NAMESPACE_FILES) }
    }

    case 'search_vault': {
      const results: any[] = []
      const query = args.query.toLowerCase()
      for (const [ns, filePath] of Object.entries(NAMESPACE_FILES)) {
        const data = readDataFile(filePath)
        if (!data?.items) continue
        for (const item of data.items) {
          const name = (item.name || item.title || '').toLowerCase()
          const id = (item.id || item['@id'] || '').toLowerCase()
          if (name.includes(query) || id.includes(query)) {
            results.push({ id: item.id || item['@id'], name: item.name || item.title, namespace: ns })
          }
        }
      }
      console.log(`   Found ${results.length} matches for "${args.query}"`)
      return { query: args.query, resultCount: results.length, results: results.slice(0, 20) }
    }

    case 'read_note_content': {
      let noteId = args.noteId as string

      // Normalize noteId to filename
      let filename = noteId
      if (noteId.startsWith('note:')) {
        // note:welcome → welcome.note
        filename = noteId.replace('note:', '') + '.note'
      } else if (!noteId.endsWith('.note')) {
        filename = noteId + '.note'
      }

      const notePath = path.join(VAULT_PATH, '@notes', filename)

      if (!fs.existsSync(notePath)) {
        console.log(`   Note not found: ${filename}`)
        return { error: `Note not found: ${filename}`, suggestion: 'Use search_vault to find notes' }
      }

      try {
        const content = fs.readFileSync(notePath, 'utf-8')
        const note = JSON.parse(content)

        // Extract plain text from blocks
        const extractText = (blocks: any[]): string => {
          if (!blocks) return ''
          return blocks
            .map((block: any) => {
              let text = ''
              if (block.content) {
                text += block.content
                  .filter((c: any) => c.type === 'text')
                  .map((c: any) => c.text)
                  .join('')
              }
              if (block.children) {
                text += '\n' + extractText(block.children)
              }
              return text
            })
            .filter(Boolean)
            .join('\n')
        }

        const plainText = extractText(note.blocks || [])
        const preview = plainText.slice(0, 2000) + (plainText.length > 2000 ? '...' : '')

        console.log(`   Read note: ${note.title} (${plainText.length} chars)`)

        return {
          noteId: note['@id'] || noteId,
          title: note.title,
          author: note.author,
          status: note.status,
          created_at: note.created_at,
          updated_at: note.updated_at,
          contentLength: plainText.length,
          content: preview,
        }
      } catch (e) {
        console.log(`   Error reading note: ${e}`)
        return { error: `Could not parse note: ${filename}` }
      }
    }

    case 'resolve_entity': {
      const rawName = args.name.toLowerCase()
      const targetNs = args.namespace?.toLowerCase()

      // Strip common noise words
      const noiseWords = [
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
      ]
      const searchTerms = rawName.split(/\s+/).filter((w: string) => !noiseWords.includes(w) && w.length > 1)
      const searchName = searchTerms.join(' ')

      type Match = { id: string; name: string; namespace: string; score: number; entity: any }
      const matches: Match[] = []

      for (const [ns, filePath] of Object.entries(NAMESPACE_FILES)) {
        if (targetNs && ns !== targetNs) continue

        // Special handling for notes - they're individual files
        if (ns === 'note') {
          const notesDir = path.join(VAULT_PATH, '@notes')
          if (!fs.existsSync(notesDir)) continue

          const noteFiles = fs.readdirSync(notesDir).filter((f: string) => f.endsWith('.note'))
          for (const noteFile of noteFiles) {
            try {
              const noteContent = fs.readFileSync(path.join(notesDir, noteFile), 'utf-8')
              const note = JSON.parse(noteContent)
              const itemName = (note.title || '').toLowerCase()
              const itemSlug = noteFile.replace('.note', '').toLowerCase()
              const itemId = (note['@id'] || '').toLowerCase()

              let score = 0
              if (searchName && itemName === searchName) score = 100
              else if (searchName && itemSlug === searchName) score = 95
              else if (searchName && itemName.startsWith(searchName)) score = 80
              else if (searchName && itemName.includes(searchName)) score = 60
              else if (searchName && itemSlug.includes(searchName)) score = 50

              if (score === 0) {
                for (const term of searchTerms) {
                  if (itemName.includes(term)) score = Math.max(score, 55)
                  else if (itemSlug.includes(term)) score = Math.max(score, 45)
                }
              }

              if (score > 0) {
                matches.push({
                  id: note['@id'] || `note:${itemSlug}`,
                  name: note.title,
                  namespace: 'note',
                  score,
                  entity: { ...note, filename: noteFile },
                })
              }
            } catch {
              /* skip unparseable */
            }
          }
          continue
        }

        const data = readDataFile(filePath)
        if (!data?.items) continue

        for (const item of data.items) {
          const itemName = (item.name || item.title || item.description || '').toLowerCase()
          const itemSlug = (item.slug || '').toLowerCase()
          const itemId = (item.id || item['@id'] || '').toLowerCase()

          let score = 0

          // Try full cleaned search term first
          if (searchName && itemName === searchName) score = 100
          else if (searchName && itemSlug === searchName) score = 95
          else if (searchName && itemName.startsWith(searchName)) score = 80
          else if (searchName && itemName.includes(searchName)) score = 60
          else if (searchName && itemSlug.includes(searchName)) score = 50
          else if (searchName && itemId.includes(searchName)) score = 40

          // Try individual terms if no full match
          if (score === 0) {
            for (const term of searchTerms) {
              if (itemName === term) score = Math.max(score, 90)
              else if (itemSlug === term) score = Math.max(score, 85)
              else if (itemName.startsWith(term)) score = Math.max(score, 70)
              else if (itemName.includes(term)) score = Math.max(score, 55)
              else if (itemSlug.includes(term)) score = Math.max(score, 45)
              else if (itemId.includes(term)) score = Math.max(score, 35)
            }
          }

          if (score > 0) {
            matches.push({
              id: item.id || item['@id'],
              name: item.name || item.title,
              namespace: ns,
              score,
              entity: item,
            })
          }
        }
      }

      // Sort by score descending
      matches.sort((a, b) => b.score - a.score)

      if (matches.length === 0) {
        console.log(`   No entities found matching "${args.name}" (cleaned: "${searchName}")`)
        return {
          resolved: false,
          searchName: args.name,
          cleanedTerms: searchTerms,
          suggestion: 'Try list_entities to see available entities',
        }
      }

      const best = matches[0]
      console.log(`   Resolved "${args.name}" → ${best.id} (score: ${best.score})`)

      return {
        resolved: true,
        entityId: best.id,
        name: best.name,
        namespace: best.namespace,
        entity: best.entity,
        alternates: matches.slice(1, 4).map((m) => ({ id: m.id, name: m.name, score: m.score })),
      }
    }

    case 'query_graph': {
      const { operation, attribute, value, namespace, aggregation, filters, limit: maxResults } = args
      const filePath = NAMESPACE_FILES[namespace]

      if (!filePath) {
        return { error: `Unknown namespace: ${namespace}`, available: Object.keys(NAMESPACE_FILES) }
      }

      const data = readDataFile(filePath)
      if (!data?.items) {
        return { error: `Could not read ${filePath}` }
      }

      let items = data.items

      // Apply attribute filter
      if (attribute && value !== null && value !== undefined) {
        items = items.filter((item: any) => item[attribute] === value)
      }

      // Apply additional filters (including special comparisons)
      if (filters) {
        for (const [attr, val] of Object.entries(filters)) {
          // Special numeric comparisons
          if (attr === 'amount_lt') {
            items = items.filter((item: any) => typeof item.amount === 'number' && item.amount < (val as number))
          } else if (attr === 'amount_gt') {
            items = items.filter((item: any) => typeof item.amount === 'number' && item.amount > (val as number))
          } else if (attr === 'amount_lte') {
            items = items.filter((item: any) => typeof item.amount === 'number' && item.amount <= (val as number))
          } else if (attr === 'amount_gte') {
            items = items.filter((item: any) => typeof item.amount === 'number' && item.amount >= (val as number))
          }
          // Date range comparisons
          else if (attr === 'date_gte') {
            items = items.filter((item: any) => item.date && item.date >= String(val))
          } else if (attr === 'date_lte') {
            items = items.filter((item: any) => item.date && item.date <= String(val))
          } else if (attr === 'date_gt') {
            items = items.filter((item: any) => item.date && item.date > String(val))
          } else if (attr === 'date_lt') {
            items = items.filter((item: any) => item.date && item.date < String(val))
          }
          // Regular exact match
          else {
            items = items.filter((item: any) => item[attr] === val)
          }
        }
      }

      if (operation === 'aggregate' && aggregation && attribute) {
        const values = items.map((item: any) => item[attribute]).filter((v: any): v is number => typeof v === 'number')

        let result: number | null = null
        switch (aggregation) {
          case 'sum':
            result = values.reduce((a: number, b: number) => a + b, 0)
            break
          case 'count':
            result = values.length
            break
          case 'avg':
            result = values.length > 0 ? values.reduce((a: number, b: number) => a + b, 0) / values.length : null
            break
          case 'min':
            result = values.length > 0 ? Math.min(...values) : null
            break
          case 'max':
            result = values.length > 0 ? Math.max(...values) : null
            break
        }

        const formatted =
          result !== null && attribute === 'amount'
            ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(result)
            : undefined

        console.log(`   Aggregate ${aggregation}(${attribute}): ${formatted || result}`)
        return {
          attribute,
          aggregation,
          namespace,
          filters,
          entityCount: items.length,
          result,
          resultFormatted: formatted,
        }
      }

      // find_by_attribute
      const resultLimit = maxResults || 100
      console.log(`   Found ${items.length} entities matching criteria`)
      return {
        attribute,
        value,
        namespace,
        filters,
        matchCount: items.length,
        entities: items.slice(0, resultLimit).map((item: any) => ({
          id: item.id,
          ...item,
        })),
      }
    }

    default:
      return { error: `Unknown tool: ${name}` }
  }
}

interface ToolCall {
  id: string
  function: { name: string; arguments: string }
}

async function testAgent(userMessage: string) {
  const openaiKey = process.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY
  const geminiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY

  if (!useOllama && !useGemini && !openaiKey) {
    console.error('❌ No API key. Set VITE_OPENAI_API_KEY in .env or use --ollama/--gemini flag')
    process.exit(1)
  }
  if (useGemini && !geminiKey) {
    console.error('❌ No Gemini API key. Set VITE_GEMINI_API_KEY in .env')
    process.exit(1)
  }

  const provider = useGemini ? 'Gemini' : useOllama ? 'Ollama' : 'OpenAI'
  const model = modelArg || (useGemini ? DEFAULT_GEMINI_MODEL : useOllama ? DEFAULT_OLLAMA_MODEL : DEFAULT_OPENAI_MODEL)

  console.log('\n' + '='.repeat(60))
  console.log(`🧑 User: ${userMessage}`)
  console.log(`📁 Vault: ${VAULT_PATH}`)
  console.log(`🤖 Provider: ${provider} (${model})`)
  console.log('='.repeat(60))

  const messages: any[] = [
    {
      role: 'system',
      content: `You are the Filegraph Agent. Help users query their personal knowledge vault.

## Query Strategy
1. **When user mentions an entity by name** (e.g., "nodebook project", "Sarah", "checking account"):
   → Use \`resolve_entity\` FIRST to get the entity ID and full details
   → The resolved entity includes all its attributes - use that to answer

2. **For note content** (user asks what a note says, summarize a note, etc.):
   → First use \`resolve_entity\` with name and namespace="note" to find the note
   → Then use \`read_note_content\` with the resolved noteId to get the full content

3. **For financial queries** (spending, income, balances):
   → Use \`query_graph\` with aggregate or find_by_attribute

## Tools
- \`resolve_entity\`: Fuzzy-match entity names → returns full entity with all attributes
- \`read_note_content\`: Read full content of a note file (use after resolve_entity finds the note)
- \`query_graph\`: Complex queries, aggregations, filters
- \`list_entities\`: Browse entities by namespace
- \`search_vault\`: Full-text search

## Special Filters (for query_graph)
- amount_lt/amount_gt: Filter by amount (<0 for expenses, >0 for income)
- date_gte/date_lte: Filter by date range (YYYY-MM-DD)

Namespaces: person, org, proj, task, acc, tx, bill
Be concise. When describing an entity, summarize its key attributes.`,
    },
    { role: 'user', content: userMessage },
  ]

  console.log(`\n📤 Sending to ${provider}...`)

  // Gemini uses a completely different API format
  if (useGemini) {
    // Convert OpenAI-style parameters to Gemini-compatible format
    const convertParams = (params: any): any => {
      if (!params || typeof params !== 'object') return params
      // Handle union types - Gemini doesn't support them, use STRING
      let type = params.type
      if (Array.isArray(type)) type = 'STRING'
      else if (type === 'string') type = 'STRING'
      else if (type === 'number' || type === 'integer') type = 'NUMBER'
      else if (type === 'boolean') type = 'BOOLEAN'
      else if (type === 'object') type = 'OBJECT'
      else if (type === 'array') type = 'ARRAY'

      const result: any = { type }
      if (params.description) result.description = params.description
      if (params.enum) result.enum = params.enum
      if (params.properties) {
        result.properties = {}
        for (const [key, val] of Object.entries(params.properties)) {
          result.properties[key] = convertParams(val)
        }
      }
      if (params.required) result.required = params.required
      if (params.items) result.items = convertParams(params.items)
      return result
    }

    const geminiTools = [
      {
        functionDeclarations: TOOLS.map((t) => ({
          name: t.function.name,
          description: t.function.description,
          parameters: convertParams(t.function.parameters),
        })),
      },
    ]

    const geminiContents = [{ role: 'user', parts: [{ text: userMessage }] }]
    const systemInstruction = { parts: [{ text: messages[0].content }] }

    const url = `${GEMINI_API_URL}/models/${model}:generateContent?key=${geminiKey}`
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: geminiContents, systemInstruction, tools: geminiTools }),
    })

    if (!response.ok) {
      console.error('❌ API Error:', await response.json().catch(() => ({})))
      process.exit(1)
    }

    const data = await response.json()
    const candidate = data.candidates?.[0]
    const parts = candidate?.content?.parts || []

    // Check for function calls
    const functionCalls = parts.filter((p: any) => p.functionCall)
    if (functionCalls.length > 0) {
      console.log(`\n🔧 ${functionCalls.length} tool call(s)`)

      const functionResponses = functionCalls.map((p: any) => {
        const fc = p.functionCall
        const result = executeRealTool(fc.name, fc.args)
        console.log(`\n📞 Tool: ${fc.name}(${JSON.stringify(fc.args)})`)
        return { functionResponse: { name: fc.name, response: result } }
      })

      // Follow-up with tool results
      console.log('\n📤 Follow-up with results...')
      const followUpContents = [
        ...geminiContents,
        { role: 'model', parts: functionCalls },
        { role: 'user', parts: functionResponses },
      ]

      const followUp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: followUpContents, systemInstruction }),
      })

      const followUpData = await followUp.json()
      const finalParts = followUpData.candidates?.[0]?.content?.parts || []
      const finalText = finalParts.map((p: any) => p.text || '').join('')

      console.log('\n' + '='.repeat(60))
      console.log(`🤖 Agent:\n${finalText}`)
      console.log('='.repeat(60))
    } else {
      const textContent = parts.map((p: any) => p.text || '').join('')
      console.log('\n' + '='.repeat(60))
      console.log(`🤖 Agent:\n${textContent}`)
      console.log('='.repeat(60))
    }
    return
  }

  // OpenAI / Ollama path
  const apiUrl = useOllama ? OLLAMA_API_URL : OPENAI_API_URL
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (!useOllama) headers['Authorization'] = `Bearer ${openaiKey}`

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({ model, messages, tools: TOOLS, stream: false }),
  })

  if (!response.ok) {
    console.error('❌ API Error:', await response.json().catch(() => ({})))
    process.exit(1)
  }

  const data = await response.json()

  // Ollama returns { message: {...} }, OpenAI returns { choices: [{ message: {...} }] }
  const msg = useOllama ? data.message : data.choices[0].message

  if (msg.tool_calls?.length) {
    console.log(`\n🔧 ${msg.tool_calls.length} tool call(s)`)

    const toolResults = msg.tool_calls.map((tc: ToolCall) => {
      // Ollama may return arguments as object, OpenAI as string
      const args = typeof tc.function.arguments === 'string' ? JSON.parse(tc.function.arguments) : tc.function.arguments
      const result = executeRealTool(tc.function.name, args)
      return {
        role: 'tool',
        tool_call_id: tc.id || `tool-${Math.random().toString(36).slice(2)}`,
        content: JSON.stringify(result),
      }
    })

    console.log('\n📤 Follow-up with results...')
    const followUp = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ model, messages: [...messages, msg, ...toolResults], stream: false }),
    })

    const followUpData = await followUp.json()
    const finalMsg = useOllama ? followUpData.message.content : followUpData.choices[0].message.content

    console.log('\n' + '='.repeat(60))
    console.log(`🤖 Agent:\n${finalMsg}`)
    console.log('='.repeat(60))
  } else {
    console.log('\n' + '='.repeat(60))
    console.log(`🤖 Agent:\n${msg.content}`)
    console.log('='.repeat(60))
  }
}

const query = queryArgs[0] || 'What entities are in my vault?'

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Usage: pnpm tsx scripts/test-agent-real.ts [options] "query"

Options:
  --ollama, -o       Use Ollama (local) instead of OpenAI
  --gemini, -g       Use Google Gemini
  --model=<name>     Specify model (default: ${DEFAULT_OLLAMA_MODEL} for Ollama, ${DEFAULT_OPENAI_MODEL} for OpenAI, ${DEFAULT_GEMINI_MODEL} for Gemini)
  --help, -h         Show this help

Examples:
  pnpm tsx scripts/test-agent-real.ts "What's in my vault?"
  pnpm tsx scripts/test-agent-real.ts --ollama "summarize the market dynamics note"
  pnpm tsx scripts/test-agent-real.ts --gemini "list my projects"
  pnpm tsx scripts/test-agent-real.ts --gemini --model=gemini-1.5-pro "list my projects"
`)
  process.exit(0)
}

testAgent(query).catch(console.error)
