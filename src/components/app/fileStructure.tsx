'use client';

import * as React from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useTQL } from '@/hooks/useTQL';
import { useVault } from '@/contexts/VaultContext';
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
import { ArrowUpDown, MoreHorizontal } from 'lucide-react';
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
import { PreviewPane } from './previewPane';
import { toast } from 'sonner';
import TitleBar from './titleBar';
import { NavigationBar } from './navigation';
import { Toolbar } from './Toolbar';
import { FileViewContainer } from './FileViewContainer';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import { useTabStore, useUIStore, useFileStore } from '@/stores';

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
  // Component lifecycle tracking
  const renderCount = React.useRef(0);
  renderCount.current += 1;
  console.log(`[FileStructure] RENDER #${renderCount.current}`);
  
  React.useEffect(() => {
    console.log('[FileStructure] MOUNTED');
    return () => console.log('[FileStructure] UNMOUNTED');
  }, []);
  
  // Track if tab initialization is in progress (prevents race condition with Strict Mode)
  const tabInitInProgress = React.useRef(false);
  
  // TQL Runtime
  const [, tqlActions] = useTQL();
  const { vaultPath } = useVault();

  // Zustand Stores
  const {
    tabs,
    activeTabId,
    addTab,
    removeTab,
    setActiveTab,
    navigateInTab,
    navigateBack: navigateBackInTab,
    canNavigateBack,
  } = useTabStore();
  const activeTab = React.useMemo(() => tabs.find(t => t.id === activeTabId), [tabs, activeTabId]);
  
  // Log store state changes
  React.useEffect(() => {
    console.log('[FileStructure] Store state changed:', {
      tabsLength: tabs.length,
      activeTabId,
      hasActiveTab: !!activeTab,
    });
  }, [tabs.length, activeTabId, !!activeTab]);
  
  // Check if addTab is stable
  React.useEffect(() => {
    console.log('[FileStructure] addTab stability:', typeof addTab);
  }, [addTab]);

  const {
    layoutMode,
    previewEnabled,
    showDotfiles,
    searchValue,
    setLayoutMode,
    setSearchValue,
    clearSearch,
  } = useUIStore();

  const {
    currentPath,
    pathInput,
    data,
    loading,
    activeItem,
    lastSelectedIndex,
    setCurrentPath,
    setPathInput,
    setData,
    setLoading,
    setActiveItem,
    setLastSelectedIndex,
  } = useFileStore();

  // Table state (not in store - component-specific)
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [columnSizing, setColumnSizing] = React.useState<ColumnSizingState>({
    name: 300,
    date_modified: 120,
    file_type: 80,
    size: 100,
    actions: 50,
  });

  // Clear search filter when navigating to new directory
  React.useEffect(() => {
    clearSearch();
    // Sync path input with actual current path
    setPathInput(currentPath);
  }, [currentPath, clearSearch, setPathInput]);

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
  }, [currentPath]);

  // Initialize with first tab
  React.useEffect(() => {
    console.log('[FileStructure] Tab initialization effect:', {
      tabsLength: tabs.length,
      shouldAddTab: tabs.length === 0,
      inProgress: tabInitInProgress.current,
      vaultPath,
      tabsArray: tabs,
    });
    
    if (tabs.length === 0 && !tabInitInProgress.current) {
      console.log('[FileStructure] Calling addTab...');
      tabInitInProgress.current = true;
      
      addTab(vaultPath || undefined).finally(() => {
        console.log('[FileStructure] addTab completed, resetting flag');
        tabInitInProgress.current = false;
      });
      
      console.log('[FileStructure] addTab called');
    } else if (tabInitInProgress.current) {
      console.log('[FileStructure] Skipping addTab - already in progress');
    } else {
      console.log('[FileStructure] Skipping addTab - tabs already exist');
    }
  }, [tabs.length]); // Only depend on tabs.length, not on addTab or vaultPath

  // Load files when active tab changes
  React.useEffect(() => {
    if (!activeTab) return;

    const loadTabFiles = async () => {
      setLoading(true);
      try {
        const files = await invoke<FileItem[]>('list_directory', {
          path: activeTab.path,
        });
        setData(files);
        setCurrentPath(activeTab.path);
        setPathInput(activeTab.path);
      } catch (error) {
        console.error('Failed to load directory:', error);
        toast.error(`Failed to load directory: ${error}`);
      } finally {
        setLoading(false);
      }
    };

    loadTabFiles();
  }, [activeTab?.path]);

  // Navigate to a new path
  const navigateToPath = async (path: string) => {
    if (!activeTabId) return;
    
    setLoading(true);
    try {
      const files = await invoke<FileItem[]>('navigate_to_path', { path });
      setData(files);
      setCurrentPath(path);
      setPathInput(path);
      navigateInTab(activeTabId, path);
    } catch (error) {
      console.error('Failed to navigate to path:', error);
      toast.error(`Failed to navigate to: ${path}`);
    } finally {
      setLoading(false);
    }
  };

  // Navigate back in history
  const navigateBack = async () => {
    if (!activeTabId || !activeTab) return;
    
    navigateBackInTab(activeTabId);
    const previousPath = activeTab.navigationHistory[activeTab.historyIndex - 1];
    
    setLoading(true);
    try {
      const files = await invoke<FileItem[]>('navigate_to_path', { path: previousPath });
      setData(files);
      setCurrentPath(previousPath);
      setPathInput(previousPath);
    } catch (error) {
      console.error('Failed to navigate back:', error);
      toast.error(`Failed to navigate back`);
    } finally {
      setLoading(false);
    }
  };

  // Navigate to vault root (or home if no vault)
  const navigateHome = async () => {
    try {
      // Use vault path if available, otherwise user's home directory
      const homePath =
        vaultPath || '/Users/trentbrew/.filegraph' || (await invoke<string>('get_home_directory'));
      await navigateToPath(homePath);
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

  // Get selected item paths from table
  const getTableSelectedPaths = (): string[] => {
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

  // Render table view with context menus
  const renderTableView = () => (
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
                            if ((e.target as HTMLElement).closest('[type="checkbox"]')) {
                              return;
                            }
                            
                            if (previewEnabled && fileItem.file_type !== 'folder') {
                              setActiveItem(fileItem);
                            }
                            
                            row.toggleSelected();
                            setLastSelectedIndex(row.index);
                          }}
                          onDoubleClick={() => handleItemDoubleClick(fileItem)}
                          className="cursor-pointer"
                        >
                          {row.getVisibleCells().map((cell) => (
                            <TableCell
                              key={cell.id}
                              className="hover:bg-transparent"
                            >
                              {flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext(),
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      </ContextMenuTrigger>
                      <ContextMenuContent>
                        <ContextMenuItem
                          onClick={() => handleItemDoubleClick(fileItem)}
                        >
                          {fileItem.file_type === 'folder' ? 'Open' : 'Open'}
                        </ContextMenuItem>
                        <ContextMenuSeparator />
                        <ContextMenuItem
                          onClick={() =>
                            invoke('reveal_in_finder', { path: fileItem.path })
                              .then(() =>
                                toast.success('Revealed in Finder'),
                              )
                              .catch((error) =>
                                toast.error(`Failed to reveal: ${error}`),
                              )
                          }
                        >
                          Reveal in Finder
                        </ContextMenuItem>
                        <ContextMenuItem
                          onClick={() => {
                            navigator.clipboard
                              .writeText(fileItem.path)
                              .then(() => toast.success('Path copied'))
                              .catch(() => toast.error('Failed to copy path'));
                          }}
                        >
                          Copy Path
                        </ContextMenuItem>
                        <ContextMenuSeparator />
                        <ContextMenuItem
                          onClick={() => {
                            invoke('delete_items', {
                              paths: [fileItem.path],
                            })
                              .then(() => {
                                toast.success('Deleted successfully');
                                handleRefresh();
                              })
                              .catch((error) =>
                                toast.error(`Failed to delete: ${error}`),
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
  );

  return (
    <div className="w-full h-full flex flex-col">
      {/* Title Bar with Tabs */}
      <TitleBar
        tabs={tabs}
        activeTabId={activeTabId}
        onTabSelect={setActiveTab}
        onTabClose={removeTab}
        onNewTab={() => addTab()}
      />

      {/* Navigation Bar */}
      <NavigationBar
        currentPath={pathInput}
        onPathChange={setPathInput}
        onNavigate={navigateToPath}
        onNavigateBack={navigateBack}
        onNavigateHome={navigateHome}
        canNavigateBack={canNavigateBack(activeTabId)}
        loading={loading}
        selectedItems={getTableSelectedPaths()}
        onRefresh={handleRefresh}
        onItemsDeleted={handleItemsDeleted}
      />

      {/* Main Content: Resizable Split Layout */}
      <ResizablePanelGroup
        direction="horizontal"
        className="flex-1 pr-3"
      >
        {/* File Explorer Panel */}
        <ResizablePanel
          defaultSize={previewEnabled && activeItem ? 60 : 100}
          minSize={30}
          className="flex flex-col pl-3 pr-0 pb-3 overflow-hidden"
        >
          {/* Toolbar */}
          <Toolbar
            layoutMode={layoutMode}
            onLayoutModeChange={setLayoutMode}
            searchValue={searchValue}
            onSearchChange={(value) => {
              setSearchValue(value);
              table.getColumn('name')?.setFilterValue(value);
            }}
          />

          {/* File Views */}
          <FileViewContainer
            layoutMode={layoutMode}
            table={table}
            currentPath={currentPath}
            activeItem={activeItem}
            previewEnabled={previewEnabled}
            showDotfiles={showDotfiles}
            searchValue={searchValue}
            onNavigate={navigateToPath}
            onFileSelect={setActiveItem}
            onItemDoubleClick={handleItemDoubleClick}
            renderTableView={renderTableView}
          />
        </ResizablePanel>

        {/* Preview Panel */}
        {previewEnabled && activeItem && (
          <>
            <ResizableHandle className="mx-1" />
            <ResizablePanel defaultSize={40} minSize={20} maxSize={70}>
              <PreviewPane activeItem={activeItem} />
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
    </div>
  );
}
