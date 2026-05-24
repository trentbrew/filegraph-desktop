/**
 * Google OAuth Service
 * Handles PKCE OAuth flow for desktop app authentication
 */

import { invoke } from '@tauri-apps/api/core'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'
import type { GoogleTokens, GoogleUserInfo, PKCEState, GoogleAccount } from './types'
import { GOOGLE_CALENDAR_SCOPES, getScopesForServices, GOOGLE_SCOPES } from './types'

// OAuth endpoints
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo'
const GOOGLE_REVOKE_URL = 'https://oauth2.googleapis.com/revoke'

// Redirect URI for desktop app - uses localhost
const REDIRECT_URI = 'http://localhost:8765/oauth/callback'

// Get credentials from environment variables
export function getGoogleCredentials(): { clientId: string; clientSecret: string | null } {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || import.meta.env.GOOGLE_CLIENT_ID || ''
  const clientSecret = import.meta.env.VITE_GOOGLE_CLIENT_SECRET || import.meta.env.GOOGLE_CLIENT_SECRET || null
  return { clientId, clientSecret }
}

// Generate cryptographically secure random string
function generateRandomString(length: number): string {
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

// Generate code verifier for PKCE
function generateCodeVerifier(): string {
  return generateRandomString(64)
}

// Generate code challenge from verifier (SHA256 + base64url)
async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(verifier)
  const digest = await crypto.subtle.digest('SHA-256', data)
  const base64 = btoa(String.fromCharCode(...new Uint8Array(digest)))
  // Convert to base64url
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

// Generate PKCE state
export async function generatePKCEState(): Promise<PKCEState> {
  const codeVerifier = generateCodeVerifier()
  const codeChallenge = await generateCodeChallenge(codeVerifier)
  const state = generateRandomString(32)

  return {
    codeVerifier,
    codeChallenge,
    state,
  }
}

// Build OAuth authorization URL
export function buildAuthUrl(clientId: string, pkceState: PKCEState): string {
  // Request both Calendar and Gmail scopes
  const scopes = getScopesForServices(['calendar', 'gmail'])

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: scopes.join(' '),
    code_challenge: pkceState.codeChallenge,
    code_challenge_method: 'S256',
    state: pkceState.state,
    access_type: 'offline', // Request refresh token
    prompt: 'consent', // Force consent to get refresh token
  })

  return `${GOOGLE_AUTH_URL}?${params.toString()}`
}

// Exchange authorization code for tokens
export async function exchangeCodeForTokens(
  clientId: string,
  code: string,
  codeVerifier: string,
  clientSecret?: string | null,
): Promise<GoogleTokens> {
  const params: Record<string, string> = {
    client_id: clientId,
    code,
    code_verifier: codeVerifier,
    grant_type: 'authorization_code',
    redirect_uri: REDIRECT_URI,
  }

  // Include client_secret if provided (required for web app credentials)
  if (clientSecret) {
    params.client_secret = clientSecret
  }

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(params),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Token exchange failed: ${error.error_description || error.error}`)
  }

  const data = await response.json()

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    token_type: data.token_type,
    expires_at: Date.now() + data.expires_in * 1000,
    scope: data.scope,
  }
}

// Refresh access token using refresh token
export async function refreshAccessToken(
  clientId: string,
  refreshToken: string,
  clientSecret?: string | null,
): Promise<GoogleTokens> {
  const params: Record<string, string> = {
    client_id: clientId,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  }

  // Include client_secret if provided
  if (clientSecret) {
    params.client_secret = clientSecret
  }

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(params),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Token refresh failed: ${error.error_description || error.error}`)
  }

  const data = await response.json()

  return {
    access_token: data.access_token,
    refresh_token: refreshToken, // Keep existing refresh token
    token_type: data.token_type,
    expires_at: Date.now() + data.expires_in * 1000,
    scope: data.scope,
  }
}

// Get user info from Google
export async function getUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const response = await fetch(GOOGLE_USERINFO_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to get user info')
  }

  return response.json()
}

// Revoke tokens (disconnect account)
export async function revokeToken(token: string): Promise<void> {
  const response = await fetch(`${GOOGLE_REVOKE_URL}?token=${token}`, {
    method: 'POST',
  })

  if (!response.ok) {
    console.warn('Token revocation may have failed, but continuing anyway')
  }
}

