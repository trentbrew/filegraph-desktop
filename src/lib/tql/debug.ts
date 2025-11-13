/**
 * TQL Debug Helpers
 * 
 * Utility functions for console debugging and verification
 */

import type { TQLRuntime } from './runtime';

/**
 * Console debugging helpers exposed to window
 */
export class TQLDebugger {
  constructor(private runtime: TQLRuntime) {}

  /**
   * Get current stats
   */
  stats() {
    const stats = this.runtime.getStats();
    console.table(stats);
    return stats;
  }

  /**
   * Get all facts (limited to first 100)
   */
  facts(limit = 100) {
    const facts = this.runtime.getStore().getAllFacts().slice(0, limit);
    console.table(facts);
    return facts;
  }

  /**
   * Get all links (limited to first 100)
   */
  links(limit = 100) {
    const links = this.runtime.getStore().getAllLinks().slice(0, limit);
    console.table(links);
    return links;
  }

  /**
   * Get facts for a specific entity
   */
  entity(path: string) {
    const store = this.runtime.getStore();
    const facts = store.getFactsByEntity(path);
    console.table(facts);
    return facts;
  }

  /**
   * Get facts by attribute
   */
  attribute(attr: string) {
    const store = this.runtime.getStore();
    const facts = store.getFactsByAttribute(attr);
    console.table(facts);
    return facts;
  }

  /**
   * Get catalog (schema)
   */
  catalog() {
    const catalog = this.runtime.getStore().getCatalog();
    console.table(catalog);
    return catalog;
  }

  /**
   * Run a query (stubbed for now)
   */
  query(eqls: string) {
    console.log('[TQL Debug] Running query:', eqls);
    const result = this.runtime.runQuery(eqls);
    console.log('[TQL Debug] Result:', result);
    return result;
  }

  /**
   * Get queue status
   */
  queue() {
    const stats = this.runtime.getStats();
    console.log('[TQL Debug] Queue:', {
      size: stats.queueSize,
      processing: stats.queueProcessing,
    });
    return {
      size: stats.queueSize,
      processing: stats.queueProcessing,
    };
  }

  /**
   * Force save indexes
   */
  async save() {
    console.log('[TQL Debug] Saving indexes...');
    await this.runtime.save();
    console.log('[TQL Debug] Indexes saved');
  }

  /**
   * Print help
   */
  help() {
    console.log(`
TQL Debugger Commands:

  tql.stats()           - Show runtime statistics
  tql.facts(limit?)     - Show all facts (default: 100)
  tql.links(limit?)     - Show all links (default: 100)
  tql.entity(path)      - Show facts for entity at path
  tql.attribute(attr)   - Show all facts with attribute
  tql.catalog()         - Show schema catalog
  tql.query(eqls)       - Run a TQL query
  tql.queue()           - Show queue status
  tql.save()            - Save indexes to disk
  tql.help()            - Show this help

Examples:

  tql.stats()
  tql.facts(10)
  tql.entity("file:abc-123-...")
  tql.attribute("type")
  tql.query('FIND f WHERE f.type = "file"')
    `);
  }
}

/**
 * Expose debugger to window in dev mode
 */
export function exposeTQLDebugger(runtime: TQLRuntime): void {
  if (import.meta.env.DEV) {
    const dbg = new TQLDebugger(runtime);
    (window as any).tql = dbg;
    console.log('[TQL] Debugger exposed to window.tql');
    console.log('[TQL] Type tql.help() for available commands');
  }
}
