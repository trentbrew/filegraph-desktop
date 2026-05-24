/**
 * ChatEmptyState - Empty state for chat with example queries
 */

import * as React from 'react'
import { motion } from 'motion/react'
import { Bot, FileText } from 'lucide-react'

interface ExampleQueryProps {
  query: string
  delay?: number
  onClick?: (query: string) => void
}

function ExampleQuery({ query, delay = 0, onClick }: ExampleQueryProps) {
  return (
    <motion.button
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2, delay }}
      whileHover={{ scale: 1.02, x: 4 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onClick?.(query)}
      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 hover:bg-muted text-xs text-left w-full transition-colors">
      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
      <span className="truncate">{query}</span>
    </motion.button>
  )
}

interface ChatEmptyStateProps {
  onExampleClick?: (query: string) => void
}

export function ChatEmptyState({ onExampleClick }: ChatEmptyStateProps) {
  return (
    <div className="h-full flex flex-col items-center justify-center py-12 text-center">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
        className="p-4 rounded-full bg-primary/10 mb-4">
        <Bot className="h-8 w-8 text-primary" />
      </motion.div>
      <motion.h3
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0.1 }}
        className="font-medium mb-2">
        Filegraph Agent
      </motion.h3>
      <motion.p
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0.15 }}
        className="text-xs text-muted-foreground max-w-[200px] mb-6">
        Ask questions about your vault, query entities, or get help navigating your data.
      </motion.p>
      <div className="space-y-2 text-left">
        <ExampleQuery query="Who are the people in my vault?" delay={0.2} onClick={onExampleClick} />
        <ExampleQuery query="Show me tasks due this week" delay={0.25} onClick={onExampleClick} />
        <ExampleQuery query="Find all references to proj:filegraph:001" delay={0.3} onClick={onExampleClick} />
      </div>
    </div>
  )
}
