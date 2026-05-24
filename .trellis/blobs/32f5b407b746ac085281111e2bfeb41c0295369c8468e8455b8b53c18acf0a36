'use client'

import type { ReactNode } from 'react'
import { CursorProvider } from './CursorContext'
import { CustomCursor } from './CustomCursor'
import { cn } from '@/lib/utils'

interface CursorZoneProps {
  children: ReactNode
  className?: string
}

export function CursorZone({ children, className }: CursorZoneProps) {
  return (
    <CursorProvider>
      <div className={cn('custom-cursor-zone relative', className)}>
        {children}
        <CustomCursor />
      </div>
    </CursorProvider>
  )
}
