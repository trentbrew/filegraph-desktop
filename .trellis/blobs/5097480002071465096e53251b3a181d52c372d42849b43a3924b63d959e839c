/**
 * Empty File Node Component
 *
 * A placeholder component for file-backed nodes that don't have a file loaded yet.
 * Shows an upload-card style UI that prompts the user to select a file.
 */

import * as React from 'react'
import { Upload, FileText } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface EmptyFileNodeProps {
  onOpenSidebar?: () => void
}

export function EmptyFileNode({ onOpenSidebar }: EmptyFileNodeProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col items-center justify-center h-full p-6 cursor-pointer"
      onClick={onOpenSidebar}>
      <div className="flex flex-col items-center gap-4 p-8 border-2 border-dashed border-border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
        <Upload className="h-12 w-12 text-muted-foreground/60" />
        <div className="text-center">
          <p className="text-sm font-medium text-foreground/90 mb-2">No file loaded</p>
          <p className="text-xs text-muted-foreground">Click to select a file</p>
        </div>
      </div>
    </motion.div>
  )
}
