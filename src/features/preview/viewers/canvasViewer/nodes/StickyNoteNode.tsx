/**
 * Sticky Note Node for Canvas
 * Colorful sticky notes with rich text editing
 */

import * as React from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { NodeResizer } from '@reactflow/node-resizer'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Mention from '@tiptap/extension-mention'
import { X, Palette } from 'lucide-react'

import { createMentionSuggestion, type MentionItem } from '../../noteViewer/suggestion'
import { Wikilink } from '../../noteViewer/Wikilink'
import '../../noteViewer/noteViewer.css'

// Sticky note color presets
export const STICKY_COLORS = [
  { name: 'Yellow', bg: '#fef9c3', border: '#eab308', text: '#713f12' },
  { name: 'Pink', bg: '#fce7f3', border: '#ec4899', text: '#831843' },
  { name: 'Blue', bg: '#dbeafe', border: '#3b82f6', text: '#1e3a8a' },
  { name: 'Green', bg: '#dcfce7', border: '#22c55e', text: '#14532d' },
  { name: 'Purple', bg: '#f3e8ff', border: '#a855f7', text: '#581c87' },
  { name: 'Orange', bg: '#ffedd5', border: '#f97316', text: '#7c2d12' },
] as const

// Styled handle
function StyledHandle({ type, position, id }: { type: 'source' | 'target'; position: Position; id?: string }) {
  return (
    <Handle
      type={type}
      position={position}
      id={id}
      className="w-2.5! h-2.5! bg-current! opacity-30! border-0! hover:opacity-100! hover:scale-125! transition-all duration-150 rounded-full"
    />
  )
}

export interface StickyNoteNodeData {
  content?: string
  color?: (typeof STICKY_COLORS)[number]['name']
  isMaximized?: boolean
  entities?: MentionItem[]
  onContentChange?: (content: string) => void
  onMentionClick?: (entityId: string) => void
  onColorChange?: (color: string) => void
}

export function StickyNoteNode({ id, data, selected }: NodeProps<StickyNoteNodeData>) {
  const [showColorMenu, setShowColorMenu] = React.useState(false)
  const colorName = data?.color || 'Yellow'
  const colorConfig = STICKY_COLORS.find((c) => c.name === colorName) || STICKY_COLORS[0]
  const isMaximized = data?.isMaximized || false
  const entities = data?.entities || []
  const entitiesRef = React.useRef<MentionItem[]>([])

  React.useEffect(() => {
    entitiesRef.current = entities
  }, [entities])

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
      }),
      Placeholder.configure({
        placeholder: 'Write something...',
      }),
      Mention.configure({
        HTMLAttributes: { class: 'mention', style: `color: ${colorConfig.text}` },
        renderText({ node }) {
          return `@${node.attrs.label || node.attrs.id}`
        },
        renderHTML({ options, node }) {
          return ['span', { ...options.HTMLAttributes, 'data-id': node.attrs.id }, node.attrs.label || node.attrs.id]
        },
        suggestion: createMentionSuggestion({
          getItems: (query) => {
            const currentEntities = entitiesRef.current
            if (!query) return currentEntities.slice(0, 10)
            const lower = query.toLowerCase()
            return currentEntities
              .filter((e) => e.id.toLowerCase().includes(lower) || e.label.toLowerCase().includes(lower))
              .slice(0, 10)
          },
        }),
      }),
      Wikilink.configure({
        HTMLAttributes: { class: 'wikilink', style: `color: ${colorConfig.text}` },
        renderText({ node }) {
          return `[[${node.attrs.label || node.attrs.id}]]`
        },
        renderHTML({ options, node }) {
          return ['span', { ...options.HTMLAttributes, 'data-id': node.attrs.id }, node.attrs.label || node.attrs.id]
        },
        suggestion: createMentionSuggestion({
          getItems: (query) => {
            const currentEntities = entitiesRef.current
            if (!query) return currentEntities.slice(0, 10)
            const lower = query.toLowerCase()
            return currentEntities
              .filter((e) => e.id.toLowerCase().includes(lower) || e.label.toLowerCase().includes(lower))
              .slice(0, 10)
          },
        }),
      }),
    ],
    content: data?.content || '',
    editorProps: {
      attributes: {
        class: 'focus:outline-none min-h-[60px] p-3 text-sm',
        style: `color: ${colorConfig.text}`,
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

  // Sync content
  React.useEffect(() => {
    if (editor && data?.content) {
      try {
        const parsed = typeof data.content === 'string' ? JSON.parse(data.content) : data.content
        const currentContent = editor.getJSON()
        if (JSON.stringify(currentContent) !== JSON.stringify(parsed)) {
          editor.commands.setContent(parsed)
        }
      } catch {
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

  const handleColorChange = React.useCallback(
    (colorName: string) => {
      if (data?.onColorChange) {
        data.onColorChange(colorName)
      }
      setShowColorMenu(false)
    },
    [data],
  )

  return (
    <div
      className={`
        canvas-node group relative rounded-sm shadow-lg
        min-w-[150px] min-h-[100px] h-full w-full
        ${selected ? 'ring-2 ring-primary/50' : ''}
        ${isMaximized ? 'canvas-node-maximized' : ''}
      `}
      style={{
        backgroundColor: colorConfig.bg,
        backdropFilter: 'blur(24px) saturate(180%) !important',
        borderLeft: `4px solid ${colorConfig.border}`,
      }}
      data-maximized={isMaximized}>
      {/* Resizer */}
      {!isMaximized && (
        <NodeResizer
          color={colorConfig.border}
          isVisible={selected}
          minWidth={150}
          minHeight={100}
          handleClassName="w-2! h-2! border-0! rounded-lg!"
          handleStyle={{ backgroundColor: colorConfig.border }}
        />
      )}

      {/* Close button */}
      <button
        type="button"
        onClick={handleClose}
        className="absolute top-1 right-1 p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-black/10 transition-opacity"
        style={{ color: colorConfig.text }}
        title="Remove">
        <X className="h-3 w-3" />
      </button>

      {/* Editor */}
      <div className="flex-1 overflow-auto nodrag nowheel">
        <EditorContent editor={editor} className="h-full" />
      </div>

      {/* Color picker button */}
      <div className="absolute bottom-1 right-1">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setShowColorMenu(!showColorMenu)
          }}
          className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-black/10 transition-opacity nodrag"
          style={{ color: colorConfig.text }}
          title="Change color">
          <Palette className="h-3.5 w-3.5" />
        </button>

        {/* Color menu */}
        {showColorMenu && (
          <div
            className="absolute bottom-full right-0 mb-1 p-2 bg-popover border border-border rounded-md shadow-lg nodrag"
            onClick={(e) => e.stopPropagation()}>
            <div className="grid grid-cols-3 gap-1.5">
              {STICKY_COLORS.map((color) => (
                <button
                  key={color.name}
                  type="button"
                  onClick={() => handleColorChange(color.name)}
                  className="w-6 h-6 rounded border-2 hover:scale-110 transition-transform"
                  style={{
                    backgroundColor: color.bg,
                    borderColor: color.name === colorName ? color.border : 'transparent',
                  }}
                  title={color.name}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Handles */}
      {!isMaximized && (
        <div style={{ color: colorConfig.border }}>
          <StyledHandle type="target" position={Position.Top} id="top" />
          <StyledHandle type="source" position={Position.Bottom} id="bottom" />
          <StyledHandle type="target" position={Position.Left} id="left" />
          <StyledHandle type="source" position={Position.Right} id="right" />
        </div>
      )}
    </div>
  )
}
