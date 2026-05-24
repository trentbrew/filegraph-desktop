/**
 * Artifact Panel
 *
 * Claude/Gemini-style slide-in panel for displaying rich TDF content
 * (diagrams, charts, tables) at full size alongside the chat.
 */

import * as React from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { X, Maximize2, Minimize2, Copy, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { TrellisRenderer } from '../trellis'
import type { TrellisResponse } from '../trellis/types'

interface ArtifactPanelProps {
  artifact: TrellisResponse | null
  title?: string
  isOpen: boolean
  onClose: () => void
}

export function ArtifactPanel({ artifact, title, isOpen, onClose }: ArtifactPanelProps) {
  const [isExpanded, setIsExpanded] = React.useState(false)
  const [copied, setCopied] = React.useState(false)

  const handleCopy = async () => {
    if (!artifact) return
    try {
      await navigator.clipboard.writeText(JSON.stringify(artifact, null, 2))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && artifact && (
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: isExpanded ? '60%' : 420, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className={cn(
            'h-full border-l border-border bg-background flex flex-col overflow-hidden',
            isExpanded && 'absolute inset-y-0 right-0 z-50',
          )}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-sm font-medium text-foreground">{title || 'Artifact'}</span>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCopy} title="Copy JSON">
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setIsExpanded(!isExpanded)}
                title={isExpanded ? 'Collapse' : 'Expand'}>
                {isExpanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose} title="Close">
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-4">
            <TrellisRenderer response={artifact} className="artifact-view" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Artifact Context - for managing artifact state across components
// ─────────────────────────────────────────────────────────────────────────────

interface ArtifactContextValue {
  artifact: TrellisResponse | null
  artifactTitle: string | null
  isOpen: boolean
  showArtifact: (artifact: TrellisResponse, title?: string) => void
  closeArtifact: () => void
}

const ArtifactContext = React.createContext<ArtifactContextValue | null>(null)

export function ArtifactProvider({ children }: { children: React.ReactNode }) {
  const [artifact, setArtifact] = React.useState<TrellisResponse | null>(null)
  const [artifactTitle, setArtifactTitle] = React.useState<string | null>(null)
  const [isOpen, setIsOpen] = React.useState(false)

  const showArtifact = React.useCallback((newArtifact: TrellisResponse, title?: string) => {
    setArtifact(newArtifact)
    setArtifactTitle(title || null)
    setIsOpen(true)
  }, [])

  const closeArtifact = React.useCallback(() => {
    setIsOpen(false)
  }, [])

  const value = React.useMemo(
    () => ({ artifact, artifactTitle, isOpen, showArtifact, closeArtifact }),
    [artifact, artifactTitle, isOpen, showArtifact, closeArtifact],
  )

  return <ArtifactContext.Provider value={value}>{children}</ArtifactContext.Provider>
}

export function useArtifact() {
  const context = React.useContext(ArtifactContext)
  if (!context) {
    throw new Error('useArtifact must be used within an ArtifactProvider')
  }
  return context
}
