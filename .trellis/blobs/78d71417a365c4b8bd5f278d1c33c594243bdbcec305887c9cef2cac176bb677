/**
 * Agent App
 *
 * Full-featured AI chat application with Slack/Discord-style UX:
 * - Channels for organizing conversations
 * - Threads for branching discussions
 * - Semantic image caching for token optimization
 * - Vault integration for entity references
 */

import * as React from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { invoke } from '@tauri-apps/api/core'
import { MessageContent } from './MessageContent'
import { ArtifactPanel } from './ArtifactPanel'
import type { TrellisResponse } from '../trellis/types'
import {
  Send,
  Paperclip,
  Hash,
  Bot,
  Sparkles,
  Settings,
  PanelLeftClose,
  PanelLeft,
  MessageSquare,
  ImageIcon,
  FileText,
  X,
  Loader2,
  MoreHorizontal,
  Reply,
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ChannelSidebar } from './ChannelSidebar'
import { ThreadPanel } from './ThreadPanel'
import { ThinkingAccordion } from './ThinkingAccordion'
import { QuickReplyButtons } from './QuickReplyButtons'
import { type QuickReplyCardData } from '../stores/useAgentAppStore'
import {
  useAgentAppStore,
  useActiveChannel,
  useActiveMessages,
  type Message,
  type MessageAttachment,
} from '../stores/useAgentAppStore'
import { PROVIDERS, getModel } from '@/lib/providers'
import { SettingsDialog } from '@/components/app/SettingsDialog'
import { useAgentAppModelProvider } from '../hooks/useAgentAppModelProvider'

// ─────────────────────────────────────────────────────────────────────────────
// Message Bubble
// ─────────────────────────────────────────────────────────────────────────────

interface MessageBubbleProps {
  message: Message
  onReplyInThread: () => void
  onShowArtifact?: (artifact: TrellisResponse, title?: string) => void
}

