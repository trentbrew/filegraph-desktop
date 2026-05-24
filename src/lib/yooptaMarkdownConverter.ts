// @ts-nocheck
// TODO: Yoopta integration not yet complete - missing @yoopta/editor dependency
/**
 * Converts between Markdown and Yoopta Editor format
 * Provides 2-way synchronization support
 */

import { YooptaContentValue } from '@yoopta/editor'

/**
 * Convert markdown string to Yoopta JSON format
 */
export function markdownToYoopta(markdown: string): YooptaContentValue {
  const lines = markdown.split('\n')
  const blocks: YooptaContentValue = {}
  let blockIndex = 0

  let currentBlock: any = null
  let currentListType: 'BulletedList' | 'NumberedList' | null = null
  let listItems: any[] = []

  const finalizeCurrentList = () => {
    if (currentListType && listItems.length > 0) {
      const listId = generateId()
      blocks[listId] = {
        id: listId,
        type: currentListType,
        meta: { order: blockIndex++, depth: 0 },
        value: listItems,
      }
      listItems = []
      currentListType = null
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmedLine = line.trim()

    // Empty line
    if (trimmedLine === '') {
      finalizeCurrentList()

      // Add empty paragraph
      const id = generateId()
      blocks[id] = {
        id,
        type: 'Paragraph',
        meta: { order: blockIndex++, depth: 0 },
        value: [{ id: generateId(), type: 'paragraph', children: [{ text: '' }] }],
      }
      continue
    }

    // Headings
    const headingMatch = trimmedLine.match(/^(#{1,6})\s+(.+)$/)
    if (headingMatch) {
      finalizeCurrentList()

      const level = headingMatch[1].length
      const text = headingMatch[2]
      const type = level === 1 ? 'HeadingOne' : level === 2 ? 'HeadingTwo' : 'HeadingThree'

      if (level <= 3) {
        const id = generateId()
        blocks[id] = {
          id,
          type,
          meta: { order: blockIndex++, depth: 0 },
          value: [{ id: generateId(), type: type.toLowerCase(), children: [{ text }] }],
        }
        continue
      }
    }

    // Blockquote
    if (trimmedLine.startsWith('> ')) {
      finalizeCurrentList()

      const text = trimmedLine.substring(2)
      const id = generateId()
      blocks[id] = {
        id,
        type: 'Blockquote',
        meta: { order: blockIndex++, depth: 0 },
        value: [{ id: generateId(), type: 'blockquote', children: [{ text }] }],
      }
      continue
    }

    // Code block
    if (trimmedLine.startsWith('```')) {
      finalizeCurrentList()

      const language = trimmedLine.substring(3).trim() || 'plaintext'
      const codeLines: string[] = []

      i++ // Move to next line
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }

      const code = codeLines.join('\n')
      const id = generateId()
      blocks[id] = {
        id,
        type: 'Code',
        meta: { order: blockIndex++, depth: 0 },
        value: [
          {
            id: generateId(),
            type: 'code',
            children: [{ text: code }],
            props: { language },
          },
        ],
      }
      continue
    }

    // Bulleted list
    const bulletMatch = trimmedLine.match(/^[-*+]\s+(.+)$/)
    if (bulletMatch) {
      if (currentListType !== 'BulletedList') {
        finalizeCurrentList()
        currentListType = 'BulletedList'
      }

      listItems.push({
        id: generateId(),
        type: 'bulleted-list',
        children: [{ text: bulletMatch[1] }],
      })
      continue
    }

    // Numbered list
    const numberMatch = trimmedLine.match(/^\d+\.\s+(.+)$/)
    if (numberMatch) {
      if (currentListType !== 'NumberedList') {
        finalizeCurrentList()
        currentListType = 'NumberedList'
      }

      listItems.push({
        id: generateId(),
        type: 'numbered-list',
        children: [{ text: numberMatch[1] }],
      })
      continue
    }

    // Regular paragraph
    finalizeCurrentList()

    const id = generateId()
    blocks[id] = {
      id,
      type: 'Paragraph',
      meta: { order: blockIndex++, depth: 0 },
      value: [
        {
          id: generateId(),
          type: 'paragraph',
          children: parseInlineMarkdown(trimmedLine),
        },
      ],
    }
  }

  // Finalize any remaining list
  finalizeCurrentList()

  // If no blocks, return a single empty paragraph
  if (Object.keys(blocks).length === 0) {
    const id = generateId()
    return {
      [id]: {
        id,
        type: 'Paragraph',
        meta: { order: 0, depth: 0 },
        value: [{ id: generateId(), type: 'paragraph', children: [{ text: '' }] }],
      },
    }
  }

  return blocks
}

/**
 * Convert Yoopta JSON format to markdown string
 */
export function yooptaToMarkdown(content: YooptaContentValue): string {
  if (!content || Object.keys(content).length === 0) {
    return ''
  }

  const blocks = Object.values(content)

  // Sort by order
  blocks.sort((a, b) => (a.meta?.order || 0) - (b.meta?.order || 0))

  const markdownLines: string[] = []

  for (const block of blocks) {
    const type = block.type
    const value: any[] = (block.value as any) || []

    switch (type) {
      case 'Paragraph':
        if (value[0]) {
          const text = serializeChildren(value[0].children)
          markdownLines.push(text)
        }
        break

      case 'HeadingOne':
        if (value[0]) {
          const text = serializeChildren(value[0].children)
          markdownLines.push(`# ${text}`)
        }
        break

      case 'HeadingTwo':
        if (value[0]) {
          const text = serializeChildren(value[0].children)
          markdownLines.push(`## ${text}`)
        }
        break

      case 'HeadingThree':
        if (value[0]) {
          const text = serializeChildren(value[0].children)
          markdownLines.push(`### ${text}`)
        }
        break

      case 'Blockquote':
        if (value[0]) {
          const text = serializeChildren(value[0].children)
          markdownLines.push(`> ${text}`)
        }
        break

      case 'Code':
        if (value[0]) {
          const code = serializeChildren(value[0].children)
          const language = value[0].props?.language || ''
          markdownLines.push(`\`\`\`${language}`)
          markdownLines.push(code)
          markdownLines.push('```')
        }
        break

      case 'BulletedList':
        for (const item of value) {
          const text = serializeChildren(item.children)
          markdownLines.push(`- ${text}`)
        }
        break

      case 'NumberedList':
        for (let i = 0; i < value.length; i++) {
          const text = serializeChildren(value[i].children)
          markdownLines.push(`${i + 1}. ${text}`)
        }
        break

      case 'TodoList':
        for (const item of value) {
          const text = serializeChildren(item.children)
          const checked = item.props?.checked ? 'x' : ' '
          markdownLines.push(`- [${checked}] ${text}`)
        }
        break

      default:
        // Unknown block type, treat as paragraph
        if (value[0]) {
          const text = serializeChildren(value[0].children)
          if (text) markdownLines.push(text)
        }
    }

    // Add empty line after blocks (except last)
    markdownLines.push('')
  }

  return markdownLines.join('\n').trim()
}

/**
 * Parse inline markdown formatting (bold, italic, code, etc.)
 */
function parseInlineMarkdown(text: string): any[] {
  const children: any[] = []
  let currentText = ''
  let i = 0

  while (i < text.length) {
    // Bold **text**
    if (text.substr(i, 2) === '**') {
      if (currentText) {
        children.push({ text: currentText })
        currentText = ''
      }
      i += 2
      let boldText = ''
      while (i < text.length && text.substr(i, 2) !== '**') {
        boldText += text[i]
        i++
      }
      if (boldText) {
        children.push({ text: boldText, bold: true })
      }
      i += 2
      continue
    }

    // Italic *text*
    if (text[i] === '*' && text[i + 1] !== '*') {
      if (currentText) {
        children.push({ text: currentText })
        currentText = ''
      }
      i++
      let italicText = ''
      while (i < text.length && text[i] !== '*') {
        italicText += text[i]
        i++
      }
      if (italicText) {
        children.push({ text: italicText, italic: true })
      }
      i++
      continue
    }

    // Inline code `text`
    if (text[i] === '`') {
      if (currentText) {
        children.push({ text: currentText })
        currentText = ''
      }
      i++
      let codeText = ''
      while (i < text.length && text[i] !== '`') {
        codeText += text[i]
        i++
      }
      if (codeText) {
        children.push({ text: codeText, code: true })
      }
      i++
      continue
    }

    currentText += text[i]
    i++
  }

  if (currentText) {
    children.push({ text: currentText })
  }

  return children.length > 0 ? children : [{ text: '' }]
}

/**
 * Serialize Yoopta children nodes to markdown text
 */
function serializeChildren(children: any[] | undefined): string {
  if (!children || children.length === 0) return ''

  return children
    .map((child: any) => {
      let text = child.text || ''

      // Apply formatting
      if (child.bold) text = `**${text}**`
      if (child.italic) text = `*${text}*`
      if (child.code) text = `\`${text}\``
      if (child.strikethrough) text = `~~${text}~~`
      if (child.underline) text = `<u>${text}</u>`

      return text
    })
    .join('')
}

/**
 * Generate a unique ID for blocks
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}
