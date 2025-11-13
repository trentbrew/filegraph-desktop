/**
 * TQL Validation Tests
 * Comprehensive validation suite for production readiness
 */

import type { TQLRuntime } from './runtime';
import { invoke } from '@tauri-apps/api/core';

const TEST_VAULT_PATH = '/Users/trentbrew/filegraph-test-vault';

export interface ValidationResult {
  name: string;
  passed: boolean;
  duration?: number;
  error?: string;
  warnings?: string[];
  details: Record<string, any>;
}

/**
 * Setup test vault with sample files
 */
export async function setupTestVault(): Promise<string> {
  console.log('[Validation] Setting up test vault...');

  // Create test vault directory
  try {
    await invoke('create_folder', {
      path: '/Users/trentbrew',
      name: 'filegraph-test-vault',
    });
  } catch (e) {
    // Already exists, that's fine
  }

  // Create some test files
  const testFiles = [
    { name: 'note-1.md', content: '# Note 1\n\nThis is a test note.' },
    { name: 'note-2.md', content: '# Note 2\n\nAnother test note with [[note-1]] link.' },
    { name: 'code.ts', content: 'export const test = "hello world";' },
    { name: 'data.json', content: '{"test": true, "value": 42}' },
    { name: 'readme.txt', content: 'Test vault for FileGraph validation.' },
  ];

  for (const file of testFiles) {
    const filePath = `${TEST_VAULT_PATH}/${file.name}`;
    try {
      await invoke('create_file', {
        path: TEST_VAULT_PATH,
        name: file.name,
      });
      await invoke('write_text_file', {
        filePath,
        content: file.content,
      });
    } catch (e) {
      console.log(`  Skipping ${file.name} (already exists)`);
    }
  }

  console.log(`[Validation] ✓ Test vault ready at ${TEST_VAULT_PATH}`);
  console.log(`[Validation]   Created ${testFiles.length} test files`);

  return TEST_VAULT_PATH;
}

export class TQLValidator {
  private runtime: TQLRuntime;

  constructor(runtime: TQLRuntime) {
    this.runtime = runtime;
  }

  /**
   * Test 4: Index Persistence
   */
  async testIndexPersistence(): Promise<ValidationResult> {
    const startTime = performance.now();
    const details: Record<string, any> = {};

    try {
      console.log('[Validation] Test 4: Index Persistence');

      const statsBefore = this.runtime.getStats();
      details.statsBefore = statsBefore;
      details.entitiesBeforeSave = statsBefore.uniqueEntities;

      console.log('[Validation] Forcing index save...');
      await this.runtime.save();

      const statsAfterSave = this.runtime.getStats();
      details.dirtyAfterSave = statsAfterSave.dirty;

      if (statsAfterSave.dirty) {
        throw new Error('Indexes still marked dirty after save');
      }

      console.log('[Validation] ✓ Indexes saved successfully');
      console.log('[Validation] ✓ Dirty flag cleared');

      return {
        name: 'Index Persistence',
        passed: true,
        duration: performance.now() - startTime,
        details,
      };
    } catch (err) {
      return {
        name: 'Index Persistence',
        passed: false,
        duration: performance.now() - startTime,
        error: err instanceof Error ? err.message : String(err),
        details,
      };
    }
  }

