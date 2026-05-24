/**
 * Wikilink Extension for TipTap
 * Enables [[entity]] syntax for linking entities (similar to Obsidian/Notion)
 */

import Mention from '@tiptap/extension-mention'
import type { MentionOptions } from '@tiptap/extension-mention'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { PluginKey } from 'prosemirror-state'
import { WikilinkNodeView } from './WikilinkNodeView'

export interface WikilinkOptions extends MentionOptions {}

export const Wikilink = Mention.extend<WikilinkOptions>({
  name: 'wikilink',

  addOptions() {
    return {
      ...this.parent?.(),
      suggestion: {
        char: '[[',
        pluginKey: new PluginKey('wikilink'),
        allowSpaces: true,
        allowedPrefixes: [' ', '\n'],
        ...this.parent?.().suggestion,
      },
    }
  },

  // Use React NodeView for HoverCard support
  addNodeView() {
    return ReactNodeViewRenderer(WikilinkNodeView)
  },

  // Render as wikilink node with distinct data attribute
  parseHTML() {
    return [
      {
        tag: `span[data-type="${this.name}"]`,
      },
    ]
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'span',
      {
        ...HTMLAttributes,
        'data-type': this.name,
        'data-id': node.attrs.id,
      },
      node.attrs.label ?? node.attrs.id,
    ]
  },
})
