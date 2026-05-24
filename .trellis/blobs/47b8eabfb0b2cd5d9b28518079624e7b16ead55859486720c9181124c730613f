/**
 * Live Mode Types
 *
 * Type definitions for Gemini Live API integration.
 * Covers session state, audio configuration, transcripts, and events.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Session State
// ─────────────────────────────────────────────────────────────────────────────

export type LiveSessionState =
  | 'idle'        // Not connected
  | 'connecting'  // WebSocket handshake in progress
  | 'listening'   // Connected, mic active, waiting for user speech
  | 'speaking'    // Model is generating audio response
  | 'tooling'     // Executing tool calls from the model
  | 'error'       // Connection or runtime error

// ─────────────────────────────────────────────────────────────────────────────
// Audio Configuration
// ─────────────────────────────────────────────────────────────────────────────

/** Input audio: 16-bit PCM, 16kHz, mono */
export const AUDIO_INPUT_SAMPLE_RATE = 16000
export const AUDIO_INPUT_CHANNELS = 1
export const AUDIO_INPUT_BIT_DEPTH = 16

/** Output audio: 16-bit PCM, 24kHz, mono */
export const AUDIO_OUTPUT_SAMPLE_RATE = 24000
export const AUDIO_OUTPUT_CHANNELS = 1

/** How often to send mic audio chunks to the API (ms) */
export const AUDIO_CHUNK_INTERVAL_MS = 100

/** MIME type for PCM audio sent to the API */
export const AUDIO_INPUT_MIME_TYPE = `audio/pcm;rate=${AUDIO_INPUT_SAMPLE_RATE}`

// ─────────────────────────────────────────────────────────────────────────────
// Transcript
// ─────────────────────────────────────────────────────────────────────────────

export interface TranscriptEntry {
  id: string
  role: 'user' | 'model'
  text: string
  timestamp: number
  isFinal: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// Live Mode Configuration
// ─────────────────────────────────────────────────────────────────────────────

export interface LiveModeConfig {
  /** Gemini model ID for Live API */
  model: string
  /** Voice name for speech output */
  voiceName: string
  /** System instruction for the agent */
  systemInstruction: string
  /** Gemini function declarations for tool calling */
  tools: Array<{
    functionDeclarations: Array<{
      name: string
      description: string
      parameters: Record<string, unknown>
    }>
  }>
  /** API key or ephemeral token */
  apiKey: string
  /** Enable input audio transcription */
  enableInputTranscription?: boolean
  /** Enable output audio transcription */
  enableOutputTranscription?: boolean
}

/** Default model for Live API (native audio output) */
export const DEFAULT_LIVE_MODEL = 'gemini-2.5-flash-native-audio-preview-12-2025'

/** Available voice options */
export const LIVE_VOICES = [
  'Kore',
  'Aoede',
  'Charon',
  'Fenrir',
  'Leda',
  'Orus',
  'Puck',
  'Zephyr',
] as const

export type LiveVoice = (typeof LIVE_VOICES)[number]

export const DEFAULT_LIVE_VOICE: LiveVoice = 'Kore'

// ─────────────────────────────────────────────────────────────────────────────
// Session Events (emitted by LiveSession)
// ─────────────────────────────────────────────────────────────────────────────

export interface LiveSessionEvents {
  /** Raw audio data to play (base64 PCM 24kHz) */
  onAudioData: (base64Pcm: string) => void
  /** Model's audio output was interrupted by user speech */
  onInterrupted: () => void
  /** Input transcription update */
  onInputTranscript: (text: string) => void
  /** Output transcription update */
  onOutputTranscript: (text: string) => void
  /** Tool call request from the model */
  onToolCall: (functionCalls: LiveFunctionCall[]) => void
  /** Session state changed */
  onStateChange: (state: LiveSessionState) => void
  /** Session resumption handle updated */
  onResumptionUpdate: (handle: string) => void
  /** Error occurred */
  onError: (error: Error) => void
  /** Turn completed (model finished speaking) */
  onTurnComplete: () => void
  /** Session connected */
  onConnected: () => void
  /** Session disconnected */
  onDisconnected: (reason?: string) => void
}

export interface LiveFunctionCall {
  id: string
  name: string
  args: Record<string, unknown>
}

// ─────────────────────────────────────────────────────────────────────────────
// Audio Engine Types
// ─────────────────────────────────────────────────────────────────────────────

export interface AudioEngineState {
  isMicActive: boolean
  isMuted: boolean
  isPlaying: boolean
  inputLevel: number   // 0-1 RMS
  outputLevel: number  // 0-1 RMS
}
