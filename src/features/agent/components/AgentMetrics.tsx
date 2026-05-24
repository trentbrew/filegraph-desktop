/**
 * Agent Metrics Dashboard
 *
 * Displays agent usage statistics, costs, performance metrics, and logs.
 */

import React, { useState, useMemo } from 'react'
import {
  Activity,
  DollarSign,
  Clock,
  Zap,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  Wrench,
  MessageSquare,
  Calendar,
  BarChart3,
  List,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useTelemetryStore, type AgentRequest, type DailyStats } from '../telemetry'
import { cn } from '@/lib/utils'

function formatCurrency(amount: number): string {
  if (amount < 0.01) return '<$0.01'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp
  if (diff < 60_000) return 'just now'
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`
  return new Date(timestamp).toLocaleDateString()
}

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ReactNode
  trend?: 'up' | 'down' | 'neutral'
  className?: string
}

function StatCard({ title, value, subtitle, icon, trend, className }: StatCardProps) {
  return (
    <Card className={cn('', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && (
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
            {trend === 'up' && <TrendingUp className="h-3 w-3 text-green-500" />}
            {trend === 'down' && <TrendingUp className="h-3 w-3 text-red-500 rotate-180" />}
            {subtitle}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function RequestRow({ request }: { request: AgentRequest }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="border-b border-border last:border-0">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-3 text-left hover:bg-muted/50 transition-colors">
        <div className="flex items-center gap-3">
          {request.error ? (
            <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
          ) : (
            <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{request.userMessage}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
              <span>{request.model}</span>
              <span>•</span>
              <span>{formatDuration(request.latencyMs)}</span>
              <span>•</span>
              <span>{formatNumber(request.tokens.totalTokens)} tokens</span>
              {request.toolCalls.length > 0 && (
                <>
                  <span>•</span>
                  <span>{request.toolCalls.length} tools</span>
                </>
              )}
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm font-medium">{formatCurrency(request.cost.total)}</p>
            <p className="text-xs text-muted-foreground">{formatRelativeTime(request.timestamp)}</p>
          </div>
        </div>
      </button>
      {expanded && (
        <div className="px-3 pb-3 space-y-3">
          <Separator />
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Input Tokens</p>
              <p className="font-medium">{formatNumber(request.tokens.inputTokens)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Output Tokens</p>
              <p className="font-medium">{formatNumber(request.tokens.outputTokens)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Thinking Time</p>
              <p className="font-medium">{request.thinkingMs ? formatDuration(request.thinkingMs) : '-'}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Provider</p>
              <p className="font-medium capitalize">{request.provider}</p>
            </div>
          </div>
          {request.toolCalls.length > 0 && (
            <div>
              <p className="text-muted-foreground text-xs mb-1">Tool Calls</p>
              <div className="space-y-1">
                {request.toolCalls.map((tc, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <Wrench className="h-3 w-3 text-muted-foreground" />
                    <span className="font-mono text-xs">{tc.name}</span>
                    <span className="text-muted-foreground text-xs">({formatDuration(tc.durationMs)})</span>
                    {tc.error && (
                      <Badge variant="destructive" className="text-xs">
                        Error
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {request.reasoning && request.reasoning.length > 0 && (
            <div>
              <p className="text-muted-foreground text-xs mb-1">Reasoning Steps</p>
              <div className="space-y-1">
                {request.reasoning.map((step, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <Badge variant="outline" className="text-xs shrink-0">
                      {step.type}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{step.content}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {request.error && (
            <div className="p-2 bg-destructive/10 rounded border border-destructive/20">
              <p className="text-xs text-destructive">{request.error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function AgentMetrics() {
  const sessionRequests = useTelemetryStore((s) => s.sessionRequests)
  const sessionStartTime = useTelemetryStore((s) => s.sessionStartTime)
  const totalRequests = useTelemetryStore((s) => s.totalRequests)
  const totalTokens = useTelemetryStore((s) => s.totalTokens)
  const totalCost = useTelemetryStore((s) => s.totalCost)
  const clearSession = useTelemetryStore((s) => s.clearSession)

  // Compute session stats inline to avoid infinite re-renders
  const sessionStats = useMemo(() => {
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

  const successRate =
    sessionStats.requestCount > 0 ? ((sessionStats.successCount / sessionStats.requestCount) * 100).toFixed(0) : '100'

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            <h2 className="font-semibold">Agent Metrics</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={() => clearSession()}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Clear Session
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Session Stats */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">This Session</h3>
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                title="Requests"
                value={sessionStats.requestCount}
                subtitle={`${successRate}% success rate`}
                icon={<MessageSquare className="h-4 w-4" />}
              />
              <StatCard
                title="Tokens Used"
                value={formatNumber(sessionStats.totalTokens.totalTokens)}
                subtitle={`${formatNumber(sessionStats.totalTokens.inputTokens)} in / ${formatNumber(sessionStats.totalTokens.outputTokens)} out`}
                icon={<Zap className="h-4 w-4" />}
              />
              <StatCard
                title="Session Cost"
                value={formatCurrency(sessionStats.totalCost)}
                subtitle="estimated"
                icon={<DollarSign className="h-4 w-4" />}
              />
              <StatCard
                title="Avg Latency"
                value={formatDuration(sessionStats.avgLatencyMs)}
                subtitle={`${sessionStats.toolCallCount} tool calls`}
                icon={<Clock className="h-4 w-4" />}
              />
            </div>
          </div>

          {/* Lifetime Stats */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">All Time</h3>
            <div className="grid grid-cols-3 gap-3">
              <StatCard
                title="Total Requests"
                value={formatNumber(totalRequests)}
                icon={<Activity className="h-4 w-4" />}
              />
              <StatCard
                title="Total Tokens"
                value={formatNumber(totalTokens.totalTokens)}
                icon={<Zap className="h-4 w-4" />}
              />
              <StatCard
                title="Total Cost"
                value={formatCurrency(totalCost)}
                icon={<DollarSign className="h-4 w-4" />}
              />
            </div>
          </div>

          {/* Top Tools */}
          {sessionStats.mostUsedTools.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Most Used Tools</h3>
              <div className="flex flex-wrap gap-2">
                {sessionStats.mostUsedTools.slice(0, 5).map((tool) => (
                  <Badge key={tool.name} variant="secondary" className="font-mono text-xs">
                    {tool.name} ({tool.count})
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Request Log */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Recent Requests</h3>
            <Card>
              {sessionRequests.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No requests yet this session</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {[...sessionRequests]
                    .reverse()
                    .slice(0, 20)
                    .map((req) => (
                      <RequestRow key={req.id} request={req} />
                    ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
