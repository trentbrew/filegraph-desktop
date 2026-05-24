/**
 * ThinkingAccordion - Collapsible display of agent reasoning process
 */

import * as React from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { ChevronDown, Brain, Search, Lightbulb, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'

type ReasoningStepType = 'assess' | 'plan' | 'execute' | 'synthesize'

export interface ReasoningStep {
  type?: ReasoningStepType
  content: string
  timestamp: number
}

export interface Reasoning {
  steps: ReasoningStep[]
  durationMs: number
  isThinking?: boolean
}

interface ThinkingAccordionProps {
  reasoning: Reasoning
  className?: string
}

const STEP_ICONS: Record<ReasoningStepType, React.ReactNode> = {
  assess: <Brain className="h-3 w-3" />,
  plan: <Lightbulb className="h-3 w-3" />,
  execute: <Search className="h-3 w-3" />,
  synthesize: <MessageSquare className="h-3 w-3" />,
}

const STEP_LABELS: Record<ReasoningStepType, string> = {
  assess: 'Assessing',
  plan: 'Planning',
  execute: 'Executing',
  synthesize: 'Synthesizing',
}

export function ThinkingAccordion({ reasoning, className }: ThinkingAccordionProps) {
  // Expand by default when thinking, collapse when done
  const [isOpen, setIsOpen] = React.useState(reasoning.isThinking)
  // Track if user manually toggled - prevents auto-collapse for past messages
  const userToggledRef = React.useRef(false)
  // Track if this was auto-opened (so we can auto-close it)
  const wasAutoOpenedRef = React.useRef(reasoning.isThinking)
  // Ref for scrolling into view
  const contentRef = React.useRef<HTMLDivElement>(null)

  // Handle user toggle
  const handleToggle = React.useCallback(() => {
    userToggledRef.current = true
    wasAutoOpenedRef.current = false // User took control
    setIsOpen((prev) => !prev)
  }, [])

  // Auto-scroll into view when expanded
  React.useEffect(() => {
    if (isOpen && contentRef.current) {
      // Small delay to let animation start
      const timer = setTimeout(() => {
        contentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  // Auto-collapse when thinking completes - only if it was auto-opened
  React.useEffect(() => {
    if (!reasoning.isThinking && isOpen && wasAutoOpenedRef.current) {
      // Small delay before collapsing to let user see final state
      const timer = setTimeout(() => {
        setIsOpen(false)
        wasAutoOpenedRef.current = false
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [reasoning.isThinking, isOpen])

  // Auto-expand when thinking starts
  React.useEffect(() => {
    if (reasoning.isThinking) {
      wasAutoOpenedRef.current = true
      userToggledRef.current = false
      setIsOpen(true)
    }
  }, [reasoning.isThinking])

  const durationSec = Math.round(reasoning.durationMs / 1000)
  const durationText = reasoning.isThinking
    ? 'Thinking...'
    : durationSec === 0
      ? 'Thought for <1 second'
      : `Thought for ${durationSec} second${durationSec !== 1 ? 's' : ''}`

  if (!reasoning.steps.length) return null

  return (
    <div className={cn('mb-2', className)}>
      <button
        onClick={handleToggle}
        className={cn(
          'flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors',
          reasoning.isThinking && 'animate-pulse',
        )}>
        <Brain className="h-3 w-3" />
        <span>{durationText}</span>
        <ChevronDown className={cn('h-3 w-3 transition-transform', isOpen && 'rotate-180')} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={contentRef}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            className="overflow-hidden">
            <div className="mt-2 pl-4 border-l-2 border-foreground/10 space-y-1.5">
              {reasoning.steps.map((step, i) =>
                (() => {
                  const stepType: ReasoningStepType = step.type ?? 'assess'
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.15, delay: i * 0.05 }}
                      className="flex items-start gap-2 text-xs">
                      {/* <span className="text-muted-foreground/50 mt-0.5">{STEP_ICONS[step.type]}</span> */}
                      <div>
                        <span className="font-medium text-muted-foreground/80">{STEP_LABELS[stepType]}:</span>{' '}
                        <span className="text-foreground/50">{step.content}</span>
                      </div>
                    </motion.div>
                  )
                })(),
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
