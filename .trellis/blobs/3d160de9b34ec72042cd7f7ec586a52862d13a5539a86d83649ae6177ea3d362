/**
 * Person Node for Home Canvas
 *
 * Displays entity data (person) as a profile card.
 * Fetches entity data from .data files based on entity ID.
 */

import * as React from 'react'
import { NodeProps } from 'reactflow'
import { invoke } from '@tauri-apps/api/core'
import { User, Mail, Briefcase, ExternalLink, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CanvasNodeWrapper, MaximizedHeader } from './CanvasNodeWrapper'
import { useVault } from '@/contexts/VaultContext'
export interface PersonNodeData {
  entityId: string // e.g., "person:ahmad-jamal:001"
  label?: string
  isMaximized?: boolean
}

interface PersonEntity {
  id: string
  name: string
  email?: string
  role?: string
  avatar?: string
  description?: string
  skills?: string[]
  worksFor?: string
  links?: { github?: string; linkedin?: string; twitter?: string; website?: string }
}

export function PersonNode({ id, data, selected, groupColor }: NodeProps<PersonNodeData> & { groupColor?: string }) {
  const entityId = data?.entityId || ''
  const isMaximized = data?.isMaximized || false
  const [entity, setEntity] = React.useState<PersonEntity | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [isInteractive, setIsInteractive] = React.useState(false)
  const { vaultPath } = useVault()

  // Exit interactive mode when deselected
  React.useEffect(() => {
    if (!selected) setIsInteractive(false)
  }, [selected])

  // Fetch entity data from .data files
  React.useEffect(() => {
    if (!entityId || !vaultPath) {
      setIsLoading(false)
      return
    }

    const fetchEntity = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const entitiesPath = `${vaultPath}/@entities`
        const files = await invoke<any[]>('list_directory', { path: entitiesPath }).catch(() => [])

        for (const file of files) {
          if (file.extension === 'data' && file.file_type === 'file') {
            try {
              const result = await invoke<{ content: string }>('read_text_file', { filePath: file.path })
              const parsed = JSON.parse(result.content)
              const entities = Array.isArray(parsed) ? parsed : [parsed]

              const found = entities.find(
                (e: any) =>
                  e.id === entityId ||
                  (typeof e['@id'] === 'string' && (e['@id'] === `fg:${entityId}` || e['@id'].includes(entityId))),
              )

              if (found) {
                setEntity({
                  id: found.id || entityId,
                  name: found.name || found.label || entityId.split(':')[1] || 'Unknown',
                  email: found.email,
                  role: found.role || found.title,
                  avatar: found.avatar || found.image,
                  description: found.description || found.bio,
                  skills: found.skills || found.tags,
                  worksFor: found.worksFor,
                  links: found.links,
                })
                setIsLoading(false)
                return
              }
            } catch {
              // Continue searching other files
            }
          }
        }

        // Entity not found - create placeholder from ID
        const [, slug] = entityId.split(':')
        setEntity({
          id: entityId,
          name: slug?.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) || 'Unknown',
          description: 'Entity data not found in vault',
        })
      } catch (err) {
        console.error('[PersonNode] Failed to fetch entity:', err)
        setError('Failed to load entity')
      } finally {
        setIsLoading(false)
      }
    }

    fetchEntity()
  }, [entityId, vaultPath])

  const label = entity?.name || data?.label || 'Person'

  if (error) {
    return (
      <div className="p-4 text-center text-destructive bg-card border border-border rounded-lg">
        <p className="text-sm">{error}</p>
      </div>
    )
  }

  return (
    <CanvasNodeWrapper
      id={id}
      selected={selected}
      isEditing={isInteractive}
      onEditingChange={setIsInteractive}
      isMaximized={isMaximized}
      groupColor={groupColor}
      icon={<User className="h-3.5 w-3.5 text-blue-400" />}
      label={label}
      toolbarLeftExtra={isLoading ? <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" /> : undefined}
      minWidth={260}
      minHeight={200}
      selectedRingClass="ring-1 ring-blue-400/30"
      editingRingClass="ring-2 ring-blue-400/70">
      {/* Maximized header */}
      {isMaximized && (
        <MaximizedHeader
          icon={<User className="h-4 w-4 text-blue-400" />}
          label={label}
          extra={isLoading ? <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" /> : undefined}
          onExit={() => window.dispatchEvent(new CustomEvent('canvas-node-maximize', { detail: { id } }))}
        />
      )}

      {/* Card Content */}
      <div
        className={cn(
          'flex-1 min-h-0 overflow-auto p-4',
          isMaximized || isInteractive ? 'nodrag nowheel' : 'pointer-events-none',
        )}>
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : entity ? (
          <div className="flex flex-col items-center text-center gap-3">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-full bg-muted border-2 border-border flex items-center justify-center overflow-hidden">
              {entity.avatar ? (
                <img src={entity.avatar} alt={entity.name} className="w-full h-full object-cover" />
              ) : (
                <User className="h-8 w-8 text-muted-foreground" />
              )}
            </div>

            {/* Name */}
            <div>
              <h3 className="font-semibold text-foreground text-base">{entity.name}</h3>
              {entity.role && (
                <p className="text-xs text-muted-foreground flex items-center justify-center gap-1 mt-0.5">
                  <Briefcase className="h-3 w-3" />
                  {entity.role}
                </p>
              )}
            </div>

            {/* Description */}
            {entity.description && (
              <p className="text-xs text-muted-foreground leading-relaxed max-w-[200px]">{entity.description}</p>
            )}

            {/* Divider */}
            {(entity.email || entity.skills?.length) && <div className="w-12 h-px bg-border" />}

            {/* Email */}
            {entity.email && (
              <a
                href={`mailto:${entity.email}`}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                onClick={(e) => e.stopPropagation()}>
                <Mail className="h-3 w-3" />
                {entity.email}
              </a>
            )}

            {/* Skills/Tags */}
            {entity.skills && entity.skills.length > 0 && (
              <div className="flex flex-wrap gap-1 justify-center max-w-full">
                {entity.skills.slice(0, 4).map((skill) => (
                  <span key={skill} className="px-1.5 py-0.5 text-[10px] bg-muted rounded-md text-muted-foreground">
                    {skill}
                  </span>
                ))}
                {entity.skills.length > 4 && (
                  <span className="px-1.5 py-0.5 text-[10px] text-muted-foreground">+{entity.skills.length - 4}</span>
                )}
              </div>
            )}

            {/* Links */}
            {entity.links && Object.keys(entity.links).length > 0 && (
              <div className="flex items-center gap-2 mt-1">
                {entity.links.website && (
                  <a
                    href={entity.links.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-full border border-border hover:bg-muted transition-colors"
                    onClick={(e) => e.stopPropagation()}>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                  </a>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">No data available</div>
        )}
      </div>
    </CanvasNodeWrapper>
  )
}
