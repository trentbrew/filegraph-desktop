import { BrowserStatus, BrowserTab, CdpTarget, CdpVersion, ConnectionState, DEFAULT_CONFIG, OpenClawConfig, OAuthFlowOptions, OAuthFlowResult } from './types'

type EventCallback = (...args: unknown[]) => void

export class OpenClawClient {
  private config: OpenClawConfig
  private state: ConnectionState = 'disconnected'
  private eventListeners: Map<string, Set<EventCallback>> = new Map()

  constructor(config: Partial<OpenClawConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  async connect(): Promise<void> {
    if (this.state === 'connected' || this.state === 'connecting') return

    this.state = 'connecting'
    this.emit('stateChange', this.state)

    try {
      await this.getVersion()
      this.state = 'connected'
      this.emit('stateChange', this.state)
      this.emit('connect')
    } catch (err) {
      this.state = 'error'
      this.emit('stateChange', this.state)
      const error = err instanceof Error ? err : new Error(String(err))
      this.emit('error', error)
      throw error
    }
  }

  disconnect(): void {
    this.state = 'disconnected'
    this.emit('stateChange', this.state)
    this.emit('disconnect', 'Disconnected')
  }

  on(event: string, callback: EventCallback): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set())
    }
    this.eventListeners.get(event)!.add(callback)

    return () => {
      this.eventListeners.get(event)?.delete(callback)
    }
  }

  private emit(event: string, ...args: unknown[]): void {
    this.eventListeners.get(event)?.forEach((callback) => {
      try {
        callback(...args)
      } catch (error) {
        console.error(`[OpenClaw] Event handler error for ${event}:`, error)
      }
    })
  }

  private getBaseUrl(): string {
    return this.config.cdpHttpUrl.replace(/\/+$/, '')
  }

  private async fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
    const url = `${this.getBaseUrl()}${path}`
    const resp = await fetch(url, init)
    if (!resp.ok) {
      throw new Error(`CDP HTTP error ${resp.status}: ${resp.statusText}`)
    }
    return (await resp.json()) as T
  }

  async getVersion(): Promise<CdpVersion> {
    return await this.fetchJson<CdpVersion>('/json/version')
  }

  async listTargets(): Promise<CdpTarget[]> {
    return await this.fetchJson<CdpTarget[]>('/json/list')
  }

  async createTab(url: string): Promise<CdpTarget> {
    const encoded = encodeURIComponent(url)
    return await this.fetchJson<CdpTarget>(`/json/new?${encoded}`, { method: 'PUT' })
  }

  async closeTab(id: string): Promise<void> {
    const resp = await fetch(`${this.getBaseUrl()}/json/close/${encodeURIComponent(id)}`)
    if (!resp.ok) {
      throw new Error(`Failed to close tab: ${resp.status} ${resp.statusText}`)
    }
  }

  async browserStatus(): Promise<BrowserStatus> {
    const version = await this.getVersion()
    const tabs = await this.listTargets()
    return {
      running: true,
      cdpHttpUrl: this.getBaseUrl(),
      browser: version.Browser,
      tabs: tabs.length,
    }
  }

  async browserTabs(): Promise<BrowserTab[]> {
    const targets = await this.listTargets()
    return targets
      .filter((t) => t.type === 'page')
      .map((t) => ({
        id: t.id,
        title: t.title,
        url: t.url,
      }))
  }

  async browserOpen(url: string): Promise<string> {
    const target = await this.createTab(url)
    return target.id
  }

  async performOAuthFlow(options: OAuthFlowOptions): Promise<OAuthFlowResult> {
    const { authUrl, callbackUrlPattern, timeoutMs = 120000 } = options

    try {
      const tabId = await this.browserOpen(authUrl)

      const startTime = Date.now()
      const callbackRegex = new RegExp(callbackUrlPattern)

      while (Date.now() - startTime < timeoutMs) {
        const targets = await this.listTargets()
        const tab = targets.find((t) => t.id === tabId)

        if (tab && callbackRegex.test(tab.url)) {
          const url = new URL(tab.url)
          const code = url.searchParams.get('code')
          const state = url.searchParams.get('state')
          const error = url.searchParams.get('error')

          if (error) {
            return {
              success: false,
              callbackUrl: tab.url,
              error: url.searchParams.get('error_description') || error,
            }
          }

          return {
            success: true,
            callbackUrl: tab.url,
            code: code || undefined,
            state: state || undefined,
          }
        }

        await new Promise((resolve) => setTimeout(resolve, 1000))
      }

      return { success: false, error: 'OAuth flow timed out' }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  getState(): ConnectionState {
    return this.state
  }

  isConnected(): boolean {
    return this.state === 'connected'
  }
}

// Singleton instance
let clientInstance: OpenClawClient | null = null

export function getOpenClawClient(config?: Partial<OpenClawConfig>): OpenClawClient {
  if (!clientInstance) {
    clientInstance = new OpenClawClient(config)
  }
  return clientInstance
}

export function resetOpenClawClient(): void {
  if (clientInstance) {
    clientInstance.disconnect()
    clientInstance = null
  }
}
