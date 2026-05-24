/**
 * LiveMode - Main Live Mode UI Component
 *
 * Renders the voice conversation interface with animated orb visualizer,
 * live transcription, tool call indicators, and session controls.
 */

import * as React from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Loader2,
  AlertCircle,
  Wrench,
  Trash2,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useLiveAgent } from '../live/useLiveAgent'
import { AudioVisualizer } from './AudioVisualizer'
import { TranscriptOverlay } from './TranscriptOverlay'

// ─────────────────────────────────────────────────────────────────────────────
// Human-readable tool labels
// ─────────────────────────────────────────────────────────────────────────────

const TOOL_LABELS: Record<string, string> = {
  write_file: 'Writing file',
  edit_file: 'Editing file',
  read_file: 'Reading file',
  run_command: 'Running command',
  focus_home_node: 'Focusing canvas',
  add_home_node: 'Adding canvas node',
  verify_dev_project: 'Verifying project',
  setup_dev_workspace: 'Building workspace',
  web_search: 'Searching the web',
  read_vault_entity: 'Reading vault',
  write_vault_entity: 'Writing to vault',
  delete_vault_entity: 'Updating vault',
  query_vault: 'Querying vault',
  create_calendar_event: 'Creating calendar event',
  list_calendar_events: 'Checking calendar',
  search_vault: 'Searching vault',
}

