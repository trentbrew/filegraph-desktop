import * as React from 'react';
import { FileItem } from './fileStructure';
import { convertFileSrc } from '@tauri-apps/api/core';
import { getFileIcon } from '@/lib/fileIcons';
import { FaFolder } from 'react-icons/fa';
import { Checkbox } from '@/components/ui/checkbox';
import { FileContextMenu } from './FileContextMenu';

interface GridItemProps {
  fileItem: FileItem;
  isActive: boolean;
  isSelected: boolean;
  onClick: (e: React.MouseEvent) => void;
  onDoubleClick: () => void;
  onSelectionChange: (checked: boolean) => void;
  onCopy?: () => void;
  onCut?: () => void;
  onDelete?: () => void;
}

export function GridItem({
  fileItem,
  isActive,
  isSelected,
  onClick,
  onDoubleClick,
  onSelectionChange,
  onCopy = () => {},
  onCut = () => {},
  onDelete = () => {},
}: GridItemProps) {
  const [thumbnailError, setThumbnailError] = React.useState(false);
  const isDotfile = fileItem.name.startsWith('.');

  const renderThumbnail = () => {
    if (fileItem.file_type === 'folder') {
      return (
        <div className="w-full aspect-square flex items-center justify-center bg-blue-500/10 rounded-md">
          <FaFolder className="h-16 w-16 text-blue-500" />
        </div>
      );
    }

    const extension = fileItem.extension?.toLowerCase();

    // Show thumbnail for images
    if (
      extension &&
      ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(
        extension,
      ) &&
      !thumbnailError
    ) {
      const imageUrl = convertFileSrc(fileItem.path);
      return (
        <div className="w-full aspect-square relative overflow-hidden rounded-md bg-muted">
          <img
            src={imageUrl}
            alt={fileItem.name}
            className="w-full h-full object-cover"
            onError={() => setThumbnailError(true)}
          />
        </div>
      );
    }

    // Show icon for other file types
    return (
      <div className="w-full aspect-square flex items-center justify-center bg-muted/50 rounded-md">
        {getFileIcon(fileItem.file_type, fileItem.extension, 'lg')}
      </div>
    );
  };

  return (
    <FileContextMenu
      fileItem={fileItem}
      isSelected={isSelected}
      onCopy={onCopy}
      onCut={onCut}
      onDelete={onDelete}
      onOpen={onDoubleClick}
    >
      <div
        className={`relative flex flex-col gap-2 p-3 rounded-lg border transition-colors ${
          isSelected
            ? 'bg-primary/10 border-primary ring-2 ring-primary/20'
            : isActive
              ? 'bg-accent border-primary'
              : 'border-border bg-accent/25 hover:bg-accent/50'
        } ${isDotfile ? 'opacity-50' : ''} cursor-pointer group`}
      >
        {/* Selection Checkbox */}
        <div
          className="absolute top-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            onSelectionChange(!isSelected);
          }}
        >
          <div className="bg-background/95 rounded p-0.5 shadow-sm border border-border">
            <Checkbox
              checked={isSelected}
              onCheckedChange={onSelectionChange}
              aria-label="Select item"
            />
          </div>
        </div>

        <div onClick={onClick} onDoubleClick={onDoubleClick}>
          {renderThumbnail()}
          <div className="flex items-center justify-between mt-2">
            <span
              className="text-xs text-center truncate w-full"
              title={fileItem.name}
            >
              {fileItem.name}
            </span>
          </div>
        </div>
      </div>
    </FileContextMenu>
  );
}
