/**
 * useFileContext - Inject current file context into chat prompts
 *
 * Provides functions to get the current file context on-demand,
 * without causing re-renders from store subscriptions.
 */

import { useCallback } from 'react'
import { useTabStore } from '@/stores/useTabStore'
import { useFileStore } from '@/stores/useFileStore'
import { useChatStore, type FileContext } from './useChatStore'
import { invoke } from '@tauri-apps/api/core'

// Map file extensions to language identifiers
const EXTENSION_TO_LANGUAGE: Record<string, string> = {
  ts: 'typescript',
  tsx: 'typescript',
  js: 'javascript',
  jsx: 'javascript',
  py: 'python',
  rs: 'rust',
  go: 'go',
  md: 'markdown',
  json: 'json',
  html: 'html',
  css: 'css',
  scss: 'scss',
  yaml: 'yaml',
  yml: 'yaml',
  toml: 'toml',
  sql: 'sql',
  sh: 'bash',
  data: 'json',
}

function getLanguageFromExtension(ext: string): string | undefined {
  return EXTENSION_TO_LANGUAGE[ext]
}

/**
 * Get current file context without subscribing to store updates.
 * Call this when sending a message, not on every render.
 */
export async function getActiveFileContext(): Promise<FileContext | null> {
  const { activeItem } = useFileStore.getState()
  const { tabs, activeTabId } = useTabStore.getState()

  const activeWorkspace = tabs.find((t) => t.id === activeTabId)
  const activeEditorTab = activeWorkspace?.editorTabs.find((t) => t.id === activeWorkspace.activeEditorTabId)
  const activeFile = activeEditorTab?.file || activeItem

  if (!activeFile || activeFile.file_type === 'folder') {
    return null
  }

  try {
    const result = await invoke<{ content: string }>('read_text_file', {
      filePath: activeFile.path,
    })

    // Extract filename and language from path
    const name = activeFile.name || activeFile.path.split('/').pop() || 'file'
    const ext = name.split('.').pop()?.toLowerCase()
    const language = ext ? getLanguageFromExtension(ext) : undefined

    return {
      path: activeFile.path,
      name,
      content: result.content,
      language,
    }
  } catch {
    const name = activeFile.name || activeFile.path.split('/').pop() || 'file'
    return {
      path: activeFile.path,
      name,
      content: '',
    }
  }
}

export function useFileContext() {
  const fileContext = useChatStore((state) => state.fileContext)
  const setFileContext = useChatStore((state) => state.setFileContext)

  // Refresh context on-demand (call before sending message)
  const refreshContext = useCallback(async () => {
    const context = await getActiveFileContext()
    setFileContext(context)
    return context
  }, [setFileContext])

  return {
    fileContext,
    hasContext: !!fileContext,
    refreshContext,
    clearContext: () => setFileContext(null),
  }
}
