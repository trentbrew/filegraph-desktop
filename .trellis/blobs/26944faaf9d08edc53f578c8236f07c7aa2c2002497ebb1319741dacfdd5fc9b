/**
 * Agent Tools — Calendar Domain
 *
 * Tools for reading and managing calendar events (local + Google Calendar).
 */

import { invoke } from '@tauri-apps/api/core'
import { join } from '@tauri-apps/api/path'
import { getVaultPath, readDataFile } from './helpers'

// ─────────────────────────────────────────────────────────────────────────────
// Tool definitions
// ─────────────────────────────────────────────────────────────────────────────

export const CALENDAR_TOOL_DEFINITIONS = [
  {
    type: 'function',
    name: 'get_calendar_events',
    description: `Get calendar events for a specific date or date range. Includes both local events and synced Google Calendar events.

**Examples:**
- "What's on my calendar today?" → date: today's date
- "What do I have this week?" → startDate: today, endDate: end of week
- "Any events tomorrow?" → date: tomorrow's date
- "Show my Google Calendar events" → no date filter needed

Returns events with name, time, location, participants, tags, and source (local or google-calendar). Recurring events are marked.`,
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Single date in YYYY-MM-DD format (e.g., "2025-12-17"). Use this for "today", "tomorrow", etc.' },
        startDate: { type: 'string', description: 'Start of date range in YYYY-MM-DD format. Use with endDate for ranges like "this week".' },
        endDate: { type: 'string', description: 'End of date range in YYYY-MM-DD format.' },
        includeAllDay: { type: 'boolean', description: 'Include all-day events (default: true)' },
      },
      required: [],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'create_calendar_event',
    description: `Prepare a new calendar event and open the event dialog for user confirmation. The user will review, modify if needed, and save.

**Examples:**
- "Schedule a meeting tomorrow at 2pm" → name, startDate, startTime
- "Add a reminder for Friday" → name, startDate, label: "reminder"
- "Create an all-day event for my birthday on Jan 15" → name, startDate, isAllDay: true

This opens the Calendar app with a pre-filled new event dialog. The user confirms before saving.`,
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Event name/title' },
        startDate: { type: 'string', description: 'Start date in YYYY-MM-DD format' },
        startTime: { type: ['string', 'null'], description: 'Start time in HH:MM format (24h). Omit for all-day events.' },
        endDate: { type: ['string', 'null'], description: 'End date in YYYY-MM-DD format (for multi-day events)' },
        endTime: { type: ['string', 'null'], description: 'End time in HH:MM format (24h)' },
        label: { type: ['string', 'null'], description: 'Event type: event, meeting, reminder, task, deadline, appointment, birthday, holiday, deepwork, social, rest, play' },
        location: { type: ['string', 'null'], description: 'Event location' },
        description: { type: ['string', 'null'], description: 'Event description/notes' },
        participants: { type: 'array', items: { type: 'string' }, description: 'List of participant emails (optional, can be empty array)' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Tags for the event (optional, can be empty array)' },
        urgency: { type: ['number', 'null'], description: 'Priority level: 1 (low), 2 (normal), 3 (high)' },
        syncToGoogle: { type: ['boolean', 'null'], description: 'If true, sync this event to Google Calendar (requires connected account)' },
        googleCalendarId: { type: ['string', 'null'], description: 'Specific Google Calendar ID to sync to. If not specified, uses primary calendar.' },
      },
      required: ['name', 'startDate', 'startTime', 'endDate', 'endTime', 'label', 'location', 'description', 'participants', 'tags', 'urgency', 'syncToGoogle', 'googleCalendarId'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'update_calendar_event',
    description: `Update an existing calendar event. For Google Calendar events, changes will sync back to Google.

**Examples:**
- "Move my 2pm meeting to 3pm" → eventId, startTime: "15:00"
- "Change the location of my dentist appointment" → eventId, location: "..."
- "Mark the deadline as high priority" → eventId, urgency: 3`,
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        eventId: { type: 'string', description: 'The ID of the event to update' },
        name: { type: ['string', 'null'], description: 'New event name/title' },
        startDate: { type: ['string', 'null'], description: 'New start date in YYYY-MM-DD format' },
        startTime: { type: ['string', 'null'], description: 'New start time in HH:MM format (24h)' },
        endDate: { type: ['string', 'null'], description: 'New end date in YYYY-MM-DD format' },
        endTime: { type: ['string', 'null'], description: 'New end time in HH:MM format (24h)' },
        label: { type: ['string', 'null'], description: 'New event type' },
        location: { type: ['string', 'null'], description: 'New event location' },
        description: { type: ['string', 'null'], description: 'New event description' },
        participants: { type: 'array', items: { type: 'string' }, description: 'New list of participant emails' },
        tags: { type: 'array', items: { type: 'string' }, description: 'New tags for the event' },
        urgency: { type: ['number', 'null'], description: 'New priority level: 1 (low), 2 (normal), 3 (high)' },
      },
      required: ['eventId', 'name', 'startDate', 'startTime', 'endDate', 'endTime', 'label', 'location', 'description', 'participants', 'tags', 'urgency'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'delete_calendar_event',
    description: `Delete a calendar event. For Google Calendar events, the event will also be deleted from Google.

**Examples:**
- "Cancel my meeting tomorrow" → first get_calendar_events to find the ID, then delete_calendar_event`,
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        eventId: { type: 'string', description: 'The ID of the event to delete' },
      },
      required: ['eventId'],
      additionalProperties: false,
    },
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatEvent(event: any): any {
  const startDate = new Date(event.startDate)
  const isAllDay = !event.startDate?.includes('T')
  return {
    id: event.id,
    name: event.name,
    label: event.label,
    date: event.startDate?.split('T')[0],
    time: isAllDay ? 'All day' : startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    endTime: event.endDate ? new Date(event.endDate).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : null,
    location: event.location,
    description: event.description,
    urgency: event.urgency,
    participants: event.participants,
    tags: event.tags,
    recurrence: event.recurrence ? 'recurring' : null,
    source: event.source || 'local',
  }
}

