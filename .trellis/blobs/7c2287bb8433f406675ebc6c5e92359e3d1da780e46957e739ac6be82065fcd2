/**
 * Google Calendar Store
 * Manages connected Google accounts and sync state
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { invoke } from '@tauri-apps/api/core'
import type { GoogleAccount, GoogleCalendar, SyncResult } from '@/lib/google/types'
import {
  performOAuthFlow,
  revokeToken,
  refreshAccessToken,
  tokensNeedRefresh,
  getGoogleCredentials,
} from '@/lib/google/oauth'
import { listCalendars } from '@/lib/google/calendar-api'
import { GoogleCalendarSyncEngine } from '@/lib/google/sync-engine'

interface GoogleCalendarState {
  // OAuth client ID (set in settings)
  clientId: string | null

  // Connected accounts
  accounts: GoogleAccount[]

  // Calendars per account
  calendarsMap: Record<string, GoogleCalendar[]>

  // Sync status
  syncing: boolean
  lastSyncResults: Record<string, SyncResult>

  // Sync engine instance (not persisted)
  syncEngine: GoogleCalendarSyncEngine | null

  // Actions
  setClientId: (clientId: string) => void
  addAccount: () => Promise<GoogleAccount | null>
  removeAccount: (accountId: string) => Promise<void>
  refreshAccountTokens: (accountId: string) => Promise<void>
  loadCalendars: (accountId: string) => Promise<void>
  setSelectedCalendars: (accountId: string, calendarIds: string[]) => void
  toggleSyncEnabled: (accountId: string) => void
  toggleGmailSync: (accountId: string) => void
  initSyncEngine: (vaultPath: string) => void
  syncAccount: (accountId: string) => Promise<SyncResult | null>
  syncAllAccounts: () => Promise<void>
  startRealtimeSync: (accountId: string, intervalMs?: number) => void
  stopRealtimeSync: (accountId: string) => void
  getAccount: (accountId: string) => GoogleAccount | undefined
  reauthenticateAccount: (accountId: string) => Promise<GoogleAccount | null>
}

export const useGoogleCalendarStore = create<GoogleCalendarState>()(
  persist(
    (set, get) => ({
      clientId: null,
      accounts: [],
      calendarsMap: {},
      syncing: false,
      lastSyncResults: {},
      syncEngine: null,

      setClientId: (clientId) => {
        set({ clientId })
      },

      addAccount: async () => {
        const { accounts } = get()
        // Get credentials from env or store
        const envCreds = getGoogleCredentials()
        const clientId = envCreds.clientId || get().clientId
        const clientSecret = envCreds.clientSecret

        if (!clientId) {
          console.error('Google Client ID not configured')
          return null
        }

        try {
          const { account, userInfo } = await performOAuthFlow(clientId, clientSecret)

          // Debug: Log the scopes we received
          console.log('OAuth completed. Token scopes:', account.tokens.scope)

          // Check if account already connected
          const existingAccount = accounts.find((a) => a.email === userInfo.email)
          if (existingAccount) {
            // Update existing account tokens
            set({
              accounts: accounts.map((a) =>
                a.id === existingAccount.id ? { ...a, tokens: account.tokens, connectedAt: account.connectedAt } : a,
              ),
            })
            return existingAccount
          }

          // Create new account
          const newAccount: GoogleAccount = {
            id: userInfo.id,
            ...account,
          }

          set({ accounts: [...accounts, newAccount] })

          // Load calendars for new account
          await get().loadCalendars(newAccount.id)

          return newAccount
        } catch (error) {
          console.error('Failed to add Google account:', error)
          return null
        }
      },

      removeAccount: async (accountId) => {
        const { accounts, calendarsMap, syncEngine } = get()
        const account = accounts.find((a) => a.id === accountId)

        if (account) {
          // Stop real-time sync
          syncEngine?.stopPolling(accountId)

          // Revoke tokens
          try {
            await revokeToken(account.tokens.access_token)
          } catch {
            // Ignore revocation errors
          }

          // Remove from state
          const { [accountId]: _, ...remainingCalendars } = calendarsMap
          set({
            accounts: accounts.filter((a) => a.id !== accountId),
            calendarsMap: remainingCalendars,
          })
        }
      },

      refreshAccountTokens: async (accountId) => {
        const { accounts } = get()
        const envCreds = getGoogleCredentials()
        const clientId = envCreds.clientId || get().clientId
        const clientSecret = envCreds.clientSecret
        if (!clientId) return

        const account = accounts.find((a) => a.id === accountId)
        if (!account) return

        if (tokensNeedRefresh(account.tokens)) {
          try {
            const newTokens = await refreshAccessToken(clientId, account.tokens.refresh_token, clientSecret)
            set({
              accounts: accounts.map((a) => (a.id === accountId ? { ...a, tokens: newTokens } : a)),
            })
          } catch (error) {
            console.error('Failed to refresh tokens:', error)
          }
        }
      },

      loadCalendars: async (accountId) => {
        const { accounts, calendarsMap } = get()
        const envCreds = getGoogleCredentials()
        const clientId = envCreds.clientId || get().clientId
        if (!clientId) return

        const account = accounts.find((a) => a.id === accountId)
        if (!account) return

        try {
          const calendars = await listCalendars(clientId, account)
          set({
            calendarsMap: { ...calendarsMap, [accountId]: calendars },
          })

          // Auto-select primary calendar if none selected
          if (account.selectedCalendars.length === 0) {
            const primaryCalendar = calendars.find((c) => c.primary)
            if (primaryCalendar) {
              get().setSelectedCalendars(accountId, [primaryCalendar.id])
            }
          }
        } catch (error) {
          console.error('Failed to load calendars:', error)
        }
      },

      setSelectedCalendars: (accountId, calendarIds) => {
        const { accounts } = get()
        set({
          accounts: accounts.map((a) => (a.id === accountId ? { ...a, selectedCalendars: calendarIds } : a)),
        })
      },

      toggleSyncEnabled: (accountId) => {
        const { accounts, syncEngine } = get()
        const account = accounts.find((a) => a.id === accountId)
        if (!account) return

        const newEnabled = !account.calendarSyncEnabled

        set({
          accounts: accounts.map((a) => (a.id === accountId ? { ...a, calendarSyncEnabled: newEnabled } : a)),
        })

        // Start/stop real-time sync
        if (newEnabled && syncEngine) {
          get().startRealtimeSync(accountId)
        } else {
          syncEngine?.stopPolling(accountId)
        }
      },

      toggleGmailSync: (accountId) => {
        const { accounts } = get()
        const account = accounts.find((a) => a.id === accountId)
        if (!account) return

        const newEnabled = !account.gmailSyncEnabled

        set({
          accounts: accounts.map((a) => (a.id === accountId ? { ...a, gmailSyncEnabled: newEnabled } : a)),
        })
      },

      initSyncEngine: (vaultPath) => {
        const { syncEngine: existingEngine } = get()
        const envCreds = getGoogleCredentials()
        const clientId = envCreds.clientId || get().clientId
        if (!clientId) return

        // Stop existing engine
        existingEngine?.stopAllPolling()

        const engine = new GoogleCalendarSyncEngine(clientId, vaultPath)
        engine.loadSyncState()

        set({ syncEngine: engine })

        // Start sync for enabled accounts
        const { accounts } = get()
        for (const account of accounts) {
          if (account.calendarSyncEnabled) {
            get().startRealtimeSync(account.id)
          }
        }
      },

      syncAccount: async (accountId) => {
        const { accounts, syncEngine, lastSyncResults, calendarsMap } = get()
        if (!syncEngine) return null

        const account = accounts.find((a) => a.id === accountId)
        if (!account) return null

        set({ syncing: true })

        try {
          // Refresh tokens if needed
          await get().refreshAccountTokens(accountId)

          // Get fresh account reference
          const freshAccount = get().accounts.find((a) => a.id === accountId)
          if (!freshAccount) return null

          // Set calendar names for auto-tagging
          const calendars = calendarsMap[accountId] || []
          syncEngine.setCalendarNames(calendars)

          // Perform sync
          const result = await syncEngine.incrementalSync(freshAccount)

          // Update last sync time
          set({
            accounts: get().accounts.map((a) => (a.id === accountId ? { ...a, lastSyncAt: result.timestamp } : a)),
            lastSyncResults: { ...lastSyncResults, [accountId]: result },
          })

          return result
        } catch (error) {
          console.error('Sync failed:', error)
          return {
            accountId,
            success: false,
            error: error instanceof Error ? error.message : String(error),
            pulled: 0,
            pushed: 0,
            conflicts: 0,
            deleted: 0,
            timestamp: new Date().toISOString(),
          }
        } finally {
          set({ syncing: false })
        }
      },

      syncAllAccounts: async () => {
        const { accounts } = get()
        for (const account of accounts) {
          if (account.calendarSyncEnabled) {
            await get().syncAccount(account.id)
          }
        }
      },

      startRealtimeSync: (accountId, intervalMs = 60000) => {
        const { accounts, syncEngine } = get()
        if (!syncEngine) return

        const account = accounts.find((a) => a.id === accountId)
        if (!account || !account.calendarSyncEnabled) return

        syncEngine.startPolling(account, intervalMs)
      },

      stopRealtimeSync: (accountId) => {
        const { syncEngine } = get()
        syncEngine?.stopPolling(accountId)
      },

      getAccount: (accountId) => {
        return get().accounts.find((a) => a.id === accountId)
      },

      reauthenticateAccount: async (accountId) => {
        const { accounts } = get()
        const account = accounts.find((a) => a.id === accountId)
        if (!account) return null

        const envCreds = getGoogleCredentials()
        const clientId = envCreds.clientId || get().clientId
        const clientSecret = envCreds.clientSecret

        if (!clientId) {
          console.error('Google Client ID not configured')
          return null
        }

        try {
          // Perform OAuth flow to get new tokens with all scopes
          const { account: newAccountData, userInfo } = await performOAuthFlow(clientId, clientSecret)

          // Verify it's the same account
          if (userInfo.email !== account.email) {
            console.error('Re-authentication email mismatch')
            return null
          }

          // Update account with new tokens
          const updatedAccount: GoogleAccount = {
            ...account,
            tokens: newAccountData.tokens,
            connectedAt: newAccountData.connectedAt,
            enabledServices: newAccountData.enabledServices,
          }

          set({
            accounts: accounts.map((a) => (a.id === accountId ? updatedAccount : a)),
          })

          // Reload calendars if calendar sync is enabled
          if (updatedAccount.calendarSyncEnabled) {
            await get().loadCalendars(accountId)
          }

          return updatedAccount
        } catch (error) {
          console.error('Failed to re-authenticate account:', error)
          return null
        }
      },
    }),
    {
      name: 'google-calendar-storage',
      onRehydrateStorage: () => {
        // Expose store globally for agent tools access
        return () => {
          if (typeof window !== 'undefined') {
            ;(window as any).__googleCalendarStore = useGoogleCalendarStore
          }
        }
      },
      partialize: (state) => ({
        clientId: state.clientId,
        accounts: state.accounts,
        calendarsMap: state.calendarsMap,
        lastSyncResults: state.lastSyncResults,
      }),
    },
  ),
)
