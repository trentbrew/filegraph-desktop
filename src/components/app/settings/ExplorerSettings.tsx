import * as React from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'

interface ExplorerSettingsProps {
  showDotfiles: boolean
  setShowDotfiles: (show: boolean) => void
}

export function ExplorerSettings({
  showDotfiles,
  setShowDotfiles,
}: ExplorerSettingsProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Visibility</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {showDotfiles ? (
                <Eye className="h-4 w-4 text-muted-foreground" />
              ) : (
                <EyeOff className="h-4 w-4 text-muted-foreground" />
              )}
              <div>
                <Label htmlFor="show-dotfiles">Show Hidden Files</Label>
                <p className="text-sm text-muted-foreground">Display files and folders starting with "."</p>
              </div>
            </div>
            <Switch id="show-dotfiles" checked={showDotfiles} onCheckedChange={setShowDotfiles} />
          </div>
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="text-lg font-semibold mb-4">Behavior</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="confirm-delete">Confirm Before Delete</Label>
              <p className="text-sm text-muted-foreground">Show confirmation dialog when deleting files</p>
            </div>
            <Switch id="confirm-delete" defaultChecked disabled />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="auto-refresh">Auto Refresh</Label>
              <p className="text-sm text-muted-foreground">Automatically refresh when files change</p>
            </div>
            <Switch id="auto-refresh" defaultChecked disabled />
          </div>
        </div>
      </div>
    </div>
  )
}
