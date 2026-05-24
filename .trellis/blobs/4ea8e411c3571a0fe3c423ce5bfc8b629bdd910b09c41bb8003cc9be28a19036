/**
 * TipTap suggestion utilities for mentions and slash commands
 */

import { ReactRenderer } from '@tiptap/react'
import tippy, { type Instance as TippyInstance } from 'tippy.js'
import { EntityPicker, type EntityItem, type EntityPickerRef } from '@/components/EntityPicker'
import { CommandList, type CommandItem, type CommandListRef, SLASH_COMMANDS } from './CommandList'
import type { Editor } from '@tiptap/react'
import type { SuggestionProps, SuggestionKeyDownProps } from '@tiptap/suggestion'

// Re-export for convenience
export type { EntityItem as MentionItem }

// ============================================================================
// Mention Suggestion (for @ and [[)
// ============================================================================

export interface MentionSuggestionOptions {
  getItems: (query: string) => Promise<EntityItem[]> | EntityItem[]
  onCreate?: (entityId: string, namespace: string) => void
  onOpen?: () => void
  onClose?: () => void
}

export function createMentionSuggestion(options: MentionSuggestionOptions) {
  return {
    items: async ({ query }: { query: string }) => {
      return options.getItems(query)
    },

    render: () => {
      let component: ReactRenderer<EntityPickerRef> | null = null
      let popup: TippyInstance[] | null = null
      let currentQuery = ''

      return {
        onStart: (props: SuggestionProps<EntityItem>) => {
          currentQuery = props.query
          options.onOpen?.()

          component = new ReactRenderer(EntityPicker, {
            props: {
              items: props.items,
              query: props.query,
              onSelect: props.command,
              onCreate: options.onCreate,
              showCreateOption: !!options.onCreate,
            },
            editor: props.editor,
          })

          if (!props.clientRect) {
            return
          }

          popup = tippy('body', {
            getReferenceClientRect: props.clientRect as () => DOMRect,
            appendTo: () => document.body,
            content: component.element,
            showOnCreate: true,
            interactive: true,
            trigger: 'manual',
            placement: 'bottom-start',
          })
        },

        onUpdate(props: SuggestionProps<EntityItem>) {
          currentQuery = props.query

          component?.updateProps({
            items: props.items,
            query: props.query,
            onSelect: props.command,
            onCreate: options.onCreate,
            showCreateOption: !!options.onCreate,
          })

          if (!props.clientRect) {
            return
          }

          popup?.[0]?.setProps({
            getReferenceClientRect: props.clientRect as () => DOMRect,
          })
        },

        onKeyDown(props: SuggestionKeyDownProps) {
          if (props.event.key === 'Escape') {
            popup?.[0]?.hide()
            return true
          }

          return component?.ref?.onKeyDown(props) ?? false
        },

        onExit() {
          popup?.[0]?.destroy()
          component?.destroy()
          options.onClose?.()
        },
      }
    },
  }
}

// ============================================================================
// Slash Command Suggestion (for /)
// ============================================================================

export function createSlashCommandSuggestion(editor: Editor) {
  return {
    items: ({ query }: { query: string }) => {
      return SLASH_COMMANDS.filter(
        (item) =>
          item.title.toLowerCase().includes(query.toLowerCase()) ||
          item.description.toLowerCase().includes(query.toLowerCase()),
      )
    },

    render: () => {
      let component: ReactRenderer<CommandListRef> | null = null
      let popup: TippyInstance[] | null = null

      return {
        onStart: (props: SuggestionProps<CommandItem>) => {
          component = new ReactRenderer(CommandList, {
            props: {
              ...props,
              command: (item: CommandItem) => {
                item.command(editor)
                props.editor.commands.deleteRange({
                  from: props.range.from,
                  to: props.range.to,
                })
              },
            },
            editor: props.editor,
          })

          if (!props.clientRect) {
            return
          }

          popup = tippy('body', {
            getReferenceClientRect: props.clientRect as () => DOMRect,
            appendTo: () => document.body,
            content: component.element,
            showOnCreate: true,
            interactive: true,
            trigger: 'manual',
            placement: 'bottom-start',
          })
        },

        onUpdate(props: SuggestionProps<CommandItem>) {
          component?.updateProps({
            ...props,
            command: (item: CommandItem) => {
              item.command(editor)
              props.editor.commands.deleteRange({
                from: props.range.from,
                to: props.range.to,
              })
            },
          })

          if (!props.clientRect) {
            return
          }

          popup?.[0]?.setProps({
            getReferenceClientRect: props.clientRect as () => DOMRect,
          })
        },

        onKeyDown(props: SuggestionKeyDownProps) {
          if (props.event.key === 'Escape') {
            popup?.[0]?.hide()
            return true
          }

          return component?.ref?.onKeyDown(props) ?? false
        },

        onExit() {
          popup?.[0]?.destroy()
          component?.destroy()
        },
      }
    },
  }
}
