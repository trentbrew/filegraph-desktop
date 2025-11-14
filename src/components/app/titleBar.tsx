import { getCurrentWindow } from '@tauri-apps/api/window';
import CommandsPallet from './commandsPallet';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useEffect, useRef, useState } from 'react';

const appWindow = getCurrentWindow();

interface TitleBarProps {
  currentPath: string;
  onPathChange: (path: string) => void;
  onNavigate: (path: string) => void;
  loading?: boolean;
  selectedItems: string[];
  onRefresh: () => void;
  onItemsDeleted: () => void;
}

export default function TitleBar({
  currentPath,
  onPathChange,
  onNavigate,
  loading = false,
  selectedItems,
  onRefresh,
  onItemsDeleted,
}: TitleBarProps) {
  const handleFullscreen = async () => {
    const isFullscreen = await appWindow.isFullscreen();
    await appWindow.setFullscreen(!isFullscreen);
  };

  const inputRef = useRef<HTMLInputElement>(null);
  const [inputWidth, setInputWidth] = useState('200px');

  useEffect(() => {
    // Create a hidden span to measure text width
    const span = document.createElement('span');
    span.style.visibility = 'hidden';
    span.style.position = 'absolute';
    span.style.whiteSpace = 'pre';
    span.style.font = window.getComputedStyle(
      inputRef.current || document.body,
    ).font;
    span.textContent = currentPath || 'Enter path...';

    document.body.appendChild(span);
    const width = Math.max(200, span.getBoundingClientRect().width + 32); // Add padding
    const maxWidth = window.innerWidth * 0.7;
    setInputWidth(`${Math.min(width, maxWidth)}px`);

    document.body.removeChild(span);
  }, [currentPath]);

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

        <span className="text-sm font-medium">FileGraph</span>
      </div>

      {/* Center: Path Input */}
      <div data-tauri-drag-region className="flex-1 flex justify-center px-4">
        <div className="inline-flex max-w-full">
          <Input
            data-tauri-drag-region="false"
            ref={inputRef}
            placeholder="Enter path..."
            value={currentPath}
            onChange={(event) => onPathChange(event.target.value)}
            className="w-auto min-w-[200px] max-w-full font-mono text-sm cursor-text! h-8 text-center bg-transparent! opacity-50 hover:opacity-100 active:opacity-100 border-none focus:outline-none focus:ring-0"
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                onNavigate(currentPath);
              }
            }}
            disabled={loading}
            style={{ width: inputWidth }}
          />
        </div>
      </div>

      {/* Right: Commands Palette */}
      <div
        data-tauri-drag-region
        className="shrink-0 flex items-center gap-2"
      >
        <CommandsPallet
          currentPath={currentPath}
          selectedItems={selectedItems}
          onRefresh={onRefresh}
          onItemsDeleted={onItemsDeleted}
        />
      </div>
    </div>
  );
}
