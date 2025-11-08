import { getCurrentWindow } from '@tauri-apps/api/window';
import ThemeToggle from './themeToggle';

const appWindow = getCurrentWindow();

export default function TitleBar() {
  const handleFullscreen = async () => {
    const isFullscreen = await appWindow.isFullscreen();
    await appWindow.setFullscreen(!isFullscreen);
  };

  return (
    <div
      data-tauri-drag-region
      className="flex flex-row items-center justify-between h-12 px-3 bg-background/95 backdrop-blur-xl border-b border-border/50 rounded-t-[12px]"
    >
      {/* macOS Traffic Lights */}
      <div
        data-tauri-drag-region="false"
        className="flex items-center gap-2 shrink-0"
      >
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
        <div className="ml-2">
          <p className="text-sm font-medium">Filegraph</p>
        </div>
      </div>

      {/* Spacer for centered layout */}
      <div className="flex-1"></div>

      {/* Right side controls */}
      <div data-tauri-drag-region="false" className="shrink-0">
        <ThemeToggle />
      </div>
    </div>
  );
}
