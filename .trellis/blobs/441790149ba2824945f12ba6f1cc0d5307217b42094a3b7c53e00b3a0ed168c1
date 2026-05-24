/**
 * Google Calendar API Client
 * Handles all Google Calendar API operations
 */

import type {
  GoogleCalendar,
  GoogleCalendarEvent,
  CalendarListResponse,
  EventsListResponse,
  GoogleAccount,
} from './types'
import { getValidAccessToken } from './oauth'

const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3'

// API request helper
async function apiRequest<T>(
  clientId: string,
  account: GoogleAccount,
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const accessToken = await getValidAccessToken(clientId, account)

  const response = await fetch(`${CALENDAR_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(`Google Calendar API error: ${error.error?.message || response.statusText}`)
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T
  }

  return response.json()
}

// List all calendars for the account
export async function listCalendars(clientId: string, account: GoogleAccount): Promise<GoogleCalendar[]> {
  const calendars: GoogleCalendar[] = []
  let pageToken: string | undefined

  do {
    const params = new URLSearchParams({ maxResults: '250' })
    if (pageToken) params.set('pageToken', pageToken)

    const response = await apiRequest<CalendarListResponse>(
      clientId,
      account,
      `/users/me/calendarList?${params.toString()}`,
    )

    calendars.push(...response.items)
    pageToken = response.nextPageToken
  } while (pageToken)

  return calendars
}

// Get events from a calendar
export async function listEvents(
  clientId: string,
  account: GoogleAccount,
  calendarId: string,
  options: {
    timeMin?: string
    timeMax?: string
    syncToken?: string
    maxResults?: number
    singleEvents?: boolean
  } = {},
): Promise<{ events: GoogleCalendarEvent[]; nextSyncToken?: string }> {
  const events: GoogleCalendarEvent[] = []
  let pageToken: string | undefined
  let nextSyncToken: string | undefined

  do {
    const params = new URLSearchParams()

    if (options.syncToken) {
      // Incremental sync - only use syncToken
      params.set('syncToken', options.syncToken)
    } else {
      // Full sync
      if (options.timeMin) params.set('timeMin', options.timeMin)
      if (options.timeMax) params.set('timeMax', options.timeMax)
      if (options.singleEvents !== false) params.set('singleEvents', 'true')
      params.set('orderBy', 'startTime')
    }

    params.set('maxResults', String(options.maxResults || 2500))
    if (pageToken) params.set('pageToken', pageToken)

    try {
      const response = await apiRequest<EventsListResponse>(
        clientId,
        account,
        `/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`,
      )

      events.push(...response.items)
      pageToken = response.nextPageToken
      nextSyncToken = response.nextSyncToken
    } catch (error) {
      // Handle 410 Gone - sync token expired, need full sync
      if (error instanceof Error && error.message.includes('410')) {
        // Retry without sync token
        return listEvents(clientId, account, calendarId, {
          ...options,
          syncToken: undefined,
        })
      }
      throw error
    }
  } while (pageToken)

  return { events, nextSyncToken }
}

// Get a single event
export async function getEvent(
  clientId: string,
  account: GoogleAccount,
  calendarId: string,
  eventId: string,
): Promise<GoogleCalendarEvent> {
  return apiRequest<GoogleCalendarEvent>(
    clientId,
    account,
    `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
  )
}

// Create a new event
export async function createEvent(
  clientId: string,
  account: GoogleAccount,
  calendarId: string,
  event: Partial<GoogleCalendarEvent>,
): Promise<GoogleCalendarEvent> {
  return apiRequest<GoogleCalendarEvent>(clientId, account, `/calendars/${encodeURIComponent(calendarId)}/events`, {
    method: 'POST',
    body: JSON.stringify(event),
  })
}

// Update an existing event
export async function updateEvent(
  clientId: string,
  account: GoogleAccount,
  calendarId: string,
  eventId: string,
  event: Partial<GoogleCalendarEvent>,
): Promise<GoogleCalendarEvent> {
  return apiRequest<GoogleCalendarEvent>(
    clientId,
    account,
    `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    {
      method: 'PUT',
      body: JSON.stringify(event),
    },
  )
}

// Patch an event (partial update)
export async function patchEvent(
  clientId: string,
  account: GoogleAccount,
  calendarId: string,
  eventId: string,
  event: Partial<GoogleCalendarEvent>,
): Promise<GoogleCalendarEvent> {
  return apiRequest<GoogleCalendarEvent>(
    clientId,
    account,
    `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(event),
    },
  )
}

// Delete an event
export async function deleteEvent(
  clientId: string,
  account: GoogleAccount,
  calendarId: string,
  eventId: string,
): Promise<void> {
  await apiRequest<void>(
    clientId,
    account,
    `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    {
      method: 'DELETE',
    },
  )
}

// Watch for changes (push notifications) - requires public URL
// For desktop apps, we'll use polling instead
export async function setupWatch(
  clientId: string,
  account: GoogleAccount,
  calendarId: string,
  webhookUrl: string,
  channelId: string,
): Promise<{ resourceId: string; expiration: string }> {
  return apiRequest(clientId, account, `/calendars/${encodeURIComponent(calendarId)}/events/watch`, {
    method: 'POST',
    body: JSON.stringify({
      id: channelId,
      type: 'web_hook',
      address: webhookUrl,
    }),
  })
}

// Get calendar colors
export async function getColors(
  clientId: string,
  account: GoogleAccount,
): Promise<{
  calendar: Record<string, { background: string; foreground: string }>
  event: Record<string, { background: string; foreground: string }>
}> {
  return apiRequest(clientId, account, '/colors')
}
