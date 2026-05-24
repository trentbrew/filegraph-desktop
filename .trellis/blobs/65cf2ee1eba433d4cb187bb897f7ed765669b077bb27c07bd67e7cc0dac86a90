import { CommandRegistry } from '../../keybindings/commands';
import { useTabStore } from '@/stores/useTabStore';
import { toast } from 'sonner';

export function registerNavigationCommands(commands: CommandRegistry) {
  commands.register('navigation.back', () => {
    const { navigateBack, activeTabId } = useTabStore.getState();
    if (activeTabId) {
      navigateBack(activeTabId);
      toast.success('Navigated back');
    }
  });

  commands.register('navigation.forward', () => {
    const { navigateForward, activeTabId } = useTabStore.getState();
    if (activeTabId) {
      navigateForward(activeTabId);
      toast.success('Navigated forward');
    }
  });

  commands.register('navigation.home', async () => {
    const { navigateInTab, activeTabId } = useTabStore.getState();
    if (activeTabId) {
      const { invoke } = await import('@tauri-apps/api/core');
      const homeDir = await invoke<string>('get_home_directory');
      navigateInTab(activeTabId, homeDir);
      toast.success('Navigated to home');
    }
  });

  commands.register('navigation.up', () => {
    const { navigateInTab, activeTabId, activeTab } = useTabStore.getState();
    if (activeTabId && activeTab) {
      const parentPath = activeTab.path.split('/').slice(0, -1).join('/') || '/';
      navigateInTab(activeTabId, parentPath);
      toast.success('Navigated up');
    }
  });

  commands.register('navigation.refresh', () => {
    // Trigger a refresh event
    window.dispatchEvent(new CustomEvent('refresh-directory'));
  });
}
