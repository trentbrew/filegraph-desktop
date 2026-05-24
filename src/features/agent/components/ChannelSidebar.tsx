/**
 * Channel Sidebar
 *
 * Slack/Discord-style channel list for organizing agent conversations.
 */

import * as React from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  Hash,
  Plus,
  ChevronDown,
  ChevronRight,
  Settings,
  Search,
  Folder,
  User,
  MessageSquare,
  MoreHorizontal,
  Trash2,
  Edit2,
  Pin,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import {
  useAgentAppStore,
  useChannels,
  useActiveChannel,
  type Channel,
  type ChannelType,
} from '../stores/useAgentAppStore'

// ─────────────────────────────────────────────────────────────────────────────
// Channel Item
// ─────────────────────────────────────────────────────────────────────────────

interface ChannelItemProps {
  channel: Channel
  isActive: boolean
  onClick: () => void
  onDelete?: () => void
  onRename?: (name: string) => void
}

function ChannelItem({ channel, isActive, onClick, onDelete, onRename }: ChannelItemProps) {
  const [isRenaming, setIsRenaming] = React.useState(false)
  const [newName, setNewName] = React.useState(channel.name)
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isRenaming])

  const handleRename = () => {
    if (newName.trim() && newName !== channel.name) {
      onRename?.(newName.trim())
    }
    setIsRenaming(false)
  }

  const getChannelIcon = () => {
    switch (channel.type) {
      case 'project':
        return <Folder className="h-3.5 w-3.5" />
      case 'entity':
        return <User className="h-3.5 w-3.5" />
      case 'private':
        return <MessageSquare className="h-3.5 w-3.5" />
      default:
        return <Hash className="h-3.5 w-3.5" />
    }
  }

  if (isRenaming) {
    return (
      <div className="px-2 py-1">
        <Input
          ref={inputRef}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onBlur={handleRename}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleRename()
            if (e.key === 'Escape') {
              setNewName(channel.name)
              setIsRenaming(false)
            }
          }}
          className="h-7 text-sm"
        />
      </div>
    )
  }

  return (
    <div
      className={cn(
        'group flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors',
        isActive ? 'bg-accent text-accent-foreground' : 'hover:bg-muted/50 text-muted-foreground hover:text-foreground',
      )}
      onClick={onClick}>
      <span className="opacity-60">{getChannelIcon()}</span>
      <span className="flex-1 truncate text-sm">{channel.name}</span>
      {channel.unreadCount > 0 && (
        <span className="text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">
          {channel.unreadCount}
        </span>
      )}
      {channel.id !== 'chan_general' && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => e.stopPropagation()}>
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation()
                setIsRenaming(true)
              }}>
              <Edit2 className="h-3.5 w-3.5 mr-2" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={(e) => {
                e.stopPropagation()
                onDelete?.()
              }}>
              <Trash2 className="h-3.5 w-3.5 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Section Header
// ─────────────────────────────────────────────────────────────────────────────

interface SectionHeaderProps {
  title: string
  isExpanded: boolean
  onToggle: () => void
  onAdd?: () => void
}