  /**
   * Test 5: Rename Preservation
   */
  async testRenamePreservation(): Promise<ValidationResult> {
    const startTime = performance.now();
    const details: Record<string, any> = {};

    try {
      console.log('[Validation] Test 5: Rename Preservation');

      const testDir = '/Users/trentbrew';
      const oldName = 'tql-rename-test-old.txt';
      const newName = 'tql-rename-test-new.txt';
      const oldPath = `${testDir}/${oldName}`;
      const newPath = `${testDir}/${newName}`;

      console.log('[Validation] Creating test file...');
      await invoke('create_file', { path: testDir, name: oldName });
      await invoke('write_text_file', {
        filePath: oldPath,
        content: 'rename test',
      });

      const items = (await invoke('list_directory', { path: testDir })) as any[];
      const fileItem = items.find((i) => i.path === oldPath);

      if (!fileItem) {
        throw new Error('Test file not found after creation');
      }

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

      await this.runtime.ingestFile(oldPath, stats);

      const oldId = this.runtime.getEntityId(oldPath);
      details.oldPath = oldPath;
      details.oldEntityId = oldId;

      if (!oldId) {
        throw new Error('Entity ID not found after ingestion');
      }

      console.log('[Validation] Original entity ID:', oldId);

      console.log('[Validation] Renaming file...');
      await invoke('rename_item', {
        oldPath,
        newName,
      });

      await new Promise((resolve) => setTimeout(resolve, 1000));

      const newId = this.runtime.getEntityId(newPath);
      details.newPath = newPath;
      details.newEntityId = newId;

      console.log('[Validation] New entity ID:', newId);

      if (!newId) {
        throw new Error('Entity ID not found after rename');
      }

      if (oldId !== newId) {
        throw new Error(
          `Entity ID changed! Old: ${oldId}, New: ${newId}`,
        );
      }

      try {
        await invoke('delete_item', { path: newPath });
      } catch {}

      console.log('[Validation] ✓ Entity ID preserved across rename');

      return {
        name: 'Rename Preservation',
        passed: true,
        duration: performance.now() - startTime,
        details,
      };
    } catch (err) {
      return {
        name: 'Rename Preservation',
        passed: false,
        duration: performance.now() - startTime,
        error: err instanceof Error ? err.message : String(err),
        details,
      };
    }
  }

  /**
   * Test 6: Initial Scan Performance
   */
  async testInitialScan(targetPath?: string): Promise<ValidationResult> {
    const startTime = performance.now();
    const details: Record<string, any> = {};
    const warnings: string[] = [];

    try {
      console.log('[Validation] Test 6: Initial Scan Performance');

      // Use test vault if no path provided
      const scanPath = targetPath || (await setupTestVault());

      details.scanPath = scanPath;
      console.log('[Validation] Scanning:', scanPath);

      const statsBefore = this.runtime.getStats();
      details.factsBeforeScan = statsBefore.totalFacts;
      details.entitiesBeforeScan = statsBefore.uniqueEntities;

      let lastProgress = 0;
      const progressCallback = (progress: {
        phase: string;
        processed: number;
        total: number;
        currentFile?: string;
      }) => {
        if (
          progress.processed - lastProgress >= 10 ||
          progress.processed === progress.total
        ) {
          console.log(
            `[Validation] Progress: ${progress.processed}/${progress.total} (${Math.round((progress.processed / progress.total) * 100)}%) - ${progress.phase}`,
          );
          lastProgress = progress.processed;
        }
      };

      const scanStart = performance.now();
      await this.runtime.initialScan(scanPath, progressCallback);
      const scanDuration = performance.now() - scanStart;

      const statsAfter = this.runtime.getStats();
      details.factsAfterScan = statsAfter.totalFacts;
      details.entitiesAfterScan = statsAfter.uniqueEntities;
      details.factsAdded = statsAfter.totalFacts - statsBefore.totalFacts;
      details.entitiesAdded =
        statsAfter.uniqueEntities - statsBefore.uniqueEntities;
      details.scanDuration = scanDuration;
      details.filesPerSecond = (details.entitiesAdded / scanDuration) * 1000;

      console.log('[Validation] Scan complete!');
      console.log(`[Validation]   Entities: ${details.entitiesAdded} files`);
      console.log(`[Validation]   Facts: ${details.factsAdded}`);
      console.log(`[Validation]   Duration: ${scanDuration.toFixed(0)}ms`);
      console.log(
        `[Validation]   Speed: ${details.filesPerSecond.toFixed(1)} files/sec`,
      );

      // Performance thresholds
      const MIN_FILES_PER_SECOND = 30;
      const MAX_SCAN_TIME_MS = 10000;

      if (details.filesPerSecond < MIN_FILES_PER_SECOND) {
        const warning = `⚠️  Scan speed below threshold: ${details.filesPerSecond.toFixed(1)} files/sec (min: ${MIN_FILES_PER_SECOND})`;
        console.warn(`[Validation] ${warning}`);
        console.warn('[Validation]    Consider optimizing file parsing or batching');
        warnings.push(warning);
      } else {
        console.log('[Validation] ✓ Performance acceptable');
      }

      if (scanDuration > MAX_SCAN_TIME_MS && details.entitiesAdded < 1000) {
        const warning = `⚠️  Scan took too long: ${scanDuration.toFixed(0)}ms`;
        console.warn(`[Validation] ${warning}`);
        console.warn('[Validation]    May need batching or background processing');
        warnings.push(warning);
      }

      if ((performance as any).memory) {
        const memMB = (performance as any).memory.usedJSHeapSize / 1024 / 1024;
        details.memoryUsageMB = memMB;
        console.log(`[Validation]   Memory: ${memMB.toFixed(1)} MB`);

        const memPerFile = memMB / (details.entitiesAdded || 1);
        if (memPerFile > 0.02) {
          const warning = `⚠️  High memory usage: ${memPerFile.toFixed(3)} MB/file`;
          console.warn(`[Validation] ${warning}`);
          warnings.push(warning);
        }
      }

      return {
        name: 'Initial Scan Performance',
        passed: true,
        duration: performance.now() - startTime,
        warnings,
        details,
      };
    } catch (err) {
      return {
        name: 'Initial Scan Performance',
        passed: false,
        duration: performance.now() - startTime,
        error: err instanceof Error ? err.message : String(err),
        warnings,
        details,
      };
    }
  }

