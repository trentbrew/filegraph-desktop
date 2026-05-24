/**
 * CommandApprovalDialog
 *
 * Listens for 'agent-command-approval' custom events dispatched by the
 * agent's run_command tool. Shows an AlertDialog with the command and
 * working directory, allowing the user to approve or deny execution.
 *
 * Mount this component once near the app root so it's always available.
 */

import * as React from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Terminal, ShieldAlert } from 'lucide-react'

interface PendingApproval {
  command: string
  cwd: string | null
  resolve: (approved: boolean) => void
}

export function CommandApprovalDialog() {
  const [pending, setPending] = React.useState<PendingApproval | null>(null)

  React.useEffect(() => {
    function handleApprovalRequest(e: Event) {
      const detail = (e as CustomEvent).detail as PendingApproval
      if (!detail?.resolve) return

      // Intercept the resolve so the fallback confirm() in the tool doesn't fire
      const originalResolve = detail.resolve
      detail.resolve = null as any // prevent the setTimeout fallback

      setPending({
        command: detail.command,
        cwd: detail.cwd,
        resolve: originalResolve,
      })
    }

    window.addEventListener('agent-command-approval', handleApprovalRequest)
    return () => {
      window.removeEventListener('agent-command-approval', handleApprovalRequest)
    }
  }, [])

  const handleApprove = React.useCallback(() => {
    pending?.resolve(true)
    setPending(null)
  }, [pending])

  const handleDeny = React.useCallback(() => {
    pending?.resolve(false)
    setPending(null)
  }, [pending])

  return (
    <AlertDialog open={!!pending} onOpenChange={(open) => !open && handleDeny()}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-base">
            <ShieldAlert className="h-5 w-5 text-amber-500" />
            Agent wants to run a command
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 pt-2">
              <div className="rounded-md bg-muted px-3 py-2 font-mono text-sm">
                <div className="flex items-start gap-2">
                  <Terminal className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="break-all text-foreground">{pending?.command}</span>
                </div>
              </div>
              {pending?.cwd && (
                <p className="text-xs text-muted-foreground">
                  Working directory:{' '}
                  <span className="font-mono text-foreground">{pending.cwd}</span>
                </p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleDeny}>Deny</AlertDialogCancel>
          <AlertDialogAction onClick={handleApprove}>Allow</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
