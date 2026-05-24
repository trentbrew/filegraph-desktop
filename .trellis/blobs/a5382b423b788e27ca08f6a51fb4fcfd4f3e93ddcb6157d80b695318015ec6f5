import * as React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('@/features/preview/components/UnifiedPreviewCanvas/FilePreviewNode', () => {
  return {
    FilePreviewNode: ({ data }: any) => (
      <div
        data-testid="file-preview"
        data-file-path={data?.filePath}
        data-file-name={data?.fileName}
        data-file-type={data?.fileType}
        data-extension={data?.extension ?? ''}
      />
    ),
  }
})

vi.mock('./CanvasNodeWrapper', () => {
  return {
    CanvasNodeWrapper: ({ children }: any) => <div data-testid="canvas-node-wrapper">{children}</div>,
    MaximizedHeader: ({ label }: any) => <div data-testid="maximized-header">{label}</div>,
  }
})

import { HomeFilePreviewNode } from './HomeFilePreviewNode'

describe('HomeFilePreviewNode', () => {
  it('renders a file preview when given filePath', () => {
    render(
      <HomeFilePreviewNode
        {...({
          id: 'node-1',
          selected: false,
          data: {
            filePath: '/vault/readme.md',
            fileName: 'readme.md',
            label: 'Readme',
          },
        } as any)}
      />,
    )

    const preview = screen.getByTestId('file-preview')
    expect(preview.getAttribute('data-file-path')).toBe('/vault/readme.md')
    expect(preview.getAttribute('data-file-name')).toBe('readme.md')
    expect(preview.getAttribute('data-file-type')).toBe('markdown')
  })

  it('falls back to data.file if filePath is not present', () => {
    render(
      <HomeFilePreviewNode
        {...({
          id: 'node-2',
          selected: false,
          data: {
            file: '/vault/file.txt',
          },
        } as any)}
      />,
    )

    const preview = screen.getByTestId('file-preview')
    expect(preview.getAttribute('data-file-path')).toBe('/vault/file.txt')
    expect(preview.getAttribute('data-file-name')).toBe('file.txt')
    expect(preview.getAttribute('data-file-type')).toBe('text')
  })
})
