/**
 * Terminal utility functions for calculating dimensions
 */

// Terminal font configuration (should match xterm options)
export const TERMINAL_FONT_FAMILY = 'JetBrains Mono, Menlo, Monaco, Consolas, monospace'
export const TERMINAL_FONT_SIZE = 13
export const TERMINAL_LINE_HEIGHT = 1.2

// Cache for measured character dimensions
let cachedCharWidth: number | null = null
let cachedCharHeight: number | null = null

/**
 * Measure the width of a single character using the terminal's font settings.
 * Uses canvas for accurate measurement.
 */
export function measureCharacterWidth(
  fontSize: number = TERMINAL_FONT_SIZE,
  fontFamily: string = TERMINAL_FONT_FAMILY,
): number {
  if (cachedCharWidth !== null) return cachedCharWidth

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    // Fallback: estimate based on font size (typical monospace ratio is ~0.6)
    cachedCharWidth = fontSize * 0.6
    return cachedCharWidth
  }

  ctx.font = `${fontSize}px ${fontFamily}`
  // Measure a representative character (all should be same width in monospace)
  const metrics = ctx.measureText('M')
  cachedCharWidth = metrics.width

  return cachedCharWidth
}

/**
 * Measure the height of a line using the terminal's font settings.
 */
export function measureCharacterHeight(
  fontSize: number = TERMINAL_FONT_SIZE,
  lineHeight: number = TERMINAL_LINE_HEIGHT,
): number {
  if (cachedCharHeight !== null) return cachedCharHeight

  // Line height is a multiplier of font size
  cachedCharHeight = Math.ceil(fontSize * lineHeight)
  return cachedCharHeight
}

/**
 * Calculate terminal dimensions (cols, rows) for a given container size.
 * Accounts for padding in the terminal container.
 */
export function calculateTerminalDimensions(
  containerWidth: number,
  containerHeight: number,
  options?: {
    fontSize?: number
    fontFamily?: string
    lineHeight?: number
    paddingX?: number // horizontal padding (left + right)
    paddingY?: number // vertical padding (top + bottom)
  },
): { cols: number; rows: number } {
  const {
    fontSize = TERMINAL_FONT_SIZE,
    fontFamily = TERMINAL_FONT_FAMILY,
    lineHeight = TERMINAL_LINE_HEIGHT,
    paddingX = 16, // p-2 = 8px each side = 16px total
    paddingY = 16,
  } = options ?? {}

  const charWidth = measureCharacterWidth(fontSize, fontFamily)
  const charHeight = measureCharacterHeight(fontSize, lineHeight)

  const availableWidth = Math.max(containerWidth - paddingX, 0)
  const availableHeight = Math.max(containerHeight - paddingY, 0)

  const cols = Math.max(Math.floor(availableWidth / charWidth), 1)
  const rows = Math.max(Math.floor(availableHeight / charHeight), 1)

  return { cols, rows }
}

/**
 * Estimate initial terminal dimensions based on window size.
 * Used when the actual container isn't mounted yet.
 * Assumes terminal takes most of the viewport minus UI chrome.
 */
export function estimateInitialDimensions(options?: {
  fontSize?: number
  fontFamily?: string
  lineHeight?: number
}): { cols: number; rows: number } {
  // Estimate container size from window, accounting for typical UI chrome:
  // - Dock/status bar: ~48px
  // - Some margin/padding: ~32px
  const estimatedWidth = window.innerWidth - 32
  const estimatedHeight = window.innerHeight - 80

  return calculateTerminalDimensions(estimatedWidth, estimatedHeight, {
    ...options,
    paddingX: 16,
    paddingY: 16,
  })
}

/**
 * Clear the cached character measurements.
 * Call this if font settings change.
 */
export function clearDimensionCache(): void {
  cachedCharWidth = null
  cachedCharHeight = null
}
