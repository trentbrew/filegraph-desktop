'use client'

import { useState } from 'react'
import { CheckIcon, ChevronDownIcon, ChevronsDownIcon, ChevronsUpDownIcon, Plus, Settings2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { CustomPopover, CustomPopoverContent, CustomPopoverTrigger } from '@/components/ui/custom-popover'
import { cn } from '@/lib/utils'
import type { SpaceMetadata } from './types'
import { getSpaceIcon } from './components/IconPicker'

interface SpaceTabsProps {
  spaces: SpaceMetadata[]
  activeSpaceId: string
  onSpaceChange: (spaceId: string) => void
  onCreateSpace?: (name: string) => void
  onOpenSettings?: () => void
  className?: string
}

const formatNodeEdgeCount = (nodeCount: number, edgeCount: number): string => {
  const nodes = nodeCount === 1 ? 'node' : 'nodes'
  const edges = edgeCount === 1 ? 'edge' : 'edges'
  return `${nodeCount.toLocaleString()} ${nodes} · ${edgeCount.toLocaleString()} ${edges}`
}

const SpaceTabs = ({
  spaces,
  activeSpaceId,
  onSpaceChange,
  onCreateSpace,
  onOpenSettings,
  className,
}: SpaceTabsProps) => {
  const [open, setOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [newSpaceName, setNewSpaceName] = useState('')

  const selectedSpace = spaces.find((space) => space.id === activeSpaceId)

  const handleCreateConfirm = () => {
    const name = newSpaceName.trim()
    if (!name || !onCreateSpace) return
    setIsCreating(false)
    setNewSpaceName('')
    setOpen(false)
    onCreateSpace(name)
  }

  return (
    <div className={cn('w-fit min-w-0', className)}>
      <div className="flex items-center gap-2">
        <CustomPopover open={open} onOpenChange={setOpen}>
          <CustomPopoverTrigger asChild>
            <Button
              variant="ghost"
              role="combobox"
              aria-expanded={open}
              className="h-7 px-2 gap-2 text-xs justify-between flex-1 font-medium"
              aria-label="Space selector">
              {selectedSpace ? (
                <span className="flex items-center gap-2">
                  <span className="text-sm shrink-0 leading-none">{getSpaceIcon(selectedSpace.icon)}</span>
                  <span className="truncate">{selectedSpace.name}</span>
                </span>
              ) : (
                <span className="text-muted-foreground">Select space...</span>
              )}
              <ChevronDownIcon size={12} className="text-muted-foreground/60 shrink-0" aria-hidden="true" />
            </Button>
          </CustomPopoverTrigger>
          <CustomPopoverContent className="w-[320px] p-0" align="start" sideOffset={4}>
            <Command>
              <CommandInput placeholder="Search spaces..." />
              <CommandList className="max-h-[300px]">
                <CommandEmpty>No spaces found.</CommandEmpty>
                <CommandGroup>
                  {spaces.map((space) => (
                    <CommandItem
                      key={space.id}
                      value={space.name}
                      className="cursor-pointer"
                      onSelect={() => {
                        onSpaceChange(space.id)
                        setOpen(false)
                      }}>
                      <span className="text-lg shrink-0">{getSpaceIcon(space.icon)}</span>
                      <div className="flex flex-col min-w-0 flex-1 ml-3">
                        <span className="font-medium truncate">{space.name}</span>
                        <span className="text-muted-foreground text-sm">
                          {formatNodeEdgeCount(space.nodeCount, space.edgeCount)}
                        </span>
                      </div>
                      {activeSpaceId === space.id && <CheckIcon size={16} className="ml-auto text-primary" />}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>

              {onCreateSpace && (
                <>
                  <CommandSeparator />
                  <div className="p-1">
                    {isCreating ? (
                      <div className="flex items-center gap-2 px-2 py-1">
                        <input
                          autoFocus
                          type="text"
                          value={newSpaceName}
                          onChange={(e) => setNewSpaceName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              handleCreateConfirm()
                            } else if (e.key === 'Escape') {
                              setIsCreating(false)
                              setNewSpaceName('')
                            }
                            e.stopPropagation()
                          }}
                          placeholder="Space name..."
                          className="flex-1 h-8 px-2 text-sm bg-transparent border border-border rounded-md outline-none focus:ring-1 focus:ring-ring"
                        />
                        <Button
                          size="sm"
                          variant="default"
                          className="h-8 px-3 text-xs"
                          disabled={!newSpaceName.trim()}
                          onClick={handleCreateConfirm}>
                          Create
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setIsCreating(true)
                        }}
                        className="w-full justify-start gap-3 h-10 font-medium text-primary hover:bg-primary/5">
                        <div className="w-[18px] h-[18px] rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Plus size={12} className="text-primary" />
                        </div>
                        Create New Space
                      </Button>
                    )}
                  </div>
                </>
              )}
            </Command>
          </CustomPopoverContent>
        </CustomPopover>

        {onOpenSettings && (
          <Button
            variant="outline"
            size="icon"
            onClick={onOpenSettings}
            className="h-9 w-9 shrink-0"
            aria-label="Space settings">
            <Settings2 size={16} />
          </Button>
        )}
      </div>
    </div>
  )
}

export { SpaceTabs }
