/**
 * AgentSidebar - AI Assistant Panel
 *
 * Persistent sidebar for AI-powered chat with TQL function tools.
 * Uses OpenAI GPT-5.2 Responses API.
 */

import * as React from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { X, Plus, MessageSquare, ChevronDown, Loader2, Trash2, BarChart3, Maximize2, Minimize2, Radio } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useUIStore } from '@/stores/useUIStore'
import { useVault } from '@/contexts/VaultContext'
import { useChatStore, useMessages, useModelProvider, useFileContext, useAttachments } from '../hooks'
import { join } from '@tauri-apps/api/path'
import { invoke } from '@tauri-apps/api/core'
import { NAMESPACE_FILES } from '@/lib/namespaces'
import { type MentionOption } from './MentionAutocomplete'
import { SettingsDialog } from '@/components/app/SettingsDialog'
import { TextBasedAgentChat } from './TextBasedAgentChat'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'

// Extracted components
import { MessageBubble } from './MessageBubble'
import { ChatInput } from './ChatInput'
import { ChatEmptyState } from './ChatEmptyState'
import { LiveMode } from './LiveMode'

export function AgentSidebar() {
  const [useTextBasedAgent, setUseTextBasedAgent] = React.useState(false)
  const [showLiveMode, setShowLiveMode] = React.useState(false)
  const { setAgentOpen, agentFullscreen, toggleAgentFullscreen } = useUIStore()
  const { vaultPath } = useVault()
  const {
    conversations,
    activeConversationId,
    isStreaming,
    createConversation,
    switchConversation,
    deleteConversation,
  } = useChatStore()
  const messages = useMessages()
  const { sendMessage } = useModelProvider()
  const { refreshContext } = useFileContext()
  const { attachments, setAttachments, addAttachment, clearAttachments, getAttachmentsData } = useAttachments()

  const activeConversation = conversations.find((c) => c.id === activeConversationId)

  const [input, setInput] = React.useState('')
  const scrollRef = React.useRef<HTMLDivElement>(null)

  // Mention autocomplete state
  const [mentionOptions, setMentionOptions] = React.useState<MentionOption[]>([])
  const [loadingMentions, setLoadingMentions] = React.useState(false)

  // Load entities from vault for mention autocomplete
  React.useEffect(() => {
    async function loadEntities() {
      if (!vaultPath) return
      setLoadingMentions(true)

      const options: MentionOption[] = []
      const namespacesToLoad = ['person', 'org', 'proj', 'task', 'acc', 'note']

      for (const ns of namespacesToLoad) {
        const filePath = NAMESPACE_FILES[ns]
        if (!filePath || filePath === '@notes') continue

        try {
          const fullPath = await join(vaultPath, filePath)
          const result = await invoke<{ content: string }>('read_text_file', { filePath: fullPath })
          const data = JSON.parse(result.content)

          if (data?.items && Array.isArray(data.items)) {
            for (const item of data.items.slice(0, 50)) {
              const id = item.id || item['@id']
              const label = item.name || item.title || item.description || id
              if (id && label) {
                options.push({
                  id,
                  label,
                  namespace: ns,
                  description: item.role || item.status || item.type || undefined,
                })
              }
            }
          }
        } catch (err) {
          console.debug(`[Agent] Could not load ${ns}:`, err)
        }
      }

      setMentionOptions(options)
      setLoadingMentions(false)
    }

    loadEntities()
  }, [vaultPath])

  const handleMentionSelect = React.useCallback((mention: MentionOption) => {
    console.debug('[Agent] Mention selected:', mention.id)
  }, [])

  // Auto-scroll to bottom when messages change
  const lastMessage = messages[messages.length - 1]
  React.useEffect(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight
      }
    }
  }, [messages, lastMessage?.content, isStreaming])

  const handleSend = React.useCallback(async () => {
    if ((!input.trim() && attachments.length === 0) || isStreaming) return
    const message = input.trim()
    setInput('')

    const attachmentsData = getAttachmentsData()
    clearAttachments()

    await refreshContext()
    await sendMessage(message, attachmentsData)
  }, [input, attachments, isStreaming, sendMessage, refreshContext, getAttachmentsData, clearAttachments])

  const handleExampleClick = React.useCallback((query: string) => {
    setInput(query)
  }, [])

  // Listen for quick-reply selections to send as user messages
  React.useEffect(() => {
    const handleQuickReply = async (e: Event) => {
      const { value } = (e as CustomEvent).detail
      if (value && !isStreaming) {
        await refreshContext()
        await sendMessage(value)
      }
    }
    window.addEventListener('agent-quick-reply', handleQuickReply)
    return () => window.removeEventListener('agent-quick-reply', handleQuickReply)
  }, [isStreaming, sendMessage, refreshContext])

  // Text-based agent mode
  if (useTextBasedAgent) {
    return (
      <div className="h-full w-full min-w-0 flex flex-col bg-background/50 backdrop-blur-sm overflow-hidden">
        <div className="flex-none flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Switch id="text-based-agent" checked={useTextBasedAgent} onCheckedChange={setUseTextBasedAgent} />
              <Label htmlFor="text-based-agent" className="text-xs cursor-pointer">
                Text-based Agent
              </Label>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setAgentOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <TextBasedAgentChat />
      </div>
    )
  }

  return (
    <div className="h-full w-full min-w-0 flex flex-col bg-background/50 backdrop-blur-sm overflow-hidden">
      {/* Header */}
      <div className="flex-none flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 px-2 gap-1 font-medium text-xs">
                <span className="max-w-[120px] text-[12px] opacity-70 truncate">
                  {activeConversation?.title || 'New Chat'}
                </span>
                <ChevronDown className="h-3 w-3 opacity-50 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuItem onClick={() => createConversation()}>
                <Plus className="h-4 w-4 mr-2" />
                New conversation
              </DropdownMenuItem>
              {conversations.length > 0 && <DropdownMenuSeparator />}
              {conversations.slice(0, 10).map((conv) => (
                <DropdownMenuItem
                  key={conv.id}
                  onClick={() => switchConversation(conv.id)}
                  className={cn(conv.id === activeConversationId && 'bg-accent')}>
                  <MessageSquare className="h-4 w-4 mr-2 opacity-50" />
                  <span className="truncate flex-1">{conv.title}</span>
                  {conv.id === activeConversationId && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 ml-2 opacity-50 hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteConversation(conv.id)
                      }}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant={showLiveMode ? 'default' : 'ghost'}
            size="icon"
            className={cn('h-7 w-7', showLiveMode && 'bg-violet-600 hover:bg-violet-700 text-white')}
            onClick={() => setShowLiveMode(!showLiveMode)}
            title={showLiveMode ? 'Exit Live Mode' : 'Live Mode (⌘⇧L)'}>
            <Radio className="h-4 w-4" />
          </Button>
          <SettingsDialog
            trigger={
              <Button variant="ghost" size="icon" className="h-7 w-7" title="Agent metrics & settings">
                <BarChart3 className="h-4 w-4" />
              </Button>
            }
            defaultSection="agent"
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => createConversation()}
            title="New conversation">
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={toggleAgentFullscreen}
            title={agentFullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
            {agentFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setAgentOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Live Mode or Messages */}
      {showLiveMode ? (
        <div className="flex-1 min-h-0 min-w-0 overflow-hidden">
          <LiveMode onClose={() => setShowLiveMode(false)} />
        </div>
      ) : (
      <div className="flex-1 min-h-0 min-w-0 overflow-hidden">
        <ScrollArea className="h-full w-full" ref={scrollRef}>
          <div className="px-6 min-w-0">
            <AnimatePresence mode="wait">
              {messages.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}>
                  <ChatEmptyState onExampleClick={handleExampleClick} />
                </motion.div>
              ) : (
                <motion.div
                  key="messages"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="py-4 space-y-4 min-w-0">
                  {messages.map((message, index) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className="min-w-0">
                      <MessageBubble
                        message={message}
                        showActions={!isStreaming && index === messages.length - 1 ? true : !isStreaming}
                      />
                    </motion.div>
                  ))}
                  <AnimatePresence>
                    {isStreaming && (
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-2 text-muted-foreground text-xs">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Thinking...</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </ScrollArea>
      </div>

      )}

      {/* Input (hidden during Live Mode) */}
      {!showLiveMode && (
      <ChatInput
        input={input}
        setInput={setInput}
        attachments={attachments}
        setAttachments={setAttachments}
        onSend={handleSend}
        isStreaming={isStreaming}
        mentionOptions={mentionOptions}
        loadingMentions={loadingMentions}
        onMentionSelect={handleMentionSelect}
        onFileAttach={addAttachment}
      />
      )}
    </div>
  )
}
