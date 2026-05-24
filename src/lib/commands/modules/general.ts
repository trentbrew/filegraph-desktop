import { CommandRegistry } from '../../keybindings/commands'
import { toast } from 'sonner'

export function registerGeneralCommands(commands: CommandRegistry) {
  commands.register('commands.openPalette', () => {
    window.dispatchEvent(new CustomEvent('open-command-palette'))
  })

  commands.register('commands.openSettings', () => {
    window.dispatchEvent(new CustomEvent('open-settings'))
  })

  commands.register('commands.openKeybindings', () => {
    window.dispatchEvent(new CustomEvent('open-keybindings'))
  })

  commands.register('window.reload', () => {
    window.location.reload()
  })

  commands.register('settings.openGlobal', async () => {
    await openGlobalSettings()
  })
}

async function getHomeDir(): Promise<string> {
  const { homeDir } = await import('@tauri-apps/api/path')
  return await homeDir()
}

export async function openGlobalSettings(): Promise<void> {
  const { invoke } = await import('@tauri-apps/api/core')
  const home = await getHomeDir()
  const settingsPath = `${home}/.filegraph/.filegraph/global.settings`

  try {
    // Try to read the file first to check if it exists
    let fileExists = true
    try {
      await invoke<string>('read_text_file', { filePath: settingsPath })
    } catch {
      fileExists = false
    }

    if (!fileExists) {
      // Create default settings file
      const defaultSettings = {
        $schema: 'https://filegraph.app/schemas/settings.json',
        version: '1.0.0',
        appearance: {
          theme: 'system',
          density: 'comfortable',
        },
        fileExplorer: {
          showDotfiles: false,
          confirmDelete: true,
          defaultView: 'table',
        },
        editor: {
          fontSize: 14,
          fontFamily: 'monospace',
          tabSize: 2,
          wordWrap: true,
        },
        keybindings: {
          preset: 'default',
        },
      }

      await invoke('write_text_file', {
        filePath: settingsPath,
        content: JSON.stringify(defaultSettings, null, 2),
      })

      toast.success('Created global settings file')
    }

    // Open the settings file
    window.dispatchEvent(new CustomEvent('open-file', { detail: { path: settingsPath } }))
  } catch (error) {
    console.error('Failed to open settings:', error)
    toast.error('Failed to open settings file')
  }
}
