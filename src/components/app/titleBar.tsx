import { getCurrentWindow } from '@tauri-apps/api/window';
import { Separator } from '@/components/ui/separator';
import { TabBar, type TabData } from './navigation';
import { SettingsDialog } from './SettingsDialog';

const appWindow = getCurrentWindow();

interface TitleBarProps {
  tabs: TabData[];
  activeTabId: string;
  onTabSelect: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onNewTab: () => void;
}

export default function TitleBar({
  tabs,
  activeTabId,
  onTabSelect,
  onTabClose,
  onNewTab,
}: TitleBarProps) {
  const handleFullscreen = async () => {
    const isFullscreen = await appWindow.isFullscreen();
    await appWindow.setFullscreen(!isFullscreen);
  };

  return (
    <div
      data-tauri-drag-region
      className="flex flex-row items-center justify-between h-12 px-3 bg-background/95 backdrop-blur-xl border-b border-border/50 rounded-t-[12px]"
    >
      {/* Left: macOS Traffic Lights + App Name */}
      <div data-tauri-drag-region className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => appWindow.close()}
            className="w-3 h-3 rounded-full bg-[#FF5F57] hover:bg-[#FF3B30] transition-all duration-150 relative group flex items-center justify-center shadow-sm hover:shadow"
            aria-label="Close"
          >
            <span className="hidden group-hover:inline text-[10px] text-red-900 font-bold leading-none">
              ×
            </span>
          </button>
          <button
            onClick={() => appWindow.minimize()}
            className="w-3 h-3 rounded-full bg-[#FFBD2E] hover:bg-[#FF9500] transition-all duration-150 relative group flex items-center justify-center shadow-sm hover:shadow"
            aria-label="Minimize"
          >
            <span className="hidden group-hover:inline text-[10px] text-yellow-900 font-bold leading-none">
              −
            </span>
          </button>
          <button
            onClick={handleFullscreen}
            className="w-3 h-3 rounded-full bg-[#28C840] hover:bg-[#34C759] transition-all duration-150 relative group flex items-center justify-center shadow-sm hover:shadow"
            aria-label="Fullscreen"
          >
            <span className="hidden group-hover:inline text-[8px] text-green-900 font-bold leading-none">
              ⤢
            </span>
          </button>
        </div>

        <Separator orientation="vertical" className="h-4" />

        {/* <span className="text-sm font-medium">FileGraph</span> */}
      </div>

      {/* Center: Tabs */}
      <div className="flex-1 flex items-center overflow-hidden">
        <TabBar
          tabs={tabs}
          activeTabId={activeTabId}
          onTabSelect={onTabSelect}
          onTabClose={onTabClose}
          onNewTab={onNewTab}
          className="border-none"
        />
      </div>

      {/* Right: Settings */}
      <div className="shrink-0 flex items-center">
        <SettingsDialog />
      </div>
    </div>
  );
}
