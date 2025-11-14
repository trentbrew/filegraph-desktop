import { BackButton, HomeButton, PathInput } from './';
import CommandsPallet from '../commandsPallet';

interface NavigationBarProps {
  currentPath: string;
  onPathChange: (path: string) => void;
  onNavigate: (path: string) => void;
  onNavigateBack: () => void;
  onNavigateHome: () => void;
  canNavigateBack: boolean;
  loading?: boolean;
  selectedItems: string[];
  onRefresh: () => void;
  onItemsDeleted: () => void;
}

export function NavigationBar({
  currentPath,
  onPathChange,
  onNavigate,
  onNavigateBack,
  onNavigateHome,
  canNavigateBack,
  loading = false,
  selectedItems,
  onRefresh,
  onItemsDeleted,
}: NavigationBarProps) {
  return (
    <div className="flex items-center gap-2 px-3 h-10 bg-background/95 backdrop-blur-xl border-b border-border/50">
      {/* Left: Back/Home buttons + Path input */}
      <div className="flex items-center gap-2 flex-1">
        <div className="flex items-center gap-1">
          <BackButton
            onClick={onNavigateBack}
            disabled={loading || !canNavigateBack}
            className="h-7 w-7"
          />
          <HomeButton
            onClick={onNavigateHome}
            disabled={loading}
            className="h-7 w-7"
          />
        </div>
        <div className="flex-1">
          <PathInput
            value={currentPath}
            onChange={onPathChange}
            onNavigate={onNavigate}
            loading={loading}
            className="w-full"
          />
        </div>
      </div>

      {/* Right: Commands Palette */}
      <div className="shrink-0">
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
