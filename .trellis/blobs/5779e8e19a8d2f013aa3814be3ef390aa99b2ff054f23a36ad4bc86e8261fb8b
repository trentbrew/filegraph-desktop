/**
 * Live Session Manager
 *
 * Wraps the @google/genai Live API WebSocket connection.
 * Handles message routing, tool call dispatch, session resumption,
 * and reconnection on GoAway.
 */

import { GoogleGenAI, Modality } from '@google/genai'
import type { LiveModeConfig, LiveSessionEvents, LiveFunctionCall } from './types'
import { DEFAULT_LIVE_MODEL, DEFAULT_LIVE_VOICE } from './types'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface LiveSessionOptions {
  config: LiveModeConfig
  events: Partial<LiveSessionEvents>
}

// The SDK session type (not exported by @google/genai, so we use any)
type GeminiLiveSession = any

// ─────────────────────────────────────────────────────────────────────────────
// Live Session Class
// ─────────────────────────────────────────────────────────────────────────────

export class LiveSession {
  private ai: GoogleGenAI | null = null
  private session: GeminiLiveSession | null = null
  private events: Partial<LiveSessionEvents>
  private config: LiveModeConfig
  private resumptionHandle: string | null = null
  private isConnected = false
  private isReconnecting = false

  constructor(options: LiveSessionOptions) {
    this.config = options.config
    this.events = options.events
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Public API
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Connect to the Gemini Live API.
   */
  async connect(): Promise<void> {
    this.events.onStateChange?.('connecting')

    try {
      this.ai = new GoogleGenAI({ apiKey: this.config.apiKey })

      const sessionConfig: Record<string, any> = {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: this.config.voiceName || DEFAULT_LIVE_VOICE,
            },
          },
        },
        systemInstruction: this.config.systemInstruction,
        contextWindowCompression: { slidingWindow: {} },
      }

      // Only include session resumption when we have a previous handle
      if (this.resumptionHandle) {
        sessionConfig.sessionResumption = { handle: this.resumptionHandle }
      } else {
        sessionConfig.sessionResumption = {}
      }

      // Enable transcriptions
      if (this.config.enableOutputTranscription !== false) {
        sessionConfig.outputAudioTranscription = {}
      }
      if (this.config.enableInputTranscription !== false) {
        sessionConfig.inputAudioTranscription = {}
      }

      // Add tools if provided
      if (this.config.tools?.length) {
        sessionConfig.tools = this.config.tools
      }