function toolLabel(name: string): string {
  return (
    TOOL_LABELS[name] ??
    name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// BorderBeam — rotating conic-gradient scanner along the container border
// Parent must have `position: relative` and matching border-radius.
// ─────────────────────────────────────────────────────────────────────────────

function BorderBeam({ color = '#22d3ee', duration = 2.4 }: { color?: string; duration?: number }) {
  return (
    <div className="absolute inset-0 overflow-hidden rounded-[inherit] pointer-events-none">
      <motion.div
        className="absolute origin-center"
        style={{
          inset: '-75%',
          background: `conic-gradient(from 0deg at 50% 50%, transparent 30%, ${color} 50%, transparent 70%)`,
        }}
        animate={{ rotate: [0, 360] }}
        transition={{ duration, repeat: Infinity, ease: 'linear' }}
      />
      {/* Inner mask — covers everything except the thin border ring */}
      <div className="absolute inset-[1.5px] rounded-[inherit] bg-background/90" />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ThinkingDots — three bouncing dots shown during processing
// ─────────────────────────────────────────────────────────────────────────────

function ThinkingDots() {
  return (
    <div className="flex items-center gap-1.5">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="block w-1.5 h-1.5 rounded-full bg-violet-400"
          animate={{ y: [0, -5, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.18, ease: 'easeInOut' }}
        />
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ToolCallPanel — card with border beam showing active tool call(s)
// ─────────────────────────────────────────────────────────────────────────────

function ToolCallPanel({ tools }: { tools: string[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -4, scale: 0.97 }}
      transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
      className="relative w-full max-w-xs rounded-xl border border-cyan-500/20 bg-cyan-950/10 p-3 overflow-hidden"
    >
      <BorderBeam color="#22d3ee" duration={2.2} />
      <div className="relative z-10 flex flex-col gap-1.5">
        {tools.map((name) => (
          <div key={name} className="flex items-center gap-2 text-xs text-cyan-400">
            <Wrench className="h-3 w-3 shrink-0 animate-pulse" />
            <span className="font-medium">{toolLabel(name)}</span>
            <span className="ml-auto text-cyan-600 font-mono text-[10px] opacity-60">{name}</span>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ErrorBanner — prominent, dismissible error display
// ─────────────────────────────────────────────────────────────────────────────

function ErrorBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -4, scale: 0.98 }}
      transition={{ duration: 0.2 }}
      className="w-full max-w-sm rounded-xl border border-red-500/30 bg-red-950/20 p-3.5"
    >
      <div className="flex items-start gap-2.5">
        <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-red-400 mb-0.5">Something went wrong</p>
          <p className="text-[11px] text-red-300/80 leading-relaxed wrap-break-word">{message}</p>
        </div>
        <button
          onClick={onDismiss}
          className="text-red-500/60 hover:text-red-400 transition-colors shrink-0 mt-0.5"
          aria-label="Dismiss error"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// LiveMode
// ─────────────────────────────────────────────────────────────────────────────

interface LiveModeProps {
  className?: string
  onClose?: () => void
}

export function LiveMode({ className, onClose }: LiveModeProps) {
  const {
    sessionState,
    workPhase,
    transcripts,
    inputLevel,
    outputLevel,
    isMuted,
    error,
    activeToolCalls,
    startLiveMode,
    stopLiveMode,
    toggleMute,
    clearTranscripts,
  } = useLiveAgent()

  const [dismissedError, setDismissedError] = React.useState<string | null>(null)

  const isActive = sessionState !== 'idle' && sessionState !== 'error'
  // Agent is doing work (show pulsing ring on stop button)
  const isBusy = workPhase === 'thinking' || workPhase === 'tool_calling'
  // Only show error if not dismissed (reset when error message changes)
  const displayError = error && error !== dismissedError ? error : null

  const displayInputLevel = Math.min(1, inputLevel * 6)

  React.useEffect(() => {
    setDismissedError(null)
  }, [error])

  // ── Keyboard shortcut ──────────────────────────────────────────────────────
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'l') {
        e.preventDefault()
        if (isActive) stopLiveMode()
        else startLiveMode()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isActive, startLiveMode, stopLiveMode])

  // ── Status label ───────────────────────────────────────────────────────────
  const stateLabel = React.useMemo((): string => {
    if (!isActive) return sessionState === 'error' ? 'Disconnected' : 'Ready'
    switch (workPhase) {
      case 'connecting':   return 'Connecting...'
      case 'listening':    return isMuted ? 'Muted' : 'Listening...'
      case 'thinking':     return 'Thinking...'
      case 'speaking':     return 'Speaking...'
      case 'tool_calling': return 'Working...'
      case 'error':        return 'Error'
      default:             return 'Listening...'
    }
  }, [workPhase, isActive, sessionState, isMuted])

  return (
    <div className={cn('flex flex-col items-center justify-center gap-5 p-6 h-full', className)}>

      {/* ── Orb ─────────────────────────────────────────────────────────────── */}
      <div className="relative flex items-center justify-center">
        <AudioVisualizer
          state={sessionState}
          inputLevel={inputLevel}
          outputLevel={outputLevel}
          size={180}
        />
        {workPhase === 'connecting' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-8 w-8 text-violet-400 animate-spin" />
          </div>
        )}
      </div>

      {/* ── Status area ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col items-center gap-2 w-full max-w-xs">
        <div className="flex items-center gap-2">
          <p
            className={cn(
              'text-sm font-medium transition-colors duration-300',
              displayError || workPhase === 'error'
                ? 'text-red-400'
                : workPhase === 'tool_calling'
                  ? 'text-cyan-400'
                  : workPhase === 'thinking'
                    ? 'text-violet-400'
                    : 'text-muted-foreground',
            )}
          >
            {stateLabel}
          </p>
          {(workPhase === 'thinking' || workPhase === 'tool_calling') && <ThinkingDots />}
        </div>

        {/* Mic level meter */}
        <AnimatePresence>
          {workPhase === 'listening' && !isMuted && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center gap-1.5 w-32"
            >
              <Mic className="h-3 w-3 text-foreground shrink-0" />
              <div className="flex-1 h-1.5 rounded-full bg-background overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-violet-500"
                  animate={{ width: `${displayInputLevel * 100}%` }}
                  transition={{ duration: 0.05, ease: 'linear' }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Muted indicator */}
        <AnimatePresence>
          {workPhase === 'listening' && isMuted && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-1.5 text-[10px] text-yellow-500/70"
            >
              <MicOff className="h-3 w-3" />
              <span>mic muted</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Active tool call panel ───────────────────────────────────────────── */}
      <AnimatePresence>
        {activeToolCalls.length > 0 && <ToolCallPanel tools={activeToolCalls} />}
      </AnimatePresence>

      {/* ── Error banner ─────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {displayError && (
          <ErrorBanner
            message={displayError}
            onDismiss={() => setDismissedError(displayError)}
          />
        )}
      </AnimatePresence>

      {/* ── Transcript (in-flight only) ──────────────────────────────────────── */}
      {transcripts.some((t) => !t.isFinal) && (
        <div className="w-full max-w-md flex-1 min-h-0">
          <TranscriptOverlay
            transcripts={transcripts.filter((t) => !t.isFinal)}
            maxVisible={4}
          />
        </div>
      )}

      {/* ── Controls ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        {!isActive ? (
          <Button
            size="lg"
            className="rounded-full px-6 gap-2 bg-linear-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-lg"
            onClick={() => startLiveMode()}
          >
            <Phone className="h-5 w-5" />
            Start Live Mode
          </Button>
        ) : (
          <>
            {/* Mute toggle */}
            <Button
              variant="outline"
              size="icon"
              className={cn(
                'rounded-full h-12 w-12',
                isMuted && 'bg-yellow-500/10 border-yellow-500/30 text-yellow-600 dark:text-yellow-400',
              )}
              onClick={toggleMute}
            >
              {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </Button>

            {/* End call — pulsing glow ring while agent is busy */}
            <div className="relative">
              <AnimatePresence>
                {isBusy && (
                  <motion.div
                    key="busy-ring"
                    className="absolute inset-0 rounded-full bg-red-500/25"
                    initial={{ scale: 1, opacity: 0 }}
                    animate={{ scale: [1, 1.7, 1], opacity: [0, 0.6, 0] }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                  />
                )}
              </AnimatePresence>
              <Button
                variant="destructive"
                size="icon"
                className={cn(
                  'relative rounded-full h-14 w-14 transition-shadow duration-300',
                  isBusy && 'shadow-[0_0_14px_rgba(239,68,68,0.45)]',
                )}
                onClick={() => { stopLiveMode(); onClose?.() }}
                title={isBusy ? 'Stop (agent is working)' : 'End Live Mode'}
              >
                <PhoneOff className="h-6 w-6" />
              </Button>
            </div>

            {/* Clear transcript */}
            {transcripts.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full h-12 w-12 text-muted-foreground"
                onClick={clearTranscripts}
                title="Clear transcript"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </>
        )}
      </div>

      {/* Keyboard shortcut hint */}
      <p className="text-[10px] text-muted-foreground/50">
        {isActive ? '⌘⇧L to end' : '⌘⇧L to start'}
      </p>
    </div>
  )
}
