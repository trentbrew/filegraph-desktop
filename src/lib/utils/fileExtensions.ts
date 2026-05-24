/**
 * File Extension Utilities
 *
 * Handles extraction of file extensions with support for compound extensions
 * like .note.trellis, .data.trellis, etc.
 */

/**
 * Extract the effective file extension from a filename.
 *
 * Handles trellis variants:
 * - `file.note.trellis` → `note`
 * - `file.data.trellis` → `data`
 * - `file.canvas.trellis` → `canvas`
 * - `file.md` → `md`
 * - `file.txt` → `txt`
 *
 * @param fileName - The file name or path
 * @returns The effective extension (without dot) or null if no extension
 */
export function getEffectiveExtension(fileName: string): string | null {
  if (!fileName) return null

  const parts = fileName.split('.')

  // No extension
  if (parts.length === 1) return null

  const lastPart = parts[parts.length - 1].toLowerCase()

  // Check if it's a .trellis variant
  if (lastPart === 'trellis' && parts.length >= 3) {
    // Return the second-to-last part (e.g., 'note' from 'file.note.trellis')
    return parts[parts.length - 2].toLowerCase()
  }

  // Regular extension
  return lastPart
}

/**
 * Check if a file is a trellis variant.
 *
 * @param fileName - The file name or path
 * @returns True if the file ends with .trellis
 */
export function isTrellisVariant(fileName: string): boolean {
  if (!fileName) return false
  return fileName.toLowerCase().endsWith('.trellis')
}

/**
 * Get the full compound extension (e.g., 'note.trellis' from 'file.note.trellis').
 *
 * @param fileName - The file name or path
 * @returns The compound extension or single extension
 */
export function getCompoundExtension(fileName: string): string | null {
  if (!fileName) return null

  const parts = fileName.split('.')

  if (parts.length === 1) return null

  const lastPart = parts[parts.length - 1].toLowerCase()

  // Check if it's a .trellis variant
  if (lastPart === 'trellis' && parts.length >= 3) {
    // Return both parts (e.g., 'note.trellis')
    return `${parts[parts.length - 2]}.${lastPart}`.toLowerCase()
  }

  // Regular extension
  return lastPart
}

/**
 * Custom file types that support .trellis variants.
 */
export const TRELLIS_SUPPORTED_TYPES = new Set([
  'note',
  'data',
  'canvas',
  'whiteboard',
  // Add more custom types here as they're created
])

/**
 * Check if a file type supports trellis variants.
 *
 * @param extension - The file extension (without dot)
 * @returns True if the type supports .trellis variants
 */
export function supportsTrellisVariant(extension: string | null): boolean {
  if (!extension) return false
  return TRELLIS_SUPPORTED_TYPES.has(extension.toLowerCase())
}
