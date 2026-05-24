import { BackButton, ForwardButton, HomeButton, PathInput } from './'
import CommandsPallet from '../commandsPallet'
import { Ellipsis, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SettingsDialog } from '../SettingsDialog'
import { Plus, Menu } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export interface NavigationBarProps {
  currentPath: string
  onPathChange: (path: string) => void
  onNavigate: (path: string) => void
  onNavigateBack: () => void
  onNavigateForward: () => void
  onNavigateHome: () => void
  canNavigateBack: boolean
  canNavigateForward: boolean
  loading?: boolean
  selectedItems: string[]
  onRefresh: () => Promise<void>
  onItemsDeleted: () => void
  fileExplorerVisible?: boolean
  onToggleFileExplorer?: () => void
}

export function NavigationBar({
  currentPath,
  onPathChange,
  onNavigate,
  onNavigateBack,
  onNavigateForward,
  onNavigateHome,
  canNavigateBack,
  canNavigateForward,
  loading = false,
  selectedItems,
  onRefresh,
  onItemsDeleted,
}: NavigationBarProps) {
  return (
    <div className="flex items-center gap-2 px-3 h-11 border border-border bg-card/10 rounded-xl">
      {/* Left: Navigation buttons */}
      <div className="flex items-center gap-1 shrink-0">
        <BackButton
          onClick={onNavigateBack}
          disabled={loading || !canNavigateBack}
          className="h-7 w-7 !bg-transparent border-none text-foreground text-xs hover:!bg-accent"
        />
        <ForwardButton
          onClick={onNavigateForward}
          disabled={loading || !canNavigateForward}
          className="h-7 w-7 !bg-transparent border-none text-foreground text-xs hover:bg-accent"
        />
        <HomeButton
          onClick={onNavigateHome}
          disabled={loading}
          className="h-7 w-7 !bg-transparent border-none text-foreground text-xs hover:!bg-accent"
        />
      </div>

      {/* Center-Left: Refresh button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => void onRefresh()}
        disabled={loading}
        className="h-7 w-7 p-0 shrink-0 group !transition-all !duration-200"
        title="Refresh">
        <RefreshCw
          className={`transition-all duration-200 h-4 w-4 ${loading ? 'animate-spin' : ''} group-hover:rotate-90`}
          style={{
            transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        />
      </Button>

      {/* Center: Path input */}
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
  )
}
