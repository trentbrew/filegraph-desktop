/**
 * Agent Tools — Memory Domain
 *
 * Tools for the agent's long-term memory and user profile.
 */

import { invoke } from '@tauri-apps/api/core'
import { join } from '@tauri-apps/api/path'
import { getVaultPath } from './helpers'

const MEMORIES_FILE_PATH = '@system/memories.data'
const USER_PROFILE_FILE_PATH = '@system/user-profile.data'

interface Memory {
  id: string
  created_at: string
  last_accessed: string
  content: string
  importance: number
  category: string
  tags: string[]
  source: string
}

interface MemoriesData {
  '@type': string
  memories: Memory[]
  settings: { max_memories: number; auto_prune: boolean; prune_threshold: number }
}

// ─────────────────────────────────────────────────────────────────────────────
// Tool definitions
// ─────────────────────────────────────────────────────────────────────────────

export const MEMORY_TOOL_DEFINITIONS = [
  {
    type: 'function',
    name: 'save_memory',
    description: `Save an important piece of information to long-term memory. Use this when you learn something important about the user, their preferences, or context that should be remembered across conversations.

**When to save memories:**
- User explicitly states a preference or rule
- Important facts about the user's workflow or setup
- Corrections to your understanding
- Project-specific context that will be useful later
- User's goals, interests, or background details

**When NOT to save:**
- Trivial or temporary information
- Things already in their user profile
- Information that's obvious from context`,
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'The information to remember (be concise but complete)' },
        category: { type: 'string', description: 'Category: preferences, system, development, workflow, project, personal, or other' },
        importance: { type: 'number', description: 'Importance score 0.0-1.0 (0.5=normal, 0.8=important, 1.0=critical)' },
        tags: { type: 'array', description: 'Tags for retrieval (e.g., ["llm", "tooling"])', items: { type: 'string' } },
      },
      required: ['content', 'category', 'importance', 'tags'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'get_memories',
    description: `Retrieve relevant memories from long-term storage. Use this to recall important context about the user or previous interactions.

**When to use:**
- Starting a conversation to get context
- When the user references something from before
- To check if you've learned something relevant
- To personalize your responses`,
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        query: { type: ['string', 'null'], description: 'Search query to find relevant memories (null returns all)' },
        category: { type: ['string', 'null'], description: 'Filter by category (preferences, system, development, etc.)' },
        limit: { type: ['number', 'null'], description: 'Maximum memories to return (default: 20)' },
      },
      required: ['query', 'category', 'limit'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'get_user_profile',
    description: `Get the user's profile including their identity, personality, preferences, background, and goals. Use this to understand who you're working with and how they want you to interact.

**When to use:**
- At the start of a conversation for context
- When you need to personalize your approach
- To understand user preferences and goals`,
    strict: true,
    parameters: { type: 'object', properties: {}, required: [], additionalProperties: false },
  },
  {
    type: 'function',
    name: 'delete_memory',
    description: `Delete a specific memory by ID. Use when the user asks to forget something or when a memory is no longer accurate.`,
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        memoryId: { type: 'string', description: 'The ID of the memory to delete (e.g., "mem:001")' },
      },
      required: ['memoryId'],
      additionalProperties: false,
    },
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Handlers
// ─────────────────────────────────────────────────────────────────────────────

export async function saveMemory(content: string, category: string, importance: number, tags: string[]): Promise<any> {
  try {
    const vaultPath = await getVaultPath()
    const fullPath = await join(vaultPath, MEMORIES_FILE_PATH)

    let memoriesData: MemoriesData
    try {
      const result = await invoke<{ content: string }>('read_text_file', { filePath: fullPath })
      memoriesData = JSON.parse(result.content)
    } catch {
      memoriesData = {
        '@type': 'AgentMemories',
        memories: [],
        settings: { max_memories: 1000, auto_prune: true, prune_threshold: 0.2 },
      }
    }

    const maxId = memoriesData.memories.reduce((max, m) => {
      const num = parseInt(m.id.replace('mem:', ''), 10)
      return isNaN(num) ? max : Math.max(max, num)
    }, 0)
    const newId = `mem:${String(maxId + 1).padStart(3, '0')}`

    const newMemory: Memory = {
      id: newId,
      created_at: new Date().toISOString(),
      last_accessed: new Date().toISOString(),
      content,
      importance: Math.max(0, Math.min(1, importance)),
      category,
      tags,
      source: 'conversation',
    }

    memoriesData.memories.push(newMemory)

    if (memoriesData.settings.auto_prune && memoriesData.memories.length > memoriesData.settings.max_memories) {
      memoriesData.memories.sort((a, b) => b.importance - a.importance)
      memoriesData.memories = memoriesData.memories.slice(0, memoriesData.settings.max_memories)
    }

    const systemDir = await join(vaultPath, '@system')
    try { await invoke('create_directory', { path: systemDir }) } catch { /* may exist */ }

    await invoke('write_text_file', { filePath: fullPath, content: JSON.stringify(memoriesData, null, 2) })

    return {
      success: true,
      memoryId: newId,
      message: `Memory saved: "${content.slice(0, 50)}${content.length > 50 ? '...' : ''}"`,
    }
  } catch (err) {
    return { error: `Failed to save memory: ${err}` }
  }
}

