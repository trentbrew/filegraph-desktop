import { describe, it, expect, vi, beforeEach } from 'vitest';
import { KeybindingManager } from './manager';
import { CommandRegistry } from './commands';
import {
  KeybindingContext,
  KeyCategory,
  type KeybindingDefinition,
} from './types';

const createKeyboardEvent = (
  key: string,
  modifiers: Partial<
    Pick<KeyboardEvent, 'metaKey' | 'ctrlKey' | 'altKey' | 'shiftKey'>
  > = {},
): KeyboardEvent => {
  const baseTarget = {
    tagName: 'DIV',
    isContentEditable: false,
  } as HTMLElement;

  return {
    key,
    metaKey: !!modifiers.metaKey,
    ctrlKey: !!modifiers.ctrlKey,
    altKey: !!modifiers.altKey,
    shiftKey: !!modifiers.shiftKey,
    target: baseTarget,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
  } as unknown as KeyboardEvent;
};

describe('KeybindingManager', () => {
  let commands: CommandRegistry;
  let manager: KeybindingManager;
  let context: KeybindingContext;

  const mockContext = (): KeybindingContext => context;

  beforeEach(() => {
    commands = new CommandRegistry();
    context = {
      editorFocus: false,
      fileExplorerFocus: true,
      previewFocus: false,
      layoutMode: 'table',
      hasSelection: false,
      isEditing: false,
      canNavigateBack: true,
      canNavigateForward: true,
      isMarkdownEditor: false,
      hasClipboard: false,
      isFullscreenMode: false
    };
    manager = new KeybindingManager(commands, mockContext);
  });

  it('should execute a simple keybinding', () => {
    const handler = vi.fn();
    commands.register('test.command', handler);
    const binding: KeybindingDefinition = {
      key: 'cmd+s',
      command: 'test.command',
      id: 'test',
      category: KeyCategory.Custom,
      description: 'Test',
      default: 'cmd+s',
    };
    manager.register(binding);

    const event = createKeyboardEvent('s', { metaKey: true });

    const handled = manager.handleKeyUp(event);
    expect(handled).toBe(true);
    expect(handler).toHaveBeenCalled();
  });

  it('should respect "when" context', () => {
    const handler = vi.fn();
    commands.register('test.command', handler);
    const binding: KeybindingDefinition = {
      key: 'cmd+s',
      command: 'test.command',
      when: 'editorFocus',
      id: 'test',
      category: KeyCategory.Custom,
      description: 'Test',
      default: 'cmd+s',
    };
    manager.register(binding);

    // Context: editorFocus = false
    let event = createKeyboardEvent('s', { metaKey: true });
    let handled = manager.handleKeyUp(event);
    expect(handled).toBe(false);
    expect(handler).not.toHaveBeenCalled();

    // Change context
    context.editorFocus = true;
    event = createKeyboardEvent('s', { metaKey: true });
    handled = manager.handleKeyUp(event);
    expect(handled).toBe(true);
    expect(handler).toHaveBeenCalled();
  });

  it('should handle key chords', async () => {
    vi.useFakeTimers();
    const handler = vi.fn();
    commands.register('test.chord', handler);
    const binding: KeybindingDefinition = {
      key: 'cmd+k cmd+s',
      command: 'test.chord',
      id: 'test',
      category: KeyCategory.Custom,
      description: 'Test',
      default: 'cmd+k cmd+s',
    };
    manager.register(binding);

    // First part: cmd+k
    let event = createKeyboardEvent('k', { metaKey: true });
    let handled = manager.handleKeyUp(event);
    expect(handled).toBe(true); // Handled as chord start
    expect(handler).not.toHaveBeenCalled();

    // Second part: cmd+s
    event = createKeyboardEvent('s', { metaKey: true });
    handled = manager.handleKeyUp(event);
    expect(handled).toBe(true);
    expect(handler).toHaveBeenCalled();

    vi.useRealTimers();
  });
});
