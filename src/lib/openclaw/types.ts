/**
 * OpenClaw Gateway Integration Types
 *
 * OpenClaw uses a WebSocket-based control plane on port 18789.
 * Browser automation is done via CDP through the Browser Relay.
 *
 * Architecture:
 * - Gateway (ws://127.0.0.1:18789) - Main control plane
 * - Control Service (http://127.0.0.1:18791) - HTTP API for browser ops
 * - CDP Relay (port 18792) - WebSocket bridge to browsers
 * - Managed Browser (port 18800+) - Chrome instances
 */

export interface OpenClawConfig {
  cdpHttpUrl: string
  browserProfile?: string
}

export const DEFAULT_CONFIG: OpenClawConfig = {
  cdpHttpUrl: 'http://127.0.0.1:18800',
  browserProfile: 'openclaw',
}

export interface CdpVersion {
  Browser: string
  'Protocol-Version': string
  'User-Agent': string
  'V8-Version': string
  'WebKit-Version': string
  webSocketDebuggerUrl: string
}

export interface CdpTarget {
  id: string
  title: string
  url: string
  type: string
  webSocketDebuggerUrl: string
  devtoolsFrontendUrl?: string
  description?: string
}

// Browser status
export interface BrowserStatus {
  running: boolean
  cdpHttpUrl: string
  browser?: string
  tabs: number
}

// Tab info
export interface BrowserTab {
  id: string
  url: string
  title: string
}

// Element reference from snapshot
export interface ElementRef {
  ref: string // e.g., "e12"
  role: string // e.g., "textbox", "button", "link"
  name?: string // e.g., "Email", "Sign In"
  value?: string
  focused?: boolean
  disabled?: boolean
}

// Snapshot result
export interface BrowserSnapshot {
  url: string
  title: string
  elements: ElementRef[]
}

// Screenshot result
export interface BrowserScreenshot {
  data: string // base64
  format: 'png' | 'jpeg'
  width: number
  height: number
}

// Browser tool names
export type BrowserTool = never

export interface BrowserToolArgs {}

// Connection state
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error'

// Events emitted by the client
export interface OpenClawEvents {
  connect: () => void
  disconnect: (reason: string) => void
  error: (error: Error) => void
  browserEvent: (event: BrowserEvent) => void
}

export interface BrowserEvent {
  type: 'navigation' | 'load' | 'console' | 'error' | 'download'
  data: unknown
}

// OAuth flow helper types
export interface OAuthFlowOptions {
  authUrl: string
  callbackUrlPattern: string // Regex to detect OAuth callback
  timeoutMs?: number
}

export interface OAuthFlowResult {
  success: boolean
  callbackUrl?: string
  code?: string
  state?: string
  error?: string
}
