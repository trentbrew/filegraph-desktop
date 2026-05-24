# OpenClaw Integration

Browser automation via [OpenClaw](https://openclaw.ai) Gateway for OAuth flows and web automation.

## Why OpenClaw?

Filegraph's web embeds use iframes, which can't handle:
- OAuth popups/redirects (blocked by providers)
- Sites with `X-Frame-Options: DENY`
- Cookie sharing across origins

OpenClaw controls a **real Chrome browser** via CDP (Chrome DevTools Protocol), enabling:
- Full OAuth flows with Google, GitHub, etc.
- Session persistence
- Real browser automation

## Setup

### 1. Install OpenClaw

```bash
npm install -g openclaw@latest
```

### 2. Run Onboarding

```bash
openclaw onboard
```

This sets up your config at `~/.openclaw/openclaw.json`.

### 3. Start the Gateway

```bash
openclaw gateway
```

The Gateway runs on `ws://127.0.0.1:18789` by default.

### 4. (Optional) Start a Browser

```bash
openclaw browser start
```

Or let Filegraph start it automatically when needed.

## Usage in Filegraph

### Basic Connection

```tsx
import { useOpenClaw } from '@/lib/openclaw'

function MyComponent() {
  const { isConnected, connect, browserStatus } = useOpenClaw()

  return (
    <div>
      <button onClick={connect}>Connect</button>
      {isConnected && <p>Browser running: {browserStatus?.running}</p>}
    </div>
  )
}
```

### OAuth Flow

```tsx
import { useOpenClaw } from '@/lib/openclaw'

function GoogleAuthButton() {
  const { connect, performOAuth } = useOpenClaw()

  const handleAuth = async () => {
    await connect()
    
    const result = await performOAuth({
      authUrl: `https://accounts.google.com/o/oauth2/v2/auth?client_id=...&redirect_uri=http://localhost:18799/oauth/callback&response_type=code&scope=...`,
      callbackUrlPattern: 'localhost.*code=',
      timeoutMs: 120000,
    })

    if (result.success) {
      console.log('Got auth code:', result.code)
      // Exchange code for tokens...
    }
  }

  return <button onClick={handleAuth}>Sign in with Google</button>
}
```

### Debug Panel

```tsx
import { OpenClawPanel } from '@/lib/openclaw'

function SettingsPage() {
  return (
    <div>
      <h2>Browser Control</h2>
      <OpenClawPanel />
    </div>
  )
}
```

## Architecture

```
┌─────────────────┐     WebSocket      ┌─────────────────┐
│   Filegraph     │ ◄────────────────► │ OpenClaw Gateway│
│   (Tauri)       │   :18789           │  (localhost)    │
└─────────────────┘                    └────────┬────────┘
                                                │
                                       ┌────────▼────────┐
                                       │  Chrome (CDP)   │
                                       │  Port 18800     │
                                       └─────────────────┘
```

## Files

- `types.ts` — TypeScript types for Gateway protocol
- `client.ts` — WebSocket client for Gateway communication
- `useOpenClaw.ts` — React hook for connection management
- `OpenClawPanel.tsx` — Debug/status panel component

## API Reference

### `useOpenClaw(options?)`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `autoConnect` | `boolean` | `false` | Auto-connect on mount |
| `config.gatewayUrl` | `string` | `ws://127.0.0.1:18789` | Gateway WebSocket URL |
| `config.browserProfile` | `string` | `filegraph` | Browser profile name |

### Returns

| Property | Type | Description |
|----------|------|-------------|
| `state` | `ConnectionState` | `'disconnected' \| 'connecting' \| 'connected' \| 'error'` |
| `isConnected` | `boolean` | Whether connected to Gateway |
| `connect()` | `Promise<void>` | Connect to Gateway |
| `disconnect()` | `void` | Disconnect from Gateway |
| `browserStatus` | `BrowserStatus \| null` | Current browser status |
| `startBrowser()` | `Promise<void>` | Start managed browser |
| `stopBrowser()` | `Promise<void>` | Stop managed browser |
| `openUrl(url)` | `Promise<void>` | Navigate to URL |
| `getSnapshot()` | `Promise<BrowserSnapshot>` | Get page element tree |
| `click(ref)` | `Promise<void>` | Click element by ref |
| `type(ref, text)` | `Promise<void>` | Type text into element |
| `performOAuth(options)` | `Promise<OAuthFlowResult>` | Run OAuth flow |

## Troubleshooting

### "Failed to connect to OpenClaw Gateway"

Make sure the Gateway is running:

```bash
openclaw gateway
```

### "Browser not running"

Start the browser manually:

```bash
openclaw browser start
```

Or check status:

```bash
openclaw browser status
```

### OAuth flow times out

- Increase `timeoutMs` in `performOAuth` options
- Check the browser window — user may need to complete 2FA
- Verify the `callbackUrlPattern` regex matches your redirect URI
