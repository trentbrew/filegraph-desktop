import { Folder, FolderRoot, X, Edit3, Image as ImageIcon } from 'lucide-react'
import * as LucideIcons from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/components/ui/context-menu'
import { IconPicker } from './IconPicker'
import React from 'react'

interface TabProps {
  id: string
  title: string
  path?: string
  icon?: string
  isActive: boolean
  closable?: boolean
  onSelect: () => void
  onClose: () => void
  onRename?: (newTitle: string) => void
  onIconChange?: (newIcon: string) => void
  className?: string
}

// Check if path is the default vault
const isDefaultVault = (path?: string): boolean => {
  if (!path) return false
  // Match ~/.filegraph or /Users/*/. filegraph
  return path.endsWith('/.filegraph') || path.endsWith('.filegraph')
}

export function Tab({
  id,
  title,
  path,
  icon,
  isActive,
  closable = true,
  onSelect,
  onClose,
  onRename,
  onIconChange,
  className = '',
}: TabProps) {
  const [isRenaming, setIsRenaming] = React.useState(false)
  const [editedTitle, setEditedTitle] = React.useState(title)
  const [showIconPicker, setShowIconPicker] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isRenaming])
  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation()
    onClose()
  }

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (!onRename) return
    e.stopPropagation()
    setIsRenaming(true)
  }

  const handleIconClick = (e: React.MouseEvent) => {
    if (!onIconChange) return
    e.stopPropagation()
    setShowIconPicker(true)
  }

  const handleRename = () => {
    if (onRename && editedTitle.trim() && editedTitle !== title) {
      onRename(editedTitle.trim())
    } else {
      setEditedTitle(title)
    }
    setIsRenaming(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Stop propagation to prevent dnd-kit or global listeners from intercepting keys
    e.stopPropagation()

    if (e.key === 'Enter') {
      handleRename()
    } else if (e.key === 'Escape') {
      setEditedTitle(title)
      setIsRenaming(false)
    }
  }

  const renderIcon = () => {
    const iconElement = (() => {
      // Show FolderRoot icon for default vault if no custom icon set
      if (!icon && isDefaultVault(path)) {
        return <FolderRoot className={`h-4 w-4 ${iconTone}`} aria-hidden="true" />
      }

      if (!icon) {
        return <Folder className={`h-4 w-4 ${iconTone}`} aria-hidden="true" />
      }

      if (icon.length <= 2 && /[^\x00-\x7F]/.test(icon)) {
        return <span className={`text-lg leading-none ${iconTone}`}>{icon}</span>
      }

      const IconComponent = LucideIcons[icon as keyof typeof LucideIcons] as React.ComponentType<{ className?: string }>
      if (IconComponent) {
        return <IconComponent className={`h-4 w-4 ${iconTone}`} />
      }

      return <Folder className={`h-4 w-4 ${iconTone}`} aria-hidden="true" />
    })()

    if (!onIconChange) {
      return iconElement
    }

    return (
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          if (!isActive) {
            onSelect()
            return
          }
          handleIconClick(event)
        }}
        className={`flex h-6 w-6 items-center justify-center rounded-xl transition-colors hover:bg-foreground/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.9] ${
          isActive ? 'text-foreground' : 'text-muted-foreground hover:!bg-transparent'
        }`}
        aria-label={isActive ? 'Change tab icon' : 'Activate tab'}>
        {iconElement}
      </button>
    )
  }

  const iconTone = isActive ? 'text-foreground' : 'text-muted-foreground'
  const textTone = isActive ? 'text-foreground' : 'text-muted-foreground'

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            onClick={onSelect}
            onDoubleClick={handleDoubleClick}
            className={`
              group relative inline-flex items-center gap-2 px-3 h-8
              rounded-xl cursor-pointer select-none
              transition-colors
              ${
                isActive
                  ? 'bg-card text-foreground border-t border-primary'
                  : 'bg-card/0 text-muted-foreground/50 border border-border/50 hover:border-border group-hover:text-foreground'
              }
              ${className}
            `}>
            {renderIcon()}
            {isRenaming ? (
              <input
                ref={inputRef}
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onBlur={handleRename}
                onKeyDown={handleKeyDown}
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                className={`
                  text-xs font-medium bg-transparent outline-none
                  max-w-[420px] ${textTone}
                `}
              />
            ) : title ? (
              <span className={`text-xs font-medium truncate max-w-[420px] ${textTone} ${closable ? 'pr-12' : ''}`}>
                {title}
              </span>
            ) : null}
            {closable && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className={`
                  absolute right-2
                  h-5 w-5 p-0 rounded-md
                  opacity-0 group-hover:opacity-100
                  text-muted-foreground hover:text-foreground hover:bg-muted/40
                  transition-opacity
                `}>
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          {onRename && (
            <ContextMenuItem onClick={() => setIsRenaming(true)}>
              <Edit3 className="h-4 w-4 mr-2" />
              Rename
            </ContextMenuItem>
          )}
          {onIconChange && (
            <ContextMenuItem onClick={() => setShowIconPicker(true)}>
              <ImageIcon className="h-4 w-4 mr-2" />
              Change Icon
            </ContextMenuItem>
          )}
        </ContextMenuContent>
      </ContextMenu>

      {onIconChange && (
        <IconPicker open={showIconPicker} onOpenChange={setShowIconPicker} onSelect={onIconChange} currentIcon={icon} />
      )}
    </>
  )
}
