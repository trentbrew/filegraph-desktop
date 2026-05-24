/**
 * Google Calendar Integration Types
 * Types for OAuth, calendar data, and sync operations
 */

// OAuth token structure
export interface GoogleTokens {
  access_token: string
  refresh_token: string
  token_type: string
  expires_at: number // Unix timestamp
  scope: string
}

// Connected Google account
export interface GoogleAccount {
  id: string // Google account ID
  email: string
  name: string
  picture?: string
  tokens: GoogleTokens
  connectedAt: string // ISO timestamp
  lastSyncAt?: string // ISO timestamp

  // Service-specific settings
  enabledServices: GoogleService[] // Which services are enabled for this account

  // Calendar-specific
  calendarSyncEnabled: boolean
  selectedCalendars: string[] // Calendar IDs to sync

  // Gmail-specific (future)
  gmailSyncEnabled: boolean

  // Drive-specific (future)
  driveSyncEnabled: boolean
}

// Google Calendar metadata
export interface GoogleCalendar {
  id: string
  summary: string // Calendar name
  description?: string
  timeZone?: string
  backgroundColor?: string
  foregroundColor?: string
  primary?: boolean
  accessRole: 'freeBusyReader' | 'reader' | 'writer' | 'owner'
  selected?: boolean // Whether user wants to sync this calendar
}

// Google Calendar Event (API response format)
export interface GoogleCalendarEvent {
  id: string
  status: 'confirmed' | 'tentative' | 'cancelled'
  htmlLink?: string
  created: string
  updated: string
  summary?: string
  description?: string
  location?: string
  colorId?: string
  creator?: {
    email: string
    displayName?: string
    self?: boolean
  }
  organizer?: {
    email: string
    displayName?: string
    self?: boolean
  }
  start: {
    date?: string // For all-day events
    dateTime?: string // For timed events
    timeZone?: string
  }
  end: {
    date?: string
    dateTime?: string
    timeZone?: string
  }
  recurrence?: string[]
  recurringEventId?: string
  attendees?: Array<{
    email: string
    displayName?: string
    responseStatus: 'needsAction' | 'declined' | 'tentative' | 'accepted'
    self?: boolean
  }>
  reminders?: {
    useDefault: boolean
    overrides?: Array<{
      method: 'email' | 'popup'
      minutes: number
    }>
  }
  source?: {
    title: string
    url: string
  }
  // For sync
  etag?: string
  iCalUID?: string
  sequence?: number
}

// Sync metadata stored with local events
export interface SyncMetadata {
  googleEventId?: string
  googleCalendarId?: string
  googleAccountId?: string
  googleEtag?: string
  lastSyncedAt?: string
  syncStatus: 'synced' | 'local-only' | 'pending-push' | 'pending-pull' | 'conflict'
  localVersion?: number
  remoteVersion?: number
}

// Extended CalendarItem with sync metadata
export interface SyncableCalendarItem {
  id: string
  syncMetadata?: SyncMetadata
  [key: string]: unknown
}

// Sync operation result
export interface SyncResult {
  accountId: string
  success: boolean
  error?: string
  pulled: number // Events pulled from Google
  pushed: number // Events pushed to Google
  conflicts: number // Conflicts detected
  deleted: number // Deleted events synced
  timestamp: string
}

// Sync conflict
export interface SyncConflict {
  localItem: SyncableCalendarItem
  remoteEvent: GoogleCalendarEvent
  conflictType: 'modified-both' | 'deleted-local' | 'deleted-remote'
  resolution?: 'keep-local' | 'keep-remote' | 'merge'
}

// OAuth configuration
export interface OAuthConfig {
  clientId: string
  redirectUri: string
  scopes: string[]
}

// Service-specific scopes
export const GOOGLE_SCOPES = {
  // Base scopes (always requested)
  profile: ['https://www.googleapis.com/auth/userinfo.email', 'https://www.googleapis.com/auth/userinfo.profile'],
  // Calendar
  calendar: ['https://www.googleapis.com/auth/calendar.readonly', 'https://www.googleapis.com/auth/calendar.events'],
  // Gmail
  gmail: [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.modify',
  ],
  // Drive (future)
  drive: ['https://www.googleapis.com/auth/drive.readonly', 'https://www.googleapis.com/auth/drive.file'],
} as const

// Service types
export type GoogleService = 'calendar' | 'gmail' | 'drive'

// Get scopes for requested services
export function getScopesForServices(services: GoogleService[]): string[] {
  const scopes = new Set<string>(GOOGLE_SCOPES.profile)
  for (const service of services) {
    for (const scope of GOOGLE_SCOPES[service]) {
      scopes.add(scope)
    }
  }
  return Array.from(scopes)
}

// Legacy export for backwards compatibility
export const GOOGLE_CALENDAR_SCOPES = [...GOOGLE_SCOPES.profile, ...GOOGLE_SCOPES.calendar]

// OAuth state for PKCE flow
export interface PKCEState {
  codeVerifier: string
  codeChallenge: string
  state: string
}

// Google user info response
export interface GoogleUserInfo {
  id: string
  email: string
  verified_email: boolean
  name: string
  given_name?: string
  family_name?: string
  picture?: string
}

// Calendar list response
export interface CalendarListResponse {
  kind: 'calendar#calendarList'
  etag: string
  nextPageToken?: string
  nextSyncToken?: string
  items: GoogleCalendar[]
}

// Events list response
export interface EventsListResponse {
  kind: 'calendar#events'
  etag: string
  summary: string
  updated: string
  timeZone: string
  accessRole: string
  nextPageToken?: string
  nextSyncToken?: string
  items: GoogleCalendarEvent[]
}
