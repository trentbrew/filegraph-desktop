import { CommandRegistry } from '../../keybindings/commands'
import { useUIStore } from '@/stores/useUIStore'
import { toast } from 'sonner'

export function registerViewCommands(commands: CommandRegistry) {
  commands.register('view.togglePreview', () => {
    const { previewEnabled, setPreviewEnabled } = useUIStore.getState()
    setPreviewEnabled(!previewEnabled)
    toast.success(previewEnabled ? 'Preview hidden' : 'Preview shown')
  })

  commands.register(
    'view.setLayout',
    (args?: { mode: 'table' | 'grid' | 'columns' | 'tree' | 'graph' | 'whiteboard' }) => {
      if (args?.mode) {
        const { setLayoutMode } = useUIStore.getState()
        setLayoutMode(args.mode)
        toast.success(`Switched to ${args.mode} layout`)
      }
    },
  )

  commands.register('view.toggleDotfiles', () => {
    const { showDotfiles, setShowDotfiles } = useUIStore.getState()
    setShowDotfiles(!showDotfiles)
    toast.success(showDotfiles ? 'Dotfiles hidden' : 'Dotfiles shown')
  })

  // Zoom commands
  commands.register('view.zoomIn', () => {
    const { zoomIn, zoomLevel } = useUIStore.getState()
    zoomIn()
    const newLevel = useUIStore.getState().zoomLevel
    toast.success(`Zoom: ${newLevel}%`)
  })

  commands.register('view.zoomOut', () => {
    const { zoomOut } = useUIStore.getState()
    zoomOut()
    const newLevel = useUIStore.getState().zoomLevel
    toast.success(`Zoom: ${newLevel}%`)
  })

  commands.register('view.zoomReset', () => {
    const { resetZoom } = useUIStore.getState()
    resetZoom()
    toast.success('Zoom: 100%')
  })
}