  /**
   * Test 7: Query Performance
   */
  async testQueryPerformance(): Promise<ValidationResult> {
    const startTime = performance.now();
    const details: Record<string, any> = {};
    const warnings: string[] = [];

    try {
      console.log('[Validation] Test 7: Query Performance');

      const stats = this.runtime.getStats();
      details.totalFacts = stats.totalFacts;
      details.uniqueEntities = stats.uniqueEntities;

      if (stats.totalFacts === 0) {
        throw new Error('No facts in store. Run initial scan first (Test 6).');
      }

      if (stats.totalFacts < 100) {
        const warning = `⚠️  Not enough data for meaningful query tests (${stats.totalFacts} facts, recommended: 1000+)`;
        console.warn(`[Validation] ${warning}`);
        console.warn('[Validation]     Run validateScan() on a large directory first');
        warnings.push(warning);
      }

      console.log(`[Validation] Testing queries against ${stats.totalFacts} facts...`);

      const store = this.runtime.getStore();
      const benchmarks: Record<string, number> = {};

      console.log('[Validation] Benchmarking attribute queries...');
      const attrStart = performance.now();
      const typeResults = store.getFactsByAttribute('type');
      benchmarks.getFactsByAttribute = performance.now() - attrStart;
      details.typeResultsCount = typeResults.length;

      console.log('[Validation] Benchmarking value queries...');
      const valueStart = performance.now();
      const fileResults = store.getFactsByValue('type', 'file');
      benchmarks.getFactsByValue = performance.now() - valueStart;
      details.fileResultsCount = fileResults.length;

      if (fileResults.length > 0) {
        const sampleEntity = fileResults[0]?.e;
        if (sampleEntity) {
          console.log('[Validation] Benchmarking entity queries...');
          const entityStart = performance.now();
          const entityResults = store.getFactsByEntity(sampleEntity);
          benchmarks.getFactsByEntity = performance.now() - entityStart;
          details.entityResultsCount = entityResults.length;
        }
      }

      console.log('[Validation] Benchmarking catalog queries...');
      const catalogStart = performance.now();
      const catalog = store.getCatalog();
      benchmarks.getCatalog = performance.now() - catalogStart;
      details.catalogEntries = catalog.length;

      details.benchmarks = benchmarks;

      console.log('[Validation] Query Performance Results:');
      for (const [query, duration] of Object.entries(benchmarks)) {
        console.log(`[Validation]   ${query}: ${duration.toFixed(2)}ms`);
      }

      const MAX_ACCEPTABLE_QUERY_TIME = 100;
      const slowQueries = Object.entries(benchmarks).filter(
        ([_, duration]) => duration > MAX_ACCEPTABLE_QUERY_TIME,
      );

      if (slowQueries.length > 0) {
        console.warn(
          `[Validation] ⚠️  Slow queries detected (> ${MAX_ACCEPTABLE_QUERY_TIME}ms):`,
        );
        slowQueries.forEach(([query, duration]) => {
          const warning = `${query}: ${duration.toFixed(2)}ms`;
          console.warn(`[Validation]     ${warning}`);
          warnings.push(`⚠️  Slow query - ${warning}`);
        });
      } else {
        console.log('[Validation] ✓ All queries within acceptable range');
      }

      return {
        name: 'Query Performance',
        passed: true,
        duration: performance.now() - startTime,
        warnings,
        details,
      };
    } catch (err) {
      return {
        name: 'Query Performance',
        passed: false,
        duration: performance.now() - startTime,
        error: err instanceof Error ? err.message : String(err),
        warnings,
        details,
      };
    }
  }

