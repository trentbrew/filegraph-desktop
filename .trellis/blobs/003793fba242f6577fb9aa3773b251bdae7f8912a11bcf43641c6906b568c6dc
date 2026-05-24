/**
 * Test for write_file tool
 *
 * Run this test by importing and calling testWriteFile() from the browser console:
 *
 * import { testWriteFile } from '@/features/agent/tools/index.test'
 * await testWriteFile()
 *
 * Or expose it globally for quick testing:
 * (window as any).testWriteFile = testWriteFile
 */

import { executeToolCall } from './index'
import { describe, expect, it } from 'vitest'

const TEST_FILE_PATH = '@test/agent-write-test.txt'
const TEST_NOTE_PATH = '@test/agent-write-test.note'
const TEST_CONTENT = `Test file written by agent at ${new Date().toISOString()}`
const TEST_NOTE_CONTENT = JSON.stringify(
  {
    '@id': 'note:agent-test',
    title: 'Agent Test Note',
    created_at: new Date().toISOString(),
    blocks: [
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'This note was created by the agent write_file tool.' }],
      },
    ],
  },
  null,
  2,
)

export async function testWriteFile() {
  console.log('🧪 Testing write_file tool...\n')

  const results: { test: string; passed: boolean; details: any }[] = []

  // Test 1: Write a plain text file
  console.log('Test 1: Writing plain text file...')
  const writeResult = await executeToolCall('write_file', {
    path: TEST_FILE_PATH,
    content: TEST_CONTENT,
    createDirectories: true,
  })

  const test1Passed = writeResult.success === true
  results.push({
    test: 'Write plain text file',
    passed: test1Passed,
    details: writeResult,
  })
  console.log(test1Passed ? '✅ PASSED' : '❌ FAILED', writeResult)

  // Test 2: Read the file back
  console.log('\nTest 2: Reading file back...')
  const readResult = await executeToolCall('read_file', {
    path: TEST_FILE_PATH,
  })

  const test2Passed = readResult.content?.includes('Test file written by agent')
  results.push({
    test: 'Read file back',
    passed: test2Passed,
    details: readResult,
  })
  console.log(test2Passed ? '✅ PASSED' : '❌ FAILED', readResult)

  // Test 3: Write a .note file (JSON)
  console.log('\nTest 3: Writing .note file (JSON)...')
  const writeNoteResult = await executeToolCall('write_file', {
    path: TEST_NOTE_PATH,
    content: TEST_NOTE_CONTENT,
    createDirectories: true,
  })

  const test3Passed = writeNoteResult.success === true
  results.push({
    test: 'Write .note file',
    passed: test3Passed,
    details: writeNoteResult,
  })
  console.log(test3Passed ? '✅ PASSED' : '❌ FAILED', writeNoteResult)

  // Test 4: Write invalid JSON to .note file (should fail validation)
  console.log('\nTest 4: Writing invalid JSON to .note file (should fail)...')
  const invalidNoteResult = await executeToolCall('write_file', {
    path: '@test/invalid.note',
    content: 'this is not valid JSON',
    createDirectories: true,
  })

  const test4Passed = invalidNoteResult.error !== undefined
  results.push({
    test: 'Invalid JSON validation',
    passed: test4Passed,
    details: invalidNoteResult,
  })
  console.log(test4Passed ? '✅ PASSED (correctly rejected)' : '❌ FAILED (should have rejected)', invalidNoteResult)

  // Summary
  console.log('\n' + '='.repeat(50))
  console.log('📊 TEST SUMMARY')
  console.log('='.repeat(50))

  const passed = results.filter((r) => r.passed).length
  const total = results.length

  results.forEach((r) => {
    console.log(`${r.passed ? '✅' : '❌'} ${r.test}`)
  })

  console.log(`\n${passed}/${total} tests passed`)

  return { passed, total, results }
}

// Expose globally for easy console access
if (typeof window !== 'undefined') {
  ;(window as any).testWriteFile = testWriteFile
}

// This file primarily contains a manual browser-driven test helper, but Vitest
// will treat `*.test.ts` files as suites. Provide a tiny smoke test so the file
// is collected without failing as "No test suite found".
describe('agent tools manual test helper', () => {
  it('exports testWriteFile()', () => {
    expect(typeof testWriteFile).toBe('function')
  })
})
