/**
 * Widget Store
 * Manages enabled/visible widgets and their state
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { type WidgetId, getDefaultWidgetIds } from '@/lib/widgets'

// Timer state for status bar display
interface TimerState {
  isRunning: boolean
  remaining: number // seconds
  duration: number // seconds
  mode: 'pomodoro' | 'stopwatch' | 'countdown'
}

interface WidgetState {
  // Which widgets are enabled (visible in status bar)
  enabledWidgets: WidgetId[]

  // Which widgets are pinned (visible in dock outside the status popover)
  pinnedWidgets: WidgetId[]

  // Widget-specific state (expandable)
  expandedWidget: WidgetId | null

  // Widget order (for drag-drop reordering)
  widgetOrder: WidgetId[]

  // Timer state (for status bar display)
  timerState: TimerState | null

  // Actions
  enableWidget: (id: WidgetId) => void
  disableWidget: (id: WidgetId) => void
  toggleWidget: (id: WidgetId) => void
  togglePinnedWidget: (id: WidgetId) => void
  setExpandedWidget: (id: WidgetId | null) => void
  reorderWidgets: (ids: WidgetId[]) => void
  resetToDefaults: () => void
  setTimerState: (state: TimerState | null) => void
  tickTimer: () => void
}

export const useWidgetStore = create<WidgetState>()(
  persist(
    (set, get) => ({
      enabledWidgets: getDefaultWidgetIds(),
      pinnedWidgets: [],
      expandedWidget: null,
      widgetOrder: getDefaultWidgetIds(),

      enableWidget: (id) => {
        set((state) => {
          if (state.enabledWidgets.includes(id)) return state
          return {
            enabledWidgets: [...state.enabledWidgets, id],
            widgetOrder: [...state.widgetOrder, id],
          }
        })
      },

      disableWidget: (id) => {
        set((state) => ({
          enabledWidgets: state.enabledWidgets.filter((w) => w !== id),
          widgetOrder: state.widgetOrder.filter((w) => w !== id),
          expandedWidget: state.expandedWidget === id ? null : state.expandedWidget,
        }))
      },

      toggleWidget: (id) => {
        const { enabledWidgets, enableWidget, disableWidget } = get()
        if (enabledWidgets.includes(id)) {
          disableWidget(id)
        } else {
          enableWidget(id)
        }
      },

      togglePinnedWidget: (id) => {
        set((state) => {
          const isPinned = state.pinnedWidgets.includes(id)
          return {
            pinnedWidgets: isPinned ? state.pinnedWidgets.filter((w) => w !== id) : [...state.pinnedWidgets, id],
          }
        })
      },

      setExpandedWidget: (id) => {
        set({ expandedWidget: id })
      },

      reorderWidgets: (ids) => {
        set({ widgetOrder: ids })
      },

      resetToDefaults: () => {
        const defaults = getDefaultWidgetIds()
        set({
          enabledWidgets: defaults,
          widgetOrder: defaults,
          pinnedWidgets: [],
          expandedWidget: null,
        })
      },

      // Timer state for status bar display
      timerState: null,

      setTimerState: (timerState) => {
        set({ timerState })
      },

      tickTimer: () => {
        const { timerState } = get()
        if (!timerState || !timerState.isRunning || timerState.remaining <= 0) return

        set({
          timerState: {
            ...timerState,
            remaining: timerState.remaining - 1,
          },
        })
      },
    }),
    {
      name: 'filegraph:widgets',
      version: 3,
      partialize: (state) => ({
        enabledWidgets: state.enabledWidgets,
        widgetOrder: state.widgetOrder,
        pinnedWidgets: state.pinnedWidgets,
        // Don't persist timerState - it should reset on reload
      }),
      migrate: (persistedState: any, version: number) => {
        if (version < 2) {
          // Migration from v1 to v2: add timerState
          return {
            ...persistedState,
            timerState: null,
          }
        }
        if (version < 3) {
          return {
            ...persistedState,
            pinnedWidgets: [],
          }
        }
        return persistedState
      },
    },
  ),
)
