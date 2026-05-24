/**
 * Agent Tools — Search Domain
 *
 * Web search and deep research tools (Gemini-powered).
 */

import { withAgentActivity } from './helpers'

// ─────────────────────────────────────────────────────────────────────────────
// Tool definitions
// ─────────────────────────────────────────────────────────────────────────────

export const SEARCH_TOOL_DEFINITIONS = [
  {
    type: 'function',
    name: 'web_search',
    description: `Search the web for current information using Google Search. Use this when the user asks about:
- Recent events or news
- Current facts that may have changed since your training
- Real-time information (weather, stock prices, sports scores)
- Anything requiring up-to-date web sources

Returns search results with citations. Requires Gemini as the provider.`,
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'The search query to look up on the web' },
      },
      required: ['query'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'deep_research',
    description: `Perform comprehensive multi-step research on a topic using Gemini Deep Research Agent. This is an "analyst-in-a-box" that autonomously:
- Plans a research strategy
- Searches multiple web sources
- Reads and synthesizes information
- Produces a detailed, cited report

**Use for:**
- Complex research questions requiring multiple sources
- In-depth analysis of topics
- Comprehensive reports with citations
- Questions that benefit from thorough investigation

**Note:** This runs asynchronously and may take 1-5 minutes to complete. Requires Gemini as the provider.`,
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'The research question or topic to investigate' },
      },
      required: ['query'],
      additionalProperties: false,
    },
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Handlers
// ─────────────────────────────────────────────────────────────────────────────

export async function webSearch(query: string): Promise<any> {
  return withAgentActivity('Searching web', [], async () => {
    try {
      if (typeof window === 'undefined') return { error: 'Web search only works in browser context' }

      const { useChatStore } = await import('@/features/agent/hooks/useChatStore')
      const config = useChatStore.getState().modelConfig

      if (config.provider !== 'gemini') {
        return { error: `Web search requires Gemini as the provider. Current provider: ${config.provider}. Please switch to Gemini in settings.` }
      }

      let apiKey = config.apiKey
      if (!apiKey) apiKey = import.meta.env.VITE_GEMINI_API_KEY
      if (!apiKey) return { error: 'Gemini API key not configured. Please add it in settings.' }

      const model = config.model || 'gemini-2.0-flash'
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: query }] }],
          tools: [{ googleSearch: {} }],
        }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        return { error: (error as any).error?.message || `API error: ${response.status}` }
      }

      const data = await response.json()
      const candidate = data.candidates?.[0]
      const parts = candidate?.content?.parts || []
      const textContent = parts
        .filter((p: { text?: string }) => p.text)
        .map((p: { text: string }) => p.text)
        .join('')

      const groundingMetadata = candidate?.groundingMetadata
      const searchEntryPoint = groundingMetadata?.searchEntryPoint
      const groundingChunks = groundingMetadata?.groundingChunks || []

      return {
        success: true,
        query,
        result: textContent,
        sources: groundingChunks.map((chunk: { web?: { uri?: string; title?: string } }) => ({
          url: chunk.web?.uri,
          title: chunk.web?.title,
        })),
        searchUrl: searchEntryPoint?.renderedContent,
      }
    } catch (err) {
      return { error: `Web search failed: ${err}` }
    }
  })
}

export async function deepResearch(query: string): Promise<any> {
  return withAgentActivity('Deep research (this may take a few minutes)', [], async () => {
    try {
      if (typeof window === 'undefined') return { error: 'Deep research only works in browser context' }

      const { useChatStore } = await import('@/features/agent/hooks/useChatStore')
      const config = useChatStore.getState().modelConfig

      if (config.provider !== 'gemini') {
        return { error: `Deep research requires Gemini as the provider. Current provider: ${config.provider}. Please switch to Gemini in settings.` }
      }

      let apiKey = config.apiKey
      if (!apiKey) apiKey = import.meta.env.VITE_GEMINI_API_KEY
      if (!apiKey) return { error: 'Gemini API key not configured. Please add it in settings.' }

      const startUrl = `https://generativelanguage.googleapis.com/v1beta/interactions?key=${apiKey}`
      const startResponse = await fetch(startUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: query,
          agent: 'deep-research-pro-preview-12-2025',
          background: true,
        }),
      })

      if (!startResponse.ok) {
        const error = await startResponse.json().catch(() => ({}))
        return { error: (error as any).error?.message || `Failed to start research: ${startResponse.status}` }
      }

      const startData = await startResponse.json()
      const interactionId = startData.id || startData.name?.split('/').pop()

      if (!interactionId) return { error: 'Failed to get interaction ID from response' }

      const maxAttempts = 30
      const pollInterval = 10000

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, pollInterval))

        const pollUrl = `https://generativelanguage.googleapis.com/v1beta/interactions/${interactionId}?key=${apiKey}`
        const pollResponse = await fetch(pollUrl)
        if (!pollResponse.ok) continue

        const pollData = await pollResponse.json()

        if (pollData.status === 'completed' || pollData.state === 'COMPLETED') {
          const outputs = pollData.outputs || []
          const lastOutput = outputs[outputs.length - 1]
          const resultText = lastOutput?.text || lastOutput?.content || JSON.stringify(outputs)
          return { success: true, query, result: resultText, interactionId, status: 'completed' }
        } else if (pollData.status === 'failed' || pollData.state === 'FAILED') {
          return { error: `Research failed: ${pollData.error || 'Unknown error'}`, interactionId }
        }
      }

      return {
        error: 'Research timed out after 5 minutes. The research may still be running in the background.',
        interactionId,
        status: 'timeout',
      }
    } catch (err) {
      return { error: `Deep research failed: ${err}` }
    }
  })
}
