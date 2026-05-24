/**
 * TQL - Entity-Attribute-Value Store
 *
 * A simple in-memory EAV store for managing facts and links between entities.
 */

/**
 * A fact represents an attribute-value pair for an entity.
 * Example: { e: "file-123", a: "name", v: "document.txt" }
 */
export interface Fact {
  e: string // entity ID
  a: string // attribute name
  v: string | number | boolean // value
}

/**
 * A link represents a relationship between two entities.
 * Example: { e1: "folder-1", a: "fs:contains", e2: "file-123" }
 */
export interface Link {
  e1: string // source entity ID
  a: string // relationship type
  e2: string // target entity ID
}

/**
 * Result of a query execution
 */
export interface QueryResult {
  bindings: Record<string, any>[]
  executionTime: number
}

/**
 * EAV Store - In-memory entity-attribute-value database
 */
export class EAVStore {
  private facts: Map<string, Fact[]> = new Map() // entity -> facts
  private links: Link[] = []
  private linksByEntity: Map<string, Link[]> = new Map()

  /**
   * Add facts to the store
   */
  addFacts(facts: Fact[]): void {
    for (const fact of facts) {
      const existing = this.facts.get(fact.e) || []
      existing.push(fact)
      this.facts.set(fact.e, existing)
    }
  }

  /**
   * Add links to the store
   */
  addLinks(links: Link[]): void {
    for (const link of links) {
      this.links.push(link)

      // Index by source entity
      const e1Links = this.linksByEntity.get(link.e1) || []
      e1Links.push(link)
      this.linksByEntity.set(link.e1, e1Links)

      // Index by target entity
      const e2Links = this.linksByEntity.get(link.e2) || []
      e2Links.push(link)
      this.linksByEntity.set(link.e2, e2Links)
    }
  }

  /**
   * Get all facts for an entity
   */
  getFactsByEntity(entityId: string): Fact[] {
    return this.facts.get(entityId) || []
  }

  /**
   * Get links by entity and attribute
   */
  getLinksByEntityAndAttribute(entityId: string, attribute: string): Link[] {
    const allLinks = this.linksByEntity.get(entityId) || []
    return allLinks.filter((link) => link.a === attribute && link.e1 === entityId)
  }

  /**
   * Get all links involving an entity
   */
  getLinksByEntity(entityId: string): Link[] {
    return this.linksByEntity.get(entityId) || []
  }

  /**
   * Get backlinks - links where this entity is the TARGET (e2)
   */
  getBacklinks(targetId: string): Link[] {
    const allLinks = this.linksByEntity.get(targetId) || []
    return allLinks.filter((link) => link.e2 === targetId)
  }

  /**
   * Get outgoing links - links where this entity is the SOURCE (e1)
   */
  getOutgoingLinks(sourceId: string): Link[] {
    const allLinks = this.linksByEntity.get(sourceId) || []
    return allLinks.filter((link) => link.e1 === sourceId)
  }

  /**
   * Remove all links from a source entity
   * Used for incremental updates when a file is modified
   */
  removeLinksFromSource(sourceId: string): number {
    const toRemove = this.links.filter((link) => link.e1 === sourceId)
    if (toRemove.length === 0) return 0

    // Remove from main links array
    this.links = this.links.filter((link) => link.e1 !== sourceId)

    // Remove from source index
    this.linksByEntity.delete(sourceId)

    // Remove from target indexes
    for (const link of toRemove) {
      const targetLinks = this.linksByEntity.get(link.e2)
      if (targetLinks) {
        const filtered = targetLinks.filter((l) => l.e1 !== sourceId)
        if (filtered.length > 0) {
          this.linksByEntity.set(link.e2, filtered)
        } else {
          this.linksByEntity.delete(link.e2)
        }
      }
    }

    return toRemove.length
  }

  /**
   * Check if a link exists between two entities
   */
  hasLink(sourceId: string, targetId: string, attribute?: string): boolean {
    const links = this.linksByEntity.get(sourceId) || []
    return links.some((link) => link.e1 === sourceId && link.e2 === targetId && (!attribute || link.a === attribute))
  }

  /**
   * Get all unique target IDs that are referenced
   */
  getAllTargetIds(): Set<string> {
    const targets = new Set<string>()
    for (const link of this.links) {
      targets.add(link.e2)
    }
    return targets
  }

  /**
   * Get all unique source IDs that have outgoing links
   */
  getAllSourceIds(): Set<string> {
    const sources = new Set<string>()
    for (const link of this.links) {
      sources.add(link.e1)
    }
    return sources
  }

  /**
   * Get all facts from the store
   */
  getAllFacts(): Fact[] {
    const allFacts: Fact[] = []
    for (const facts of this.facts.values()) {
      allFacts.push(...facts)
    }
    return allFacts
  }

  /**
   * Get all links from the store
   */
  getAllLinks(): Array<{ source: string; target: string; type: string }> {
    return this.links.map((link) => ({
      source: link.e1,
      target: link.e2,
      type: link.a,
    }))
  }

  /**
   * Get statistics about the store
   */
  getStats(): { factCount: number; linkCount: number; entityCount: number } {
    let factCount = 0
    for (const facts of this.facts.values()) {
      factCount += facts.length
    }
    return {
      factCount,
      linkCount: this.links.length,
      entityCount: this.facts.size,
    }
  }

  /**
   * Clear all data from the store
   */
  clear(): void {
    this.facts.clear()
    this.links = []
    this.linksByEntity.clear()
  }
}

/**
 * Create facts from a JSON object for an entity
 * Useful for storing metadata objects as facts
 */
export function jsonEntityFacts(entityId: string, obj: Record<string, any>, type?: string): Fact[] {
  const facts: Fact[] = []

  if (type) {
    facts.push({ e: entityId, a: 'type', v: type })
  }

  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null) continue

    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      facts.push({ e: entityId, a: key, v: value })
    } else if (Array.isArray(value)) {
      // Store arrays as individual facts with indexed attribute names
      for (let i = 0; i < value.length; i++) {
        const item = value[i]
        if (typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean') {
          facts.push({ e: entityId, a: `${key}[${i}]`, v: item })
        }
      }
    }
    // Skip nested objects for now
  }

  return facts
}
