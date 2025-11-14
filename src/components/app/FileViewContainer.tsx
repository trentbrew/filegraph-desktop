import { type Table as TanstackTable } from '@tanstack/react-table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TreeView } from './treeView';
import { ColumnView } from './columnView';
import { GridItem } from './gridItem';
import { ListTree } from 'lucide-react';
import type { FileItem } from './fileStructure';
import type { LayoutMode } from './navigation';

interface FileViewContainerProps {
  layoutMode: LayoutMode;
  table: TanstackTable<FileItem>;
  currentPath: string;
  activeItem: FileItem | null;
  previewEnabled: boolean;
  showDotfiles: boolean;
  searchValue: string;
  onNavigate: (path: string) => void;
  onFileSelect: (item: FileItem | null) => void;
  onItemDoubleClick: (item: FileItem) => void;
  renderTableView: () => React.ReactNode;
  className?: string;
}

export function FileViewContainer({
  layoutMode,
  table,
  currentPath,
  activeItem,
  previewEnabled,
  showDotfiles,
  searchValue,
  onNavigate,
  onFileSelect,
  onItemDoubleClick,
  renderTableView,
  className = '',
}: FileViewContainerProps) {
  return (
    <>
      {/* Table View */}
      {layoutMode === 'table' && renderTableView()}

      {/* Grid View */}
      {layoutMode === 'grid' && (
        <div className={`flex-1 overflow-hidden ${className}`}>
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
                      if (previewEnabled && fileItem.file_type !== 'folder') {
                        onFileSelect(fileItem);
                      }
                    }}
                    onDoubleClick={() => onItemDoubleClick(fileItem)}
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
          onNavigate={onNavigate}
          onFileSelect={onFileSelect}
          activeItem={activeItem}
          showDotfiles={showDotfiles}
          searchValue={searchValue}
        />
      )}

      {/* Tree View */}
      {layoutMode === 'tree' && (
        <TreeView
          currentPath={currentPath}
          onNavigate={onNavigate}
          onFileSelect={onFileSelect}
          activeItem={activeItem}
          showDotfiles={showDotfiles}
          searchValue={searchValue}
        />
      )}

      {/* Canvas View */}
      {layoutMode === 'canvas' && (
        <div className={`flex-1 rounded-sm border border-border/50 bg-card flex flex-col items-center justify-center ${className}`}>
          <div className="text-center text-muted-foreground p-8">
            <ListTree className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm font-medium">Canvas View</p>
            <p className="text-xs mt-2 opacity-70">Coming soon...</p>
          </div>
        </div>
      )}
    </>
  );
}
