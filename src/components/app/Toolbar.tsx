import {
  ChevronDownIcon,
  Columns3,
  Grid3x3,
  ListTree,
  MoreHorizontal,
  Network,
  Search,
  TableIcon,
  FilePlus,
  FolderPlus,
} from 'lucide-react'

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { invoke } from '@tauri-apps/api/core'
import { forwardRef, useImperativeHandle, useState } from 'react'
import { toast } from 'sonner'

import type { LayoutMode } from './navigation'

const layoutOptions: {
  mode: LayoutMode
  label: string
  icon: React.ReactNode
}[] = [
  { mode: 'table', label: 'Table', icon: <TableIcon className="h-4 w-4" /> },
  { mode: 'grid', label: 'Grid', icon: <Grid3x3 className="h-4 w-4" /> },
  { mode: 'columns', label: 'Columns', icon: <Columns3 className="h-4 w-4" /> },
  { mode: 'tree', label: 'Tree', icon: <ListTree className="h-4 w-4" /> },
  { mode: 'graph', label: 'Graph', icon: <Network className="h-4 w-4" /> },
]

const layoutIconMap = layoutOptions.reduce<Record<LayoutMode, React.ReactNode>>(
  (acc, option) => ({ ...acc, [option.mode]: option.icon }),
  {} as Record<LayoutMode, React.ReactNode>,
)

interface ToolbarProps {
  layoutMode: LayoutMode
  onLayoutModeChange: (mode: LayoutMode) => void
  searchValue: string
  onSearchChange: (value: string) => void
  currentPath: string
  onRefresh: (fileToSelect?: string) => Promise<void>
  className?: string
}

export type ToolbarHandle = {
  openNewFolderDialog: () => void
  openNewFileDialog: () => void
}

export const Toolbar = forwardRef<ToolbarHandle, ToolbarProps>(function Toolbar(
  { layoutMode, onLayoutModeChange, searchValue, onSearchChange, currentPath, onRefresh, className = '' },
  ref,
) {
  const [isLoading, setIsLoading] = useState(false)
  const [folderDialogOpen, setFolderDialogOpen] = useState(false)
  const [fileDialogOpen, setFileDialogOpen] = useState(false)
  const [folderName, setFolderName] = useState('')
  const [fileName, setFileName] = useState('')

  useImperativeHandle(ref, () => ({
    openNewFolderDialog: () => setFolderDialogOpen(true),
    openNewFileDialog: () => setFileDialogOpen(true),
  }))

  const handleCreateFolder = async () => {
    if (!folderName.trim()) {
      toast.error('Please enter a folder name')
      return
    }

    setIsLoading(true)
    try {
      await invoke('create_folder', {
        path: currentPath,
        name: folderName.trim(),
      })
      toast.success(`Folder "${folderName.trim()}" created successfully`)
      await onRefresh(folderName.trim())
      setFolderName('')
      setFolderDialogOpen(false)
    } catch (error) {
      toast.error(`Failed to create folder: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateFile = async () => {
    if (!fileName.trim()) {
      toast.error('Please enter a file name')
      return
    }

    setIsLoading(true)
    try {
      await invoke('create_file', {
        path: currentPath,
        name: fileName.trim(),
      })
      toast.success(`File "${fileName.trim()}" created successfully`)
      await onRefresh(fileName.trim())
      setFileName('')
      setFileDialogOpen(false)
    } catch (error) {
      toast.error(`Failed to create file: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div
      className={`flex items-center gap-2 shrink-0 mb-3 border-[0.5px] border-border rounded-xl shadow-none ${className}`}>
      <InputGroup className="flex-1 h-10 rounded-xl pr-1.5 shadow-none">
        <InputGroupAddon>
          <Search className="h-4 w-4" />
        </InputGroupAddon>
        <InputGroupInput
          placeholder="Search..."
          value={searchValue}
          className="!h-full"
          onChange={(event) => onSearchChange(event.target.value)}
        />
        <InputGroupAddon align="inline-end" className="gap-0">
          <TooltipProvider>
            {/* New File Dialog */}
            <Dialog open={fileDialogOpen} onOpenChange={setFileDialogOpen}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DialogTrigger asChild>
                    <InputGroupButton variant="ghost" size="xs" className="gap-1.5 rounded-lg" disabled={isLoading}>
                      <FilePlus className="h-4 w-4" />
                    </InputGroupButton>
                  </DialogTrigger>
                </TooltipTrigger>
                <TooltipContent>
                  <p>New File</p>
                </TooltipContent>
              </Tooltip>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Create New File</DialogTitle>
                  <DialogDescription>Enter a name for the new file (include extension).</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="file-name" className="text-right">
                      Name
                    </Label>
                    <Input
                      id="file-name"
                      value={fileName}
                      onChange={(e) => setFileName(e.target.value)}
                      className="col-span-3"
                      placeholder="example.txt"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleCreateFile()
                        }
                      }}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" onClick={handleCreateFile} disabled={isLoading || !fileName.trim()}>
                    Create File
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            {/* New Folder Dialog */}
            <Dialog open={folderDialogOpen} onOpenChange={setFolderDialogOpen}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DialogTrigger asChild>
                    <InputGroupButton variant="ghost" size="xs" className="gap-1.5 rounded-lg" disabled={isLoading}>
                      <FolderPlus className="h-4 w-4" />
                    </InputGroupButton>
                  </DialogTrigger>
                </TooltipTrigger>
                <TooltipContent>
                  <p>New Folder</p>
                </TooltipContent>
              </Tooltip>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Create New Folder</DialogTitle>
                  <DialogDescription>Enter a name for the new folder.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="folder-name" className="text-right">
                      Name
                    </Label>
                    <Input
                      id="folder-name"
                      value={folderName}
                      onChange={(e) => setFolderName(e.target.value)}
                      className="col-span-3"
                      placeholder="Enter folder name..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleCreateFolder()
                        }
                      }}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" onClick={handleCreateFolder} disabled={isLoading || !folderName.trim()}>
                    Create Folder
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TooltipProvider>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <InputGroupButton
                className="pr-1.5! gap-1.5 rounded-lg"
                variant="ghost"
                size="xs"
                aria-label="Change layout">
                <span className="flex items-center gap-1">
                  {layoutIconMap[layoutMode]}
                  <ChevronDownIcon className="size-3" />
                </span>
              </InputGroupButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="[--radius:0.95rem]">
              {layoutOptions.map(({ mode, label, icon }) => (
                <DropdownMenuItem key={mode} className="gap-2" onClick={() => onLayoutModeChange(mode)}>
                  {icon}
                  {label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </InputGroupAddon>
      </InputGroup>
    </div>
  )
})

Toolbar.displayName = 'Toolbar'
