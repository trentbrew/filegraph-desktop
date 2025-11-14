import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { invoke } from '@tauri-apps/api/core';

export interface TabData {
  id: string;
  title: string;
  path: string;
  navigationHistory: string[];
  historyIndex: number;
}

interface TabStore {
  tabs: TabData[];
  activeTabId: string;
  
  // Computed
  activeTab: TabData | undefined;
  
  // Actions
  addTab: (path?: string) => Promise<void>;
  removeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  updateTab: (tabId: string, updates: Partial<TabData>) => void;
  navigateInTab: (tabId: string, path: string) => void;
  navigateBack: (tabId: string) => void;
  canNavigateBack: (tabId: string) => boolean;
}

export const useTabStore = create<TabStore>()(
  persist(
    (set, get) => ({
      tabs: [],
      activeTabId: '',
      
      get activeTab() {
        const state = get();
        console.log('[TabStore] activeTab getter accessed');
        return state.tabs.find(tab => tab.id === state.activeTabId);
      },
      
      addTab: async (path?: string) => {
        console.log('[TabStore] addTab called with path:', path);
        const homePath = path || '/Users/trentbrew/.filegraph' || await invoke<string>('get_home_directory');
        console.log('[TabStore] resolved homePath:', homePath);
        
        const newTab: TabData = {
          id: `tab-${Date.now()}`,
          title: homePath.split('/').pop() || 'Home',
          path: homePath,
          navigationHistory: [homePath],
          historyIndex: 0,
        };
        
        console.log('[TabStore] creating new tab:', newTab);
        set((state) => {
          console.log('[TabStore] current state before addTab:', {
            tabsLength: state.tabs.length,
            activeTabId: state.activeTabId,
          });
          const newState = {
            tabs: [...state.tabs, newTab],
            activeTabId: newTab.id,
          };
          console.log('[TabStore] new state after addTab:', {
            tabsLength: newState.tabs.length,
            activeTabId: newState.activeTabId,
          });
          return newState;
        });
        console.log('[TabStore] addTab completed');
      },
      
      removeTab: (tabId: string) => {
        set((state) => {
          const filteredTabs = state.tabs.filter(tab => tab.id !== tabId);
          
          // If removing active tab, switch to another
          let newActiveId = state.activeTabId;
          if (state.activeTabId === tabId) {
            const removedIndex = state.tabs.findIndex(tab => tab.id === tabId);
            const newIndex = removedIndex > 0 ? removedIndex - 1 : 0;
            newActiveId = filteredTabs[newIndex]?.id || '';
          }
          
          return {
            tabs: filteredTabs,
            activeTabId: newActiveId,
          };
        });
      },
      
      setActiveTab: (tabId: string) => {
        set({ activeTabId: tabId });
      },
      
      updateTab: (tabId: string, updates: Partial<TabData>) => {
        set((state) => ({
          tabs: state.tabs.map(tab =>
            tab.id === tabId ? { ...tab, ...updates } : tab
          ),
        }));
      },
      
      navigateInTab: (tabId: string, path: string) => {
        set((state) => ({
          tabs: state.tabs.map(tab => {
            if (tab.id !== tabId) return tab;
            
            // Add to history
            const newHistory = [
              ...tab.navigationHistory.slice(0, tab.historyIndex + 1),
              path,
            ];
            
            return {
              ...tab,
              path,
              title: path.split('/').pop() || 'Home',
              navigationHistory: newHistory,
              historyIndex: newHistory.length - 1,
            };
          }),
        }));
      },
      
      navigateBack: (tabId: string) => {
        set((state) => ({
          tabs: state.tabs.map(tab => {
            if (tab.id !== tabId || tab.historyIndex <= 0) return tab;
            
            const newIndex = tab.historyIndex - 1;
            return {
              ...tab,
              path: tab.navigationHistory[newIndex],
              title: tab.navigationHistory[newIndex].split('/').pop() || 'Home',
              historyIndex: newIndex,
            };
          }),
        }));
      },
      
      canNavigateBack: (tabId: string) => {
        const tab = get().tabs.find(t => t.id === tabId);
        return (tab?.historyIndex ?? 0) > 0;
      },
    }),
    {
      name: 'file-explorer-tabs',
      partialize: (state) => ({
        tabs: state.tabs,
        activeTabId: state.activeTabId,
      }),
      onRehydrateStorage: () => (state) => {
        console.log('[TabStore] Storage rehydration:', {
          hasState: !!state,
          tabsLength: state?.tabs?.length || 0,
          activeTabId: state?.activeTabId || 'none',
        });
        // Don't return state - let Zustand handle rehydration naturally
      },
    }
  )
);