function applyEventUpdates(event: any, args: any): any {
  const updated = { ...event }
  if (args.name) updated.name = args.name
  if (args.label) updated.label = args.label
  if (args.location !== undefined) updated.location = args.location || undefined
  if (args.description !== undefined) updated.description = args.description || undefined
  if (args.participants) updated.participants = args.participants
  if (args.tags) updated.tags = args.tags
  if (args.urgency) updated.urgency = args.urgency
  if (args.startDate || args.startTime) {
    const currentDate = event.startDate?.split('T')[0] || args.startDate
    const currentTime = event.startDate?.includes('T') ? event.startDate.split('T')[1] : null
    if (args.startTime) updated.startDate = `${args.startDate || currentDate}T${args.startTime}:00`
    else if (args.startDate) updated.startDate = currentTime ? `${args.startDate}T${currentTime}` : args.startDate
  }
  if (args.endDate || args.endTime) {
    const currentEndDate = event.endDate?.split('T')[0] || args.endDate || updated.startDate?.split('T')[0]
    const currentEndTime = event.endDate?.includes('T') ? event.endDate.split('T')[1] : null
    if (args.endTime) updated.endDate = `${args.endDate || currentEndDate}T${args.endTime}:00`
    else if (args.endDate) updated.endDate = currentEndTime ? `${args.endDate}T${currentEndTime}` : args.endDate
  }
  return updated
}

async function saveEventLocally(vaultPath: string, event: any): Promise<void> {
  const calendarPath = await join(vaultPath, '@calendar/events.data')
  let data: any = { '@context': { schema: 'https://schema.org/' }, '@type': 'ItemList', '@graph': [] }
  try {
    const result = await invoke<{ content: string }>('read_text_file', { filePath: calendarPath })
    data = JSON.parse(result.content)
    if (!data['@graph']) data['@graph'] = []
  } catch { /* File doesn't exist yet */ }
  data['@graph'].push(event)
  await invoke('write_text_file', { filePath: calendarPath, content: JSON.stringify(data, null, 2) })
}

// ─────────────────────────────────────────────────────────────────────────────
// Handlers
// ─────────────────────────────────────────────────────────────────────────────

