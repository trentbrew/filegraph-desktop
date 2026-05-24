/**
 * Tag Editor Component
 * Inline tag management with autocomplete and visual distinction for auto-tags
 */

import * as React from 'react'
import { X, Plus, Tag, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

// Auto-generated tag prefixes (shown with distinct styling)
const AUTO_TAG_PATTERNS = ['google-calendar', 'recurring', 'local']

interface TagEditorProps {
  tags: string[]
  onChange: (tags: string[]) => void
  suggestedTags?: string[]
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function TagEditor({
  tags,
  onChange,
  suggestedTags = [],
  placeholder = 'Add tag...',
  disabled = false,
  className,
}: TagEditorProps) {
  const [inputValue, setInputValue] = React.useState('')
  const [isOpen, setIsOpen] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  // Check if a tag is auto-generated
  const isAutoTag = (tag: string) => {
    return AUTO_TAG_PATTERNS.some((pattern) => tag === pattern || tag.startsWith(`${pattern}-`))
  }

  // Filter suggestions based on input
  const filteredSuggestions = React.useMemo(() => {
    if (!inputValue.trim()) return suggestedTags.filter((t) => !tags.includes(t))
    const search = inputValue.toLowerCase()
    return suggestedTags.filter((t) => t.toLowerCase().includes(search) && !tags.includes(t))
  }, [inputValue, suggestedTags, tags])

  // Add a new tag
  const addTag = (tag: string) => {
    const normalized = tag
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]/g, '-')
    if (normalized && !tags.includes(normalized)) {
      onChange([...tags, normalized])
    }
    setInputValue('')
    setIsOpen(false)
  }

  // Remove a tag
  const removeTag = (tag: string) => {
    onChange(tags.filter((t) => t !== tag))
  }

  // Handle input keydown
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault()
      addTag(inputValue)
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      // Remove last non-auto tag on backspace
      const lastEditableTag = [...tags].reverse().find((t) => !isAutoTag(t))
      if (lastEditableTag) {
        removeTag(lastEditableTag)
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false)
      setInputValue('')
    }
  }

  return (
    <div className={cn('space-y-2', className)}>
      {/* Current tags */}
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag, index) => {
          const isAuto = isAutoTag(tag)
          return (
            <Badge
              key={`${tag}-${index}`}
              variant="outline"
              className={cn('text-xs gap-1 pr-1', isAuto && 'border-dashed opacity-70')}>
              {isAuto && <Sparkles className="h-2.5 w-2.5" />}
              {tag}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="ml-0.5 rounded-full p-0.5 hover:bg-muted transition-colors"
                  aria-label={`Remove ${tag} tag`}>
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          )
        })}

        {/* Add tag button */}
        {!disabled && (
          <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground">
                <Plus className="h-3 w-3" />
                Add
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-2" align="start">
              <div className="space-y-2">
                <Input
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={placeholder}
                  className="h-8 text-sm"
                  autoFocus
                />

                {/* Suggestions */}
                {filteredSuggestions.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground px-1">Suggestions</p>
                    <div className="flex flex-wrap gap-1">
                      {filteredSuggestions.slice(0, 8).map((suggestion) => (
                        <Badge
                          key={suggestion}
                          variant="secondary"
                          className="text-xs cursor-pointer hover:bg-accent transition-colors"
                          onClick={() => addTag(suggestion)}>
                          {suggestion}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Input hint */}
                {inputValue.trim() && !filteredSuggestions.includes(inputValue.toLowerCase()) && (
                  <p className="text-xs text-muted-foreground px-1">
                    Press Enter to add "{inputValue.toLowerCase().replace(/[^a-z0-9-]/g, '-')}"
                  </p>
                )}
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  )
}

// Display-only tags (for read-only views)
export function TagList({ tags, className }: { tags: string[]; className?: string }) {
  if (!tags.length) return null

  return (
    <div className={cn('flex flex-wrap gap-1', className)}>
      {tags.map((tag, index) => {
        const isAuto = AUTO_TAG_PATTERNS.some((p) => tag === p || tag.startsWith(`${p}-`))
        return (
          <Badge
            key={`${tag}-${index}`}
            variant="outline"
            className={cn('text-xs', isAuto && 'border-dashed opacity-70')}>
            {isAuto && <Sparkles className="h-2.5 w-2.5 mr-1" />}
            {tag}
          </Badge>
        )
      })}
    </div>
  )
}
