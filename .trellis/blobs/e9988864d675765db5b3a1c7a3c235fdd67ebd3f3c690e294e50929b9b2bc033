/**
 * Keyboard shortcut manager
 * Handles key event processing, chord sequences, and command execution
 */

import type { Keybinding, KeybindingContext } from './types'
import type { CommandRegistry } from './commands'
import { evaluateExpression } from './expression'

export class KeybindingManager {
  private bindings: Map<string, Keybinding[]> = new Map()
  private chordTimeout: NodeJS.Timeout | null = null
  private currentChord: string | null = null
  private context: KeybindingContext

  constructor(
    private commands: CommandRegistry,
    private contextProvider: () => KeybindingContext,
  ) {
    this.context = contextProvider()
  }

  /**
   * Register a keybinding
   */
  register(binding: Keybinding): void {
    const key = this.normalizeKey(binding.key)
    const existing = this.bindings.get(key) || []

    // Sort by priority (higher priority first)
    existing.push(binding)
    existing.sort((a, b) => (b.priority || 0) - (a.priority || 0))

    this.bindings.set(key, existing)
  }

  /**
   * Register multiple keybindings
   */
  registerMany(bindings: Keybinding[]): void {
    bindings.forEach((b) => this.register(b))
  }

  /**
   * Unregister a keybinding by command
   */
  unregister(command: string): void {
    for (const [key, bindings] of this.bindings.entries()) {
      const filtered = bindings.filter((b) => b.command !== command)
      if (filtered.length === 0) {
        this.bindings.delete(key)
      } else {
        this.bindings.set(key, filtered)
      }
    }
  }

  /**
   * Handle keyboard event
   * Returns true if event was handled
   */
  /**
   * Handle keyboard event
   * Returns true if event was handled
   */
  handleKeyUp(event: KeyboardEvent): boolean {
    const key = this.eventToKey(event)

    // Ignore if typing in input/textarea (unless it's a global shortcut)
    const target = event.target as HTMLElement
    const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable

    // Update context
    this.context = this.contextProvider()

    // Handle key chords
    if (this.currentChord) {
      const chordKey = `${this.currentChord} ${key}`
      const binding = this.findBinding(chordKey)

      this.clearChord()

      if (binding) {
        event.preventDefault()
        event.stopPropagation()
        this.executeBinding(binding)
        return true
      }
      return false
    }

    // Check for chord start
    const chordBindings = this.findChordStart(key)
    if (chordBindings.length > 0) {
      event.preventDefault()
      event.stopPropagation()
      this.startChord(key)
      return true
    }

    // Check for single key binding
    const singleBinding = this.findBinding(key)
    if (singleBinding) {
      // Allow input/textarea to handle their own shortcuts unless explicitly global
      if (isInput && !singleBinding.priority) {
        return false
      }

      event.preventDefault()
      event.stopPropagation()
      this.executeBinding(singleBinding)
      return true
    }

    return false
  }

  /**
   * Start a chord sequence
   */
  private startChord(key: string): void {
    console.log(
      `%c Chord Started: ${key} `,
      'background: #222; color: #bada55; font-size: 12px; padding: 4px; border-radius: 4px;',
    )
    this.currentChord = key

    // Emit chord started event for UI
    window.dispatchEvent(new CustomEvent('chord-started', { detail: { key } }))

    // Clear chord after timeout (2 seconds)
    this.chordTimeout = setTimeout(() => {
      this.clearChord()
    }, 2000)
  }

  /**
   * Clear the current chord
   */
  private clearChord(): void {
    this.currentChord = null

    // Emit chord ended event for UI
    window.dispatchEvent(new CustomEvent('chord-ended'))

    if (this.chordTimeout) {
      clearTimeout(this.chordTimeout)
      this.chordTimeout = null
    }
  }

  /**
   * Locate a binding that matches the given (possibly chorded) key string
   */
  private findBinding(key: string): Keybinding | null {
    const bindings = this.bindings.get(key)
    if (!bindings || bindings.length === 0) {
      return null
    }

    for (const binding of bindings) {
      if (this.evaluateWhen(binding.when)) {
        return binding
      }
    }

    return null
  }

