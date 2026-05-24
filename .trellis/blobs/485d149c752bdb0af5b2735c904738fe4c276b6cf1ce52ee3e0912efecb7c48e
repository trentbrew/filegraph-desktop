/**
 * Group Node Component
 *
 * A visual wrapper that contains grouped nodes on the canvas.
 * Groups act as single draggable entities with child nodes moving together.
 */

import * as React from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'
import { cn } from '@/lib/utils'

export interface GroupNodeData {
  label: string
  color: string
}

const GROUP_COLOR_STYLES: Record<
  string,
  {
    borderClass: string
    bgClass: string
    dotClass: string
  }
> = {
  violet: { borderClass: 'border-violet-400/40', bgClass: 'bg-violet-500/5', dotClass: 'bg-violet-400' },
  blue: { borderClass: 'border-blue-400/40', bgClass: 'bg-blue-500/5', dotClass: 'bg-blue-400' },
  green: { borderClass: 'border-green-400/40', bgClass: 'bg-green-500/5', dotClass: 'bg-green-400' },
  orange: { borderClass: 'border-orange-400/40', bgClass: 'bg-orange-500/5', dotClass: 'bg-orange-400' },
  red: { borderClass: 'border-red-400/40', bgClass: 'bg-red-500/5', dotClass: 'bg-red-400' },
  pink: { borderClass: 'border-pink-400/40', bgClass: 'bg-pink-500/5', dotClass: 'bg-pink-400' },
  cyan: { borderClass: 'border-cyan-400/40', bgClass: 'bg-cyan-500/5', dotClass: 'bg-cyan-400' },
  yellow: { borderClass: 'border-yellow-400/40', bgClass: 'bg-yellow-500/5', dotClass: 'bg-yellow-400' },
}

export function GroupNode({ data, selected }: NodeProps<GroupNodeData>) {
  const styles = GROUP_COLOR_STYLES[data?.color ?? 'violet'] ?? GROUP_COLOR_STYLES.violet
  const label = data?.label ?? 'Group'

  return (
    <div
      className={cn(
        'group relative rounded-lg border-2 transition-all duration-200',
        styles.bgClass,
        styles.borderClass,
        selected ? 'ring-2 ring-primary/25' : '',
      )}
      style={{ width: '100%', height: '100%' }}>
      {/* Group label */}
      <div
        className={cn(
          'absolute left-2 top-2 flex max-w-[calc(100%-16px)] items-center gap-2 rounded-md border px-2 py-1 text-xs font-semibold shadow-sm',
          'bg-background/95 text-foreground backdrop-blur-sm',
          'border-border/60',
        )}>
        <span className={cn('h-2 w-2 shrink-0 rounded-full', styles.dotClass)} />
        <span className="truncate">{label}</span>
      </div>

      {/* Connection handles - hidden by default, shown on hover */}
      <Handle type="target" position={Position.Top} className="opacity-0 group-hover:opacity-100" />
      <Handle type="source" position={Position.Bottom} className="opacity-0 group-hover:opacity-100" />
      <Handle type="target" position={Position.Left} className="opacity-0 group-hover:opacity-100" />
      <Handle type="source" position={Position.Right} className="opacity-0 group-hover:opacity-100" />
    </div>
  )
}