      console.log('[LiveSession] Calling ai.live.connect...')
      this.session = await this.ai.live.connect({
        model: this.config.model || DEFAULT_LIVE_MODEL,
        config: sessionConfig,
        callbacks: {
          onopen: () => {
            console.log('[LiveSession] ✅ WebSocket opened — isConnected = true')
            this.isConnected = true
            this.isReconnecting = false
            this.events.onConnected?.()
            this.events.onStateChange?.('listening')
          },
          onmessage: (message: any) => {
            this.handleMessage(message)
          },
          onerror: (error: any) => {
            console.error('[LiveSession] WebSocket error:', error)
            this.events.onError?.(
              error instanceof Error ? error : new Error(error?.message || String(error)),
            )
            this.events.onStateChange?.('error')
          },
          onclose: (event: any) => {
            this.isConnected = false
            const reason = event?.reason || 'Connection closed'
            console.debug('[LiveSession] Closed:', reason)
            this.events.onDisconnected?.(reason)

            if (!this.isReconnecting) {
              this.events.onStateChange?.('idle')
            }
          },
        },
      })
    } catch (err) {
      console.error('[LiveSession] Connection failed:', err)
      this.events.onError?.(
        err instanceof Error ? err : new Error(String(err)),
      )
      this.events.onStateChange?.('error')
      throw err
    }
  }

  /**
   * Send a base64-encoded audio chunk to the Live API.
   */
  private _audioSendCount = 0
  private _audioDropCount = 0

  sendAudio(base64Pcm: string, mimeType: string): void {
    if (!this.session || !this.isConnected) {
      this._audioDropCount++
      if (this._audioDropCount === 1 || this._audioDropCount % 50 === 0) {
        console.warn(
          '[LiveSession] ⚠️ sendAudio dropped — session:',
          !!this.session,
          'isConnected:',
          this.isConnected,
          '(drop #' + this._audioDropCount + ')',
        )
      }
      return
    }

    try {
      this.session.sendRealtimeInput({
        audio: {
          data: base64Pcm,
          mimeType,
        },
      })
      this._audioSendCount++
      if (this._audioSendCount === 1) {
        console.log('[LiveSession] ✅ First audio chunk sent to Gemini, mimeType:', mimeType)
      } else if (this._audioSendCount % 100 === 0) {
        console.debug('[LiveSession] Audio send #' + this._audioSendCount)
      }
    } catch (err) {
      console.error('[LiveSession] Failed to send audio:', err)
    }
  }

  /**
   * Send text input alongside or instead of audio.
   * Supports hybrid text+voice interaction.
   */
  sendText(text: string): void {
    if (!this.session || !this.isConnected) return

    try {
      this.session.sendClientContent({
        turns: text,
        turnComplete: true,
      })
    } catch (err) {
      console.error('[LiveSession] Failed to send text:', err)
    }
  }

  /**
   * Inject multi-turn conversation history into the Live session.
   * Call with turnComplete: false to prime context without triggering a model response.
   * Used when switching from text chat → voice to preserve conversation continuity.
   */
  sendClientContent(
    turns: Array<{ role: string; parts: Array<{ text: string }> }>,
    turnComplete = false,
  ): void {
    if (!this.session || !this.isConnected) return

    try {
      this.session.sendClientContent({ turns, turnComplete })
    } catch (err) {
      console.error('[LiveSession] Failed to send client content:', err)
    }
  }

  /**
   * Send tool/function call responses back to the model.
   */
  sendToolResponse(
    functionResponses: Array<{
      id: string
      name: string
      response: Record<string, unknown>
    }>,
  ): void {
    if (!this.session || !this.isConnected) return

    try {
      this.session.sendToolResponse({ functionResponses })
    } catch (err) {
      console.error('[LiveSession] Failed to send tool response:', err)
    }
  }

  /**
   * Signal that the audio stream has paused (e.g., mic muted).
   */
  sendAudioStreamEnd(): void {
    if (!this.session || !this.isConnected) return

    try {
      this.session.sendRealtimeInput({ audioStreamEnd: true })
    } catch (err) {
      console.debug('[LiveSession] Failed to send audioStreamEnd:', err)
    }
  }

  /**
   * Disconnect from the Live API.
   */
  disconnect(): void {
    this.isReconnecting = false
    if (this.session) {
      try {
        this.session.close()
      } catch {
        // Already closed
      }
      this.session = null
    }
    this.isConnected = false
    this.ai = null
    this.events.onStateChange?.('idle')
    this.events.onDisconnected?.('User disconnected')
  }

  /**
   * Check if the session is currently connected.
   */
  getIsConnected(): boolean {
    return this.isConnected
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Message Handling
  // ─────────────────────────────────────────────────────────────────────────

  private _msgCount = 0

  private handleMessage(message: any): void {
    this._msgCount++
    if (this._msgCount === 1) {
      console.log('[LiveSession] ✅ First server message received:', JSON.stringify(message).slice(0, 200))
    } else if (this._msgCount <= 5 || this._msgCount % 50 === 0) {
      const keys = Object.keys(message)
      console.debug('[LiveSession] Server msg #' + this._msgCount, 'keys:', keys)
    }

    // --- Audio data from model ---
    if (message.serverContent?.modelTurn?.parts) {
      for (const part of message.serverContent.modelTurn.parts) {
        if (part.inlineData?.data) {
          console.debug('[LiveSession] Audio response received from Gemini')
          this.events.onStateChange?.('speaking')
          this.events.onAudioData?.(part.inlineData.data)
        }
      }
    }

    // --- Interruption (user started speaking while model was talking) ---
    if (message.serverContent?.interrupted) {
      console.debug('[LiveSession] Interrupted by user speech')
      this.events.onInterrupted?.()
      this.events.onStateChange?.('listening')
    }

    // --- Turn complete (model finished responding) ---
    if (message.serverContent?.turnComplete) {
      console.debug('[LiveSession] Turn complete')
      this.events.onTurnComplete?.()
      this.events.onStateChange?.('listening')
    }

    // --- Output transcription ---
    if (message.serverContent?.outputTranscription?.text) {
      console.debug('[LiveSession] Output transcript:', message.serverContent.outputTranscription.text)
      this.events.onOutputTranscript?.(message.serverContent.outputTranscription.text)
    }

    // --- Input transcription ---
    if (message.serverContent?.inputTranscription?.text) {
      console.debug('[LiveSession] Input transcript:', message.serverContent.inputTranscription.text)
      this.events.onInputTranscript?.(message.serverContent.inputTranscription.text)
    }

    // --- Tool calls ---
    if (message.toolCall?.functionCalls) {
      this.events.onStateChange?.('tooling')
      const calls: LiveFunctionCall[] = message.toolCall.functionCalls.map(
        (fc: any) => ({
          id: fc.id,
          name: fc.name,
          args: fc.args || {},
        }),
      )
      this.events.onToolCall?.(calls)
    }

    // --- Session resumption handle ---
    if (message.sessionResumptionUpdate) {
      const update = message.sessionResumptionUpdate
      if (update.resumable && update.newHandle) {
        this.resumptionHandle = update.newHandle
        this.events.onResumptionUpdate?.(update.newHandle)
      }
    }

    // --- GoAway (server wants to disconnect soon) ---
    if (message.goAway) {
      console.warn(
        '[LiveSession] GoAway received, time left:',
        message.goAway.timeLeft,
      )
      // Auto-reconnect with resumption handle
      this.reconnect()
    }

    // --- Usage metadata (for logging) ---
    if (message.usageMetadata) {
      console.debug(
        '[LiveSession] Token usage:',
        message.usageMetadata.totalTokenCount,
      )
    }
  }

  /**
   * Attempt to reconnect using the stored resumption handle.
   */
  private async reconnect(): Promise<void> {
    if (this.isReconnecting || !this.resumptionHandle) return
    this.isReconnecting = true

    console.debug('[LiveSession] Reconnecting with handle:', this.resumptionHandle)

    // Close current session gracefully
    if (this.session) {
      try {
        this.session.close()
      } catch {
        // Ignore
      }
      this.session = null
    }

    // Small delay before reconnecting
    await new Promise((resolve) => setTimeout(resolve, 500))

    try {
      await this.connect()
    } catch (err) {
      console.error('[LiveSession] Reconnection failed:', err)
      this.isReconnecting = false
      this.events.onStateChange?.('error')
    }
  }
}
