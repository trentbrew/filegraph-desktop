import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import * as LucideIcons from 'lucide-react'
import { Search, type LucideIcon } from 'lucide-react'

interface IconPickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (icon: string) => void
  currentIcon?: string
}

interface Emoji {
  name: string
  tags: string[]
}

interface Icon {
  name: string
  tags: string[]
}

// Common emojis organized by category
const EMOJI_CATEGORIES: Record<string, Emoji[]> = {
  Folders: [
    { name: '📁', tags: ['folder', 'file', 'navigation'] },
    { name: '🗂️', tags: ['folder', 'collection', 'organization'] },
    { name: '📂', tags: ['folder', 'open', 'files'] },
    { name: '🗃️', tags: ['card', 'box', 'archive'] },
    { name: '🧾', tags: ['receipt', 'document', 'file'] },
    { name: '📑', tags: ['file', 'document', 'paper'] },
    { name: '📄', tags: ['file', 'document', 'page'] },
    { name: '📜', tags: ['scroll', 'document', 'history'] },
    { name: '🗄️', tags: ['cabinet', 'files', 'storage'] },
    { name: '🧩', tags: ['puzzle', 'piece', 'plugin'] },
  ],
  Files: [
    { name: '📄', tags: ['file', 'document', 'page'] },
    { name: '📃', tags: ['page', 'document', 'file'] },
    { name: '📜', tags: ['scroll', 'history', 'file'] },
    { name: '🧾', tags: ['receipt', 'invoice', 'record'] },
    { name: '📝', tags: ['note', 'edit', 'write'] },
    { name: '✏️', tags: ['pencil', 'edit', 'write'] },
    { name: '📊', tags: ['chart', 'graph', 'stats'] },
    { name: '📈', tags: ['chart', 'growth', 'up'] },
    { name: '📉', tags: ['chart', 'down', 'decrease'] },
    { name: '📂', tags: ['open', 'folder', 'files'] },
  ],
  Work: [
    { name: '💼', tags: ['office', 'work', 'business'] },
    { name: '📊', tags: ['chart', 'analytics', 'business'] },
    { name: '📈', tags: ['growth', 'stats', 'analytics'] },
    { name: '📉', tags: ['decline', 'stats', 'analytics'] },
    { name: '📅', tags: ['calendar', 'schedule', 'date'] },
    { name: '📆', tags: ['calendar', 'planner', 'schedule'] },
    { name: '📇', tags: ['index', 'cards', 'contacts'] },
    { name: '🗂️', tags: ['files', 'organization', 'folders'] },
    { name: '🗃️', tags: ['archive', 'storage', 'box'] },
    { name: '📋', tags: ['clipboard', 'task', 'list'] },
  ],
  Starred: [
    { name: '⭐', tags: ['star', 'favorite', 'bookmark'] },
    { name: '🌟', tags: ['glowing', 'favorite', 'highlight'] },
    { name: '✨', tags: ['sparkles', 'highlight', 'magic'] },
    { name: '🔥', tags: ['hot', 'trending', 'important'] },
    { name: '⚡', tags: ['fast', 'electric', 'power'] },
    { name: '💡', tags: ['idea', 'lightbulb', 'tip'] },
    { name: '📌', tags: ['pin', 'pinned', 'important'] },
    { name: '📍', tags: ['location', 'pin', 'marker'] },
    { name: '🔖', tags: ['bookmark', 'saved', 'label'] },
    { name: '🏅', tags: ['award', 'badge', 'achievement'] },
  ],
  Code: [
    { name: '💻', tags: ['computer', 'code', 'programming'] },
    { name: '🖥️', tags: ['desktop', 'computer', 'screen'] },
    { name: '🖱️', tags: ['mouse', 'pointer', 'click'] },
    { name: '⌨️', tags: ['keyboard', 'typing', 'input'] },
    { name: '📟', tags: ['pager', 'retro', 'tech'] },
    { name: '🧠', tags: ['brain', 'ai', 'intelligence'] },
    { name: '🧪', tags: ['experiment', 'test', 'lab'] },
    { name: '⚙️', tags: ['settings', 'config', 'gear'] },
    { name: '🧰', tags: ['toolbox', 'tools', 'devtools'] },
    { name: '🧱', tags: ['blocks', 'build', 'structure'] },
  ],
  Media: [
    { name: '🎧', tags: ['audio', 'music', 'headphones'] },
    { name: '🎵', tags: ['music', 'note', 'audio'] },
    { name: '🎶', tags: ['music', 'notes', 'audio'] },
    { name: '🎬', tags: ['movie', 'video', 'media'] },
    { name: '🎥', tags: ['camera', 'video', 'film'] },
    { name: '📷', tags: ['camera', 'photo', 'image'] },
    { name: '🖼️', tags: ['picture', 'image', 'gallery'] },
    { name: '🎮', tags: ['game', 'controller', 'play'] },
    { name: '📺', tags: ['tv', 'screen', 'media'] },
    { name: '📻', tags: ['radio', 'audio', 'music'] },
  ],
  Web: [
    { name: '🌐', tags: ['web', 'internet', 'globe'] },
    { name: '🕸️', tags: ['web', 'network', 'spider'] },
    { name: '🛰️', tags: ['satellite', 'network', 'connection'] },
    { name: '📡', tags: ['signal', 'network', 'antenna'] },
    { name: '📶', tags: ['wifi', 'signal', 'connection'] },
    { name: '🔗', tags: ['link', 'url', 'connection'] },
    { name: '🧷', tags: ['pin', 'attach', 'link'] },
    { name: '🧭', tags: ['compass', 'navigation', 'direction'] },
    { name: '🗺️', tags: ['map', 'navigation', 'location'] },
    { name: '🚀', tags: ['launch', 'deploy', 'release'] },
  ],
  People: [
    { name: '👤', tags: ['user', 'person', 'profile'] },
    { name: '👥', tags: ['users', 'group', 'team'] },
    { name: '🧑‍💻', tags: ['developer', 'programmer', 'coder'] },
    { name: '🧑‍🎨', tags: ['designer', 'artist', 'creative'] },
    { name: '🧑‍🏫', tags: ['teacher', 'mentor', 'guide'] },
    { name: '🧑‍🚀', tags: ['astronaut', 'explorer', 'space'] },
    { name: '🧑‍🔧', tags: ['mechanic', 'fix', 'tools'] },
    { name: '🧑‍⚕️', tags: ['doctor', 'health', 'medical'] },
    { name: '🧑‍💼', tags: ['office', 'business', 'manager'] },
    { name: '🧑‍🔬', tags: ['scientist', 'lab', 'experiment'] },
  ],
  Status: [
    { name: '✅', tags: ['done', 'complete', 'success'] },
    { name: '☑️', tags: ['checked', 'complete', 'task'] },
    { name: '✔️', tags: ['check', 'done', 'ok'] },
    { name: '❌', tags: ['error', 'close', 'fail'] },
    { name: '⚠️', tags: ['warning', 'alert', 'danger'] },
    { name: '❗', tags: ['important', 'alert', 'attention'] },
    { name: '❓', tags: ['help', 'question', 'unknown'] },
    { name: '💤', tags: ['sleep', 'idle', 'inactive'] },
    { name: '🔄', tags: ['sync', 'refresh', 'reload'] },
    { name: '🕒', tags: ['time', 'pending', 'waiting'] },
  ],
}

