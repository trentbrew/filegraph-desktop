/**
 * Widgets Module
 * Exports widget registry, types, and utilities
 */

export {
  WIDGET_REGISTRY,
  WIDGET_LIST,
  WIDGET_IDS,
  WIDGET_CATEGORY_LABELS,
  getWidget,
  getDefaultWidgetIds,
  getWidgetsByCategory,
  getImplementedWidgets,
  getPlaceholderWidgets,
  type WidgetId,
  type WidgetCategory,
  type WidgetStatus,
  type WidgetDefinition,
} from './registry'

export {
  type BaseWidgetData,
  type TimerPreset,
  type TimerHistoryEntry,
  type TimerWidgetData,
  type QuickNotesWidgetData,
  type TodayScheduleWidgetData,
  type CalculatorWidgetData,
  type WeatherWidgetData,
  type SystemMonitorWidgetData,
  type WidgetData,
  createDefaultWidgetData,
} from './types'
