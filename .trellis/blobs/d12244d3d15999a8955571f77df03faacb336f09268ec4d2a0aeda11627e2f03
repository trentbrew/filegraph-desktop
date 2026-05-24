import React, { createContext, useContext, useRef, ReactNode } from 'react'

interface DialogContainerContextType {
  containerRef: React.RefObject<HTMLElement | null>
  registerContainer: (element: HTMLElement) => void
}

const DialogContainerContext = createContext<DialogContainerContextType | undefined>(undefined)

export function DialogContainerProvider({ children }: { children: ReactNode }) {
  const containerRef = useRef<HTMLElement | null>(null)

  const registerContainer = (element: HTMLElement) => {
    containerRef.current = element
  }

  return (
    <DialogContainerContext.Provider value={{ containerRef, registerContainer }}>
      {children}
    </DialogContainerContext.Provider>
  )
}

export function useDialogContainer() {
  const context = useContext(DialogContainerContext)
  if (!context) {
    return { containerRef: { current: null }, registerContainer: () => {} }
  }
  return context
}
