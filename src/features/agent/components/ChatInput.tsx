/**
 * ChatInput - Chat input area with model selector, attachments, and mentions
 */

import * as React from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { X, Send, Sparkles, FileText, ChevronDown, Cpu, Cloud, Paperclip } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useUIStore } from '@/stores/useUIStore'
import { useChatStore } from '../hooks'
import { MentionAutocomplete, type MentionOption } from './MentionAutocomplete'
import { ContextBadge } from './ContextBadge'
import { PROVIDER_LIST, getModel, getDefaultConfig, setDefaultConfig } from '@/lib/providers'

export interface Attachment {
  id: string
  file: File
  previewUrl: string | null
  base64: string
}

interface ChatInputProps {
  input: string
  setInput: (value: string) => void
  attachments: Attachment[]
  setAttachments: React.Dispatch<React.SetStateAction<Attachment[]>>
  onSend: () => void
  isStreaming: boolean
  mentionOptions: MentionOption[]
  loadingMentions: boolean
  onMentionSelect: (mention: MentionOption) => void
  onFileAttach: (file: File) => void
}

export function ChatInput({
  input,
  setInput,
  attachments,
  setAttachments,
  onSend,
  isStreaming,
  mentionOptions,
  loadingMentions,
  onMentionSelect,
  onFileAttach,
}: ChatInputProps) {
  const inputRef = React.useRef<HTMLTextAreaElement>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const { agentSendOnEnter } = useUIStore()
  const { modelConfig, setModelConfig } = useChatStore()

  const removeAttachment = React.useCallback(
    (id: string) => {
      setAttachments((prev) => prev.filter((a) => a.id !== id))
    },
    [setAttachments],
  )

  const handlePaste = React.useCallback(
    (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return

      const filesToAttach: File[] = []
      for (const item of items) {
        if (item.kind === 'file') {
          const file = item.getAsFile()
          if (file) {
            filesToAttach.push(file)
          }
        }
      }

      if (filesToAttach.length > 0) {
        e.preventDefault()
        filesToAttach.forEach((file) => onFileAttach(file))
      }
    },
    [onFileAttach],
  )

  const handleFileInputChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (files) {
        Array.from(files).forEach((file) => onFileAttach(file))
      }
      e.target.value = ''
    },
    [onFileAttach],
  )

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        if (agentSendOnEnter) {
          if (!e.shiftKey) {
            e.preventDefault()
            onSend()
          }
        } else {
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault()
            onSend()
          }
        }
      }
    },
    [onSend, agentSendOnEnter],
  )

  return (
    <div className="flex-none p-3 pt-0 bg-transparent">
      <div className="mb-2">
        <ContextBadge />
      </div>

      <AnimatePresence>
        {attachments.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-2 overflow-hidden">
            <div className="flex flex-wrap gap-2 p-2 bg-muted/50 rounded-lg border">
              {attachments.map((att) => (
                <div key={att.id} className="relative group">
                  {att.previewUrl ? (
                    <img
                      src={att.previewUrl}
                      alt={att.file.name}
                      className="h-14 w-14 object-cover rounded"
                      title={`${att.file.name} (${(att.file.size / 1024).toFixed(1)} KB)`}
                    />
                  ) : (
                    <div
                      className="h-14 w-14 flex flex-col items-center justify-center bg-muted rounded p-1"
                      title={`${att.file.name} (${(att.file.size / 1024).toFixed(1)} KB)`}>
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <span className="text-[8px] text-muted-foreground truncate w-full text-center mt-0.5">
                        {att.file.name.split('.').pop()}
                      </span>
                    </div>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute -top-1 -right-1 h-4 w-4 bg-destructive/90 hover:bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeAttachment(att.id)}>
                    <X className="h-2.5 w-2.5" />
                  </Button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative">
        <MentionAutocomplete
          value={input}
          onChange={setInput}
          onSelect={onMentionSelect}
          options={mentionOptions}
          loading={loadingMentions}
          textareaRef={inputRef}
        />
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileInputChange}
          accept="image/*,.pdf,.txt,.md,.json,.csv"
          multiple
        />
        <Textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder="Ask anything... (type @ to mention)"
          className="min-h-[80px] pr-12 pb-8 resize-none"
          disabled={isStreaming}
        />

        {/* Model selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="absolute bottom-1.5 left-1.5 h-5 px-1.5 gap-1 text-[10px] text-muted-foreground/50 hover:text-muted-foreground">
              {modelConfig.provider === 'ollama' ? (
                <Cpu className="h-2.5 w-2.5 shrink-0" />
              ) : (
                <Cloud className="h-2.5 w-2.5 shrink-0" />
              )}
              <span className="truncate max-w-[80px]">
                {getModel(modelConfig.provider, modelConfig.model)?.name || modelConfig.model}
              </span>
              <ChevronDown className="h-2.5 w-2.5 opacity-50 shrink-0" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64 max-h-80 overflow-y-auto">
            {PROVIDER_LIST.filter((p) => p.id === 'ollama' || p.id === 'openai' || p.id === 'gemini').map(
              (provider) => (
                <React.Fragment key={provider.id}>
                  <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground flex items-center gap-2">
                    {provider.id === 'ollama' ? <Cpu className="h-3 w-3" /> : <Sparkles className="h-3 w-3" />}
                    {provider.name}
                    {!provider.requiresApiKey && (
                      <span className="text-[10px] bg-green-500/20 text-green-600 px-1 rounded">Free</span>
                    )}
                  </div>
                  {provider.models.slice(0, 4).map((model) => {
                    const isCurrentDefault =
                      getDefaultConfig().provider === provider.id && getDefaultConfig().model === model.id
                    const isSelected = modelConfig.provider === provider.id && modelConfig.model === model.id
                    return (
                      <DropdownMenuItem
                        key={`${provider.id}-${model.id}`}
                        onClick={() => setModelConfig({ provider: provider.id, model: model.id })}
                        className={cn('pl-6 group', isSelected && 'bg-accent')}>
                        <div className="flex flex-col flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="truncate">{model.name}</span>
                            {isCurrentDefault && (
                              <span className="text-[9px] bg-primary/20 text-primary px-1 rounded shrink-0">
                                Default
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-muted-foreground truncate">
                            {model.description}
                            {model.supportsTools && ' • Tools ✓'}
                          </span>
                        </div>
                        {isSelected && !isCurrentDefault && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 px-1.5 text-[10px] opacity-0 group-hover:opacity-100 shrink-0"
                            onClick={(e) => {
                              e.stopPropagation()
                              setDefaultConfig({ provider: provider.id, model: model.id })
                            }}>
                            Set Default
                          </Button>
                        )}
                      </DropdownMenuItem>
                    )
                  })}
                  <DropdownMenuSeparator />
                </React.Fragment>
              ),
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Attachment button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute bottom-2 right-10 h-6 w-6 text-muted-foreground/50 hover:text-muted-foreground"
          onClick={() => fileInputRef.current?.click()}
          disabled={isStreaming}
          title="Attach files">
          <Paperclip className="h-3 w-3" />
        </Button>

        {/* Send button */}
        <Button
          size="icon"
          className="absolute bottom-2 right-2 h-6 w-6"
          onClick={onSend}
          disabled={(!input.trim() && attachments.length === 0) || isStreaming}>
          <Send className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}