export async function getMemories(query: string | null, category: string | null, limit: number | null): Promise<any> {
  try {
    const vaultPath = await getVaultPath()
    const fullPath = await join(vaultPath, MEMORIES_FILE_PATH)

    let memoriesData: MemoriesData
    try {
      const result = await invoke<{ content: string }>('read_text_file', { filePath: fullPath })
      memoriesData = JSON.parse(result.content)
    } catch {
      return { memories: [], message: 'No memories stored yet' }
    }

    let memories = memoriesData.memories

    if (category) memories = memories.filter((m) => m.category === category)

    if (query) {
      const queryLower = query.toLowerCase()
      memories = memories.filter(
        (m) => m.content.toLowerCase().includes(queryLower) || m.tags.some((t) => t.toLowerCase().includes(queryLower)),
      )
    }

    memories.sort((a, b) => {
      const importanceDiff = b.importance - a.importance
      if (Math.abs(importanceDiff) > 0.1) return importanceDiff
      return new Date(b.last_accessed).getTime() - new Date(a.last_accessed).getTime()
    })

    const maxResults = limit ?? 20
    memories = memories.slice(0, maxResults)

    const now = new Date().toISOString()
    for (const mem of memories) {
      const original = memoriesData.memories.find((m) => m.id === mem.id)
      if (original) original.last_accessed = now
    }

    await invoke('write_text_file', { filePath: fullPath, content: JSON.stringify(memoriesData, null, 2) })

    return { memories, count: memories.length, total: memoriesData.memories.length }
  } catch (err) {
    return { error: `Failed to retrieve memories: ${err}` }
  }
}

export async function getUserProfile(): Promise<any> {
  try {
    const vaultPath = await getVaultPath()
    const fullPath = await join(vaultPath, USER_PROFILE_FILE_PATH)

    try {
      const result = await invoke<{ content: string }>('read_text_file', { filePath: fullPath })
      const profile = JSON.parse(result.content)

      // Check if this is demo data (contains Trent's info)
      if (profile.identity?.name === 'Trent' && profile.identity?.role === 'Designer & Developer') {
        // Return a generic profile for new users
        return {
          success: true,
          profile: {
            "@context": { "fg": "https://filegraph.local/" },
            "@id": "fg:system:user-profile",
            "@type": "UserProfile",
            description: "User identity and preferences for personalized agent interactions",
            identity: {
              name: "User",
              pronouns: "they/them",
              role: "Knowledge Worker",
              location: "Unknown",
              timezone: "UTC"
            },
            personality: {
              communication_style: "adaptive",
              learning_style: "mixed",
              decision_making: "collaborative",
              work_style: "flexible"
            },
            preferences: {
              agent_behavior: [
                "Be helpful and responsive",
                "Ask clarifying questions when needed",
                "Provide clear explanations"
              ],
              response_format: [
                "Be concise but thorough",
                "Use examples when helpful"
              ],
              avoid: [
                "Making assumptions about user preferences"
              ]
            },
            background: {
              summary: "New Filegraph user setting up their knowledge management system",
              expertise: [],
              interests: []
            },
            goals: {
              active: [],
              long_term: []
            },
            context: {
              current_focus: "Getting started with Filegraph",
              recent_wins: [],
              blockers: [],
              notes: "Fresh installation - learning the system"
            }
          }
        }
      }

      return { success: true, profile }
    } catch {
      return {
        success: false,
        message: 'User profile not found. The user has not set up their profile yet.',
        suggestion: 'Ask the user about themselves to help personalize interactions.',
      }
    }
  } catch (err) {
    return { error: `Failed to read user profile: ${err}` }
  }
}

export async function deleteMemory(memoryId: string): Promise<any> {
  try {
    const vaultPath = await getVaultPath()
    const fullPath = await join(vaultPath, MEMORIES_FILE_PATH)

    let memoriesData: MemoriesData
    try {
      const result = await invoke<{ content: string }>('read_text_file', { filePath: fullPath })
      memoriesData = JSON.parse(result.content)
    } catch {
      return { error: 'No memories file found' }
    }

    const index = memoriesData.memories.findIndex((m) => m.id === memoryId)
    if (index === -1) return { error: `Memory not found: ${memoryId}` }

    const deleted = memoriesData.memories.splice(index, 1)[0]
    await invoke('write_text_file', { filePath: fullPath, content: JSON.stringify(memoriesData, null, 2) })

    return {
      success: true,
      deleted: deleted.content.slice(0, 50) + (deleted.content.length > 50 ? '...' : ''),
      message: `Memory ${memoryId} deleted`,
    }
  } catch (err) {
    return { error: `Failed to delete memory: ${err}` }
  }
}
