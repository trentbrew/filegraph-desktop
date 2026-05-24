/**
 * Placeholder Node Component
 *
 * A temporary node that appears when the user draws a selection box on an empty area.
 * Shows a grid of node types to choose from. Clicking an option transforms
 * the placeholder into that node type.
 */

import * as React from 'react'
import { type NodeProps } from 'reactflow'
import { motion } from 'framer-motion'
import {
  Type,
  StickyNote,
  Image,
  Globe,
  Table,
  MapPin,
  Code,
  Shapes,
  Calendar,
  Video,
  Terminal,
  Music,
  Bot,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface PlaceholderNodeData {
  /** Callback when a node type is selected */
  onSelectType?: (nodeType: string) => void
}

interface NodeTypeOption {
  type: string
  label: string
  icon: React.ElementType
  color: string
  description: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Node Type Options
// ─────────────────────────────────────────────────────────────────────────────

const NODE_TYPE_OPTIONS: NodeTypeOption[] = [
  {
    type: 'stickyNote',
    label: 'Sticky Note',
    icon: StickyNote,
    color: '#fbbf24',
    description: 'Quick note',
  },
  {
    type: 'richText',
    label: 'Note',
    icon: Type,
    color: '#60a5fa',
    description: 'Rich text note',
  },
  {
    type: 'image',
    label: 'Image',
    icon: Image,
    color: '#34d399',
    description: 'Add an image',
  },
  {
    type: 'embed',
    label: 'Web Embed',
    icon: Globe,
    color: '#a78bfa',
    description: 'Embed a website',
  },
  {
    type: 'youtube',
    label: 'YouTube',
    icon: Video,
    color: '#f87171',
    description: 'Embed video',
  },
  {
    type: 'table',
    label: 'Table',
    icon: Table,
    color: '#2dd4bf',
    description: 'Data table',
  },
  {
    type: 'codeBlock',
    label: 'Code',
    icon: Code,
    color: '#fb923c',
    description: 'Code snippet',
  },
  {
    type: 'shape',
    label: 'Shape',
    icon: Shapes,
    color: '#ec4899',
    description: 'Draw a shape',
  },
  {
    type: 'location',
    label: 'Location',
    icon: MapPin,
    color: '#14b8a6',
    description: 'Map location',
  },
  {
    type: 'calendar',
    label: 'Calendar',
    icon: Calendar,
    color: '#3b82f6',
    description: 'Calendar view',
  },
  {
    type: 'terminal',
    label: 'Terminal',
    icon: Terminal,
    color: '#64748b',
    description: 'Terminal shell',
  },
  {
    type: 'audio',
    label: 'Audio',
    icon: Music,
    color: '#a855f7',
    description: 'Play audio',
  },
  {
    type: 'agent',
    label: 'Agent',
    icon: Bot,
    color: '#8b5cf6',
    description: 'AI chat',
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function PlaceholderNode({ id, data, selected }: NodeProps<PlaceholderNodeData>) {
  const handleSelectType = React.useCallback(
    (nodeType: string) => {
      // Dispatch custom event for HomeCanvas to handle the transformation
      window.dispatchEvent(
        new CustomEvent('placeholder-node-select', {
          detail: { nodeId: id, nodeType },
        }),
      )
    },
    [id],
  )

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.15 }}
      className={cn(
        'bg-card/95 backdrop-blur-sm border-2 border-dashed rounded-lg shadow-lg',
        'flex flex-col overflow-hidden',
        selected ? 'border-primary' : 'border-muted-foreground/30',
      )}
      style={{ width: '100%', height: '100%', minWidth: 200, minHeight: 150 }}>
      {/* Header */}
      <div className="px-3 py-2 border-b border-border/50 bg-muted/30">
        <p className="text-xs font-medium text-muted-foreground">Choose node type</p>
      </div>

      {/* Grid of options */}
      <div className="flex-1 p-2 overflow-auto nodrag nowheel">
        <div className="grid grid-cols-3 gap-1.5">
          {NODE_TYPE_OPTIONS.map((option) => {
            const Icon = option.icon
            return (
              <button
                key={option.type}
                type="button"
                onClick={() => handleSelectType(option.type)}
                className={cn(
                  'flex flex-col items-center gap-1 p-2 rounded-md',
                  'hover:bg-accent/80 active:bg-accent transition-colors',
                  'group cursor-pointer',
                )}>
                <div
                  className="w-8 h-8 rounded-md flex items-center justify-center transition-transform group-hover:scale-110"
                  style={{ backgroundColor: `${option.color}20` }}>
                  <Icon className="h-4 w-4" style={{ color: option.color }} />
                </div>
                <span className="text-[10px] font-medium text-foreground/80 text-center leading-tight">
                  {option.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Footer hint */}
      <div className="px-3 py-1.5 border-t border-border/50 bg-muted/20">
        <p className="text-[9px] text-muted-foreground text-center">Click to create • Esc to cancel</p>
      </div>
    </motion.div>
  )
}
