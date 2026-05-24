import * as React from 'react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

import { MarkdownViewer } from './markdownViewer'

vi.mock('@tauri-apps/api/core', () => {
  return {
    invoke: vi.fn(),
  }
})

vi.mock('@/components/editor/MermaidDiagram', () => {
  return {
    MermaidDiagram: ({ chart }: { chart: string }) => <div data-testid="mermaid-diagram" data-chart={chart} />,
  }
})

describe('MarkdownViewer', () => {
  beforeEach(async () => {
    const mod = await import('@tauri-apps/api/core')
    ;(mod.invoke as unknown as ReturnType<typeof vi.fn>).mockReset()
  })

  it('renders ```mermaid fenced code blocks using MermaidDiagram', async () => {
    const markdown = `# Title\n\n\`\`\`mermaid\ngraph TD\n  A-->B\n\`\`\`\n`

    const { invoke } = await import('@tauri-apps/api/core')
    ;(invoke as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      content: markdown,
      truncated: false,
      encoding: 'utf-8',
      size: markdown.length,
    })

    render(<MarkdownViewer filePath="/tmp/test.md" />)

    const diagram = await screen.findByTestId('mermaid-diagram')
    expect(diagram.getAttribute('data-chart')).toContain('graph TD')
    expect(diagram.getAttribute('data-chart')).toContain('A-->B')
  })
})
