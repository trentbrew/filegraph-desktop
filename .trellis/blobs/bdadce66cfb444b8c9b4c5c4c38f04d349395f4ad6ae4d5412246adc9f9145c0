/**
 * Global Timer Hook
 * Manages timer ticking at the app level so it runs even when popup is closed
 */

import { useEffect, useRef } from 'react'
import { useWidgetStore } from '@/stores/useWidgetStore'

export function useGlobalTimer() {
  const { timerState, setTimerState } = useWidgetStore()
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    // Start ticking if timer is running
    if (timerState?.isRunning && timerState.remaining > 0) {
      intervalRef.current = setInterval(() => {
        const currentState = useWidgetStore.getState().timerState
        if (!currentState || !currentState.isRunning) {
          if (intervalRef.current) clearInterval(intervalRef.current)
          return
        }

        if (currentState.remaining <= 1) {
          // Timer completed
          setTimerState({
            ...currentState,
            remaining: 0,
            isRunning: false,
          })
          // TODO: Play notification sound
        } else {
          setTimerState({
            ...currentState,
            remaining: currentState.remaining - 1,
          })
        }
      }, 1000)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [timerState?.isRunning, setTimerState])

  return timerState
}
