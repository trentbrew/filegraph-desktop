import { CommandRegistry } from '../../keybindings/commands'

export function registerTerminalCommands(commands: CommandRegistry) {
  commands.register('terminal.toggle', () => {
    window.dispatchEvent(new CustomEvent('toggle-terminal'))
  })

  commands.register('terminal.new', () => {
    window.dispatchEvent(new CustomEvent('new-terminal'))
  })

  commands.register('terminal.focus', () => {
    window.dispatchEvent(new CustomEvent('focus-terminal'))
  })

  commands.register('terminal.close', () => {
    window.dispatchEvent(new CustomEvent('close-terminal'))
  })

  commands.register('terminal.split', () => {
    window.dispatchEvent(new CustomEvent('split-terminal'))
  })
}
