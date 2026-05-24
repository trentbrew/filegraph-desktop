/**
 * OpenClaw Connection Panel
 *
 * A debug/status panel for testing OpenClaw Gateway integration.
 * Can be added to Settings or used standalone.
 */

import React, { useState } from 'react'
import { useOpenClaw } from './useOpenClaw'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Loader2, Globe, RefreshCw, ExternalLink, CheckCircle, XCircle, X } from 'lucide-react'
import { BrowserTab } from './types'

export function OpenClawPanel() {
  const {
    state,
    isConnected,
    error,
    connect,
    disconnect,
    browserStatus,
    refreshBrowserStatus,
    openUrl,
    getTabs,
    closeTab,
  } = useOpenClaw()

  const [url, setUrl] = useState('https://example.com')
  const [tabs, setTabs] = useState<BrowserTab[]>([])
  const [loading, setLoading] = useState<string | null>(null)

  const handleConnect = async () => {
    setLoading('connect')
    try {
      await connect()
    } catch (err) {
      console.error('Connect failed:', err)
    }
    setLoading(null)
  }

  const handleOpenUrl = async () => {
    setLoading('open')
    try {
      await openUrl(url)
      const t = await getTabs()
      setTabs(t)
    } catch (err) {
      console.error('Open URL failed:', err)
    }
    setLoading(null)
  }

  const handleGetTabs = async () => {
    setLoading('tabs')
    try {
      const t = await getTabs()
      setTabs(t)
    } catch (err) {
      console.error('Get tabs failed:', err)
    }
    setLoading(null)
  }

  const handleCloseTab = async (id: string) => {
    setLoading(`close:${id}`)
    try {
      await closeTab(id)
      const t = await getTabs()
      setTabs(t)
    } catch (err) {
      console.error('Close tab failed:', err)
    }
    setLoading(null)
  }

  const stateColors: Record<string, string> = {
    disconnected: 'bg-muted text-muted-foreground',
    connecting: 'bg-yellow-500/20 text-yellow-600',
    connected: 'bg-green-500/20 text-green-600',
    error: 'bg-red-500/20 text-red-600',
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              OpenClaw Browser Control
            </CardTitle>
            <CardDescription>Connect to OpenClaw Gateway for real browser automation</CardDescription>
          </div>
          <Badge className={stateColors[state]}>{state}</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Connection */}
        <div className="flex gap-2">
          {!isConnected ? (
            <Button onClick={handleConnect} disabled={loading === 'connect'}>
              {loading === 'connect' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Connect to Gateway
            </Button>
          ) : (
            <Button variant="outline" onClick={disconnect}>
              Disconnect
            </Button>
          )}
        </div>

        {error && (
          <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm flex items-center gap-2">
            <XCircle className="h-4 w-4" />
            {error.message}
          </div>
        )}

        {/* Browser Status */}
        {isConnected && (
          <>
            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Browser Status</h4>
                <Button variant="ghost" size="sm" onClick={refreshBrowserStatus}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>

              {browserStatus ? (
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    {browserStatus.running ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-muted-foreground" />
                    )}
                    {browserStatus.running ? 'Running' : 'Stopped'}
                  </div>
                  <div className="truncate">CDP: {browserStatus.cdpHttpUrl}</div>
                  <div className="truncate">Browser: {browserStatus.browser ?? 'Unknown'}</div>
                  <div>Tabs: {browserStatus.tabs}</div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No status available</p>
              )}
            </div>

            {/* Navigation */}
            <div className="border rounded-lg p-4 space-y-3">
              <h4 className="font-medium">Navigation</h4>
              <div className="flex gap-2">
                <Input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="flex-1"
                />
                <Button onClick={handleOpenUrl} disabled={loading === 'open' || !browserStatus?.running}>
                  {loading === 'open' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* Tabs */}
            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Tabs</h4>
                <Button variant="ghost" size="sm" onClick={handleGetTabs} disabled={loading === 'tabs'}>
                  {loading === 'tabs' ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                </Button>
              </div>
              {tabs.length > 0 ? (
                <div className="space-y-1">
                  {tabs.map((tab) => (
                    <div key={tab.id} className="flex items-center gap-2 text-sm p-2 rounded bg-muted/50">
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{tab.title || 'Untitled'}</div>
                        <div className="truncate text-muted-foreground text-xs">{tab.url}</div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleCloseTab(tab.id)}
                        disabled={loading === `close:${tab.id}`}>
                        {loading === `close:${tab.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No tabs</p>
              )}
            </div>
          </>
        )}

        {/* Setup Instructions */}
        {!isConnected && state === 'disconnected' && (
          <div className="border rounded-lg p-4 bg-muted/30">
            <h4 className="font-medium mb-2">Setup Instructions</h4>
            <ol className="text-sm space-y-1 text-muted-foreground list-decimal list-inside">
              <li>
                Install OpenClaw: <code className="bg-muted px-1 rounded">npm install -g openclaw@latest</code>
              </li>
              <li>
                Run onboarding: <code className="bg-muted px-1 rounded">openclaw onboard</code>
              </li>
              <li>
                Ensure the managed browser is running:{' '}
                <code className="bg-muted px-1 rounded">command openclaw browser --browser-profile openclaw start</code>
              </li>
              <li>Click "Connect" above</li>
            </ol>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
