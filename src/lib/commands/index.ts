import { CommandRegistry } from '../keybindings/commands'
import { registerNavigationCommands } from './modules/navigation'
import { registerFileCommands } from './modules/file'
import { registerViewCommands } from './modules/view'
import { registerSearchCommands, registerEditorCommands } from './modules/search'
import { registerGeneralCommands } from './modules/general'
import { registerSelectionCommands } from './modules/selection'
import { registerTabCommands } from './modules/tab'
import { registerTerminalCommands } from './modules/terminal'

export { CommandRegistry } from '../keybindings/commands'
export * from '../keybindings/types'

export function registerAllCommands(commands: CommandRegistry) {
  registerNavigationCommands(commands)
  registerFileCommands(commands)
  registerViewCommands(commands)
  registerSearchCommands(commands)
  registerEditorCommands(commands)
  registerGeneralCommands(commands)
  registerSelectionCommands(commands)
  registerTabCommands(commands)
  registerTerminalCommands(commands)
}
