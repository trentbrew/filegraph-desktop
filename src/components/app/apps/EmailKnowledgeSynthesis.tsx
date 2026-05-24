/**
 * EmailKnowledgeSynthesis - Inline component for synthesizing knowledge from emails
 *
 * Shows extracted entities (people, projects, dates) and allows quick creation
 * with visual feedback when entities are saved.
 */

import React from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, UserPlus, Calendar, FolderKanban, CheckCircle2, XCircle, Sparkles } from 'lucide-react'
import { invoke } from '@tauri-apps/api/core'
import { join } from '@tauri-apps/api/path'
import { cn } from '@/lib/utils'
import { useModelProvider } from '@/features/agent/hooks/useModelProvider'
import { useVault } from '@/contexts/VaultContext'
import { NAMESPACES } from '@/lib/namespaces'
import type { EmailListItem } from './InboxApp'

interface ExtractedEntity {
  type: 'person' | 'project' | 'date' | 'organization'
  name: string
  value: string
  context?: string
}

interface SynthesisState {
  isAnalyzing: boolean
  extracted: ExtractedEntity[]
  created: Set<string> // IDs of successfully created entities
  errors: Map<string, string> // entity name -> error message
}

interface EmailKnowledgeSynthesisProps {
  email: EmailListItem
  onEntityCreated?: (entityType: string, entityName: string) => void
}

// Persist synthesized entities in localStorage
const STORAGE_KEY = 'email-knowledge-synthesis'

function getPersistedEntities(emailId: string): Set<string> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const data = JSON.parse(stored)
      return new Set(data[emailId] || [])
    }
  } catch (e) {
    console.error('[EmailKnowledgeSynthesis] Failed to load persisted entities:', e)
  }
  return new Set()
}

function persistEntity(emailId: string, entityKey: string) {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    const data = stored ? JSON.parse(stored) : {}
    if (!data[emailId]) {
      data[emailId] = []
    }
    if (!data[emailId].includes(entityKey)) {
      data[emailId].push(entityKey)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    }
  } catch (e) {
    console.error('[EmailKnowledgeSynthesis] Failed to persist entity:', e)
  }
}

