/**
 * Agent Telemetry Store
 *
 * Tracks agent usage, performance, and costs across sessions.
 */

import React from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AgentRequest, SessionStats, DailyStats, TokenUsage, ToolInvocation, ReasoningStep } from './types'
import { calculateCost } from './types'
import type { ProviderId } from '@/lib/providers'

interface TelemetryState {
  // Current session
  sessionRequests: AgentRequest[]
  sessionStartTime: number

  // Historical (persisted)
  dailyStats: DailyStats[]
  totalRequests: number
  totalTokens: TokenUsage
  totalCost: number

  // Actions
  recordRequest: (request: Omit<AgentRequest, 'id' | 'timestamp'>) => string
  updateRequest: (id: string, updates: Partial<AgentRequest>) => void
  getSessionStats: () => SessionStats
  getDailyStats: (days?: number) => DailyStats[]
  clearSession: () => void
  exportData: () => { requests: AgentRequest[]; dailyStats: DailyStats[] }
}

const EMPTY_TOKENS: TokenUsage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 }

function getToday(): string {
  return new Date().toISOString().split('T')[0]
}

function createEmptyDailyStats(date: string): DailyStats {
  return {
    date,
    requestCount: 0,
    successCount: 0,
    errorCount: 0,
    tokens: { ...EMPTY_TOKENS },
    cost: 0,
    avgLatencyMs: 0,
    byProvider: {} as Record<ProviderId, { requests: number; tokens: number; cost: number }>,
    byModel: {},
  }
}

export const useTelemetryStore = create<TelemetryState>()(
  persist(
    (set, get) => ({
      // Initial state
      sessionRequests: [],
      sessionStartTime: Date.now(),
      dailyStats: [],
      totalRequests: 0,
      totalTokens: { ...EMPTY_TOKENS },
      totalCost: 0,

      recordRequest: (request) => {
        const id = crypto.randomUUID()
        const timestamp = Date.now()
        const fullRequest: AgentRequest = {
          ...request,
          id,
          timestamp,
        }

        set((state) => {
          // Update session requests
          const sessionRequests = [...state.sessionRequests, fullRequest]

          // Update daily stats
          const today = getToday()
          let dailyStats = [...state.dailyStats]
          let todayStats = dailyStats.find((d) => d.date === today)

          if (!todayStats) {
            todayStats = createEmptyDailyStats(today)
            dailyStats.push(todayStats)
          }

          // Update today's stats
          todayStats.requestCount++
          if (request.error) {
            todayStats.errorCount++
          } else {
            todayStats.successCount++
          }
          todayStats.tokens.inputTokens += request.tokens.inputTokens
          todayStats.tokens.outputTokens += request.tokens.outputTokens
          todayStats.tokens.totalTokens += request.tokens.totalTokens
          todayStats.cost += request.cost.total

          // Update latency avg
          const prevTotal = todayStats.avgLatencyMs * (todayStats.requestCount - 1)
          todayStats.avgLatencyMs = (prevTotal + request.latencyMs) / todayStats.requestCount

          // Update by provider
          const providerKey = request.provider
          if (!todayStats.byProvider[providerKey]) {
            todayStats.byProvider[providerKey] = { requests: 0, tokens: 0, cost: 0 }
          }
          todayStats.byProvider[providerKey].requests++
          todayStats.byProvider[providerKey].tokens += request.tokens.totalTokens
          todayStats.byProvider[providerKey].cost += request.cost.total

          // Update by model
          const modelKey = request.model
          if (!todayStats.byModel[modelKey]) {
            todayStats.byModel[modelKey] = { requests: 0, tokens: 0, cost: 0 }
          }
          todayStats.byModel[modelKey].requests++
          todayStats.byModel[modelKey].tokens += request.tokens.totalTokens
          todayStats.byModel[modelKey].cost += request.cost.total

          // Keep only last 90 days
          dailyStats = dailyStats.slice(-90)

          return {
            sessionRequests,
            dailyStats,
            totalRequests: state.totalRequests + 1,
            totalTokens: {
              inputTokens: state.totalTokens.inputTokens + request.tokens.inputTokens,
              outputTokens: state.totalTokens.outputTokens + request.tokens.outputTokens,
              totalTokens: state.totalTokens.totalTokens + request.tokens.totalTokens,
            },
            totalCost: state.totalCost + request.cost.total,
          }
        })

        return id
      },

      updateRequest: (id, updates) => {
        set((state) => ({
          sessionRequests: state.sessionRequests.map((r) => (r.id === id ? { ...r, ...updates } : r)),
        }))
      },

      getSessionStats: () => {
        const state = get()
        const requests = state.sessionRequests

        const toolCounts: Record<string, number> = {}
        let totalToolCalls = 0

        for (const req of requests) {
          for (const tc of req.toolCalls) {
            toolCounts[tc.name] = (toolCounts[tc.name] || 0) + 1
            totalToolCalls++
          }
        }

        const mostUsedTools = Object.entries(toolCounts)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10)

        const totalLatency = requests.reduce((sum, r) => sum + r.latencyMs, 0)

        return {
          requestCount: requests.length,
          successCount: requests.filter((r) => !r.error).length,
          errorCount: requests.filter((r) => r.error).length,
          totalTokens: {
            inputTokens: requests.reduce((sum, r) => sum + r.tokens.inputTokens, 0),
            outputTokens: requests.reduce((sum, r) => sum + r.tokens.outputTokens, 0),
            totalTokens: requests.reduce((sum, r) => sum + r.tokens.totalTokens, 0),
          },
          totalCost: requests.reduce((sum, r) => sum + r.cost.total, 0),
          avgLatencyMs: requests.length > 0 ? totalLatency / requests.length : 0,
          toolCallCount: totalToolCalls,
          mostUsedTools,
          startTime: state.sessionStartTime,
        }
      },

      getDailyStats: (days = 30) => {
        const state = get()
        return state.dailyStats.slice(-days)
      },

      clearSession: () => {
        set({
          sessionRequests: [],
          sessionStartTime: Date.now(),
        })
      },

      exportData: () => {
        const state = get()
        return {
          requests: state.sessionRequests,
          dailyStats: state.dailyStats,
        }
      },
    }),
    {
      name: 'filegraph-agent-telemetry',
      partialize: (state) => ({
        dailyStats: state.dailyStats,
        totalRequests: state.totalRequests,
        totalTokens: state.totalTokens,
        totalCost: state.totalCost,
      }),
    },
  ),
)