  /**
   * Test 8: Concurrent Operations
   */
  async testConcurrentOperations(): Promise<ValidationResult> {
    const startTime = performance.now();
    const details: Record<string, any> = {};

    try {
      console.log('[Validation] Test 8: Concurrent Operations');

      const testDir = '/Users/trentbrew';
      const fileCount = 20;
      const timestamp = Date.now(); // Unique per test run

      // Record baseline stats BEFORE creating files
      const startStats = this.runtime.getStats();
      console.log('[Validation] Baseline stats:', startStats);

      // Create files concurrently with unique names
      console.log(`[Validation] Creating ${fileCount} files simultaneously...`);
      const opStartTime = performance.now();

      const createPromises = [];
      for (let i = 0; i < fileCount; i++) {
        const filename = `tql-test-${timestamp}-${i}.txt`;
        createPromises.push(
          invoke('create_file', {
            path: testDir,
            name: filename,
          }).then(() =>
            invoke('write_text_file', {
              filePath: `${testDir}/${filename}`,
              content: `Test file ${i} created at ${timestamp}`,
            }),
          ),
        );
      }

      await Promise.all(createPromises);
      console.log('[Validation] Files created');

      // STEP 5: Wait for create events to queue
      console.log('[Validation] Waiting for watcher events...');
      const maxWait = 5000;
      const pollInterval = 50;
      let waited = 0;

      while (waited < maxWait) {
        const queueSize = this.runtime.getQueueSize();

        if (queueSize >= fileCount) {
          console.log(`[Validation] Queue has ${queueSize} events, flushing...`);
          break;
        }

        if (waited % 500 === 0 && queueSize > 0) {
          console.log(`[Validation] Queue size: ${queueSize}/${fileCount}...`);
        }

        await new Promise((r) => setTimeout(r, pollInterval));
        waited += pollInterval;
      }

      if (waited >= maxWait) {
        console.warn(
          `[Validation] ⚠️ Timeout waiting for events (got ${this.runtime.getQueueSize()}/${fileCount})`,
        );
      }

      // STEP 6: Flush and verify
      console.log('[Validation] Flushing queue...');
      await this.runtime.flushQueue();

      const duration = performance.now() - opStartTime;
      const endStats = this.runtime.getStats();

      // STEP 7: Calculate deltas from baseline
      const entitiesAdded = endStats.uniqueEntities - startStats.uniqueEntities;
      const factsAdded = endStats.totalFacts - startStats.totalFacts;

      details.filesCreated = fileCount;
      details.entitiesAdded = entitiesAdded;
      details.factsAdded = factsAdded;
      details.duration = duration;
      details.throughput = (fileCount / (duration / 1000)).toFixed(1);

      console.log(`[Validation] Concurrent operation complete:`);
      console.log(`  Files created: ${fileCount}`);
      console.log(`  Entities added: ${entitiesAdded}`);
      console.log(`  Facts added: ${factsAdded}`);
      console.log(`  Duration: ${duration.toFixed(0)}ms`);
      console.log(`  Throughput: ${details.throughput} files/sec`);

      if (entitiesAdded !== fileCount) {
        console.error(`❌ Entity count mismatch! Expected ${fileCount}, got ${entitiesAdded}`);
        console.error('   Some events may have been dropped or files deleted before ingestion');
        throw new Error(
          `Entity count mismatch! Expected ${fileCount}, got ${entitiesAdded}`,
        );
      }

      console.log('✓ All concurrent operations processed correctly');

      // Cleanup test files (non-blocking)
      console.log('[Validation] Cleaning up test files...');
      for (let i = 0; i < fileCount; i++) {
        const filename = `tql-test-${timestamp}-${i}.txt`;
        invoke('delete_item', {
          path: `${testDir}/${filename}`,
        }).catch(() => {});
      }

      return {
        name: 'Concurrent Operations',
        passed: true,
        duration: performance.now() - startTime,
        details,
      };
    } catch (err) {
      return {
        name: 'Concurrent Operations',
        passed: false,
        duration: performance.now() - startTime,
        error: err instanceof Error ? err.message : String(err),
        details,
      };
    }
  }

