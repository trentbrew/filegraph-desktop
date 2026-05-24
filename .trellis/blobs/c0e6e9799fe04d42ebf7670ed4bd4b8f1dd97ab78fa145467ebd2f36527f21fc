import * as React from 'react'
import { type NodeProps } from 'reactflow'
import { invoke } from '@tauri-apps/api/core'
import { Folder, FolderOpen, ChevronRight, ChevronDown, RefreshCw, Loader2 } from 'lucide-react'

import { cn } from '@/lib/utils'
import type { FileItem } from '@/components/app/fileStructure'
import { ScrollArea } from '@/components/ui/scroll-area'
import { getFileIcon } from '@/lib/fileIcons'

import { useUIStore } from '@/stores/useUIStore'

import { CanvasNodeWrapper, MaximizedHeader } from './CanvasNodeWrapper'

export interface FolderNodeData {
  folderPath: string
  label?: string
  isMaximized?: boolean
  deleting?: boolean
}

interface TreeNode extends FileItem {
  children?: TreeNode[]
  isExpanded?: boolean
  isLoading?: boolean
  level: number
}

function sortFolderFirst(a: FileItem, b: FileItem) {
  if (a.file_type === 'folder' && b.file_type !== 'folder') return -1
  if (a.file_type !== 'folder' && b.file_type === 'folder') return 1
  return a.name.localeCompare(b.name)
}

