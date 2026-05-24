/**
 * Facts & Links Helpers Tests
 * Run with: pnpm vitest run src/lib/tql/facts.test.ts
 */

import { describe, it, expect } from 'vitest'
import {
  createFileFacts,
  createContainsLink,
  getParentPath,
  getBaseName,
  getExtension,
  isHidden,
  normalizePath,
  LinkTypes,
  type FileStats,
} from './facts'

// ═══════════════════════════════════════════════════════════════════════════
// createFileFacts
// ═══════════════════════════════════════════════════════════════════════════

describe('createFileFacts', () => {
  it('creates required facts for file', () => {
    const stats: FileStats = {
      path: '/test/file.txt',
      name: 'file.txt',
      file_type: 'file',
    }

    const facts = createFileFacts('entity-1', stats)

    expect(facts).toHaveLength(3)
    expect(facts.find((f) => f.a === 'type')?.v).toBe('file')
    expect(facts.find((f) => f.a === 'path')?.v).toBe('/test/file.txt')
    expect(facts.find((f) => f.a === 'name')?.v).toBe('file.txt')
  })

  it('creates required facts for folder', () => {
    const stats: FileStats = {
      path: '/test/folder',
      name: 'folder',
      file_type: 'folder',
    }

    const facts = createFileFacts('entity-1', stats)

    expect(facts.find((f) => f.a === 'type')?.v).toBe('folder')
  })

  it('includes size when provided', () => {
    const stats: FileStats = {
      path: '/test/file.txt',
      name: 'file.txt',
      file_type: 'file',
      size: 1024,
    }

    const facts = createFileFacts('entity-1', stats)

    expect(facts.find((f) => f.a === 'size')?.v).toBe(1024)
  })

  it('includes modified timestamp when provided', () => {
    const stats: FileStats = {
      path: '/test/file.txt',
      name: 'file.txt',
      file_type: 'file',
      modified: 1702300000000,
    }

    const facts = createFileFacts('entity-1', stats)

    expect(facts.find((f) => f.a === 'modified')?.v).toBe(1702300000000)
  })

  it('includes created timestamp when provided', () => {
    const stats: FileStats = {
      path: '/test/file.txt',
      name: 'file.txt',
      file_type: 'file',
      created: 1702200000000,
    }

    const facts = createFileFacts('entity-1', stats)

    expect(facts.find((f) => f.a === 'created')?.v).toBe(1702200000000)
  })

  it('includes extension without leading dot', () => {
    const stats: FileStats = {
      path: '/test/file.txt',
      name: 'file.txt',
      file_type: 'file',
      extension: '.txt',
    }

    const facts = createFileFacts('entity-1', stats)

    expect(facts.find((f) => f.a === 'ext')?.v).toBe('txt')
  })

  it('handles extension without leading dot', () => {
    const stats: FileStats = {
      path: '/test/file.txt',
      name: 'file.txt',
      file_type: 'file',
      extension: 'txt',
    }

    const facts = createFileFacts('entity-1', stats)

    expect(facts.find((f) => f.a === 'ext')?.v).toBe('txt')
  })

  it('includes hidden flag when provided', () => {
    const stats: FileStats = {
      path: '/test/.hidden',
      name: '.hidden',
      file_type: 'file',
      is_hidden: true,
    }

    const facts = createFileFacts('entity-1', stats)

    expect(facts.find((f) => f.a === 'hidden')?.v).toBe(true)
  })

  it('creates all facts when all fields provided', () => {
    const stats: FileStats = {
      path: '/test/file.txt',
      name: 'file.txt',
      file_type: 'file',
      size: 1024,
      modified: 1702300000000,
      created: 1702200000000,
      extension: 'txt',
      is_hidden: false,
    }

    const facts = createFileFacts('entity-1', stats)

    expect(facts).toHaveLength(8) // type, path, name, size, modified, created, ext, hidden
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// createContainsLink
// ═══════════════════════════════════════════════════════════════════════════

describe('createContainsLink', () => {
  it('creates fs:contains link', () => {
    const link = createContainsLink('parent-id', 'child-id')

    expect(link.e1).toBe('parent-id')
    expect(link.a).toBe(LinkTypes.FS_CONTAINS)
    expect(link.e2).toBe('child-id')
  })

  it('uses correct link type constant', () => {
    const link = createContainsLink('p', 'c')
    expect(link.a).toBe('fs:contains')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// getParentPath
// ═══════════════════════════════════════════════════════════════════════════

describe('getParentPath', () => {
  it('returns parent directory for file path', () => {
    expect(getParentPath('/home/user/file.txt')).toBe('/home/user')
  })

  it('returns parent for nested directory', () => {
    expect(getParentPath('/home/user/documents')).toBe('/home/user')
  })

  it('returns root for top-level item', () => {
    expect(getParentPath('/file.txt')).toBe('/')
  })

  it('returns null for root path', () => {
    expect(getParentPath('/')).toBeNull()
  })

  it('returns null for empty path', () => {
    expect(getParentPath('')).toBeNull()
  })

  it('handles paths with multiple slashes', () => {
    expect(getParentPath('/a/b/c/d/e')).toBe('/a/b/c/d')
  })

  it('handles single directory', () => {
    expect(getParentPath('/folder')).toBe('/')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// getBaseName
// ═══════════════════════════════════════════════════════════════════════════

describe('getBaseName', () => {
  it('returns filename from path', () => {
    expect(getBaseName('/home/user/file.txt')).toBe('file.txt')
  })

  it('returns folder name from path', () => {
    expect(getBaseName('/home/user/documents')).toBe('documents')
  })

  it('returns "/" for root path', () => {
    expect(getBaseName('/')).toBe('/')
  })

  it('returns "/" for empty path', () => {
    expect(getBaseName('')).toBe('/')
  })

  it('handles hidden files', () => {
    expect(getBaseName('/home/.hidden')).toBe('.hidden')
  })

  it('handles files with multiple dots', () => {
    expect(getBaseName('/path/file.test.ts')).toBe('file.test.ts')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// getExtension
// ═══════════════════════════════════════════════════════════════════════════

describe('getExtension', () => {
  it('returns extension for file', () => {
    expect(getExtension('/path/file.txt')).toBe('txt')
  })

  it('returns last extension for multiple dots', () => {
    expect(getExtension('/path/file.test.ts')).toBe('ts')
  })

  it('returns null for no extension', () => {
    expect(getExtension('/path/Makefile')).toBeNull()
  })

  it('returns null for hidden file without extension', () => {
    expect(getExtension('/path/.gitignore')).toBeNull()
  })

  it('returns extension for hidden file with extension', () => {
    expect(getExtension('/path/.eslintrc.json')).toBe('json')
  })

  it('returns null for directories', () => {
    expect(getExtension('/path/folder')).toBeNull()
  })

  it('handles various common extensions', () => {
    expect(getExtension('/a/file.md')).toBe('md')
    expect(getExtension('/a/file.json')).toBe('json')
    expect(getExtension('/a/file.data')).toBe('data')
    expect(getExtension('/a/file.note')).toBe('note')
    expect(getExtension('/a/file.canvas')).toBe('canvas')
  })

  it('returns null for root', () => {
    expect(getExtension('/')).toBeNull()
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// isHidden
// ═══════════════════════════════════════════════════════════════════════════

describe('isHidden', () => {
  it('returns true for hidden file', () => {
    expect(isHidden('/path/.hidden')).toBe(true)
  })

  it('returns true for hidden folder', () => {
    expect(isHidden('/path/.config')).toBe(true)
  })

  it('returns false for normal file', () => {
    expect(isHidden('/path/file.txt')).toBe(false)
  })

  it('returns false for file in hidden directory', () => {
    // The function checks the basename, not the full path
    expect(isHidden('/path/.hidden/visible.txt')).toBe(false)
  })

  it('returns true for dotfiles', () => {
    expect(isHidden('/home/.bashrc')).toBe(true)
    expect(isHidden('/home/.gitignore')).toBe(true)
    expect(isHidden('/home/.env')).toBe(true)
  })

  it('returns false for root', () => {
    expect(isHidden('/')).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// normalizePath
// ═══════════════════════════════════════════════════════════════════════════

describe('normalizePath', () => {
  it('removes trailing slash', () => {
    expect(normalizePath('/path/to/folder/')).toBe('/path/to/folder')
  })

  it('preserves root slash', () => {
    expect(normalizePath('/')).toBe('/')
  })

  it('leaves normal path unchanged', () => {
    expect(normalizePath('/path/to/file.txt')).toBe('/path/to/file.txt')
  })

  it('handles multiple trailing slashes', () => {
    // Current implementation only removes one trailing slash
    // This documents the current behavior
    const result = normalizePath('/path//')
    expect(result).toBe('/path/')
  })

  it('handles empty string', () => {
    expect(normalizePath('')).toBe('')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// LinkTypes constant
// ═══════════════════════════════════════════════════════════════════════════

describe('LinkTypes', () => {
  it('has fs:contains type', () => {
    expect(LinkTypes.FS_CONTAINS).toBe('fs:contains')
  })
})
