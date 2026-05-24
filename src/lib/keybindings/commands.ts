/**
 * Command registry for executing keyboard shortcut actions
 */

import type { CommandHandler } from './types';

export class CommandRegistry {
  private commands: Map<string, CommandHandler> = new Map();

  /**
   * Register a command handler
   */
  register(commandId: string, handler: CommandHandler): void {
    if (this.commands.has(commandId)) {
      console.warn(`Command "${commandId}" is already registered. Overwriting.`);
    }
    this.commands.set(commandId, handler);
  }

  /**
   * Register multiple command handlers at once
   */
  registerMany(
    commands: Record<string, CommandHandler>
  ): void {
    Object.entries(commands).forEach(([id, handler]) => {
      this.register(id, handler);
    });
  }

  /**
   * Execute a command by ID
   */
  async execute(commandId: string, args?: any): Promise<void> {
    const handler = this.commands.get(commandId);
    
    if (!handler) {
      console.warn(`Command not found: ${commandId}`);
      return;
    }

    try {
      await handler(args);
    } catch (error) {
      console.error(`Error executing command ${commandId}:`, error);
      throw error;
    }
  }

  /**
   * Check if a command is registered
   */
  has(commandId: string): boolean {
    return this.commands.has(commandId);
  }

  /**
   * Get all registered command IDs
   */
  getAll(): string[] {
    return Array.from(this.commands.keys());
  }

  /**
   * Unregister a command
   */
  unregister(commandId: string): boolean {
    return this.commands.delete(commandId);
  }

  /**
   * Clear all registered commands
   */
  clear(): void {
    this.commands.clear();
  }
}