export async function getCalendarEvents(
  date?: string,
  startDate?: string,
  endDate?: string,
  includeAllDay?: boolean,
): Promise<any> {
  try {
    const allItems: any[] = []

    try {
      const localData = await readDataFile('@calendar/events.data')
      const localItems = localData?.items || localData?.['@graph'] || []
      allItems.push(...localItems.map((item: any) => ({ ...item, source: 'local' })))
    } catch { /* Local events file may not exist */ }

    try {
      const vaultPath = await getVaultPath()
      const calendarDir = await join(vaultPath, '@calendar')
      const dirItems = await invoke<Array<{ name: string; file_type: string }>>('list_directory', { path: calendarDir })
      for (const item of dirItems) {
        const file = item.name
        if (file.startsWith('google-') && file.endsWith('.data')) {
          try {
            const googleData = await readDataFile(`@calendar/${file}`)
            const googleItems = googleData?.['@graph'] || []
            allItems.push(...googleItems.map((item: any) => ({ ...item, source: 'google-calendar', calendarFile: file })))
          } catch { /* Skip */ }
        }
      }
    } catch { /* Calendar directory may not exist */ }

    if (allItems.length === 0) {
      return { events: [], count: 0, message: 'No events found in calendar (checked local and Google Calendar)' }
    }

    const includeAll = includeAllDay !== false

    if (!date && !startDate && !endDate) {
      return { events: allItems.slice(0, 30).map(formatEvent), count: allItems.length, message: `Found ${allItems.length} total events. Specify a date to filter.` }
    }

    const filterStart = date || startDate!
    const filterEnd = date || endDate!

    const filtered = allItems.filter((event: any) => {
      const eventStart = event.startDate?.split('T')[0]
      const eventEnd = event.endDate?.split('T')[0] || eventStart
      if (!eventStart) return false
      const overlaps = eventStart <= filterEnd && eventEnd >= filterStart
      if (!includeAll && !event.startDate?.includes('T')) return false
      return overlaps
    })

    filtered.sort((a: any, b: any) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())

    return {
      events: filtered.map(formatEvent),
      count: filtered.length,
      dateRange: date ? date : `${filterStart} to ${filterEnd}`,
      message: filtered.length === 0 ? `No events found for ${date || `${filterStart} to ${filterEnd}`}` : `Found ${filtered.length} event(s)`,
    }
  } catch (err) {
    return { error: `Failed to get calendar events: ${err}` }
  }
}

export async function createCalendarEvent(args: {
  name: string; startDate: string; startTime?: string | null; endDate?: string | null; endTime?: string | null
  label?: string | null; location?: string | null; description?: string | null; participants?: string[] | null
  tags?: string[] | null; urgency?: number | null; syncToGoogle?: boolean | null; googleCalendarId?: string | null
}): Promise<any> {
  const cardData = {
    type: 'event-form' as const,
    name: args.name,
    date: args.startDate,
    startTime: args.startTime || undefined,
    endTime: args.endTime || undefined,
    label: args.label || 'event',
    description: args.description || undefined,
    location: args.location || undefined,
    urgency: args.urgency || 2,
    isAllDay: !args.startTime,
    status: 'pending' as const,
  }
  return {
    __card__: cardData,
    message: `I've prepared the event "${args.name}" for ${args.startDate}${args.startTime ? ` at ${args.startTime}` : ' (all day)'}. Please review the details and confirm.`,
  }
}

export async function updateCalendarEvent(args: {
  eventId: string; name?: string | null; startDate?: string | null; startTime?: string | null
  endDate?: string | null; endTime?: string | null; label?: string | null; location?: string | null
  description?: string | null; participants?: string[] | null; tags?: string[] | null; urgency?: number | null
}): Promise<any> {
  try {
    const vaultPath = await getVaultPath()
    const isGoogleEvent = args.eventId.startsWith('google:')

    if (isGoogleEvent) {
      const googleStore = (window as any).__googleCalendarStore
      if (!googleStore) return { error: 'Google Calendar not connected' }
      const { accounts, syncEngine } = googleStore.getState()
      if (!syncEngine) return { error: 'Sync engine not initialized' }

      const calendarDir = await join(vaultPath, '@calendar')
      const dirItems = await invoke<Array<{ name: string }>>('list_directory', { path: calendarDir })
      for (const item of dirItems) {
        if (item.name.startsWith('google-') && item.name.endsWith('.data')) {
          try {
            const filePath = await join(calendarDir, item.name)
            const result = await invoke<{ content: string }>('read_text_file', { filePath })
            const data = JSON.parse(result.content)
            const events = data['@graph'] || []
            const eventIndex = events.findIndex((e: any) => e.id === args.eventId)
            if (eventIndex >= 0) {
              const updatedEvent = applyEventUpdates(events[eventIndex], args)
              const accountId = data.accountId
              const account = accounts.find((a: any) => a.id === accountId)
              if (account && updatedEvent.syncMetadata) {
                try {
                  const synced = await syncEngine.updateAndSync(account, updatedEvent)
                  return { event: formatEvent(synced), syncedToGoogle: true, message: 'Event updated and synced to Google Calendar' }
                } catch (syncErr) {
                  events[eventIndex] = updatedEvent
                  await invoke('write_text_file', { filePath, content: JSON.stringify(data, null, 2) })
                  return { event: formatEvent(updatedEvent), savedLocally: true, syncError: String(syncErr), message: 'Event updated locally. Google sync failed.' }
                }
              }
              events[eventIndex] = updatedEvent
              await invoke('write_text_file', { filePath, content: JSON.stringify(data, null, 2) })
              return { event: formatEvent(updatedEvent), savedLocally: true, message: 'Event updated locally' }
            }
          } catch { continue }
        }
      }
      return { error: `Google event not found: ${args.eventId}` }
    }

    const calendarPath = await join(vaultPath, '@calendar/events.data')
    const result = await invoke<{ content: string }>('read_text_file', { filePath: calendarPath })
    const data = JSON.parse(result.content)
    const events = data['@graph'] || data.items || []
    const eventIndex = events.findIndex((e: any) => e.id === args.eventId)
    if (eventIndex < 0) return { error: `Event not found: ${args.eventId}` }

    const updatedEvent = applyEventUpdates(events[eventIndex], args)
    events[eventIndex] = updatedEvent
    if (data['@graph']) data['@graph'] = events; else data.items = events
    await invoke('write_text_file', { filePath: calendarPath, content: JSON.stringify(data, null, 2) })
    return { event: formatEvent(updatedEvent), savedLocally: true, message: 'Event updated successfully' }
  } catch (err) {
    return { error: `Failed to update event: ${err}` }
  }
}

