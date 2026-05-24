/**
 * React hook for OpenClaw Gateway integration
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { OpenClawClient, getOpenClawClient } from './client'
import {
  OpenClawConfig,
  ConnectionState,
  BrowserStatus,
  BrowserTab,
  BrowserSnapshot,
  BrowserScreenshot,
  OAuthFlowOptions,
  OAuthFlowResult,
} from './types'

export interface UseOpenClawOptions {
  autoConnect?: boolean
  config?: Partial<OpenClawConfig>
}

export interface UseOpenClawReturn {
  // Connection state
  state: ConnectionState
  isConnected: boolean
  error: Error | null

  // Connection controls
  connect: () => Promise<void>
  disconnect: () => void

  // Browser status
  browserStatus: BrowserStatus | null
  refreshBrowserStatus: () => Promise<void>

  // Browser controls
  openUrl: (url: string) => Promise<string>
  getTabs: () => Promise<BrowserTab[]>
  closeTab: (id: string) => Promise<void>

  // OAuth helper
  performOAuth: (options: OAuthFlowOptions) => Promise<OAuthFlowResult>

  // Raw client access
  client: OpenClawClient
}

export function useOpenClaw(options: UseOpenClawOptions = {}): UseOpenClawReturn {
  const { autoConnect = false, config } = options

  const clientRef = useRef<OpenClawClient>(getOpenClawClient(config))
  const [state, setState] = useState<ConnectionState>('disconnected')
  const [error, setError] = useState<Error | null>(null)
  const [browserStatus, setBrowserStatus] = useState<BrowserStatus | null>(null)

  // Set up event listeners
  useEffect(() => {
    const client = clientRef.current

    const unsubState = client.on('stateChange', (newState) => {
      setState(newState as ConnectionState)
      if (newState === 'connected') {
        setError(null)
      }
    })

    const unsubError = client.on('error', (err) => {
      setError(err as Error)
    })

    const unsubConnect = client.on('connect', () => {
      // Fetch browser status on connect
      client.browserStatus().then(setBrowserStatus).catch(console.error)
    })

    // Auto-connect if enabled
    if (autoConnect) {
      client.connect().catch(setError)
    }

    return () => {
      unsubState()
      unsubError()
      unsubConnect()
    }
  }, [autoConnect])

  // Connection controls
  const connect = useCallback(async () => {
    try {
      setError(null)
      await clientRef.current.connect()
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Connection failed'))
      throw err
    }
  }, [])

  const disconnect = useCallback(() => {
    clientRef.current.disconnect()
    setBrowserStatus(null)
  }, [])

  // Browser status
  const refreshBrowserStatus = useCallback(async () => {
    try {
      const status = await clientRef.current.browserStatus()
      setBrowserStatus(status)
    } catch (err) {
      console.error('[useOpenClaw] Failed to get browser status:', err)
    }
  }, [])

  // Browser controls
  const openUrl = useCallback(async (url: string) => {
    return await clientRef.current.browserOpen(url)
  }, [])

  const getTabs = useCallback(async () => {
    return await clientRef.current.browserTabs()
  }, [])

  const closeTab = useCallback(async (id: string) => {
    await clientRef.current.closeTab(id)
  }, [])

  // OAuth helper
  const performOAuth = useCallback(async (opts: OAuthFlowOptions) => {
    return await clientRef.current.performOAuthFlow(opts)
  }, [])

  return {
    state,
    isConnected: state === 'connected',
    error,
    connect,
    disconnect,
    browserStatus,
    refreshBrowserStatus,
    openUrl,
    getTabs,
    closeTab,
    performOAuth,
    client: clientRef.current,
  }
}
