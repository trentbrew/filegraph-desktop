// @ts-nocheck
// TODO: FileTabBar not yet integrated - uses outdated store API
import * as React from 'react'
import { X, File, Code, Eye } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getEffectiveExtension } from '@/lib/utils/fileExtensions'
import { useTabStore } from '@/stores/useTabStore'
import { useFileStore } from '@/stores/useFileStore'
import { getFileIcon } from '@/lib/fileIcons'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface FileTabBarProps {
  onTogglePreviewMode?: () => void
  previewMode?: 'code' | 'preview'
  supportsPreview?: boolean
}

export function FileTabBar({ onTogglePreviewMode, previewMode, supportsPreview }: FileTabBarProps) {
  const { activeTabId, tabs, setActiveFile, closeFile } = useTabStore()
  const activeTab = tabs.find((t) => t.id === activeTabId)

  // If no active tab or no open files, don't render anything (or render empty state?)
  if (!activeTab || !activeTab.openFiles || activeTab.openFiles.length === 0) return null

  const handleTabClick = (path: string) => {
    setActiveFile(activeTabId, path)
  }

  const handleCloseTab = (e: React.MouseEvent, path: string) => {
    e.stopPropagation()
    closeFile(activeTabId, path)
  }

  return (
    <div className="flex items-center w-full bg-muted/30 border-b border-border overflow-hidden h-9">
      <div className="flex-1 flex items-center overflow-x-auto no-scrollbar">
        {activeTab.openFiles.map((path) => {
          const isActive = path === activeTab.activeFile
          const fileName = path.split('/').pop() || 'Untitled'
          const extension = getEffectiveExtension(fileName) || ''

          return (
            <div
              key={path}
              className={cn(
                'group flex items-center gap-2 px-3 h-9 min-w-[120px] max-w-[200px] border-r border-border/50 cursor-pointer select-none transition-colors',
                isActive ? 'bg-background text-foreground font-medium' : 'hover:bg-muted/50 text-muted-foreground',
              )}
              onClick={() => handleTabClick(path)}>
              <span className="shrink-0 opacity-70 scale-75">{getFileIcon('file', extension)}</span>
              <span className="truncate text-xs flex-1">{fileName}</span>
              <div
                role="button"
                className={cn(
                  'opacity-0 group-hover:opacity-100 hover:bg-muted-foreground/20 rounded-sm p-0.5 transition-all',
                  isActive && 'opacity-100',
                )}
                onClick={(e) => handleCloseTab(e, path)}>
                <X className="h-3 w-3" />
              </div>
            </div>
          )
        })}
      </div>

      {/* Right side actions (Preview Toggle) */}
      {supportsPreview && onTogglePreviewMode && (
        <div className="flex items-center px-2 border-l border-border bg-background h-full">
          <TooltipProvider>
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={previewMode === 'code' ? 'secondary' : 'ghost'}
                    size="icon"
                    onClick={() => previewMode !== 'code' && onTogglePreviewMode()}
                    className="h-6 w-6">
                    <Code className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Code View</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={previewMode === 'preview' ? 'secondary' : 'ghost'}
                    size="icon"
                    onClick={() => previewMode !== 'preview' && onTogglePreviewMode()}
                    className="h-6 w-6">
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Preview</TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        </div>
      )}
    </div>
  )
}
