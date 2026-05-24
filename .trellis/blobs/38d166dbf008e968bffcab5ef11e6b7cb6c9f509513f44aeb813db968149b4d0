/**
 * Vault Context
 *
 * Manages the current indexed vault path and provides it to components
 */

import React, { createContext, useContext, useEffect, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { checkVaultExists, getDefaultVaultPath } from '@/lib/vault'
import OnboardingService from '@/services/onboardingService'
import { toast } from 'sonner'

interface VaultContextType {
  vaultPath: string | null
  setVaultPath: (path: string) => void
  isWithinVault: (path: string) => boolean
  needsOnboarding: boolean
  isLoading: boolean
  completeOnboarding: (path: string) => void
}

const VaultContext = createContext<VaultContextType | undefined>(undefined)

const VAULT_STORAGE_KEY = 'filegraph_vault_path'
const ONBOARDING_COMPLETE_KEY = 'filegraph_onboarding_complete'

export function VaultProvider({ children }: { children: React.ReactNode }) {
  const [vaultPath, setVaultPathState] = useState<string | null>(() => {
    // Restore from localStorage on mount
    const stored = localStorage.getItem(VAULT_STORAGE_KEY)
    console.log('[VaultContext] Restored vault path:', stored)
    return stored
  })
  const [needsOnboarding, setNeedsOnboarding] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Check for first-run on mount
  useEffect(() => {
    const checkFirstRun = async () => {
      try {
        // Always check if vault exists on disk first
        const vaultExists = await checkVaultExists()
        console.log('[VaultContext] Vault exists:', vaultExists)

        if (!vaultExists) {
          // Vault doesn't exist - clear any stale localStorage and show onboarding
          console.log('[VaultContext] Vault missing, clearing localStorage and showing onboarding')
          localStorage.removeItem(ONBOARDING_COMPLETE_KEY)
          localStorage.removeItem(VAULT_STORAGE_KEY)
          setVaultPathState(null)
          setNeedsOnboarding(true)
        } else {
          // Vault exists
          const onboardingComplete = localStorage.getItem(ONBOARDING_COMPLETE_KEY)
          const defaultPath = await getDefaultVaultPath()

          if (onboardingComplete !== 'true') {
            // Vault exists but onboarding flag not set
            // Check if demo files have been written, if not, write them
            console.log('[VaultContext] Vault exists, checking for demo files...')
            const onboardingService = OnboardingService.getInstance()
            const demoFilesExist = await onboardingService.isOnboardingComplete()

            if (!demoFilesExist) {
              console.log('[VaultContext] Demo files not found, running onboarding...')
              try {
                await onboardingService.runOnboarding()
                toast.success('Welcome! Demo files have been added to showcase Filegraph features.')
              } catch (error) {
                console.error('[VaultContext] Failed to create demo files:', error)
              }
            }

            localStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true')
          }

          if (!vaultPath) {
            setVaultPath(defaultPath)
          }
          setNeedsOnboarding(false)
        }
      } catch (error) {
        console.error('[VaultContext] Failed to check first run:', error)
      } finally {
        setIsLoading(false)
      }
    }

    checkFirstRun()
  }, [])

  // Auto-set vault path if not set and onboarding is complete
  useEffect(() => {
    if (vaultPath || needsOnboarding || isLoading) return

    const initializeVault = async () => {
      try {
        const defaultVault = await invoke<string>('get_home_directory')
        if (defaultVault) {
          setVaultPath(defaultVault)
        }
      } catch (error) {
        console.error('[VaultContext] Failed to determine default vault path:', error)
      }
    }

    void initializeVault()
  }, [vaultPath, needsOnboarding, isLoading])

  const setVaultPath = (path: string) => {
    console.log('[VaultContext] Setting vault path:', path)
    localStorage.setItem(VAULT_STORAGE_KEY, path)
    setVaultPathState(path)
  }

  const isWithinVault = (path: string): boolean => {
    if (!vaultPath) return true // No vault set, allow all
    return path.startsWith(vaultPath)
  }

  const completeOnboarding = async (path: string) => {
    console.log('[VaultContext] Completing onboarding with path:', path)

    try {
      // First complete the basic onboarding
      localStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true')
      setVaultPath(path)
      setNeedsOnboarding(false)

      // Then populate demo files
      console.log('[VaultContext] Getting onboarding service instance...')
      const onboardingService = OnboardingService.getInstance()
      console.log('[VaultContext] Checking if already onboarded...')
      const isAlreadyOnboarded = await onboardingService.isOnboardingComplete()

      if (!isAlreadyOnboarded) {
        console.log('[VaultContext] Running demo file onboarding...')
        await onboardingService.runOnboarding()
        toast.success('Welcome! Demo files have been added to showcase Filegraph features.')
      } else {
        console.log('[VaultContext] Demo onboarding already completed')
      }
    } catch (error) {
      console.error('[VaultContext] Failed to complete onboarding:', error)
      toast.error('Failed to setup demo files. You can try again later.')
      // Still complete basic onboarding even if demo setup fails
      localStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true')
      setVaultPath(path)
      setNeedsOnboarding(false)
    }
  }

  return (
    <VaultContext.Provider
      value={{
        vaultPath,
        setVaultPath,
        isWithinVault,
        needsOnboarding,
        isLoading,
        completeOnboarding,
      }}>
      {children}
    </VaultContext.Provider>
  )
}

export function useVault() {
  const context = useContext(VaultContext)
  if (!context) {
    throw new Error('useVault must be used within VaultProvider')
  }
  return context
}
