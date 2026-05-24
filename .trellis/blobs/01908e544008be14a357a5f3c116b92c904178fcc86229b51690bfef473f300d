import { Descendant } from 'slate';

// Define custom Slate node types for TypeScript
interface CustomElement {
  type: 'p' | 'h1' | 'h2' | 'h3' | 'ul' | 'ol' | 'blockquote' | 'code';
  children: CustomText[];
}

interface CustomText {
  text: string;
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
}

declare module 'slate' {
  interface CustomTypes {
    Element: CustomElement;
    Text: CustomText;
  }
}

/**
 * Convert markdown string to Plate.js Slate nodes
 * For now, using a simple converter until we properly set up Plate markdown plugins
 */
export function markdownToPlate(markdown: string): Descendant[] {
  if (!markdown.trim()) {
    return [{ type: 'p', children: [{ text: '' }] }];
  }

  try {
    // Simple markdown to Slate conversion for now
    const lines = markdown.split('\n');
    const nodes: Descendant[] = [];

    for (const line of lines) {
      if (line.trim() === '') {
        nodes.push({ type: 'p', children: [{ text: '' }] });
      } else if (line.startsWith('# ')) {
        nodes.push({ 
          type: 'h1', 
          children: [{ text: line.slice(2) }] 
        });
      } else if (line.startsWith('## ')) {
        nodes.push({ 
          type: 'h2', 
          children: [{ text: line.slice(3) }] 
        });
      } else if (line.startsWith('### ')) {
        nodes.push({ 
          type: 'h3', 
          children: [{ text: line.slice(4) }] 
        });
      } else if (line.startsWith('- ') || line.startsWith('* ')) {
        nodes.push({ 
          type: 'ul', 
          children: [{ text: line.slice(2) }] 
        });
      } else if (line.startsWith('> ')) {
        nodes.push({ 
          type: 'blockquote', 
          children: [{ text: line.slice(2) }] 
        });
      } else if (line.startsWith('```')) {
        // Skip code block markers for now
        continue;
      } else {
        nodes.push({ type: 'p', children: [{ text: line }] });
      }
    }

    return nodes;
  } catch (error) {
    console.error('Error parsing markdown:', error);
    // Fallback to simple paragraph
    return [{ type: 'p', children: [{ text: markdown }] }];
  }
}

/**
 * Convert Plate.js Slate nodes to markdown string
 */
export function plateToMarkdown(nodes: Descendant[]): string {
  if (!nodes || nodes.length === 0) {
    return '';
  }

  try {
    // Simple Slate to markdown conversion for now
    return nodes
      .map(node => {
        if ('text' in node) {
          return node.text;
        }
        if ('type' in node && 'children' in node) {
          const type = (node as any).type;
          const text = extractTextContent(node.children as Descendant[]);
          
          switch (type) {
            case 'h1':
              return `# ${text}`;
            case 'h2':
              return `## ${text}`;
            case 'h3':
              return `### ${text}`;
            case 'blockquote':
              return `> ${text}`;
            case 'ul':
              return `- ${text}`;
            case 'ol':
              return `1. ${text}`;
            default:
              return text;
          }
        }
        return '';
      })
      .join('\n');
  } catch (error) {
    console.error('Error serializing to markdown:', error);
    // Fallback: extract text content
    return extractTextContent(nodes);
  }
}

/**
 * Fallback function to extract plain text from Slate nodes
 */
function extractTextContent(nodes: Descendant[]): string {
  return nodes
    .map(node => {
      if ('text' in node) {
        return node.text;
      }
      if ('children' in node && Array.isArray(node.children)) {
        return extractTextContent(node.children as Descendant[]);
      }
      return '';
    })
    .join('\n');
}
