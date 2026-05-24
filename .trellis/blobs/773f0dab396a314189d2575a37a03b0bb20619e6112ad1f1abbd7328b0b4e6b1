import { CommandRegistry } from '../../keybindings/commands';
import { useFileStore } from '@/stores/useFileStore';
import { toast } from 'sonner';

export function registerSelectionCommands(commands: CommandRegistry) {
  commands.register('selection.selectAll', () => {
    const { data, selectedItems } = useFileStore.getState();
    if (selectedItems.size > 0) {
      useFileStore.getState().clearSelection();
      toast.success('Selection cleared');
    } else {
      data.forEach((item) => {
        useFileStore.getState().toggleItemSelection(item.path);
      });
      toast.success(`Selected ${data.length} items`);
    }
  });
}
