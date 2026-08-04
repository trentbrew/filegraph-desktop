import { useUIStore } from '@/stores/useUIStore'
import { usePersistence } from './usePersistence'

const UI_STORAGE_FILE = 'ui-settings.json'

/**
 * Hook to handle manual UI settings persistence using Tauri file I/O
 * Call this once at the app root to enable persistence
 */
export function useUIPersistence() {
  usePersistence(useUIStore, {
    filename: UI_STORAGE_FILE,
    selector: (state) => ({
      layoutMode: state.layoutMode,
      previewEnabled: state.previewEnabled,
      showDotfiles: state.showDotfiles,
      dockShowSeconds: state.dockShowSeconds,
      dockUse24Hour: state.dockUse24Hour,
      homeCanvasNamespaceTileClickBehavior: state.homeCanvasNamespaceTileClickBehavior,
      appRailOpen: state.appRailOpen,
      // showFileExplorer intentionally not persisted - always open on startup
      zoomLevel: state.zoomLevel,
      webPreviewZoom: state.webPreviewZoom,
    }),
  })
}
