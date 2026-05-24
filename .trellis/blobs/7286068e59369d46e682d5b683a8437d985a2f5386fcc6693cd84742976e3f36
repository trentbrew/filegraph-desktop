/**
 * CanvasToolbar Component
 *
 * Floating toolbar for canvas operations:
 * - Auto-layout (dagre)
 * - Alignment tools
 * - Distribution tools
 * - Copy/paste
 */

import * as React from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import {
  LayoutGrid,
  AlignVerticalJustifyStart,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignHorizontalJustifyStart,
  AlignHorizontalJustifyCenter,
  AlignHorizontalJustifyEnd,
  Rows3,
  Columns3,
  Copy,
  Clipboard,
  Scissors,
  Trash2,
  ChevronDown,
  ArrowDown,
  Blocks,
  ArrowRight,
  ArrowUp,
  ArrowLeft,
  Grid3X3,
  Hand,
  Brush,
  Shapes,
  MousePointer2,
  Group,
  Ungroup,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LayoutDirection, AlignmentType, DistributionType } from './canvasUtils'

interface CanvasToolbarProps {
  selectedCount: number
  clipboardCount: number
  isCustomLayout: boolean
  activeLayoutLabel: string
  activeTool: 'select' | 'freehand' | 'shapes'
  onToolChange: (tool: 'select' | 'freehand' | 'shapes') => void
  onAutoLayout: (direction: LayoutDirection) => void
  onCustomLayout: () => void
  onGridLayout: () => void
  onAlign: (alignment: AlignmentType) => void
  onDistribute: (distribution: DistributionType) => void
  onCopy: () => void
  onPaste: () => void
  onCut: () => void
  onDelete: () => void
  onGroup: () => void
  onUngroup: () => void
  className?: string
}