function MessageBubble({ message, onReplyInThread, onShowArtifact }: MessageBubbleProps) {
  const [copied, setCopied] = React.useState(false)
  const isUser = message.role === 'user'
  const isStreaming = message.isStreaming

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('group flex gap-3 py-4', isUser ? 'flex-row-reverse' : 'flex-row')}>
      {/* Avatar */}
      <div
        className={cn(
          'shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
          isUser ? 'bg-primary text-primary-foreground' : 'bg-gradient-to-br from-violet-500 to-purple-600 text-white',
        )}>
        {isUser ? 'U' : <Sparkles className="h-4 w-4" />}
      </div>

      {/* Content */}
      <div className={cn('flex flex-col flex-1 min-w-0 space-y-2', isUser ? 'items-end justify-end' : 'items-start')}>
        {!isUser && message.reasoning && message.reasoning.steps.length > 0 && (
          <ThinkingAccordion reasoning={message.reasoning} className={cn(isUser ? 'text-right' : 'text-left')} />
        )}

        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <div className={cn('flex flex-wrap gap-2', isUser ? 'justify-end' : 'justify-start')}>
            {message.attachments.map((att) => (
              <AttachmentPreview key={att.id} attachment={att} />
            ))}
          </div>
        )}

        {/* Message Content */}
        <div
          className={cn(
            'inline-block max-w-[85%] px-4 py-2.5 rounded-2xl',
            isUser ? 'bg-primary text-primary-foreground rounded-tr-md' : 'bg-muted rounded-bl-md',
            isStreaming && 'animate-pulse',
          )}>
          {isUser ? (
            <p className="whitespace-pre-wrap wrap-break-word text-sm leading-relaxed">
              {message.content || (isStreaming ? '...' : '')}
            </p>
          ) : (
            <>
              <MessageContent content={message.content} isStreaming={isStreaming} onShowArtifact={onShowArtifact} />
              {message.card?.type === 'quick-reply' && (() => {
                const cardRaw = message.card as any
                const qrData = cardRaw.data ? cardRaw.data : cardRaw
                const options = qrData.options || []
                const selectedValue = qrData.selectedValue
                return (
                  <QuickReplyButtons
                    options={options}
                    selectedValue={selectedValue}
                    onSelect={(value) => {
                      const store = useAgentAppStore.getState()
                      store.updateMessage(message.channelId, message.id, {
                        card: {
                          type: 'quick-reply',
                          data: { ...qrData, selectedValue: value },
                        },
                      })
                      window.dispatchEvent(
                        new CustomEvent('agent-quick-reply', { detail: { value } }),
                      )
                    }}
                  />
                )
              })()}
            </>
          )}
        </div>

        {/* Timestamp & Actions */}
        <div
          className={cn(
            'flex items-center gap-2 text-xs text-muted-foreground',
            isUser ? 'flex-row-reverse' : 'flex-row',
          )}>
          <span>{new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>

          {/* Thread indicator */}
          {message.replyCount !== undefined && message.replyCount > 0 && (
            <button onClick={onReplyInThread} className="flex items-center gap-1 text-primary hover:underline">
              <MessageSquare className="h-3 w-3" />
              {message.replyCount} {message.replyCount === 1 ? 'reply' : 'replies'}
            </button>
          )}

          {/* Actions */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCopy} title="Copy">
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onReplyInThread} title="Reply in thread">
              <Reply className="h-3 w-3" />
            </Button>
            {!isUser && (
              <>
                <Button variant="ghost" size="icon" className="h-6 w-6" title="Good response">
                  <ThumbsUp className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6" title="Bad response">
                  <ThumbsDown className="h-3 w-3" />
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Attachment Preview
// ─────────────────────────────────────────────────────────────────────────────

interface AttachmentPreviewProps {
  attachment: MessageAttachment
}

function AttachmentPreview({ attachment }: AttachmentPreviewProps) {
  const isImage = attachment.type.startsWith('image/')

  if (isImage && attachment.previewUrl) {
    return (
      <div className="relative group">
        <img
          src={attachment.previewUrl}
          alt={attachment.name}
          className="max-w-[200px] max-h-[150px] rounded-lg object-cover"
        />
        {attachment.semanticDescription && (
          <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1.5 rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="line-clamp-2">{attachment.semanticDescription}</span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg">
      <FileText className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm truncate max-w-[150px]">{attachment.name}</span>
      <span className="text-xs text-muted-foreground">{(attachment.size / 1024).toFixed(1)} KB</span>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Empty State
// ─────────────────────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500/20 to-purple-600/20 flex items-center justify-center mb-4">
        <Bot className="h-8 w-8 text-violet-500" />
      </div>
      <h2 className="text-xl font-semibold mb-2">Start a Conversation</h2>
      <p className="text-muted-foreground text-sm max-w-md">
        Ask me anything about your vault, files, or projects. I can help you navigate, analyze, and manage your data.
      </p>
      <div className="flex flex-wrap gap-2 mt-6 justify-center">
        {['Summarize recent changes', 'Find related files', 'Create a new task'].map((suggestion) => (
          <Button key={suggestion} variant="outline" size="sm" className="text-xs">
            {suggestion}
          </Button>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Chat Input
// ─────────────────────────────────────────────────────────────────────────────

interface ChatInputProps {
  onSend: (content: string, attachments?: File[]) => void
  disabled?: boolean
}

interface BinaryFileContent {
  data: string
  truncated: boolean
  size: number
}

const base64ToArrayBuffer = (base64: string) => {
  const binaryString = atob(base64)
  const len = binaryString.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes.buffer
}

const inferMimeTypeFromPath = (filePath: string): string => {
  const ext = filePath.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'png':
      return 'image/png'
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg'
    case 'webp':
      return 'image/webp'
    case 'gif':
      return 'image/gif'
    case 'pdf':
      return 'application/pdf'
    case 'txt':
      return 'text/plain'
    case 'md':
      return 'text/markdown'
    case 'json':
      return 'application/json'
    case 'csv':
      return 'text/csv'
    default:
      return 'application/octet-stream'
  }
}

function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [input, setInput] = React.useState('')
  const [attachments, setAttachments] = React.useState<Array<{ file: File; previewUrl: string | null }>>([])
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  const { modelConfig, setModelConfig } = useAgentAppStore()
  const currentProvider = PROVIDERS[modelConfig.provider]
  const currentModel = getModel(modelConfig.provider, modelConfig.model)

  const handleSend = () => {
    console.debug('[ChatInput] handleSend called', { input: input.trim(), attachments: attachments.length, disabled })
    if ((!input.trim() && attachments.length === 0) || disabled) return
    onSend(
      input.trim(),
      attachments.map((a) => a.file),
    )
    setInput('')
    setAttachments([])
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleFileAttach = React.useCallback((file: File) => {
    const isImage = file.type.startsWith('image/')
    const previewUrl = isImage ? URL.createObjectURL(file) : null
    setAttachments((prev) => [...prev, { file, previewUrl }])
  }, [])

  const attachFilePaths = React.useCallback(
    async (paths: string[]) => {
      for (const raw of paths) {
        const filePath = raw.trim()
        if (!filePath || !filePath.startsWith('/')) continue

        const name = filePath.split('/').pop() || 'attachment'
        const mimeType = inferMimeTypeFromPath(filePath)

        try {
          const response = await invoke<BinaryFileContent>('read_file_base64', {
            filePath,
            maxBytes: 12 * 1024 * 1024,
          })

          if (response.truncated) {
            continue
          }

          const arrayBuffer = base64ToArrayBuffer(response.data)
          const file = new File([arrayBuffer], name, { type: mimeType })
          handleFileAttach(file)
        } catch {
          // Ignore: best-effort path-based attachment
        }
      }
    },
    [handleFileAttach],
  )

  const handlePaste = React.useCallback(
    (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const items = e.clipboardData?.items
      if (!items) return

      const filesToAttach: File[] = []
      for (const item of items) {
        if (item.kind === 'file') {
          const file = item.getAsFile()
          if (file) filesToAttach.push(file)
        }
      }

      if (filesToAttach.length > 0) {
        e.preventDefault()
        filesToAttach.forEach((file) => handleFileAttach(file))
        return
      }

      // macOS apps (e.g. CleanShot) sometimes paste a file path as text
      const text = e.clipboardData.getData('text/plain')
      const lines = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean)

      const pathLike = lines.filter((l) => l.startsWith('/') && l.includes('.') && !l.includes('\t'))
      if (pathLike.length > 0) {
        e.preventDefault()
        void attachFilePaths(pathLike)
      }
    },
    [attachFilePaths, handleFileAttach],
  )

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    Array.from(files).forEach((file) => handleFileAttach(file))

    e.target.value = ''
  }

  const removeAttachment = (index: number) => {
    setAttachments((prev) => {
      const removed = prev[index]
      if (removed.previewUrl) URL.revokeObjectURL(removed.previewUrl)
      return prev.filter((_, i) => i !== index)
    })
  }

  return (
    <div className="px-4 pb-8 pt-0 bg-transparent">
      {/* Attachment Previews */}
      <AnimatePresence>
        {attachments.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mb-3 overflow-hidden">
            <div className="flex flex-wrap gap-2">
              {attachments.map((att, idx) => (
                <div key={idx} className="relative group">
                  {att.previewUrl ? (
                    <img src={att.previewUrl} alt={att.file.name} className="h-16 w-16 object-cover rounded-lg" />
                  ) : (
                    <div className="h-16 w-16 flex items-center justify-center bg-muted rounded-lg">
                      <FileText className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute -top-1 -right-1 h-5 w-5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeAttachment(idx)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Area */}
      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder="Ask anything... (type @ to mention)"
          className="min-h-[80px] pr-24 resize-none"
          disabled={disabled}
        />

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileSelect}
          accept="image/*,.pdf,.txt,.md,.json,.csv"
          multiple
        />

        {/* Action Buttons */}
        <div className="absolute bottom-2 right-2 flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}>
            <Paperclip className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            className="h-7 w-7"
            onClick={handleSend}
            disabled={disabled || (!input.trim() && attachments.length === 0)}>
            <Send className="h-4 w-4" />
          </Button>
        </div>

        {/* Model Selector */}
        <div className="absolute bottom-2 left-2">
          <Select
            value={`${modelConfig.provider}:${modelConfig.model}`}
            onValueChange={(value) => {
              const [provider, model] = value.split(':')
              setModelConfig({ provider: provider as any, model })
            }}>
            <SelectTrigger className="h-6 w-auto border-0 bg-transparent text-xs text-muted-foreground hover:text-foreground gap-1 px-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PROVIDERS).map(([providerId, provider]) => (
                <React.Fragment key={providerId}>
                  {provider.models.map((model) => (
                    <SelectItem key={`${providerId}:${model.id}`} value={`${providerId}:${model.id}`}>
                      <span className="flex items-center gap-2">
                        <span>{model.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </React.Fragment>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Agent App
// ─────────────────────────────────────────────────────────────────────────────

export function AgentApp() {
  const activeChannel = useActiveChannel()
  const messages = useActiveMessages()
  const { sidebarCollapsed, toggleSidebar, threadPanelOpen, isStreaming, createThread, openThread, threads } =
    useAgentAppStore()

  const { sendChannelMessage } = useAgentAppModelProvider()

  const scrollRef = React.useRef<HTMLDivElement>(null)

  // Listen for quick-reply selections to send as user messages
  React.useEffect(() => {
    const handleQuickReply = async (e: Event) => {
      const { value } = (e as CustomEvent).detail
      if (value && !isStreaming && activeChannel) {
        await sendChannelMessage(activeChannel.id, value)
      }
    }
    window.addEventListener('agent-quick-reply', handleQuickReply)
    return () => window.removeEventListener('agent-quick-reply', handleQuickReply)
  }, [isStreaming, activeChannel, sendChannelMessage])

  // Artifact panel state
  const [artifact, setArtifact] = React.useState<TrellisResponse | null>(null)
  const [artifactTitle, setArtifactTitle] = React.useState<string | undefined>()
  const [artifactOpen, setArtifactOpen] = React.useState(false)

  const showArtifact = React.useCallback((newArtifact: TrellisResponse, title?: string) => {
    setArtifact(newArtifact)
    setArtifactTitle(title)
    setArtifactOpen(true)
  }, [])

  // Auto-scroll to bottom
  React.useEffect(() => {
    if (scrollRef.current) {
      const scrollArea = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (scrollArea) {
        scrollArea.scrollTop = scrollArea.scrollHeight
      }
    }
  }, [messages.length])

  const optimizeImage = React.useCallback(
    async (file: File): Promise<{ base64: string; previewUrl: string; optimizedMimeType: string }> => {
      const MAX_DIMENSION = 1024
      const PREVIEW_DIMENSION = 256
      const JPEG_QUALITY = 0.85

      return new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => {
          const scale = Math.min(MAX_DIMENSION / img.width, MAX_DIMENSION / img.height, 1)
          const width = Math.round(img.width * scale)
          const height = Math.round(img.height * scale)

          const canvas = document.createElement('canvas')
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          if (!ctx) {
            reject(new Error('Could not get canvas context'))
            return
          }
          ctx.drawImage(img, 0, 0, width, height)

          const optimizedMimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
          const dataUrl = canvas.toDataURL(optimizedMimeType, JPEG_QUALITY)
          const base64 = dataUrl.split(',')[1]

          const previewScale = Math.min(PREVIEW_DIMENSION / img.width, PREVIEW_DIMENSION / img.height, 1)
          const previewCanvas = document.createElement('canvas')
          previewCanvas.width = Math.round(img.width * previewScale)
          previewCanvas.height = Math.round(img.height * previewScale)
          const previewCtx = previewCanvas.getContext('2d')
          if (!previewCtx) {
            reject(new Error('Could not get preview canvas context'))
            return
          }
          previewCtx.drawImage(img, 0, 0, previewCanvas.width, previewCanvas.height)
          const previewUrl = previewCanvas.toDataURL('image/jpeg', 0.7)

          resolve({ base64, previewUrl, optimizedMimeType })
        }
        img.onerror = reject
        img.src = URL.createObjectURL(file)
      })
    },
    [],
  )

  const computeHash = React.useCallback(async (input: string): Promise<string> => {
    const encoder = new TextEncoder()
    const data = encoder.encode(input)
    const digest = await crypto.subtle.digest('SHA-256', data)
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  }, [])

  const processFile = React.useCallback(
    async (file: File): Promise<Pick<MessageAttachment, 'data' | 'previewUrl' | 'hash'> & { type: string }> => {
      const isImage = file.type.startsWith('image/')

      if (isImage) {
        const { base64, previewUrl, optimizedMimeType } = await optimizeImage(file)
        const hash = await computeHash(`${optimizedMimeType}:${base64}`)
        return { data: base64, previewUrl, type: optimizedMimeType, hash }
      }

      const { base64 } = await new Promise<{ base64: string }>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          const b64 = (reader.result as string).split(',')[1]
          resolve({ base64: b64 })
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      return { data: base64, previewUrl: undefined, type: file.type || 'application/octet-stream' }
    },
    [computeHash, optimizeImage],
  )

  const handleSend = async (content: string, files?: File[]) => {
    console.debug('[AgentApp] handleSend called', { content, files: files?.length, activeChannel: activeChannel?.id })
    if (!activeChannel) {
      console.warn('[AgentApp] No active channel — aborting send')
      return
    }

    const attachments: MessageAttachment[] = files?.length
      ? await Promise.all(
          files.map(async (file) => {
            const processed = await processFile(file)
            return {
              id: `attach_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
              name: file.name,
              type: processed.type,
              size: file.size,
              hash: processed.hash,
              data: processed.data,
              previewUrl: processed.previewUrl,
            }
          }),
        )
      : []

    await sendChannelMessage(activeChannel.id, content, attachments.length ? attachments : undefined)
  }

  const handleReplyInThread = (message: Message) => {
    // Check if thread already exists for this message
    const existingThread = threads.find((t) => t.parentMessageId === message.id)
    if (existingThread) {
      openThread(existingThread.id)
    } else {
      // Create new thread
      const threadId = createThread(message.channelId, message.id)
      openThread(threadId)
    }
  }

  return (
    <div className="h-full flex bg-background">
      {/* Channel Sidebar */}
      <AnimatePresence>
        {!sidebarCollapsed && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 240, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="h-full border-r">
            <ChannelSidebar />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="h-14 border-b flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleSidebar}>
              {sidebarCollapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </Button>
            {activeChannel && (
              <div className="flex items-center gap-2">
                <Hash className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{activeChannel.name}</span>
                {activeChannel.description && (
                  <span className="text-sm text-muted-foreground">— {activeChannel.description}</span>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <SettingsDialog
              trigger={
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Settings className="h-4 w-4" />
                </Button>
              }
              defaultSection="agent"
            />
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 min-h-0">
          {messages.length === 0 ? (
            <EmptyState />
          ) : (
            <ScrollArea className="h-full" ref={scrollRef}>
              <div className="max-w-3xl mx-auto px-4">
                {messages.map((message) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    onReplyInThread={() => handleReplyInThread(message)}
                    onShowArtifact={showArtifact}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Input */}
        <div className="max-w-3xl mx-auto w-full">
          <ChatInput onSend={handleSend} disabled={isStreaming} />
        </div>
      </div>

      {/* Thread Panel */}
      <AnimatePresence>{threadPanelOpen && <ThreadPanel />}</AnimatePresence>

      {/* Artifact Panel */}
      <ArtifactPanel
        artifact={artifact}
        title={artifactTitle}
        isOpen={artifactOpen}
        onClose={() => setArtifactOpen(false)}
      />
    </div>
  )
}
