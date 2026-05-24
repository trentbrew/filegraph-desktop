/**
 * Keybinding persistence store
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Keybinding } from '@/lib/keybindings/types';

interface KeybindingStore {
  customBindings: Keybinding[];
  disabledBindings: string[];

  addBinding: (binding: Keybinding) => void;
  removeBinding: (command: string) => void;
  updateBinding: (command: string, binding: Partial<Keybinding>) => void;
  disableBinding: (command: string) => void;
  enableBinding: (command: string) => void;
  resetToDefaults: () => void;
}

export const useKeybindingStore = create<KeybindingStore>()(
  persist(
    (set) => ({
      customBindings: [],
      disabledBindings: [],

      addBinding: (binding) =>
        set((state) => ({
          customBindings: [...state.customBindings, binding],
        })),

      removeBinding: (command) =>
        set((state) => ({
          customBindings: state.customBindings.filter(
            (b) => b.command !== command
          ),
        })),

      updateBinding: (command, updates) =>
        set((state) => ({
          customBindings: state.customBindings.map((b) =>
            b.command === command ? { ...b, ...updates } : b
          ),
        })),

      disableBinding: (command) =>
        set((state) => ({
          disabledBindings: [...state.disabledBindings, command],
        })),

      enableBinding: (command) =>
        set((state) => ({
          disabledBindings: state.disabledBindings.filter((c) => c !== command),
        })),

      resetToDefaults: () =>
        set({ customBindings: [], disabledBindings: [] }),
    }),
    {
      name: 'keybindings-storage',
    }
  )
);
