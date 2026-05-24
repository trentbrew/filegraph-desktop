import * as React from 'react'
import { FileItem } from '@/components/app/fileStructure'
import { cn } from '@/lib/utils'
import { formatFileSize } from '../utils'
import { Button } from '@/components/ui/button'
import { Code, Eye } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { getFileIcon } from '@/lib/fileIcons'

interface PreviewHeaderProps {
  activeItem: FileItem
  onRename?: (newName: string) => Promise<void>
  previewMode?: 'code' | 'preview'
  onTogglePreviewMode?: () => void
  supportsPreview?: boolean
}

export function PreviewHeader({
  activeItem,
  onRename,
  previewMode = 'code',
  onTogglePreviewMode,
  supportsPreview = false,
}: PreviewHeaderProps) {
  const [isRenaming, setIsRenaming] = React.useState(false)
  const [editedName, setEditedName] = React.useState(activeItem.name)
  const inputRef = React.useRef<HTMLInputElement>(null)

  // Reset state when active item changes
  React.useEffect(() => {
    setEditedName(activeItem.name)
    setIsRenaming(false)
  }, [activeItem])

  React.useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isRenaming])

  const handleRenameSubmit = async () => {
    if (!onRename) {
      setIsRenaming(false)
      return
    }

    const trimmedName = editedName.trim()
    if (trimmedName && trimmedName !== activeItem.name) {
      await onRename(trimmedName)
    } else {
      setEditedName(activeItem.name)
    }
    setIsRenaming(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRenameSubmit()
    } else if (e.key === 'Escape') {
      setEditedName(activeItem.name)
      setIsRenaming(false)
    }
  }

  return (
    <div className="shrink-0 border border-border px-4 mb-3 h-11 flex items-center justify-between w-full rounded-xl bg-card/25">
      <div className="flex items-center justify-between gap-2 w-full">
        <div className="flex-1 flex items-center justify-between min-w-0 ">
          {isRenaming ? (
            <input
              ref={inputRef}
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              onBlur={handleRenameSubmit}
              onKeyDown={handleKeyDown}
              className="font-semibold text-xs bg-transparent outline-none border-b border-primary focus:border-transparent min-w-0 w-full"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <div className="flex items-center gap-2 min-w-0">
              {getFileIcon(activeItem.file_type, activeItem.extension || null, 'sm')}
              <h3
                className={cn(
                  'font-semibold text-xs truncate mb-0',
                  onRename && 'cursor-text hover:bg-muted/50 px-1 -ml-1 rounded transition-colors',
                )}
                onClick={() => onRename && setIsRenaming(true)}
                title={onRename ? 'Click to rename' : undefined}>
                {activeItem.name}
              </h3>
            </div>
          )}
          <div className="flex items-center gap-2 text-xs text-muted-foreground min-w-6 ml-3">
            {activeItem.size && <span>{formatFileSize(activeItem.size)}</span>}
          </div>
        </div>
        {supportsPreview && onTogglePreviewMode && (
          <TooltipProvider>
            <div className="flex items-center gap-1 border border-border rounded-lg p-0.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={previewMode === 'code' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => previewMode !== 'code' && onTogglePreviewMode()}
                    className="h-7 px-2">
                    <Code className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Code View</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={previewMode === 'preview' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => previewMode !== 'preview' && onTogglePreviewMode()}
                    className="h-7 px-2">
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Preview</TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        )}
      </div>
    </div>
  )
}
