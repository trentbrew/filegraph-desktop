/**
 * Audio Engine for Live Mode
 *
 * Handles microphone capture (PCM 16kHz mono) and speaker playback (PCM 24kHz mono)
 * using the Web Audio API. The mic capture uses ScriptProcessorNode (deprecated but
 * reliable in WebKit/Tauri) since AudioWorkletNode's process() is not invoked in
 * WKWebView even with a complete graph path to destination.
 *
 * Key features:
 * - Mic capture → base64 PCM chunks at ~100ms intervals
 * - Queue-based playback with immediate flush for VAD interruption
 * - Real-time RMS levels for visualizer (input + output)
 */

import {
  AUDIO_INPUT_SAMPLE_RATE,
  AUDIO_OUTPUT_SAMPLE_RATE,
  AUDIO_INPUT_MIME_TYPE,
  type AudioEngineState,
} from './types'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface AudioEngineCallbacks {
  /** Called with base64-encoded PCM chunk from microphone */
  onAudioChunk: (base64Pcm: string, mimeType: string) => void
}

// ─────────────────────────────────────────────────────────────────────────────
// Audio Engine Class
// ─────────────────────────────────────────────────────────────────────────────

export class AudioEngine {
  // Mic capture
  private micStream: MediaStream | null = null
  private inputContext: AudioContext | null = null
  private scriptProcessor: ScriptProcessorNode | null = null
  private captureBuffer: number[] = []
  private inputAnalyser: AnalyserNode | null = null
  private inputAnalyserData: Float32Array<ArrayBuffer> | null = null

  // Playback
  private outputContext: AudioContext | null = null
  private outputGain: GainNode | null = null
  private outputAnalyser: AnalyserNode | null = null
  private outputAnalyserData: Float32Array<ArrayBuffer> | null = null
  private playbackQueue: AudioBufferSourceNode[] = []
  private nextPlaybackTime: number = 0

  // State
  private _isMicActive = false
  private _isMuted = false
  private _isPlaying = false
  private callbacks: AudioEngineCallbacks | null = null

  // Stats
  private _statsInterval: ReturnType<typeof setInterval> | null = null
  private _statsChunksSinceLastLog = 0
  private _statsRmsSum = 0

  // ─────────────────────────────────────────────────────────────────────────
  // Public API
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Start capturing microphone audio. Requests permission if needed.
   * Audio chunks are delivered via the onAudioChunk callback as base64 PCM.
   */
  async startMicCapture(callbacks: AudioEngineCallbacks): Promise<void> {
    if (this._isMicActive) return
    this.callbacks = callbacks

    try {
      // Request mic permission
      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: AUDIO_INPUT_SAMPLE_RATE,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })

      // Create AudioContext at the input sample rate
      this.inputContext = new AudioContext({ sampleRate: AUDIO_INPUT_SAMPLE_RATE })
      console.log(
        '[AudioEngine] AudioContext created — requested sampleRate:',
        AUDIO_INPUT_SAMPLE_RATE,
        'actual sampleRate:',
        this.inputContext.sampleRate,
        'state:',
        this.inputContext.state,
      )
      if (this.inputContext.sampleRate !== AUDIO_INPUT_SAMPLE_RATE) {
        console.warn(
          '[AudioEngine] ⚠️ Sample rate mismatch! Audio will be sent at',
          this.inputContext.sampleRate,
          'Hz but labeled as',
          AUDIO_INPUT_SAMPLE_RATE,
          'Hz — Gemini may not understand the audio.',
        )
      }

      // Resume AudioContext (required by browser security policy)
      if (this.inputContext.state === 'suspended') {
        await this.inputContext.resume()
        console.log('[AudioEngine] ✅ AudioContext resumed, state:', this.inputContext.state)
      }

      // Create source from mic stream
      const source = this.inputContext.createMediaStreamSource(this.micStream)

      // Create analyser for input level metering
      this.inputAnalyser = this.inputContext.createAnalyser()
      this.inputAnalyser.fftSize = 256
      this.inputAnalyserData = new Float32Array(this.inputAnalyser.fftSize) as Float32Array<ArrayBuffer>

