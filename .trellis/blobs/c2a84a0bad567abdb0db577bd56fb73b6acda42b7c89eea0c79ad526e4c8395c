/**
 * MessageBubble - Individual chat message component
 * Renders user and assistant messages with markdown, attachments, and actions
 */

import * as React from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  FileText,
  ExternalLink,
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
  Globe,
  Plus,
  ChevronDown,
  Sparkles,
} from 'lucide-react'
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from '@/components/ui/item'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { useTabStore } from '@/stores/useTabStore'
import { useHighlightStore } from '@/stores/useHighlightStore'
import { useAppStore } from '@/stores/useAppStore'
import { useVault } from '@/contexts/VaultContext'
import { useChatStore, type Message } from '../hooks'
import { type EventFormCardData, type CommandApprovalCardData } from '../hooks/useChatStore'
import ReactMarkdown, { Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cleanLabel } from '../utils/detectQuickReply'
import { join } from '@tauri-apps/api/path'
import { invoke } from '@tauri-apps/api/core'
import { NAMESPACE_FILES, isEntityId, isNoteFile } from '@/lib/namespaces'
import { getEffectiveExtension } from '@/lib/utils/fileExtensions'
import { ReferenceChip } from '@/components/links'
import { ThinkingAccordion } from './ThinkingAccordion'
import { InlineEventCard } from './InlineEventCard'
import { InlineCommandApproval } from './InlineCommandApproval'
import { resolveCommandApproval } from '../tools/shell-tools'
import { SourcesAccordion } from '@/features/agent/components/SourcesAccordion'
import { QuickReplyButtons } from './QuickReplyButtons'
import { renderWithExpressiveText, renderWithReferenceLinks } from '../utils/textRendering'
import type { QuickReplyCardData } from '../hooks/useChatStore'

interface MessageBubbleProps {
  message: Message
  showActions?: boolean
}

/** Renders a markdown string inline (no block wrappers). Used for suggestion labels/descriptions. */
function InlineMd({ children: text, className }: { children: string; className?: string }) {
  return (
    <span className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <>{children}</>,
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          em: ({ children }) => <em>{children}</em>,
          code: ({ children }) => (
            <code className="text-[11px] px-1 py-0.5 rounded bg-background/50 font-mono">{children}</code>
          ),
          a: ({ children }) => <span>{children}</span>,
        }}
      >
        {text}
      </ReactMarkdown>
    </span>
  )
}

