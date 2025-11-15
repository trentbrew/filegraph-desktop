import { create } from 'zustand';

export type ClipboardOperation = 'copy' | 'cut' | null;

interface ClipboardState {
  items: string[];
  operation: ClipboardOperation;
  setClipboard: (items: string[], operation: Exclude<ClipboardOperation, null>) => void;
  clearClipboard: () => void;
}

export const useClipboardStore = create<ClipboardState>((set) => ({
  items: [],
  operation: null,
  setClipboard: (items, operation) => set({ items: [...items], operation }),
  clearClipboard: () => set({ items: [], operation: null }),
}));
