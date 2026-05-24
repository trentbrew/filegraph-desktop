/**
 * Google Accounts Panel
 * UI for managing connected Google Calendar accounts
 */

import * as React from 'react'
import {
  Plus,
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Cloud,
  CloudOff,
  Settings,
  ChevronDown,
  ChevronRight,
  User,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
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
import { cn } from '@/lib/utils'
import { useGoogleCalendarStore } from '@/stores/useGoogleCalendarStore'
import { useVault } from '@/contexts/VaultContext'
import { format } from 'date-fns'

export function GoogleAccountsPanel() {
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
    initSyncEngine,
    syncAccount,
    syncAllAccounts,
  } = useGoogleCalendarStore()

  const [showSettings, setShowSettings] = React.useState(false)
  const [tempClientId, setTempClientId] = React.useState(clientId || '')
  const [addingAccount, setAddingAccount] = React.useState(false)

  // Initialize sync engine when vault path changes
  React.useEffect(() => {
    if (vaultPath && clientId) {
      initSyncEngine(vaultPath)
    }
  }, [vaultPath, clientId, initSyncEngine])

  const handleSaveSettings = () => {
    setClientId(tempClientId)
    setShowSettings(false)
  }

  const handleAddAccount = async () => {
    if (!clientId) {
      setShowSettings(true)
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
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b shrink-0">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Google Calendar</span>
        </div>
        <div className="flex items-center gap-1">
          <Dialog open={showSettings} onOpenChange={setShowSettings}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <Settings className="h-3.5 w-3.5" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Google Calendar Settings</DialogTitle>
                <DialogDescription>Configure your Google OAuth credentials to enable calendar sync.</DialogDescription>
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
                  <p className="text-xs text-muted-foreground">
                    Create a project in{' '}
                    <a
                      href="https://console.cloud.google.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline">
                      Google Cloud Console
                    </a>
                    , enable the Calendar API, and create OAuth credentials.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowSettings(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveSettings}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => syncAllAccounts()}
            disabled={syncing || accounts.length === 0}>
            <RefreshCw className={cn('h-3.5 w-3.5', syncing && 'animate-spin')} />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleAddAccount}
            disabled={addingAccount || !clientId}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        {!clientId ? (
          <div className="p-4 text-center">
            <Cloud className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground mb-3">Configure Google OAuth to connect your calendars</p>
            <Button size="sm" onClick={() => setShowSettings(true)}>
              <Settings className="h-4 w-4 mr-2" />
              Setup
            </Button>
          </div>
        ) : accounts.length === 0 ? (
          <div className="p-4 text-center">
            <User className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground mb-3">No accounts connected</p>
            <Button size="sm" onClick={handleAddAccount} disabled={addingAccount}>
              {addingAccount ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Account
                </>
              )}
            </Button>
          </div>
        ) : (
          <Accordion type="multiple" defaultValue={accounts.map((a) => a.id)}>
            {accounts.map((account) => {
              const calendars = calendarsMap[account.id] || []
              const lastResult = lastSyncResults[account.id]

              return (
                <AccordionItem key={account.id} value={account.id} className="border-b">
                  <AccordionTrigger className="px-3 py-2 hover:no-underline">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {account.picture ? (
                        <img src={account.picture} alt={account.name} className="h-6 w-6 rounded-full" />
                      ) : (
                        <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-3 w-3 text-primary" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-sm font-medium truncate">{account.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{account.email}</p>
                      </div>
                      {account.calendarSyncEnabled ? (
                        <Cloud className="h-4 w-4 text-green-500 shrink-0" />
                      ) : (
                        <CloudOff className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="px-3 pb-3 space-y-3">
                      {/* Sync Toggle */}
                      <div className="flex items-center justify-between">
                        <Label htmlFor={`sync-${account.id}`} className="text-sm">
                          Enable Sync
                        </Label>
                        <Switch
                          id={`sync-${account.id}`}
                          checked={account.calendarSyncEnabled}
                          onCheckedChange={() => toggleSyncEnabled(account.id)}
                        />
                      </div>

                      {/* Last Sync Info */}
                      {account.lastSyncAt && (
                        <div className="text-xs text-muted-foreground">
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
                        </div>
                      )}

                      <Separator />

                      {/* Calendars */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs text-muted-foreground uppercase">Calendars</Label>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => loadCalendars(account.id)}>
                            <RefreshCw className="h-3 w-3" />
                          </Button>
                        </div>

                        {calendars.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic">No calendars loaded</p>
                        ) : (
                          <div className="space-y-1">
                            {calendars.map((calendar) => {
                              const isSelected = account.selectedCalendars.includes(calendar.id)
                              return (
                                <div
                                  key={calendar.id}
                                  className="flex items-center gap-2 py-1 px-2 rounded hover:bg-muted/50">
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
                                    className="text-sm flex-1 cursor-pointer truncate">
                                    {calendar.summary}
                                    {calendar.primary && (
                                      <span className="text-xs text-muted-foreground ml-1">(Primary)</span>
                                    )}
                                  </Label>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>

                      <Separator />

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => syncAccount(account.id)}
                          disabled={syncing}>
                          <RefreshCw className={cn('h-3 w-3 mr-1', syncing && 'animate-spin')} />
                          Sync Now
                        </Button>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="text-destructive">
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove Account</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to disconnect {account.email}? Synced events will remain in your
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
                  </AccordionContent>
                </AccordionItem>
              )
            })}
          </Accordion>
        )}
      </ScrollArea>

      {/* Add Another Account */}
      {clientId && accounts.length > 0 && (
        <div className="p-3 border-t">
          <Button variant="outline" size="sm" className="w-full" onClick={handleAddAccount} disabled={addingAccount}>
            <Plus className="h-4 w-4 mr-2" />
            Add Another Account
          </Button>
        </div>
      )}
    </div>
  )
}