function SectionHeader({ title, isExpanded, onToggle, onAdd }: SectionHeaderProps) {
  return (
    <div className="flex items-center gap-1 px-2 py-1.5">
      <Button variant="ghost" size="icon" className="h-5 w-5" onClick={onToggle}>
        {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
      </Button>
      <span className="flex-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</span>
      {onAdd && (
        <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100" onClick={onAdd}>
          <Plus className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Create Channel Dialog
// ─────────────────────────────────────────────────────────────────────────────

interface CreateChannelDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultType?: ChannelType
}

function CreateChannelDialog({ open, onOpenChange, defaultType = 'default' }: CreateChannelDialogProps) {
  const [name, setName] = React.useState('')
  const [type, setType] = React.useState<ChannelType>(defaultType)
  const { createChannel, setActiveChannel } = useAgentAppStore()

  const handleCreate = () => {
    if (!name.trim()) return
    const channelId = createChannel(name.trim(), type)
    setActiveChannel(channelId)
    setName('')
    setType('default')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Channel</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Channel Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., design-reviews"
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Type</label>
            <div className="grid grid-cols-2 gap-2">
              {(['default', 'project', 'entity', 'private'] as ChannelType[]).map((t) => (
                <Button
                  key={t}
                  variant={type === t ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setType(t)}
                  className="justify-start">
                  {t === 'default' && <Hash className="h-3.5 w-3.5 mr-2" />}
                  {t === 'project' && <Folder className="h-3.5 w-3.5 mr-2" />}
                  {t === 'entity' && <User className="h-3.5 w-3.5 mr-2" />}
                  {t === 'private' && <MessageSquare className="h-3.5 w-3.5 mr-2" />}
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </Button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!name.trim()}>
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Channel Sidebar
// ─────────────────────────────────────────────────────────────────────────────

interface ChannelSidebarProps {
  className?: string
}

export function ChannelSidebar({ className }: ChannelSidebarProps) {
  const channels = useChannels()
  const activeChannel = useActiveChannel()
  const { setActiveChannel, updateChannel, deleteChannel, searchQuery, setSearchQuery } = useAgentAppStore()

  const [expandedSections, setExpandedSections] = React.useState({
    channels: true,
    projects: true,
    direct: true,
  })
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false)
  const [createDialogType, setCreateDialogType] = React.useState<ChannelType>('default')

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }))
  }

  // Group channels by type
  const defaultChannels = channels.filter((ch) => ch.type === 'default')
  const projectChannels = channels.filter((ch) => ch.type === 'project')
  const directChannels = channels.filter((ch) => ch.type === 'private' || ch.type === 'entity')

  const openCreateDialog = (type: ChannelType) => {
    setCreateDialogType(type)
    setCreateDialogOpen(true)
  }

  return (
    <div className={cn('flex flex-col h-full bg-card/50', className)}>
      {/* Search */}
      <div className="p-3 border-b">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search messages..."
            className="pl-8 h-8 text-sm"
          />
        </div>
      </div>

      {/* Channel List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-4">
          {/* Channels Section */}
          <div className="group">
            <SectionHeader
              title="Channels"
              isExpanded={expandedSections.channels}
              onToggle={() => toggleSection('channels')}
              onAdd={() => openCreateDialog('default')}
            />
            <AnimatePresence>
              {expandedSections.channels && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}>
                  {defaultChannels.map((channel) => (
                    <ChannelItem
                      key={channel.id}
                      channel={channel}
                      isActive={activeChannel?.id === channel.id}
                      onClick={() => setActiveChannel(channel.id)}
                      onDelete={() => deleteChannel(channel.id)}
                      onRename={(name) => updateChannel(channel.id, { name })}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Projects Section */}
          {projectChannels.length > 0 && (
            <div className="group">
              <SectionHeader
                title="Projects"
                isExpanded={expandedSections.projects}
                onToggle={() => toggleSection('projects')}
                onAdd={() => openCreateDialog('project')}
              />
              <AnimatePresence>
                {expandedSections.projects && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}>
                    {projectChannels.map((channel) => (
                      <ChannelItem
                        key={channel.id}
                        channel={channel}
                        isActive={activeChannel?.id === channel.id}
                        onClick={() => setActiveChannel(channel.id)}
                        onDelete={() => deleteChannel(channel.id)}
                        onRename={(name) => updateChannel(channel.id, { name })}
                      />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Direct Messages Section */}
          {directChannels.length > 0 && (
            <div className="group">
              <SectionHeader
                title="Direct"
                isExpanded={expandedSections.direct}
                onToggle={() => toggleSection('direct')}
                onAdd={() => openCreateDialog('private')}
              />
              <AnimatePresence>
                {expandedSections.direct && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}>
                    {directChannels.map((channel) => (
                      <ChannelItem
                        key={channel.id}
                        channel={channel}
                        isActive={activeChannel?.id === channel.id}
                        onClick={() => setActiveChannel(channel.id)}
                        onDelete={() => deleteChannel(channel.id)}
                        onRename={(name) => updateChannel(channel.id, { name })}
                      />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-3 border-t">
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start"
          onClick={() => openCreateDialog('default')}>
          <Plus className="h-3.5 w-3.5 mr-2" />
          New Channel
        </Button>
      </div>

      {/* Create Channel Dialog */}
      <CreateChannelDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} defaultType={createDialogType} />
    </div>
  )
}