      // ScriptProcessorNode for PCM capture.
      // AudioWorkletNode's process() is never invoked in WKWebView (Tauri/macOS)
      // even with a complete graph path to destination. ScriptProcessorNode is
      // deprecated but fires onaudioprocess reliably in all WebKit environments.
      const scriptBufferSize = 4096 // ~256ms at 16kHz
      this.scriptProcessor = this.inputContext.createScriptProcessor(scriptBufferSize, 1, 1)
      this.captureBuffer = []
      const chunkSize = 1600 // 100ms at 16kHz
      let _chunkCount = 0

      this.scriptProcessor.onaudioprocess = (event) => {
        if (!this._isMicActive) return
        const inputData = event.inputBuffer.getChannelData(0)

        for (let i = 0; i < inputData.length; i++) {
          this.captureBuffer.push(inputData[i])
        }

        while (this.captureBuffer.length >= chunkSize) {
          const chunk = this.captureBuffer.splice(0, chunkSize)
          this._statsChunksSinceLastLog++
          _chunkCount++
          if (_chunkCount === 1) {
            console.log('[AudioEngine] ✅ First audio chunk from ScriptProcessorNode, muted:', this._isMuted)
          }
          if (this._isMuted) return

          // Float32 → Int16 PCM
          const int16 = new Int16Array(chunkSize)
          for (let i = 0; i < chunkSize; i++) {
            const s = Math.max(-1, Math.min(1, chunk[i]))
            int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff
          }

          // Int16 → base64
          const bytes = new Uint8Array(int16.buffer)
          let binary = ''
          for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i])
          }
          this.callbacks?.onAudioChunk(btoa(binary), AUDIO_INPUT_MIME_TYPE)
        }
      }

      // Periodic stats log every 5s
      this._statsInterval = setInterval(() => {
        const rms = this.getInputLevel()
        console.log(
          `[AudioEngine] 📊 chunks/5s: ${this._statsChunksSinceLastLog}`,
          `| RMS: ${rms.toFixed(4)}`,
          `| muted: ${this._isMuted}`,
        )
        this._statsChunksSinceLastLog = 0
      }, 5000)

      // Connect: source → analyser → scriptProcessor → destination
      // scriptProcessor MUST connect to destination for onaudioprocess to fire.
      source.connect(this.inputAnalyser)
      this.inputAnalyser.connect(this.scriptProcessor)
      this.scriptProcessor.connect(this.inputContext.destination)

      this._isMicActive = true
    } catch (err) {
      this.cleanupMic()
      throw err
    }
  }

  /**
   * Stop microphone capture and release resources.
   */
  stopMicCapture(): void {
    this._isMicActive = false
    this._isMuted = false
    this.cleanupMic()
  }

  /**
   * Mute/unmute the microphone. When muted, audio chunks are still captured
   * but not sent to the callback.
   */
  setMuted(muted: boolean): void {
    this._isMuted = muted
  }

  /**
   * Enqueue a base64-encoded PCM audio chunk for playback (24kHz, 16-bit, mono).
   */
  enqueuePlayback(base64Pcm: string): void {
    if (!this.outputContext) {
      this.initPlaybackContext()
    }
    const ctx = this.outputContext!

    // Decode base64 to Int16 PCM
    const binaryString = atob(base64Pcm)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    const int16 = new Int16Array(bytes.buffer)

    // Convert Int16 to Float32 for Web Audio
    const float32 = new Float32Array(int16.length)
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 32768
    }

    // Create AudioBuffer
    const buffer = ctx.createBuffer(1, float32.length, AUDIO_OUTPUT_SAMPLE_RATE)
    buffer.copyToChannel(float32, 0)

    // Create source node
    const source = ctx.createBufferSource()
    source.buffer = buffer

    // Connect through gain + analyser
    source.connect(this.outputGain!)
    source.onended = () => {
      const idx = this.playbackQueue.indexOf(source)
      if (idx !== -1) this.playbackQueue.splice(idx, 1)
      if (this.playbackQueue.length === 0) {
        this._isPlaying = false
      }
    }

    // Schedule playback
    const now = ctx.currentTime
    if (this.nextPlaybackTime < now) {
      this.nextPlaybackTime = now
    }
    source.start(this.nextPlaybackTime)
    this.nextPlaybackTime += buffer.duration

    this.playbackQueue.push(source)
    this._isPlaying = true
  }

  /**
   * Immediately stop all queued and playing audio. Used when VAD detects
   * user speech (interruption).
   */
  flushPlayback(): void {
    for (const source of this.playbackQueue) {
      try {
        source.stop()
        source.disconnect()
      } catch {
        // Already stopped
      }
    }
    this.playbackQueue = []
    this.nextPlaybackTime = 0
    this._isPlaying = false
  }

  /**
   * Get the current input (mic) audio level as RMS (0-1).
   */
  getInputLevel(): number {
    if (!this.inputAnalyser || !this.inputAnalyserData) return 0
    this.inputAnalyser.getFloatTimeDomainData(this.inputAnalyserData)
    return computeRMS(this.inputAnalyserData)
  }

  /**
   * Get the current output (speaker) audio level as RMS (0-1).
   */
  getOutputLevel(): number {
    if (!this.outputAnalyser || !this.outputAnalyserData) return 0
    this.outputAnalyser.getFloatTimeDomainData(this.outputAnalyserData)
    return computeRMS(this.outputAnalyserData)
  }

  /**
   * Get a snapshot of the current engine state.
   */
  getState(): AudioEngineState {
    return {
      isMicActive: this._isMicActive,
      isMuted: this._isMuted,
      isPlaying: this._isPlaying,
      inputLevel: this.getInputLevel(),
      outputLevel: this.getOutputLevel(),
    }
  }

  /**
   * Fully shut down all audio resources.
   */
  destroy(): void {
    this.stopMicCapture()
    this.flushPlayback()
    if (this.outputContext) {
      this.outputContext.close().catch(() => {})
      this.outputContext = null
    }
    this.outputGain = null
    this.outputAnalyser = null
    this.outputAnalyserData = null
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Private
  // ─────────────────────────────────────────────────────────────────────────

  private initPlaybackContext(): void {
    this.outputContext = new AudioContext({ sampleRate: AUDIO_OUTPUT_SAMPLE_RATE })

    this.outputGain = this.outputContext.createGain()
    this.outputGain.gain.value = 1.0

    this.outputAnalyser = this.outputContext.createAnalyser()
    this.outputAnalyser.fftSize = 256
    this.outputAnalyserData = new Float32Array(this.outputAnalyser.fftSize) as Float32Array<ArrayBuffer>

    // Chain: source → gain → analyser → destination
    this.outputGain.connect(this.outputAnalyser)
    this.outputAnalyser.connect(this.outputContext.destination)

    this.nextPlaybackTime = 0
  }

  private cleanupMic(): void {
    if (this._statsInterval) {
      clearInterval(this._statsInterval)
      this._statsInterval = null
    }
    if (this.scriptProcessor) {
      this.scriptProcessor.disconnect()
      this.scriptProcessor.onaudioprocess = null
      this.scriptProcessor = null
    }
    this.captureBuffer = []
    if (this.inputAnalyser) {
      this.inputAnalyser.disconnect()
      this.inputAnalyser = null
    }
    this.inputAnalyserData = null
    if (this.inputContext) {
      this.inputContext.close().catch(() => {})
      this.inputContext = null
    }
    if (this.micStream) {
      this.micStream.getTracks().forEach((t) => t.stop())
      this.micStream = null
    }
    this.callbacks = null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function computeRMS(data: Float32Array<ArrayBuffer>): number {
  let sum = 0
  for (let i = 0; i < data.length; i++) {
    sum += data[i] * data[i]
  }
  return Math.sqrt(sum / data.length)
}
