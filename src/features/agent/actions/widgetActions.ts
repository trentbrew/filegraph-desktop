/**
 * Widget Actions - Agent tools for controlling widgets
 *
 * Provides programmatic control over widgets like timer, notes, etc.
 */

import { useWidgetStore } from '@/stores/useWidgetStore'
import type { WidgetId } from '@/lib/widgets'

/**
 * Get the current timer state
 */
export function getTimerState() {
  const { timerState } = useWidgetStore.getState()

  if (!timerState) {
    return {
      status: 'idle',
      message: 'No timer is currently set',
    }
  }

  const mins = Math.floor(timerState.remaining / 60)
  const secs = timerState.remaining % 60
  const formattedTime = `${mins}:${secs.toString().padStart(2, '0')}`

  return {
    status: timerState.isRunning ? 'running' : 'paused',
    remaining: timerState.remaining,
    remainingFormatted: formattedTime,
    duration: timerState.duration,
    durationMinutes: Math.floor(timerState.duration / 60),
    mode: timerState.mode,
    progress: timerState.duration > 0 ? ((timerState.duration - timerState.remaining) / timerState.duration) * 100 : 0,
  }
}

/**
 * Start a new timer
 */
export function startTimer(minutes: number, name?: string) {
  const { setTimerState } = useWidgetStore.getState()
  const seconds = Math.max(1, Math.round(minutes)) * 60

  setTimerState({
    isRunning: true,
    remaining: seconds,
    duration: seconds,
    mode: 'countdown',
  })

  return {
    success: true,
    message: `Started ${minutes} minute timer${name ? ` (${name})` : ''}`,
    timer: {
      duration: seconds,
      durationMinutes: minutes,
      status: 'running',
    },
  }
}

/**
 * Pause the current timer
 */
export function pauseTimer() {
  const { timerState, setTimerState } = useWidgetStore.getState()

  if (!timerState) {
    return {
      success: false,
      message: 'No timer is currently running',
    }
  }

  if (!timerState.isRunning) {
    return {
      success: false,
      message: 'Timer is already paused',
      remaining: timerState.remaining,
    }
  }

  setTimerState({
    ...timerState,
    isRunning: false,
  })

  const mins = Math.floor(timerState.remaining / 60)
  const secs = timerState.remaining % 60

  return {
    success: true,
    message: `Timer paused at ${mins}:${secs.toString().padStart(2, '0')}`,
    remaining: timerState.remaining,
  }
}

/**
 * Resume a paused timer
 */
export function resumeTimer() {
  const { timerState, setTimerState } = useWidgetStore.getState()

  if (!timerState) {
    return {
      success: false,
      message: 'No timer to resume. Start a new timer first.',
    }
  }

  if (timerState.isRunning) {
    return {
      success: false,
      message: 'Timer is already running',
    }
  }

  if (timerState.remaining <= 0) {
    return {
      success: false,
      message: 'Timer has completed. Start a new timer.',
    }
  }

  setTimerState({
    ...timerState,
    isRunning: true,
  })

  const mins = Math.floor(timerState.remaining / 60)
  const secs = timerState.remaining % 60

  return {
    success: true,
    message: `Timer resumed with ${mins}:${secs.toString().padStart(2, '0')} remaining`,
    remaining: timerState.remaining,
  }
}

/**
 * Stop and reset the timer
 */
export function stopTimer() {
  const { timerState, setTimerState } = useWidgetStore.getState()

  if (!timerState) {
    return {
      success: true,
      message: 'No timer was running',
    }
  }

  setTimerState(null)

  return {
    success: true,
    message: 'Timer stopped and reset',
  }
}

/**
 * Get list of enabled widgets
 */
export function getEnabledWidgets() {
  const { enabledWidgets, widgetOrder } = useWidgetStore.getState()

  return {
    enabled: enabledWidgets,
    order: widgetOrder,
    count: enabledWidgets.length,
  }
}

/**
 * Enable a widget
 */
export function enableWidget(widgetId: string) {
  const { enableWidget: enable, enabledWidgets } = useWidgetStore.getState()

  if (enabledWidgets.includes(widgetId as WidgetId)) {
    return {
      success: true,
      message: `Widget "${widgetId}" is already enabled`,
    }
  }

  enable(widgetId as WidgetId)

  return {
    success: true,
    message: `Widget "${widgetId}" enabled`,
  }
}

/**
 * Disable a widget
 */
export function disableWidget(widgetId: string) {
  const { disableWidget: disable, enabledWidgets } = useWidgetStore.getState()

  if (!enabledWidgets.includes(widgetId as WidgetId)) {
    return {
      success: true,
      message: `Widget "${widgetId}" is already disabled`,
    }
  }

  disable(widgetId as WidgetId)

  return {
    success: true,
    message: `Widget "${widgetId}" disabled`,
  }
}
