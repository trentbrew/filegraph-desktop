/**
 * Rich Text Node for Canvas
 * A TipTap-powered node with @mentions and [[wikilinks]] support
 */

import * as React from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { NodeResizer } from '@reactflow/node-resizer'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import Highlight from '@tiptap/extension-highlight'
import TextStyle from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import Mention from '@tiptap/extension-mention'
import { X, Maximize, Minimize, GripHorizontal } from 'lucide-react'

import { createMentionSuggestion, type MentionItem } from '../../noteViewer/suggestion'
import { Wikilink } from '../../noteViewer/Wikilink'
import '../../noteViewer/noteViewer.css'

// Styled handle for connections
function StyledHandle({ type, position, id }: { type: 'source' | 'target'; position: Position; id?: string }) {
  return (
    <Handle
      type={type}
      position={position}
      id={id}
      className="w-3! h-3! bg-muted-foreground/60! border-2! border-background! hover:bg-primary! hover:scale-125! transition-all duration-150 rounded-full"
    />
  )
}

export interface RichTextNodeData {
  label?: string
  content?: string // TipTap JSON content
  isMaximized?: boolean
  // Entity data passed from parent
  entities?: MentionItem[]
  onContentChange?: (content: string) => void
  onMentionClick?: (entityId: string) => void
}

export function RichTextNode({ id, data, selected }: NodeProps<RichTextNodeData>) {
  const label = data?.label || 'Text'
  const isMaximized = data?.isMaximized || false
  const entities = data?.entities || []
  const entitiesRef = React.useRef<MentionItem[]>([])

  // Keep entities ref updated
  React.useEffect(() => {
    entitiesRef.current = entities
  }, [entities])

  // Initialize TipTap editor
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({
        placeholder: 'Type here... Use @ to mention, [[ to link',
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-primary underline' },
      }),
      Highlight.configure({ multicolor: true }),
      TextStyle,
      Color,
      // @ mentions
      Mention.configure({
        HTMLAttributes: { class: 'mention' },
        renderText({ node }) {
          return `@${node.attrs.label || node.attrs.id}`
        },
        renderHTML({ options, node }) {
          return ['span', { ...options.HTMLAttributes, 'data-id': node.attrs.id }, node.attrs.label || node.attrs.id]
        },
        suggestion: createMentionSuggestion({
          getItems: (query) => {
            const currentEntities = entitiesRef.current
            if (!query) return currentEntities.slice(0, 15)
            const lower = query.toLowerCase()
            return currentEntities
              .filter((e) => e.id.toLowerCase().includes(lower) || e.label.toLowerCase().includes(lower))
              .slice(0, 15)
          },
        }),
      }),
      // [[ wikilinks
      Wikilink.configure({
        HTMLAttributes: { class: 'wikilink' },
        renderText({ node }) {
          return `[[${node.attrs.label || node.attrs.id}]]`
        },
        renderHTML({ options, node }) {
          return ['span', { ...options.HTMLAttributes, 'data-id': node.attrs.id }, node.attrs.label || node.attrs.id]
        },
        suggestion: createMentionSuggestion({
          getItems: (query) => {
            const currentEntities = entitiesRef.current
            if (!query) return currentEntities.slice(0, 15)
            const lower = query.toLowerCase()
            return currentEntities
              .filter((e) => e.id.toLowerCase().includes(lower) || e.label.toLowerCase().includes(lower))
              .slice(0, 15)
          },
        }),
      }),
    ],
    content: data?.content || '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[60px] px-3 py-2',
      },
      handleClick: (view, pos, event) => {
        const target = event.target as HTMLElement
        if (target.classList.contains('mention') || target.classList.contains('wikilink')) {
          const entityId = target.getAttribute('data-id')
          if (entityId && data?.onMentionClick) {
            data.onMentionClick(entityId)
          }
          return true
        }
        return false
      },
    },
    onUpdate: ({ editor }) => {
      if (data?.onContentChange) {
        data.onContentChange(JSON.stringify(editor.getJSON()))
      }
    },
  })

  // Update content when data changes externally
  React.useEffect(() => {
    if (editor && data?.content) {
      try {
        const parsed = typeof data.content === 'string' ? JSON.parse(data.content) : data.content
        const currentContent = editor.getJSON()
        // Only update if content is different to avoid cursor jump
        if (JSON.stringify(currentContent) !== JSON.stringify(parsed)) {
          editor.commands.setContent(parsed)
        }
      } catch {
        // If not valid JSON, treat as plain text
        if (editor.getText() !== data.content) {
          editor.commands.setContent(data.content)
        }
      }
    }
  }, [data?.content, editor])

  const handleClose = React.useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      window.dispatchEvent(new CustomEvent('canvas-node-close', { detail: { id } }))
    },
    [id],
  )

  const handleMaximize = React.useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      window.dispatchEvent(new CustomEvent('canvas-node-maximize', { detail: { id } }))
    },
    [id],
  )

  return (
    <div
      className={`
        canvas-node group relative flex flex-col
        bg-card border rounded-lg shadow-md
        min-w-[200px] min-h-[120px] h-full w-full
        ${selected ? 'border-primary ring-2 ring-primary/20' : 'border-border'}
        ${isMaximized ? 'canvas-node-maximized' : ''}
      `}
      data-maximized={isMaximized}>
      {/* Node Resizer */}
      {!isMaximized && (
        <NodeResizer
          color="var(--primary)"
          isVisible={selected}
          minWidth={200}
          minHeight={120}
          handleClassName="w-2! h-2! bg-primary! border-0! rounded-sm!"
        />
      )}

      {/* Header */}
      <div
        className={`
          flex items-center justify-between gap-2 px-2 py-1.5 border-b border-border/50 bg-muted/30 cursor-grab shrink-0
          ${isMaximized ? 'rounded-none' : 'rounded-t-lg'}
        `}>
        <div className="flex items-center gap-1.5">
          <GripHorizontal className="h-3 w-3 text-muted-foreground/50" />
          <span className="text-xs font-medium text-foreground truncate">{label}</span>
        </div>
        <div
          className={`
            flex items-center gap-0.5 transition-opacity
            ${isMaximized ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
          `}>
          <button
            type="button"
            onClick={handleMaximize}
            className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            title={isMaximized ? 'Exit fullscreen (Esc)' : 'Maximize'}>
            {isMaximized ? <Minimize className="h-3 w-3" /> : <Maximize className="h-3 w-3" />}
          </button>
          {!isMaximized && (
            <button
              type="button"
              onClick={handleClose}
              className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
              title="Remove node">
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Editor Content - constrained to remaining height with scroll */}
      <div className="flex-1 min-h-0 overflow-auto nodrag nowheel">
        <EditorContent editor={editor} className="h-full !cursor-text" />
      </div>

      {/* Connection Handles */}
      {!isMaximized && (
        <>
          <StyledHandle type="target" position={Position.Top} id="top" />
          <StyledHandle type="source" position={Position.Bottom} id="bottom" />
          <StyledHandle type="target" position={Position.Left} id="left" />
          <StyledHandle type="source" position={Position.Right} id="right" />
        </>
      )}
    </div>
  )
}
