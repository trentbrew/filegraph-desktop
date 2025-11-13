'use client';

import * as React from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useTQL } from '@/hooks/useTQL';
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  VisibilityState,
  ColumnSizingState,
} from '@tanstack/react-table';
import {
  ArrowUpDown,
  MoreHorizontal,
  Eye,
  EyeOff,
  TableIcon,
  Grid3x3,
  Columns3,
  ListTree,
  Network,
} from 'lucide-react';
import { getFileIcon } from '@/lib/fileIcons';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import CommandsPallet from './commandsPallet';
import { PreviewPane } from './previewPane';
import { GridItem } from './gridItem';
import { ColumnView } from './columnView';
import { TreeView } from './treeView';
import { toast } from 'sonner';
import TitleBar from './titleBar';

export type FileItem = {
  id: string;
  name: string;
  file_type: 'file' | 'folder'; // Changed from 'type' to match Rust struct
  size: number | null; // in bytes, null for folders
  date_modified: string; // Changed to string to match Rust DateTime serialization
  extension: string | null;
  path: string; // Added path field
};

// Helper function to format file size
export const formatFileSize = (bytes: number | null) => {
  if (bytes === null) return '';

  const sizes = ['B', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 B';

  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
};

export function FileStructure() {
  // TQL Runtime
  const [tqlState, tqlActions] = useTQL();

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [currentPath, setCurrentPath] = React.useState('');
  const [pathInput, setPathInput] = React.useState('');
  const [data, setData] = React.useState<FileItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [navigationHistory, setNavigationHistory] = React.useState<string[]>(
    [],
  );
  const [historyIndex, setHistoryIndex] = React.useState(-1);
  const [showDotfiles, setShowDotfiles] = React.useState(false);
  const [columnSizing, setColumnSizing] = React.useState<ColumnSizingState>({
    name: 300,
    date_modified: 120,
    file_type: 80,
    size: 100,
    actions: 50,
  });
  const [activeItem, setActiveItem] = React.useState<FileItem | null>(null);
  const [previewEnabled, setPreviewEnabled] = React.useState(() => {
    const stored = localStorage.getItem('fileex_preview_enabled');
    return stored !== null ? JSON.parse(stored) : true;
  });
  const [previewWidth, setPreviewWidth] = React.useState(() => {
    const stored = localStorage.getItem('fileex_preview_width');
    return stored ? parseInt(stored, 10) : 400;
  });
  const [searchValue, setSearchValue] = React.useState('');
  const [isResizing, setIsResizing] = React.useState(false);
  const [lastSelectedIndex, setLastSelectedIndex] = React.useState<
    number | null
  >(null);
  const [layoutMode, setLayoutMode] = React.useState<
    'table' | 'grid' | 'columns' | 'tree' | 'canvas'
  >('table');

  // Persist preview preferences
  React.useEffect(() => {
    localStorage.setItem(
      'fileex_preview_enabled',
      JSON.stringify(previewEnabled),
    );
  }, [previewEnabled]);

  React.useEffect(() => {
    localStorage.setItem('fileex_preview_width', previewWidth.toString());
  }, [previewWidth]);

  // Clear search filter when navigating to new directory
  React.useEffect(() => {
    setSearchValue('');
    // Sync path input with actual current path
    setPathInput(currentPath);
  }, [currentPath]);

  // Filesystem watching - start/stop watcher and listen for changes
  React.useEffect(() => {
    let unlisten: (() => void) | undefined;

    const setupWatcher = async () => {
      if (!currentPath) return;

      try {
        // Start watching the current directory
        await invoke('start_watch', { path: currentPath });

        // Listen for filesystem change events
        unlisten = await listen<{ kind: string; paths: string[] }>(
          'fs-change',
          (event) => {
            const payload = event.payload;

            // Log raw event in dev mode for debugging
            if (import.meta.env.DEV) {
              console.log('[FS Event Raw]', JSON.stringify(payload, null, 2));
            }

            // Convert Rust event to TQL FSEvent format
            // Rust emits: { kind: "Create(...)", paths: ["/path/to/file"] }
            const kind = payload.kind.toLowerCase();
            const paths = payload.paths;

            // Parse event kind (Rust uses Debug format like "Create(File)")
            let eventKind:
              | 'create'
              | 'modify'
              | 'remove'
              | 'rename'
              | 'unknown' = 'unknown';
            if (kind.includes('create')) {
              eventKind = 'create';
            } else if (kind.includes('modify') || kind.includes('write')) {
              eventKind = 'modify';
            } else if (kind.includes('remove') || kind.includes('delete')) {
              eventKind = 'remove';
            } else if (kind.includes('rename')) {
              eventKind = 'rename';
            }

            if (import.meta.env.DEV) {
              console.log('[FS Event Parsed]', { eventKind, paths });
            }

            // Push events to TQL runtime
            for (const path of paths) {
              tqlActions.pushFSEvent({
                kind: eventKind,
                path,
                timestamp: Date.now(),
              });
            }

            // Refresh the file list when changes are detected
            if (currentPath) {
              invoke<FileItem[]>('list_directory', { path: currentPath })
                .then((files) => setData(files))
                .catch((error) =>
                  console.error('Failed to refresh after fs change:', error),
                );
            }
          },
        );
      } catch (error) {
        console.error('Failed to setup filesystem watcher:', error);
      }
    };

    setupWatcher();

    // Cleanup: stop watching and unlisten
    return () => {
      if (unlisten) {
        unlisten();
      }
      invoke('stop_watch').catch(console.error);
    };
  }, [currentPath, tqlActions]);

  // Handle resize
  React.useEffect(() => {
    if (!isResizing) return;

    // Disable text selection during resize
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = window.innerWidth - e.clientX;
      const maxWidth = window.innerWidth * 0.9; // 90vw
      const clampedWidth = Math.max(300, Math.min(maxWidth, newWidth));
      setPreviewWidth(clampedWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isResizing]);

  // Load initial directory
  React.useEffect(() => {
    const loadInitialDirectory = async () => {
      try {
        const homeDir = await invoke<string>('get_home_directory');
        setCurrentPath(homeDir);
        const files = await invoke<FileItem[]>('list_directory', {
          path: homeDir,
        });
        setData(files);
        setNavigationHistory([homeDir]);
        setHistoryIndex(0);
      } catch (error) {
        console.error('Failed to load initial directory:', error);
        // Fallback to current directory
        try {
          const currentDir = await invoke<string>('get_current_directory');
          setCurrentPath(currentDir);
          const files = await invoke<FileItem[]>('list_directory', {
            path: currentDir,
          });
          setData(files);
          setNavigationHistory([currentDir]);
          setHistoryIndex(0);
        } catch (fallbackError) {
          console.error('Failed to load current directory:', fallbackError);
        }
      } finally {
        setLoading(false);
      }
    };

    loadInitialDirectory();
  }, []);

  // Navigate to a new path
  const navigateToPath = async (path: string, addToHistory = true) => {
    setLoading(true);
    try {
      const files = await invoke<FileItem[]>('navigate_to_path', { path });
      setData(files);
      setCurrentPath(path);

      if (addToHistory) {
        // Add to navigation history
        const newHistory = navigationHistory.slice(0, historyIndex + 1);
        newHistory.push(path);
        setNavigationHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
      }
    } catch (error) {
      console.error('Failed to navigate to path:', error);
      toast.error(`Failed to navigate to: ${path}`);
    } finally {
      setLoading(false);
    }
  };

  // Navigate back in history
  const navigateBack = async () => {
    if (historyIndex > 0) {
      const previousPath = navigationHistory[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      await navigateToPath(previousPath, false);
    }
  };

  // Navigate to home directory
  const navigateHome = async () => {
    try {
      const homeDir = await invoke<string>('get_home_directory');
      await navigateToPath(homeDir);
    } catch (error) {
      console.error('Failed to navigate to home:', error);
    }
  };

  // Handle double-click on folder or file
  const handleItemDoubleClick = async (item: FileItem) => {
    if (item.file_type === 'folder') {
      navigateToPath(item.path);
    } else {
      // Try to open file with default application
      try {
        const result = await invoke<string>('open_file_with_default_app', {
          filePath: item.path,
        });
        toast.success(result);
      } catch (error) {
        toast.error(`Failed to open file: ${error}`);
      }
    }
  };

  // Get selected item paths
  const getSelectedItemPaths = (): string[] => {
    const selectedRows = table.getFilteredSelectedRowModel().rows;
    return selectedRows.map((row) => row.original.path);
  };

  // Refresh current directory
  const handleRefresh = () => {
    if (currentPath) {
      navigateToPath(currentPath);
    }
  };

  // Handle items deleted (clear selection)
  const handleItemsDeleted = () => {
    setRowSelection({});
  };

  // Define columns inside the component so they have access to functions
  const columns: ColumnDef<FileItem>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && 'indeterminate')
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => {
            row.toggleSelected(!!value);
            setLastSelectedIndex(row.index);
          }}
          onClick={(e) => {
            // Handle shift+click for range selection with checkboxes
            if (e.shiftKey && lastSelectedIndex !== null) {
              e.preventDefault();
              const currentIndex = row.index;
              const start = Math.min(lastSelectedIndex, currentIndex);
              const end = Math.max(lastSelectedIndex, currentIndex);

              // Get current selection and merge with range
              const newSelection: Record<string, boolean> = { ...rowSelection };
              for (let i = start; i <= end; i++) {
                newSelection[i.toString()] = true;
              }
              setRowSelection(newSelection);
              setLastSelectedIndex(currentIndex);
            }
          }}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'name',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Name
            <ArrowUpDown className="opacity-50" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const fileItem = row.original;
        const isDotfile = fileItem.name.startsWith('.');
        return (
          <div className="flex items-center gap-2 min-w-0 max-w-[300px]">
            <div className="shrink-0">
              {getFileIcon(fileItem.file_type, fileItem.extension)}
            </div>
            <span
              className={`truncate font-medium text-sm ${
                isDotfile ? 'opacity-50' : ''
              }`}
            >
              {fileItem.name}
            </span>
          </div>
        );
      },
      size: 300,
      minSize: 150,
      maxSize: 350,
    },
    {
      accessorKey: 'date_modified',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Date Modified
            <ArrowUpDown className="opacity-50" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const dateString = row.getValue('date_modified') as string;
        const date = new Date(dateString);
        return <div>{date.toLocaleDateString()}</div>;
      },
      size: 120,
      minSize: 100,
      maxSize: 150,
    },
    {
      accessorKey: 'file_type',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Type
            <ArrowUpDown className="opacity-50" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const fileItem = row.original;
        if (fileItem.file_type === 'folder') return <div>Folder</div>;
        return <div className="capitalize">{fileItem.extension || 'File'}</div>;
      },
      sortingFn: (rowA, rowB) => {
        const a = rowA.original;
        const b = rowB.original;
        // Sort folders first, then by extension
        if (a.file_type === 'folder' && b.file_type !== 'folder') return -1;
        if (a.file_type !== 'folder' && b.file_type === 'folder') return 1;
        const extA = a.extension || '';
        const extB = b.extension || '';
        return extA.localeCompare(extB);
      },
      size: 80,
      minSize: 60,
      maxSize: 100,
    },
    {
      accessorKey: 'size',
      header: ({ column }) => {
        return (
          <div className="text-right">
            <Button
              variant="ghost"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === 'asc')
              }
            >
              Size
              <ArrowUpDown className="opacity-50" />
            </Button>
          </div>
        );
      },
      cell: ({ row }) => {
        const size = row.getValue('size') as number | null;
        return <div className="text-right">{formatFileSize(size)}</div>;
      },
      sortingFn: (rowA, rowB) => {
        const a = rowA.original.size ?? -1;
        const b = rowB.original.size ?? -1;
        return a - b;
      },
      size: 100,
      minSize: 80,
      maxSize: 120,
    },
    {
      id: 'actions',
      enableHiding: false,
      size: 50,
      minSize: 50,
      maxSize: 50,
      cell: ({ row }) => {
        const fileItem = row.original;

        const handleOpen = async () => {
          if (fileItem.file_type === 'folder') {
            navigateToPath(fileItem.path);
          } else {
            // Open file with default application
            try {
              const result = await invoke<string>(
                'open_file_with_default_app',
                { filePath: fileItem.path },
              );
              toast.success(result);
            } catch (error) {
              toast.error(`Failed to open file: ${error}`);
            }
          }
        };

        const handleRename = async () => {
          const newName = prompt('Enter new name:', fileItem.name);
          if (!newName || newName.trim() === '' || newName === fileItem.name)
            return;

          try {
            await invoke('rename_item', {
              oldPath: fileItem.path,
              newName: newName.trim(),
            });
            handleRefresh();
          } catch (error) {
            toast.error(`Failed to rename: ${error}`);
          }
        };

        const handleDelete = async () => {
          const confirmDelete = confirm(
            `Are you sure you want to delete "${fileItem.name}"?`,
          );
          if (!confirmDelete) return;

          try {
            await invoke('delete_item', { path: fileItem.path });
            handleRefresh();
          } catch (error) {
            toast.error(`Failed to delete: ${error}`);
          }
        };

        const handleCopyPath = () => {
          navigator.clipboard
            .writeText(fileItem.path)
            .then(() => toast.success('Path copied to clipboard'))
            .catch(() => toast.error('Failed to copy path'));
        };

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={handleOpen}>
                {fileItem.file_type === 'folder' ? 'Open Folder' : 'Open File'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleCopyPath}>
                Copy Path
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => navigator.clipboard.writeText(fileItem.name)}
              >
                Copy Name
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleRename}>Rename</DropdownMenuItem>
              <DropdownMenuItem>Properties</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600" onClick={handleDelete}>
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  // Filter data based on dotfiles toggle
  const filteredData = React.useMemo(() => {
    if (showDotfiles) return data;
    return data.filter((item) => !item.name.startsWith('.'));
  }, [data, showDotfiles]);

  const table = useReactTable({
    data: filteredData,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnSizingChange: setColumnSizing,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    columnResizeMode: 'onChange',
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      columnSizing,
    },
  });

  return (
    <div className="w-full h-full flex flex-col pr-3">
      {/* Title Bar with Path Input */}
      <TitleBar
        currentPath={pathInput}
        onPathChange={setPathInput}
        onNavigate={navigateToPath}
        loading={loading}
      />

      {/* Commands Palette */}
      <CommandsPallet
        currentPath={currentPath}
        selectedItems={getSelectedItemPaths()}
        onRefresh={handleRefresh}
        onItemsDeleted={handleItemsDeleted}
      />

      {/* Main Content: Split Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* File Explorer */}
        <div
          className="flex flex-col pl-3 pr-0 pb-3 overflow-hidden"
          style={{
            width:
              previewEnabled && activeItem
                ? `calc(100% - ${previewWidth}px)`
                : '100%',
            transition: 'width 0s linear !important',
          }}
        >
          {/* Toolbar */}
          <div className="flex items-center gap-3 p-3 pl-0 shrink-0">
            {/* Navigation Buttons */}
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={navigateBack}
                disabled={loading || historyIndex <= 0}
                className="h-8 w-8 p-0"
                title="Back"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m15 18-6-6 6-6" />
                </svg>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={navigateHome}
                disabled={loading}
                className="h-8 w-8 p-0"
                title="Home"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              </Button>
            </div>

            {/* Layout Mode Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  {layoutMode === 'table' && <TableIcon className="h-4 w-4" />}
                  {layoutMode === 'grid' && <Grid3x3 className="h-4 w-4" />}
                  {layoutMode === 'columns' && <Columns3 className="h-4 w-4" />}
                  {layoutMode === 'tree' && <ListTree className="h-4 w-4" />}
                  {layoutMode === 'canvas' && <Network className="h-4 w-4" />}
                  <span className="capitalize">{layoutMode}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => setLayoutMode('table')}>
                  <TableIcon className="h-4 w-4 mr-2" />
                  Table
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLayoutMode('grid')}>
                  <Grid3x3 className="h-4 w-4 mr-2" />
                  Grid
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLayoutMode('columns')}>
                  <Columns3 className="h-4 w-4 mr-2" />
                  Columns
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLayoutMode('tree')}>
                  <ListTree className="h-4 w-4 mr-2" />
                  Tree
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLayoutMode('canvas')}>
                  <Network className="h-4 w-4 mr-2" />
                  Canvas
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Search Input - Full Width */}
            <Input
              placeholder="Search..."
              value={searchValue}
              onChange={(event) => {
                setSearchValue(event.target.value);
                table.getColumn('name')?.setFilterValue(event.target.value);
              }}
              className="flex-1"
            />

            {/* Dotfiles Toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDotfiles(!showDotfiles)}
              className="gap-2"
            >
              {showDotfiles ? (
                <Eye className="h-4 w-4" />
              ) : (
                <EyeOff className="h-4 w-4" />
              )}
              Dotfiles
            </Button>

            {/* Preview Toggle */}
            {/* <Button
              variant="outline"
              size="sm"
              onClick={() => setPreviewEnabled(!previewEnabled)}
              className="gap-2"
              title={previewEnabled ? 'Hide preview' : 'Show preview'}
            >
              {previewEnabled ? (
                <Eye className="h-4 w-4" />
              ) : (
                <EyeOff className="h-4 w-4" />
              )}
              Preview
            </Button> */}
          </div>

          {/* Table View */}
          {layoutMode === 'table' && (
            <div className="flex-1 rounded-sm border border-border/50 overflow-hidden bg-card flex flex-col select-none">
              <div className="w-full border-b border-border/50">
                <div className="w-full">
                  <table className="w-full table-fixed caption-bottom text-sm">
                    <colgroup>
                      {table.getVisibleFlatColumns().map((column) => (
                        <col
                          key={column.id}
                          style={{ width: column.getSize() }}
                        />
                      ))}
                    </colgroup>
                    <TableHeader>
                      {table.getHeaderGroups().map((headerGroup) => (
                        <TableRow key={headerGroup.id}>
                          {headerGroup.headers.map((header) => {
                            return (
                              <TableHead key={header.id}>
                                {header.isPlaceholder
                                  ? null
                                  : flexRender(
                                      header.column.columnDef.header,
                                      header.getContext(),
                                    )}
                              </TableHead>
                            );
                          })}
                        </TableRow>
                      ))}
                    </TableHeader>
                  </table>
                </div>
              </div>
              <ScrollArea className="flex-1 w-full h-0">
                <div className="w-full">
                  <table className="w-full table-fixed caption-bottom text-sm">
                    <colgroup>
                      {table.getVisibleFlatColumns().map((column) => (
                        <col
                          key={column.id}
                          style={{ width: column.getSize() }}
                        />
                      ))}
                    </colgroup>
                    <TableBody>
                      {table.getRowModel().rows?.length ? (
                        table.getRowModel().rows.map((row) => {
                          const fileItem = row.original;

                          return (
                            <ContextMenu key={row.id}>
                              <ContextMenuTrigger asChild>
                                <TableRow
                                  data-state={row.getIsSelected() && 'selected'}
                                  onClick={(e) => {
                                    // Don't interfere with checkbox clicks
                                    if (
                                      (e.target as HTMLElement).closest(
                                        '[type="checkbox"]',
                                      )
                                    ) {
                                      return;
                                    }

                                    const currentIndex = row.index;

                                    // Handle shift+click for range selection
                                    if (
                                      e.shiftKey &&
                                      lastSelectedIndex !== null
                                    ) {
                                      const start = Math.min(
                                        lastSelectedIndex,
                                        currentIndex,
                                      );
                                      const end = Math.max(
                                        lastSelectedIndex,
                                        currentIndex,
                                      );

                                      // Merge with existing selection
                                      const rowsToSelect: Record<
                                        string,
                                        boolean
                                      > = { ...rowSelection };
                                      for (let i = start; i <= end; i++) {
                                        rowsToSelect[i.toString()] = true;
                                      }
                                      setRowSelection(rowsToSelect);
                                      setLastSelectedIndex(currentIndex);
                                    } else {
                                      // Normal click - just track index
                                      setLastSelectedIndex(currentIndex);
                                    }

                                    // Set active item for preview (only for files, not folders)
                                    if (
                                      previewEnabled &&
                                      fileItem.file_type !== 'folder'
                                    ) {
                                      setActiveItem(fileItem);
                                    }
                                  }}
                                  onDoubleClick={() =>
                                    handleItemDoubleClick(row.original)
                                  }
                                  className={`cursor-pointer !duration-0 select-none ${
                                    activeItem?.path === fileItem.path
                                      ? 'bg-accent/25'
                                      : ''
                                  }`}
                                >
                                  {row.getVisibleCells().map((cell) => (
                                    <TableCell key={cell.id}>
                                      {flexRender(
                                        cell.column.columnDef.cell,
                                        cell.getContext(),
                                      )}
                                    </TableCell>
                                  ))}
                                </TableRow>
                              </ContextMenuTrigger>
                              <ContextMenuContent className="w-48">
                                <ContextMenuItem
                                  onClick={() => {
                                    if (fileItem.file_type === 'folder') {
                                      navigateToPath(fileItem.path);
                                    } else {
                                      invoke<string>(
                                        'open_file_with_default_app',
                                        {
                                          filePath: fileItem.path,
                                        },
                                      )
                                        .then((result) => toast.success(result))
                                        .catch((error) =>
                                          toast.error(
                                            `Failed to open file: ${error}`,
                                          ),
                                        );
                                    }
                                  }}
                                >
                                  {fileItem.file_type === 'folder'
                                    ? 'Open Folder'
                                    : 'Open File'}
                                </ContextMenuItem>
                                <ContextMenuSeparator />
                                <ContextMenuItem
                                  onClick={() => {
                                    navigator.clipboard
                                      .writeText(fileItem.path)
                                      .then(() =>
                                        toast.success(
                                          'Path copied to clipboard',
                                        ),
                                      )
                                      .catch(() =>
                                        toast.error('Failed to copy path'),
                                      );
                                  }}
                                >
                                  Copy Path
                                </ContextMenuItem>
                                <ContextMenuItem
                                  onClick={() => {
                                    navigator.clipboard
                                      .writeText(fileItem.name)
                                      .then(() =>
                                        toast.success(
                                          'Name copied to clipboard',
                                        ),
                                      )
                                      .catch(() =>
                                        toast.error('Failed to copy name'),
                                      );
                                  }}
                                >
                                  Copy Name
                                </ContextMenuItem>
                                <ContextMenuSeparator />
                                <ContextMenuItem
                                  onClick={() => {
                                    const newName = prompt(
                                      'Enter new name:',
                                      fileItem.name,
                                    );
                                    if (
                                      !newName ||
                                      newName.trim() === '' ||
                                      newName === fileItem.name
                                    )
                                      return;

                                    invoke('rename_item', {
                                      oldPath: fileItem.path,
                                      newName: newName.trim(),
                                    })
                                      .then(() => handleRefresh())
                                      .catch((error) =>
                                        toast.error(
                                          `Failed to rename: ${error}`,
                                        ),
                                      );
                                  }}
                                >
                                  Rename
                                </ContextMenuItem>
                                <ContextMenuItem>Properties</ContextMenuItem>
                                <ContextMenuSeparator />
                                <ContextMenuItem
                                  className="text-red-600 focus:text-red-600"
                                  onClick={() => {
                                    const confirmDelete = confirm(
                                      `Are you sure you want to delete "${fileItem.name}"?`,
                                    );
                                    if (!confirmDelete) return;

                                    invoke('delete_item', {
                                      path: fileItem.path,
                                    })
                                      .then(() => handleRefresh())
                                      .catch((error) =>
                                        toast.error(
                                          `Failed to delete: ${error}`,
                                        ),
                                      );
                                  }}
                                >
                                  Delete
                                </ContextMenuItem>
                              </ContextMenuContent>
                            </ContextMenu>
                          );
                        })
                      ) : (
                        <TableRow>
                          <TableCell
                            colSpan={columns.length}
                            className="h-24 text-center hover:bg-transparent"
                          >
                            {loading ? 'Loading...' : 'No files found.'}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </table>
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Grid View */}
          {layoutMode === 'grid' && (
            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 p-4">
                  {table.getRowModel().rows.map((row) => {
                    const fileItem = row.original;
                    return (
                      <GridItem
                        key={row.id}
                        fileItem={fileItem}
                        isActive={activeItem?.path === fileItem.path}
                        onClick={() => {
                          if (
                            previewEnabled &&
                            fileItem.file_type !== 'folder'
                          ) {
                            setActiveItem(fileItem);
                          }
                        }}
                        onDoubleClick={() => handleItemDoubleClick(fileItem)}
                      />
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Columns View */}
          {layoutMode === 'columns' && (
            <ColumnView
              currentPath={currentPath}
              onNavigate={navigateToPath}
              onFileSelect={setActiveItem}
              activeItem={activeItem}
              showDotfiles={showDotfiles}
            />
          )}

          {/* Tree View */}
          {layoutMode === 'tree' && (
            <TreeView
              currentPath={currentPath}
              onNavigate={navigateToPath}
              onFileSelect={setActiveItem}
              activeItem={activeItem}
              showDotfiles={showDotfiles}
            />
          )}

          {/* Canvas View */}
          {layoutMode === 'canvas' && (
            <div className="flex-1 rounded-sm border border-border/50 bg-card flex flex-col items-center justify-center">
              <div className="text-center text-muted-foreground p-8">
                <ListTree className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm font-medium">Canvas View</p>
                <p className="text-xs mt-2 opacity-70">Coming soon</p>
              </div>
            </div>
          )}
        </div>

        {/* Preview Pane */}
        {previewEnabled && activeItem && (
          <>
            {/* Resize Handle */}

            <div
              onMouseDown={() => setIsResizing(true)}
              className={`w-1 mx-1 shrink-0 cursor-col-resize hover:bg-primary/25 active:bg-muted transition-colors ${
                isResizing ? 'bg-primary' : 'bg-border/0'
              }`}
              style={{ userSelect: 'none' }}
            />

            <div
              style={{ width: `${previewWidth}px` }}
              className="shrink-0 p-3 px-0"
            >
              <PreviewPane
                activeItem={activeItem}
                onClose={() => setActiveItem(null)}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