// Popular lucide icons grouped by theme
const ICON_CATEGORIES: Record<string, Icon[]> = {
  'Workspaces & Files': [
    { name: 'Folder', tags: ['folder', 'file', 'navigation', 'directory'] },
    { name: 'FolderOpen', tags: ['folder', 'file', 'open', 'navigation'] },
    { name: 'Folders', tags: ['folder', 'file', 'multiple', 'group'] },
    { name: 'FolderTree', tags: ['folder', 'structure', 'hierarchy'] },
    { name: 'FolderRoot', tags: ['folder', 'root', 'project', 'workspace'] },
    { name: 'FolderSearch', tags: ['folder', 'search', 'find'] },
    { name: 'FolderGit', tags: ['folder', 'git', 'repository'] },
    { name: 'FolderSymlink', tags: ['folder', 'symlink', 'link'] },
    { name: 'File', tags: ['file', 'document', 'paper'] },
    { name: 'FileText', tags: ['file', 'document', 'text', 'note'] },
    { name: 'FileCode', tags: ['file', 'code', 'programming'] },
    { name: 'FileJson', tags: ['file', 'json', 'config', 'data'] },
    { name: 'FileSpreadsheet', tags: ['file', 'spreadsheet', 'table'] },
    { name: 'FileArchive', tags: ['file', 'archive', 'zip', 'compressed'] },
    { name: 'FileAudio', tags: ['file', 'audio', 'music', 'sound'] },
    { name: 'FileVideo', tags: ['file', 'video', 'media', 'movie'] },
    { name: 'FileImage', tags: ['file', 'image', 'photo', 'picture'] },
    { name: 'FileChartColumn', tags: ['file', 'chart', 'analytics'] },
    { name: 'FileDiff', tags: ['file', 'diff', 'changes', 'git'] },
    { name: 'FileTerminal', tags: ['file', 'terminal', 'script', 'shell'] },
    { name: 'FilePen', tags: ['file', 'edit', 'write'] },
    { name: 'FilePlus2', tags: ['file', 'new', 'create'] },
    { name: 'FileMinus2', tags: ['file', 'remove', 'delete'] },
    { name: 'Files', tags: ['files', 'documents', 'collection'] },
    { name: 'PanelsTopLeft', tags: ['layout', 'panel', 'split', 'editor'] },
    { name: 'PanelsLeftRight', tags: ['layout', 'split', 'columns'] },
    { name: 'Columns3', tags: ['columns', 'layout', 'view'] },
    { name: 'PanelLeft', tags: ['sidebar', 'panel', 'left'] },
    { name: 'PanelRight', tags: ['sidebar', 'panel', 'right'] },
    { name: 'PanelTop', tags: ['panel', 'top', 'toolbar'] },
    { name: 'PanelBottom', tags: ['panel', 'bottom', 'console'] },
    { name: 'Sidebar', tags: ['sidebar', 'navigation', 'panel'] },
    { name: 'TreePine', tags: ['tree', 'structure', 'hierarchy'] },
    { name: 'KanbanSquare', tags: ['kanban', 'board', 'tasks'] },
    { name: 'LayoutGrid', tags: ['grid', 'view', 'tiles'] },
    { name: 'Table', tags: ['table', 'data', 'spreadsheet'] },
  ],
  'Design & Creative': [
    { name: 'Palette', tags: ['design', 'color', 'art', 'theme', 'branding'] },
    { name: 'PenTool', tags: ['vector', 'design', 'path', 'anchor', 'illustration'] },
    { name: 'Brush', tags: ['paint', 'art', 'draw', 'stroke', 'freehand'] },
    { name: 'Paintbrush', tags: ['paint', 'brush', 'art', 'texture', 'illustration'] },
    { name: 'PenSquare', tags: ['pen', 'draw', 'sketch', 'outline', 'draft'] },
    { name: 'Feather', tags: ['write', 'creative', 'sketch', 'ink', 'signature'] },
    { name: 'Spline', tags: ['bezier', 'spline', 'vector', 'curve', 'design', 'path', 'handles'] },
    { name: 'PencilRuler', tags: ['instruments', 'tools', 'design', 'ruler', 'measure', 'layout', 'grid', 'guide'] },
    { name: 'Ruler', tags: ['measure', 'layout', 'grid', 'spacing', 'precision'] },
    { name: 'Layers', tags: ['layers', 'stack', 'design', 'ordering', 'depth'] },
    { name: 'Shapes', tags: ['shapes', 'geometry', 'design', 'icons', 'blocks'] },
    { name: 'Stamp', tags: ['brand', 'identity', 'approval', 'seal', 'logo'] },
    { name: 'Eraser', tags: ['delete', 'edit', 'design', 'remove', 'cleanup'] },
    { name: 'Sparkles', tags: ['magic', 'highlight', 'idea', 'accent', 'emphasis'] },
    { name: 'Camera', tags: ['photo', 'media', 'capture', 'asset', 'reference'] },
    { name: 'Clapperboard', tags: ['video', 'film', 'production', 'storyboard', 'scene'] },
    { name: 'Image', tags: ['image', 'picture', 'media', 'asset', 'thumbnail'] },
    { name: 'Presentation', tags: ['slides', 'deck', 'pitch', 'story', 'proposal'] },
    { name: 'Video', tags: ['video', 'media', 'film', 'motion', 'clip'] },
    { name: 'Film', tags: ['movie', 'cinema', 'entertainment', 'show'] },
  ],
  'Engineering & Build': [
    { name: 'Code2', tags: ['code', 'development', 'programming'] },
    { name: 'Binary', tags: ['binary', 'data', 'engineering'] },
    { name: 'Workflow', tags: ['automation', 'pipeline', 'flow'] },
    { name: 'GitBranch', tags: ['git', 'branch', 'version-control'] },
    { name: 'GitMerge', tags: ['git', 'merge', 'collaboration'] },
    { name: 'GitPullRequest', tags: ['git', 'pull-request', 'pr'] },
    { name: 'GitCommit', tags: ['git', 'commit', 'version'] },
    { name: 'Bug', tags: ['bug', 'issue', 'debug'] },
    { name: 'Hammer', tags: ['build', 'tool', 'compile'] },
    { name: 'Wrench', tags: ['tool', 'settings', 'configure'] },
    { name: 'Cog', tags: ['settings', 'gear', 'config'] },
    { name: 'Cpu', tags: ['cpu', 'performance', 'hardware', 'chip', 'device'] },
    { name: 'CircuitBoard', tags: ['hardware', 'electronics', 'engineering'] },
    { name: 'Bot', tags: ['automation', 'robot', 'ai'] },
    { name: 'HardDrive', tags: ['storage', 'disk', 'hardware'] },
    { name: 'TerminalSquare', tags: ['terminal', 'shell', 'cli'] },
    { name: 'Shield', tags: ['security', 'shield', 'protection'] },
  ],
  'Research & Learning': [
    { name: 'BookOpen', tags: ['docs', 'book', 'reference'] },
    { name: 'BookMarked', tags: ['book', 'bookmark', 'study'] },
    { name: 'NotebookPen', tags: ['notes', 'study', 'journal'] },
    { name: 'NotepadText', tags: ['note', 'notepad', 'text'] },
    { name: 'GraduationCap', tags: ['learning', 'education', 'school'] },
    { name: 'Brain', tags: ['thinking', 'ideas', 'focus'] },
    { name: 'Lightbulb', tags: ['idea', 'insight', 'inspiration'] },
    { name: 'FlaskConical', tags: ['lab', 'experiment', 'chemistry'] },
    { name: 'TestTube', tags: ['research', 'science', 'lab'] },
    { name: 'Microscope', tags: ['science', 'lab', 'analysis'] },
    { name: 'Atom', tags: ['science', 'physics', 'research'] },
    { name: 'Telescope', tags: ['observe', 'space', 'explore'] },
    { name: 'ScrollText', tags: ['history', 'document', 'reference'] },
    { name: 'Search', tags: ['search', 'find', 'lookup'] },
  ],
  'Play & Inspiration': [
    { name: 'Gamepad2', tags: ['game', 'play', 'controller'] },
    { name: 'Joystick', tags: ['game', 'play', 'retro'] },
    { name: 'Dice3', tags: ['game', 'random', 'chance'] },
    { name: 'PartyPopper', tags: ['celebrate', 'fun', 'launch'] },
    { name: 'Music', tags: ['music', 'audio', 'sound'] },
    { name: 'Guitar', tags: ['music', 'instrument', 'creative'] },
    { name: 'Trophy', tags: ['win', 'award', 'achievement'] },
    { name: 'Wand2', tags: ['magic', 'idea', 'spark'] },
    { name: 'Star', tags: ['star', 'favorite', 'important'] },
    { name: 'Sparkles', tags: ['spark', 'shine', 'delight'] },
    { name: 'Heart', tags: ['favorite', 'love', 'personal'] },
  ],
  'Personal & Life': [
    { name: 'User', tags: ['user', 'person', 'profile'] },
    { name: 'UserRound', tags: ['user', 'person', 'profile'] },
    { name: 'Users', tags: ['team', 'collaboration', 'people'] },
    { name: 'UserCheck', tags: ['user', 'approved', 'access'] },
    { name: 'Briefcase', tags: ['work', 'business', 'career'] },
    { name: 'CalendarDays', tags: ['calendar', 'schedule', 'date'] },
    { name: 'AlarmClock', tags: ['time', 'reminder', 'alarm'] },
    { name: 'Sun', tags: ['day', 'energy', 'light'] },
    { name: 'Moon', tags: ['night', 'focus', 'calm'] },
    { name: 'Coffee', tags: ['coffee', 'break', 'focus'] },
    { name: 'Plane', tags: ['travel', 'explore', 'trip'] },
    { name: 'MapPin', tags: ['location', 'place', 'map'] },
    { name: 'Compass', tags: ['direction', 'navigate', 'explore'] },
    { name: 'NotebookTabs', tags: ['notes', 'personal', 'journal'] },
    { name: 'WalletCards', tags: ['wallet', 'finance', 'personal'] },
    { name: 'BadgeCheck', tags: ['verified', 'id', 'access'] },
    { name: 'Home', tags: ['home', 'root', 'personal'] },
    { name: 'Inbox', tags: ['inbox', 'mail', 'queue'] },
  ],
}

