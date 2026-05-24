/**
 * InlineCommandApproval
 *
 * Inline card rendered within the agent chat thread when the agent
 * wants to run a shell command. Replaces the modal CommandApprovalDialog.
 * Supports Allow / Deny actions and an "Always allow" checkbox.
 */

import * as React from 'react'
import { Terminal, ShieldAlert, Check, X, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { useUIStore } from '@/stores/useUIStore'
import { type CommandApprovalCardData } from '../hooks/useChatStore'

interface InlineCommandApprovalProps {
  data: CommandApprovalCardData
  onApprove: () => void
  onDeny: () => void
}

export function InlineCommandApproval({ data, onApprove, onDeny }: InlineCommandApprovalProps) {
  const { agentAlwaysAllowCommands, setAgentAlwaysAllowCommands } = useUIStore()
  const isPending = data.status === 'pending'

  const handleApprove = React.useCallback(() => {
    onApprove()
  }, [onApprove])

  const handleDeny = React.useCallback(() => {
    onDeny()
  }, [onDeny])

  return (
    <div className="my-2 rounded-lg border border-border/60 bg-background/60 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/40 bg-muted/30">
        {isPending ? (
          <ShieldAlert className="h-4 w-4 text-amber-500 shrink-0" />
        ) : data.status === 'approved' ? (
          <ShieldCheck className="h-4 w-4 text-green-500 shrink-0" />
        ) : (
          <X className="h-4 w-4 text-red-400 shrink-0" />
        )}
        <span className="text-[11px] font-medium text-muted-foreground">
          {isPending
            ? 'Wants to run a command'
            : data.status === 'approved'
              ? 'Command approved'
              : 'Command denied'}
        </span>
      </div>

      {/* Command display */}
      <div className="px-3 py-2">
        <div className="rounded-md bg-muted/50 px-3 py-2 font-mono text-[11px]">
          <div className="flex items-start gap-2">
            <Terminal className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="break-all text-foreground leading-relaxed">{data.command}</span>
          </div>
        </div>
        {data.cwd && (
          <p className="text-[10px] text-muted-foreground mt-1.5 px-1">
            in <span className="font-mono text-foreground/80">{data.cwd}</span>
          </p>
        )}
      </div>

      {/* Actions */}
      {isPending && (
        <div className="px-3 pb-2.5 pt-0.5 flex items-center justify-between gap-2">
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <Checkbox
              checked={agentAlwaysAllowCommands}
              onCheckedChange={(checked) => setAgentAlwaysAllowCommands(!!checked)}
              className="h-3.5 w-3.5"
            />
            <span className="text-[10px] text-muted-foreground">Always allow</span>
          </label>
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2.5 text-[11px]"
              onClick={handleDeny}>
              Deny
            </Button>
            <Button
              size="sm"
              className="h-6 px-2.5 text-[11px]"
              onClick={handleApprove}>
              Allow
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
