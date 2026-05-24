/**
 * Calendar Store
 * Manages calendar state for syncing between viewer and mini calendar
 */

import { create } from 'zustand'
import { add, format, isSameDay, parse } from 'date-fns'

export interface CalendarEvent {
  id: string
  name: string
  time?: string
  datetime: string
  description?: string
  color?: string
  sourcePath?: string
}

interface CalendarStore {
  // State
  selectedDate: Date
  currentMonth: string
  events: CalendarEvent[]
  isCalendarMode: boolean
  loading: boolean

  // Actions
  setSelectedDate: (date: Date) => void
  setCurrentMonth: (month: string) => void
  goToPreviousMonth: () => void
  goToNextMonth: () => void
  setEvents: (events: CalendarEvent[]) => void
  setCalendarMode: (enabled: boolean) => void
  setLoading: (loading: boolean) => void

  // Computed
  getEventsForDate: (date: Date) => CalendarEvent[]
  getEventDates: () => Date[]
}

export const useCalendarStore = create<CalendarStore>()((set, get) => ({
  selectedDate: new Date(),
  currentMonth: format(new Date(), 'MMM-yyyy'),
  events: [],
  isCalendarMode: false,
  loading: false,

  setSelectedDate: (date) => set({ selectedDate: date }),
  setCurrentMonth: (month) => set({ currentMonth: month }),
  goToPreviousMonth: () => {
    const { currentMonth } = get()
    const current = parse(currentMonth, 'MMM-yyyy', new Date())
    const prev = add(current, { months: -1 })
    set({ currentMonth: format(prev, 'MMM-yyyy') })
  },
  goToNextMonth: () => {
    const { currentMonth } = get()
    const current = parse(currentMonth, 'MMM-yyyy', new Date())
    const next = add(current, { months: 1 })
    set({ currentMonth: format(next, 'MMM-yyyy') })
  },
  setEvents: (events) => set({ events }),
  setCalendarMode: (enabled) => set({ isCalendarMode: enabled }),
  setLoading: (loading) => set({ loading }),

  getEventsForDate: (date) => {
    const { events } = get()
    return events.filter((event) => {
      const eventDate = new Date(event.datetime)
      return isSameDay(eventDate, date)
    })
  },

  getEventDates: () => {
    const { events } = get()
    const dates = new Set<string>()
    events.forEach((event) => {
      const eventDate = new Date(event.datetime)
      dates.add(format(eventDate, 'yyyy-MM-dd'))
    })
    return Array.from(dates).map((d) => new Date(d))
  },
}))
