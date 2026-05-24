/**
 * useLiveAgent - React Hook for Live Mode
 *
 * Orchestrates the AudioEngine, LiveSession, and ToolBridge into a single
 * reactive interface. Manages session lifecycle, audio I/O, transcripts,
 * tool execution, and UI state.
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { AudioEngine } from './audioEngine'
import { LiveSession } from './liveSession'
import { getGeminiFunctionDeclarations, executeLiveToolCalls } from './toolBridge'
import { getSystemContext, formatSystemContextForPrompt } from '../context/systemContext'
import { useAgentAppStore } from '../stores/useAgentAppStore'
import {
  type LiveSessionState,
  type TranscriptEntry,
  type LiveFunctionCall,
  type AudioEngineState,
  DEFAULT_LIVE_MODEL,
  DEFAULT_LIVE_VOICE,
} from './types'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fine-grained work phase for richer UI feedback.
 * Derived by useLiveAgent from multiple event streams.
 */
export type LiveWorkPhase =
  | 'idle'         // Session not started
  | 'connecting'   // WebSocket handshake
  | 'listening'    // Mic active, waiting for speech
  | 'thinking'     // User spoke; model is processing before audio starts
  | 'speaking'     // Model producing audio
  | 'tool_calling' // Executing tool call(s)
  | 'error'        // Session or runtime error

export interface UseLiveAgentReturn {
  /** Current session state */
  sessionState: LiveSessionState
  /** Fine-grained work phase for UI transparency */
  workPhase: LiveWorkPhase
  /** Transcript entries (user + model) */
  transcripts: TranscriptEntry[]
  /** Current input audio level (0-1) */
  inputLevel: number
  /** Current output audio level (0-1) */
  outputLevel: number
  /** Whether the mic is muted */
  isMuted: boolean
  /** Current error message */
  error: string | null
  /** Names of tools currently being executed */
  activeToolCalls: string[]

