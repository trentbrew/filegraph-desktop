#!/usr/bin/env npx tsx
/**
 * Test script for the Filegraph Agent OpenAI integration
 *
 * Run with: pnpm tsx scripts/test-agent.ts
 */

import 'dotenv/config'

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'

// Simplified tool definitions for testing
const TEST_TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'list_entities',
      description: 'List entities from a specific namespace.',
      parameters: {
        type: 'object',
        properties: {
          namespace: {
            type: 'string',
            description: 'Entity namespace (person, org, proj, task)',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of entities to return',
          },
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
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
]

// Mock tool execution for testing
function executeTestTool(name: string, args: Record<string, any>): any {
  console.log(`\n📞 Tool called: ${name}`)
  console.log(`   Arguments: ${JSON.stringify(args)}`)

  switch (name) {
    case 'list_entities':
      return {
        namespace: args.namespace,
        count: 3,
        items: [
          { id: `${args.namespace}:alice:001`, name: 'Alice Smith', type: 'Person' },
          { id: `${args.namespace}:bob:002`, name: 'Bob Jones', type: 'Person' },
          { id: `${args.namespace}:charlie:003`, name: 'Charlie Brown', type: 'Person' },
        ],
      }

    case 'get_vault_stats':
      return {
        entityCounts: { person: 5, org: 2, proj: 3, task: 10 },
        totalEntities: 20,
        namespaces: ['person', 'org', 'proj', 'task'],
      }

    default:
      return { error: `Unknown tool: ${name}` }
  }
}

interface ToolCall {
  id: string
  function: {
    name: string
    arguments: string
  }
}

async function testAgentChat(userMessage: string) {
  const apiKey = process.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY

  if (!apiKey) {
    console.error('❌ No API key found. Set VITE_OPENAI_API_KEY or OPENAI_API_KEY in .env')
    process.exit(1)
  }

  console.log('\n' + '='.repeat(60))
  console.log(`🧑 User: ${userMessage}`)
  console.log('='.repeat(60))

  const messages: any[] = [
    {
      role: 'system',
      content: `You are the Filegraph Agent. You help users query their vault.
Use the available tools to find information. Be concise.`,
    },
    { role: 'user', content: userMessage },
  ]

  // First request
  console.log('\n📤 Sending request to OpenAI...')

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages,
      tools: TEST_TOOLS,
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    console.error('❌ API Error:', error)
    process.exit(1)
  }

  const data = await response.json()
  const assistantMessage = data.choices[0].message

  console.log('\n📥 Response received')
  console.log(`   Finish reason: ${data.choices[0].finish_reason}`)

  // Check if model wants to call tools
  if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
    console.log(`\n🔧 Model requested ${assistantMessage.tool_calls.length} tool call(s)`)

    // Execute tools
    const toolResults: any[] = []
    for (const tc of assistantMessage.tool_calls as ToolCall[]) {
      const args = JSON.parse(tc.function.arguments)
      const result = executeTestTool(tc.function.name, args)
      toolResults.push({
        role: 'tool',
        tool_call_id: tc.id,
        content: JSON.stringify(result),
      })
      console.log(`   Result: ${JSON.stringify(result).slice(0, 100)}...`)
    }

    // Follow-up request with tool results
    console.log('\n📤 Sending follow-up with tool results...')

    const followUpMessages = [...messages, assistantMessage, ...toolResults]

    const followUpResponse = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: followUpMessages,
      }),
    })

    if (!followUpResponse.ok) {
      const error = await followUpResponse.json().catch(() => ({}))
      console.error('❌ Follow-up API Error:', error)
      process.exit(1)
    }

    const followUpData = await followUpResponse.json()
    const finalMessage = followUpData.choices[0].message.content

    console.log('\n' + '='.repeat(60))
    console.log(`🤖 Agent: ${finalMessage}`)
    console.log('='.repeat(60))
  } else {
    // No tool calls, just text response
    console.log('\n' + '='.repeat(60))
    console.log(`🤖 Agent: ${assistantMessage.content}`)
    console.log('='.repeat(60))
  }

  console.log('\n✅ Test completed successfully!')
}

// Run test
const testQuery = process.argv[2] || 'Who are the people in my vault?'
testAgentChat(testQuery).catch(console.error)
