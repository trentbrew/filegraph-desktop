/**
 * Link Parser Tests
 * Run with: pnpm vitest run src/lib/links/linkParser.test.ts
 */

import { describe, it, expect } from 'vitest'
import {
  parseDataFile,
  parseMarkdownFile,
  parseFile,
  extractEntityIdsFromObject,
  createEmptyIndex,
  addFileToIndex,
  getBacklinks,
  getOutgoingLinks,
  findBrokenReferences,
  getIndexStats,
} from './linkParser'

describe('parseDataFile', () => {
  it('extracts entity IDs from flat JSON', () => {
    const content = JSON.stringify({
      id: 'bill:rent:001',
      name: 'Monthly Rent',
      account: 'acc:checking:001',
      category: 'cat:housing:001',
    })

    const refs = parseDataFile('/vault/@finance/bills.data', content)

    // Should find account and category, but NOT id (skipped)
    expect(refs).toHaveLength(2)
    expect(refs.map((r) => r.targetId)).toContain('acc:checking:001')
    expect(refs.map((r) => r.targetId)).toContain('cat:housing:001')
    expect(refs.map((r) => r.targetId)).not.toContain('bill:rent:001')
  })

  it('extracts entity IDs from nested arrays', () => {
    const content = JSON.stringify({
      recurring: [
        { id: 'bill:rent:001', account: 'acc:checking:001' },
        { id: 'bill:utilities:001', account: 'acc:checking:001' },
      ],
    })

    const refs = parseDataFile('/vault/@finance/bills.data', content)

    expect(refs).toHaveLength(2)
    expect(refs[0].propertyPath).toBe('recurring[0].account')
    expect(refs[1].propertyPath).toBe('recurring[1].account')
  })

  it('skips @context, @type, @id, id, and slug fields', () => {
    const content = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'FinancialAccount',
      '@id': 'acc:checking:001',
      id: 'acc:checking:001',
      slug: 'checking',
      linkedAccount: 'acc:savings:001',
    })

    const refs = parseDataFile('/vault/@finance/accounts.data', content)

    // Only linkedAccount should be extracted
    expect(refs).toHaveLength(1)
    expect(refs[0].targetId).toBe('acc:savings:001')
    expect(refs[0].propertyPath).toBe('linkedAccount')
  })
})

describe('parseMarkdownFile', () => {
  it('extracts wikilinks with display text', () => {
    const content = `# Meeting Notes

Discussed project status with [[person:sarah:001|Sarah Johnson]].
Need to follow up on [[proj:website:001]].`

    const refs = parseMarkdownFile('/vault/@notes/meeting.note', content)

    expect(refs).toHaveLength(2)

    expect(refs[0].targetId).toBe('person:sarah:001')
    expect(refs[0].displayText).toBe('Sarah Johnson')
    expect(refs[0].lineNumber).toBe(3)

    expect(refs[1].targetId).toBe('proj:website:001')
    expect(refs[1].displayText).toBeUndefined()
    expect(refs[1].lineNumber).toBe(4)
  })

  it('extracts backtick-quoted entity IDs', () => {
    const content = 'The account `acc:checking:001` needs review.'

    const refs = parseMarkdownFile('/vault/@notes/review.note', content)

    expect(refs).toHaveLength(1)
    expect(refs[0].targetId).toBe('acc:checking:001')
    expect(refs[0].type).toBe('entity-id')
  })

  it('normalizes plain text wikilinks to slugs', () => {
    const content = 'See [[Sarah Johnson]] for details.'

    const refs = parseMarkdownFile('/vault/@notes/note.md', content)

    expect(refs).toHaveLength(1)
    expect(refs[0].targetId).toBe('sarah-johnson')
  })
})

describe('parseFile', () => {
  it('routes to correct parser based on extension', () => {
    const dataContent = JSON.stringify({ ref: 'acc:checking:001' })
    const mdContent = 'See [[person:sarah:001]]'

    const dataRefs = parseFile('/vault/test.data', dataContent)
    const mdRefs = parseFile('/vault/test.note', mdContent)
    const unknownRefs = parseFile('/vault/test.unknown', 'content')

    expect(dataRefs).toHaveLength(1)
    expect(dataRefs[0].type).toBe('entity-id')

    expect(mdRefs).toHaveLength(1)
    expect(mdRefs[0].type).toBe('wikilink')

    expect(unknownRefs).toHaveLength(0)
  })
})

describe('Reference Index', () => {
  it('builds and queries index correctly', () => {
    const index = createEmptyIndex()

    // Add references from bills.data
    addFileToIndex(index, '/vault/@finance/bills.data', [
      {
        value: 'acc:checking:001',
        targetId: 'acc:checking:001',
        type: 'entity-id',
        linkType: 'data:references',
        sourceFile: '/vault/@finance/bills.data',
        propertyPath: 'recurring[0].account',
      },
      {
        value: 'acc:checking:001',
        targetId: 'acc:checking:001',
        type: 'entity-id',
        linkType: 'data:references',
        sourceFile: '/vault/@finance/bills.data',
        propertyPath: 'recurring[1].account',
      },
    ])

    // Add references from transactions.data
    addFileToIndex(index, '/vault/@finance/transactions.data', [
      {
        value: 'acc:checking:001',
        targetId: 'acc:checking:001',
        type: 'entity-id',
        linkType: 'data:references',
        sourceFile: '/vault/@finance/transactions.data',
        propertyPath: 'transactions[0].account',
      },
    ])

    // Test backlinks
    const backlinks = getBacklinks(index, 'acc:checking:001')
    expect(backlinks).toHaveLength(3)

    // Test outgoing links
    const billsLinks = getOutgoingLinks(index, '/vault/@finance/bills.data')
    expect(billsLinks).toHaveLength(2)

    // Test stats
    const stats = getIndexStats(index)
    expect(stats.totalReferences).toBe(3)
    expect(stats.uniqueTargets).toBe(1)
    expect(stats.sourceFiles).toBe(2)
  })

  it('finds broken references', () => {
    const index = createEmptyIndex()

    addFileToIndex(index, '/vault/@finance/bills.data', [
      {
        value: 'acc:checking:001',
        targetId: 'acc:checking:001',
        type: 'entity-id',
        linkType: 'data:references',
        sourceFile: '/vault/@finance/bills.data',
        propertyPath: 'account',
      },
      {
        value: 'acc:nonexistent:999',
        targetId: 'acc:nonexistent:999',
        type: 'entity-id',
        linkType: 'data:references',
        sourceFile: '/vault/@finance/bills.data',
        propertyPath: 'brokenRef',
      },
    ])

    // Only acc:checking:001 exists
    const knownIds = new Set(['acc:checking:001'])
    const broken = findBrokenReferences(index, knownIds)

    expect(broken).toHaveLength(1)
    expect(broken[0].targetId).toBe('acc:nonexistent:999')
  })
})