export function MessageBubble({ message, showActions = true }: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const { vaultPath } = useVault()
  const openEditorPinned = useTabStore((s) => s.openEditorPinned)
  const setHighlightedEntity = useHighlightStore((s) => s.setHighlightedEntity)
  const updateMessage = useChatStore((s) => s.updateMessage)

  // Action button states
  const [copied, setCopied] = React.useState(false)
  const [vote, setVote] = React.useState<'up' | 'down' | null>(null)

  // Event card handlers
  const handleExpandEventCard = React.useCallback(() => {
    if (message.card?.type !== 'event-form') return
    const cardData = message.card as EventFormCardData
    window.dispatchEvent(
      new CustomEvent('agent:open-new-event-dialog', {
        detail: {
          name: cardData.name,
          date: cardData.date,
          startTime: cardData.startTime,
          endTime: cardData.endTime,
          label: cardData.label,
          description: cardData.description,
          location: cardData.location,
          urgency: cardData.urgency,
          isAllDay: cardData.isAllDay,
        },
      }),
    )
    updateMessage(message.id, {
      card: { ...cardData, status: 'cancelled' },
      content: message.content + '\n\n*Opened in full editor*',
    })
  }, [message, updateMessage])

  const handleConfirmEventCard = React.useCallback(async () => {
    if (message.card?.type !== 'event-form') return
    const cardData = message.card as EventFormCardData

    try {
      const calendarPath = await join(vaultPath || '', '@calendar', 'events.data')

      let data: any = {
        '@context': { schema: 'https://schema.org/' },
        '@type': 'ItemList',
        '@graph': [],
      }

      try {
        const result = await invoke<{ content: string }>('read_text_file', { filePath: calendarPath })
        data = JSON.parse(result.content)
      } catch {
        // File doesn't exist yet
      }

      const newEvent = {
        id: `event:${Date.now()}`,
        name: cardData.name,
        label: cardData.label || 'event',
        date: cardData.date,
        startTime: cardData.startTime,
        endTime: cardData.endTime,
        isAllDay: cardData.isAllDay,
        description: cardData.description,
        location: cardData.location,
        urgency: cardData.urgency || 2,
        status: 'backlog',
      }

      data['@graph'].push(newEvent)

      await invoke('write_text_file', {
        filePath: calendarPath,
        content: JSON.stringify(data, null, 2),
      })

      updateMessage(message.id, {
        card: { ...cardData, status: 'created', eventId: newEvent.id } as any,
      })
    } catch (err) {
      console.error('[Agent] Failed to create event:', err)
      updateMessage(message.id, {
        card: { ...cardData, status: 'cancelled' },
        content: message.content + '\n\n*Failed to create event*',
      })
    }
  }, [message, updateMessage, vaultPath])

  const handleCancelEventCard = React.useCallback(() => {
    if (message.card?.type !== 'event-form') return
    const cardData = message.card as EventFormCardData
    updateMessage(message.id, {
      card: { ...cardData, status: 'cancelled' },
    })
  }, [message, updateMessage])

  const handleViewEventCard = React.useCallback(() => {
    if (message.card?.type !== 'event-form') return
    const cardData = message.card as any
    if (!cardData.eventId) return

    const { setActiveApp } = useAppStore.getState()
    setActiveApp('calendar')

    window.dispatchEvent(
      new CustomEvent('agent:view-calendar-event', {
        detail: { eventId: cardData.eventId },
      }),
    )
  }, [message])

  const handleCopy = React.useCallback(async () => {
    await navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [message.content])

  const handleVote = React.useCallback(
    (type: 'up' | 'down') => {
      setVote((prev) => (prev === type ? null : type))
      console.log(`[Agent] Vote ${type} for message:`, message.id)
    },
    [message.id],
  )

  const handleReferenceClick = React.useCallback(
    async (reference: string) => {
      if (!vaultPath) return

      try {
        let fullPath: string
        let fileName: string

        if (isNoteFile(reference)) {
          const noteName = reference.replace(/^@notes\//, '')
          fullPath = await join(vaultPath, '@notes', noteName)
          fileName = noteName
        } else {
          const [namespace] = reference.split(':')
          const relativePath = NAMESPACE_FILES[namespace]
          if (!relativePath) return

          fullPath = await join(vaultPath, relativePath)
          fileName = relativePath.split('/').pop() || relativePath
          setHighlightedEntity(reference, 3000)
        }

        openEditorPinned({
          id: fileName,
          name: fileName,
          path: fullPath,
          file_type: 'file',
          size: 0,
          date_modified: new Date().toISOString(),
          extension: getEffectiveExtension(fileName) || '',
        })
      } catch (err) {
        console.error('[Agent] Failed to open reference:', err)
      }
    },
    [vaultPath, openEditorPinned, setHighlightedEntity],
  )

  const markdownComponents: Components = React.useMemo(
    () => ({
      code: ({ children, className }) => {
        const text = String(children)
        const isEntity = isEntityId(text)
        const isNote = isNoteFile(text)

        if ((isEntity || isNote) && !className) {
          return <ReferenceChip reference={text} size="sm" />
        }
        return <code className={className}>{children}</code>
      },
      p: ({ children }) => {
        return <p>{renderWithExpressiveText(renderWithReferenceLinks(children))}</p>
      },
      ul: ({ children }) => {
        const childrenArray = React.Children.toArray(children)
        const isSuggestedSteps = childrenArray.some((child: any) => {
          const text = String(child?.props?.children || '').toLowerCase()
          return text.includes('suggested next steps') || text.includes('suggested actions')
        })

        if (isSuggestedSteps) {
          return (
            <div className="my-6 space-y-3">
              <div className="flex items-center gap-2 px-1 text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-b border-border/40 pb-1.5 mb-3">
                <Sparkles className="h-3.5 w-3.5 text-primary/60" />
                <span>Suggested Next Steps</span>
              </div>
              <div className="grid gap-2">
                {childrenArray.map((child: any, i) => {
                  const content = child?.props?.children
                  let text = ""

                  const extractText = (node: any): string => {
                    if (!node) return ""
                    if (typeof node === 'string') return node
                    if (typeof node === 'number') return String(node)
                    if (Array.isArray(node)) return node.map(extractText).join('')
                    if (node?.props?.children) return extractText(node.props.children)
                    return ""
                  }

                  text = extractText(content)

                  if (!text || text.toLowerCase().includes('suggested next steps')) return null

                  let label = cleanLabel(text)
                  let description = ""

                  if (text.includes(':')) {
                    const parts = text.split(/:\s+/)
                    label = cleanLabel(parts[0])
                    description = parts.slice(1).join(': ')
                  }

                  if (!label) return null

                  return (
                    <Item key={i} variant="outline" className="py-2 bg-background/40 border-border/40 hover:border-primary/30 transition-all cursor-default group/suggested">
                      <ItemContent className="gap-0.5 justify-center min-w-0">
                        <ItemTitle className="text-[13px] font-medium group-hover/suggested:text-primary transition-colors whitespace-normal wrap-break-word"><InlineMd>{label}</InlineMd></ItemTitle>
                        {description && <ItemDescription className="text-[11px] opacity-80 whitespace-normal wrap-break-word"><InlineMd>{description}</InlineMd></ItemDescription>}
                      </ItemContent>
                    </Item>
                  )
                })}
              </div>
            </div>
          )
        }
        return <ul className="my-2 pl-4 space-y-1 list-disc marker:text-muted-foreground/40">{children}</ul>
      },
      li: ({ children }) => {
        return <li className="leading-relaxed group transition-colors duration-200 hover:text-foreground">{renderWithExpressiveText(renderWithReferenceLinks(children))}</li>
      },
      h1: ({ children }) => (
        <h1 className="text-base font-semibold tracking-tight mt-4 mb-2 text-foreground">{children}</h1>
      ),
      h2: ({ children }) => (
        <h2 className="text-sm font-semibold tracking-tight mt-3 mb-1.5 text-foreground">{children}</h2>
      ),
      h3: ({ children }) => (
        <h3 className="text-xs font-semibold tracking-tight mt-2 mb-1 text-foreground">{children}</h3>
      ),
      pre: ({ children }) => (
        <pre className="my-3 p-3 rounded-lg bg-background/50 overflow-x-auto text-[11px]">{children}</pre>
      ),
      del: ({ children }) => <del className="text-muted-foreground line-through">{children}</del>,
      strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
      em: ({ children }) => <em className="italic text-foreground/90">{children}</em>,
      blockquote: ({ children }) => (
        <blockquote className="border-l-2 border-primary/50 pl-3 my-2 italic text-muted-foreground">
          {children}
        </blockquote>
      ),
      hr: () => <hr className="my-4 border-border" />,
      a: ({ href, children }) => (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
        >
          {children}
          <ExternalLink className="inline h-3 w-3 ml-0.5 opacity-50" />
        </a>
      ),
    }),
    [],
  )

  return (
    <div className={cn('flex flex-col gap-1 min-w-0 w-full', isUser ? 'items-end' : 'items-start')}>
      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-3 py-2 text-xs select-text overflow-hidden',
          isUser ? 'bg-primary text-primary-foreground rounded-br-md' : 'bg-foreground/10 rounded-bl-md',
        )}>
        {isUser ? (
          <>
            {message.attachments && message.attachments.length > 0 && (
              <div className="mb-2 space-y-2">
                {message.attachments.map((att) => (
                  <div key={att.id} className="flex items-center gap-2 p-2 bg-primary-foreground/10 rounded-lg">
                    {att.previewUrl ? (
                      <img
                        src={att.previewUrl}
                        alt={att.name}
                        className="h-12 w-12 sm:h-14 sm:w-14 object-cover rounded cursor-pointer hover:opacity-80"
                        onClick={() => window.open(att.previewUrl, '_blank')}
                      />
                    ) : (
                      <div className="h-8 w-8 sm:h-10 sm:w-10 flex items-center justify-center bg-primary-foreground/20 rounded">
                        <FileText className="h-4 w-4" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{att.name}</p>
                      <p className="text-[10px] opacity-70">{(att.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {message.content && <p className="whitespace-pre-wrap select-text wrap-break-word">{message.content}</p>}
          </>
        ) : (
          <>
            {message.reasoning && message.reasoning.steps.length > 0 && (
              <ThinkingAccordion reasoning={message.reasoning} />
            )}
            <div className="prose prose-sm dark:prose-invert max-w-none select-text wrap-break-word overflow-hidden prose-headings:font-semibold prose-headings:tracking-tight prose-h1:text-base prose-h1:mt-4 prose-h1:mb-2 prose-h2:text-sm prose-h2:mt-3 prose-h2:mb-1.5 prose-h3:text-xs prose-h3:mt-2 prose-h3:mb-1 prose-p:my-2 prose-p:leading-relaxed prose-ul:my-2 prose-ul:pl-4 prose-ol:my-2 prose-ol:pl-4 prose-li:my-1 prose-li:leading-relaxed prose-pre:my-3 prose-pre:p-3 prose-pre:rounded-lg prose-pre:bg-background/50 prose-code:text-[11px] prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:bg-background/50 prose-code:before:content-none prose-code:after:content-none prose-strong:font-semibold prose-strong:text-foreground prose-em:text-foreground/90 prose-blockquote:border-l-2 prose-blockquote:border-primary/50 prose-blockquote:pl-3 prose-blockquote:italic prose-blockquote:text-muted-foreground prose-a:text-primary prose-a:underline prose-a:underline-offset-2 prose-hr:my-4 prose-hr:border-border">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                {message.content}
              </ReactMarkdown>
            </div>
            {message.card?.type === 'command-approval' && (() => {
              const card = message.card as CommandApprovalCardData
              return (
                <InlineCommandApproval
                  data={card}
                  onApprove={() => {
                    resolveCommandApproval(card.resolveId, true)
                    updateMessage(message.id, {
                      card: { ...card, status: 'approved' },
                    })
                  }}
                  onDeny={() => {
                    resolveCommandApproval(card.resolveId, false)
                    updateMessage(message.id, {
                      card: { ...card, status: 'denied' },
                    })
                  }}
                />
              )
            })()}
            {message.card?.type === 'event-form' && (
              <InlineEventCard
                data={message.card as EventFormCardData}
                onExpand={handleExpandEventCard}
                onConfirm={handleConfirmEventCard}
                onCancel={handleCancelEventCard}
                onViewEvent={handleViewEventCard}
              />
            )}
            {message.sources && message.sources.length > 0 && <SourcesAccordion sources={message.sources} />}
            {message.card?.type === 'quick-reply' && (() => {
              const qr = message.card as QuickReplyCardData
              return (
                <QuickReplyButtons
                  options={qr.options}
                  selectedValue={qr.selectedValue}
                  onSelect={(value) => {
                    updateMessage(message.id, {
                      card: { ...qr, selectedValue: value },
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
        <p className={cn('text-[10px] mt-1', isUser ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>

      <AnimatePresence>
        {!isUser && showActions && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-0.5 ml-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground/50 hover:text-foreground"
              onClick={handleCopy}
              title="Copy as markdown">
              {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'h-6 w-6',
                vote === 'up' ? 'text-green-500' : 'text-muted-foreground/50 hover:text-foreground',
              )}
              onClick={() => handleVote('up')}
              title="Good response">
              <ThumbsUp className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'h-6 w-6 hidden sm:inline-flex',
                vote === 'down' ? 'text-red-500' : 'text-muted-foreground/50 hover:text-foreground',
              )}
              onClick={() => handleVote('down')}
              title="Bad response">
              <ThumbsDown className="h-3 w-3" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
