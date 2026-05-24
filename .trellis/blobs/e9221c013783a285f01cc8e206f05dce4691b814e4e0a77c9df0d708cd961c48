import { useTabStore } from '@/stores/useTabStore';
import { usePersistence } from './usePersistence';

const TAB_STORAGE_FILE = 'tabs.json';

/**
 * Hook to handle manual tab persistence using Tauri file I/O
 * Call this once at the app root to enable persistence
 */
export function useTabPersistence() {
  usePersistence(useTabStore, {
    filename: TAB_STORAGE_FILE,
    selector: (state) => ({
      tabs: state.tabs,
      activeTabId: state.activeTabId,
    }),
  });
}
