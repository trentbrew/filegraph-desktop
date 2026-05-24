/**
 * ContextBadge - Shows agent's current awareness context
 *
 * Displays what the agent can "see" - active app, open files, canvas state.
 * Inspired by Notion's context indicator in their AI chat.
 */

import * as React from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Home, FileText, Layers, Eye, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppStore, APP_REGISTRY, type AppId } from '@/stores/useAppStore'
import { useTabStore } from '@/stores/useTabStore'
import { useFileStore } from '@/stores/useFileStore'

interface ContextItem {
  type: 'app' | 'file' | 'canvas'
  label: string
  icon: React.ReactNode
  detail?: string
}

export function ContextBadge() {
  const [expanded, setExpanded] = React.useState(false)

  // Get current context from stores
  const activeApp = useAppStore((s) => s.activeApp)
  const tabs = useTabStore((s) => s.tabs)
  const activeTabId = useTabStore((s) => s.activeTabId)
  const activeItem = useFileStore((s) => s.activeItem)

  // Get active workspace and editor tabs
  const activeWorkspace = tabs.find((t) => t.id === activeTabId)
  const activeEditorTab = activeWorkspace?.editorTabs.find((t) => t.id === activeWorkspace.activeEditorTabId)

  // Get home canvas state (lazy load to avoid circular deps)
  const [canvasState, setCanvasState] = React.useState<{ nodeCount: number; edgeCount: number } | null>(null)

  React.useEffect(() => {
    if (activeApp === 'home') {
      import('@/features/home/useHomeCanvasStore').then(({ useHomeCanvasStore }) => {
        const state = useHomeCanvasStore.getState()
        setCanvasState({
          nodeCount: state.nodes.length,
          edgeCount: state.edges.length,
        })

        // Subscribe to changes
        const unsub = useHomeCanvasStore.subscribe((s) => {
          setCanvasState({
            nodeCount: s.nodes.length,
            edgeCount: s.edges.length,
          })
        })
        return unsub
      })
    } else {
      setCanvasState(null)
    }
  }, [activeApp])

  // Build context items
  const contextItems: ContextItem[] = React.useMemo(() => {
    const items: ContextItem[] = []

    // Active app
    const appDef = APP_REGISTRY[activeApp]
    if (appDef) {
      const AppIcon = appDef.icon
      items.push({
        type: 'app',
        label: appDef.name,
        icon: <AppIcon className="h-3 w-3" />,
      })
    }

    // Active file (if viewing one)
    const activeFile = activeEditorTab?.file || activeItem
    if (activeFile && activeFile.file_type !== 'folder') {
      items.push({
        type: 'file',
        label: activeFile.name,
        icon: <FileText className="h-3 w-3" />,
        detail: activeFile.extension ? `.${activeFile.extension}` : undefined,
      })
    }

    // Canvas state (if on home)
    if (activeApp === 'home' && canvasState) {
      items.push({
        type: 'canvas',
        label: `${canvasState.nodeCount} nodes`,
        icon: <Layers className="h-3 w-3" />,
        detail: canvasState.edgeCount > 0 ? `${canvasState.edgeCount} edges` : undefined,
      })
    }

    return items
  }, [activeApp, activeEditorTab, activeItem, canvasState])

  // Primary context (first item to always show)
  const primaryContext = contextItems[0]
  const hasMore = contextItems.length > 1

  if (!primaryContext) return null

  return (
    <div className="relative w-full">
      <motion.button
        onClick={() => hasMore && setExpanded(!expanded)}
        className={cn(
          'flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px]',
          'bg-muted/50 hover:bg-muted border border-border/50',
          'text-muted-foreground transition-colors',
          hasMore && 'cursor-pointer',
          !hasMore && 'cursor-default',
          'w-full',
        )}
        whileHover={hasMore ? { scale: 1.02 } : undefined}
        whileTap={hasMore ? { scale: 0.98 } : undefined}>
        <Eye className="h-2.5 w-2.5 opacity-50" />
        <span className="font-medium">Context:</span>
        <span className="flex items-center gap-1">
          {primaryContext.icon}
          <span className="max-w-[100px] truncate">{primaryContext.label}</span>
        </span>
        {hasMore && (
          <>
            <span className="text-muted-foreground/50">+{contextItems.length - 1}</span>
            {expanded ? (
              <ChevronUp className="h-2.5 w-2.5 opacity-50" />
            ) : (
              <ChevronDown className="h-2.5 w-2.5 opacity-50" />
            )}
          </>
        )}
      </motion.button>

      <AnimatePresence>
        {expanded && hasMore && (
          <motion.div
            initial={{ opacity: 0, y: -1, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -1, height: 0 }}
            className="absolute bottom-full left-0 mb-1 z-10 w-full min-w-[180px]">
            <div className="bg-popover border rounded-md shadow-md p-1.5 space-y-0.5">
              <div className="px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground/70 uppercase tracking-wider">
                Agent sees
              </div>
              {contextItems.map((item, i) => (
                <div
                  key={`${item.type}-${i}`}
                  className="flex items-center gap-2 px-1.5 py-1 rounded text-[10px] hover:bg-muted/50">
                  <span className="text-muted-foreground">{item.icon}</span>
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.detail && <span className="text-muted-foreground/60 text-[9px]">{item.detail}</span>}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
