/**
 * Namespace Configuration - Single source of truth for entity namespaces
 *
 * All namespace-related constants and utilities are defined here.
 * To add a new namespace, just add an entry to NAMESPACES.
 */

export interface NamespaceConfig {
  /** Relative path from vault root to the data file */
  file: string
  /** Human-readable label */
  label: string
}

/**
 * Master namespace registry
 * Add new namespaces here — all other files import from this.
 */
export const NAMESPACES: Record<string, NamespaceConfig> = {
  // @entities namespace (RFC-002 canonical locations)
  person: { file: '@entities/people.data', label: 'People' },
  org: { file: '@entities/organizations.data', label: 'Organizations' },
  proj: { file: '@entities/projects.data', label: 'Projects' },
  task: { file: '@entities/tasks.data', label: 'Tasks' },
  ms: { file: '@entities/milestones.data', label: 'Milestones' },
  canvas: { file: '@entities/canvases.data', label: 'Canvases' },
  note: { file: '@notes', label: 'Notes' },
  whiteboard: { file: '@entities/whiteboards.data', label: 'Whiteboards' },
  cycle: { file: '@entities/cycles.data', label: 'Cycles' },
  collection: { file: '@entities/collections.data', label: 'Collections' },

  // @finance namespace
  acc: { file: '@finance/accounts.data', label: 'Accounts' },
  tx: { file: '@finance/transactions.data', label: 'Transactions' },
  bill: { file: '@finance/bills.data', label: 'Bills' },
  goal: { file: '@finance/goals.data', label: 'Goals' },
  inc: { file: '@finance/income.data', label: 'Income' },
  ins: { file: '@finance/insurance.data', label: 'Insurance' },
  exp: { file: '@finance/expenses.data', label: 'Expenses' },
  tax: { file: '@finance/taxes.data', label: 'Taxes' },
  sub: { file: '@finance/subscriptions.data', label: 'Subscriptions' },
  cat: { file: '@finance/categories.data', label: 'Categories' },
  annual: { file: '@finance/annual.data', label: 'Annual' },

  // @ai namespace
  agent: { file: '@ai/agents.data', label: 'Agents' },
  persona: { file: '@ai/personas.data', label: 'Personas' },
  prompt: { file: '@ai/prompts.data', label: 'Prompts' },
  skill: { file: '@ai/skills.data', label: 'Skills' },
  tool: { file: '@ai/tools.data', label: 'Tools' },

  // @calendar namespace
  event: { file: '@calendar/events.data', label: 'Events' },
  reminder: { file: '@calendar/reminders.data', label: 'Reminders' },

  // @email namespace
  email: { file: '@email/inbox.data', label: 'Emails' },

  // @inbox namespace
  dm: { file: '@inbox/@local/dms.data', label: 'DMs' },
  channel: { file: '@inbox/@local/channels.data', label: 'Channels' },
  thread: { file: '@inbox/@local/threads.data', label: 'Threads' },
} as const

/** All valid namespace keys */
export const NAMESPACE_KEYS = Object.keys(NAMESPACES) as (keyof typeof NAMESPACES)[]

/** Namespace to file path mapping (for backwards compatibility) */
export const NAMESPACE_FILES: Record<string, string> = Object.fromEntries(
  Object.entries(NAMESPACES).map(([key, config]) => [key, config.file]),
)

/** Namespace to label mapping */
export const NAMESPACE_LABELS: Record<string, string> = Object.fromEntries(
  Object.entries(NAMESPACES).map(([key, config]) => [key, config.label]),
)

/**
 * Entity ID pattern regex
 * Matches: person:sarah:001, proj:turtle-tech, acc:checking:001, etc.
 */
export const ENTITY_ID_PATTERN = new RegExp(`\\b(${NAMESPACE_KEYS.join('|')}):[a-z0-9-]+(?::[0-9]+)?\\b`, 'gi')

/**
 * Note file pattern regex
 * Matches: Schema.note, @notes/Pillars.note, etc.
 */
export const NOTE_FILE_PATTERN = /(?:@notes\/)?[A-Za-z0-9_-]+\.note\b/g

/**
 * Combined reference pattern (entity IDs + note files)
 */
export const REFERENCE_PATTERN = new RegExp(
  `(?:\\b(${NAMESPACE_KEYS.join('|')}):[a-z0-9-]+(?::[0-9]+)?\\b)|(?:(?:@notes\\/)?[A-Za-z0-9_-]+\\.note\\b)`,
  'gi',
)

/**
 * Check if a string is a valid entity ID
 */
export function isEntityId(text: string): boolean {
  ENTITY_ID_PATTERN.lastIndex = 0
  return ENTITY_ID_PATTERN.test(text)
}

/**
 * Check if a string is a note file reference
 */
export function isNoteFile(text: string): boolean {
  return text.endsWith('.note')
}

/**
 * Check if a string matches any reference pattern
 */
export function isReference(text: string): boolean {
  return isEntityId(text) || isNoteFile(text)
}

/**
 * Get the file path for a namespace
 */
export function getNamespaceFile(namespace: string): string | undefined {
  return NAMESPACES[namespace]?.file
}

/**
 * Get the namespace from an entity ID
 */
export function extractNamespace(entityId: string): string | undefined {
  const [namespace] = entityId.split(':')
  return namespace in NAMESPACES ? namespace : undefined
}
