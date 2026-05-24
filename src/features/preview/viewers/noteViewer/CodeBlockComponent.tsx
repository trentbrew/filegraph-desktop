/**
 * Custom CodeBlock component with language selector dropdown
 */

import * as React from 'react'
import { NodeViewWrapper, NodeViewContent, NodeViewProps } from '@tiptap/react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Copy, Check } from 'lucide-react'

// Languages supported by lowlight/highlight.js common bundle
const LANGUAGES = [
  { value: 'plaintext', label: 'Plain Text' },
  { value: 'bash', label: 'Bash' },
  { value: 'c', label: 'C' },
  { value: 'cpp', label: 'C++' },
  { value: 'csharp', label: 'C#' },
  { value: 'css', label: 'CSS' },
  { value: 'diff', label: 'Diff' },
  { value: 'go', label: 'Go' },
  { value: 'graphql', label: 'GraphQL' },
  { value: 'ini', label: 'INI' },
  { value: 'java', label: 'Java' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'json', label: 'JSON' },
  { value: 'kotlin', label: 'Kotlin' },
  { value: 'less', label: 'Less' },
  { value: 'lua', label: 'Lua' },
  { value: 'makefile', label: 'Makefile' },
  { value: 'markdown', label: 'Markdown' },
  { value: 'objectivec', label: 'Objective-C' },
  { value: 'perl', label: 'Perl' },
  { value: 'php', label: 'PHP' },
  { value: 'python', label: 'Python' },
  { value: 'r', label: 'R' },
  { value: 'ruby', label: 'Ruby' },
  { value: 'rust', label: 'Rust' },
  { value: 'scss', label: 'SCSS' },
  { value: 'shell', label: 'Shell' },
  { value: 'sql', label: 'SQL' },
  { value: 'swift', label: 'Swift' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'xml', label: 'XML' },
  { value: 'yaml', label: 'YAML' },
]

export function CodeBlockComponent({ node, updateAttributes }: NodeViewProps) {
  const [copied, setCopied] = React.useState(false)
  const codeRef = React.useRef<HTMLPreElement>(null)

  const handleCopy = async () => {
    const code = codeRef.current?.textContent || ''
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const currentLanguage = node.attrs.language || 'plaintext'
  const languageLabel = LANGUAGES.find((l) => l.value === currentLanguage)?.label || currentLanguage

  return (
    <NodeViewWrapper className="code-block-wrapper">
      <div className="code-block-header">
        <Select value={currentLanguage} onValueChange={(value) => updateAttributes({ language: value })}>
          <SelectTrigger className="code-block-language-select">
            <SelectValue placeholder="Language">{languageLabel}</SelectValue>
          </SelectTrigger>
          <SelectContent className="max-h-[300px]">
            {LANGUAGES.map((lang) => (
              <SelectItem key={lang.value} value={lang.value}>
                {lang.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="ghost" size="sm" className="code-block-copy" onClick={handleCopy}>
          {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
        </Button>
      </div>
      <pre ref={codeRef} data-language={currentLanguage}>
        <NodeViewContent as="code" className={`hljs language-${currentLanguage}`} />
      </pre>
    </NodeViewWrapper>
  )
}
