import * as React from 'react';
import { FileItem } from './fileStructure';
import { convertFileSrc } from '@tauri-apps/api/core';
import {
  FaFolder,
  FaFile,
  FaFileImage,
  FaFileAudio,
  FaFileVideo,
  FaFileArchive,
  FaFileCode,
  FaFileExcel,
  FaFileWord,
  FaFilePowerpoint,
  FaFilePdf,
  FaFileAlt,
  FaDatabase,
} from 'react-icons/fa';

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

  const getFileIcon = (extension: string | null) => {
    if (!extension) return <FaFile className="h-12 w-12" />;

    const ext = extension.toLowerCase();

    // Images
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext)) {
      return <FaFileImage className="h-12 w-12 text-purple-500" />;
    }

    // Audio
    if (['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a'].includes(ext)) {
      return <FaFileAudio className="h-12 w-12 text-pink-500" />;
    }

    // Video
    if (['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv'].includes(ext)) {
      return <FaFileVideo className="h-12 w-12 text-red-500" />;
    }

    // Archives
    if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2'].includes(ext)) {
      return <FaFileArchive className="h-12 w-12 text-amber-500" />;
    }

    // Code
    if (
      [
        'js',
        'ts',
        'tsx',
        'jsx',
        'py',
        'java',
        'cpp',
        'c',
        'h',
        'cs',
        'go',
        'rs',
        'php',
        'rb',
        'swift',
      ].includes(ext)
    ) {
      return <FaFileCode className="h-12 w-12 text-blue-500" />;
    }

    // Documents
    if (['doc', 'docx'].includes(ext)) {
      return <FaFileWord className="h-12 w-12 text-blue-600" />;
    }
    if (['xls', 'xlsx'].includes(ext)) {
      return <FaFileExcel className="h-12 w-12 text-green-600" />;
    }
    if (['ppt', 'pptx'].includes(ext)) {
      return <FaFilePowerpoint className="h-12 w-12 text-orange-600" />;
    }
    if (ext === 'pdf') {
      return <FaFilePdf className="h-12 w-12 text-red-600" />;
    }

    // Database
    if (['db', 'sqlite', 'sql'].includes(ext)) {
      return <FaDatabase className="h-12 w-12 text-teal-500" />;
    }

    // Text files
    if (
      [
        'txt',
        'md',
        'json',
        'xml',
        'csv',
        'log',
        'yml',
        'yaml',
        'toml',
        'ini',
        'conf',
      ].includes(ext)
    ) {
      return <FaFileAlt className="h-12 w-12 text-gray-500" />;
    }

    return <FaFile className="h-12 w-12" />;
  };

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
        {getFileIcon(fileItem.extension)}
      </div>
    );
  };

  return (
    <div
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      className={`flex flex-col gap-2 p-3 rounded-lg border border-border/50 hover:bg-accent/50 cursor-pointer transition-colors ${
        isActive ? 'bg-accent border-primary' : ''
      }`}
    >
      {renderThumbnail()}
      <span
        className="text-xs text-center truncate w-full"
        title={fileItem.name}
      >
        {fileItem.name}
      </span>
    </div>
  );
}
