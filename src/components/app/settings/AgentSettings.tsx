/**
 * Agent Settings
 * Shows agent usage metrics, costs, and performance with charts
 */

import React, { useMemo } from 'react'
import {
  BarChart3,
  Zap,
  DollarSign,
  Clock,
  MessageSquare,
  Wrench,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Activity,
  Keyboard,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { useUIStore } from '@/stores/useUIStore'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
} from 'recharts'
import { useTelemetryStore, type DailyStats } from '@/features/agent/telemetry'

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
  if (ms < 1000) return `${Math.round(ms)}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
]

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ReactNode
  trend?: 'up' | 'down' | 'neutral'
}

function StatCard({ title, value, subtitle, icon, trend }: StatCardProps) {
  return (
    <Card>
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

export function AgentSettings() {
  const sessionRequests = useTelemetryStore((s) => s.sessionRequests)
  const sessionStartTime = useTelemetryStore((s) => s.sessionStartTime)
  const dailyStats = useTelemetryStore((s) => s.dailyStats)
  const totalRequests = useTelemetryStore((s) => s.totalRequests)
  const totalTokens = useTelemetryStore((s) => s.totalTokens)
  const totalCost = useTelemetryStore((s) => s.totalCost)
  const clearSession = useTelemetryStore((s) => s.clearSession)

  const { agentSendOnEnter, setAgentSendOnEnter, agentAlwaysAllowCommands, setAgentAlwaysAllowCommands } = useUIStore()

  // Compute session stats
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
    }
  }, [sessionRequests])

  // Prepare chart data for daily usage
  const dailyChartData = useMemo(() => {
    const last7Days = dailyStats.slice(-7)
    return last7Days.map((day) => ({
      date: new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' }),
      tokens: day.tokens.totalTokens,
      cost: day.cost,
      requests: day.requestCount,
    }))
  }, [dailyStats])

  // Prepare pie chart data for tool usage
  const toolPieData = useMemo(() => {
    return sessionStats.mostUsedTools.slice(0, 5).map((tool, i) => ({
      name: tool.name.replace(/_/g, ' '),
      value: tool.count,
      fill: CHART_COLORS[i % CHART_COLORS.length],
    }))
  }, [sessionStats.mostUsedTools])

  // Prepare data for model usage breakdown
  const modelUsageData = useMemo(() => {
    const modelCounts: Record<string, { requests: number; tokens: number; cost: number }> = {}
    for (const req of sessionRequests) {
      if (!modelCounts[req.model]) {
        modelCounts[req.model] = { requests: 0, tokens: 0, cost: 0 }
      }
      modelCounts[req.model].requests++
      modelCounts[req.model].tokens += req.tokens.totalTokens
      modelCounts[req.model].cost += req.cost.total
    }
    return Object.entries(modelCounts).map(([model, data]) => ({
      model: model.replace(/-preview$/, ''),
      ...data,
    }))
  }, [sessionRequests])

  const successRate =
    sessionStats.requestCount > 0 ? ((sessionStats.successCount / sessionStats.requestCount) * 100).toFixed(0) : '100'

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Agent Settings</h3>
        <p className="text-sm text-muted-foreground">Configure agent behavior and monitor usage.</p>
      </div>

      <Separator />

      {/* Input Behavior */}
      <div>
        <h4 className="text-sm font-medium mb-4 flex items-center gap-2">
          <Keyboard className="h-4 w-4" />
          Input Behavior
        </h4>
        <Card>
          <CardContent className="pt-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="send-on-enter" className="text-sm font-medium">
                  Send on Enter
                </Label>
                <p className="text-xs text-muted-foreground">
                  {agentSendOnEnter
                    ? 'Press Enter to send, Shift+Enter for new line'
                    : 'Press ⌘/Ctrl+Enter to send, Enter for new line'}
                </p>
              </div>
              <Switch id="send-on-enter" checked={agentSendOnEnter} onCheckedChange={setAgentSendOnEnter} />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="always-allow-commands" className="text-sm font-medium">
                  Always allow commands
                </Label>
                <p className="text-xs text-muted-foreground">
                  Skip approval when the agent wants to run shell commands
                </p>
              </div>
              <Switch
                id="always-allow-commands"
                checked={agentAlwaysAllowCommands}
                onCheckedChange={setAgentAlwaysAllowCommands}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Usage Stats Header */}
      <div>
        <h4 className="text-sm font-medium">Usage Statistics</h4>
        <p className="text-xs text-muted-foreground">Monitor your AI agent's token usage, costs, and performance.</p>
      </div>

      {/* Session Stats */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-medium">Current Session</h4>
          <Button variant="ghost" size="sm" onClick={() => clearSession()}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Clear Session
          </Button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title="Requests"
            value={sessionStats.requestCount}
            subtitle={`${successRate}% success`}
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

      {/* All-Time Stats */}
      <div>
        <h4 className="text-sm font-medium mb-4">All Time</h4>
        <div className="grid grid-cols-3 gap-4">
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
          <StatCard title="Total Cost" value={formatCurrency(totalCost)} icon={<DollarSign className="h-4 w-4" />} />
        </div>
      </div>

      {/* Charts */}
      {dailyChartData.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-4">Usage Over Time</h4>
          <Card>
            <CardContent className="pt-6">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={dailyChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Bar dataKey="tokens" fill="hsl(var(--chart-1))" name="Tokens" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tool Usage */}
      {toolPieData.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-medium mb-4">Tool Usage</h4>
            <Card>
              <CardContent className="pt-6">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={toolPieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}
                      labelLine={false}>
                      {toolPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div>
            <h4 className="text-sm font-medium mb-4">Most Used Tools</h4>
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  {sessionStats.mostUsedTools.slice(0, 5).map((tool, i) => (
                    <div key={tool.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                        />
                        <span className="text-sm font-mono">{tool.name}</span>
                      </div>
                      <Badge variant="secondary">{tool.count}</Badge>
                    </div>
                  ))}
                  {sessionStats.mostUsedTools.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No tool calls yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Model Usage */}
      {modelUsageData.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-4">Model Usage</h4>
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                {modelUsageData.map((model, i) => (
                  <div key={model.model} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-2 h-8 rounded"
                        style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                      />
                      <div>
                        <p className="text-sm font-medium">{model.model}</p>
                        <p className="text-xs text-muted-foreground">
                          {model.requests} requests · {formatNumber(model.tokens)} tokens
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-medium">{formatCurrency(model.cost)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Requests */}
      {sessionRequests.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-4">Recent Requests</h4>
          <Card>
            <CardContent className="pt-4">
              <ScrollArea className="h-[200px]">
                <div className="space-y-2">
                  {[...sessionRequests]
                    .reverse()
                    .slice(0, 10)
                    .map((req) => (
                      <div key={req.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                        {req.error ? (
                          <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                        ) : (
                          <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate">{req.userMessage}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDuration(req.latencyMs)} · {formatNumber(req.tokens.totalTokens)} tokens
                          </p>
                        </div>
                        <span className="text-xs font-medium">{formatCurrency(req.cost.total)}</span>
                      </div>
                    ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
