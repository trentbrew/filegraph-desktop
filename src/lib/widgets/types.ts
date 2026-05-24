/**
 * Widget Data Types
 * JSON-LD schemas for widget state files stored in @system/widgets/
 */

// Base widget data structure (all widgets extend this)
export interface BaseWidgetData {
  '@context': { schema: string }
  '@type': 'Widget'
  '@id': string
  widgetType: string
  updatedAt?: string
}

// Timer preset
export interface TimerPreset {
  id: string
  name: string
  duration: number // seconds
  icon?: string
}

// Timer history entry
export interface TimerHistoryEntry {
  id: string
  presetName: string
  duration: number
  completedAt: string
}

// Timer widget
export interface TimerWidgetData extends BaseWidgetData {
  widgetType: 'timer'
  state: {
    mode: 'pomodoro' | 'stopwatch' | 'countdown'
    duration: number // seconds
    remaining: number // seconds
    isRunning: boolean
    startedAt?: string
    completedSessions?: number
  }
  presets: TimerPreset[]
  history: TimerHistoryEntry[]
  settings: {
    workDuration: number // seconds (default 1500 = 25min)
    shortBreak: number // seconds (default 300 = 5min)
    longBreak: number // seconds (default 900 = 15min)
    sessionsBeforeLongBreak: number // default 4
    autoStartBreaks: boolean
    autoStartWork: boolean
    sound: boolean
  }
}

// Quick notes widget
export interface QuickNotesWidgetData extends BaseWidgetData {
  widgetType: 'quick-notes'
  state: {
    content: string
    cursorPosition?: number
  }
  settings: {
    fontSize: 'sm' | 'base' | 'lg'
    lineNumbers: boolean
  }
}

// Today's schedule widget
export interface TodayScheduleWidgetData extends BaseWidgetData {
  widgetType: 'today-schedule'
  state: {
    lastRefreshed?: string
    cachedItems?: Array<{
      id: string
      name: string
      time: string
      label: string
      color?: string
    }>
  }
  settings: {
    showCompleted: boolean
    maxItems: number
  }
}

// Calculator widget
export interface CalculatorWidgetData extends BaseWidgetData {
  widgetType: 'calculator'
  state: {
    display: string
    memory: number
    history: Array<{
      expression: string
      result: string
    }>
  }
  settings: {
    precision: number
    scientificMode: boolean
  }
}

// Weather widget
export interface WeatherWidgetData extends BaseWidgetData {
  widgetType: 'weather'
  state: {
    lastFetched?: string
    current?: {
      temp: number
      condition: string
      icon: string
      humidity: number
      wind: number
    }
    forecast?: Array<{
      day: string
      high: number
      low: number
      condition: string
    }>
  }
  settings: {
    location: string
    units: 'celsius' | 'fahrenheit'
    showForecast: boolean
  }
}

// System monitor widget
export interface SystemMonitorWidgetData extends BaseWidgetData {
  widgetType: 'system-monitor'
  state: {
    cpu: number
    memory: number
    disk?: number
  }
  settings: {
    refreshInterval: number // seconds
    showDisk: boolean
  }
}

// Union type for all widget data
export type WidgetData =
  | TimerWidgetData
  | QuickNotesWidgetData
  | TodayScheduleWidgetData
  | CalculatorWidgetData
  | WeatherWidgetData
  | SystemMonitorWidgetData

// Helper to create default widget data
export function createDefaultWidgetData(widgetType: string): WidgetData {
  const base = {
    '@context': { schema: 'https://schema.org/' },
    '@type': 'Widget' as const,
    '@id': `widget:${widgetType}:001`,
    updatedAt: new Date().toISOString(),
  }

  switch (widgetType) {
    case 'timer':
      return {
        ...base,
        widgetType: 'timer',
        state: {
          mode: 'pomodoro',
          duration: 1500,
          remaining: 1500,
          isRunning: false,
          completedSessions: 0,
        },
        presets: [
          // Pomodoro presets
          { id: 'pomodoro', name: 'Pomodoro', duration: 1500, icon: 'brain' }, // 25 min
          { id: 'short-break', name: 'Short Break', duration: 300, icon: 'coffee' }, // 5 min
          { id: 'long-break', name: 'Long Break', duration: 900, icon: 'sun' }, // 15 min
          // Extended focus
          { id: 'deep-work', name: 'Deep Work', duration: 2700, icon: 'brain' }, // 45 min
          { id: 'hour-focus', name: '1 Hour Focus', duration: 3600, icon: 'brain' }, // 60 min
          // Quick timers
          { id: 'quick-10', name: '10 min', duration: 600 },
          { id: 'quick-15', name: '15 min', duration: 900 },
          { id: 'quick-30', name: '30 min', duration: 1800 },
        ],
        history: [],
        settings: {
          workDuration: 1500,
          shortBreak: 300,
          longBreak: 900,
          sessionsBeforeLongBreak: 4,
          autoStartBreaks: false,
          autoStartWork: false,
          sound: true,
        },
      }

    case 'quick-notes':
      return {
        ...base,
        widgetType: 'quick-notes',
        state: {
          content: '',
        },
        settings: {
          fontSize: 'sm',
          lineNumbers: false,
        },
      }

    case 'today-schedule':
      return {
        ...base,
        widgetType: 'today-schedule',
        state: {},
        settings: {
          showCompleted: false,
          maxItems: 5,
        },
      }

    case 'calculator':
      return {
        ...base,
        widgetType: 'calculator',
        state: {
          display: '0',
          memory: 0,
          history: [],
        },
        settings: {
          precision: 10,
          scientificMode: false,
        },
      }

    case 'weather':
      return {
        ...base,
        widgetType: 'weather',
        state: {},
        settings: {
          location: '',
          units: 'fahrenheit',
          showForecast: true,
        },
      }

    case 'system-monitor':
      return {
        ...base,
        widgetType: 'system-monitor',
        state: {
          cpu: 0,
          memory: 0,
        },
        settings: {
          refreshInterval: 5,
          showDisk: false,
        },
      }

    case 'quick-settings':
    case 'now-playing':
    case 'notifications':
    case 'bookmarks':
      // Placeholder widgets - return generic data
      return {
        ...base,
        widgetType: widgetType as any,
        state: {},
        settings: {},
      } as any

    default:
      // Return generic placeholder for unknown types
      return {
        ...base,
        widgetType: widgetType as any,
        state: {},
        settings: {},
      } as any
  }
}
