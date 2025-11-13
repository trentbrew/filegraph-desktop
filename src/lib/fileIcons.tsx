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

export const getFileIcon = (
  file_type: string,
  extension: string | null,
  size: 'sm' | 'md' | 'lg' = 'sm',
) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  const sizeClass = sizeClasses[size];

  if (file_type === 'folder')
    return <FaFolder className={`${sizeClass} text-blue-500`} />;

  if (!extension) return <FaFile className={sizeClass} />;

  const ext = extension.toLowerCase();

  // Images
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext)) {
    return <FaFileImage className={`${sizeClass} text-green-500`} />;
  }

  // Audio
  if (['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a'].includes(ext)) {
    return <FaFileAudio className={`${sizeClass} text-purple-500`} />;
  }

  // Video
  if (['mp4', 'avi', 'mkv', 'mov', 'webm'].includes(ext)) {
    return <FaFileVideo className={`${sizeClass} text-red-500`} />;
  }

  // Archives
  if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2'].includes(ext)) {
    return <FaFileArchive className={`${sizeClass} text-orange-500`} />;
  }

  // Code files
  if (
    [
      'js',
      'ts',
      'tsx',
      'jsx',
      'html',
      'css',
      'py',
      'java',
      'cpp',
      'c',
      'cs',
      'go',
      'rs',
      'php',
      'rb',
      'swift',
      'kotlin',
      'kt',
      'scala',
      'sbt',
      'groovy',
      'gradle',
      'json',
      'xml',
      'yml',
      'yaml',
      'toml',
      'h',
    ].includes(ext)
  ) {
    return <FaFileCode className={`${sizeClass} text-blue-600`} />;
  }

  // Excel / Spreadsheet
  if (['xlsx', 'xls', 'csv'].includes(ext)) {
    return <FaFileExcel className={`${sizeClass} text-green-600`} />;
  }

  // Word Docs
  if (['doc', 'docx'].includes(ext)) {
    return <FaFileWord className={`${sizeClass} text-blue-700`} />;
  }

  // PowerPoint
  if (['ppt', 'pptx'].includes(ext)) {
    return <FaFilePowerpoint className={`${sizeClass} text-orange-600`} />;
  }

  // PDF
  if (['pdf'].includes(ext)) {
    return <FaFilePdf className={`${sizeClass} text-red-600`} />;
  }

  // Text & Markdown
  if (
    [
      'txt',
      'md',
      'rtf',
      'log',
      'ini',
      'conf',
      'cfg',
      'config',
      'env',
    ].includes(ext)
  ) {
    return <FaFileAlt className={`${sizeClass} text-gray-600`} />;
  }

  // Database files
  if (['sql', 'db', 'sqlite', 'mongodb'].includes(ext)) {
    return <FaDatabase className={`${sizeClass} text-yellow-600`} />;
  }

  return <FaFile className={sizeClass} />;
};
