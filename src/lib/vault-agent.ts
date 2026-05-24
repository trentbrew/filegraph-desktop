import { invoke } from '@tauri-apps/api/core'

export interface VaultAgentResponse {
  output: string
  success: boolean
  error?: string
}

export interface VaultChangeRequest {
  filePath: string
  jsonPatch: string
}

/**
 * Query the vault using natural language via the text-based agent
 */
export async function queryVaultAgent(query: string, vaultPath?: string): Promise<VaultAgentResponse> {
  return await invoke<VaultAgentResponse>('vault_agent_query', {
    query,
    vaultPath,
  })
}

/**
 * Execute a vault change after user permission
 */
export async function executeVaultChange(
  filePath: string,
  jsonPatch: string,
  vaultPath?: string,
): Promise<VaultAgentResponse> {
  return await invoke<VaultAgentResponse>('vault_agent_execute_change', {
    filePath,
    jsonPatch,
    vaultPath,
  })
}

/**
 * Parse agent response to detect permission requests
 */
export function parseAgentResponse(output: string): {
  type: 'answer' | 'permission_request'
  content: string
  permissionNeeded?: {
    description: string
    diff?: string
    filePath?: string
    jsonPatch?: string
  }
} {
  // Check for permission request marker
  const permissionMatch = output.match(/📝\s*\*\*PERMISSION NEEDED\*\*:\s*(.+?)(?:\n|$)/i)

  if (permissionMatch) {
    // Extract diff if present
    const diffMatch = output.match(/```diff\n([\s\S]+?)\n```/)

    // Try to extract file path from diff
    const filePathMatch = diffMatch?.[1].match(/---\s+a:\/\/(.+?)\n/)

    return {
      type: 'permission_request',
      content: output,
      permissionNeeded: {
        description: permissionMatch[1].trim(),
        diff: diffMatch?.[1],
        filePath: filePathMatch?.[1],
      },
    }
  }

  return {
    type: 'answer',
    content: output,
  }
}

/**
 * Extract JSON patch from agent response
 * This is a simplified version - the agent should provide the patch in a structured format
 */
export function extractJsonPatch(diff: string): string {
  // For now, return a simple add operation
  // In production, this would parse the diff and construct proper JSON patch
  const jsonMatch = diff.match(/\+\s*({[\s\S]+?})\s*$/m)
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1])
      return JSON.stringify({ add: parsed })
    } catch (e) {
      console.error('Failed to parse JSON from diff:', e)
    }
  }
  return '{}'
}
