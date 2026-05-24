/**
 * Edge Synthesis Status Panel
 *
 * Displays real-time status of background edge synthesis.
 * Shows:
 * - Whether synthesis is running
 * - Last run timestamp and duration
 * - Pending files count
 * - Manual trigger button
 */

import { useEffect, useState } from 'react'
import { join } from 'path'
import { homedir } from 'os'

interface SynthesisStatus {
  isRunning: boolean
  lastRun: string | null
  lastRunDuration: number | null
  pendingFiles: string[]
  processedCount: number
  edgesGenerated: number
  errors: string[]
  nextRun: string | null
}

const STATUS_FILE = join(homedir(), '.filegraph', '.filegraph', 'edge-synthesis-status.json')

export function EdgeSynthesisStatusPanel() {
  const [status, setStatus] = useState<SynthesisStatus | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)

  // Poll status file
  useEffect(() => {
    async function loadStatus() {
      try {
        const fs = await import('fs/promises')
        const content = await fs.readFile(STATUS_FILE, 'utf-8')
        const data = JSON.parse(content)
        setStatus(data)
      } catch {
        // Status file doesn't exist yet
      }
    }

    loadStatus()
    const interval = setInterval(loadStatus, 2000) // Poll every 2s

    return () => clearInterval(interval)
  }, [])

  if (!status) {
    return (
      <div className="edge-synthesis-status-empty">
        <span className="text-sm text-gray-500">Edge synthesis not active</span>
      </div>
    )
  }

  const formatDuration = (ms: number | null) => {
    if (!ms) return 'N/A'
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  const formatTimestamp = (ts: string | null) => {
    if (!ts) return 'Never'
    const date = new Date(ts)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()

    if (diffMs < 60000) return 'Just now'
    if (diffMs < 3600000) return `${Math.floor(diffMs / 60000)}m ago`
    if (diffMs < 86400000) return `${Math.floor(diffMs / 3600000)}h ago`
    return date.toLocaleString()
  }

  return (
    <div className="edge-synthesis-status">
      {/* Compact header */}
      <button onClick={() => setIsExpanded(!isExpanded)} className="edge-synthesis-header" aria-expanded={isExpanded}>
        <div className="flex items-center gap-2">
          <div className={`status-indicator ${status.isRunning ? 'running' : 'idle'}`} />
          <span className="font-medium text-sm">{status.isRunning ? 'Syncing graph...' : 'Graph synced'}</span>
        </div>

        <div className="flex items-center gap-3 text-xs text-gray-600">
          {status.pendingFiles.length > 0 && (
            <span className="pending-badge">{status.pendingFiles.length} pending</span>
          )}
          <span>{formatTimestamp(status.lastRun)}</span>
          <svg
            className={`chevron ${isExpanded ? 'expanded' : ''}`}
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none">
            <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </div>
      </button>

      {/* Expanded details */}
      {isExpanded && (
        <div className="edge-synthesis-details">
          <div className="stats-grid">
            <div className="stat">
              <span className="stat-label">Processed</span>
              <span className="stat-value">{status.processedCount}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Edges</span>
              <span className="stat-value">{status.edgesGenerated}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Duration</span>
              <span className="stat-value">{formatDuration(status.lastRunDuration)}</span>
            </div>
          </div>

          {status.errors.length > 0 && (
            <div className="errors">
              <div className="error-header">⚠ Errors</div>
              {status.errors.map((error, i) => (
                <div key={i} className="error-item">
                  {error}
                </div>
              ))}
            </div>
          )}

          {status.pendingFiles.length > 0 && (
            <div className="pending-files">
              <div className="pending-header">Pending files ({status.pendingFiles.length})</div>
              <div className="pending-list">
                {status.pendingFiles.slice(0, 5).map((file, i) => (
                  <div key={i} className="pending-file">
                    {file.split('/').pop()}
                  </div>
                ))}
                {status.pendingFiles.length > 5 && (
                  <div className="pending-more">+{status.pendingFiles.length - 5} more</div>
                )}
              </div>
            </div>
          )}

          <button
            className="trigger-button"
            disabled={status.isRunning}
            onClick={async () => {
              // Trigger manual synthesis
              const { spawn } = await import('child_process')
              spawn('tsx', ['scripts/edge-synthesis-orchestrator.ts', '--apply'], {
                cwd: join(homedir(), 'TURTLE', 'Projects', 'Apps', 'filegraph'),
                detached: true,
                stdio: 'ignore',
              })
            }}>
            {status.isRunning ? 'Running...' : 'Trigger Sync'}
          </button>
        </div>
      )}

      <style>{`
        .edge-synthesis-status {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .edge-synthesis-header {
          width: 100%;
          padding: 12px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: none;
          border: none;
          cursor: pointer;
          transition: background 0.2s;
        }

        .edge-synthesis-header:hover {
          background: #f9fafb;
        }

        .status-indicator {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          transition: all 0.3s;
        }

        .status-indicator.running {
          background: #10b981;
          animation: pulse 2s ease-in-out infinite;
        }

        .status-indicator.idle {
          background: #6b7280;
        }

        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }

        .pending-badge {
          background: #fef3c7;
          color: #92400e;
          padding: 2px 8px;
          border-radius: 999px;
          font-weight: 500;
        }

        .chevron {
          transition: transform 0.2s;
        }

        .chevron.expanded {
          transform: rotate(180deg);
        }

        .edge-synthesis-details {
          padding: 0 16px 16px;
          border-top: 1px solid #f3f4f6;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-bottom: 12px;
        }

        .stat {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .stat-label {
          font-size: 0.75rem;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .stat-value {
          font-size: 1.25rem;
          font-weight: 600;
          color: #111827;
        }

        .errors {
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 6px;
          padding: 12px;
          margin-bottom: 12px;
        }

        .error-header {
          font-weight: 600;
          color: #991b1b;
          margin-bottom: 8px;
          font-size: 0.875rem;
        }

        .error-item {
          font-size: 0.75rem;
          color: #dc2626;
          padding: 4px 0;
          font-family: monospace;
        }

        .pending-files {
          background: #f9fafb;
          border-radius: 6px;
          padding: 12px;
          margin-bottom: 12px;
        }

        .pending-header {
          font-weight: 600;
          color: #374151;
          margin-bottom: 8px;
          font-size: 0.875rem;
        }

        .pending-list {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .pending-file {
          font-size: 0.75rem;
          color: #6b7280;
          font-family: monospace;
        }

        .pending-more {
          font-size: 0.75rem;
          color: #9ca3af;
          font-style: italic;
        }

        .trigger-button {
          width: 100%;
          padding: 8px 16px;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 6px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
        }

        .trigger-button:hover:not(:disabled) {
          background: #2563eb;
        }

        .trigger-button:disabled {
          background: #9ca3af;
          cursor: not-allowed;
        }

        .edge-synthesis-status-empty {
          padding: 12px 16px;
          text-align: center;
        }
      `}</style>
    </div>
  )
}
