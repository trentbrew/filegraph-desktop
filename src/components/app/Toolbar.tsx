import { ViewDropdown, SearchInput, type LayoutMode } from './navigation';

interface ToolbarProps {
  layoutMode: LayoutMode;
  onLayoutModeChange: (mode: LayoutMode) => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
  className?: string;
}

export function Toolbar({
  layoutMode,
  onLayoutModeChange,
  searchValue,
  onSearchChange,
  className = '',
}: ToolbarProps) {
  return (
    <div className={`flex items-center gap-3 p-3 pl-0 shrink-0 ${className}`}>
      {/* Layout Mode Selector */}
      <ViewDropdown currentMode={layoutMode} onModeChange={onLayoutModeChange} />

      {/* Search Input - Full Width */}
      <SearchInput value={searchValue} onChange={onSearchChange} />
    </div>
  );
}
