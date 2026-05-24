import { CommandRegistry } from '../../keybindings/commands';

export function registerSearchCommands(commands: CommandRegistry) {
  commands.register('search.focus', () => {
    window.dispatchEvent(new CustomEvent('focus-search'));
  });

  commands.register('search.tqlFocus', () => {
    window.dispatchEvent(new CustomEvent('focus-tql-search'));
  });
}

export function registerEditorCommands(commands: CommandRegistry) {
  commands.register('editor.save', () => {
    window.dispatchEvent(new CustomEvent('save-editor'));
  });
}