export function EmailKnowledgeSynthesis({ email, onEntityCreated }: EmailKnowledgeSynthesisProps) {
  const { sendMessage } = useModelProvider()
  const { vaultPath } = useVault()
  const [state, setState] = React.useState<SynthesisState>({
    isAnalyzing: false,
    extracted: [],
    created: getPersistedEntities(email.id),
    errors: new Map(),
  })
  const [existingEntities, setExistingEntities] = React.useState<Set<string>>(new Set())

  // Extract person info from email "From" field
  const extractPersonFromEmail = React.useCallback(
    (fromField: string): ExtractedEntity | null => {
      // Parse "Name <email@domain.com>" or "email@domain.com"
      const emailMatch = fromField.match(/(.+?)\s*<(.+?)>/)
      if (emailMatch) {
        const name = emailMatch[1].trim()
        const emailAddr = emailMatch[2].trim()
        return {
          type: 'person',
          name: name || emailAddr.split('@')[0],
          value: emailAddr,
          context: `Email sender from "${email.subject}"`,
        }
      }
      // Try to extract email from plain text
      const plainEmailMatch = fromField.match(/([^\s<>]+@[^\s<>]+)/)
      if (plainEmailMatch) {
        return {
          type: 'person',
          name: plainEmailMatch[1].split('@')[0],
          value: plainEmailMatch[1],
          context: `Email sender from "${email.subject}"`,
        }
      }
      return null
    },
    [email.subject],
  )

  // Analyze email for entities
  const analyzeEmail = React.useCallback(async () => {
    setState((prev) => ({ ...prev, isAnalyzing: true, extracted: [] }))

    const extracted: ExtractedEntity[] = []

    // Extract person from "From" field
    const person = extractPersonFromEmail(email.from)
    if (person) {
      extracted.push(person)
    }

    // Extract dates from subject/snippet (simple pattern matching)
    const datePatterns = [
      /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th)?(?:,\s+\d{4})?\b/gi,
      /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g,
      /\b\d{1,2}-\d{1,2}-\d{2,4}\b/g,
    ]

    const textToSearch = `${email.subject} ${email.snippet}`
    for (const pattern of datePatterns) {
      const matches = textToSearch.match(pattern)
      if (matches) {
        matches.forEach((match) => {
          extracted.push({
            type: 'date',
            name: match,
            value: match,
            context: `Found in email about "${email.subject}"`,
          })
        })
      }
    }

    // Extract potential project names (words in ALL CAPS or Title Case in subject)
    const projectPattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g
    const projectMatches = email.subject.match(projectPattern)
    if (projectMatches && projectMatches.length > 0) {
      // Filter out common words
      const commonWords = ['The', 'And', 'For', 'With', 'From', 'To', 'About', 'Re']
      projectMatches.forEach((match: string) => {
        if (!commonWords.includes(match) && match.length > 3) {
          extracted.push({
            type: 'project',
            name: match,
            value: match,
            context: `Mentioned in email subject`,
          })
        }
      })
    }

    setState((prev) => ({ ...prev, extracted, isAnalyzing: false }))
  }, [email, extractPersonFromEmail])

  // Create entity via agent
  const createEntity = React.useCallback(
    async (entity: ExtractedEntity) => {
      const entityKey = `${entity.type}:${entity.name}`

      setState((prev) => ({
        ...prev,
        errors: new Map(prev.errors).set(entityKey, ''),
      }))

      try {
        let prompt = ''

        if (entity.type === 'person') {
          prompt = `Create a person entity for "${entity.name}" (email: ${entity.value}) from the email "${email.subject}". ${entity.context || ''}`
        } else if (entity.type === 'project') {
          prompt = `Create a project entity for "${entity.name}" mentioned in the email "${email.subject}". ${entity.context || ''}`
        } else if (entity.type === 'date') {
          prompt = `Note the important date "${entity.name}" from the email "${email.subject}". ${entity.context || ''}`
        } else if (entity.type === 'organization') {
          prompt = `Create an organization entity for "${entity.name}" from the email "${email.subject}". ${entity.context || ''}`
        }

        // Send message to agent to create the entity
        await sendMessage(prompt)

        // Mark as created (optimistic - we'll verify via feedback)
        setState((prev) => {
          const newCreated = new Set(prev.created).add(entityKey)
          persistEntity(email.id, entityKey)
          return {
            ...prev,
            created: newCreated,
          }
        })

        if (onEntityCreated) {
          onEntityCreated(entity.type, entity.name)
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Failed to create entity'
        setState((prev) => ({
          ...prev,
          errors: new Map(prev.errors).set(entityKey, errorMsg),
          created: new Set(Array.from(prev.created).filter((k) => k !== entityKey)),
        }))
      }
    },
    [email.subject, sendMessage, onEntityCreated],
  )

  // Check for existing entities in vault
  const checkExistingEntities = React.useCallback(async () => {
    if (!vaultPath) return

    const existing = new Set<string>()

    try {
      // Check people
      const peoplePath = await join(vaultPath, NAMESPACES.person.file)
      try {
        const response = await invoke<{ content: string }>('read_text_file', { filePath: peoplePath })
        const data = JSON.parse(response.content)
        const items = data.items || data['@graph'] || []
        items.forEach((item: any) => {
          if (item.name) {
            existing.add(`person:${item.name.toLowerCase()}`)
            if (item.email) {
              existing.add(`person:${item.email.toLowerCase()}`)
            }
          }
        })
      } catch {
        // File doesn't exist or can't be read
      }

      // Check projects
      const projectsPath = await join(vaultPath, NAMESPACES.proj.file)
      try {
        const response = await invoke<{ content: string }>('read_text_file', { filePath: projectsPath })
        const data = JSON.parse(response.content)
        const items = data.items || data['@graph'] || []
        items.forEach((item: any) => {
          if (item.name || item.title) {
            existing.add(`project:${(item.name || item.title).toLowerCase()}`)
          }
        })
      } catch {
        // File doesn't exist or can't be read
      }

      // Check organizations
      const orgsPath = await join(vaultPath, NAMESPACES.org.file)
      try {
        const response = await invoke<{ content: string }>('read_text_file', { filePath: orgsPath })
        const data = JSON.parse(response.content)
        const items = data.items || data['@graph'] || []
        items.forEach((item: any) => {
          if (item.name || item.title) {
            existing.add(`organization:${(item.name || item.title).toLowerCase()}`)
          }
        })
      } catch {
        // File doesn't exist or can't be read
      }

      setExistingEntities(existing)
    } catch (err) {
      console.error('[EmailKnowledgeSynthesis] Failed to check existing entities:', err)
    }
  }, [vaultPath])

  // Auto-analyze on mount and check existing entities
  React.useEffect(() => {
    checkExistingEntities()
    analyzeEmail()
  }, [analyzeEmail, checkExistingEntities])

  if (state.extracted.length === 0 && !state.isAnalyzing) {
    return null
  }

  const getEntityIcon = (type: ExtractedEntity['type']) => {
    switch (type) {
      case 'person':
        return UserPlus
      case 'project':
        return FolderKanban
      case 'date':
        return Calendar
      case 'organization':
        return FolderKanban
      default:
        return Sparkles
    }
  }

  const getEntityColor = (type: ExtractedEntity['type']) => {
    switch (type) {
      case 'person':
        return 'bg-blue-500/10 text-blue-600 border-blue-200'
      case 'project':
        return 'bg-purple-500/10 text-purple-600 border-purple-200'
      case 'date':
        return 'bg-orange-500/10 text-orange-600 border-orange-200'
      case 'organization':
        return 'bg-green-500/10 text-green-600 border-green-200'
      default:
        return 'bg-gray-500/10 text-gray-600 border-gray-200'
    }
  }

  // Filter out already created entities and entities that already exist in vault
  const displayEntities = state.extracted.filter((entity) => {
    const entityKey = `${entity.type}:${entity.name}`
    // Don't show if already created in this session
    if (state.created.has(entityKey)) return false

    // Check if entity already exists in vault (case-insensitive)
    const normalizedKey = `${entity.type}:${entity.name.toLowerCase()}`
    if (existingEntities.has(normalizedKey)) return false

    // For person entities, also check by email
    if (entity.type === 'person' && entity.value) {
      const emailKey = `person:${entity.value.toLowerCase()}`
      if (existingEntities.has(emailKey)) return false
    }

    return true
  })

  // If all entities are created, don't show the component
  if (state.extracted.length > 0 && displayEntities.length === 0 && !state.isAnalyzing) {
    return null
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      <Card className="p-4 space-y-3 border-dashed bg-gradient-to-br from-primary/5 to-primary/0">
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}>
            <Sparkles className="h-4 w-4 text-primary" />
          </motion.div>
          <h4 className="text-sm font-semibold">Knowledge Synthesis</h4>
          {state.isAnalyzing && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
        </div>

        {displayEntities.length > 0 && (
          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {displayEntities.map((entity, idx) => {
                const Icon = getEntityIcon(entity.type)
                const entityKey = `${entity.type}:${entity.name}`
                const isCreated = state.created.has(entityKey)
                const error = state.errors.get(entityKey)

                return (
                  <motion.div
                    key={entityKey}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.2, delay: idx * 0.05 }}
                    className={cn(
                      'flex items-center justify-between gap-2 p-3 rounded-lg border transition-all duration-200',
                      isCreated
                        ? 'bg-green-500/10 border-green-500/30 opacity-60'
                        : error
                          ? 'bg-red-500/10 border-red-500/30'
                          : 'bg-background/50 border-border hover:bg-background hover:shadow-sm',
                    )}>
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <motion.div
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        transition={{ type: 'spring', stiffness: 400 }}>
                        <Icon className={cn('h-4 w-4 shrink-0', getEntityColor(entity.type).split(' ')[1])} />
                      </motion.div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className={cn('text-xs', getEntityColor(entity.type))}>
                            {entity.type}
                          </Badge>
                          <span className="text-sm font-semibold truncate">{entity.name}</span>
                        </div>
                        {entity.context && (
                          <p className="text-xs text-muted-foreground truncate mt-1">{entity.context}</p>
                        )}
                        {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
                      </div>
                    </div>
                    {isCreated ? (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 25 }}>
                        <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                      </motion.div>
                    ) : (
                      <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => createEntity(entity)}
                          disabled={state.isAnalyzing}
                          className="shrink-0">
                          <UserPlus className="h-3.5 w-3.5" />
                        </Button>
                      </motion.div>
                    )}
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}

        {displayEntities.length === 0 && state.isAnalyzing && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-muted-foreground">
            Analyzing email for entities...
          </motion.p>
        )}
      </Card>
    </motion.div>
  )
}
