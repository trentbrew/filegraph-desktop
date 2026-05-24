/**
 * TextBasedAgentChat - Simplified agent chat using text-based vault agent
 *
 * Replaces complex tool-based system with prompt-driven Gemini CLI approach
 */

import * as React from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Send, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { queryVaultAgent, parseAgentResponse, extractJsonPatch } from '@/lib/vault-agent'
import { PermissionPrompt } from './PermissionPrompt'
import { useVault } from '@/contexts/VaultContext'
import { useUIStore } from '@/stores/useUIStore'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  permissionRequest?: {
    description: string
    diff?: string
    filePath?: string
    jsonPatch?: string
  }
  approved?: boolean
  executionResult?: {
    success: boolean
    output: string
  }
}

export function TextBasedAgentChat() {
  const { vaultPath } = useVault()
  const [messages, setMessages] = React.useState<ChatMessage[]>([])
  const [input, setInput] = React.useState('')
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to bottom when messages change (matches AgentSidebar pattern)
  React.useEffect(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight
      }
    }
  }, [messages, isLoading])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)
    setError(null)

    try {
      const response = await queryVaultAgent(userMessage.content, vaultPath || undefined)

      if (!response.success) {
        throw new Error(response.error || 'Agent query failed')
      }

      const parsed = parseAgentResponse(response.output)

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: parsed.content,
        timestamp: new Date(),
        permissionRequest:
          parsed.type === 'permission_request'
            ? {
                description: parsed.permissionNeeded!.description,
                diff: parsed.permissionNeeded!.diff,
                filePath: parsed.permissionNeeded!.filePath,
                jsonPatch: parsed.permissionNeeded!.diff ? extractJsonPatch(parsed.permissionNeeded!.diff) : undefined,
              }
            : undefined,
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to query agent')
    } finally {
      setIsLoading(false)
    }
  }

  const handleApprove = (messageId: string, result: any) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId
          ? {
              ...msg,
              approved: true,
              executionResult: {
                success: result.success,
                output: result.output,
              },
            }
          : msg,
      ),
    )
  }

  const handleReject = (messageId: string) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId
          ? {
              ...msg,
              approved: false,
            }
          : msg,
      ),
    )
  }

  const { agentSendOnEnter } = useUIStore()

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (agentSendOnEnter) {
        // Enter sends, Shift+Enter for newline
        if (!e.shiftKey) {
          e.preventDefault()
          handleSend()
        }
      } else {
        // Cmd/Ctrl+Enter sends
        if (e.metaKey || e.ctrlKey) {
          e.preventDefault()
          handleSend()
        }
      }
    }
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Messages - scrollable area */}
      <div className="flex-1 min-h-0 min-w-0 overflow-hidden">
        <ScrollArea className="h-full w-full" ref={scrollRef}>
          <div className="px-4 min-w-0">
            <AnimatePresence mode="popLayout">
              {messages.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-center py-12 text-muted-foreground">
                  <p className="text-sm">Ask me anything about your vault</p>
                  <p className="text-xs mt-2 opacity-60">Try: "Show all tasks assigned to Sarah Chen"</p>
                </motion.div>
              ) : (
                <div className="py-4 space-y-4 min-w-0">
                  {messages.map((message) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="space-y-2">
                      {/* User message */}
                      {message.role === 'user' && (
                        <div className="flex justify-end">
                          <div className="bg-primary text-primary-foreground rounded-lg px-4 py-2 max-w-[80%]">
                            <p className="text-sm">{message.content}</p>
                          </div>
                        </div>
                      )}

                      {/* Assistant message */}
                      {message.role === 'assistant' && (
                        <div className="space-y-3">
                          <div className="bg-muted rounded-lg px-4 py-3 max-w-[90%]">
                            <div className="prose prose-sm dark:prose-invert max-w-none">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                            </div>
                          </div>

                          {/* Permission request */}
                          {message.permissionRequest && !message.approved && message.approved !== false && (
                            <PermissionPrompt
                              description={message.permissionRequest.description}
                              diff={message.permissionRequest.diff}
                              filePath={message.permissionRequest.filePath}
                              jsonPatch={message.permissionRequest.jsonPatch}
                              onApprove={(result) => handleApprove(message.id, result)}
                              onReject={() => handleReject(message.id)}
                            />
                          )}

                          {/* Execution result */}
                          {message.executionResult && (
                            <Alert variant={message.executionResult.success ? 'default' : 'destructive'}>
                              {message.executionResult.success ? (
                                <CheckCircle2 className="h-4 w-4" />
                              ) : (
                                <AlertTriangle className="h-4 w-4" />
                              )}
                              <AlertDescription>
                                <pre className="text-xs whitespace-pre-wrap">{message.executionResult.output}</pre>
                              </AlertDescription>
                            </Alert>
                          )}

                          {/* Rejection notice */}
                          {message.approved === false && (
                            <Alert>
                              <AlertDescription className="text-xs">
                                Permission denied - change not applied
                              </AlertDescription>
                            </Alert>
                          )}
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </AnimatePresence>

            {/* Loading indicator */}
            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2 text-muted-foreground text-sm py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Thinking...</span>
              </motion.div>
            )}

            {/* Error message */}
            {error && (
              <Alert variant="destructive" className="mx-4 my-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Input - sticky at bottom */}
      <div className="flex-none border-t p-4">
        <div className="flex gap-2">
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your vault..."
            className="min-h-[60px] max-h-[120px] resize-none"
            disabled={isLoading}
          />
          <Button onClick={handleSend} disabled={!input.trim() || isLoading} size="icon" className="shrink-0">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">Text-based agent powered by Gemini CLI</p>
      </div>
    </div>
  )
}