  /**
   * Find bindings whose chord sequence starts with the provided key
   */
  private findChordStart(key: string): Keybinding[] {
    const chordBindings: Keybinding[] = []

    for (const [bindingKey, bindings] of this.bindings.entries()) {
      if (bindingKey.startsWith(`${key} `)) {
        chordBindings.push(...bindings)
      }
    }

    return chordBindings
  }

  /**
   * Evaluate the `when` clause of a keybinding against current context
   */
  private evaluateWhen(when?: string): boolean {
    if (!when) {
      return true
    }

    try {
      return evaluateExpression(when, this.context)
    } catch (error) {
      console.error('Failed to evaluate keybinding condition', { when, error })
      return false
    }
  }

  /**
   * Execute a binding
   */
  private executeBinding(binding: Keybinding): void {
    console.log(
      `%c Command Executed: ${binding.command} (${binding.key}) `,
      'background: #222; color: #00ff00; font-size: 12px; padding: 4px; border-radius: 4px;',
    )

    // Emit command executed event for UI
    window.dispatchEvent(
      new CustomEvent('command-executed', {
        detail: { key: binding.key, command: binding.command },
      }),
    )

    this.commands.execute(binding.command, binding.args)
  }

  /**
   * Convert a KeyboardEvent into a normalized key string
   */
  private eventToKey(event: KeyboardEvent): string {
    const parts: string[] = []

    if (event.ctrlKey) parts.push('ctrl')
    if (event.altKey) parts.push('alt')
    if (event.shiftKey) parts.push('shift')
    if (event.metaKey) parts.push('cmd')

    const keyPart = this.normalizeKeyCode(event.key)
    if (keyPart) {
      parts.push(keyPart)
    }

    return this.normalizeKey(parts.join('+'))
  }

  /**
   * Normalize a key string (single or chord) for consistent storage/comparison
   */
  private normalizeKey(key: string): string {
    if (!key) {
      return ''
    }

    const normalizeChord = (chord: string): string => {
      const tokens = chord
        .split('+')
        .map((token) => token.trim())
        .filter(Boolean)

      const modifiers = new Set<string>()
      let primaryKey = ''

      tokens.forEach((token) => {
        const normalizedToken = token
          .toLowerCase()
          .replace('command', 'cmd')
          .replace('meta', 'cmd')
          .replace('control', 'ctrl')
          .replace('option', 'alt')

        switch (normalizedToken) {
          case 'cmd':
          case 'ctrl':
          case 'alt':
          case 'shift':
            modifiers.add(normalizedToken)
            break
          default:
            primaryKey = this.normalizeKeyCode(normalizedToken)
            break
        }
      })

      const orderedModifiers = ['ctrl', 'alt', 'shift', 'cmd'].filter((mod) => modifiers.has(mod))
      return [...orderedModifiers, primaryKey].filter(Boolean).join('+')
    }

    return key.trim().toLowerCase().split(/\s+/).map(normalizeChord).filter(Boolean).join(' ')
  }

  /**
   * Normalize a raw key code into our canonical representation
   */
  private normalizeKeyCode(key: string): string {
    if (!key) {
      return ''
    }

    const keyMap: Record<string, string> = {
      arrowup: 'up',
      arrowdown: 'down',
      arrowleft: 'left',
      arrowright: 'right',
      escape: 'esc',
      delete: 'delete',
      backspace: 'backspace',
      enter: 'enter',
      ' ': 'space',
      spacebar: 'space',
      tab: 'tab',
    }

    const normalized = key.toLowerCase()
    if (['ctrl', 'control', 'alt', 'option', 'shift', 'cmd', 'meta'].includes(normalized)) {
      return ''
    }

    return keyMap[normalized] || normalized
  }

  // Removed showChordIndicator and hideChordIndicator

  /**
   * Get all registered keybindings
   */
  getAllBindings(): Map<string, Keybinding[]> {
    return new Map(this.bindings)
  }

  /**
   * Clear all keybindings
   */
  clear(): void {
    this.bindings.clear()
    this.clearChord()
  }
}
