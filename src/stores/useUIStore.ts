import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { LayoutMode } from '@/components/app/navigation';

interface UIStore {
  // Layout & Display
  layoutMode: LayoutMode;
  previewEnabled: boolean;
  showDotfiles: boolean;
  
  // Search
  searchValue: string;
  
  // Actions
  setLayoutMode: (mode: LayoutMode) => void;
  setPreviewEnabled: (enabled: boolean) => void;
  setShowDotfiles: (show: boolean) => void;
  setSearchValue: (value: string) => void;
  clearSearch: () => void;
}

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      layoutMode: 'tree',
      previewEnabled: true,
      showDotfiles: true,
      searchValue: '',
      
      setLayoutMode: (mode) => set({ layoutMode: mode }),
      setPreviewEnabled: (enabled) => set({ previewEnabled: enabled }),
      setShowDotfiles: (show) => set({ showDotfiles: show }),
      setSearchValue: (value) => set({ searchValue: value }),
      clearSearch: () => set({ searchValue: '' }),
    }),
    {
      name: 'file-explorer-ui',
      partialize: (state) => ({
        layoutMode: state.layoutMode,
        previewEnabled: state.previewEnabled,
        showDotfiles: state.showDotfiles,
      }),
    }
  )
);
