/**
 * OnboardingDialog - First-run experience for new users
 *
 * Guides users through vault setup with an opinionated but flexible structure
 */

import * as React from 'react'
import { useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { open } from '@tauri-apps/plugin-dialog'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Folder,
  Users,
  Building2,
  MapPin,
  FileText,
  CheckSquare,
  Briefcase,
  Inbox,
  Layers,
  Loader2,
  CheckCircle2,
  ChevronRight,
  FolderOpen,
} from 'lucide-react'
import { Logo } from '@/components/logo'
import { toast } from 'sonner'
import { initializeVault, getDefaultVaultPath, type VaultInitResult } from '@/lib/vault'
import { cn } from '@/lib/utils'

interface OnboardingDialogProps {
  isOpen: boolean
  onComplete: (vaultPath: string) => void
}

type OnboardingStep = 'welcome' | 'structure' | 'initializing' | 'complete'

const ENTITY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  people: Users,
  orgs: Building2,
  places: MapPin,
  notes: FileText,
  tasks: CheckSquare,
  projects: Briefcase,
}

export function OnboardingDialog({ isOpen, onComplete }: OnboardingDialogProps) {
  const [step, setStep] = useState<OnboardingStep>('welcome')
  const [vaultPath, setVaultPath] = useState('')
  const [useCustomPath, setUseCustomPath] = useState(false)
  const [customPath, setCustomPath] = useState('')
  const [initResult, setInitResult] = useState<VaultInitResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Load default path on mount
  React.useEffect(() => {
    const loadDefaultPath = async () => {
      try {
        const defaultPath = await getDefaultVaultPath()
        setVaultPath(defaultPath)
        setCustomPath(defaultPath)
      } catch (err) {
        console.error('[Onboarding] Failed to get default path:', err)
      }
    }
    if (isOpen) {
      loadDefaultPath()
    }
  }, [isOpen])

  const handleInitialize = async () => {
    setStep('initializing')
    setError(null)

    try {
      const pathToUse = useCustomPath ? customPath : undefined
      const result = await initializeVault(pathToUse)
      setInitResult(result)
      setVaultPath(result.path)
      setStep('complete')

      toast.success('Vault created!', {
        description: `Created ${result.structure_created.length} items`,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to initialize vault'
      setError(message)
      setStep('structure')
      toast.error('Setup failed', { description: message })
    }
  }

  const handleComplete = () => {
    onComplete(vaultPath)
  }

  const handleChooseLocation = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Choose Vault Location',
      })
      if (selected && typeof selected === 'string') {
        // Append .filegraph to the selected directory
        const newPath = selected.endsWith('.filegraph') ? selected : `${selected}/.filegraph`
        setCustomPath(newPath)
        setUseCustomPath(true)
      }
    } catch (err) {
      console.error('[Onboarding] Failed to open folder picker:', err)
    }
  }

  const renderWelcomeStep = () => (
    <div className="flex flex-col items-center text-center space-y-6 py-4">
      <div className="relative">
        <div className="w-20 h-20 rounded-2xl bg-linear-to-br from-primary/20 to-primary/5 flex items-center justify-center">
          <Logo size={40} className="text-primary" />
        </div>
        <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
          <CheckCircle2 className="w-4 h-4 text-white" />
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">Welcome to Filegraph</h2>
        <p className="text-muted-foreground max-w-md">
          Your local-first knowledge graph. Everything stays on your machine—no accounts, no cloud, just your files
          organized your way.
        </p>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Button onClick={() => setStep('structure')} size="lg" className="gap-2">
          Get Started
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )

  const renderStructureStep = () => (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-medium">Your Vault Structure</h3>
        <p className="text-sm text-muted-foreground">
          We'll create an organized starting point. You can customize it anytime.
        </p>
      </div>

      {/* Vault path selector */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Vault Location</span>
          <div className="flex gap-2">
            {useCustomPath && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setUseCustomPath(false)}
                className="text-xs h-auto py-1 text-muted-foreground hover:text-foreground">
                Use default
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleChooseLocation}
              className="text-xs h-auto py-1 text-primary hover:text-primary">
              Choose location
            </Button>
          </div>
        </div>

        <button
          type="button"
          onClick={handleChooseLocation}
          className={cn(
            'w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition-colors',
            'hover:bg-muted/50 hover:border-primary/50',
            useCustomPath ? 'bg-muted/30' : 'bg-muted/50',
          )}>
          <FolderOpen className={cn('w-4 h-4 shrink-0', useCustomPath ? 'text-primary' : 'text-muted-foreground')} />
          <span className={cn('text-sm font-mono truncate', !useCustomPath && 'text-muted-foreground')}>
            {useCustomPath ? customPath : vaultPath}
          </span>
          {!useCustomPath && <span className="text-xs text-muted-foreground ml-auto">(default)</span>}
        </button>
      </div>

      {/* Structure preview */}
      <div className="rounded-lg border bg-card/50 overflow-hidden">
        <div className="px-3 py-2 border-b bg-muted/30">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">What we'll create</span>
        </div>

        <div className="divide-y">
          {/* @entities */}
          <div className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <Layers className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">@entities/</span>
              <span className="text-xs text-muted-foreground">— Your core data types</span>
            </div>
            <div className="grid grid-cols-3 gap-1 ml-6">
              {/*
                For each entity (like 'people', 'orgs', etc.),
                we get its corresponding icon component from ENTITY_ICONS.
                The map gives us [name, Icon], so <Icon /> renders the right icon for each entity.
              */}
              {Object.entries(ENTITY_ICONS).map(([name, Icon]) => (
                <div key={name} className="flex items-center gap-1.5 px-2 py-1 rounded bg-muted/50 text-xs">
                  <Icon className="w-3 h-3 text-muted-foreground" />
                  <span>{name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* @collections */}
          <div className="p-3 flex items-center gap-2">
            <Folder className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-medium">@collections/</span>
            <span className="text-xs text-muted-foreground">— Custom datasets you create</span>
          </div>

          {/* inbox */}
          <div className="p-3 flex items-center gap-2">
            <Inbox className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium">inbox/</span>
            <span className="text-xs text-muted-foreground">— Quick capture landing zone</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <Button variant="outline" onClick={() => setStep('welcome')}>
          Back
        </Button>
        <Button onClick={handleInitialize} className="gap-2">
          Create Vault
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )

  const renderInitializingStep = () => (
    <div className="flex flex-col items-center justify-center py-12 space-y-4">
      <div className="relative">
        <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      </div>
      <div className="text-center space-y-1">
        <p className="font-medium">Setting up your vault...</p>
        <p className="text-sm text-muted-foreground">Creating folders and config files</p>
      </div>
    </div>
  )

  const renderCompleteStep = () => (
    <div className="flex flex-col items-center text-center space-y-6 py-4">
      <div className="relative">
        <div className="w-20 h-20 rounded-2xl bg-green-500/10 flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10 text-green-500" />
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">You're all set!</h2>
        <p className="text-muted-foreground max-w-md">
          Your vault is ready at <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{vaultPath}</code>
        </p>
      </div>

      {initResult && initResult.structure_created.length > 0 && (
        <div className="w-full max-w-sm text-left">
          <p className="text-xs text-muted-foreground mb-2">Created {initResult.structure_created.length} items</p>
          <div className="max-h-32 overflow-y-auto rounded-lg border bg-muted/30 p-2">
            {initResult.structure_created.slice(0, 10).map((path, i) => (
              <div key={i} className="text-xs font-mono text-muted-foreground truncate py-0.5">
                {path.replace(vaultPath, '~')}
              </div>
            ))}
            {initResult.structure_created.length > 10 && (
              <div className="text-xs text-muted-foreground pt-1">
                ...and {initResult.structure_created.length - 10} more
              </div>
            )}
          </div>
        </div>
      )}

      <Button onClick={handleComplete} size="lg" className="gap-2">
        Start Exploring
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  )

  const renderStep = () => {
    switch (step) {
      case 'welcome':
        return renderWelcomeStep()
      case 'structure':
        return renderStructureStep()
      case 'initializing':
        return renderInitializingStep()
      case 'complete':
        return renderCompleteStep()
    }
  }

  // Prevent closing during initialization
  const handleOpenChange = (open: boolean) => {
    if (!open && step === 'initializing') return
    // Don't allow closing - user must complete setup
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        className={cn('max-w-lg', step === 'initializing' && 'pointer-events-none')}
        // Hide close button during onboarding
        showCloseButton={false}>
        <DialogHeader className="sr-only">
          <DialogTitle>Welcome to Filegraph</DialogTitle>
          <DialogDescription>Set up your local knowledge vault</DialogDescription>
        </DialogHeader>

        {renderStep()}
      </DialogContent>
    </Dialog>
  )
}
