/**
 * Vault initialization and management utilities
 */

import { invoke } from '@tauri-apps/api/core'

export interface VaultInitResult {
  path: string
  is_new: boolean
  structure_created: string[]
}

/**
 * Check if the default vault exists
 */
export async function checkVaultExists(): Promise<boolean> {
  return invoke<boolean>('check_vault_exists')
}

/**
 * Get the default vault path without creating it
 */
export async function getDefaultVaultPath(): Promise<string> {
  return invoke<string>('get_default_vault_path')
}

/**
 * Initialize the vault with opinionated structure
 * @param customPath Optional custom path for the vault (defaults to ~/.filegraph)
 */
export async function initializeVault(customPath?: string): Promise<VaultInitResult> {
  return invoke<VaultInitResult>('initialize_vault', { customPath })
}

/**
 * Default entity types available in a new vault
 */
export const DEFAULT_ENTITY_TYPES = ['people', 'orgs', 'places', 'notes', 'tasks', 'projects'] as const

export type EntityType = (typeof DEFAULT_ENTITY_TYPES)[number]

/**
 * Vault structure paths
 */
export const VAULT_PATHS = {
  internal: '.filegraph',
  entities: '@entities',
  collections: '@collections',
  inbox: 'inbox',
} as const
