/**
 * SourcesAccordion - Displays web sources from search/research results
 * with option to add sources as web embed nodes to the canvas
 */

import * as React from 'react'
import { Globe, Plus, ChevronDown, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import type { WebSource } from '../hooks/useChatStore'

interface SourcesAccordionProps {
  sources: WebSource[]
  className?: string
}

export function SourcesAccordion({ sources, className }: SourcesAccordionProps) {
  const [isOpen, setIsOpen] = React.useState(false)

  const validSources = sources.filter((s) => s.url)

  if (validSources.length === 0) return null

  const handleAddToCanvas = React.useCallback(() => {
    // Dispatch event to add all sources as web embed nodes
    window.dispatchEvent(
      new CustomEvent('agent:add-sources-to-canvas', {
        detail: { sources: validSources },
      }),
    )
  }, [validSources])

  const handleOpenSource = React.useCallback((url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer')
  }, [])

  const handleAddSingleSource = React.useCallback((source: WebSource, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent opening the source URL
    window.dispatchEvent(
      new CustomEvent('agent:add-sources-to-canvas', {
        detail: { sources: [source] },
      }),
    )
  }, [])

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className={cn('mt-2 max-w-full overflow-hidden', className)}>
      <div className="flex items-center gap-2 flex-wrap">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors">
            <Globe className="h-3 w-3 shrink-0" />
            <span className="whitespace-nowrap">
              {validSources.length} source{validSources.length !== 1 ? 's' : ''}
            </span>
            <ChevronDown className={cn('h-3 w-3 transition-transform duration-200 shrink-0', isOpen && 'rotate-180')} />
          </button>
        </CollapsibleTrigger>

        <Button
          variant="ghost"
          size="sm"
          className="h-5 px-1.5 text-[10px] text-muted-foreground hover:text-foreground gap-1 shrink-0"
          onClick={handleAddToCanvas}
          title="Add sources to canvas as web embeds">
          <Plus className="h-3 w-3" />
          <span className="whitespace-nowrap">Add to Canvas</span>
        </Button>
      </div>

      <CollapsibleContent className="mt-2 overflow-hidden">
        <div className="space-y-0.5 pl-2 border-l-2 border-muted max-w-full">
          {validSources.map((source, index) => (
            <div
              key={`${source.url}-${index}`}
              className="flex items-center gap-2 w-full p-1 rounded hover:bg-muted/50 transition-colors text-left group overflow-hidden">
              <Globe className="h-3 w-3 text-muted-foreground shrink-0" />
              <button
                type="button"
                onClick={() => source.url && handleOpenSource(source.url)}
                className="flex-1 min-w-0 text-left overflow-hidden">
                <p className="text-[11px] font-medium text-foreground truncate group-hover:text-primary transition-colors">
                  {source.title || (source.url ? new URL(source.url).hostname : 'Unknown')}
                </p>
              </button>
              <div className="flex items-center gap-0.5 shrink-0">
                <button
                  type="button"
                  onClick={(e) => handleAddSingleSource(source, e)}
                  className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-all"
                  title="Add to canvas">
                  <Plus className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => source.url && handleOpenSource(source.url)}
                  className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-all"
                  title="Open in browser">
                  <ExternalLink className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
