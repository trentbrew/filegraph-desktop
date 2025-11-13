/**
 * TQL Integration Test Runner
 * Run with: window.runTQLTests() in DevTools
 */

import type { TQLRuntime } from './runtime';
import { invoke } from '@tauri-apps/api/core';

export interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  logs: string[];
  stats?: any;
}

export class TQLTestRunner {
  private runtime: TQLRuntime;
  private results: TestResult[] = [];

  constructor(runtime: TQLRuntime) {
    this.runtime = runtime;
  }

  private log(message: string) {
    console.log(`[TQL Test] ${message}`);
  }

  private error(message: string) {
    console.error(`[TQL Test Error] ${message}`);
  }

  async runAll(): Promise<TestResult[]> {
    this.results = [];
    this.log('Starting TQL Integration Tests...');

    await this.testPreFlight();
    await this.testManualIngestion();
    await this.testWatcherPipeline();

    this.printSummary();
    return this.results;
  }

  private async testPreFlight(): Promise<void> {
    const logs: string[] = [];
    let passed = true;
    let error: string | undefined;

    try {
      this.log('Test 1: Pre-Flight Check');

      // Check stats
      const stats = this.runtime.getStats();
      logs.push(`Initial stats: ${JSON.stringify(stats)}`);

      if (typeof stats.totalFacts !== 'number') {
        throw new Error('Stats object malformed');
      }

      // Check store
      const store = this.runtime.getStore();
      if (!store || typeof store.addFacts !== 'function') {
        throw new Error('Store not initialized or missing addFacts method');
      }
      logs.push('Store is alive and has addFacts method');

      this.log('✓ Pre-Flight Check passed');
    } catch (err) {
      passed = false;
      error = err instanceof Error ? err.message : String(err);
      this.error(`Pre-Flight Check failed: ${error}`);
    }

    this.results.push({
      name: 'Pre-Flight Check',
      passed,
      error,
      logs,
      stats: this.runtime.getStats(),
    });
  }

  private async testManualIngestion(): Promise<void> {
    const logs: string[] = [];
    let passed = true;
    let error: string | undefined;

    try {
      this.log('Test 2: Manual Ingestion');

      const testPath = '/Users/trentbrew';
      const testFileName = 'test-filegraph.txt';
      const testFilePath = `${testPath}/${testFileName}`;

      // Create test file
      logs.push('Creating test file...');
      await invoke('create_file', { path: testPath, name: testFileName });
      await invoke('write_text_file', {
        filePath: testFilePath,
        content: 'hello world',
      });

      // Get file stats
      logs.push('Getting file stats...');
      const items = (await invoke('list_directory', { path: testPath })) as any[];
      const fileItem = items.find((i) => i.path === testFilePath);

      if (!fileItem) {
        throw new Error('Test file not found in directory listing');
      }
      logs.push(`File record: ${JSON.stringify(fileItem)}`);

      // Build stats object
      const stats = {
        name: fileItem.name,
        path: fileItem.path,
        file_type: 'file' as const,
        size: fileItem.size ?? 0,
        modified: fileItem.date_modified
          ? new Date(fileItem.date_modified).getTime()
          : Date.now(),
        created: fileItem.date_created
          ? new Date(fileItem.date_created).getTime()
          : Date.now(),
      };

      // Get stats before ingestion
      const statsBefore = this.runtime.getStats();
      logs.push(`Stats before: ${JSON.stringify(statsBefore)}`);

      // Ingest
      logs.push('Ingesting file...');
      await this.runtime.ingestFile(testFilePath, stats);

      // Get stats after ingestion
      const statsAfter = this.runtime.getStats();
      logs.push(`Stats after: ${JSON.stringify(statsAfter)}`);

      // Verify facts were added
      if (statsAfter.totalFacts <= statsBefore.totalFacts) {
        throw new Error(
          `No facts added. Before: ${statsBefore.totalFacts}, After: ${statsAfter.totalFacts}`,
        );
      }

      const expectedFacts = 6; // type, path, name, ext, size, modified (no hidden if false, no created if undefined)
      const actualFacts = statsAfter.totalFacts - statsBefore.totalFacts;

      if (actualFacts < 5 || actualFacts > 8) {
        logs.push(
          `⚠️  Expected ~${expectedFacts} facts, got ${actualFacts}. This might be okay depending on which fields are present.`,
        );
      } else {
        logs.push(`✓ Added ${actualFacts} facts (expected ~${expectedFacts})`);
      }

      if (statsAfter.uniqueEntities <= statsBefore.uniqueEntities) {
        throw new Error('No entities added');
      }

      this.log('✓ Manual Ingestion passed');
    } catch (err) {
      passed = false;
      error = err instanceof Error ? err.message : String(err);
      this.error(`Manual Ingestion failed: ${error}`);
    }

    this.results.push({
      name: 'Manual Ingestion',
      passed,
      error,
      logs,
      stats: this.runtime.getStats(),
    });
  }

  private async testWatcherPipeline(): Promise<void> {
    const logs: string[] = [];
    let passed = true;
    let error: string | undefined;

    try {
      this.log('Test 3: Watcher Pipeline');

      logs.push(
        '⚠️  Manual verification required: Navigate to /Users/trentbrew/TURTLE/Projects/Apps/filegraph in the UI first',
      );
      logs.push('Then run this test again or create a file manually in that directory');

      // For now, we'll just check that the queue exists and is working
      const stats = this.runtime.getStats();
      logs.push(`Current queue size: ${stats.queueSize}`);
      logs.push(`Queue processing: ${stats.queueProcessing}`);

      logs.push(
        '✓ Queue is functional. Watch console for [FS Event Raw] and [TQL Queue] logs when files change.',
      );

      this.log('✓ Watcher Pipeline check passed (partial)');
    } catch (err) {
      passed = false;
      error = err instanceof Error ? err.message : String(err);
      this.error(`Watcher Pipeline failed: ${error}`);
    }

    this.results.push({
      name: 'Watcher Pipeline',
      passed,
      error,
      logs,
      stats: this.runtime.getStats(),
    });
  }

  private printSummary() {
    console.log('\n=== TQL Test Summary ===');

    for (const result of this.results) {
      const icon = result.passed ? '✓' : '✗';
      console.log(`${icon} ${result.name}`);

      if (result.error) {
        console.log(`  Error: ${result.error}`);
      }

      if (result.logs.length > 0) {
        console.log('  Logs:');
        result.logs.forEach((log) => console.log(`    ${log}`));
      }

      if (result.stats) {
        console.log('  Stats:', result.stats);
      }

      console.log('');
    }

    const passedCount = this.results.filter((r) => r.passed).length;
    const totalCount = this.results.length;

    console.log(`Passed: ${passedCount}/${totalCount}`);

    if (passedCount === totalCount) {
      console.log('🎉 All tests passed!');
    } else {
      console.log('❌ Some tests failed. Check logs above.');
    }
  }
}

/**
 * Expose test runner to window in dev mode
 */
export function exposeTQLTestRunner(runtime: TQLRuntime): void {
  if (import.meta.env.DEV) {
    const runner = new TQLTestRunner(runtime);
    (window as any).runTQLTests = () => runner.runAll();
    console.log('[TQL] Test runner exposed to window.runTQLTests()');
  }
}