export function CanvasToolbar({
  selectedCount,
  clipboardCount,
  isCustomLayout,
  activeLayoutLabel,
  activeTool,
  onToolChange,
  onAutoLayout,
  onCustomLayout,
  onGridLayout,
  onAlign,
  onDistribute,
  onCopy,
  onPaste,
  onCut,
  onDelete,
  onGroup,
  onUngroup,
  className,
}: CanvasToolbarProps) {
  const hasSelection = selectedCount > 0
  const hasMultiSelection = selectedCount >= 2
  const hasClipboard = clipboardCount > 0
  const canEditLayout = isCustomLayout

  const getActiveLayoutIcon = () => {
    switch (activeLayoutLabel) {
      case 'Custom':
        return <Blocks className="h-3.5 w-3.5" />
      case 'Left to Right':
        return <ArrowRight className="h-3.5 w-3.5" />
      case 'Top to Bottom':
        return <ArrowDown className="h-3.5 w-3.5" />
      case 'Grid':
        return <Grid3X3 className="h-3.5 w-3.5" />
      default:
        return <Grid3X3 className="h-3.5 w-3.5" />
    }
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className={cn('flex items-center gap-1 px-1 py-1 rounded-lg', className)}>
        {/* Tools */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn('h-7 w-7', activeTool === 'select' ? 'bg-accent text-accent-foreground' : undefined)}
              onClick={() => onToolChange('select')}>
              <MousePointer2 className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Select</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn('h-7 w-7', activeTool === 'freehand' ? 'bg-accent text-accent-foreground' : undefined)}
              onClick={() => onToolChange('freehand')}>
              <Brush className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Freehand</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn('h-7 w-7', activeTool === 'shapes' ? 'bg-accent text-accent-foreground' : undefined)}
              onClick={() => onToolChange('shapes')}>
              <Shapes className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Shapes</p>
          </TooltipContent>
        </Tooltip>

        <div className="w-px h-4 bg-border mx-1" />

        {/* Auto Layout */}
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 gap-1 px-2">
                  {getActiveLayoutIcon()}
                  <ChevronDown className="h-3 w-3 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Auto-arrange nodes</p>
            </TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="start" className="w-44">
            <DropdownMenuItem onClick={onCustomLayout}>
              <Hand className="mr-2 h-4 w-4" />
              Custom Layout
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAutoLayout('LR')}>
              <ArrowRight className="mr-2 h-4 w-4" />
              Left to Right
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAutoLayout('TB')}>
              <ArrowDown className="mr-2 h-4 w-4" />
              Top to Bottom
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onGridLayout}>
              <Grid3X3 className="mr-2 h-4 w-4" />
              Grid
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Group - only show when multi-selection */}
        {hasMultiSelection && (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onGroup}>
                  <Group className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Group ⌘G</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onUngroup}>
                  <Ungroup className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Ungroup ⌘⇧G</p>
              </TooltipContent>
            </Tooltip>
          </>
        )}

        {/* Separator - only show if Alignment is visible */}
        {hasMultiSelection && canEditLayout && <div className="w-px h-4 bg-border mx-1" />}

        {/* Alignment - only show when multi-selection and custom layout */}
        {hasMultiSelection && canEditLayout && (
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 gap-1 px-2">
                    <LayoutGrid className="h-3.5 w-3.5" />
                    <span className="text-xs">Align</span>
                    <ChevronDown className="h-3 w-3 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Align selected nodes (2+)</p>
              </TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <AlignHorizontalJustifyStart className="mr-2 h-4 w-4" />
                  Horizontal
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onClick={() => onAlign('left')}>
                    <AlignHorizontalJustifyStart className="mr-2 h-4 w-4" />
                    Align Left
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onAlign('center')}>
                    <AlignHorizontalJustifyCenter className="mr-2 h-4 w-4" />
                    Align Center
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onAlign('right')}>
                    <AlignHorizontalJustifyEnd className="mr-2 h-4 w-4" />
                    Align Right
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <AlignVerticalJustifyStart className="mr-2 h-4 w-4" />
                  Vertical
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onClick={() => onAlign('top')}>
                    <AlignVerticalJustifyStart className="mr-2 h-4 w-4" />
                    Align Top
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onAlign('middle')}>
                    <AlignVerticalJustifyCenter className="mr-2 h-4 w-4" />
                    Align Middle
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onAlign('bottom')}>
                    <AlignVerticalJustifyEnd className="mr-2 h-4 w-4" />
                    Align Bottom
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onDistribute('horizontal')} disabled={selectedCount < 3}>
                <Columns3 className="mr-2 h-4 w-4" />
                Distribute Horizontally
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDistribute('vertical')} disabled={selectedCount < 3}>
                <Rows3 className="mr-2 h-4 w-4" />
                Distribute Vertically
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Separator - show if Alignment or Copy/Paste/Delete section is visible */}
        {(hasMultiSelection && canEditLayout) || hasSelection || hasClipboard ? (
          <div className="w-px h-4 bg-border mx-1" />
        ) : null}

        {/* Copy/Paste - only show when applicable */}
        {hasSelection && (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onCopy}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Copy ⌘C</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onCut}>
                  <Scissors className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Cut ⌘X</p>
              </TooltipContent>
            </Tooltip>
          </>
        )}

        {hasClipboard && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onPaste}>
                <Clipboard className="h-3.5 w-3.5" />
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-primary text-primary-foreground text-[9px] rounded-full flex items-center justify-center">
                  {clipboardCount}
                </span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Paste ⌘V</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Separator - show if Copy/Paste or Delete is visible */}
        {hasSelection || hasClipboard ? <div className="w-px h-4 bg-border mx-1" /> : null}

        {/* Delete - only show when selection exists */}
        {hasSelection && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive"
                onClick={onDelete}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Delete ⌫</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Selection count */}
        {hasSelection && (
          <>
            <div className="w-px h-4 bg-border mx-1" />
            <span className="text-[10px] text-muted-foreground px-1">{selectedCount} selected</span>
          </>
        )}
      </div>
    </TooltipProvider>
  )
}

export default CanvasToolbar
