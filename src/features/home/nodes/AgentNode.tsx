/**
 * Agent Node Component
 *
 * A canvas node that provides an embedded AI chat interface.
 * Conversations are persisted to .chat files for each node instance.
 */

import * as React from 'react'
import { type NodeProps } from 'reactflow'
import { invoke } from '@tauri-apps/api/core'
import { motion, AnimatePresence } from 'framer-motion'
import { Bot, Send, Loader2, Sparkles, Trash2, Settings2, Paperclip, X, FileText } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CanvasNodeWrapper, MaximizedHeader } from './CanvasNodeWrapper'
import { createNodeFile, generateNodeFileName, writeNodeFile, readNodeFile } from '@/features/home/utils'
import {
  PROVIDERS,
  getAdapter,
  getDefaultConfig,
  type ProviderConfig,
  type ChatMessage as ProviderChatMessage,
  type ToolCall as ProviderToolCall,
  type ToolDefinition,
  type StreamChunk,
} from '@/lib/providers'
import { type AgentChatContent, type ChatMessage, DEFAULT_AGENT_CHAT_CONTENT } from '@/features/home/types'
import { MessageContent } from '@/features/agent/components/MessageContent'
import { useAttachments } from '@/features/agent/hooks/useAttachments'
import { AGENT_TOOLS, executeToolCall } from '@/features/agent/tools'

