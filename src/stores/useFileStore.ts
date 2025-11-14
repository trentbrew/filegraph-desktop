import { create } from 'zustand';
import type { FileItem } from '@/components/app/fileStructure';

interface FileStore {
  // Current state
  currentPath: string;
  pathInput: string;
  data: FileItem[];
  loading: boolean;
  
  // Selection & Preview
  activeItem: FileItem | null;
  selectedItems: Set<string>;
  lastSelectedIndex: number | null;
  
  // Actions
  setCurrentPath: (path: string) => void;
  setPathInput: (path: string) => void;
  setData: (data: FileItem[]) => void;
  setLoading: (loading: boolean) => void;
  setActiveItem: (item: FileItem | null) => void;
  toggleItemSelection: (path: string) => void;
  selectRange: (startIndex: number, endIndex: number, items: FileItem[]) => void;
  clearSelection: () => void;
  setLastSelectedIndex: (index: number | null) => void;
  getSelectedItemPaths: () => string[];
}

export const useFileStore = create<FileStore>((set, get) => ({
  currentPath: '',
  pathInput: '',
  data: [],
  loading: true,
  activeItem: null,
  selectedItems: new Set(),
  lastSelectedIndex: null,
  
  setCurrentPath: (path) => set({ currentPath: path, pathInput: path }),
  setPathInput: (path) => set({ pathInput: path }),
  setData: (data) => set({ data }),
  setLoading: (loading) => set({ loading }),
  setActiveItem: (item) => set({ activeItem: item }),
  
  toggleItemSelection: (path) => {
    set((state) => {
      const newSelection = new Set(state.selectedItems);
      if (newSelection.has(path)) {
        newSelection.delete(path);
      } else {
        newSelection.add(path);
      }
      return { selectedItems: newSelection };
    });
  },
  
  selectRange: (startIndex, endIndex, items) => {
    const start = Math.min(startIndex, endIndex);
    const end = Math.max(startIndex, endIndex);
    const newSelection = new Set<string>();
    
    for (let i = start; i <= end; i++) {
      if (items[i]) {
        newSelection.add(items[i].path);
      }
    }
    
    set({ selectedItems: newSelection });
  },
  
  clearSelection: () => set({ selectedItems: new Set() }),
  
  setLastSelectedIndex: (index) => set({ lastSelectedIndex: index }),
  
  getSelectedItemPaths: () => Array.from(get().selectedItems),
}));