/**
 * Hook to get live session stats
 * Uses useMemo to avoid infinite re-renders from creating new objects
 */
export function useSessionStats(): SessionStats {
  const sessionRequests = useTelemetryStore((state) => state.sessionRequests)
  const sessionStartTime = useTelemetryStore((state) => state.sessionStartTime)

  return React.useMemo(() => {
    const toolCounts: Record<string, number> = {}
    let totalToolCalls = 0

    for (const req of sessionRequests) {
      for (const tc of req.toolCalls) {
        toolCounts[tc.name] = (toolCounts[tc.name] || 0) + 1
        totalToolCalls++
      }
    }

    const mostUsedTools = Object.entries(toolCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    const totalLatency = sessionRequests.reduce((sum, r) => sum + r.latencyMs, 0)

    return {
      requestCount: sessionRequests.length,
      successCount: sessionRequests.filter((r) => !r.error).length,
      errorCount: sessionRequests.filter((r) => r.error).length,
      totalTokens: {
        inputTokens: sessionRequests.reduce((sum, r) => sum + r.tokens.inputTokens, 0),
        outputTokens: sessionRequests.reduce((sum, r) => sum + r.tokens.outputTokens, 0),
        totalTokens: sessionRequests.reduce((sum, r) => sum + r.tokens.totalTokens, 0),
      },
      totalCost: sessionRequests.reduce((sum, r) => sum + r.cost.total, 0),
      avgLatencyMs: sessionRequests.length > 0 ? totalLatency / sessionRequests.length : 0,
      toolCallCount: totalToolCalls,
      mostUsedTools,
      startTime: sessionStartTime,
    }
  }, [sessionRequests, sessionStartTime])
}

/**
 * Create a request builder for instrumentation
 */
export function createRequestBuilder(
  conversationId: string,
  userMessage: string,
  provider: ProviderId,
  model: string,
): {
  startTime: number
  addToolCall: (tc: ToolInvocation) => void
  setReasoning: (steps: ReasoningStep[]) => void
  complete: (response: {
    assistantMessage: string
    finishReason: 'stop' | 'tool_calls' | 'length' | 'error'
    tokens: TokenUsage
    error?: string
    errorType?: AgentRequest['errorType']
  }) => string
} {
  const startTime = Date.now()
  const toolCalls: ToolInvocation[] = []
  let reasoning: ReasoningStep[] | undefined
  let thinkingMs: number | undefined

  return {
    startTime,
    addToolCall: (tc) => toolCalls.push(tc),
    setReasoning: (steps) => {
      reasoning = steps
      if (steps.length > 0) {
        thinkingMs = steps[steps.length - 1].timestamp - startTime
      }
    },
    complete: (response) => {
      const latencyMs = Date.now() - startTime
      const cost = calculateCost(model, response.tokens)

      return useTelemetryStore.getState().recordRequest({
        conversationId,
        userMessage,
        provider,
        model,
        assistantMessage: response.assistantMessage,
        finishReason: response.finishReason,
        tokens: response.tokens,
        cost,
        latencyMs,
        thinkingMs,
        toolCalls,
        toolCallRounds: toolCalls.length > 0 ? 1 : 0, // TODO: Track actual rounds
        reasoning,
        error: response.error,
        errorType: response.errorType,
      })
    },
  }
}
