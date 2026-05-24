import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle2, XCircle, AlertTriangle, Code2 } from 'lucide-react'
import { executeVaultChange, type VaultAgentResponse } from '@/lib/vault-agent'

interface PermissionPromptProps {
  description: string
  diff?: string
  filePath?: string
  jsonPatch?: string
  onApprove: (result: VaultAgentResponse) => void
  onReject: () => void
}

export function PermissionPrompt({
  description,
  diff,
  filePath,
  jsonPatch,
  onApprove,
  onReject,
}: PermissionPromptProps) {
  const [isExecuting, setIsExecuting] = useState(false)
  const [showDiff, setShowDiff] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleApprove = async () => {
    if (!filePath || !jsonPatch) {
      setError('Missing file path or JSON patch')
      return
    }

    setIsExecuting(true)
    setError(null)

    try {
      const result = await executeVaultChange(filePath, jsonPatch)
      onApprove(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to execute change')
    } finally {
      setIsExecuting(false)
    }
  }

  return (
    <Card className="border-amber-500/50 bg-amber-500/5">
      <CardHeader>
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
          <div className="flex-1">
            <CardTitle className="text-base">Permission Required</CardTitle>
            <CardDescription className="mt-1">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>

      {diff && (
        <CardContent>
          <Button variant="ghost" size="sm" onClick={() => setShowDiff(!showDiff)} className="mb-2 gap-2">
            <Code2 className="h-4 w-4" />
            {showDiff ? 'Hide' : 'Show'} Changes
          </Button>

          {showDiff && (
            <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto border">
              <code>{diff}</code>
            </pre>
          )}
        </CardContent>
      )}

      {error && (
        <CardContent>
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      )}

      <CardFooter className="flex gap-2">
        <Button onClick={handleApprove} disabled={isExecuting} className="flex-1 gap-2" variant="default">
          <CheckCircle2 className="h-4 w-4" />
          {isExecuting ? 'Executing...' : 'Approve'}
        </Button>
        <Button onClick={onReject} disabled={isExecuting} className="flex-1 gap-2" variant="outline">
          <XCircle className="h-4 w-4" />
          Reject
        </Button>
      </CardFooter>
    </Card>
  )
}
