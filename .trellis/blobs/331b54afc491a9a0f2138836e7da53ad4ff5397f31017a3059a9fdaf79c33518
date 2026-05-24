import { useEffect, useRef } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { StoreApi, UseBoundStore } from 'zustand'

interface PersistenceOptions<T> {
  /** The filename to save the state to (e.g., 'tabs.json') */
  filename: string
  /** Function to select which part of the state to save (also controls which keys are loaded) */
  selector: (state: T) => Partial<T>
  /** Debounce time in milliseconds (default: 500) */
  debounceMs?: number
}

/**
 * Generic hook to handle file-based persistence for Zustand stores.
 *
 * @param store The Zustand store instance
 * @param options Configuration options
 */
export function usePersistence<T>(store: UseBoundStore<StoreApi<T>>, options: PersistenceOptions<T>) {
  const { filename, selector, debounceMs = 500 } = options
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const isHydratedRef = useRef<boolean>(false)
  // Store selector in ref to avoid dependency issues (selector is a config, not reactive)
  const selectorRef = useRef(selector)
  selectorRef.current = selector

  // Load state on mount (runs once per filename)
  useEffect(() => {
    console.log(`[Persistence] Loading ${filename}...`)

    invoke<string>('read_app_state', { filename })
      .then((content) => {
        if (!content) {
          console.log(`[Persistence] No saved state found for ${filename}`)
          isHydratedRef.current = true
          // Try to set _hasHydrated if the store has it
          // We cast to any because we don't know if T has _hasHydrated
          store.setState({ _hasHydrated: true } as any)
          return
        }

        try {
          const parsed = JSON.parse(content)
          // Only load keys that are defined in the selector to avoid loading stale/removed keys
          const currentState = store.getState()
          const allowedKeys = Object.keys(selectorRef.current(currentState))
          const filteredState: Partial<T> = {}
          for (const key of allowedKeys) {
            if (key in parsed) {
              ;(filteredState as any)[key] = parsed[key]
            }
          }
          console.log(`[Persistence] Loaded ${filename}:`, Object.keys(filteredState))

          store.setState({
            ...filteredState,
            _hasHydrated: true,
          })
          isHydratedRef.current = true
        } catch (e) {
          console.error(`[Persistence] Failed to parse ${filename}:`, e)
          store.setState({ _hasHydrated: true } as any)
          isHydratedRef.current = true
        }
      })
      .catch((error) => {
        console.error(`[Persistence] Failed to load ${filename}:`, error)
        store.setState({ _hasHydrated: true } as any)
        isHydratedRef.current = true
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filename, store])

  // Subscribe to changes and save
  useEffect(() => {
    const unsubscribe = store.subscribe((state) => {
      // Skip saving until hydrated
      if (!isHydratedRef.current) {
        return
      }

      // Clear existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }

      // Debounce the save
      saveTimeoutRef.current = setTimeout(() => {
        const dataToSave = selectorRef.current(state)
        const content = JSON.stringify(dataToSave, null, 2)

        invoke('write_app_state', {
          filename,
          content,
        }).catch((error) => {
          console.error(`[Persistence] Failed to save ${filename}:`, error)
        })
      }, debounceMs)
    })

    return () => {
      unsubscribe()
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, filename, debounceMs])
}
