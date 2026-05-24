/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CANVAS_PERF_HUD?: string
}

declare module 'mammoth/mammoth.browser' {
  export interface MammothMessage {
    type: string
    message?: string
  }

  export interface MammothResult {
    value: string
    messages?: MammothMessage[]
  }

  export function convertToHtml(options: { arrayBuffer: ArrayBuffer }): Promise<MammothResult>
}