export function IconPicker({ open, onOpenChange, onSelect, currentIcon }: IconPickerProps) {
  const [filter, setFilter] = React.useState('')
  const [activeTab, setActiveTab] = React.useState('icons')

  const filteredEmojis = React.useMemo(() => {
    if (!filter) return EMOJI_CATEGORIES

    const filtered: Record<string, Emoji[]> = {}
    Object.entries(EMOJI_CATEGORIES).forEach(([category, emojis]) => {
      const matches = emojis.filter((emoji) =>
        emoji.tags.some((tag) => tag.toLowerCase().includes(filter.toLowerCase())),
      )
      if (matches.length > 0) {
        filtered[category] = matches
      }
    })
    return filtered
  }, [filter])

  const filteredIcons = React.useMemo<Record<string, Icon[]>>(() => {
    if (!filter) return ICON_CATEGORIES

    const filtered: Record<string, Icon[]> = {}
    const search = filter.toLowerCase()

    Object.entries(ICON_CATEGORIES).forEach(([category, icons]) => {
      const matches = icons.filter(
        (icon) =>
          icon.name.toLowerCase().includes(search) ||
          icon.tags.some((tag) => tag.toLowerCase().includes(search)) ||
          category.toLowerCase().includes(search),
      )

      if (matches.length) {
        filtered[category] = matches
      }
    })

    return filtered
  }, [filter])

  const handleSelect = (icon: string) => {
    onSelect(icon)
    onOpenChange(false)
    setFilter('')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-xl">
        <DialogHeader>
          <DialogTitle>Choose Icon</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="icons">Icons</TabsTrigger>
            <TabsTrigger value="emoji">Emoji</TabsTrigger>
          </TabsList>

          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filter..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="pl-9 !rounded-lg border-input bg-background"
            />
          </div>

          <TabsContent value="emoji" className="mt-4">
            <ScrollArea className="h-[300px] pr-4">
              {Object.entries(filteredEmojis).map(([category, emojis]) => (
                <div key={category} className="mb-4">
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">{category}</h4>
                  <div className="grid grid-cols-8 gap-2">
                    {emojis.map((emoji) => (
                      <button
                        key={emoji.name}
                        onClick={() => handleSelect(emoji.name)}
                        className={`
                          flex items-center justify-center h-10 w-10 rounded-md
                          hover:bg-accent transition-colors text-2xl
                          ${currentIcon === emoji.name ? 'bg-accent' : ''}
                        `}>
                        {emoji.name}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="icons" className="mt-4">
            <ScrollArea className="h-[300px] pr-4">
              <div className="flex flex-col gap-5">
                {Object.entries(filteredIcons).map(([category, icons]) => (
                  <div key={category}>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">{category}</h4>
                    <div className="grid grid-cols-6 gap-2">
                      {icons.map((icon) => {
                        const IconComponent = LucideIcons[icon.name as keyof typeof LucideIcons] as
                          | LucideIcon
                          | undefined

                        if (!IconComponent) {
                          console.warn(`IconPicker: Missing lucide icon "${icon.name}"`)
                          return null
                        }

                        return (
                          <button
                            key={icon.name}
                            onClick={() => handleSelect(icon.name)}
                            className={`
                              flex items-center justify-center h-10 w-10 rounded-md
                              hover:bg-accent transition-colors
                              ${currentIcon === icon.name ? 'bg-accent' : ''}
                            `}
                            title={icon.name}>
                            <IconComponent className="h-5 w-5" />
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
