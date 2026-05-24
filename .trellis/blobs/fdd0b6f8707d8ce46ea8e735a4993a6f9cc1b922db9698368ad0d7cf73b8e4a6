import * as React from 'react'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'

export function AdvancedSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Performance</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="hardware-accel">Hardware Acceleration</Label>
              <p className="text-sm text-muted-foreground">Use GPU for rendering (requires restart)</p>
            </div>
            <Switch id="hardware-accel" defaultChecked disabled />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="file-watcher">File System Watcher</Label>
              <p className="text-sm text-muted-foreground">Monitor file changes in real-time</p>
            </div>
            <Switch id="file-watcher" defaultChecked disabled />
          </div>
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="text-lg font-semibold mb-4">Developer</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="dev-tools">Enable DevTools</Label>
              <p className="text-sm text-muted-foreground">Access browser developer tools</p>
            </div>
            <Switch id="dev-tools" disabled />
          </div>
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="text-lg font-semibold mb-4">Data</h3>
        <div className="space-y-3">
          <Button variant="outline" className="w-full justify-start" disabled>
            Clear Cache
          </Button>
          <Button variant="outline" className="w-full justify-start" disabled>
            Reset All Settings
          </Button>
        </div>
      </div>
    </div>
  )
}