  /**
   * Run all validation tests
   */
  async runAll(scanPath?: string): Promise<ValidationResult[]> {
    console.log('='.repeat(60));
    console.log('TQL VALIDATION SUITE');
    console.log('='.repeat(60));
    console.log('');

    const results: ValidationResult[] = [];

    results.push(await this.testIndexPersistence());
    console.log('');

    results.push(await this.testRenamePreservation());
    console.log('');

    results.push(await this.testInitialScan(scanPath));
    console.log('');

    results.push(await this.testQueryPerformance());
    console.log('');

    results.push(await this.testConcurrentOperations());
    console.log('');

    this.printSummary(results);

    return results;
  }

  private printSummary(results: ValidationResult[]) {
    console.log('='.repeat(60));
    console.log('VALIDATION SUMMARY');
    console.log('='.repeat(60));

    const passed = results.filter((r) => r.passed).length;
    const failed = results.filter((r) => !r.passed).length;
    const totalWarnings = results.reduce(
      (sum, r) => sum + (r.warnings?.length || 0),
      0,
    );

    for (const result of results) {
      const icon = result.passed ? '✓' : '✗';
      const duration = result.duration ? ` (${result.duration.toFixed(0)}ms)` : '';
      console.log(`${icon} ${result.name}${duration}`);

      if (result.error) {
        console.log(`  Error: ${result.error}`);
      }

      if (result.warnings && result.warnings.length > 0) {
        result.warnings.forEach((w) => console.log(`  ${w}`));
      }
    }

    console.log('');
    console.log(`✓ Passed: ${passed}`);
    console.log(`✗ Failed: ${failed}`);
    console.log(`⚠️  Warnings: ${totalWarnings}`);
    console.log('');

    if (failed === 0 && totalWarnings === 0) {
      console.log('🎉 ALL TESTS PASSED - Core is production ready!');
      console.log('   You can now build UI features with confidence.');
    } else if (failed === 0) {
      console.log('✓ All tests passed, but there are warnings to review.');
      console.log('  Consider addressing warnings before production.');
    } else {
      console.log('⚠️  ISSUES DETECTED - Review failures before proceeding');
    }
  }
}

/**
 * Expose validator to window in dev mode
 */
export function exposeTQLValidator(runtime: TQLRuntime): void {
  if (import.meta.env.DEV) {
    const validator = new TQLValidator(runtime);
    (window as any).validateTQL = (scanPath?: string) =>
      validator.runAll(scanPath);
    (window as any).validateScan = (scanPath?: string) =>
      validator.testInitialScan(scanPath);
    (window as any).validateQuery = () => validator.testQueryPerformance();
    (window as any).validateConcurrent = () => validator.testConcurrentOperations();
    console.log('[TQL] Validator exposed:');
    console.log('[TQL]   validateTQL(scanPath?) - Run all validation tests');
    console.log('[TQL]   validateScan(scanPath?) - Test initial scan only');
    console.log('[TQL]   validateQuery() - Test query performance only');
    console.log('[TQL]   validateConcurrent() - Test concurrent operations only');
  }
}
