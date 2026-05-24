/**
 * useChatStore - Zustand store for agent chat state
 *
 * Manages conversation history, streaming state, and model configuration.
 * Supports multiple conversation threads with persistence.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { type ProviderId, getDefaultConfig, getModel } from '@/lib/providers'

export interface ReasoningStep {
  type: 'assess' | 'plan' | 'execute' | 'synthesize'
  content: string
  timestamp: number
}

export interface Reasoning {
  steps: ReasoningStep[]
  durationMs: number
  isThinking?: boolean
}

// Interactive card types for inline UI in chat
export type MessageCardType = 'event-form' | 'confirmation' | 'quick-reply' | 'command-approval'

export interface EventFormCardData {
  type: 'event-form'
  name?: string
  date?: string
  startTime?: string
  endTime?: string
  label?: string
  description?: string
  location?: string
  urgency?: number
  isAllDay?: boolean
  status?: 'pending' | 'created' | 'cancelled'
  eventId?: string // ID of created event for viewing
}

export interface ConfirmationCardData {
  type: 'confirmation'
  action: string
  status: 'pending' | 'confirmed' | 'cancelled'
}

export interface QuickReplyCardData {
  type: 'quick-reply'
  question: string
  options: Array<{ label: string; value: string }>
  selectedValue?: string
}

export interface CommandApprovalCardData {
  type: 'command-approval'
  command: string
  cwd: string | null
  status: 'pending' | 'approved' | 'denied'
  resolveId: string // unique ID to match resolve callback
}

export type MessageCardData = EventFormCardData | ConfirmationCardData | QuickReplyCardData | CommandApprovalCardData

export interface MessageAttachment {
  id: string
  name: string
  type: string // MIME type
  size: number
  data: string // Base64 encoded data
  previewUrl?: string // For images, a data URL for preview
}

export interface WebSource {
  url?: string
  title?: string
}

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  toolCalls?: ToolCall[]
  isStreaming?: boolean
  reasoning?: Reasoning
  card?: MessageCardData // Interactive card embedded in message
  attachments?: MessageAttachment[] // File attachments
  sources?: WebSource[] // Web search sources
}

export interface ToolCall {
  id: string
  name: string
  arguments: string
  result?: string
}

export interface FileContext {
  path: string
  name: string
  content: string
  language?: string
  selection?: {
    start: number
    end: number
    text: string
  }
}

export interface Conversation {
  id: string
  title: string
  messages: Message[]
  createdAt: number
  updatedAt: number
}

export interface ModelConfig {
  provider: ProviderId
  model: string
  apiKey?: string
  baseUrl?: string
}

interface ChatStore {
  // State
  conversations: Conversation[]
  activeConversationId: string | null
  isStreaming: boolean
  error: string | null
  fileContext: FileContext | null
  modelConfig: ModelConfig

  // Conversation actions
  createConversation: (title?: string) => string
  switchConversation: (id: string) => void
  deleteConversation: (id: string) => void
  renameConversation: (id: string, title: string) => void

  // Message actions
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => string
  updateMessage: (id: string, updates: Partial<Message>) => void
  appendToMessage: (id: string, content: string) => void
  removeMessage: (id: string) => void
  clearMessages: () => void
  setStreaming: (streaming: boolean) => void
  setError: (error: string | null) => void
  setFileContext: (context: FileContext | null) => void
  setModelConfig: (config: Partial<ModelConfig>) => void

  // Computed
  getConversationHistory: () => Array<{ role: string; content: string; attachments?: MessageAttachment[] }>
}

const DEFAULT_MODEL_CONFIG: ModelConfig = getDefaultConfig()

// Helper to get messages from active conversation
const getActiveMessages = (state: {
  conversations: Conversation[]
  activeConversationId: string | null
}): Message[] => {
  if (!state.activeConversationId) return []
  const conv = state.conversations.find((c) => c.id === state.activeConversationId)
  return conv?.messages || []
}

// Helper to update active conversation
const updateActiveConversation = (
  state: { conversations: Conversation[]; activeConversationId: string | null },
  updater: (conv: Conversation) => Conversation,
): Conversation[] => {
  return state.conversations.map((conv) => (conv.id === state.activeConversationId ? updater(conv) : conv))
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      // Initial state
      conversations: [],
      activeConversationId: null,
      isStreaming: false,
      error: null,
      fileContext: null,
      modelConfig: DEFAULT_MODEL_CONFIG,

      // Create a new conversation
      createConversation: (title?: string) => {
        const id = crypto.randomUUID()
        const now = Date.now()
        const newConv: Conversation = {
          id,
          title: title || `Chat ${new Date(now).toLocaleDateString()}`,
          messages: [],
          createdAt: now,
          updatedAt: now,
        }
        set((state) => ({
          conversations: [newConv, ...state.conversations],
          activeConversationId: id,
          error: null,
        }))
        return id
      },

      // Switch to a different conversation
      switchConversation: (id) => {
        set({ activeConversationId: id, error: null })
      },

      // Delete a conversation
      deleteConversation: (id) => {
        set((state) => {
          const remaining = state.conversations.filter((c) => c.id !== id)
          const newActiveId = state.activeConversationId === id ? remaining[0]?.id || null : state.activeConversationId
          return {
            conversations: remaining,
            activeConversationId: newActiveId,
          }
        })
      },

      // Rename a conversation
      renameConversation: (id, title) => {
        set((state) => ({
          conversations: state.conversations.map((c) => (c.id === id ? { ...c, title, updatedAt: Date.now() } : c)),
        }))
      },

      // Add a new message to active conversation
      addMessage: (message) => {
        const id = crypto.randomUUID()
        const newMessage: Message = {
          ...message,
          id,
          timestamp: Date.now(),
        }

        set((state) => {
          // Auto-create conversation if none exists
          if (!state.activeConversationId) {
            const convId = crypto.randomUUID()
            const now = Date.now()
            return {
              conversations: [
                {
                  id: convId,
                  title: message.content.slice(0, 50) || 'New Chat',
                  messages: [newMessage],
                  createdAt: now,
                  updatedAt: now,
                },
              ],
              activeConversationId: convId,
              error: null,
            }
          }

          return {
            conversations: updateActiveConversation(state, (conv) => ({
              ...conv,
              messages: [...conv.messages, newMessage],
              updatedAt: Date.now(),
            })),
            error: null,
          }
        })
        return id
      },

      // Update an existing message
      updateMessage: (id, updates) => {
        set((state) => ({
          conversations: updateActiveConversation(state, (conv) => ({
            ...conv,
            messages: conv.messages.map((msg) => (msg.id === id ? { ...msg, ...updates } : msg)),
            updatedAt: Date.now(),
          })),
        }))
      },

      // Append content to a message (for streaming)
      appendToMessage: (id, content) => {
        set((state) => ({
          conversations: updateActiveConversation(state, (conv) => ({
            ...conv,
            messages: conv.messages.map((msg) =>
              msg.id === id ? { ...msg, content: (msg.content ?? '') + content } : msg,
            ),
          })),
        }))
      },

      // Remove a message
      removeMessage: (id) => {
        set((state) => ({
          conversations: updateActiveConversation(state, (conv) => ({
            ...conv,
            messages: conv.messages.filter((msg) => msg.id !== id),
            updatedAt: Date.now(),
          })),
        }))
      },

      // Clear messages in active conversation
      clearMessages: () => {
        set((state) => ({
          conversations: updateActiveConversation(state, (conv) => ({
            ...conv,
            messages: [],
            updatedAt: Date.now(),
          })),
          error: null,
        }))
      },

      // Set streaming state
      setStreaming: (streaming) => {
        set({ isStreaming: streaming })
      },

      // Set error state
      setError: (error) => {
        set({ error, isStreaming: false })
      },

      // Set file context
      setFileContext: (context) => {
        set({ fileContext: context })
      },

      // Update model configuration
      setModelConfig: (config) => {
        set((state) => ({
          modelConfig: { ...state.modelConfig, ...config },
        }))
      },

      // Get conversation history formatted for API
      getConversationHistory: () => {
        const state = get()
        const messages = getActiveMessages(state)
        return messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
          attachments: msg.attachments,
        }))
      },
    }),
    {
      name: 'filegraph-chat-store',
      partialize: (state) => ({
        // Strip base64 data from attachments to avoid storage quota issues
        // Images are ephemeral - only available during the session they were attached
        conversations: state.conversations.map((conv) => ({
          ...conv,
          messages: conv.messages.map((msg) => ({
            ...msg,
            attachments: msg.attachments?.map((att) => ({
              id: att.id,
              name: att.name,
              type: att.type,
              size: att.size,
              // Exclude: data (base64), previewUrl (data URL) - too large to persist
            })),
          })),
        })),
        activeConversationId: state.activeConversationId,
        modelConfig: state.modelConfig,
      }),
      // Validate and migrate invalid model IDs on load
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<ChatStore>
        let modelConfig = persisted.modelConfig || currentState.modelConfig

        // Check if cached model still exists in registry
        if (modelConfig && !getModel(modelConfig.provider, modelConfig.model)) {
          console.log(`[ChatStore] Invalid model "${modelConfig.model}" - resetting to default`)
          modelConfig = { ...modelConfig, ...getDefaultConfig() }
        }

        return {
          ...currentState,
          ...persisted,
          modelConfig,
        }
      },
    },
  ),
)

// Stable empty array to avoid infinite re-renders from Zustand's Object.is equality check
const EMPTY_MESSAGES: Message[] = []

// Selector hook for messages (derives from conversations + activeConversationId)
export const useMessages = () =>
  useChatStore((state) => {
    if (!state.activeConversationId) return EMPTY_MESSAGES
    const conv = state.conversations.find((c) => c.id === state.activeConversationId)
    return conv?.messages ?? EMPTY_MESSAGES
  })
