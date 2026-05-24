/**
 * Profile Settings
 * User identity and agent preferences for personalized interactions
 */

import * as React from 'react'
import { invoke } from '@tauri-apps/api/core'
import { useVault } from '@/contexts/VaultContext'
import { Plus, X, Loader2, Brain, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'

interface UserProfile {
  '@type': string
  identity: {
    name: string
    pronouns: string
    role: string
    location: string
    timezone: string
  }
  personality: {
    communication_style: string
    learning_style: string
    decision_making: string
    work_style: string
  }
  preferences: {
    agent_behavior: string[]
    response_format: string[]
    avoid: string[]
  }
  background: {
    summary: string
    expertise: string[]
    interests: string[]
  }
  goals: {
    long_term: string[]
  }
  context: {
    current_focus: string
    notes: string
  }
}

interface Memory {
  id: string
  created_at: string
  content: string
  importance: number
  category: string
  tags: string[]
}

const DEFAULT_PROFILE: UserProfile = {
  '@type': 'UserProfile',
  identity: {
    name: '',
    pronouns: '',
    role: '',
    location: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  },
  personality: {
    communication_style: '',
    learning_style: '',
    decision_making: '',
    work_style: '',
  },
  preferences: {
    agent_behavior: [],
    response_format: [],
    avoid: [],
  },
  background: {
    summary: '',
    expertise: [],
    interests: [],
  },
  goals: {
    long_term: [],
  },
  context: {
    current_focus: '',
    notes: '',
  },
}

export function ProfileSettings() {
  const { vaultPath } = useVault()
  const profileFilePath = vaultPath ? `${vaultPath}/@system/user-profile.data` : null
  const memoriesFilePath = vaultPath ? `${vaultPath}/@system/memories.data` : null

  const [profile, setProfile] = React.useState<UserProfile>(DEFAULT_PROFILE)
  const [memories, setMemories] = React.useState<Memory[]>([])
  const [loading, setLoading] = React.useState(true)

  // Load profile and memories
  React.useEffect(() => {
    if (!profileFilePath) {
      setLoading(false)
      return
    }

    let cancelled = false
    const load = async () => {
      setLoading(true)

      // Load profile
      try {
        const result = await invoke<{ content: string }>('read_text_file', { filePath: profileFilePath })
        if (!cancelled) {
          const parsed = JSON.parse(result.content)
          setProfile({ ...DEFAULT_PROFILE, ...parsed })
        }
      } catch {
        if (!cancelled) setProfile(DEFAULT_PROFILE)
      }

      // Load memories
      if (memoriesFilePath) {
        try {
          const result = await invoke<{ content: string }>('read_text_file', { filePath: memoriesFilePath })
          if (!cancelled) {
            const parsed = JSON.parse(result.content)
            setMemories(parsed.memories || [])
          }
        } catch {
          if (!cancelled) setMemories([])
        }
      }

      if (!cancelled) setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [profileFilePath, memoriesFilePath])

  // Auto-save profile on change (debounced)
  const saveTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  React.useEffect(() => {
    if (!profileFilePath || !vaultPath || loading) return

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await invoke('create_directory', { path: `${vaultPath}/@system` }).catch((_e) => {
          /* may exist */
        })
        await invoke('write_text_file', {
          filePath: profileFilePath,
          content: JSON.stringify(profile, null, 2),
        })
      } catch (err) {
        console.error('Failed to save profile:', err)
      }
    }, 500)

    return () => clearTimeout(saveTimeoutRef.current)
  }, [profile, profileFilePath, vaultPath, loading])

  // Update profile field
  const updateField = (section: keyof UserProfile, field: string, value: string) => {
    setProfile((prev) => {
      const sectionData = prev[section]
      if (typeof sectionData === 'object' && sectionData !== null) {
        return { ...prev, [section]: { ...sectionData, [field]: value } }
      }
      return prev
    })
  }

  // Add/remove array items
  const addToArray = (section: keyof UserProfile, field: string, value: string) => {
    if (!value.trim()) return
    setProfile((prev) => {
      const sectionData = prev[section] as Record<string, unknown>
      const arr = (sectionData[field] as string[]) || []
      return { ...prev, [section]: { ...sectionData, [field]: [...arr, value.trim()] } }
    })
  }

  const removeFromArray = (section: keyof UserProfile, field: string, index: number) => {
    setProfile((prev) => {
      const sectionData = prev[section] as Record<string, unknown>
      const arr = (sectionData[field] as string[]) || []
      return { ...prev, [section]: { ...sectionData, [field]: arr.filter((_, i) => i !== index) } }
    })
  }

  // Delete memory
  const deleteMemory = async (memoryId: string) => {
    if (!memoriesFilePath) return
    const updated = memories.filter((m) => m.id !== memoryId)
    setMemories(updated)
    try {
      await invoke('write_text_file', {
        filePath: memoriesFilePath,
        content: JSON.stringify({ '@type': 'AgentMemories', memories: updated }, null, 2),
      })
    } catch (err) {
      console.error('Failed to save memories:', err)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <p className="text-sm text-muted-foreground">
        Help the agent understand you better. This information personalizes how it interacts with you.
      </p>

      <Accordion type="multiple" defaultValue={['identity', 'preferences']} className="space-y-2">
        {/* Identity */}
        <AccordionItem value="identity" className="border rounded-lg px-4">
          <AccordionTrigger className="text-sm font-medium">Identity</AccordionTrigger>
          <AccordionContent className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Name</Label>
                <Input
                  value={profile.identity.name}
                  onChange={(e) => updateField('identity', 'name', e.target.value)}
                  placeholder="Your name"
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Pronouns</Label>
                <Input
                  value={profile.identity.pronouns}
                  onChange={(e) => updateField('identity', 'pronouns', e.target.value)}
                  placeholder="e.g., they/them"
                  className="h-8 text-sm"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Role / Title</Label>
              <Input
                value={profile.identity.role}
                onChange={(e) => updateField('identity', 'role', e.target.value)}
                placeholder="e.g., Designer & Developer"
                className="h-8 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Location</Label>
                <Input
                  value={profile.identity.location}
                  onChange={(e) => updateField('identity', 'location', e.target.value)}
                  placeholder="e.g., Chicago, IL"
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Timezone</Label>
                <Input
                  value={profile.identity.timezone}
                  onChange={(e) => updateField('identity', 'timezone', e.target.value)}
                  placeholder="e.g., America/Chicago"
                  className="h-8 text-sm"
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Agent Preferences */}
        <AccordionItem value="preferences" className="border rounded-lg px-4">
          <AccordionTrigger className="text-sm font-medium">Agent Preferences</AccordionTrigger>
          <AccordionContent className="space-y-4 pt-2">
            <ArrayField
              label="How should the agent behave?"
              items={profile.preferences.agent_behavior}
              onAdd={(v) => addToArray('preferences', 'agent_behavior', v)}
              onRemove={(i) => removeFromArray('preferences', 'agent_behavior', i)}
              placeholder="e.g., Be concise and direct"
            />
            <ArrayField
              label="Response format preferences"
              items={profile.preferences.response_format}
              onAdd={(v) => addToArray('preferences', 'response_format', v)}
              onRemove={(i) => removeFromArray('preferences', 'response_format', i)}
              placeholder="e.g., Use bullet points"
            />
            <ArrayField
              label="Things to avoid"
              items={profile.preferences.avoid}
              onAdd={(v) => addToArray('preferences', 'avoid', v)}
              onRemove={(i) => removeFromArray('preferences', 'avoid', i)}
              placeholder="e.g., Excessive pleasantries"
            />
          </AccordionContent>
        </AccordionItem>

        {/* Background */}
        <AccordionItem value="background" className="border rounded-lg px-4">
          <AccordionTrigger className="text-sm font-medium">Background</AccordionTrigger>
          <AccordionContent className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Summary</Label>
              <Textarea
                value={profile.background.summary}
                onChange={(e) => updateField('background', 'summary', e.target.value)}
                placeholder="A brief description of who you are..."
                className="text-sm min-h-[60px]"
                rows={2}
              />
            </div>
            <ArrayField
              label="Expertise"
              items={profile.background.expertise}
              onAdd={(v) => addToArray('background', 'expertise', v)}
              onRemove={(i) => removeFromArray('background', 'expertise', i)}
              placeholder="e.g., UI/UX Design"
            />
            <ArrayField
              label="Interests"
              items={profile.background.interests}
              onAdd={(v) => addToArray('background', 'interests', v)}
              onRemove={(i) => removeFromArray('background', 'interests', i)}
              placeholder="e.g., Personal knowledge management"
            />
          </AccordionContent>
        </AccordionItem>

        {/* Goals */}
        <AccordionItem value="goals" className="border rounded-lg px-4">
          <AccordionTrigger className="text-sm font-medium">Goals & Focus</AccordionTrigger>
          <AccordionContent className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Current Focus</Label>
              <Textarea
                value={profile.context.current_focus}
                onChange={(e) => updateField('context', 'current_focus', e.target.value)}
                placeholder="What are you currently working on?"
                className="text-sm min-h-[40px]"
                rows={1}
              />
            </div>
            <ArrayField
              label="Long-term goals"
              items={profile.goals.long_term}
              onAdd={(v) => addToArray('goals', 'long_term', v)}
              onRemove={(i) => removeFromArray('goals', 'long_term', i)}
              placeholder="e.g., Build a sustainable indie business"
            />
          </AccordionContent>
        </AccordionItem>

        {/* Agent Memories */}
        <AccordionItem value="memories" className="border rounded-lg px-4">
          <AccordionTrigger className="text-sm font-medium">
            <span className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Agent Memories ({memories.length})
            </span>
          </AccordionTrigger>
          <AccordionContent className="pt-2">
            {memories.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">
                The agent will save important information here as you interact.
              </p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {memories.map((memory) => (
                  <div key={memory.id} className="group flex items-start gap-2 p-2 rounded-md bg-muted/50 text-xs">
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground">{memory.content}</p>
                      <div className="flex items-center gap-1.5 mt-1 text-muted-foreground">
                        <Badge variant="outline" className="text-[10px] h-4 px-1">
                          {memory.category}
                        </Badge>
                        <span>{Math.round(memory.importance * 100)}%</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0"
                      onClick={() => deleteMemory(memory.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
}

// Helper component for array fields
function ArrayField({
  label,
  items,
  onAdd,
  onRemove,
  placeholder,
}: {
  label: string
  items: string[]
  onAdd: (value: string) => void
  onRemove: (index: number) => void
  placeholder: string
}) {
  const [value, setValue] = React.useState('')

  const handleAdd = () => {
    if (value.trim()) {
      onAdd(value)
      setValue('')
    }
  }

  return (
    <div className="space-y-2">
      <Label className="text-xs">{label}</Label>
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAdd())}
          placeholder={placeholder}
          className="h-8 text-sm"
        />
        <Button onClick={handleAdd} size="icon" variant="outline" className="h-8 w-8 shrink-0">
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
      {items.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {items.map((item, i) => (
            <Badge key={i} variant="secondary" className="pl-2 pr-1 py-0.5 gap-1 text-xs">
              {item}
              <button onClick={() => onRemove(i)} className="hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
