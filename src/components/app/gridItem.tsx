import * as React from 'react';
import { FileItem } from './fileStructure';
import { convertFileSrc } from '@tauri-apps/api/core';
import { getFileIcon } from '@/lib/fileIcons';
import { FaFolder } from 'react-icons/fa';

interface GridItemProps {
  fileItem: FileItem;
  isActive: boolean;
  onClick: () => void;
  onDoubleClick: () => void;
}

export function GridItem({
  fileItem,
  isActive,
  onClick,
  onDoubleClick,
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
    <div
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      className={`flex flex-col gap-2 p-3 rounded-lg border-border/50 bg-accent/25 hover:bg-accent/50 cursor-pointer transition-colors ${
        isActive ? 'bg-accent border-primary' : ''
      } ${isDotfile ? 'opacity-50' : ''}`}
    >
      {renderThumbnail()}
      <div className="flex items-center justify-between">
        <span
          className="text-xs text-center truncate w-full"
          title={fileItem.name}
        >
          {fileItem.name}
        </span>
        <span className="text-xs text-center truncate w-full">
          {/* TODO: Number of children */}
        </span>
      </div>
    </div>
  );
}