export async function deleteCalendarEvent(eventId: string): Promise<any> {
  try {
    const vaultPath = await getVaultPath()
    const isGoogleEvent = eventId.startsWith('google:')

    if (isGoogleEvent) {
      const googleStore = (window as any).__googleCalendarStore
      if (!googleStore) return { error: 'Google Calendar not connected' }
      const { accounts, syncEngine } = googleStore.getState()
      if (!syncEngine) return { error: 'Sync engine not initialized' }

      const calendarDir = await join(vaultPath, '@calendar')
      const dirItems = await invoke<Array<{ name: string }>>('list_directory', { path: calendarDir })
      for (const item of dirItems) {
        if (item.name.startsWith('google-') && item.name.endsWith('.data')) {
          try {
            const filePath = await join(calendarDir, item.name)
            const result = await invoke<{ content: string }>('read_text_file', { filePath })
            const data = JSON.parse(result.content)
            const events = data['@graph'] || []
            const eventIndex = events.findIndex((e: any) => e.id === eventId)
            if (eventIndex >= 0) {
              const event = events[eventIndex]
              const accountId = data.accountId
              const account = accounts.find((a: any) => a.id === accountId)
              if (account && event.syncMetadata) {
                try {
                  await syncEngine.deleteAndSync(account, event)
                  return { deleted: true, deletedFromGoogle: true, eventId, message: 'Event deleted from Google Calendar' }
                } catch (syncErr) {
                  events.splice(eventIndex, 1)
                  await invoke('write_text_file', { filePath, content: JSON.stringify(data, null, 2) })
                  return { deleted: true, deletedLocally: true, syncError: String(syncErr), eventId, message: 'Event deleted locally. Google sync failed.' }
                }
              }
              events.splice(eventIndex, 1)
              await invoke('write_text_file', { filePath, content: JSON.stringify(data, null, 2) })
              return { deleted: true, deletedLocally: true, eventId, message: 'Event deleted' }
            }
          } catch { continue }
        }
      }
      return { error: `Google event not found: ${eventId}` }
    }

    const calendarPath = await join(vaultPath, '@calendar/events.data')
    const result = await invoke<{ content: string }>('read_text_file', { filePath: calendarPath })
    const data = JSON.parse(result.content)
    const events = data['@graph'] || data.items || []
    const eventIndex = events.findIndex((e: any) => e.id === eventId)
    if (eventIndex < 0) return { error: `Event not found: ${eventId}` }
    events.splice(eventIndex, 1)
    if (data['@graph']) data['@graph'] = events; else data.items = events
    await invoke('write_text_file', { filePath: calendarPath, content: JSON.stringify(data, null, 2) })
    return { deleted: true, deletedLocally: true, eventId, message: 'Event deleted successfully' }
  } catch (err) {
    return { error: `Failed to delete event: ${err}` }
  }
}
