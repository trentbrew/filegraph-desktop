/**
 * Thread Panel
 *
 * Slide-in panel for viewing and replying to threaded conversations.
 */

import * as React from 'react'
import { motion } from 'motion/react'
import { MessageContent } from './MessageContent'
import { X, Send, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useAgentAppStore, useActiveThread, useActiveThreadMessages, type Message } from '../stores/useAgentAppStore'
import { useAgentAppModelProvider } from '../hooks/useAgentAppModelProvider'
import { ThinkingAccordion } from './ThinkingAccordion'

// ─────────────────────────────────────────────────────────────────────────────
// Thread Message
// ─────────────────────────────────────────────────────────────────────────────

interface ThreadMessageProps {
  message: Message
}

function ThreadMessage({ message }: ThreadMessageProps) {
  const isUser = message.role === 'user'

  return (
    <div className={cn('flex gap-3 py-3', isUser ? 'flex-row-reverse' : 'flex-row')}>
      <div
        className={cn(
          'shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium',
          isUser ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
        )}>
        {isUser ? 'U' : 'A'}
      </div>
      <div className={cn('flex-1 min-w-0', isUser ? 'text-right' : 'text-left')}>
        {!isUser && message.reasoning && message.reasoning.steps.length > 0 && (
          <ThinkingAccordion reasoning={message.reasoning} />
        )}
        <div
          className={cn(
            'inline-block max-w-[85%] px-3 py-2 rounded-lg text-sm',
            isUser ? 'bg-primary text-primary-foreground' : 'bg-muted',
          )}>
          {isUser ? (
            <p className="whitespace-pre-wrap wrap-break-word">{message.content}</p>
          ) : (
            <MessageContent content={message.content} />
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Parent Message Preview
// ─────────────────────────────────────────────────────────────────────────────

interface ParentMessagePreviewProps {
  message: Message | null
}

function ParentMessagePreview({ message }: ParentMessagePreviewProps) {
  if (!message) return null

  return (
    <div className="p-3 bg-muted/50 border-b">
      <div className="flex items-start gap-2">
        <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-muted-foreground mb-1">
            {message.role === 'user' ? 'You' : 'Assistant'} started this thread
          </p>
          <p className="text-sm line-clamp-3">{message.content}</p>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Thread Panel
// ─────────────────────────────────────────────────────────────────────────────

interface ThreadPanelProps {
  className?: string
}

export function ThreadPanel({ className }: ThreadPanelProps) {
  const thread = useActiveThread()
  const messages = useActiveThreadMessages()
  const { closeThread, messagesByChannel, isStreaming } = useAgentAppStore()

  const { sendThreadMessage } = useAgentAppModelProvider()

  const [input, setInput] = React.useState('')
  const scrollRef = React.useRef<HTMLDivElement>(null)

  // Get parent message
  const parentMessage = React.useMemo(() => {
    if (!thread) return null
    const channelMessages = messagesByChannel[thread.channelId] || []
    return channelMessages.find((m) => m.id === thread.parentMessageId) || null
  }, [thread, messagesByChannel])

  // Auto-scroll to bottom when new messages arrive
  React.useEffect(() => {
    if (scrollRef.current) {
      const scrollArea = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (scrollArea) {
        scrollArea.scrollTop = scrollArea.scrollHeight
      }
    }
  }, [messages.length])

  const handleSend = async () => {
    if (!input.trim() || !thread || isStreaming) return

    const content = input.trim()
    setInput('')
    await sendThreadMessage(thread.id, content)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (!thread) return null

  return (
    <motion.div
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 350, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ duration: 0.2 }}
      className={cn('h-full border-l bg-card flex flex-col', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">Thread</span>
          <span className="text-xs text-muted-foreground">
            {messages.length} {messages.length === 1 ? 'reply' : 'replies'}
          </span>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={closeThread}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Parent Message */}
      <ParentMessagePreview message={parentMessage} />

      {/* Thread Messages */}
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="px-3">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <MessageSquare className="h-8 w-8 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">No replies yet</p>
              <p className="text-xs text-muted-foreground/70">Start the conversation below</p>
            </div>
          ) : (
            messages.map((message) => <ThreadMessage key={message.id} message={message} />)
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-3 border-t">
        <div className="relative">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Reply in thread..."
            className="min-h-[60px] pr-10 resize-none text-sm"
            disabled={isStreaming}
          />
          <Button
            size="icon"
            className="absolute bottom-2 right-2 h-6 w-6"
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}>
            <Send className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </motion.div>
  )
}
