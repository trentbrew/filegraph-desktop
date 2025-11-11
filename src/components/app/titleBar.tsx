import { getCurrentWindow } from '@tauri-apps/api/window';
import ThemeToggle from './themeToggle';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Home, Settings, User } from 'lucide-react';

const appWindow = getCurrentWindow();

interface TitleBarProps {
  currentPath: string;
  onPathChange: (path: string) => void;
  onNavigate: (path: string) => void;
  onNavigateBack: () => void;
  onNavigateHome: () => void;
  canNavigateBack: boolean;
  loading?: boolean;
}

export default function TitleBar({
  currentPath,
  onPathChange,
  onNavigate,
  onNavigateBack,
  onNavigateHome,
  canNavigateBack,
  loading = false,
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
      {/* macOS Traffic Lights + Navigation */}
      <div
        data-tauri-drag-region="false"
        className="flex items-center gap-3 shrink-0"
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

        {/* Navigation Buttons */}
        <div className="flex items-center gap-2 ml-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onNavigateBack}
            disabled={loading || !canNavigateBack}
            className="h-7 w-7 p-0"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onNavigateHome}
            disabled={loading}
            className="h-7 w-7 p-0"
          >
            <Home className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Path Input - Center */}
      <div data-tauri-drag-region="false" className="flex-1 px-4 max-w-3xl">
        <Input
          placeholder="Enter path..."
          value={currentPath}
          onChange={(event) => onPathChange(event.target.value)}
          className="w-full font-mono text-sm h-8 text-center !bg-transparent opacity-50 border-none"
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              onNavigate(currentPath);
            }
          }}
          disabled={loading}
        />
      </div>

      {/* Right side controls */}

      <div
        data-tauri-drag-region="false"
        className="shrink-0 flex items-center gap-2 mr-2 text-foreground/50"
      >
        <ThemeToggle />
        <div className="flex items-center gap-4">
          <Settings size={18} />
        </div>
      </div>
    </div>
  );
}
