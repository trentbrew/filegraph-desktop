import { Node } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import MermaidNodeView from './MermaidNodeView'

export const MermaidBlock = Node.create({
  name: 'mermaidBlock',
  priority: 1000,

  group: 'block',
  content: 'text*',
  defining: true,
  isolating: true,

  addAttributes() {
    return {
      language: {
        default: 'mermaid',
        parseHTML: (element) => element.getAttribute('data-language') || 'mermaid',
        renderHTML: (attributes) => ({ 'data-language': attributes.language || 'mermaid' }),
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="mermaid-block"]',
        priority: 1000,
      },
      {
        tag: 'pre',
        priority: 1000,
        preserveWhitespace: 'full',
        contentElement: (element) => {
          if (!(element instanceof HTMLElement)) return element as any
          return element.querySelector('code') || element
        },
        getAttrs: (element) => {
          if (!(element instanceof HTMLElement)) return false
          const codeEl = element.querySelector('code')
          const className = codeEl?.getAttribute('class') || ''
          if (!/\blanguage-mermaid\b/i.test(className)) return false
          return { language: 'mermaid' }
        },
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', { ...HTMLAttributes, 'data-type': 'mermaid-block' }, 0]
  },

  addNodeView() {
    return ReactNodeViewRenderer(MermaidNodeView)
  },
})

export default MermaidBlock
