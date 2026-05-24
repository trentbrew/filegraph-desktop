/**
 * Onboarding Service
 * Handles populating ~/.filegraph with demo files on first launch
 * 
 * Demo files are sourced from: src/data/demo-files/
 * They are bundled with the app and copied to ~/.filegraph on first launch.
 * 
 * To update demo content, edit files in src/data/demo-files/ and rebuild.
 */

import { invoke } from '@tauri-apps/api/core'

export class OnboardingService {
  private static instance: OnboardingService
  private readonly ONBOARDING_MARKER = '.onboarding-complete'

  static getInstance(): OnboardingService {
    if (!OnboardingService.instance) {
      OnboardingService.instance = new OnboardingService()
    }
    return OnboardingService.instance
  }

  /**
   * Check if onboarding has been completed
   */
  async isOnboardingComplete(): Promise<boolean> {
    try {
      const homeDir = await this.getFilegraphHome()
      await invoke('read_text_file', { filePath: `${homeDir}/${this.ONBOARDING_MARKER}` })
      return true
    } catch {
      return false
    }
  }

  /**
   * Run the onboarding process to populate demo files
   * Uses the Rust copy_demo_files command to copy bundled demo files
   */
  async runOnboarding(): Promise<void> {
    console.log('[OnboardingService] Starting filegraph onboarding...')

    try {
      // Copy demo files from bundled resources to vault
      console.log('[OnboardingService] Copying demo files from bundled resources...')
      const result = await invoke<string>('copy_demo_files')
      console.log('[OnboardingService]', result)

      // Create onboarding marker
      const homeDir = await this.getFilegraphHome()
      console.log('[OnboardingService] Creating onboarding marker...')
      await invoke('write_text_file', {
        filePath: `${homeDir}/${this.ONBOARDING_MARKER}`,
        content: new Date().toISOString(),
      })

      console.log('[OnboardingService] Filegraph onboarding completed successfully')
    } catch (error) {
      console.error('[OnboardingService] Onboarding failed:', error)
      throw error
    }
  }

  /**
   * Get the ~/.filegraph directory path
   */
  private async getFilegraphHome(): Promise<string> {
    return await invoke<string>('get_home_directory')
  }

  /**
   * Reset onboarding (for testing or user preference)
   * This deletes the marker file, allowing demo files to be re-copied on next launch
   */
  async resetOnboarding(): Promise<void> {
    try {
      const homeDir = await this.getFilegraphHome()
      const markerPath = `${homeDir}/${this.ONBOARDING_MARKER}`

      try {
        await invoke('delete_item', { path: markerPath })
        console.log('[OnboardingService] Onboarding reset - demo files will be copied on next launch')
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        if (!errorMessage.includes('does not exist')) {
          console.warn('[OnboardingService] Warning removing onboarding marker:', error)
        }
      }
    } catch (error) {
      console.error('[OnboardingService] Failed to reset onboarding:', error)
      throw error
    }
  }
}

export default OnboardingService
