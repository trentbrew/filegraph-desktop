import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { TableIcon, Grid3x3, Columns3, ListTree, Network, PenTool } from 'lucide-react'

export type LayoutMode = 'table' | 'grid' | 'columns' | 'tree' | 'graph' | 'whiteboard'

interface ViewDropdownProps {
  currentMode: LayoutMode
  onModeChange: (mode: LayoutMode) => void
  className?: string
}

const layoutIcons: Record<LayoutMode, React.ReactNode> = {
  table: <TableIcon className="h-4 w-4" />,
  grid: <Grid3x3 className="h-4 w-4" />,
  columns: <Columns3 className="h-4 w-4" />,
  tree: <ListTree className="h-4 w-4" />,
  graph: <Network className="h-4 w-4" />,
  whiteboard: <PenTool className="h-4 w-4" />,
}

export function ViewDropdown({ currentMode, onModeChange, className = '' }: ViewDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className={`gap-2 -translate-x-12 ${className}`}>
          {layoutIcons[currentMode]}
          {/* <span className="capitalize">{currentMode}</span> */}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem onClick={() => onModeChange('table')}>
          <TableIcon className="h-4 w-4 mr-2" />
          Table
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onModeChange('grid')}>
          <Grid3x3 className="h-4 w-4 mr-2" />
          Grid
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onModeChange('columns')}>
          <Columns3 className="h-4 w-4 mr-2" />
          Columns
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onModeChange('tree')}>
          <ListTree className="h-4 w-4 mr-2" />
          Tree
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onModeChange('graph')}>
          <Network className="h-4 w-4 mr-2" />
          Graph
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onModeChange('whiteboard')}>
          <PenTool className="h-4 w-4 mr-2" />
          Whiteboard
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
