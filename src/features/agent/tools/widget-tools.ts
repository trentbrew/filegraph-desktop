/**
 * Agent Tools — Widget Domain
 *
 * Tools for managing status bar widgets (timer, quick-notes, etc.)
 */

import * as widgetActions from '../actions/widgetActions'

// ─────────────────────────────────────────────────────────────────────────────
// Tool definitions
// ─────────────────────────────────────────────────────────────────────────────

export const WIDGET_TOOL_DEFINITIONS = [
  {
    type: 'function',
    name: 'get_timer_state',
    description: `Get the current state of the timer widget. Returns status (idle/running/paused), remaining time, duration, and progress percentage.`,
    strict: true,
    parameters: { type: 'object', properties: {}, required: [], additionalProperties: false },
  },
  {
    type: 'function',
    name: 'start_timer',
    description: `Start a new timer for a specified number of minutes. This will start counting down immediately and show in the status bar.

**Examples:**
- "Set a 25 minute focus timer" → start_timer(25, "Focus")
- "Start a 5 minute break" → start_timer(5, "Break")
- "Timer for 10 minutes" → start_timer(10)`,
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        minutes: { type: 'number', description: 'Duration in minutes (e.g., 25 for a pomodoro)' },
        name: { type: ['string', 'null'], description: 'Optional name/label for the timer (e.g., "Focus", "Break")' },
      },
      required: ['minutes', 'name'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'pause_timer',
    description: `Pause the currently running timer. The timer can be resumed later.`,
    strict: true,
    parameters: { type: 'object', properties: {}, required: [], additionalProperties: false },
  },
  {
    type: 'function',
    name: 'resume_timer',
    description: `Resume a paused timer. Continues counting down from where it was paused.`,
    strict: true,
    parameters: { type: 'object', properties: {}, required: [], additionalProperties: false },
  },
  {
    type: 'function',
    name: 'stop_timer',
    description: `Stop and reset the timer completely. Use this to cancel a timer.`,
    strict: true,
    parameters: { type: 'object', properties: {}, required: [], additionalProperties: false },
  },
  {
    type: 'function',
    name: 'get_enabled_widgets',
    description: `Get the list of currently enabled widgets in the status bar.`,
    strict: true,
    parameters: { type: 'object', properties: {}, required: [], additionalProperties: false },
  },
  {
    type: 'function',
    name: 'enable_widget',
    description: `Enable a widget to show in the status bar. Available widgets: timer, quick-notes, today-schedule, calculator, weather, system-monitor, quick-settings, now-playing, notifications, bookmarks.`,
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        widgetId: { type: 'string', description: 'Widget ID to enable (e.g., "timer", "quick-notes")' },
      },
      required: ['widgetId'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'disable_widget',
    description: `Disable a widget from the status bar.`,
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        widgetId: { type: 'string', description: 'Widget ID to disable' },
      },
      required: ['widgetId'],
      additionalProperties: false,
    },
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Handlers
// ─────────────────────────────────────────────────────────────────────────────

export function handle_get_timer_state() { return widgetActions.getTimerState() }
export function handle_start_timer(args: { minutes: number; name: string | null }) { return widgetActions.startTimer(args.minutes, args.name ?? undefined) }
export function handle_pause_timer() { return widgetActions.pauseTimer() }
export function handle_resume_timer() { return widgetActions.resumeTimer() }
export function handle_stop_timer() { return widgetActions.stopTimer() }
export function handle_get_enabled_widgets() { return widgetActions.getEnabledWidgets() }
export function handle_enable_widget(args: { widgetId: string }) { return widgetActions.enableWidget(args.widgetId) }
export function handle_disable_widget(args: { widgetId: string }) { return widgetActions.disableWidget(args.widgetId) }
