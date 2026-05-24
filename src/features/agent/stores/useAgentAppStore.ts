/**
 * Agent App Store
 *
 * Zustand store for the full Agent App experience with:
 * - Channels (Slack/Discord-style organization)
 * - Threads (branching conversations)
 * - Messages with attachments and tool calls
 * - Semantic image caching for token optimization
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getDefaultConfig, getModel, type ProviderConfig } from '@/lib/providers'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type ChannelType = 'default' | 'project' | 'entity' | 'private'

export interface Channel {
  id: string
  name: string
  type: ChannelType
  icon?: string
  color?: string
  description?: string
  linkedEntityId?: string
  createdAt: number
  updatedAt: number
  pinnedMessageIds: string[]
  unreadCount: number
}

export interface Thread {
  id: string
  channelId: string
  parentMessageId: string
  title?: string
  createdAt: number
  updatedAt: number
  messageCount: number
  lastMessageAt: number
}

export interface ToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}

export interface ReasoningStep {
  type?: 'assess' | 'plan' | 'execute' | 'synthesize'
  content: string
  timestamp: number
}

export interface Reasoning {
  steps: ReasoningStep[]
  durationMs: number
  isThinking?: boolean
}

export interface MessageCardData {
  type: string
  data: Record<string, unknown>
}

export interface QuickReplyCardData {
  type: 'quick-reply'
  question: string
  options: Array<{ label: string; value: string }>
  selectedValue?: string
}

export interface MessageAttachment {
  id: string
  name: string
  type: string
  size: number
  // Ephemeral (session-only, not persisted)
  data?: string
  previewUrl?: string
  // Persistent (for image caching)
  hash?: string
  semanticDescription?: string
  describedAt?: number
  describedByModel?: string
  // File reference
  filePath?: string
}

export interface Message {
  id: string
  channelId: string
  threadId?: string
  parentMessageId?: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  source?: 'text' | 'voice'
  attachments?: MessageAttachment[]
  toolCalls?: ToolCall[]
  reasoning?: Reasoning
  card?: MessageCardData
  reactions?: Record<string, number>
  isBookmarked?: boolean
  isPinned?: boolean
  isStreaming?: boolean
  editedAt?: number
  replyCount?: number
  lastReplyAt?: number
}

export interface ImageCacheEntry {
  hash: string
  originalName: string
  mimeType: string
  dimensions?: { width: number; height: number }
  description: string
  tags?: string[]
  createdAt: number
  accessedAt: number
  accessCount: number
  modelUsed: string
  tokensUsed: number
  thumbnailDataUrl?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Store State
// ─────────────────────────────────────────────────────────────────────────────

interface AgentAppState {
  // Channels
  channels: Channel[]
  activeChannelId: string | null

  // Messages (keyed by channel)
  messagesByChannel: Record<string, Message[]>

  // Threads
  threads: Thread[]
  activeThreadId: string | null
  threadMessages: Record<string, Message[]>

  // Image cache
  imageCache: Record<string, ImageCacheEntry>

  // UI state
  sidebarCollapsed: boolean
  threadPanelOpen: boolean
  searchQuery: string
  searchResults: Message[]

  // Model config
  modelConfig: ProviderConfig

  // Streaming state
  isStreaming: boolean
  error: string | null
}

interface AgentAppActions {
  // Channel actions
  createChannel: (name: string, type?: ChannelType, linkedEntityId?: string) => string
  updateChannel: (id: string, updates: Partial<Channel>) => void
  deleteChannel: (id: string) => void
  setActiveChannel: (id: string | null) => void

  // Message actions
  addMessage: (channelId: string, message: Omit<Message, 'id' | 'channelId' | 'timestamp'>) => string
  updateMessage: (channelId: string, messageId: string, updates: Partial<Message>) => void
  appendToMessage: (channelId: string, messageId: string, content: string) => void
  deleteMessage: (channelId: string, messageId: string) => void
  clearChannelMessages: (channelId: string) => void

  // Thread actions
  createThread: (channelId: string, parentMessageId: string, title?: string) => string
  openThread: (threadId: string) => void
  closeThread: () => void
  addThreadMessage: (threadId: string, message: Omit<Message, 'id' | 'threadId' | 'timestamp'>) => string
  updateThreadMessage: (threadId: string, messageId: string, updates: Partial<Message>) => void
  appendToThreadMessage: (threadId: string, messageId: string, content: string) => void

  // Image cache actions
  cacheImageDescription: (
    hash: string,
    originalName: string,
    mimeType: string,
    description: string,
    tags: string[],
    modelUsed: string,
    tokensUsed: number,
    thumbnailDataUrl?: string,
  ) => void
  getCachedDescription: (hash: string) => string | null
  touchImageCache: (hash: string) => void

  // UI actions
  toggleSidebar: () => void
  setSearchQuery: (query: string) => void
  searchMessages: (query: string) => void

  // Model config
  setModelConfig: (config: Partial<ProviderConfig>) => void

  // Streaming
  setStreaming: (streaming: boolean) => void
  setError: (error: string | null) => void

  // Helpers
  getActiveChannel: () => Channel | null
  getActiveMessages: () => Message[]
  getActiveThread: () => Thread | null
  getActiveThreadMessages: () => Message[]
}

type AgentAppStore = AgentAppState & AgentAppActions

// ─────────────────────────────────────────────────────────────────────────────
// Initial State
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_CHANNEL: Channel = {
  id: 'chan_general',
  name: 'general',
  type: 'default',
  icon: 'hash',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  pinnedMessageIds: [],
  unreadCount: 0,
}

// ─────────────────────────────────────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────────────────────────────────────

export const useAgentAppStore = create<AgentAppStore>()(
  persist(
    (set, get) => ({
      // Initial state
      channels: [DEFAULT_CHANNEL],
      activeChannelId: 'chan_general',
      messagesByChannel: { chan_general: [] },
      threads: [],
      activeThreadId: null,
      threadMessages: {},
      imageCache: {},
      sidebarCollapsed: false,
      threadPanelOpen: false,
      searchQuery: '',
      searchResults: [],
      modelConfig: getDefaultConfig(),
      isStreaming: false,
      error: null,

      // ─────────────────────────────────────────────────────────────────────
      // Channel Actions
      // ─────────────────────────────────────────────────────────────────────

      createChannel: (name, type = 'default', linkedEntityId) => {
        const id = `chan_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
        const channel: Channel = {
          id,
          name,
          type,
          linkedEntityId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          pinnedMessageIds: [],
          unreadCount: 0,
        }
        set((state) => ({
          channels: [...state.channels, channel],
          messagesByChannel: { ...state.messagesByChannel, [id]: [] },
        }))
        return id
      },

      updateChannel: (id, updates) => {
        set((state) => ({
          channels: state.channels.map((ch) => (ch.id === id ? { ...ch, ...updates, updatedAt: Date.now() } : ch)),
        }))
      },

      deleteChannel: (id) => {
        if (id === 'chan_general') return // Can't delete default channel
        set((state) => {
          const { [id]: _, ...remainingMessages } = state.messagesByChannel
          return {
            channels: state.channels.filter((ch) => ch.id !== id),
            messagesByChannel: remainingMessages,
            activeChannelId: state.activeChannelId === id ? 'chan_general' : state.activeChannelId,
          }
        })
      },

      setActiveChannel: (id) => {
        set({ activeChannelId: id, activeThreadId: null, threadPanelOpen: false })
      },

      // ─────────────────────────────────────────────────────────────────────
      // Message Actions
      // ─────────────────────────────────────────────────────────────────────

      addMessage: (channelId, message) => {
        const id = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
        const newMessage: Message = {
          ...message,
          id,
          channelId,
          timestamp: Date.now(),
        }
        set((state) => ({
          messagesByChannel: {
            ...state.messagesByChannel,
            [channelId]: [...(state.messagesByChannel[channelId] || []), newMessage],
          },
        }))
        return id
      },

      updateMessage: (channelId, messageId, updates) => {
        set((state) => ({
          messagesByChannel: {
            ...state.messagesByChannel,
            [channelId]: (state.messagesByChannel[channelId] || []).map((msg) =>
              msg.id === messageId ? { ...msg, ...updates } : msg,
            ),
          },
        }))
      },

      appendToMessage: (channelId, messageId, content) => {
        set((state) => ({
          messagesByChannel: {
            ...state.messagesByChannel,
            [channelId]: (state.messagesByChannel[channelId] || []).map((msg) =>
              msg.id === messageId ? { ...msg, content: (msg.content ?? '') + content } : msg,
            ),
          },
        }))
      },

      deleteMessage: (channelId, messageId) => {
        set((state) => ({
          messagesByChannel: {
            ...state.messagesByChannel,
            [channelId]: (state.messagesByChannel[channelId] || []).filter((msg) => msg.id !== messageId),
          },
        }))
      },

      clearChannelMessages: (channelId) => {
        set((state) => ({
          messagesByChannel: {
            ...state.messagesByChannel,
            [channelId]: [],
          },
        }))
      },

      // ─────────────────────────────────────────────────────────────────────
      // Thread Actions
      // ─────────────────────────────────────────────────────────────────────

      createThread: (channelId, parentMessageId, title) => {
        const id = `thread_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
        const thread: Thread = {
          id,
          channelId,
          parentMessageId,
          title,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          messageCount: 0,
          lastMessageAt: Date.now(),
        }
        set((state) => ({
          threads: [...state.threads, thread],
          threadMessages: { ...state.threadMessages, [id]: [] },
        }))

        // Update parent message to show thread exists
        get().updateMessage(channelId, parentMessageId, { replyCount: 0, lastReplyAt: Date.now() })

        return id
      },

      openThread: (threadId) => {
        set({ activeThreadId: threadId, threadPanelOpen: true })
      },

      closeThread: () => {
        set({ activeThreadId: null, threadPanelOpen: false })
      },

      addThreadMessage: (threadId, message) => {
        const id = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
        const thread = get().threads.find((t) => t.id === threadId)
        if (!thread) return id

        const newMessage: Message = {
          ...message,
          id,
          channelId: thread.channelId,
          threadId,
          timestamp: Date.now(),
        }

        set((state) => ({
          threadMessages: {
            ...state.threadMessages,
            [threadId]: [...(state.threadMessages[threadId] || []), newMessage],
          },
          threads: state.threads.map((t) =>
            t.id === threadId
              ? { ...t, messageCount: t.messageCount + 1, lastMessageAt: Date.now(), updatedAt: Date.now() }
              : t,
          ),
        }))

        // Update parent message reply count
        get().updateMessage(thread.channelId, thread.parentMessageId, {
          replyCount: get().threadMessages[threadId]?.length || 0,
          lastReplyAt: Date.now(),
        })

        return id
      },

      updateThreadMessage: (threadId, messageId, updates) => {
        set((state) => ({
          threadMessages: {
            ...state.threadMessages,
            [threadId]: (state.threadMessages[threadId] || []).map((msg) =>
              msg.id === messageId ? { ...msg, ...updates } : msg,
            ),
          },
        }))
      },

      appendToThreadMessage: (threadId, messageId, content) => {
        set((state) => ({
          threadMessages: {
            ...state.threadMessages,
            [threadId]: (state.threadMessages[threadId] || []).map((msg) =>
              msg.id === messageId ? { ...msg, content: (msg.content ?? '') + content } : msg,
            ),
          },
        }))
      },

      // ─────────────────────────────────────────────────────────────────────
      // Image Cache Actions
      // ─────────────────────────────────────────────────────────────────────

      cacheImageDescription: (
        hash,
        originalName,
        mimeType,
        description,
        tags,
        modelUsed,
        tokensUsed,
        thumbnailDataUrl,
      ) => {
        const entry: ImageCacheEntry = {
          hash,
          originalName,
          mimeType,
          description,
          tags,
          modelUsed,
          tokensUsed,
          thumbnailDataUrl,
          createdAt: Date.now(),
          accessedAt: Date.now(),
          accessCount: 1,
        }
        set((state) => ({
          imageCache: { ...state.imageCache, [hash]: entry },
        }))
      },

      getCachedDescription: (hash) => {
        const entry = get().imageCache[hash]
        if (entry) {
          get().touchImageCache(hash)
          return entry.description
        }
        return null
      },

      touchImageCache: (hash) => {
        set((state) => {
          const entry = state.imageCache[hash]
          if (!entry) return state
          return {
            imageCache: {
              ...state.imageCache,
              [hash]: {
                ...entry,
                accessedAt: Date.now(),
                accessCount: entry.accessCount + 1,
              },
            },
          }
        })
      },

      // ─────────────────────────────────────────────────────────────────────
      // UI Actions
      // ─────────────────────────────────────────────────────────────────────

      toggleSidebar: () => {
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }))
      },

      setSearchQuery: (query) => {
        set({ searchQuery: query })
        if (query) {
          get().searchMessages(query)
        } else {
          set({ searchResults: [] })
        }
      },

      searchMessages: (query) => {
        const state = get()
        const lowerQuery = query.toLowerCase()
        const results: Message[] = []

        // Search all channels
        Object.values(state.messagesByChannel).forEach((messages) => {
          messages.forEach((msg) => {
            if (msg.content.toLowerCase().includes(lowerQuery)) {
              results.push(msg)
            }
          })
        })

        // Search all threads
        Object.values(state.threadMessages).forEach((messages) => {
          messages.forEach((msg) => {
            if (msg.content.toLowerCase().includes(lowerQuery)) {
              results.push(msg)
            }
          })
        })

        // Sort by timestamp descending
        results.sort((a, b) => b.timestamp - a.timestamp)

        set({ searchResults: results.slice(0, 50) }) // Limit results
      },

      // ─────────────────────────────────────────────────────────────────────
      // Model Config
      // ─────────────────────────────────────────────────────────────────────

      setModelConfig: (config) => {
        set((state) => ({
          modelConfig: { ...state.modelConfig, ...config },
        }))
      },

      // ─────────────────────────────────────────────────────────────────────
      // Streaming
      // ─────────────────────────────────────────────────────────────────────

      setStreaming: (streaming) => set({ isStreaming: streaming }),
      setError: (error) => set({ error }),

      // ─────────────────────────────────────────────────────────────────────
      // Helpers
      // ─────────────────────────────────────────────────────────────────────

      getActiveChannel: () => {
        const state = get()
        return state.channels.find((ch) => ch.id === state.activeChannelId) || null
      },

      getActiveMessages: () => {
        const state = get()
        if (!state.activeChannelId) return []
        return state.messagesByChannel[state.activeChannelId] || []
      },

      getActiveThread: () => {
        const state = get()
        return state.threads.find((t) => t.id === state.activeThreadId) || null
      },

      getActiveThreadMessages: () => {
        const state = get()
        if (!state.activeThreadId) return []
        return state.threadMessages[state.activeThreadId] || []
      },
    }),
    {
      name: 'filegraph-agent-app',
      partialize: (state) => ({
        channels: state.channels,
        activeChannelId: state.activeChannelId,
        // Strip ephemeral data from messages before persisting
        messagesByChannel: Object.fromEntries(
          Object.entries(state.messagesByChannel).map(([channelId, messages]) => [
            channelId,
            messages.map((msg) => ({
              ...msg,
              attachments: msg.attachments?.map((att) => ({
                id: att.id,
                name: att.name,
                type: att.type,
                size: att.size,
                hash: att.hash,
                semanticDescription: att.semanticDescription,
                describedAt: att.describedAt,
                describedByModel: att.describedByModel,
                filePath: att.filePath,
                // Exclude: data, previewUrl (ephemeral)
              })),
            })),
          ]),
        ),
        threads: state.threads,
        threadMessages: Object.fromEntries(
          Object.entries(state.threadMessages).map(([threadId, messages]) => [
            threadId,
            messages.map((msg) => ({
              ...msg,
              attachments: msg.attachments?.map((att) => ({
                id: att.id,
                name: att.name,
                type: att.type,
                size: att.size,
                hash: att.hash,
                semanticDescription: att.semanticDescription,
                describedAt: att.describedAt,
                describedByModel: att.describedByModel,
                filePath: att.filePath,
              })),
            })),
          ]),
        ),
        imageCache: state.imageCache, // Small, persist it
        sidebarCollapsed: state.sidebarCollapsed,
        modelConfig: state.modelConfig,
      }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<AgentAppState>
        let modelConfig = persisted.modelConfig || currentState.modelConfig

        const migratedImageCache = (() => {
          const cache = (persisted.imageCache || {}) as any
          const entries = Object.entries(cache)
          if (entries.length === 0) return cache as AgentAppState['imageCache']

          // Migration: old schema stored entries keyed by attachmentId with { attachmentId, ... }
          // New schema stores entries keyed by stable image hash with { hash, ... }
          const next: Record<string, ImageCacheEntry> = {}
          for (const [key, value] of entries) {
            if (!value || typeof value !== 'object') continue
            const hash = (value as any).hash || (value as any).attachmentId || key
            next[hash] = {
              hash,
              originalName: (value as any).originalName || 'unknown',
              mimeType: (value as any).mimeType || 'application/octet-stream',
              description: (value as any).description || '',
              tags: (value as any).tags,
              modelUsed: (value as any).modelUsed || 'unknown',
              tokensUsed: (value as any).tokensUsed || 0,
              thumbnailDataUrl: (value as any).thumbnailDataUrl,
              createdAt: (value as any).createdAt || Date.now(),
              accessedAt: (value as any).accessedAt || Date.now(),
              accessCount: (value as any).accessCount || 0,
              dimensions: (value as any).dimensions,
            }
          }
          return next
        })()

        // Validate model config
        if (modelConfig && !getModel(modelConfig.provider, modelConfig.model)) {
          console.log(`[AgentAppStore] Invalid model "${modelConfig.model}" - resetting to default`)
          modelConfig = { ...modelConfig, ...getDefaultConfig() }
        }

        return {
          ...currentState,
          ...persisted,
          modelConfig,
          imageCache: migratedImageCache,
        }
      },
    },
  ),
)

// ─────────────────────────────────────────────────────────────────────────────
// Selector Hooks
// ─────────────────────────────────────────────────────────────────────────────

export const useActiveChannel = () =>
  useAgentAppStore((state) => state.channels.find((ch) => ch.id === state.activeChannelId) || null)

export const useActiveMessages = () =>
  useAgentAppStore((state) => state.messagesByChannel[state.activeChannelId || ''] || [])

export const useActiveThread = () =>
  useAgentAppStore((state) => state.threads.find((t) => t.id === state.activeThreadId) || null)

export const useActiveThreadMessages = () =>
  useAgentAppStore((state) => state.threadMessages[state.activeThreadId || ''] || [])

export const useChannels = () => useAgentAppStore((state) => state.channels)

export const useImageCache = () => useAgentAppStore((state) => state.imageCache)
