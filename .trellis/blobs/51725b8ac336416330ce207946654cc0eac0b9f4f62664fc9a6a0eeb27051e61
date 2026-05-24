'use client'

import { useState } from 'react'
import { CheckIcon, ChevronsUpDownIcon, Plus } from 'lucide-react'

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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import type { SpaceMetadata } from './types'
import { getSpaceIcon } from './components/IconPicker'

interface SpaceTabsProps {
  spaces: SpaceMetadata[]
  activeSpaceId: string
  onSpaceChange: (spaceId: string) => void
  onCreateSpace?: () => void
  className?: string
}

const formatNodeEdgeCount = (nodeCount: number, edgeCount: number): string => {
  const nodes = nodeCount === 1 ? 'node' : 'nodes'
  const edges = edgeCount === 1 ? 'edge' : 'edges'
  return `${nodeCount.toLocaleString()} ${nodes} · ${edgeCount.toLocaleString()} ${edges}`
}

const SpaceTabs = ({ spaces, activeSpaceId, onSpaceChange, onCreateSpace, className }: SpaceTabsProps) => {
  const [open, setOpen] = useState(false)

  const selectedSpace = spaces.find((space) => space.id === activeSpaceId)

  return (
    <div className={cn('w-full max-w-xs', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            aria-label="Space selector">
            {selectedSpace ? (
              <span className="flex items-center gap-2">
                <span className="text-lg shrink-0">{getSpaceIcon(selectedSpace.icon)}</span>
                <span className="font-medium truncate">{selectedSpace.name}</span>
              </span>
            ) : (
              <span className="text-muted-foreground">Select space...</span>
            )}
            <ChevronsUpDownIcon size={16} className="text-muted-foreground/80 shrink-0" aria-hidden="true" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[320px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search spaces..." />
            <CommandList>
              <CommandEmpty>No spaces found.</CommandEmpty>
              <CommandGroup>
                {spaces.map((space) => (
                  <CommandItem
                    key={space.id}
                    value={space.name}
                    onSelect={() => {
                      onSpaceChange(space.id)
                      setOpen(false)
                    }}>
                    <span className="flex items-center gap-3 flex-1">
                      <span className="text-lg shrink-0">{getSpaceIcon(space.icon)}</span>
                      <span className="flex flex-col min-w-0 flex-1">
                        <span className="font-medium truncate">{space.name}</span>
                        <span className="text-muted-foreground text-sm">
                          {formatNodeEdgeCount(space.nodeCount, space.edgeCount)}
                        </span>
                      </span>
                    </span>
                    {activeSpaceId === space.id && <CheckIcon size={16} className="ml-auto text-primary" />}
                  </CommandItem>
                ))}
              </CommandGroup>
              {onCreateSpace && (
                <>
                  <CommandSeparator />
                  <CommandGroup>
                    <CommandItem
                      onSelect={() => {
                        onCreateSpace()
                        setOpen(false)
                      }}>
                      <span className="flex items-center gap-3">
                        <div className="w-[18px] h-[18px] rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Plus size={12} className="text-primary" />
                        </div>
                        <span className="font-medium text-primary">Create New Space</span>
                      </span>
                    </CommandItem>
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}

export { SpaceTabs }
