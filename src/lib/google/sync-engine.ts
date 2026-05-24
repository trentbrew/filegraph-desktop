/**
 * Google Calendar Sync Engine
 * Handles bidirectional sync with conflict resolution
 */

import { invoke } from '@tauri-apps/api/core'
import type { GoogleAccount, GoogleCalendarEvent, SyncResult, SyncConflict, SyncMetadata } from './types'
import { listEvents, createEvent, updateEvent, deleteEvent } from './calendar-api'
import type { CalendarItem, EventLabel, Urgency } from '@/lib/calendar/types'

// Sync state stored per account per calendar
export interface CalendarSyncState {
  calendarId: string
  syncToken?: string
  lastFullSync?: string
  lastIncrementalSync?: string
}

export interface AccountSyncState {
  accountId: string
  calendars: Record<string, CalendarSyncState>
}

// Convert Google event to local CalendarItem
export function googleEventToCalendarItem(
  event: GoogleCalendarEvent,
  calendarId: string,
  accountId: string,
  calendarName?: string,
): CalendarItem & { syncMetadata: SyncMetadata } {
  // Determine label based on event properties
  let label: EventLabel = 'event'
  const summary = event.summary?.toLowerCase() || ''

  if (summary.includes('meeting') || event.attendees?.length) label = 'meeting'
  else if (summary.includes('birthday')) label = 'birthday'
  else if (summary.includes('deadline')) label = 'deadline'
  else if (summary.includes('task') || summary.includes('todo')) label = 'task'
  else if (summary.includes('reminder')) label = 'reminder'
  else if (summary.includes('appointment')) label = 'appointment'

  // Determine urgency based on how soon the event is
  let urgency: Urgency = 2
  const startDate = event.start.dateTime || event.start.date
  if (startDate) {
    const daysUntil = (new Date(startDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    if (daysUntil < 1) urgency = 3
    else if (daysUntil > 7) urgency = 1
  }

  // Auto-generate tags based on source and calendar
  const tags: string[] = ['google-calendar']
  if (calendarName) {
    // Normalize calendar name to lowercase kebab-case tag
    const calTag = calendarName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
    if (calTag && calTag !== 'google-calendar') {
      tags.push(calTag)
    }
  }
  // Add recurring tag if event has recurrence
  if (event.recurrence?.length) {
    tags.push('recurring')
  }

  return {
    '@type': 'Event',
    id: `google:${accountId}:${event.id}`,
    slug: event.id,
    label,
    urgency,
    name: event.summary || 'Untitled Event',
    description: event.description,
    startDate: event.start.dateTime || event.start.date || new Date().toISOString(),
    endDate: event.end?.dateTime || event.end?.date,
    location: event.location,
    participants: event.attendees?.map((a) => a.email),
    recurrence: event.recurrence?.join('\n'),
    tags,
    color: event.colorId ? `google-color-${event.colorId}` : undefined,
    syncMetadata: {
      googleEventId: event.id,
      googleCalendarId: calendarId,
      googleAccountId: accountId,
      googleEtag: event.etag,
      lastSyncedAt: new Date().toISOString(),
      syncStatus: 'synced',
      remoteVersion: event.sequence,
    },
  }
}

// Convert local CalendarItem to Google event format
export function calendarItemToGoogleEvent(item: CalendarItem): Partial<GoogleCalendarEvent> {
  const isAllDay = !item.startDate.includes('T')

  return {
    summary: item.name,
    description: item.description,
    location: item.location,
    start: isAllDay
      ? { date: item.startDate.split('T')[0] }
      : { dateTime: item.startDate, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
    end: item.endDate
      ? isAllDay
        ? { date: item.endDate.split('T')[0] }
        : { dateTime: item.endDate, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }
      : isAllDay
        ? { date: item.startDate.split('T')[0] }
        : { dateTime: item.startDate, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
    attendees: item.participants?.map((email) => ({ email, responseStatus: 'needsAction' as const })),
    recurrence: item.recurrence ? item.recurrence.split('\n') : undefined,
  }
}

// Local item with sync metadata
export type SyncedCalendarItem = CalendarItem & { syncMetadata: SyncMetadata }

// Sync conflict with proper types
export interface LocalSyncConflict {
  localItem: SyncedCalendarItem
  remoteEvent: GoogleCalendarEvent
  conflictType: 'modified-both' | 'deleted-local' | 'deleted-remote'
  resolution?: 'keep-local' | 'keep-remote' | 'merge'
}

// Check if two items conflict (both modified since last sync)
export function detectConflict(
  localItem: CalendarItem & { syncMetadata?: SyncMetadata },
  remoteEvent: GoogleCalendarEvent,
): LocalSyncConflict | null {
  if (!localItem.syncMetadata) return null

  const localVersion = localItem.syncMetadata.localVersion || 0
  const remoteVersion = remoteEvent.sequence || 0
  const lastSyncedRemoteVersion = localItem.syncMetadata.remoteVersion || 0

  // Both changed since last sync
  if (localVersion > 0 && remoteVersion > lastSyncedRemoteVersion) {
    return {
      localItem: localItem as SyncedCalendarItem,
      remoteEvent,
      conflictType: 'modified-both',
    }
  }

  return null
}

// Merge conflicting items (simple strategy: prefer most recent)
export function mergeConflict(conflict: LocalSyncConflict): SyncedCalendarItem {
  const localDate = new Date(conflict.localItem.syncMetadata?.lastSyncedAt || 0)
  const remoteDate = new Date(conflict.remoteEvent.updated)

  if (remoteDate > localDate) {
    // Remote is newer - use remote
    return googleEventToCalendarItem(
      conflict.remoteEvent,
      conflict.localItem.syncMetadata?.googleCalendarId || '',
      conflict.localItem.syncMetadata?.googleAccountId || '',
    )
  } else {
    // Local is newer - keep local
    return conflict.localItem
  }
}

// Sync engine class
export class GoogleCalendarSyncEngine {
  private clientId: string
  private vaultPath: string
  private syncStates: Map<string, AccountSyncState> = new Map()
  private pollIntervals: Map<string, ReturnType<typeof setInterval>> = new Map()
  private calendarNames: Map<string, string> = new Map() // calendarId -> name

  constructor(clientId: string, vaultPath: string) {
    this.clientId = clientId
    this.vaultPath = vaultPath
  }

  // Set calendar names for auto-tagging
  setCalendarNames(calendars: Array<{ id: string; summary: string }>) {
    this.calendarNames.clear()
    for (const cal of calendars) {
      this.calendarNames.set(cal.id, cal.summary)
    }
  }

  // Get calendar name by ID
  private getCalendarName(calendarId: string): string | undefined {
    return this.calendarNames.get(calendarId)
  }

  // Load sync state from vault
  async loadSyncState(): Promise<void> {
    try {
      const statePath = `${this.vaultPath}/.filegraph/google-sync-state.json`
      const response = await invoke<{ content: string }>('read_text_file', { filePath: statePath })
      const states = JSON.parse(response.content) as AccountSyncState[]
      this.syncStates = new Map(states.map((s) => [s.accountId, s]))
    } catch {
      // No state file yet
      this.syncStates = new Map()
    }
  }

  // Save sync state to vault
  async saveSyncState(): Promise<void> {
    const statePath = `${this.vaultPath}/.filegraph/google-sync-state.json`
    const states = Array.from(this.syncStates.values())
    await invoke('write_text_file', {
      filePath: statePath,
      content: JSON.stringify(states, null, 2),
    })
  }

  // Get or create sync state for an account
  private getAccountState(accountId: string): AccountSyncState {
    let state = this.syncStates.get(accountId)
    if (!state) {
      state = { accountId, calendars: {} }
      this.syncStates.set(accountId, state)
    }
    return state
  }

  // Perform full sync for an account
  async fullSync(account: GoogleAccount): Promise<SyncResult> {
    const result: SyncResult = {
      accountId: account.id,
      success: false,
      pulled: 0,
      pushed: 0,
      conflicts: 0,
      deleted: 0,
      timestamp: new Date().toISOString(),
    }

    try {
      const accountState = this.getAccountState(account.id)

      // Sync each selected calendar
      for (const calendarId of account.selectedCalendars) {
        let calendarState = accountState.calendars[calendarId]
        if (!calendarState) {
          calendarState = { calendarId }
          accountState.calendars[calendarId] = calendarState
        }

        // Fetch all events (no time bounds for full sync)
        const { events, nextSyncToken } = await listEvents(this.clientId, account, calendarId, {
          timeMin: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year back
          timeMax: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year ahead
        })

        // Convert and store events
        const calendarName = this.getCalendarName(calendarId)
        const localItems = events
          .filter((e) => e.status !== 'cancelled')
          .map((e) => googleEventToCalendarItem(e, calendarId, account.id, calendarName))

        result.pulled += localItems.length

        // Update sync state
        calendarState.syncToken = nextSyncToken
        calendarState.lastFullSync = new Date().toISOString()

        // Store in vault
        await this.storeGoogleEvents(account.id, calendarId, localItems)
      }

      await this.saveSyncState()

      result.success = true
    } catch (error) {
      result.error = error instanceof Error ? error.message : String(error)
    }

    return result
  }

  // Perform incremental sync
  async incrementalSync(account: GoogleAccount): Promise<SyncResult> {
    const result: SyncResult = {
      accountId: account.id,
      success: false,
      pulled: 0,
      pushed: 0,
      conflicts: 0,
      deleted: 0,
      timestamp: new Date().toISOString(),
    }

    try {
      const accountState = this.getAccountState(account.id)

      for (const calendarId of account.selectedCalendars) {
        const calendarState = accountState.calendars[calendarId]

        if (!calendarState?.syncToken) {
          // No sync token - need full sync
          const fullResult = await this.fullSync(account)
          return fullResult
        }

        // Incremental sync using sync token
        const { events, nextSyncToken } = await listEvents(this.clientId, account, calendarId, {
          syncToken: calendarState.syncToken,
        })

        // Process changes
        const calendarName = this.getCalendarName(calendarId)
        for (const event of events) {
          if (event.status === 'cancelled') {
            // Event was deleted on Google
            await this.handleRemoteDeletion(account.id, calendarId, event.id)
            result.deleted++
          } else {
            // Event was added or modified
            const localItem = googleEventToCalendarItem(event, calendarId, account.id, calendarName)

            // Check for conflicts
            const existingItem = await this.getLocalEvent(account.id, event.id)
            if (existingItem?.syncMetadata) {
              const conflict = detectConflict(existingItem, event)
              if (conflict) {
                result.conflicts++
                // Auto-resolve: prefer most recent
                const merged = mergeConflict(conflict)
                await this.updateLocalEvent(merged)
                continue
              }
            }

            await this.storeLocalEvent(localItem)
            result.pulled++
          }
        }

        // Update sync token
        if (nextSyncToken) {
          calendarState.syncToken = nextSyncToken
        }
        calendarState.lastIncrementalSync = new Date().toISOString()
      }

      // Push local changes to Google
      const pushResult = await this.pushLocalChanges(account)
      result.pushed = pushResult.pushed

      await this.saveSyncState()
      result.success = true
    } catch (error) {
      result.error = error instanceof Error ? error.message : String(error)
    }

    return result
  }

  // Push local changes to Google
  async pushLocalChanges(account: GoogleAccount): Promise<{ pushed: number }> {
    let pushed = 0

    // Get events with pending-push status
    const pendingEvents = await this.getPendingPushEvents(account.id)

    for (const item of pendingEvents) {
      if (!item.syncMetadata?.googleCalendarId) continue

      try {
        const googleEvent = calendarItemToGoogleEvent(item)

        if (item.syncMetadata.googleEventId) {
          // Update existing event
          await updateEvent(
            this.clientId,
            account,
            item.syncMetadata.googleCalendarId,
            item.syncMetadata.googleEventId,
            googleEvent,
          )
        } else {
          // Create new event
          const created = await createEvent(this.clientId, account, item.syncMetadata.googleCalendarId, googleEvent)

          // Update local item with Google ID
          item.syncMetadata.googleEventId = created.id
          item.syncMetadata.googleEtag = created.etag
        }

        item.syncMetadata.syncStatus = 'synced'
        item.syncMetadata.lastSyncedAt = new Date().toISOString()
        await this.updateLocalEvent(item)
        pushed++
      } catch (error) {
        console.error(`Failed to push event ${item.id}:`, error)
      }
    }

    return { pushed }
  }

  // Store Google events in vault
  private async storeGoogleEvents(
    accountId: string,
    calendarId: string,
    items: (CalendarItem & { syncMetadata: SyncMetadata })[],
  ): Promise<void> {
    const filePath = `${this.vaultPath}/@calendar/google-${accountId}-${calendarId.replace(/[^a-z0-9]/gi, '-')}.data`

    const data = {
      '@context': { schema: 'https://schema.org/' },
      '@type': 'GoogleCalendarSync',
      accountId,
      calendarId,
      lastSync: new Date().toISOString(),
      '@graph': items,
    }

    await invoke('write_text_file', {
      filePath,
      content: JSON.stringify(data, null, 2),
    })
  }

  // Get local event by Google ID
  private async getLocalEvent(
    accountId: string,
    googleEventId: string,
  ): Promise<(CalendarItem & { syncMetadata?: SyncMetadata }) | null> {
    // Search through sync files for this event
    try {
      const accountState = this.syncStates.get(accountId)
      if (!accountState) return null

      for (const calendarId of Object.keys(accountState.calendars)) {
        const filePath = `${this.vaultPath}/@calendar/google-${accountId}-${calendarId.replace(/[^a-z0-9]/gi, '-')}.data`
        try {
          const response = await invoke<{ content: string }>('read_text_file', { filePath })
          const data = JSON.parse(response.content)
          const items = data['@graph'] || []
          const found = items.find(
            (i: CalendarItem & { syncMetadata?: SyncMetadata }) => i.syncMetadata?.googleEventId === googleEventId,
          )
          if (found) return found
        } catch {
          continue
        }
      }
    } catch {
      return null
    }
    return null
  }

  // Store a single local event
  private async storeLocalEvent(item: CalendarItem & { syncMetadata: SyncMetadata }): Promise<void> {
    if (!item.syncMetadata.googleCalendarId || !item.syncMetadata.googleAccountId) return

    const calendarId = item.syncMetadata.googleCalendarId
    const accountId = item.syncMetadata.googleAccountId
    const filePath = `${this.vaultPath}/@calendar/google-${accountId}-${calendarId.replace(/[^a-z0-9]/gi, '-')}.data`

    let data: { '@graph': (CalendarItem & { syncMetadata: SyncMetadata })[] }
    try {
      const response = await invoke<{ content: string }>('read_text_file', { filePath })
      data = JSON.parse(response.content)
    } catch {
      data = {
        '@context': { schema: 'https://schema.org/' },
        '@type': 'GoogleCalendarSync',
        '@graph': [],
      } as unknown as { '@graph': (CalendarItem & { syncMetadata: SyncMetadata })[] }
    }

    // Update or add
    const index = data['@graph'].findIndex((i) => i.syncMetadata?.googleEventId === item.syncMetadata.googleEventId)
    if (index >= 0) {
      data['@graph'][index] = item
    } else {
      data['@graph'].push(item)
    }

    await invoke('write_text_file', {
      filePath,
      content: JSON.stringify(data, null, 2),
    })
  }

  // Update a local event
  private async updateLocalEvent(item: CalendarItem & { syncMetadata?: SyncMetadata }): Promise<void> {
    if (!item.syncMetadata) return
    await this.storeLocalEvent(item as CalendarItem & { syncMetadata: SyncMetadata })
  }

  // Handle remote deletion
  private async handleRemoteDeletion(accountId: string, calendarId: string, googleEventId: string): Promise<void> {
    const filePath = `${this.vaultPath}/@calendar/google-${accountId}-${calendarId.replace(/[^a-z0-9]/gi, '-')}.data`

    try {
      const response = await invoke<{ content: string }>('read_text_file', { filePath })
      const data = JSON.parse(response.content)
      data['@graph'] = (data['@graph'] || []).filter(
        (i: CalendarItem & { syncMetadata?: SyncMetadata }) => i.syncMetadata?.googleEventId !== googleEventId,
      )

      await invoke('write_text_file', {
        filePath,
        content: JSON.stringify(data, null, 2),
      })
    } catch {
      // File doesn't exist
    }
  }

  // Get events pending push
  private async getPendingPushEvents(accountId: string): Promise<(CalendarItem & { syncMetadata: SyncMetadata })[]> {
    const pending: (CalendarItem & { syncMetadata: SyncMetadata })[] = []
    const accountState = this.syncStates.get(accountId)
    if (!accountState) return pending

    for (const calendarId of Object.keys(accountState.calendars)) {
      const filePath = `${this.vaultPath}/@calendar/google-${accountId}-${calendarId.replace(/[^a-z0-9]/gi, '-')}.data`
      try {
        const response = await invoke<{ content: string }>('read_text_file', { filePath })
        const data = JSON.parse(response.content)
        const items = (data['@graph'] || []).filter(
          (i: CalendarItem & { syncMetadata?: SyncMetadata }) => i.syncMetadata?.syncStatus === 'pending-push',
        )
        pending.push(...items)
      } catch {
        continue
      }
    }

    return pending
  }

  // Start real-time polling for an account
  startPolling(account: GoogleAccount, intervalMs = 60000): void {
    // Stop existing polling
    this.stopPolling(account.id)

    // Start new polling
    const interval = setInterval(async () => {
      if (!account.calendarSyncEnabled) {
        this.stopPolling(account.id)
        return
      }

      try {
        await this.incrementalSync(account)
      } catch (error) {
        console.error(`Sync poll failed for ${account.email}:`, error)
      }
    }, intervalMs)

    this.pollIntervals.set(account.id, interval)
  }

  // Stop polling for an account
  stopPolling(accountId: string): void {
    const interval = this.pollIntervals.get(accountId)
    if (interval) {
      clearInterval(interval)
      this.pollIntervals.delete(accountId)
    }
  }

  // Stop all polling
  stopAllPolling(): void {
    for (const accountId of this.pollIntervals.keys()) {
      this.stopPolling(accountId)
    }
  }

  // Create a new event and sync to Google
  async createAndSync(
    account: GoogleAccount,
    calendarId: string,
    item: Omit<CalendarItem, 'id' | 'syncMetadata'>,
  ): Promise<CalendarItem & { syncMetadata: SyncMetadata }> {
    const googleEvent = calendarItemToGoogleEvent(item as CalendarItem)
    const created = await createEvent(this.clientId, account, calendarId, googleEvent)

    const calendarName = this.getCalendarName(calendarId)
    const localItem = googleEventToCalendarItem(created, calendarId, account.id, calendarName)
    await this.storeLocalEvent(localItem)

    return localItem
  }

  // Update an event and sync to Google
  async updateAndSync(
    account: GoogleAccount,
    item: CalendarItem & { syncMetadata: SyncMetadata },
  ): Promise<CalendarItem & { syncMetadata: SyncMetadata }> {
    if (!item.syncMetadata.googleEventId || !item.syncMetadata.googleCalendarId) {
      throw new Error('Cannot sync item without Google IDs')
    }

    const googleEvent = calendarItemToGoogleEvent(item)
    const updated = await updateEvent(
      this.clientId,
      account,
      item.syncMetadata.googleCalendarId,
      item.syncMetadata.googleEventId,
      googleEvent,
    )

    const calendarName = this.getCalendarName(item.syncMetadata.googleCalendarId)
    const localItem = googleEventToCalendarItem(updated, item.syncMetadata.googleCalendarId, account.id, calendarName)
    await this.storeLocalEvent(localItem)

    return localItem
  }

  // Delete an event and sync to Google
  async deleteAndSync(account: GoogleAccount, item: CalendarItem & { syncMetadata: SyncMetadata }): Promise<void> {
    if (!item.syncMetadata.googleEventId || !item.syncMetadata.googleCalendarId) {
      throw new Error('Cannot sync delete without Google IDs')
    }

    await deleteEvent(this.clientId, account, item.syncMetadata.googleCalendarId, item.syncMetadata.googleEventId)

    await this.handleRemoteDeletion(account.id, item.syncMetadata.googleCalendarId, item.syncMetadata.googleEventId)
  }
}
