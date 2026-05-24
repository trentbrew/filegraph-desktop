import * as React from 'react'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { FileItem } from '@/components/app/fileStructure'
import { cn } from '@/lib/utils'
import { WebPreview } from './components/WebPreview'
import { EditorTabs } from './components/EditorTabs'
import { PreviewContent } from './components/PreviewContent'
import { LoadingState, ErrorState, EmptyState, FolderState } from './components/PreviewStates'
import { useTabStore } from '@/stores/useTabStore'
import { useUIStore } from '@/stores/useUIStore'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

export interface PreviewPaneProps {
  activeItem: FileItem | null
  webPreviewUrl: string | null
  onClose?: () => void
  onRename?: (newName: string) => Promise<void>
}

export function PreviewPane({ activeItem, webPreviewUrl, onClose, onRename }: PreviewPaneProps) {
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // File explorer visibility state
  const { showFileExplorer, setShowFileExplorer } = useUIStore()

  // Workspace-scoped editor tabs from TabStore
  const { tabs: workspaceTabs, activeTabId: activeWorkspaceId, openEditorPinned, updateEditorTab } = useTabStore()

  // Get editor tabs for the current workspace
  const activeWorkspace = workspaceTabs.find((t) => t.id === activeWorkspaceId)
  const tabs = activeWorkspace?.editorTabs || []
  const activeEditorTabId = activeWorkspace?.activeEditorTabId || null
  const activeTab = tabs.find((t) => t.id === activeEditorTabId)

  // Use tab's preview mode or default to 'code'
  const previewMode = activeTab?.previewMode || 'code'
  const setPreviewMode = (mode: 'code' | 'preview') => {
    if (activeEditorTabId) {
      updateEditorTab(activeEditorTabId, { previewMode: mode })
    }
  }

  // Sync activeItem with editor store (single-click opens pinned tab)
  React.useEffect(() => {
    if (activeItem && activeItem.file_type !== 'folder') {
      openEditorPinned(activeItem)
    }
  }, [activeItem, openEditorPinned])

  // Reset states when active item changes
  React.useEffect(() => {
    if (activeItem || activeTab) {
      setIsLoading(false)
      setError(null)
    } else if (webPreviewUrl) {
      setIsLoading(false)
      setError(null)
    }
  }, [activeItem, activeTab, webPreviewUrl])

  // Get the file to display from active tab
  // When tabs are empty, show empty state (don't fall back to stale activeItem)
  const displayFile = activeTab?.file ?? null

  // Determine if preview is supported for current file
  const supportsPreview = React.useMemo(() => {
    if (!displayFile) return false
    const extension = displayFile.extension?.toLowerCase()
    // Add md and note to previewable extensions
    const previewableExtensions = ['html', 'tsx', 'vue', 'svelte', 'md', 'note']
    return extension ? previewableExtensions.includes(extension) : false
  }, [displayFile])

  const handleTogglePreviewMode = React.useCallback(() => {
    setPreviewMode(previewMode === 'code' ? 'preview' : 'code')
  }, [previewMode, setPreviewMode])

  // Empty state - no file selected and no tabs
  if (!displayFile && !webPreviewUrl && tabs.length === 0) {
    return <EmptyState />
  }

  if (webPreviewUrl && !displayFile) {
    return <WebPreview url={webPreviewUrl} onClose={onClose} />
  }

  // Skip folders
  if (displayFile?.file_type === 'folder') {
    return <FolderState />
  }

  const hasTabs = tabs.length > 0

  return (
    <div className="h-full flex flex-col bg-transparent rounded-xl preview-content overflow-hidden">
      {/* Editor Tabs with File Explorer Toggle */}
      <div className="shrink-0 flex items-center rounded-t-xl overflow-hidden bg-transparent gap-1">
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 shrink-0 mr-1.5 mb-3 rounded-xl"
                onClick={() => setShowFileExplorer(!showFileExplorer)}>
                {showFileExplorer ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent side={showFileExplorer ? 'bottom' : 'bottom'}>
              <p>{showFileExplorer ? 'Hide file explorer' : 'Show file explorer'}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        {hasTabs && <EditorTabs className="flex-1" />}
      </div>

      {/* Content */}
      <div className={cn('flex-1 overflow-hidden', hasTabs ? 'border rounded-xl bg-card/25' : 'rounded-xl bg-card/25')}>
        {isLoading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState error={error} />
        ) : displayFile ? (
          <PreviewContent activeItem={displayFile} webPreviewUrl={webPreviewUrl} previewMode={previewMode} />
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  )
}
