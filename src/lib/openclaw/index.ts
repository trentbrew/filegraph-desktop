/**
 * OpenClaw Integration
 *
 * Provides browser automation via OpenClaw Gateway for:
 * - OAuth flows (Google, GitHub, etc.)
 * - Web scraping and automation
 * - Real browser control via CDP
 *
 * Prerequisites:
 * 1. Install OpenClaw: npm install -g openclaw@latest
 * 2. Run the gateway: openclaw gateway --port 18789
 * 3. Start browser: openclaw browser start
 *
 * Usage:
 * ```tsx
 * import { useOpenClaw } from '@/lib/openclaw'
 *
 * function MyComponent() {
 *   const { isConnected, connect, performOAuth } = useOpenClaw()
 *
 *   const handleGoogleAuth = async () => {
 *     await connect()
 *     const result = await performOAuth({
 *       authUrl: 'https://accounts.google.com/o/oauth2/v2/auth?...',
 *       callbackUrlPattern: 'localhost.*code=',
 *     })
 *     if (result.success) {
 *       console.log('Got code:', result.code)
 *     }
 *   }
 * }
 * ```
 */

export * from './types'
export * from './client'
export { useOpenClaw } from './useOpenClaw'
export type { UseOpenClawOptions, UseOpenClawReturn } from './useOpenClaw'
export { OpenClawPanel } from './OpenClawPanel'
