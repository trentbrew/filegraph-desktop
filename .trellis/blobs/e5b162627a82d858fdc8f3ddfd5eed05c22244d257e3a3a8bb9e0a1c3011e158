import { CommandRegistry } from '../../keybindings/commands';
import { useFileStore } from '@/stores/useFileStore';
import { useClipboardStore } from '@/stores/clipboardStore';
import { toast } from 'sonner';

export function registerFileCommands(commands: CommandRegistry) {
  commands.register('file.new', () => {
    window.dispatchEvent(new CustomEvent('create-new-file'));
  });

  commands.register('file.newFolder', () => {
    window.dispatchEvent(new CustomEvent('create-new-folder'));
  });

  commands.register('file.delete', () => {
    const { selectedItems } = useFileStore.getState();
    const selectedArray = Array.from(selectedItems);
    if (selectedArray.length > 0) {
      window.dispatchEvent(
        new CustomEvent('delete-selected-items', {
          detail: { items: selectedArray },
        })
      );
    }
  });

  commands.register('file.rename', () => {
    const { selectedItems } = useFileStore.getState();
    const selectedArray = Array.from(selectedItems);
    if (selectedArray.length === 1) {
      window.dispatchEvent(
        new CustomEvent('rename-item', {
          detail: { path: selectedArray[0] },
        })
      );
    }
  });

  commands.register('file.cut', () => {
    const { selectedItems } = useFileStore.getState();
    const { setClipboard } = useClipboardStore.getState();
    const selectedArray = Array.from(selectedItems);
    if (selectedArray.length > 0) {
      setClipboard(selectedArray, 'cut');
      toast.success(`Cut ${selectedArray.length} item${selectedArray.length > 1 ? 's' : ''}`);
    }
  });

  commands.register('file.copy', () => {
    const { selectedItems } = useFileStore.getState();
    const { setClipboard } = useClipboardStore.getState();
    const selectedArray = Array.from(selectedItems);
    if (selectedArray.length > 0) {
      setClipboard(selectedArray, 'copy');
      toast.success(`Copied ${selectedArray.length} item${selectedArray.length > 1 ? 's' : ''}`);
    }
  });

  commands.register('file.paste', () => {
    window.dispatchEvent(new CustomEvent('paste-items'));
  });
}
