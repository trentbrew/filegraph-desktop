/**
 * TranscriptOverlay - Live transcription display
 *
 * Shows real-time input (user speech) and output (model speech) transcriptions
 * as they stream in during Live Mode.
 */

import * as React from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { cn } from '@/lib/utils'
import type { TranscriptEntry } from '../live/types'

interface TranscriptOverlayProps {
  transcripts: TranscriptEntry[]
  maxVisible?: number
  className?: string
}

export function TranscriptOverlay({
  transcripts,
  maxVisible = 6,
  className,
}: TranscriptOverlayProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom on new transcripts
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [transcripts])

  // Show only the most recent entries
  const visible = transcripts.slice(-maxVisible)

  if (visible.length === 0) return null

  return (
    <div
      ref={scrollRef}
      className={cn(
        'flex flex-col gap-2 overflow-y-auto h-full bg-card/50 rounded-lg border py-3 px-2',
        className,
      )}
    >
      <AnimatePresence mode="popLayout">
        {visible.map((entry) => (
          <motion.div
            key={entry.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className={cn(
              'text-sm leading-relaxed px-3 py-1.5 rounded-lg max-w-[85%]',
              entry.role === 'user'
                ? 'self-end bg-primary/10 text-primary'
                : 'self-start bg-muted text-muted-foreground',
              !entry.isFinal && 'opacity-70',
            )}
          >
            <span className="text-[10px] font-medium uppercase tracking-wider opacity-50 block mb-0.5">
              {entry.role === 'user' ? 'You' : 'Agent'}
            </span>
            {entry.text}
            {!entry.isFinal && (
              <span className="inline-block w-1.5 h-3.5 bg-current opacity-50 ml-0.5 animate-pulse" />
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
