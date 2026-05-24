/**
 * Connected Accounts Settings
 * Centralized management of Google (and future OAuth) accounts
 * Used across Calendar, Email, Drive, and other apps
 */

import * as React from 'react'
import {
  Plus,
  RefreshCw,
  Trash2,
  Calendar,
  Mail,
  HardDrive,
  Cloud,
  CloudOff,
  User,
  Settings,
  ChevronDown,
  ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useGoogleCalendarStore } from '@/stores/useGoogleCalendarStore'
import { useVault } from '@/contexts/VaultContext'
import { format } from 'date-fns'
import type { GoogleService } from '@/lib/google/types'

const SERVICE_CONFIG: Record<GoogleService, { icon: typeof Calendar; label: string; description: string }> = {
  calendar: {
    icon: Calendar,
    label: 'Calendar',
    description: 'Sync events from Google Calendar',
  },
  gmail: {
    icon: Mail,
    label: 'Gmail',
    description: 'Access and sync emails (coming soon)',
  },
  drive: {
    icon: HardDrive,
    label: 'Drive',
    description: 'Access Google Drive files (coming soon)',
  },
}

export function ConnectedAccountsSettings() {
  const { vaultPath } = useVault()
  const {
    clientId,
    accounts,
    calendarsMap,
    syncing,
    lastSyncResults,
    setClientId,
    addAccount,
    removeAccount,
    loadCalendars,
    setSelectedCalendars,
    toggleSyncEnabled,
    toggleGmailSync,
    initSyncEngine,
    syncAccount,
    syncAllAccounts,
  } = useGoogleCalendarStore()

  const [showSetup, setShowSetup] = React.useState(false)
  const [tempClientId, setTempClientId] = React.useState(clientId || '')
  const [addingAccount, setAddingAccount] = React.useState(false)
  const [expandedAccount, setExpandedAccount] = React.useState<string | null>(null)

  // Initialize sync engine when vault path changes
  React.useEffect(() => {
    if (vaultPath && clientId) {
      initSyncEngine(vaultPath)
    }
  }, [vaultPath, clientId, initSyncEngine])

  const handleSaveSetup = () => {
    setClientId(tempClientId)
    setShowSetup(false)
  }

  const handleAddAccount = async () => {
    if (!clientId) {
      setShowSetup(true)
      return
    }

    setAddingAccount(true)
    try {
      await addAccount()
    } finally {
      setAddingAccount(false)
    }
  }

  const handleToggleCalendar = (accountId: string, calendarId: string, checked: boolean) => {
    const account = accounts.find((a) => a.id === accountId)
    if (!account) return

    const currentSelected = account.selectedCalendars
    const newSelected = checked ? [...currentSelected, calendarId] : currentSelected.filter((id) => id !== calendarId)

    setSelectedCalendars(accountId, newSelected)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold mb-2">Connected Accounts</h3>
        <p className="text-sm text-muted-foreground">
          Connect your Google account to sync calendars, email, and more across Filegraph apps.
        </p>
      </div>

      {/* Google OAuth Setup */}
      <div className="rounded-lg border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            </div>
            <div>
              <h4 className="font-medium">Google</h4>
              <p className="text-sm text-muted-foreground">
                {clientId
                  ? `${accounts.length} account${accounts.length !== 1 ? 's' : ''} connected`
                  : 'Not configured'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={showSetup} onOpenChange={setShowSetup}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  {clientId ? 'Settings' : 'Setup'}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Google OAuth Setup</DialogTitle>
                  <DialogDescription>
                    Configure your Google Cloud OAuth credentials to enable account connections.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="clientId">Google Client ID</Label>
                    <Input
                      id="clientId"
                      value={tempClientId}
                      onChange={(e) => setTempClientId(e.target.value)}
                      placeholder="your-client-id.apps.googleusercontent.com"
                    />
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3 text-sm space-y-2">
                    <p className="font-medium">Setup Instructions:</p>
                    <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                      <li>
                        Go to{' '}
                        <a
                          href="https://console.cloud.google.com/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline">
                          Google Cloud Console
                        </a>
                      </li>
                      <li>Create a project and enable Calendar API, Gmail API</li>
                      <li>Create OAuth 2.0 credentials (Desktop app type)</li>
                      <li>
                        Add <code className="bg-muted px-1 rounded">http://localhost:8765/oauth/callback</code> to
                        redirect URIs
                      </li>
                      <li>Copy the Client ID here</li>
                    </ol>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowSetup(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveSetup} disabled={!tempClientId.trim()}>
                    Save
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Connected Accounts List */}
        {clientId && (
          <>
            <Separator />
            {accounts.length === 0 ? (
              <div className="text-center py-6">
                <User className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground mb-4">No Google accounts connected yet</p>
                <Button onClick={handleAddAccount} disabled={addingAccount}>
                  {addingAccount ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Google Account
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {accounts.map((account) => {
                  const calendars = calendarsMap[account.id] || []
                  const lastResult = lastSyncResults[account.id]
                  const isExpanded = expandedAccount === account.id

                  return (
                    <div key={account.id} className="rounded-lg border overflow-hidden">
                      {/* Account Header */}
                      <div
                        className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => setExpandedAccount(isExpanded ? null : account.id)}>
                        {account.picture ? (
                          <img src={account.picture} alt={account.name} className="h-10 w-10 rounded-full" />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-5 w-5 text-primary" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{account.name}</p>
                          <p className="text-sm text-muted-foreground truncate">{account.email}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {account.calendarSyncEnabled && (
                            <Badge variant="secondary" className="text-xs">
                              <Calendar className="h-3 w-3 mr-1" />
                              Calendar
                            </Badge>
                          )}
                          {account.calendarSyncEnabled ? (
                            <Cloud className="h-4 w-4 text-green-500" />
                          ) : (
                            <CloudOff className="h-4 w-4 text-muted-foreground" />
                          )}
                          <ChevronDown className={cn('h-4 w-4 transition-transform', isExpanded && 'rotate-180')} />
                        </div>
                      </div>

                      {/* Expanded Content */}
                      {isExpanded && (
                        <div className="border-t p-3 space-y-4 bg-muted/30">
                          {/* Services */}
                          <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground uppercase">Services</Label>
                            <div className="space-y-2">
                              {/* Calendar */}
                              <div className="flex items-center justify-between rounded-md border p-3">
                                <div className="flex items-center gap-3">
                                  <Calendar className="h-4 w-4 text-muted-foreground" />
                                  <div>
                                    <p className="text-sm font-medium">Calendar</p>
                                    <p className="text-xs text-muted-foreground">
                                      {account.selectedCalendars.length} calendar
                                      {account.selectedCalendars.length !== 1 ? 's' : ''} selected
                                    </p>
                                  </div>
                                </div>
                                <Switch
                                  checked={account.calendarSyncEnabled}
                                  onCheckedChange={() => toggleSyncEnabled(account.id)}
                                />
                              </div>

                              {/* Gmail */}
                              <div className="flex items-center justify-between rounded-md border p-3">
                                <div className="flex items-center gap-3">
                                  <Mail className="h-4 w-4 text-muted-foreground" />
                                  <div>
                                    <p className="text-sm font-medium">Gmail</p>
                                    <p className="text-xs text-muted-foreground">Access and sync emails</p>
                                  </div>
                                </div>
                                <Switch
                                  checked={account.gmailSyncEnabled}
                                  onCheckedChange={() => toggleGmailSync(account.id)}
                                />
                              </div>

                              {/* Drive (coming soon) */}
                              <div className="flex items-center justify-between rounded-md border p-3 opacity-50">
                                <div className="flex items-center gap-3">
                                  <HardDrive className="h-4 w-4 text-muted-foreground" />
                                  <div>
                                    <p className="text-sm font-medium">Drive</p>
                                    <p className="text-xs text-muted-foreground">Coming soon</p>
                                  </div>
                                </div>
                                <Switch disabled />
                              </div>
                            </div>
                          </div>

                          {/* Calendar Selection */}
                          {account.calendarSyncEnabled && (
                            <>
                              <Separator />
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <Label className="text-xs text-muted-foreground uppercase">Calendars to Sync</Label>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7"
                                    onClick={() => loadCalendars(account.id)}>
                                    <RefreshCw className="h-3 w-3" />
                                  </Button>
                                </div>
                                {calendars.length === 0 ? (
                                  <p className="text-xs text-muted-foreground italic py-2">
                                    Click refresh to load calendars
                                  </p>
                                ) : (
                                  <ScrollArea className="max-h-40">
                                    <div className="space-y-1">
                                      {calendars.map((calendar) => {
                                        const isSelected = account.selectedCalendars.includes(calendar.id)
                                        return (
                                          <div
                                            key={calendar.id}
                                            className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted/50">
                                            <Checkbox
                                              id={`cal-${calendar.id}`}
                                              checked={isSelected}
                                              onCheckedChange={(checked) =>
                                                handleToggleCalendar(account.id, calendar.id, !!checked)
                                              }
                                            />
                                            <div
                                              className="w-2 h-2 rounded-full shrink-0"
                                              style={{ backgroundColor: calendar.backgroundColor }}
                                            />
                                            <Label
                                              htmlFor={`cal-${calendar.id}`}
                                              className="text-sm cursor-pointer truncate flex-1">
                                              {calendar.summary}
                                              {calendar.primary && (
                                                <span className="text-xs text-muted-foreground ml-1">(Primary)</span>
                                              )}
                                            </Label>
                                          </div>
                                        )
                                      })}
                                    </div>
                                  </ScrollArea>
                                )}
                              </div>
                            </>
                          )}

                          {/* Sync Status */}
                          {account.lastSyncAt && (
                            <>
                              <Separator />
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>
                                  Last synced: {format(new Date(account.lastSyncAt), 'MMM d, h:mm a')}
                                  {lastResult && (
                                    <span className="ml-1">
                                      {lastResult.success ? (
                                        <span className="text-green-600">
                                          ({lastResult.pulled} pulled, {lastResult.pushed} pushed)
                                        </span>
                                      ) : (
                                        <span className="text-red-600">Failed</span>
                                      )}
                                    </span>
                                  )}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7"
                                  onClick={() => syncAccount(account.id)}
                                  disabled={syncing}>
                                  <RefreshCw className={cn('h-3 w-3 mr-1', syncing && 'animate-spin')} />
                                  Sync Now
                                </Button>
                              </div>
                            </>
                          )}

                          {/* Remove Account */}
                          <Separator />
                          <div className="flex justify-end">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Remove Account
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Remove Google Account</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to disconnect {account.email}? Synced data will remain in your
                                    vault but won't sync anymore.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => removeAccount(account.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                    Remove
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}

                {/* Add Another Account */}
                <Button variant="outline" className="w-full" onClick={handleAddAccount} disabled={addingAccount}>
                  {addingAccount ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Another Account
                    </>
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Future: Other providers */}
      <div className="rounded-lg border p-4 opacity-50">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
            <Cloud className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <h4 className="font-medium">Other Providers</h4>
            <p className="text-sm text-muted-foreground">Microsoft, Apple, and more coming soon</p>
          </div>
        </div>
      </div>
    </div>
  )
}
