import React from 'react'
import { PopoverContent as OriginalPopoverContent } from '@/components/ui/popover'
import { DropdownMenuContent as OriginalDropdownMenuContent } from '@/components/ui/dropdown-menu'
import { ContextMenuContent as OriginalContextMenuContent } from '@/components/ui/context-menu'
import { useDialogContainer } from '@/contexts/DialogContainerContext'

interface PopoverContentProps extends React.ComponentProps<typeof OriginalPopoverContent> {}

export const PopoverContent = React.forwardRef<React.ElementRef<typeof OriginalPopoverContent>, PopoverContentProps>(
  ({ ...props }, ref) => {
    const { containerRef } = useDialogContainer()
    return <OriginalPopoverContent ref={ref} container={containerRef.current} {...props} />
  },
)
PopoverContent.displayName = OriginalPopoverContent.displayName

interface DropdownMenuContentProps extends React.ComponentProps<typeof OriginalDropdownMenuContent> {}

export const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof OriginalDropdownMenuContent>,
  DropdownMenuContentProps
>(({ ...props }, ref) => {
  const { containerRef } = useDialogContainer()
  return <OriginalDropdownMenuContent ref={ref} container={containerRef.current} {...props} />
})

interface ContextMenuContentProps extends React.ComponentProps<typeof OriginalContextMenuContent> {}

export const ContextMenuContent = React.forwardRef<
  React.ElementRef<typeof OriginalContextMenuContent>,
  ContextMenuContentProps
>(({ ...props }, ref) => {
  const { containerRef } = useDialogContainer()
  return <OriginalContextMenuContent ref={ref} container={containerRef.current} {...props} />
})
ContextMenuContent.displayName = OriginalContextMenuContent.displayName