// Check if tokens need refresh (5 minute buffer)
export function tokensNeedRefresh(tokens: GoogleTokens): boolean {
  const bufferMs = 5 * 60 * 1000 // 5 minutes
  return Date.now() >= tokens.expires_at - bufferMs
}

// Check if token has required scopes for a service
export function hasRequiredScopes(tokens: GoogleTokens, service: 'calendar' | 'gmail' | 'drive'): boolean {
  if (!tokens.scope) return false

  const scopeString = tokens.scope
  const requiredScopes = GOOGLE_SCOPES[service] || []

  // Check if all required scopes are present
  return requiredScopes.every((scope) => scopeString.includes(scope))
}

// Get valid access token (refresh if needed)
export async function getValidAccessToken(clientId: string, account: GoogleAccount): Promise<string> {
  if (!tokensNeedRefresh(account.tokens)) {
    return account.tokens.access_token
  }

  // Refresh tokens
  const newTokens = await refreshAccessToken(clientId, account.tokens.refresh_token)

  // Update account tokens (caller should persist this)
  account.tokens = newTokens

  return newTokens.access_token
}

// OAuth callback server types
export interface OAuthCallbackResult {
  success: boolean
  code?: string
  state?: string
  error?: string
}

// Start OAuth callback server (Tauri command)
export async function startOAuthCallbackServer(): Promise<void> {
  try {
    await invoke('start_oauth_server_cmd', { port: 8765 })
  } catch (error) {
    console.error('Failed to start OAuth callback server:', error)
    throw error
  }
}

// Stop OAuth callback server
export async function stopOAuthCallbackServer(): Promise<void> {
  try {
    await invoke('stop_oauth_server_cmd')
  } catch (error) {
    console.warn('Failed to stop OAuth callback server:', error)
  }
}

// Wait for OAuth callback
export async function waitForOAuthCallback(expectedState: string, timeoutMs = 300000): Promise<OAuthCallbackResult> {
  return new Promise((resolve, reject) => {
    let unlistenFn: UnlistenFn | null = null
    let pollInterval: ReturnType<typeof setInterval> | null = null

    const timeout = setTimeout(() => {
      cleanup()
      reject(new Error('OAuth callback timeout'))
    }, timeoutMs)

    const cleanup = () => {
      clearTimeout(timeout)
      if (pollInterval) clearInterval(pollInterval)
      if (unlistenFn) unlistenFn()
    }

    // Listen for callback event from Tauri
    listen<OAuthCallbackResult>('oauth-callback', (event) => {
      cleanup()

      const result = event.payload
      if (result.state !== expectedState) {
        resolve({ success: false, error: 'State mismatch - possible CSRF attack' })
        return
      }

      resolve(result)
    }).then((fn) => {
      unlistenFn = fn
    })

    // Fallback: poll for result if events aren't working
    pollInterval = setInterval(async () => {
      try {
        const result = await invoke<OAuthCallbackResult | null>('get_oauth_callback_result')
        if (result) {
          cleanup()

          if (result.state !== expectedState) {
            resolve({ success: false, error: 'State mismatch' })
            return
          }

          resolve(result)
        }
      } catch {
        // Ignore polling errors
      }
    }, 500)
  })
}

// Full OAuth flow
export async function performOAuthFlow(
  clientId: string,
  clientSecret?: string | null,
): Promise<{ account: Omit<GoogleAccount, 'id'>; userInfo: GoogleUserInfo }> {
  // Generate PKCE state
  const pkceState = await generatePKCEState()

  // Build auth URL
  const authUrl = buildAuthUrl(clientId, pkceState)

  // Start callback server
  await startOAuthCallbackServer()

  try {
    // Open browser for authentication
    await invoke('open_url', { url: authUrl })

    // Wait for callback
    const callbackResult = await waitForOAuthCallback(pkceState.state)

    if (!callbackResult.success || !callbackResult.code) {
      throw new Error(callbackResult.error || 'OAuth flow failed')
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(clientId, callbackResult.code, pkceState.codeVerifier, clientSecret)

    // Get user info
    const userInfo = await getUserInfo(tokens.access_token)

    return {
      account: {
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture,
        tokens,
        connectedAt: new Date().toISOString(),
        enabledServices: ['calendar', 'gmail'],
        calendarSyncEnabled: true,
        selectedCalendars: [],
        gmailSyncEnabled: false,
        driveSyncEnabled: false,
      },
      userInfo,
    }
  } finally {
    // Always stop callback server
    await stopOAuthCallbackServer()
  }
}
