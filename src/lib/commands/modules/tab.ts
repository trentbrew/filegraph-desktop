import { CommandRegistry } from '../../keybindings/commands';
import { useTabStore } from '@/stores/useTabStore';
import { toast } from 'sonner';

export function registerTabCommands(commands: CommandRegistry) {
  commands.register('tab.new', async () => {
    const { addTab } = useTabStore.getState();
    
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const homeDir = await invoke<string>('get_home_directory');
      await addTab(homeDir);
      toast.success('New tab opened');
    } catch (error) {
      console.error('Failed to get home directory:', error);
      await addTab();
    }
  });

  commands.register('tab.close', () => {
    const { removeTab, tabs, activeTabId } = useTabStore.getState();
    if (tabs.length > 1 && activeTabId) {
      removeTab(activeTabId);
      toast.success('Tab closed');
    }
  });

  commands.register('tab.next', () => {
    const { tabs, activeTabId, setActiveTab } = useTabStore.getState();
    const currentIndex = tabs.findIndex((t: { id: string }) => t.id === activeTabId);
    const nextIndex = (currentIndex + 1) % tabs.length;
    setActiveTab(tabs[nextIndex].id);
  });

  commands.register('tab.previous', () => {
    const { tabs, activeTabId, setActiveTab } = useTabStore.getState();
    const currentIndex = tabs.findIndex((t: { id: string }) => t.id === activeTabId);
    const prevIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    setActiveTab(tabs[prevIndex].id);
  });
}
