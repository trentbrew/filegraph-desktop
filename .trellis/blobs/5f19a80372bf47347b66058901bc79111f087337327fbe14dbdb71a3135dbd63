/**
 * QuickReplyButtons - Clickable option pills for agent questions
 *
 * Renders a compact row of buttons below an assistant message when the agent
 * asks a question with detectable options. Clicking an option sends it as
 * the user's next message.
 */

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Check, Sparkles } from 'lucide-react'
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from '@/components/ui/item'
import { motion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

/** Renders a markdown string inline (no block wrappers). */
function InlineMd({ children: text }: { children: string }) {
  return (
    <span>
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

export interface QuickReplyOption {
  label: string
  value: string
  description?: string
}

interface QuickReplyButtonsProps {
  options: QuickReplyOption[]
  selectedValue?: string
  onSelect: (value: string) => void
}

export function QuickReplyButtons({ options, selectedValue, onSelect }: QuickReplyButtonsProps) {
  if (!options.length) return null

  return (
    <div className="mt-6 mb-2 w-full max-w-[400px]">
      <div className="flex items-center gap-2 px-1 text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-b border-border/40 pb-1.5 mb-3">
        <Sparkles className="h-3.5 w-3.5 text-primary/60" />
        <span>Suggestions</span>
      </div>

      <div className="grid gap-2">
        {options.map((option, index) => {
          const isSelected = selectedValue === option.value
          return (
            <motion.div
              key={option.value}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08, duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
            >
              <Item
                variant="outline"
                className={cn(
                  "group/item cursor-pointer border-border/40 bg-background/40 hover:bg-accent/50 hover:border-primary/30 transition-all duration-300 py-2",
                  isSelected && "bg-primary/5 border-primary/50 ring-1 ring-primary/20",
                  selectedValue && !isSelected && "opacity-50 grayscale pointer-events-none"
                )}
                onClick={() => !selectedValue && onSelect(option.value)}
              >
                <ItemContent className="gap-0.5 justify-center min-w-0">
                  <ItemTitle className="text-[13px] font-medium group-hover/item:text-primary transition-colors whitespace-normal wrap-break-word">
                    <InlineMd>{option.label}</InlineMd>
                  </ItemTitle>
                  {option.description && (
                    <ItemDescription className="text-[11px] opacity-80 whitespace-normal wrap-break-word">
                      <InlineMd>{option.description}</InlineMd>
                    </ItemDescription>
                  )}
                </ItemContent>
                <ItemActions>
                  {isSelected ? (
                    <Check className="h-4 w-4 text-primary animate-in zoom-in duration-300" />
                  ) : (
                    <div className="h-5 w-5 rounded-full border border-border/60 group-hover/item:border-primary/40 transition-colors flex items-center justify-center">
                       <div className="h-1.5 w-1.5 rounded-full bg-primary opacity-0 group-hover/item:opacity-40 transition-opacity" />
                    </div>
                  )}
                </ItemActions>
              </Item>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
