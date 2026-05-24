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
  FaGlobe,
} from 'react-icons/fa'
import { SiAstro, SiReact, SiSvelte, SiVuedotjs } from 'react-icons/si'
import {
  Network,
  PenLine,
  Table2,
  Settings as SettingsIcon,
  User,
  Briefcase,
  CheckSquare,
  Target,
  DollarSign,
  Calendar,
  Mail,
  MessageSquare,
  Bot,
  Zap,
  Tag,
  Archive,
} from 'lucide-react'
import type { SVGProps } from 'react'

const FontFileIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" role="img" aria-hidden="true" {...props}>
    <path
      d="M7 4.25C7 3.56 7.56 3 8.25 3h6.05c.2 0 .4.08.55.22l5.18 4.9c.14.13.22.32.22.52v10.11A2.25 2.25 0 0 1 18 21H8.25A2.25 2.25 0 0 1 6 18.75V4.25Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinejoin="round"
    />
    <path
      d="M14 3v4.75c0 .69.56 1.25 1.25 1.25H20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinejoin="round"
    />
    <path
      d="m8.75 17.2 1.5-4.4 1.5 4.4M9.3 15.4h1.9"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.35"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M13.6 16.2c0-.9.66-1.54 1.64-1.54.92 0 1.51.55 1.51 1.45v1.83c0 .25-.2.46-.45.46-.14 0-.28-.06-.37-.16l-.33-.35c-.34.32-.79.49-1.27.49-.93 0-1.52-.57-1.52-1.38 0-.88.65-1.43 1.62-1.43.35 0 .71.1.96.27v-.14c0-.48-.33-.76-.83-.76-.45 0-.85.24-1 .66l-.46 .6Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.35"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

