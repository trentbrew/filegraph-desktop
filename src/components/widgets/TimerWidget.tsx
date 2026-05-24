/**
 * Timer Widget
 * Pomodoro timer, stopwatch, and countdown functionality
 * With tabs for Timer, Presets, and History
 */

import * as React from 'react'
import { Play, Pause, RotateCcw, Clock, Settings2, History, Plus, Trash2, Brain, Coffee, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { useWidgetStore } from '@/stores/useWidgetStore'
import type { TimerWidgetData, TimerPreset } from '@/lib/widgets'

interface TimerWidgetProps {
  data: TimerWidgetData
  onUpdate: (data: Partial<TimerWidgetData>) => void
}

type TabId = 'timer' | 'presets' | 'history'

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  return `${mins} min`
}

function getPresetIcon(icon?: string) {
  switch (icon) {
    case 'brain':
      return Brain
    case 'coffee':
      return Coffee
    case 'sun':
      return Sun
    default:
      return Clock
  }
}

export function TimerWidget({ data, onUpdate }: TimerWidgetProps) {
  const { state, settings, presets = [], history = [] } = data
  const { timerState, setTimerState } = useWidgetStore()
  const [activeTab, setActiveTab] = React.useState<TabId>('timer')
  const [newPresetName, setNewPresetName] = React.useState('')
  const [newPresetMins, setNewPresetMins] = React.useState('')

  // Sync local state to global store when starting/stopping
  React.useEffect(() => {
    if (state.isRunning) {
      setTimerState({
        isRunning: state.isRunning,
        remaining: state.remaining,
        duration: state.duration,
        mode: state.mode,
      })
    }
  }, [state.isRunning, state.duration, state.mode, setTimerState])

  // Sync global timer state back to local data
  React.useEffect(() => {
    if (timerState && timerState.isRunning && timerState.remaining !== state.remaining) {
      onUpdate({ state: { ...state, remaining: timerState.remaining, isRunning: timerState.isRunning } })
    }
    // Handle timer completion - add to history
    if (timerState && !timerState.isRunning && timerState.remaining === 0 && state.isRunning) {
      const historyEntry = {
        id: `hist-${Date.now()}`,
        presetName: state.mode === 'pomodoro' ? 'Focus' : 'Timer',
        duration: state.duration,
        completedAt: new Date().toISOString(),
      }
      onUpdate({
        state: { ...state, isRunning: false, remaining: 0, completedSessions: (state.completedSessions || 0) + 1 },
        history: [historyEntry, ...history].slice(0, 50), // Keep last 50
      })
    }
  }, [timerState?.remaining, timerState?.isRunning])

  const toggleTimer = () => {
    onUpdate({
      state: {
        ...state,
        isRunning: !state.isRunning,
        startedAt: !state.isRunning ? new Date().toISOString() : state.startedAt,
      },
    })
  }

  const resetTimer = () => {
    setTimerState(null)
    onUpdate({ state: { ...state, remaining: state.duration, isRunning: false } })
  }

  const selectPreset = (preset: TimerPreset) => {
    setTimerState(null)
    onUpdate({
      state: { ...state, mode: 'countdown', duration: preset.duration, remaining: preset.duration, isRunning: false },
    })
    setActiveTab('timer')
  }

  const addPreset = () => {
    const mins = parseInt(newPresetMins, 10)
    if (!newPresetName.trim() || isNaN(mins) || mins <= 0) return
    const newPreset: TimerPreset = { id: `preset-${Date.now()}`, name: newPresetName.trim(), duration: mins * 60 }
    onUpdate({ presets: [...presets, newPreset] })
    setNewPresetName('')
    setNewPresetMins('')
  }

  const deletePreset = (id: string) => {
    onUpdate({ presets: presets.filter((p) => p.id !== id) })
  }

  const clearHistory = () => {
    onUpdate({ history: [] })
  }

  const progress = state.duration > 0 ? ((state.duration - state.remaining) / state.duration) * 100 : 0

  const tabs = [
    { id: 'timer' as TabId, icon: Clock, label: 'Timer' },
    { id: 'presets' as TabId, icon: Settings2, label: 'Presets' },
    { id: 'history' as TabId, icon: History, label: 'History' },
  ]

  return (
    <div className="flex flex-col h-[340px]">
      {/* Tabs */}
      <div className="flex border-b px-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 -mb-px transition-colors',
              activeTab === tab.id
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}>
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'timer' && (
          <div className="p-4 space-y-3">
            {/* Quick Presets */}
            <div className="flex flex-wrap gap-1">
              {presets.slice(0, 6).map((preset) => {
                const Icon = getPresetIcon(preset.icon)
                return (
                  <Button
                    key={preset.id}
                    variant={state.duration === preset.duration ? 'secondary' : 'ghost'}
                    size="sm"
                    className="h-6 text-[10px] gap-1 px-2"
                    onClick={() => selectPreset(preset)}>
                    <Icon className="h-3 w-3" />
                    {preset.name}
                  </Button>
                )
              })}
            </div>

            {/* Timer Display */}
            <div className="relative flex items-center justify-center">
              <svg className="w-28 h-28 transform -rotate-90">
                <circle
                  cx="56"
                  cy="56"
                  r="48"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                  className="text-muted/20"
                />
                <circle
                  cx="56"
                  cy="56"
                  r="48"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 48}
                  strokeDashoffset={2 * Math.PI * 48 * (1 - progress / 100)}
                  className="text-primary transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-mono font-bold tabular-nums">{formatTime(state.remaining)}</span>
                <span className="text-[10px] text-muted-foreground">
                  {state.completedSessions ? `${state.completedSessions} done` : formatDuration(state.duration)}
                </span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={resetTimer}>
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="icon"
                className={cn('h-10 w-10 rounded-full', state.isRunning && 'bg-destructive hover:bg-destructive/90')}
                onClick={toggleTimer}>
                {state.isRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
              </Button>
            </div>
          </div>
        )}

        {activeTab === 'presets' && (
          <ScrollArea className="h-full">
            <div className="p-3 space-y-3">
              {/* Add new preset */}
              <div className="flex gap-1">
                <input
                  type="text"
                  placeholder="Name"
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  className="flex-1 h-7 px-2 text-xs rounded-md border bg-background"
                />
                <input
                  type="number"
                  placeholder="Min"
                  value={newPresetMins}
                  onChange={(e) => setNewPresetMins(e.target.value)}
                  className="w-14 h-7 px-2 text-xs rounded-md border bg-background"
                />
                <Button variant="outline" size="icon" className="h-7 w-7" onClick={addPreset}>
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>

              {/* Preset list */}
              <div className="space-y-1">
                {presets.map((preset) => {
                  const Icon = getPresetIcon(preset.icon)
                  return (
                    <div key={preset.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 group">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="flex-1 text-sm">{preset.name}</span>
                      <span className="text-xs text-muted-foreground">{formatDuration(preset.duration)}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100"
                        onClick={() => deletePreset(preset.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )
                })}
              </div>
            </div>
          </ScrollArea>
        )}

        {activeTab === 'history' && (
          <ScrollArea className="h-full">
            <div className="p-3 space-y-2">
              {history.length === 0 ? (
                <div className="text-center text-muted-foreground text-sm py-8">No completed sessions yet</div>
              ) : (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">{history.length} sessions</span>
                    <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={clearHistory}>
                      Clear
                    </Button>
                  </div>
                  {history.map((entry) => (
                    <div key={entry.id} className="flex items-center gap-2 p-2 rounded-md bg-muted/30">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      <div className="flex-1">
                        <span className="text-sm">{entry.presetName}</span>
                        <span className="text-xs text-muted-foreground ml-2">{formatDuration(entry.duration)}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(entry.completedAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  )
}
