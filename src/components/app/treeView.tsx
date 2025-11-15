import * as React from 'react';
import { invoke } from '@tauri-apps/api/core';
import { type Table as TanstackTable } from '@tanstack/react-table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { FileContextMenu } from './FileContextMenu';
import {
  ChevronRight,
  ChevronDown,
  FolderOpen,
  Loader2,
} from 'lucide-react';
import { FileItem } from './fileStructure';
import { getFileIcon } from '@/lib/fileIcons';
import { FaFolder } from 'react-icons/fa';

interface TreeViewProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  onFileSelect: (file: FileItem) => void;
  activeItem: FileItem | null;
  showDotfiles: boolean;
  searchValue?: string;
  table: TanstackTable<FileItem>;
  onCopyItem: (item: FileItem) => void;
  onCutItem: (item: FileItem) => void;
  onDeleteItem: (item: FileItem) => void;
}

interface TreeNode extends FileItem {
  children?: TreeNode[];
  isExpanded?: boolean;
  isLoading?: boolean;
  level: number;
}

export function TreeView({
  currentPath,
  onNavigate,
  onFileSelect,
  activeItem,
  showDotfiles,
  searchValue = '',
  table,
  onCopyItem,
  onCutItem,
  onDeleteItem,
}: TreeViewProps) {
  const [treeData, setTreeData] = React.useState<TreeNode[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Load initial directory
  React.useEffect(() => {
    const loadInitialTree = async () => {
      setLoading(true);
      try {
        const items = await invoke<FileItem[]>('list_directory', {
          path: currentPath,
        });

        let filteredItems = showDotfiles
          ? items
          : items.filter((item) => !item.name.startsWith('.'));

        // Apply search filter
        if (searchValue) {
          filteredItems = filteredItems.filter((item) =>
            item.name.toLowerCase().includes(searchValue.toLowerCase()),
          );
        }

        // Sort: folders first, then files
        filteredItems.sort((a, b) => {
          if (a.file_type === 'folder' && b.file_type !== 'folder') return -1;
          if (a.file_type !== 'folder' && b.file_type === 'folder') return 1;
          return a.name.localeCompare(b.name);
        });

        const nodes: TreeNode[] = filteredItems.map((item) => ({
          ...item,
          children: item.file_type === 'folder' ? [] : undefined,
          isExpanded: false,
          isLoading: false,
          level: 0,
        }));

        setTreeData(nodes);
      } catch (error) {
        console.error('Failed to load tree:', error);
      } finally {
        setLoading(false);
      }
    };

    if (currentPath) {
      loadInitialTree();
    }
  }, [currentPath, showDotfiles, searchValue]);

  const toggleFolder = async (path: number[]) => {
    const newTreeData = [...treeData];
    let current: TreeNode[] = newTreeData;
    let target: TreeNode = newTreeData[path[0]];

    // Navigate to the node
    for (let i = 0; i < path.length; i++) {
      if (i === path.length - 1) {
        target = current[path[i]];
      } else {
        target = current[path[i]];
        current = target.children || [];
      }
    }

    if (!target.isExpanded && target.file_type === 'folder') {
      // Expand: load children
      target.isLoading = true;
      setTreeData([...newTreeData]);

      try {
        const items = await invoke<FileItem[]>('list_directory', {
          path: target.path,
        });

        let filteredItems = showDotfiles
          ? items
          : items.filter((item) => !item.name.startsWith('.'));

        // Apply search filter
        if (searchValue) {
          filteredItems = filteredItems.filter((item) =>
            item.name.toLowerCase().includes(searchValue.toLowerCase()),
          );
        }

        // Sort: folders first, then files
        filteredItems.sort((a, b) => {
          if (a.file_type === 'folder' && b.file_type !== 'folder') return -1;
          if (a.file_type !== 'folder' && b.file_type === 'folder') return 1;
          return a.name.localeCompare(b.name);
        });

        target.children = filteredItems.map((item) => ({
          ...item,
          children: item.file_type === 'folder' ? [] : undefined,
          isExpanded: false,
          isLoading: false,
          level: target.level + 1,
        }));
        target.isExpanded = true;
        target.isLoading = false;
      } catch (error) {
        console.error('Failed to load folder:', error);
        target.isLoading = false;
      }
    } else {
      // Collapse
      target.isExpanded = false;
    }

    setTreeData([...newTreeData]);
  };

  const handleItemClick = (node: TreeNode, path: number[]) => {
    if (node.file_type === 'folder') {
      toggleFolder(path);
    } else {
      onFileSelect(node);
    }
  };

  const handleItemDoubleClick = (node: TreeNode) => {
    if (node.file_type === 'folder') {
      onNavigate(node.path);
    }
  };

  // Helper to find row for a given file path
  const getRowByPath = (filePath: string) => {
    return table.getRowModel().rows.find((row) => row.original.path === filePath);
  };

  const handleSelectionChange = (node: TreeNode, checked: boolean) => {
    const row = getRowByPath(node.path);
    if (row) {
      row.toggleSelected(checked);
    }
  };

  const renderNode = (node: TreeNode, path: number[]): React.ReactNode => {
    const isActive = activeItem?.path === node.path;
    const isDotfile = node.name.startsWith('.');
    const indent = node.level * 16;
    const row = getRowByPath(node.path);
    const isSelected = row?.getIsSelected() ?? false;

    return (
      <div key={node.path}>
        <FileContextMenu
          fileItem={node}
          isSelected={isSelected}
          onOpen={() => handleItemDoubleClick(node)}
          onCopy={() => onCopyItem(node)}
          onCut={() => onCutItem(node)}
          onDelete={() => onDeleteItem(node)}
        >
        <div
          className={`
            group flex items-center gap-1 px-2 py-1 cursor-pointer
            transition-colors hover:bg-accent/50
            ${isSelected ? 'bg-primary/10' : isActive ? 'bg-accent' : ''}
            ${isDotfile ? 'opacity-50' : ''}
          `}
          style={{ paddingLeft: `${8 + indent}px` }}
        >
          {/* Selection Checkbox */}
          <div
            className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              handleSelectionChange(node, !isSelected);
            }}
          >
            <Checkbox
              checked={isSelected}
              onCheckedChange={(checked) => handleSelectionChange(node, !!checked)}
              aria-label="Select item"
              className="h-3 w-3"
            />
          </div>

          <div
            onClick={() => handleItemClick(node, path)}
            onDoubleClick={() => handleItemDoubleClick(node)}
            className="flex items-center gap-1 flex-1 min-w-0"
          >
            {node.file_type === 'folder' && (
              <div className="shrink-0 w-4 h-4 flex items-center justify-center">
                {node.isLoading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : node.isExpanded ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
              </div>
            )}
            {node.file_type !== 'folder' && <div className="w-4" />}
            
            <div className="shrink-0">
              {node.file_type === 'folder' ? (
                node.isExpanded ? (
                  <FolderOpen className="h-4 w-4 text-blue-500" />
                ) : (
                  <FaFolder className="h-4 w-4 text-blue-500" />
                )
              ) : (
                getFileIcon(node.file_type, node.extension)
              )}
            </div>
            
            <span className="text-xs truncate">{node.name}</span>
          </div>
        </div>
        </FileContextMenu>
        
        {node.isExpanded && node.children && (
          <div>
            {node.children.map((child, index) =>
              renderNode(child, [...path, index]),
            )}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 rounded-sm border border-border/50 bg-card overflow-hidden">
      <ScrollArea className="h-full">
        <div className="p-1">
          {treeData.map((node, index) => renderNode(node, [index]))}
          {treeData.length === 0 && (
            <div className="text-center text-muted-foreground p-8">
              <p className="text-sm">No files found</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