export const getFileIcon = (file_type: string, extension: string | null, size: 'sm' | 'md' | 'lg' = 'sm') => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  }

  const sizeClass = sizeClasses[size]

  if (file_type === 'folder') return <FaFolder className={`${sizeClass} text-blue-500`} />

  if (file_type === 'web') {
    return <FaGlobe className={`${sizeClass} text-sky-500`} />
  }

  if (!extension) return <FaFile className={sizeClass} />

  const ext = extension.toLowerCase()

  if (ext === 'web') {
    return <FaGlobe className={`${sizeClass} text-sky-500`} />
  }

  // Canvas files
  if (ext === 'canvas') {
    return <Network className={`${sizeClass} text-violet-500`} />
  }

  // Whiteboard files (Excalidraw)
  if (ext === 'whiteboard') {
    return <PenLine className={`${sizeClass} text-amber-500`} />
  }

  // Data files (.data) - structured data/spreadsheet-like
  if (ext === 'data') {
    return <Table2 className={`${sizeClass} text-emerald-500`} />
  }

  // Entity projection extensions
  if (ext === 'person') return <User className={`${sizeClass} text-blue-500`} />
  if (ext === 'org') return <Briefcase className={`${sizeClass} text-purple-500`} />
  if (ext === 'proj') return <Target className={`${sizeClass} text-emerald-500`} />
  if (ext === 'task') return <CheckSquare className={`${sizeClass} text-amber-500`} />
  if (ext === 'ms') return <Target className={`${sizeClass} text-pink-500`} />
  if (ext === 'cycle') return <Archive className={`${sizeClass} text-indigo-500`} />
  if (ext === 'collection') return <Archive className={`${sizeClass} text-slate-500`} />
  if (ext === 'acc') return <DollarSign className={`${sizeClass} text-green-500`} />
  if (ext === 'tx') return <DollarSign className={`${sizeClass} text-cyan-500`} />
  if (ext === 'bill') return <DollarSign className={`${sizeClass} text-orange-500`} />
  if (ext === 'goal') return <Target className={`${sizeClass} text-indigo-500`} />
  if (ext === 'inc') return <DollarSign className={`${sizeClass} text-green-600`} />
  if (ext === 'ins') return <DollarSign className={`${sizeClass} text-blue-600`} />
  if (ext === 'exp') return <DollarSign className={`${sizeClass} text-red-600`} />
  if (ext === 'tax') return <DollarSign className={`${sizeClass} text-gray-600`} />
  if (ext === 'sub') return <DollarSign className={`${sizeClass} text-purple-600`} />
  if (ext === 'cat') return <Tag className={`${sizeClass} text-slate-500`} />
  if (ext === 'annual') return <Calendar className={`${sizeClass} text-teal-500`} />
  if (ext === 'agent') return <Bot className={`${sizeClass} text-violet-500`} />
  if (ext === 'persona') return <User className={`${sizeClass} text-sky-500`} />
  if (ext === 'prompt') return <MessageSquare className={`${sizeClass} text-amber-500`} />
  if (ext === 'skill') return <Zap className={`${sizeClass} text-yellow-500`} />
  if (ext === 'tool') return <Zap className={`${sizeClass} text-orange-500`} />
  if (ext === 'event') return <Calendar className={`${sizeClass} text-rose-500`} />
  if (ext === 'reminder') return <Calendar className={`${sizeClass} text-red-500`} />
  if (ext === 'email') return <Mail className={`${sizeClass} text-blue-500`} />
  if (ext === 'dm') return <MessageSquare className={`${sizeClass} text-fuchsia-500`} />
  if (ext === 'channel') return <MessageSquare className={`${sizeClass} text-lime-500`} />
  if (ext === 'thread') return <MessageSquare className={`${sizeClass} text-yellow-500`} />

  // Settings files
  if (ext === 'settings') {
    return <SettingsIcon className={`${sizeClass} text-slate-600`} />
  }

  if (ext === 'vue') {
    return <SiVuedotjs className={`${sizeClass} text-emerald-500`} />
  }

  if (ext === 'svelte') {
    return <SiSvelte className={`${sizeClass} text-orange-500`} />
  }

  if (ext === 'astro') {
    return <SiAstro className={`${sizeClass} text-violet-500`} />
  }

  if (ext === 'tsx' || ext === 'jsx') {
    return <SiReact className={`${sizeClass} text-cyan-500`} />
  }

  // Font files (including custom .font)
  if (['ttf', 'otf', 'woff', 'woff2', 'ttc', 'otc', 'font'].includes(ext)) {
    return <FontFileIcon className={`${sizeClass} text-indigo-500`} />
  }

  // Images
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext)) {
    return <FaFileImage className={`${sizeClass} text-green-500`} />
  }

  // Audio
  if (['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a'].includes(ext)) {
    return <FaFileAudio className={`${sizeClass} text-purple-500`} />
  }

  // Video
  if (['mp4', 'avi', 'mkv', 'mov', 'webm'].includes(ext)) {
    return <FaFileVideo className={`${sizeClass} text-red-500`} />
  }

  // Archives
  if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2'].includes(ext)) {
    return <FaFileArchive className={`${sizeClass} text-orange-500`} />
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
    return <FaFileCode className={`${sizeClass} text-blue-600`} />
  }

  // Excel / Spreadsheet
  if (['xlsx', 'xls', 'csv'].includes(ext)) {
    return <FaFileExcel className={`${sizeClass} text-green-600`} />
  }

  // Word Docs
  if (['doc', 'docx'].includes(ext)) {
    return <FaFileWord className={`${sizeClass} text-blue-700`} />
  }

  // PowerPoint
  if (['ppt', 'pptx'].includes(ext)) {
    return <FaFilePowerpoint className={`${sizeClass} text-orange-600`} />
  }

  // PDF
  if (['pdf'].includes(ext)) {
    return <FaFilePdf className={`${sizeClass} text-red-600`} />
  }

  // Text & Markdown & Notes
  if (['txt', 'md', 'note', 'rtf', 'log', 'ini', 'conf', 'cfg', 'config', 'env'].includes(ext)) {
    return <FaFileAlt className={`${sizeClass} text-gray-600`} />
  }

  // Database files
  if (['sql', 'db', 'sqlite', 'mongodb'].includes(ext)) {
    return <FaDatabase className={`${sizeClass} text-yellow-600`} />
  }

  return <FaFile className={sizeClass} />
}
