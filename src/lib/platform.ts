/**
 * Platform detection utilities
 *
 * Uses navigator.userAgent to detect the host OS.
 * Works reliably in Tauri's webview on all platforms.
 */

export type Platform = 'macos' | 'linux' | 'windows' | 'unknown'

let _platform: Platform | null = null

export function getPlatform(): Platform {
  if (_platform) return _platform

  const ua = navigator.userAgent.toLowerCase()

  if (ua.includes('mac')) {
    _platform = 'macos'
  } else if (ua.includes('linux')) {
    _platform = 'linux'
  } else if (ua.includes('win')) {
    _platform = 'windows'
  } else {
    _platform = 'unknown'
  }

  return _platform
}

export const isMac = () => getPlatform() === 'macos'
export const isLinux = () => getPlatform() === 'linux'
export const isWindows = () => getPlatform() === 'windows'

/**
 * Returns the platform-appropriate modifier key label
 * macOS: ⌘  Linux/Windows: Ctrl
 */
export const modKey = () => (isMac() ? '⌘' : 'Ctrl')

/**
 * Whether to use macOS-style traffic light window controls
 * vs standard close/minimize/maximize buttons
 */
export const useTrafficLights = () => isMac()
