/**
 * PCM Capture AudioWorklet Processor
 *
 * Runs in a dedicated audio thread. Captures Float32 mic samples,
 * converts to Int16 PCM, and posts base64-encoded chunks to the main thread.
 *
 * Expected input: mono channel from getUserMedia (resampled to 16kHz by AudioContext)
 * Output: base64-encoded Int16 PCM chunks via MessagePort
 */

class PcmCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super()
    this._buffer = []
    // Send a chunk every ~100ms worth of samples at 16kHz = 1600 samples
    this._chunkSize = 1600
    this._stopped = false

    this.port.onmessage = (event) => {
      if (event.data.type === 'stop') {
        this._stopped = true
      }
    }
  }

  process(inputs) {
    if (this._stopped) return false

    const input = inputs[0]
    if (!input || !input[0]) return true

    const samples = input[0] // Float32Array, mono

    // Accumulate samples
    for (let i = 0; i < samples.length; i++) {
      this._buffer.push(samples[i])
    }

    // When we have enough, convert and send
    while (this._buffer.length >= this._chunkSize) {
      const chunk = this._buffer.splice(0, this._chunkSize)
      const int16 = this._float32ToInt16(chunk)
      const base64 = this._int16ToBase64(int16)

      this.port.postMessage({
        type: 'audio-chunk',
        data: base64,
      })
    }

    return true
  }

  /**
   * Convert Float32 samples (-1..1) to Int16 (-32768..32767)
   */
  _float32ToInt16(float32Array) {
    const int16 = new Int16Array(float32Array.length)
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]))
      int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff
    }
    return int16
  }

  /**
   * Encode Int16Array as base64 string
   */
  _int16ToBase64(int16Array) {
    const bytes = new Uint8Array(int16Array.buffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    // globalThis.btoa is available in AudioWorklet scope
    return globalThis.btoa(binary)
  }
}

registerProcessor('pcm-capture-processor', PcmCaptureProcessor)