export function FolderNode({ id, data, selected, groupColor }: NodeProps<FolderNodeData> & { groupColor?: string }) {
  const folderPath = data?.folderPath
  const isMaximized = data?.isMaximized || false

  const [isEditing, setIsEditing] = React.useState(false)
  const showDotfiles = useUIStore((s) => s.showDotfiles)

  const [treeData, setTreeData] = React.useState<TreeNode[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const label = data?.label || (folderPath ? folderPath.split(/[/\\]/).pop() || 'Folder' : 'Folder')

  const loadDirectory = React.useCallback(
    async (path: string, level: number): Promise<TreeNode[]> => {
      const items = await invoke<FileItem[]>('list_directory', { path })
      const filtered = showDotfiles ? items : items.filter((f) => !f.name.startsWith('.'))
      filtered.sort(sortFolderFirst)
      return filtered.map((item) => ({
        ...item,
        children: item.file_type === 'folder' ? [] : undefined,
        isExpanded: false,
        isLoading: false,
        level,
      }))
    },
    [showDotfiles],
  )

  const refresh = React.useCallback(async () => {
    if (!folderPath) return
    setIsLoading(true)
    setError(null)
    try {
      const nodes = await loadDirectory(folderPath, 0)
      setTreeData(nodes)
    } catch (err) {
      console.error('[FolderNode] Failed to list directory:', err)
      setError('Failed to load folder')
    } finally {
      setIsLoading(false)
    }
  }, [folderPath, loadDirectory])

  React.useEffect(() => {
    void refresh()
  }, [refresh])

  React.useEffect(() => {
    if (!selected) setIsEditing(false)
  }, [selected])

  const toggleFolder = React.useCallback(
    async (path: number[]) => {
      const newTreeData = [...treeData]
      let current: TreeNode[] = newTreeData
      let target: TreeNode = newTreeData[path[0]]

      for (let i = 0; i < path.length; i++) {
        if (i === path.length - 1) {
          target = current[path[i]]
        } else {
          target = current[path[i]]
          current = target.children || []
        }
      }

      if (!target.isExpanded && target.file_type === 'folder') {
        target.isLoading = true
        setTreeData([...newTreeData])

        try {
          target.children = await loadDirectory(target.path, target.level + 1)
          target.isExpanded = true
          target.isLoading = false
        } catch {
          target.isLoading = false
        }
      } else {
        target.isExpanded = false
      }

      setTreeData([...newTreeData])
    },
    [treeData, loadDirectory],
  )

  const canInteract = isMaximized || isEditing

  const renderNode = (node: TreeNode, path: number[]): React.ReactNode => {
    const indent = node.level * 16
    const isFolder = node.file_type === 'folder'

    return (
      <div key={node.path}>
        <div
          draggable
          onDragStart={(e) => {
            e.stopPropagation()
            try {
              e.dataTransfer.setData(
                'application/x-filegraph-file',
                JSON.stringify({ path: node.path, name: node.name, file_type: node.file_type }),
              )
              e.dataTransfer.setData(
                'application/x-filegraph-files',
                JSON.stringify({ items: [{ path: node.path, name: node.name, file_type: node.file_type }] }),
              )
              e.dataTransfer.setData('text/plain', node.path)
            } catch {
              // ignore
            }
            e.dataTransfer.effectAllowed = 'copy'
          }}
          className={cn(
            'group flex items-center gap-1 px-2 py-1 cursor-grab rounded-md transition-colors',
            'hover:bg-accent/50 active:cursor-grabbing',
          )}
          style={{ paddingLeft: `${8 + indent}px` }}
          onClick={(e) => {
            e.stopPropagation()
            if (isFolder) {
              toggleFolder(path)
            }
          }}>
          {isFolder && (
            <div className="shrink-0 w-4 h-4 flex items-center justify-center">
              {node.isLoading ? (
                <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
              ) : node.isExpanded ? (
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-3 w-3 text-muted-foreground" />
              )}
            </div>
          )}
          {!isFolder && <div className="w-4" />}

          <div className="shrink-0">
            {isFolder ? (
              node.isExpanded ? (
                <FolderOpen className="h-4 w-4 text-blue-500" />
              ) : (
                <Folder className="h-4 w-4 text-blue-500" />
              )
            ) : (
              getFileIcon(node.file_type, node.extension)
            )}
          </div>

          <span className="text-xs truncate flex-1" title={node.name}>
            {node.name}
          </span>
        </div>

        {node.isExpanded && node.children && (
          <div>{node.children.map((child, index) => renderNode(child, [...path, index]))}</div>
        )}
      </div>
    )
  }

  const toolbarRightExtra = (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        void refresh()
      }}
      className="rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
      title="Refresh">
      <RefreshCw className={cn('h-3 w-3', isLoading && 'animate-spin')} />
    </button>
  )

  const body = (
    <div className={cn('flex-1 min-h-0 p-3 flex flex-col', canInteract ? 'nodrag nowheel' : 'pointer-events-none')}>
      <div className="flex items-center gap-2 mb-2">
        <div className="text-[10px] text-muted-foreground truncate flex-1" title={folderPath}>
          {folderPath}
        </div>
      </div>

      {error && <div className="text-xs text-destructive mb-2">{error}</div>}

      <ScrollArea className="flex-1 min-h-0">
        <div className="flex flex-col">
          {isLoading && treeData.length === 0 && (
            <div className="text-xs text-muted-foreground px-2 py-6 text-center">Loading…</div>
          )}

          {!isLoading && treeData.length === 0 && (
            <div className="text-xs text-muted-foreground px-2 py-6 text-center">Empty folder</div>
          )}

          {treeData.map((node, index) => renderNode(node, [index]))}
        </div>
      </ScrollArea>

      <div className="text-[10px] text-muted-foreground pt-2 border-t mt-2">
        Drag items onto the canvas to create nodes
      </div>
    </div>
  )

  if (isMaximized) {
    return (
      <div className="canvas-node canvas-node-maximized h-full w-full flex flex-col bg-card border border-border rounded-lg shadow-md">
        <MaximizedHeader
          icon={<Folder className="h-4 w-4 text-muted-foreground" />}
          label={label}
          onExit={() => window.dispatchEvent(new CustomEvent('canvas-node-maximize', { detail: { id } }))}
        />
        {body}
      </div>
    )
  }

  return (
    <CanvasNodeWrapper
      id={id}
      selected={selected}
      isEditing={isEditing}
      onEditingChange={setIsEditing}
      isMaximized={isMaximized}
      groupColor={groupColor}
      icon={<Folder className="h-3.5 w-3.5 text-muted-foreground" />}
      label={label}
      minWidth={320}
      minHeight={240}
      resizable
      toolbarRightExtra={toolbarRightExtra}
      showHandles>
      {body}
    </CanvasNodeWrapper>
  )
}
