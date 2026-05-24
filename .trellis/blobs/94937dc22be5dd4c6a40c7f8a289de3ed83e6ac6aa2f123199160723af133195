/**
 * MessageContent - Smart message renderer that detects and renders TDF or Markdown
 *
 * Automatically detects if the message content is Trellis Document Format (TDF)
 * and renders it using TrellisRenderer, otherwise falls back to markdown.
 */

import * as React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Expand } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TrellisRenderer, parseTrellisResponse } from '../trellis'
import type { TrellisResponse } from '../trellis/types'

interface MessageContentProps {
  content: string
  isStreaming?: boolean
  className?: string
  onShowArtifact?: (artifact: TrellisResponse, title?: string) => void
}

const VISUAL_BLOCK_TYPES = ['mermaid', 'chart', 'image', 'embed', 'table']

function hasVisualContent(response: TrellisResponse): boolean {
  return response.blocks.some((block) => VISUAL_BLOCK_TYPES.includes(block.type))
}

function extractTitle(response: TrellisResponse): string | undefined {
  const headingBlock = response.blocks.find(
    (b) => b.type === 'text' && (b.style === 'heading' || b.style === 'subheading'),
  )
  if (headingBlock && headingBlock.type === 'text') {
    return headingBlock.content.replace(/^#+\s*/, '')
  }
  return undefined
}

export function MessageContent({ content, isStreaming, className, onShowArtifact }: MessageContentProps) {
  const parsed = React.useMemo(() => {
    if (!content || isStreaming) return null
    return parseTrellisResponse(content)
  }, [content, isStreaming])

  const hasVisuals = parsed ? hasVisualContent(parsed) : false

  if (isStreaming && !content) {
    return <span className="text-muted-foreground">...</span>
  }

  if (parsed) {
    return (
      <div className="trellis-message">
        <TrellisRenderer response={parsed} className={className} />
        {hasVisuals && onShowArtifact && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 h-7 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => onShowArtifact(parsed, extractTitle(parsed))}>
            <Expand className="h-3 w-3 mr-1.5" />
            View larger
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="prose prose-sm dark:prose-invert max-w-none overflow-hidden wrap-break-word prose-p:my-2 prose-p:leading-relaxed prose-ul:my-2 prose-ul:pl-4 prose-ol:my-2 prose-ol:pl-4 prose-li:my-1 prose-li:leading-relaxed prose-pre:my-3 prose-pre:p-3 prose-pre:rounded-lg prose-pre:bg-background/50 prose-pre:overflow-x-auto prose-code:text-[11px] prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:bg-background/50 prose-code:before:content-none prose-code:after:content-none prose-a:break-all">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  )
}