function parseToolArguments(raw: unknown): { ok: true; args: Record<string, any> } | { ok: false; error: string } {
  if (raw === null || raw === undefined) return { ok: true, args: {} }
  if (typeof raw === 'string') {
    const trimmed = raw.trim()
    if (!trimmed) return { ok: true, args: {} }
    try {
      const parsed = JSON.parse(trimmed)
      if (parsed && typeof parsed === 'object') return { ok: true, args: parsed as Record<string, any> }
      return { ok: true, args: {} }
    } catch (err) {
      return { ok: false, error: (err as Error).message }
    }
  }
  if (typeof raw === 'object') return { ok: true, args: raw as Record<string, any> }
  return { ok: true, args: {} }
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface AgentNodeData {
  file?: string
  label?: string
  isMaximized?: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// Message Bubble (simplified for node context)
// ─────────────────────────────────────────────────────────────────────────────

interface MessageBubbleProps {
  message: ChatMessage
  isStreaming?: boolean
}

function MessageBubble({ message, isStreaming }: MessageBubbleProps) {
  const isUser = message.role === 'user'

  const attachments = message.attachments || []

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('flex gap-2 py-2', isUser ? 'flex-row-reverse' : 'flex-row')}>
      {/* Avatar */}
      <div
        className={cn(
          'shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px]',
          isUser ? 'bg-primary text-primary-foreground' : 'bg-gradient-to-br from-violet-500 to-purple-600 text-white',
        )}>
        {isUser ? 'U' : <Sparkles className="h-3 w-3" />}
      </div>

      {/* Content */}
      <div
        className={cn(
          'inline-block max-w-[85%] px-3 py-2 rounded-xl text-sm',
          isUser ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-muted rounded-bl-sm',
          isStreaming && 'animate-pulse',
        )}>
        {attachments.length > 0 && (
          <div className={cn('flex flex-wrap gap-2 mb-2', isUser ? 'justify-end' : 'justify-start')}>
            {attachments.slice(0, 4).map((att, idx) => (
              <div
                key={`${att.id}-${idx}`}
                className={cn(
                  'h-12 w-12 rounded border overflow-hidden bg-background/40 flex items-center justify-center',
                  isUser ? 'border-primary-foreground/20' : 'border-border/60',
                )}
                title={att.name}>
                {att.previewUrl ? (
                  <img src={att.previewUrl} alt={att.name} className="h-full w-full object-cover" />
                ) : (
                  <FileText
                    className={cn('h-5 w-5', isUser ? 'text-primary-foreground/70' : 'text-muted-foreground')}
                  />
                )}
              </div>
            ))}
          </div>
        )}
        {isUser ? (
          <p className="whitespace-pre-wrap break-words leading-relaxed">{message.content}</p>
        ) : (
          <MessageContent content={message.content} isStreaming={isStreaming} />
        )}
      </div>
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Empty State
// ─────────────────────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500/20 to-purple-600/20 flex items-center justify-center mb-3">
        <Bot className="h-5 w-5 text-violet-500" />
      </div>
      <p className="text-xs text-muted-foreground">Start a conversation</p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Agent Node Component
// ─────────────────────────────────────────────────────────────────────────────

export function AgentNode({ id, data, selected, groupColor }: NodeProps<AgentNodeData> & { groupColor?: string }) {
  const isMaximized = data?.isMaximized || false
  const [resolvedFilePath, setResolvedFilePath] = React.useState<string | undefined>(data?.file)
  const [chatContent, setChatContent] = React.useState<AgentChatContent | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [input, setInput] = React.useState('')
  const [isStreaming, setIsStreaming] = React.useState(false)
  const [modelConfig, setModelConfig] = React.useState<ProviderConfig>(getDefaultConfig())
  const [isEditing, setIsEditing] = React.useState(false)
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const abortRef = React.useRef<AbortController | null>(null)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  const { attachments, addAttachment, removeAttachment, clearAttachments, getAttachmentsData } = useAttachments()
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // Focus textarea when editing mode is enabled
  React.useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [isEditing])

  const getChildNodePosition = React.useCallback(
    async (nodeType?: string) => {
      try {
        const { useHomeCanvasStore } = await import('@/features/home/useHomeCanvasStore')
        const store = useHomeCanvasStore.getState()

        if (!store.isInitialized) {
          await store.initialize()
        }

        const selfNode = store.nodes.find((n) => n.id === id)

        const selfWidth = (selfNode?.style?.width as number) || 300
        const selfHeight = (selfNode?.style?.height as number) || 200
        const baseX = (selfNode?.position?.x || 0) + selfWidth + 60
        const baseY = selfNode?.position?.y || 0

        const defaultDims: Record<string, { width: number; height: number }> = {
          stickyNote: { width: 200, height: 150 },
          richText: { width: 350, height: 250 },
          embed: { width: 400, height: 300 },
          youtube: { width: 400, height: 225 },
          pdf: { width: 400, height: 500 },
          terminal: { width: 600, height: 350 },
          folder: { width: 360, height: 260 },
          shape: { width: 150, height: 100 },
        }

        const newDims = (nodeType && defaultDims[nodeType]) || { width: 300, height: 200 }

        const intersects = (pos: { x: number; y: number }) => {
          const pad = 12
          const ax1 = pos.x - pad
          const ay1 = pos.y - pad
          const ax2 = pos.x + newDims.width + pad
          const ay2 = pos.y + newDims.height + pad

          return store.nodes.some((n) => {
            if (n.id === id) return false
            const w = (n.style?.width as number) || 300
            const h = (n.style?.height as number) || 200
            const bx1 = n.position.x
            const by1 = n.position.y
            const bx2 = n.position.x + w
            const by2 = n.position.y + h
            return ax1 < bx2 && ax2 > bx1 && ay1 < by2 && ay2 > by1
          })
        }

        const STEP_Y = Math.max(selfHeight + 40, newDims.height + 40)
        for (let i = 0; i < 12; i++) {
          const candidate = { x: baseX, y: baseY + i * STEP_Y }
          if (!intersects(candidate)) return candidate
        }

        return { x: baseX, y: baseY }
      } catch {
        return { x: 400, y: 100 }
      }
    },
    [id],
  )

  // Initialize file if needed
  React.useEffect(() => {
    if (resolvedFilePath) return

    let cancelled = false

    const initFile = async () => {
      try {
        const fileName = generateNodeFileName('agent', data?.label || 'Chat')
        const filePath = await createNodeFile('agent', fileName)

        if (cancelled) return
        setResolvedFilePath(filePath)
        window.dispatchEvent(new CustomEvent('canvas-node-update', { detail: { id, data: { file: filePath } } }))
      } catch (err) {
        console.error('[AgentNode] Failed to create chat file:', err)
      }
    }

    initFile()
    return () => {
      cancelled = true
    }
  }, [data?.label, id, resolvedFilePath])

  // Load chat content from file
  React.useEffect(() => {
    if (!resolvedFilePath) return

    let cancelled = false

    const loadContent = async () => {
      setIsLoading(true)
      try {
        const content = await readNodeFile<AgentChatContent>(resolvedFilePath)
        if (cancelled) return

        if (content) {
          setChatContent(content)
          if (content.modelConfig) {
            setModelConfig({ provider: content.modelConfig.provider as any, model: content.modelConfig.model })
          }
        } else {
          setChatContent({ ...DEFAULT_AGENT_CHAT_CONTENT })
        }
      } catch (err) {
        console.error('[AgentNode] Failed to load chat:', err)
        setChatContent({ ...DEFAULT_AGENT_CHAT_CONTENT })
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    loadContent()
    return () => {
      cancelled = true
    }
  }, [resolvedFilePath])

  // Save chat content to file
  const saveContent = React.useCallback(
    async (content: AgentChatContent) => {
      if (!resolvedFilePath) return
      try {
        await writeNodeFile(resolvedFilePath, {
          ...content,
          updatedAt: new Date().toISOString(),
        })
      } catch (err) {
        console.error('[AgentNode] Failed to save chat:', err)
      }
    },
    [resolvedFilePath],
  )

  // Auto-scroll to bottom
  React.useEffect(() => {
    if (scrollRef.current) {
      const scrollArea = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (scrollArea) {
        scrollArea.scrollTop = scrollArea.scrollHeight
      }
    }
  }, [chatContent?.messages?.length])

  // Send message
  const handleSend = React.useCallback(async () => {
    const text = input.trim()
    if ((!text && attachments.length === 0) || isStreaming || !chatContent) return

    const existingMessages = chatContent.messages ?? []

    const attachmentsData = getAttachmentsData()
    clearAttachments()

    const attachmentNames = attachmentsData?.map((a) => a.name).join(', ')
    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      role: 'user',
      content: text || (attachmentsData?.length ? `[Attached: ${attachmentNames}]` : ''),
      timestamp: Date.now(),
      attachments: attachmentsData,
    }

    const assistantMessage: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}_assistant`,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
    }

    // Add user message and empty assistant message
    const updatedContent: AgentChatContent = {
      ...chatContent,
      messages: [...existingMessages, userMessage, assistantMessage],
      modelConfig: { provider: modelConfig.provider, model: modelConfig.model },
    }
    setChatContent(updatedContent)
    setInput('')
    setIsStreaming(true)

    // Build messages for the API
    const apiMessages: ProviderChatMessage[] = updatedContent.messages
      .filter((m) => m.role !== 'assistant' || m.content)
      .map((m) => {
        const providerMsg: ProviderChatMessage = {
          role: m.role as 'user' | 'assistant' | 'system',
          content: m.content,
        }

        const imageAttachments = (m.attachments || [])
          .filter((att) => att.data && att.type.startsWith('image/'))
          .map((att) => ({ type: att.type, data: att.data as string, name: att.name }))

        if (m.role === 'user' && imageAttachments.length > 0) {
          providerMsg.attachments = imageAttachments
          if (!providerMsg.content) {
            providerMsg.content = ''
          }
        }

        return providerMsg
      })

    const systemMessage: ProviderChatMessage = {
      role: 'system',
      content: `You are an AI agent embedded inside Filegraph's Home canvas. You CAN access the user's Home canvas graph and perform actions by calling available tools.

**Available Home Canvas Tools:**
- get_home_canvas: Read current canvas state (nodes, edges, viewport)
- add_home_node: Add a new node (stickyNote, richText, embed, youtube, image, shape, table, codeBlock, etc.)
- update_home_node: Move/resize/update data on a node
- add_home_edge: Connect two nodes
- remove_home_edge: Remove a connection
- remove_home_node: Remove a node
- update_home_node_content: Edit text content of richText or stickyNote nodes
- edit_home_table: Edit table cells, columns, rows
- auto_layout_home_canvas: Auto-layout nodes using dagre (TB, LR, BT, RL)
- grid_layout_home_canvas: Arrange nodes into a grid
- align_home_nodes: Align multiple nodes (left, center, right, top, middle, bottom)
- distribute_home_nodes: Distribute nodes evenly (horizontal, vertical)
- create_home_group: Group nodes into a container
- ungroup_home_nodes: Ungroup a container

When asked what's on the canvas, call get_home_canvas first. Before adding nodes, check the canvas to avoid overlap.`,
    }

    const baseMessages: ProviderChatMessage[] = [systemMessage, ...apiMessages]

    const tools: ToolDefinition[] = AGENT_TOOLS.map((tool) => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }))

    // Resolve API key from env vars if not stored (same as AgentSidebar)
    let apiKey = modelConfig.apiKey
    if (!apiKey) {
      if (modelConfig.provider === 'gemini') {
        apiKey = import.meta.env.VITE_GEMINI_API_KEY
      } else if (modelConfig.provider === 'openai' || modelConfig.provider === 'groq') {
        apiKey = import.meta.env.VITE_OPENAI_API_KEY
      }
    }

    const resolvedConfig = { ...modelConfig, apiKey }

    const executeToolCallWithOverrides = async (name: string, args: Record<string, any>) => {
      if (name === 'add_home_node') {
        const position = await getChildNodePosition(args.nodeType)
        const result = await executeToolCall(name, { ...args, position })

        if (result && typeof result === 'object' && (result as any).success && (result as any).nodeId) {
          const nodeId = (result as any).nodeId as string
          try {
            const { useHomeCanvasStore } = await import('@/features/home/useHomeCanvasStore')
            const store = useHomeCanvasStore.getState()
            const alreadyLinked = store.edges.some((e) => e.source === id && e.target === nodeId)
            if (!alreadyLinked) {
              await executeToolCall('add_home_edge', { sourceId: id, targetId: nodeId, label: null })
            }
          } catch {
            // ignore
          }

          return {
            ...result,
            placedNextTo: id,
          }
        }

        return result
      }

      return await executeToolCall(name, args)
    }

    try {
      const adapter = getAdapter(modelConfig.provider)
      abortRef.current = new AbortController()

      let fullResponse = ''

      let collectedToolCalls: ProviderToolCall[] = []

      const response = await adapter.chatStream(
        { messages: baseMessages, tools, stream: true },
        resolvedConfig,
        (chunk: StreamChunk) => {
          if (chunk.content) {
            fullResponse += chunk.content
            setChatContent((prev) => {
              if (!prev) return prev
              const messages = [...(prev.messages ?? [])]
              const lastIdx = messages.length - 1
              if (messages[lastIdx]?.role === 'assistant') {
                messages[lastIdx] = { ...messages[lastIdx], content: fullResponse }
              }
              return { ...prev, messages }
            })
          }
          if (chunk.toolCalls) collectedToolCalls = chunk.toolCalls
        },
        abortRef.current.signal,
      )

      const responseToolCalls =
        response.toolCalls && response.toolCalls.length > 0 ? response.toolCalls : collectedToolCalls

      if (responseToolCalls.length > 0) {
        const toolMessages: ProviderChatMessage[] = []

        for (const tc of responseToolCalls) {
          const parsed = parseToolArguments(tc.function.arguments)
          const args = parsed.ok ? parsed.args : {}
          const result = await executeToolCallWithOverrides(tc.function.name, args)
          toolMessages.push({
            role: 'tool',
            tool_call_id: tc.id,
            content: JSON.stringify(
              parsed.ok ? result : { error: `Failed to parse tool arguments: ${parsed.error}`, result },
            ),
          })
        }

        let currentMessages: ProviderChatMessage[] = [
          ...baseMessages,
          { role: 'assistant', content: null, tool_calls: responseToolCalls },
          ...toolMessages,
        ]

        let rounds = 0
        const maxRounds = 5
        while (rounds < maxRounds) {
          rounds++
          collectedToolCalls = []
          const followUp = await adapter.chatStream(
            { messages: currentMessages, tools, stream: true },
            resolvedConfig,
            (chunk: StreamChunk) => {
              if (chunk.content) {
                fullResponse += chunk.content
                setChatContent((prev) => {
                  if (!prev) return prev
                  const messages = [...(prev.messages ?? [])]
                  const lastIdx = messages.length - 1
                  if (messages[lastIdx]?.role === 'assistant') {
                    messages[lastIdx] = { ...messages[lastIdx], content: fullResponse }
                  }
                  return { ...prev, messages }
                })
              }
              if (chunk.toolCalls) collectedToolCalls = chunk.toolCalls
            },
            abortRef.current?.signal,
          )

          const nextToolCalls =
            followUp.toolCalls && followUp.toolCalls.length > 0 ? followUp.toolCalls : collectedToolCalls
          if (!nextToolCalls.length) break

          const newToolMessages: ProviderChatMessage[] = []
          for (const tc of nextToolCalls) {
            const parsed = parseToolArguments(tc.function.arguments)
            const args = parsed.ok ? parsed.args : {}
            const result = await executeToolCallWithOverrides(tc.function.name, args)
            newToolMessages.push({
              role: 'tool',
              tool_call_id: tc.id,
              content: JSON.stringify(
                parsed.ok ? result : { error: `Failed to parse tool arguments: ${parsed.error}`, result },
              ),
            })
          }

          currentMessages = [
            ...currentMessages,
            { role: 'assistant', content: null, tool_calls: nextToolCalls },
            ...newToolMessages,
          ]
        }
      }

      // Save final content
      const finalContent: AgentChatContent = {
        ...updatedContent,
        messages: updatedContent.messages.map((m, i) =>
          i === updatedContent.messages.length - 1 ? { ...m, content: fullResponse } : m,
        ),
      }
      setChatContent(finalContent)
      await saveContent(finalContent)
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error('[AgentNode] Stream error:', err)
        // Update with error message
        setChatContent((prev) => {
          if (!prev) return prev
          const messages = [...(prev.messages ?? [])]
          const lastIdx = messages.length - 1
          if (messages[lastIdx]?.role === 'assistant') {
            messages[lastIdx] = {
              ...messages[lastIdx],
              content: `Error: ${(err as Error).message || 'Failed to get response'}`,
            }
          }
          return { ...prev, messages }
        })
      }
    } finally {
      setIsStreaming(false)
      abortRef.current = null
    }
  }, [
    attachments.length,
    chatContent,
    clearAttachments,
    getAttachmentsData,
    getChildNodePosition,
    id,
    input,
    isStreaming,
    modelConfig,
    saveContent,
  ])

  // Clear chat
  const handleClear = React.useCallback(async () => {
    const clearedContent: AgentChatContent = {
      ...DEFAULT_AGENT_CHAT_CONTENT,
      title: chatContent?.title || 'Chat',
      createdAt: chatContent?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    setChatContent(clearedContent)
    await saveContent(clearedContent)
  }, [chatContent?.title, chatContent?.createdAt, saveContent])

  // Handle key down
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const messages = chatContent?.messages || []
  const currentProvider = PROVIDERS[modelConfig.provider]
  const title = chatContent?.title || data?.label || 'Chat'

  // Maximized view
  if (isMaximized) {
    return (
      <div className="canvas-node canvas-node-maximized h-full w-full flex flex-col bg-card border border-border rounded-lg shadow-md">
        <MaximizedHeader
          icon={<Bot className="h-4 w-4 text-violet-500" />}
          label={title}
          extra={isStreaming ? <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" /> : undefined}
          onExit={() => window.dispatchEvent(new CustomEvent('canvas-node-maximize', { detail: { id } }))}
        />
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Messages */}
          <div className="flex-1 min-h-0">
            {messages.length === 0 ? (
              <EmptyState />
            ) : (
              <ScrollArea className="h-full" ref={scrollRef}>
                <div className="max-w-2xl mx-auto px-4 py-2">
                  {messages.map((message, idx) => (
                    <MessageBubble
                      key={message.id}
                      message={message}
                      isStreaming={isStreaming && idx === messages.length - 1 && message.role === 'assistant'}
                    />
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Input */}
          <div className="p-4 border-t bg-background/50">
            <div className="max-w-2xl mx-auto">
              <div className="relative">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask anything..."
                  className="min-h-[60px] pr-12 resize-none"
                  disabled={isStreaming}
                />
                <Button
                  size="icon"
                  className="absolute bottom-2 right-2 h-7 w-7"
                  onClick={handleSend}
                  disabled={isStreaming || (!input.trim() && attachments.length === 0)}>
                  {isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
              <div className="flex items-center justify-between mt-2">
                <Select
                  value={`${modelConfig.provider}:${modelConfig.model}`}
                  onValueChange={(value) => {
                    const [provider, model] = value.split(':')
                    setModelConfig({ provider: provider as any, model })
                  }}>
                  <SelectTrigger className="h-6 w-auto border-0 bg-transparent text-xs text-muted-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PROVIDERS).map(([providerId, provider]) => (
                      <React.Fragment key={providerId}>
                        {provider.models.map((model) => (
                          <SelectItem key={`${providerId}:${model.id}`} value={`${providerId}:${model.id}`}>
                            {model.name}
                          </SelectItem>
                        ))}
                      </React.Fragment>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={handleClear} disabled={isStreaming}>
                  <Trash2 className="h-3 w-3 mr-1" />
                  Clear
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Normal view
  return (
    <CanvasNodeWrapper
      id={id}
      selected={selected}
      isEditing={isEditing}
      onEditingChange={setIsEditing}
      isMaximized={isMaximized}
      groupColor={groupColor}
      icon={<Bot className="h-3.5 w-3.5 text-violet-500" />}
      label={title}
      toolbarLeftExtra={
        isLoading || isStreaming ? <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" /> : undefined
      }
      minWidth={280}
      minHeight={300}>
      <div className="flex flex-col h-full">
        {/* Messages */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <ScrollArea className="h-full" ref={scrollRef}>
            <div className="px-2 py-1">
              {messages.length === 0 ? (
                <EmptyState />
              ) : (
                messages.map((message, idx) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    isStreaming={isStreaming && idx === messages.length - 1 && message.role === 'assistant'}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Input */}
        <div className="p-2 border-t bg-background/30">
          <div className="relative">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything..."
              className="min-h-[50px] pr-10 resize-none nodrag nowheel"
              disabled={isStreaming}
            />
            <Button
              type="button"
              onClick={handleSend}
              className="absolute bottom-1.5 right-1.5 h-6 w-6 nodrag nowheel"
              disabled={isStreaming || (!input.trim() && attachments.length === 0)}>
              {isStreaming ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
            </Button>
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <Select
              value={`${modelConfig.provider}:${modelConfig.model}`}
              onValueChange={(value) => {
                const [provider, model] = value.split(':')
                setModelConfig({ provider: provider as any, model })
              }}>
              <SelectTrigger className="h-5 w-auto border-0 bg-transparent text-[10px] text-muted-foreground px-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PROVIDERS).map(([providerId, provider]) => (
                  <React.Fragment key={providerId}>
                    {provider.models.map((model) => (
                      <SelectItem key={`${providerId}:${model.id}`} value={`${providerId}:${model.id}`}>
                        {model.name}
                      </SelectItem>
                    ))}
                  </React.Fragment>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="sm"
              className="h-5 text-[10px] px-1.5"
              onClick={handleClear}
              disabled={isStreaming || messages.length === 0}>
              <Trash2 className="h-2.5 w-2.5 mr-0.5" />
              Clear
            </Button>
          </div>
        </div>
      </div>
    </CanvasNodeWrapper>
  )
}