  /** Start Live Mode session */
  startLiveMode: () => Promise<void>
  /** Stop Live Mode session */
  stopLiveMode: () => void
  /** Toggle mic mute */
  toggleMute: () => void
  /** Send text while in Live Mode */
  sendText: (text: string) => void
  /** Clear transcript history */
  clearTranscripts: () => void
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useLiveAgent(): UseLiveAgentReturn {
  const [sessionState, setSessionState] = useState<LiveSessionState>('idle')
  const [workPhase, setWorkPhase] = useState<LiveWorkPhase>('idle')
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([])
  const [isMuted, setIsMuted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeToolCalls, setActiveToolCalls] = useState<string[]>([])
  const [inputLevel, setInputLevel] = useState(0)
  const [outputLevel, setOutputLevel] = useState(0)

  const audioEngineRef = useRef<AudioEngine | null>(null)
  const liveSessionRef = useRef<LiveSession | null>(null)
  const animFrameRef = useRef<number | null>(null)

  // Track current transcript being built (model output is incremental)
  const currentOutputTranscriptRef = useRef<string>('')
  const currentInputTranscriptRef = useRef<string>('')

  // ─────────────────────────────────────────────────────────────────────────
  // Audio level polling (requestAnimationFrame loop)
  // ─────────────────────────────────────────────────────────────────────────

  const startLevelPolling = useCallback(() => {
    const poll = () => {
      const engine = audioEngineRef.current
      if (engine) {
        setInputLevel(engine.getInputLevel())
        setOutputLevel(engine.getOutputLevel())
      }
      animFrameRef.current = requestAnimationFrame(poll)
    }
    animFrameRef.current = requestAnimationFrame(poll)
  }, [])

  const stopLevelPolling = useCallback(() => {
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current)
      animFrameRef.current = null
    }
    setInputLevel(0)
    setOutputLevel(0)
  }, [])

  // ─────────────────────────────────────────────────────────────────────────
  // Transcript helpers
  // ─────────────────────────────────────────────────────────────────────────

  const addTranscript = useCallback((role: 'user' | 'model', text: string, isFinal = false) => {
    const entry: TranscriptEntry = {
      id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      role,
      text,
      timestamp: Date.now(),
      isFinal,
    }
    setTranscripts((prev) => [...prev, entry])
    return entry.id
  }, [])

  const updateLastTranscript = useCallback((role: 'user' | 'model', text: string, isFinal = false) => {
    setTranscripts((prev) => {
      let lastIdx = -1
      for (let i = prev.length - 1; i >= 0; i--) {
        if (prev[i].role === role) { lastIdx = i; break }
      }
      if (lastIdx === -1 || prev[lastIdx].isFinal) {
        // No existing incomplete entry — create new one
        return [
          ...prev,
          {
            id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            role,
            text,
            timestamp: Date.now(),
            isFinal,
          },
        ]
      }
      // Update existing incomplete entry
      const updated = [...prev]
      updated[lastIdx] = { ...updated[lastIdx], text, isFinal }
      return updated
    })
  }, [])

  // ─────────────────────────────────────────────────────────────────────────
  // Build system instruction (reuses existing agent prompt logic)
  // ─────────────────────────────────────────────────────────────────────────

  const buildSystemInstruction = useCallback((): string => {
    const now = new Date()
    const currentDate = now.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    const currentTime = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    const isoDate = now.toISOString().split('T')[0]

    let prompt = `You are the Filegraph Agent in Live Mode — a voice-first AI assistant for a personal knowledge vault.

**Current Date/Time:** ${currentDate} at ${currentTime}
**Today's date (for tools):** ${isoDate}

**VOICE INTERACTION RULES:**
1. Keep responses concise and conversational — you're speaking, not writing.
2. Use natural speech patterns. Avoid markdown, bullet points, or code blocks in voice responses.
3. When executing tools, briefly narrate what you're doing: "Let me check your calendar..."
4. After tool results, summarize the key findings verbally.
5. If asked to create something visual (canvas nodes, files), do it and confirm verbally.
6. For complex information, offer to show details on the canvas or in a file.

**ERROR TRANSPARENCY (CRITICAL):**
When anything goes wrong, tell the user IMMEDIATELY and HONESTLY. Never claim success if a tool returned an error.
- Say what failed: "I tried to write the file but got a permissions error."
- Say what you're doing about it: "I'll try a different path." or "I can't fix this automatically."
- Say what the user can do: "You may need to allow the command in the permission dialog."
- Never paper over errors silently. If three retries fail, stop and explain clearly.
- If you're unsure what went wrong, say so: "Something unexpected happened — here's what I know..."

**AVAILABLE TOOLS:**
You have access to 50+ tools for vault queries, canvas manipulation, calendar, file operations, web search, and more. Use them naturally based on what the user asks.

**VAULT STRUCTURE:**
The vault root is ~/.filegraph with namespaces: @entities/, @finance/, @calendar/, @notes/, @system/.
Entity IDs follow namespace:slug:index format (e.g., person:sarah:001).

**BUILDING PROJECTS (websites, games, apps, scripts):**
In voice mode, build projects incrementally — one tool call per file. Do NOT try to generate all file content in a single \`setup_dev_workspace\` call (it produces too large a response for the voice session).

**PORT RULES (MANDATORY):**
- **NEVER assume a port** (like 3000, 8000, 8080).
- **NEVER hard-code ports** in code or commands.
- **ALWAYS use dynamic ports.**
- Call \`get_available_port\` first to reserve a port, then use that port in your commands and \`add_home_node("embed", ...)\`.

Voice workflow for building:
1. Say "I'm building [project name] now" then go quiet.
2. Call \`get_available_port()\` → Get \`PORT\`.
3. Call \`run_command\` to create the project directory: \`mkdir -p ~/.filegraph/sandbox/<project-name>\`.
4. Call \`write_file\` once per file.
5. Call \`run_command\` to start a dev server (injecting the reserved \`PORT\`) and \`add_home_node\` to add an embed preview (pointing to \`http://localhost:PORT\`) + terminal node.
6. Call \`verify_dev_project\` with the project path, reserved port, and terminal node ID.
7. Fix errors with \`edit_file\` and re-verify. Max 3 cycles.
8. Confirm to the user ONLY after verification passes.

For iterative improvements:
- Use \`edit_file\` with the FULL absolute path of the file.
- After editing, call \`verify_dev_project\` to confirm it works.
- Implement fully, verify, then confirm verbally.

**GUIDED VISUAL TOUR (Canvas Focus Pattern):**
Use \`focus_home_node\` to guide the user's eye through the canvas while you work. This is what makes voice mode feel magical:
- Before editing a file → \`focus_home_node\` on that codeBlock node
- After editing → \`focus_home_node\` on the same node to show the change
- After \`verify_dev_project\` passes → the tool auto-zooms to the preview; no extra call needed
- After writing all files → call \`focus_home_node\` on the embed node to show the live preview

**WORK SUMMARY (MANDATORY after any build or edit):**
After completing work, always tell the user:
1. What you built or changed (brief, conversational)
2. How to use it — say the controls out loud: "arrow keys to move, space to jump"
3. 2-3 things they could add or try next
4. Ask what they'd like to do

Keep it short and natural for voice. Never just say "done" and go silent.
`

    const systemContext = getSystemContext()
    prompt += `\n\n${formatSystemContextForPrompt(systemContext)}`

    return prompt
  }, [])

  // ─────────────────────────────────────────────────────────────────────────
  // Start Live Mode
  // ─────────────────────────────────────────────────────────────────────────

  const startLiveMode = useCallback(async () => {
    if (sessionState !== 'idle' && sessionState !== 'error') return

    setError(null)
    setSessionState('connecting')
    setWorkPhase('connecting')

    try {
      // Get API key — try ephemeral token first, fall back to env variable
      let apiKey: string | undefined

      // Try to get stored Gemini API key from agent app store
      const storedKey = localStorage.getItem('filegraph-agent-app-store')
      if (storedKey) {
        try {
          const parsed = JSON.parse(storedKey)
          const modelConfig = parsed?.state?.modelConfig
          if (modelConfig?.provider === 'gemini' && modelConfig?.apiKey) {
            apiKey = modelConfig.apiKey
          }
        } catch {
          // Ignore parse errors
        }
      }

      // Fall back to env variable
      if (!apiKey) {
        apiKey = import.meta.env.VITE_GEMINI_API_KEY
      }

      if (!apiKey) {
        throw new Error(
          'Gemini API key not configured. Add it in Settings → Agent, or set VITE_GEMINI_API_KEY.',
        )
      }

      // Try to get ephemeral token from Tauri backend
      let sessionApiKey = apiKey
      try {
        const token = await invoke<{ name: string; expire_time: string }>(
          'get_ephemeral_token',
          { apiKey },
        )
        sessionApiKey = token.name
        console.debug('[LiveAgent] Using ephemeral token, expires:', token.expire_time)
      } catch (err) {
        console.warn('[LiveAgent] Ephemeral token failed, using API key directly:', err)
        // Continue with direct API key (works but less secure)
      }

      // Initialize audio engine
      const audioEngine = new AudioEngine()
      audioEngineRef.current = audioEngine

      // Build session config
      const systemInstruction = buildSystemInstruction()
      const tools = getGeminiFunctionDeclarations()

      console.log('[LiveAgent] Creating LiveSession...')

      // Initialize live session with event handlers
      const liveSession = new LiveSession({
        config: {
          model: DEFAULT_LIVE_MODEL,
          voiceName: DEFAULT_LIVE_VOICE,
          systemInstruction,
          tools,
          apiKey: sessionApiKey,
          enableInputTranscription: true,
          enableOutputTranscription: true,
        },
        events: {
          onStateChange: (state) => {
            setSessionState(state)
          },
          onAudioData: (base64Pcm) => {
            audioEngine.enqueuePlayback(base64Pcm)
            setWorkPhase('speaking')
          },
          onInterrupted: () => {
            audioEngine.flushPlayback()
            setWorkPhase('listening')
            // Finalize current output transcript
            if (currentOutputTranscriptRef.current) {
              updateLastTranscript('model', currentOutputTranscriptRef.current, true)
              currentOutputTranscriptRef.current = ''
            }
          },
          onInputTranscript: (text) => {
            currentInputTranscriptRef.current += text
            updateLastTranscript('user', currentInputTranscriptRef.current, false)
            setWorkPhase('thinking') // User speech received — model is now processing
          },
          onOutputTranscript: (text) => {
            currentOutputTranscriptRef.current += text
            updateLastTranscript('model', currentOutputTranscriptRef.current, false)
            setWorkPhase('speaking')
          },
          onToolCall: async (functionCalls: LiveFunctionCall[]) => {
            const toolNames = functionCalls.map((fc) => fc.name)
            setActiveToolCalls(toolNames)
            setWorkPhase('tool_calling')

            try {
              const results = await executeLiveToolCalls(functionCalls)
              liveSession.sendToolResponse(results)
            } catch (err) {
              console.error('[LiveAgent] Tool execution error:', err)
              // Send error responses so the model can continue
              const errorResults = functionCalls.map((fc) => ({
                id: fc.id,
                name: fc.name,
                response: { error: err instanceof Error ? err.message : String(err) },
              }))
              liveSession.sendToolResponse(errorResults)
            } finally {
              setActiveToolCalls([])
              setWorkPhase('thinking') // Waiting for model to process tool result
            }
          },
          onTurnComplete: () => {
            setWorkPhase('listening')
            // Finalize in-session transcript display
            if (currentInputTranscriptRef.current) {
              updateLastTranscript('user', currentInputTranscriptRef.current, true)
            }
            if (currentOutputTranscriptRef.current) {
              updateLastTranscript('model', currentOutputTranscriptRef.current, true)
            }

            // ── Sync finalized turn to the shared channel store ──
            const channelId = useAgentAppStore.getState().activeChannelId
            if (channelId) {
              if (currentInputTranscriptRef.current.trim()) {
                useAgentAppStore.getState().addMessage(channelId, {
                  role: 'user',
                  content: currentInputTranscriptRef.current.trim(),
                  source: 'voice',
                })
              }
              if (currentOutputTranscriptRef.current.trim()) {
                useAgentAppStore.getState().addMessage(channelId, {
                  role: 'assistant',
                  content: currentOutputTranscriptRef.current.trim(),
                  source: 'voice',
                })
              }
            }

            currentInputTranscriptRef.current = ''
            currentOutputTranscriptRef.current = ''
          },
          onError: (err) => {
            setError(err.message)
            setWorkPhase('error')
          },
          onConnected: async () => {
            console.log('[LiveAgent] ✅ onConnected fired')
            setWorkPhase('listening')

            // ── Inject recent chat history (last 4 turns, 120 chars each) ──
            // Keeping this small avoids context-window overflow that kills the session
            // before the user's first voice turn. The sliding-window compression only
            // applies to the session's own incremental context, not bulk injections.
            try {
              const storeState = useAgentAppStore.getState()
              const channelMessages = storeState.getActiveMessages()
              const LOOK_BACK = 4
              const MAX_CHARS = 120
              const historyTurns = channelMessages
                .filter((m) => {
                  if (m.role !== 'user' && m.role !== 'assistant') return false
                  if (!m.content?.trim()) return false
                  // Skip messages that look like raw tool results (JSON blobs)
                  const c = m.content.trimStart()
                  if (c.startsWith('{') || c.startsWith('[')) return false
                  return true
                })
                .slice(-LOOK_BACK)
                .map((m) => ({
                  role: m.role === 'assistant' ? 'model' : 'user',
                  parts: [{ text: m.content.slice(0, MAX_CHARS) }],
                }))

              if (historyTurns.length > 0) {
                console.log(`[LiveAgent] Injecting ${historyTurns.length} history turns (capped) into Live session`)
                liveSession.sendClientContent(historyTurns)
              }
            } catch (histErr) {
              console.warn('[LiveAgent] Failed to inject chat history:', histErr)
            }

            // ── Start mic capture after history is injected ──
            try {
              await audioEngine.startMicCapture({
                onAudioChunk: (base64Pcm, mimeType) => {
                  liveSession.sendAudio(base64Pcm, mimeType)
                },
              })
              console.log('[LiveAgent] ✅ Mic capture started, audio flowing to Gemini')
              startLevelPolling()
            } catch (micErr) {
              console.error('[LiveAgent] Mic capture failed after connect:', micErr)
              setError(micErr instanceof Error ? micErr.message : String(micErr))
            }
          },
          onDisconnected: (reason) => {
            console.debug('[LiveAgent] Disconnected:', reason)
            // Auto-reconnect on unexpected disconnects (not user-initiated stop)
            // A user stop calls liveSession.disconnect() which nulls liveSessionRef first.
            if (liveSessionRef.current === liveSession) {
              const isExpected = reason === 'User disconnected'
              if (!isExpected) {
                console.warn('[LiveAgent] Unexpected disconnect — attempting reconnect in 2s:', reason)
                setTimeout(async () => {
                  if (liveSessionRef.current !== liveSession) return // user stopped in the meantime
                  try {
                    setSessionState('connecting')
                    await liveSession.connect()
                    console.log('[LiveAgent] ✅ Reconnected after unexpected disconnect')
                  } catch (reconnErr) {
                    console.error('[LiveAgent] Reconnect failed:', reconnErr)
                    setSessionState('error')
                    setError('Connection lost. Please start Live Mode again.')
                  }
                }, 2000)
              }
            }
          },
          onResumptionUpdate: (handle) => {
            console.debug('[LiveAgent] Resumption handle updated')
          },
        },
      })

      liveSessionRef.current = liveSession

      // Connect to Gemini Live API
      // NOTE: mic capture and level polling start inside onConnected to avoid
      // the race condition where ai.live.connect() resolves before onopen fires.
      console.log('[LiveAgent] Awaiting liveSession.connect()...')
      await liveSession.connect()
      console.log('[LiveAgent] liveSession.connect() resolved')
    } catch (err) {
      console.error('[LiveAgent] Failed to start:', err)
      setError(err instanceof Error ? err.message : String(err))
      setSessionState('error')

      // Cleanup on failure
      audioEngineRef.current?.destroy()
      audioEngineRef.current = null
      liveSessionRef.current?.disconnect()
      liveSessionRef.current = null
    }
  }, [sessionState, buildSystemInstruction, startLevelPolling, updateLastTranscript])

  // ─────────────────────────────────────────────────────────────────────────
  // Stop Live Mode
  // ─────────────────────────────────────────────────────────────────────────

  const stopLiveMode = useCallback(() => {
    stopLevelPolling()

    // ── Flush any in-progress partial transcripts to the channel before stopping ──
    const channelId = useAgentAppStore.getState().activeChannelId
    if (channelId) {
      if (currentInputTranscriptRef.current.trim()) {
        useAgentAppStore.getState().addMessage(channelId, {
          role: 'user',
          content: currentInputTranscriptRef.current.trim(),
          source: 'voice',
        })
      }
      if (currentOutputTranscriptRef.current.trim()) {
        useAgentAppStore.getState().addMessage(channelId, {
          role: 'assistant',
          content: currentOutputTranscriptRef.current.trim(),
          source: 'voice',
        })
      }
    }

    liveSessionRef.current?.disconnect()
    liveSessionRef.current = null

    audioEngineRef.current?.destroy()
    audioEngineRef.current = null

    currentInputTranscriptRef.current = ''
    currentOutputTranscriptRef.current = ''

    setSessionState('idle')
    setWorkPhase('idle')
    setError(null)
    setActiveToolCalls([])
    setIsMuted(false)
  }, [stopLevelPolling])

  // ─────────────────────────────────────────────────────────────────────────
  // Toggle Mute
  // ─────────────────────────────────────────────────────────────────────────

  const toggleMute = useCallback(() => {
    const newMuted = !isMuted
    setIsMuted(newMuted)
    audioEngineRef.current?.setMuted(newMuted)

    // Signal audio stream pause/resume to the API
    if (newMuted) {
      liveSessionRef.current?.sendAudioStreamEnd()
    }
  }, [isMuted])

  // ─────────────────────────────────────────────────────────────────────────
  // Send Text (hybrid mode)
  // ─────────────────────────────────────────────────────────────────────────

  const sendText = useCallback((text: string) => {
    if (!liveSessionRef.current) return

    // Add to transcript
    addTranscript('user', text, true)

    // Send via the live session
    liveSessionRef.current.sendText(text)
  }, [addTranscript])

  // ─────────────────────────────────────────────────────────────────────────
  // Clear Transcripts
  // ─────────────────────────────────────────────────────────────────────────

  const clearTranscripts = useCallback(() => {
    setTranscripts([])
  }, [])

  // ─────────────────────────────────────────────────────────────────────────
  // Cleanup on unmount
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      stopLevelPolling()
      liveSessionRef.current?.disconnect()
      audioEngineRef.current?.destroy()
    }
  }, [stopLevelPolling])

  return {
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
    sendText,
    clearTranscripts,
  }
}
