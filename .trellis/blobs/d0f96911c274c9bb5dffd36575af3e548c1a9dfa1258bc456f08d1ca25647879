import * as React from 'react'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { TabBar, type TabData } from './navigation'
import { Minus, Square, X } from 'lucide-react'
import { useTrafficLights } from '@/lib/platform'

interface TitleBarProps {
  tabs: TabData[]
  activeTabId: string
  onTabSelect: (tabId: string) => void
  onTabClose: (tabId: string) => void
  onNewTab: () => void
  onReorderTabs: (newTabs: TabData[]) => void
  onTabRename: (tabId: string, newTitle: string) => void
  onTabIconChange: (tabId: string, newIcon: string) => void
}

export default function TitleBar({
  tabs,
  activeTabId,
  onTabSelect,
  onTabClose,
  onNewTab,
  onReorderTabs,
  onTabRename,
  onTabIconChange,
}: TitleBarProps) {
  const appWindow = React.useMemo(() => {
    try {
      return getCurrentWindow()
    } catch {
      return null
    }
  }, [])

  const handleFullscreen = async () => {
    if (!appWindow) return
    const isFullscreen = await appWindow.isFullscreen()
    await appWindow.setFullscreen(!isFullscreen)
  }

  const handleMaximize = async () => {
    if (!appWindow) return
    const isMaximized = await appWindow.isMaximized()
    if (isMaximized) {
      await appWindow.unmaximize()
    } else {
      await appWindow.maximize()
    }
  }

  return (
    <div
      data-tauri-drag-region
      className="flex flex-row items-center justify-between px-3 bg-transparent backdrop-blur-xl rounded-t-[12px] py-0">
      {/* Window Controls — platform-aware */}
      <div data-tauri-drag-region className="flex items-center gap-3 shrink-0 ml-3">
        {useTrafficLights() ? (
          /* macOS Traffic Lights */
          <div className="flex items-center gap-2">
            <button
              onClick={() => appWindow?.close()}
              className="w-3 h-3 rounded-full bg-[#FF5F57] hover:bg-[#FF3B30] transition-all duration-150 relative group flex items-center justify-center shadow-sm hover:shadow"
              aria-label="Close">
              <span className="hidden group-hover:inline text-[10px] text-red-900 font-bold leading-none">×</span>
            </button>
            <button
              onClick={() => appWindow?.minimize()}
              className="w-3 h-3 rounded-full bg-[#FFBD2E] hover:bg-[#FF9500] transition-all duration-150 relative group flex items-center justify-center shadow-sm hover:shadow"
              aria-label="Minimize">
              <span className="hidden group-hover:inline text-[10px] text-yellow-900 font-bold leading-none">−</span>
            </button>
            <button
              onClick={handleFullscreen}
              className="w-3 h-3 rounded-full bg-[#28C840] hover:bg-[#34C759] transition-all duration-150 relative group flex items-center justify-center shadow-sm hover:shadow"
              aria-label="Fullscreen">
              <span className="hidden group-hover:inline text-[8px] text-green-900 font-bold leading-none">⤢</span>
            </button>
          </div>
        ) : (
          /* Linux / Windows CSD buttons */
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => appWindow?.minimize()}
              className="w-8 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              aria-label="Minimize">
              <Minus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleMaximize}
              className="w-8 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              aria-label="Maximize">
              <Square className="w-3 h-3" />
            </button>
            <button
              onClick={() => appWindow?.close()}
              className="w-8 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/90 hover:text-white transition-colors"
              aria-label="Close">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <Separator orientation="vertical" className="h-4" />
      </div>

      {/* Center: Tabs */}
      <div data-tauri-drag-region className="flex-1 flex items-center overflow-hidden pr-3">
        <TabBar
          tabs={tabs}
          activeTabId={activeTabId}
          onTabSelect={onTabSelect}
          onTabClose={onTabClose}
          onNewTab={onNewTab}
          onReorderTabs={onReorderTabs}
          onTabRename={onTabRename}
          onTabIconChange={onTabIconChange}
          className="border-none"
        />
      </div>
    </div>
  )
}
