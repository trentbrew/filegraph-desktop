import { ClipboardIcon, ScissorsIcon, Trash, Copy } from 'lucide-react'
import { Button } from '../ui/button'
import { Separator } from '../ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog'
import { invoke } from '@tauri-apps/api/core'
import { useState } from 'react'
import { toast } from 'sonner'
import { useClipboardStore } from '@/stores/clipboardStore'

interface CommandsPalletProps {
  currentPath: string
  selectedItems: string[]
  onRefresh: () => Promise<void>
  onItemsDeleted: () => void
}

export default function CommandsPallet({ currentPath, selectedItems, onRefresh, onItemsDeleted }: CommandsPalletProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const { items: clipboardItems, operation: clipboardOperation, setClipboard, clearClipboard } = useClipboardStore()

  const handleDeleteSelected = async () => {
    if (selectedItems.length === 0) {
      toast.error('No items selected')
      return
    }

    setDeleteDialogOpen(false)
    setIsLoading(true)
    try {
      // Move selected items to trash
      await invoke('trash_items', { paths: selectedItems })
      toast.success(`Moved ${selectedItems.length} item(s) to trash`)
      onItemsDeleted()
      await onRefresh()
    } catch (error) {
      toast.error(`Failed to move to trash: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopySelected = () => {
    if (selectedItems.length === 0) {
      toast.error('No items selected to copy')
      return
    }

    // Store items for clipboard operations
    setClipboard([...selectedItems], 'copy')

    // Also copy file paths to system clipboard for external use
    const pathsText = selectedItems.join('\n')
    navigator.clipboard
      .writeText(pathsText)
      .then(() => toast.success(`Copied ${selectedItems.length} item(s) to clipboard`))
      .catch(() => toast.error('Failed to copy to clipboard'))
  }

  const handleCutSelected = () => {
    if (selectedItems.length === 0) {
      toast.error('No items selected to cut')
      return
    }

    // Store items for clipboard operations
    setClipboard([...selectedItems], 'cut')

    toast.success(`Cut ${selectedItems.length} item(s) to clipboard`)
  }

  const handlePaste = async () => {
    if (clipboardItems.length === 0 || !clipboardOperation) {
      toast.error('Nothing to paste')
      return
    }

    setIsLoading(true)
    try {
      if (clipboardOperation === 'copy') {
        await invoke('copy_items', {
          source_paths: clipboardItems,
          destination_path: currentPath,
        })
        toast.success(`Pasted ${clipboardItems.length} item(s)`)
      } else if (clipboardOperation === 'cut') {
        await invoke('move_items', {
          source_paths: clipboardItems,
          destination_path: currentPath,
        })
        toast.success(`Moved ${clipboardItems.length} item(s)`)

        // Clear clipboard after cutting
        clearClipboard()
      }

      await onRefresh()
    } catch (error) {
      toast.error(`Failed to paste: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <TooltipProvider>
      <div className="flex flex-row items-center gap-1 px-0 py-0 backdrop-blur-sm">
        {/* File operations */}
        <div className="flex items-center gap-1">
          {/* Clipboard operations - only show when items are selected */}
          {selectedItems.length > 0 && (
            <>
              <div className="flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={handleCutSelected}>
                      <ScissorsIcon className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Cut Selected ({selectedItems.length})</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={handleCopySelected}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Copy Selected ({selectedItems.length})</p>
                  </TooltipContent>
                </Tooltip>

                <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                          disabled={isLoading}>
                          <Trash className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Delete Selected ({selectedItems.length})</p>
                    </TooltipContent>
                  </Tooltip>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Confirm Deletion</DialogTitle>
                      <DialogDescription>
                        Are you sure you want to delete {selectedItems.length} item(s)? This action cannot be undone.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button variant="destructive" onClick={handleDeleteSelected} disabled={isLoading}>
                        Delete
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </>
          )}

          {/* Paste button - only show when clipboard has items */}
          {clipboardItems.length > 0 && (
            <>
              <Separator orientation="vertical" className="h-6" />
              <div className="flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={handlePaste}
                      disabled={isLoading}>
                      <ClipboardIcon className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Paste ({clipboardItems.length} items)</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </>
          )}
        </div>
      </div>
    </TooltipProvider>
  )
}
