import * as React from 'react';
import { invoke } from '@tauri-apps/api/core';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronRight } from 'lucide-react';
import { FileItem } from './fileStructure';
import { getFileIcon } from '@/lib/fileIcons';

interface ColumnViewProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  onFileSelect: (file: FileItem) => void;
  activeItem: FileItem | null;
  showDotfiles: boolean;
  searchValue?: string;
}

interface Column {
  path: string;
  items: FileItem[];
  selectedItem: FileItem | null;
}

export function ColumnView({
  currentPath,
  onNavigate,
  onFileSelect,
  activeItem,
  showDotfiles,
  searchValue = '',
}: ColumnViewProps) {
  const [columns, setColumns] = React.useState<Column[]>([]);
  const [loading, setLoading] = React.useState(false);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const [columnWidths, setColumnWidths] = React.useState<number[]>([]);
  const [resizingIndex, setResizingIndex] = React.useState<number | null>(null);

  // Build column hierarchy from current path
  React.useEffect(() => {
    const buildColumns = async () => {
      setLoading(true);
      try {
        const pathParts = currentPath.split('/').filter(Boolean);
        const newColumns: Column[] = [];

        // Root column
        let currentLevelPath = '/';
        for (let i = 0; i <= pathParts.length; i++) {
          const items = await invoke<FileItem[]>('list_directory', {
            path: currentLevelPath,
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

          const selectedName = i < pathParts.length ? pathParts[i] : null;
          const selectedItem = selectedName
            ? filteredItems.find((item) => item.name === selectedName) || null
            : null;

          newColumns.push({
            path: currentLevelPath,
            items: filteredItems,
            selectedItem,
          });

          if (i < pathParts.length) {
            currentLevelPath =
              currentLevelPath === '/'
                ? `/${pathParts[i]}`
                : `${currentLevelPath}/${pathParts[i]}`;
          }
        }

        setColumns(newColumns);
        // Initialize widths for new columns, preserve existing where possible
        setColumnWidths((prev) =>
          newColumns.map((_, i) =>
            typeof prev[i] === 'number' ? prev[i] : 256,
          ),
        );
      } catch (error) {
        console.error('Failed to build columns:', error);
      } finally {
        setLoading(false);
      }
    };

    if (currentPath) {
      buildColumns();
    }
  }, [currentPath, showDotfiles, searchValue]);

  // Auto-scroll to the right when columns change
  React.useEffect(() => {
    if (scrollContainerRef.current && columns.length > 0) {
      scrollContainerRef.current.scrollTo({
        left: scrollContainerRef.current.scrollWidth,
        behavior: 'smooth',
      });
    }
  }, [columns]);

  const startResize = (index: number, e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = columnWidths[index] ?? 256;
    setResizingIndex(index);

    const onMove = (ev: MouseEvent) => {
      const delta = ev.clientX - startX;
      const next = Math.max(180, Math.min(600, startWidth + delta));
      setColumnWidths((prev) => {
        const arr = [...prev];
        arr[index] = next;
        return arr;
      });
    };

    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      setResizingIndex(null);
      // Avoid text selection issues after resize
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };

    // Improve UX during resize
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const handleItemClick = (item: FileItem) => {
    if (item.file_type === 'folder') {
      // Navigate to the folder
      onNavigate(item.path);
    } else {
      // Select the file for preview
      onFileSelect(item);
    }
  };

  const handleItemDoubleClick = (item: FileItem) => {
    if (item.file_type === 'folder') {
      onNavigate(item.path);
    }
  };

  if (loading && columns.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <p className="text-sm">Loading...</p>
      </div>
    );
  }

  return (
    <div
      ref={scrollContainerRef}
      className="flex-1 flex overflow-x-auto overflow-y-hidden rounded-sm border border-border/50 bg-card"
    >
      {columns.map((column, columnIndex) => (
        <React.Fragment key={columnIndex}>
          <div
            className="shrink-0 border-r border-border/50 flex flex-col min-w-[180px]"
            style={{ width: `${columnWidths[columnIndex] ?? 256}px` }}
          >
            {/* Column Header */}
            <div className="shrink-0 border-b border-border/50 px-3 py-2 bg-muted/30">
              <p className="text-xs font-medium truncate" title={column.path}>
                {column.path === '/' ? 'Root' : column.path.split('/').pop()}
              </p>
            </div>

            {/* Column Items */}
            <ScrollArea className="flex-1 h-0 max-w-full ">
              <div className="p-1">
                {column.items.map((item, itemIndex) => {
                  const isSelected = column.selectedItem?.path === item.path;
                  const isActive = activeItem?.path === item.path;
                  const isDotfile = item.name.startsWith('.');

                  return (
                    <div
                      key={itemIndex}
                      onClick={() => handleItemClick(item)}
                      onDoubleClick={() => handleItemDoubleClick(item)}
                      className={`
                      flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer min-w-0
                      transition-colors group
                      ${
                        isActive
                          ? 'bg-primary/10'
                          : isSelected
                            ? 'bg-accent'
                            : 'hover:bg-accent/50'
                      }
                      ${isDotfile ? 'opacity-50' : ''}
                    `}
                    >
                      <div className="shrink-0">
                        {getFileIcon(item.file_type, item.extension)}
                      </div>
                      <span
                        className="text-xs truncate flex-1 break-all whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px]"
                        title={item.name}
                      >
                        {item.name}
                      </span>
                      {item.file_type === 'folder' && (
                        <ChevronRight
                          className={`h-3 w-3 shrink-0 ${
                            isSelected
                              ? 'opacity-100'
                              : 'opacity-0 group-hover:opacity-50'
                          }`}
                        />
                      )}
                    </div>
                  );
                })}
                {column.items.length === 0 && (
                  <div className="text-center text-muted-foreground p-4">
                    <p className="text-xs">Empty folder</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Resize handle - not shown after last column */}
          {columnIndex < columns.length - 1 && (
            <div
              onMouseDown={(e) => startResize(columnIndex, e)}
              className={`w-[3px] cursor-col-resize hover:bg-primary/40 active:bg-primary/60 ${
                resizingIndex === columnIndex
                  ? 'bg-primary/60'
                  : 'bg-transparent'
              }`}
              style={{ userSelect: 'none' }}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
