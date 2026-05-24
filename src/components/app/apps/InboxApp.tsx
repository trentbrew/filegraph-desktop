/**
 * InboxApp - Gmail inbox viewer
 * Displays emails from connected Google accounts with folder navigation
 */

import * as React from 'react'
import { format } from 'date-fns'
import { motion, AnimatePresence } from 'motion/react'
import {
  Mail,
  Inbox,
  Send,
  Star,
  Trash2,
  Archive,
  Tag,
  Search,
  RefreshCw,
  ChevronRight,
  Loader2,
  Paperclip,
  ChevronDown,
  Image as ImageIcon,
  File,
} from 'lucide-react'
import { invoke } from '@tauri-apps/api/core'
import { join } from '@tauri-apps/api/path'
import { getFileIcon } from '@/lib/fileIcons'
import { formatFileSize } from '@/features/preview/utils'
import { toast } from 'sonner'
import { getEffectiveExtension } from '@/lib/utils/fileExtensions'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { useGoogleCalendarStore } from '@/stores/useGoogleCalendarStore'
import { useVault } from '@/contexts/VaultContext'
import { SettingsDialog } from '../SettingsDialog'
import { createGmailClient, type GmailMessage, type GmailLabel } from '@/lib/google/gmail-api'
import { tokensNeedRefresh, hasRequiredScopes } from '@/lib/google/oauth'
import { EmailKnowledgeSynthesis } from './EmailKnowledgeSynthesis'

interface EmailAttachment {
  attachmentId: string
  filename: string
  mimeType: string
  size: number
}

interface EmailRecipient {
  name?: string
  email: string
}

export interface EmailListItem {
  id: string
  threadId: string
  from: string
  to?: EmailRecipient[]
  cc?: EmailRecipient[]
  bcc?: EmailRecipient[]
  subject: string
  snippet: string
  body?: string
  date: Date
  isUnread: boolean
  isStarred: boolean
  labels: string[]
  attachments?: EmailAttachment[]
}

const SYSTEM_LABELS = [
  { id: 'INBOX', name: 'Inbox', icon: Inbox },
  { id: 'SENT', name: 'Sent', icon: Send },
  { id: 'STARRED', name: 'Starred', icon: Star },
  { id: 'TRASH', name: 'Trash', icon: Trash2 },
  { id: 'SPAM', name: 'Spam', icon: Archive },
]

// Parse email recipients from header value (e.g., "Name <email@domain.com>, another@domain.com")
function parseRecipients(headerValue?: string): EmailRecipient[] {
  if (!headerValue) return []

  // Split by comma and parse each recipient
  return headerValue.split(',').map((recipient) => {
    const trimmed = recipient.trim()
    const match = trimmed.match(/^(.+?)\s*<(.+?)>$|^(.+)$/)
    if (match) {
      const name = match[1] || match[3] || ''
      const email = match[2] || match[3] || trimmed
      return {
        name: name.trim() || undefined,
        email: email.trim(),
      }
    }
    return { email: trimmed }
  })
}

// Extract attachments from Gmail message payload
function extractAttachments(message: GmailMessage): EmailAttachment[] {
  const attachments: EmailAttachment[] = []

  const processPart = (part: GmailMessage['payload']) => {
    if (part.body?.attachmentId && part.filename) {
      attachments.push({
        attachmentId: part.body.attachmentId,
        filename: part.filename,
        mimeType: part.mimeType,
        size: part.body.size || 0,
      })
    }

    if (part.parts) {
      part.parts.forEach(processPart)
    }
  }

  processPart(message.payload)
  return attachments
}

// Generate a slug from email subject or ID
// Uses Gmail ID for uniqueness since it's globally unique
function generateEmailSlug(subject: string, gmailId: string): string {
  // Create slug from subject (first 20 chars, kebab-case)
  const subjectSlug = subject
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 20)

  // Use first 8 chars of Gmail ID as unique suffix (Gmail IDs are base64url encoded)
  const idSuffix = gmailId
    .substring(0, 8)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')

  // Combine: subject-slug-idSuffix, fallback to just idSuffix if no subject
  const slug = subjectSlug ? `${subjectSlug}-${idSuffix}` : `email-${idSuffix}`

  return slug || `email-${idSuffix}`
}

// Sync emails to @email/inbox.data entity file
async function syncEmailsToEntity(vaultPath: string, emails: EmailListItem[]): Promise<void> {
  try {
    const emailDir = await join(vaultPath, '@email')
    const inboxFilePath = await join(emailDir, 'inbox.data')

    // Convert emails to entity format
    const emailEntities = emails.map((email) => {
      const slug = generateEmailSlug(email.subject, email.id)
      const emailId = `email:${slug}:001` // Use 001 as index since slug includes Gmail ID for uniqueness

      // Extract sender name and email from "Name <email@domain.com>" format
      const fromMatch = email.from.match(/^(.+?)\s*<(.+?)>$|^(.+)$/)
      const senderName = fromMatch?.[1] || fromMatch?.[3] || email.from
      const senderEmail = fromMatch?.[2] || (email.from.includes('@') ? email.from : null)

      return {
        id: emailId,
        slug,
        gmailId: email.id,
        threadId: email.threadId,
        subject: email.subject,
        from: senderName,
        fromEmail: senderEmail,
        to: email.to,
        cc: email.cc,
        bcc: email.bcc,
        snippet: email.snippet,
        body: email.body,
        date: format(email.date, 'yyyy-MM-dd'),
        dateTime: email.date.toISOString(),
        isUnread: email.isUnread,
        isStarred: email.isStarred,
        labels: email.labels,
        attachments: email.attachments,
      }
    })

    const inboxData = {
      '@context': {
        fg: 'https://filegraph.local/',
      },
      '@id': 'fg:email:inbox',
      '@type': 'EmailCollection',
      description: 'Gmail inbox emails synced from connected Google account',
      lastSynced: new Date().toISOString(),
      items: emailEntities,
      emailCount: { '@expr': 'items.length' },
      unreadCount: { '@expr': 'items.filter(e => e.isUnread).length' },
      starredCount: { '@expr': 'items.filter(e => e.isStarred).length' },
    }

    // Write the file (Tauri will create parent directories automatically)
    await invoke('write_text_file', {
      filePath: inboxFilePath,
      content: JSON.stringify(inboxData, null, 2),
    })

    console.log(`[InboxApp] Synced ${emails.length} emails to @email/inbox.data`)
  } catch (err) {
    console.error('[InboxApp] Failed to sync emails to entity file:', err)
    // Don't throw - this is a background sync, shouldn't break the UI
  }
}

export function InboxApp() {
  const { accounts, refreshAccountTokens, reauthenticateAccount } = useGoogleCalendarStore()
  const { vaultPath } = useVault()

  const [loading, setLoading] = React.useState(false)
  const [emails, setEmails] = React.useState<EmailListItem[]>([])
  const [labels, setLabels] = React.useState<GmailLabel[]>([])
  const [selectedLabel, setSelectedLabel] = React.useState('INBOX')
  const [selectedEmail, setSelectedEmail] = React.useState<EmailListItem | null>(null)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)
  const [reauthenticating, setReauthenticating] = React.useState(false)
  const [refreshTrigger, setRefreshTrigger] = React.useState(0)
  const [labelsExpanded, setLabelsExpanded] = React.useState(true)

  const gmailAccount = accounts.find((acc) => acc.gmailSyncEnabled)

  const loadLabels = React.useCallback(async () => {
    if (!gmailAccount) return

    try {
      // Check if token has Gmail scopes
      if (!hasRequiredScopes(gmailAccount.tokens, 'gmail')) {
        setError('Gmail access not authorized. Please re-authenticate your account to grant Gmail permissions.')
        return
      }

      // Refresh tokens if needed
      if (tokensNeedRefresh(gmailAccount.tokens)) {
        await refreshAccountTokens(gmailAccount.id)
        return
      }

      const client = createGmailClient(gmailAccount.tokens)
      const labelList = await client.listLabels()
      setLabels(labelList.filter((l) => l.type === 'user'))
    } catch (err) {
      console.error('Failed to load labels:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to load labels'
      if (
        errorMessage.includes('403') ||
        errorMessage.includes('PERMISSION_DENIED') ||
        errorMessage.includes('insufficientPermissions') ||
        errorMessage.includes('ACCESS_TOKEN_SCOPE_INSUFFICIENT')
      ) {
        setError('Gmail access not authorized. Please re-authenticate your account to grant Gmail permissions.')
      }
    }
  }, [gmailAccount, refreshAccountTokens])

  const loadEmails = React.useCallback(async () => {
    if (!gmailAccount) return

    setLoading(true)
    setError(null)
    try {
      // Check if token has Gmail scopes
      if (!hasRequiredScopes(gmailAccount.tokens, 'gmail')) {
        setError('Gmail access not authorized. Please re-authenticate your account to grant Gmail permissions.')
        setLoading(false)
        return
      }

      // Refresh tokens if needed
      if (tokensNeedRefresh(gmailAccount.tokens)) {
        await refreshAccountTokens(gmailAccount.id)
        return // Will re-run after tokens refresh
      }

      const client = createGmailClient(gmailAccount.tokens)

      const response = await client.listMessages({
        labelIds: [selectedLabel],
        maxResults: 50,
        q: searchQuery || undefined,
      })

      // Batch requests to avoid rate limits (Gmail allows ~10 concurrent requests)
      // Use 'full' format to get body, recipients, and attachments
      const BATCH_SIZE = 10
      const messages: GmailMessage[] = []

      for (let i = 0; i < response.messages.length; i += BATCH_SIZE) {
        const batch = response.messages.slice(i, i + BATCH_SIZE)
        const batchPromises = batch.map((msg) => client.getMessage(msg.id, 'full'))
        const batchResults = await Promise.all(batchPromises)
        messages.push(...batchResults)

        // Small delay between batches to avoid rate limits
        if (i + BATCH_SIZE < response.messages.length) {
          await new Promise((resolve) => setTimeout(resolve, 100))
        }
      }

      const emailItems: EmailListItem[] = messages.map((msg) => {
        const to = parseRecipients(client.getHeaderValue(msg, 'To'))
        const cc = parseRecipients(client.getHeaderValue(msg, 'Cc'))
        const bcc = parseRecipients(client.getHeaderValue(msg, 'Bcc'))
        const attachments = extractAttachments(msg)
        const body = client.getMessageBody(msg)

        return {
          id: msg.id,
          threadId: msg.threadId,
          from: client.getHeaderValue(msg, 'From') || 'Unknown',
          to: to.length > 0 ? to : undefined,
          cc: cc.length > 0 ? cc : undefined,
          bcc: bcc.length > 0 ? bcc : undefined,
          subject: client.getHeaderValue(msg, 'Subject') || '(No subject)',
          snippet: msg.snippet,
          body,
          date: new Date(parseInt(msg.internalDate)),
          isUnread: msg.labelIds.includes('UNREAD'),
          isStarred: msg.labelIds.includes('STARRED'),
          labels: msg.labelIds,
          attachments: attachments.length > 0 ? attachments : undefined,
        }
      })

      setEmails(emailItems)

      // Sync emails to @email/inbox.data entity file for agent access
      if (vaultPath && emailItems.length > 0) {
        syncEmailsToEntity(vaultPath, emailItems).catch((err) => {
          console.error('[InboxApp] Background sync failed:', err)
        })
      }
    } catch (err) {
      console.error('Failed to load emails:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to load emails'
      if (errorMessage.includes('401') || errorMessage.includes('UNAUTHENTICATED')) {
        setError('Authentication expired. Please reconnect your Google account in Settings.')
      } else if (
        errorMessage.includes('403') ||
        errorMessage.includes('PERMISSION_DENIED') ||
        errorMessage.includes('insufficientPermissions') ||
        errorMessage.includes('ACCESS_TOKEN_SCOPE_INSUFFICIENT')
      ) {
        setError('Gmail access not authorized. Please re-authenticate your account to grant Gmail permissions.')
      } else if (
        errorMessage.includes('429') ||
        errorMessage.includes('rateLimitExceeded') ||
        errorMessage.includes('RESOURCE_EXHAUSTED') ||
        errorMessage.includes('Too many concurrent requests')
      ) {
        setError('Gmail API rate limit exceeded. Please wait a moment and try again.')
      } else {
        setError(errorMessage)
      }
    } finally {
      setLoading(false)
    }
  }, [gmailAccount, selectedLabel, searchQuery, refreshAccountTokens])

  const handleReauthenticate = React.useCallback(async () => {
    if (!gmailAccount) return

    setReauthenticating(true)
    setError(null)
    try {
      const updatedAccount = await reauthenticateAccount(gmailAccount.id)
      if (updatedAccount) {
        // Trigger refresh by updating the trigger state
        // This will cause the useEffects to re-run and reload data
        setRefreshTrigger((prev) => prev + 1)
      } else {
        setError('Re-authentication failed. Please try again.')
      }
    } catch (err) {
      console.error('Re-authentication error:', err)
      setError('Failed to re-authenticate. Please try again.')
    } finally {
      setReauthenticating(false)
    }
  }, [gmailAccount, reauthenticateAccount])

  React.useEffect(() => {
    loadLabels()
  }, [loadLabels, refreshTrigger])

  React.useEffect(() => {
    loadEmails()
  }, [loadEmails, refreshTrigger])

  if (!gmailAccount) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <Mail className="h-16 w-16 mx-auto text-muted-foreground" />
          <div>
            <h2 className="text-xl font-semibold mb-2">No Gmail Account Connected</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Connect your Google account and enable Gmail sync to view your emails.
            </p>
            <SettingsDialog trigger={<Button>Connect Google Account</Button>} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <ResizablePanelGroup direction="horizontal" className="h-full">
        {/* Sidebar */}
        <ResizablePanel id="inbox-sidebar" order={1} defaultSize={20} minSize={15} maxSize={30}>
          <div className="h-full rounded-lg border flex flex-col overflow-hidden">
            {/* Account Switcher */}
            <div className="px-3 py-3 border-b space-y-3">
              <div className="flex items-center gap-2 text-sm">
                {gmailAccount.picture ? (
                  <img src={gmailAccount.picture} alt="" className="h-5 w-5 rounded-full" />
                ) : (
                  <div className="h-5 w-5 rounded-full bg-primary/10" />
                )}
                <span className="flex-1 truncate">{gmailAccount.email}</span>
              </div>
              <SettingsDialog
                trigger={
                  <Button variant="outline" size="sm" className="w-full text-xs">
                    Manage Accounts
                  </Button>
                }
              />
            </div>

            {/* Folders */}
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {SYSTEM_LABELS.map((label, idx) => {
                  const IconComponent = label.icon
                  const isActive = selectedLabel === label.id

                  return (
                    <motion.button
                      key={label.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2, delay: idx * 0.03 }}
                      onClick={() => setSelectedLabel(label.id)}
                      className={cn(
                        'w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-all duration-200 relative group',
                        isActive
                          ? 'bg-secondary text-secondary-foreground shadow-sm'
                          : 'hover:bg-secondary/50 hover:translate-x-0.5',
                      )}>
                      {isActive && (
                        <motion.div
                          layoutId="activeLabel"
                          className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full"
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        />
                      )}
                      <IconComponent className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:scale-110" />
                      <span className="flex-1 text-left truncate font-medium">{label.name}</span>
                    </motion.button>
                  )
                })}

                {labels.length > 0 && (
                  <>
                    <Separator className="my-2" />
                    <button
                      onClick={() => setLabelsExpanded(!labelsExpanded)}
                      className="w-full flex items-center justify-between px-3 py-1.5 rounded-md text-xs font-semibold text-muted-foreground uppercase tracking-wide hover:bg-secondary/30 transition-colors group">
                      <span>Labels</span>
                      <ChevronDown
                        className={cn(
                          'h-3 w-3 transition-transform duration-200',
                          labelsExpanded ? 'rotate-0' : '-rotate-90',
                        )}
                      />
                    </button>
                    <AnimatePresence initial={false}>
                      {labelsExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden">
                          {labels.map((label, idx) => {
                            const isActive = selectedLabel === label.id

                            return (
                              <motion.button
                                key={label.id}
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.15, delay: idx * 0.02 }}
                                onClick={() => setSelectedLabel(label.id)}
                                className={cn(
                                  'w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-all duration-200 relative group',
                                  isActive
                                    ? 'bg-secondary text-secondary-foreground shadow-sm'
                                    : 'hover:bg-secondary/50 hover:translate-x-0.5',
                                )}>
                                {isActive && (
                                  <motion.div
                                    layoutId="activeLabel"
                                    className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full"
                                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                  />
                                )}
                                <Tag className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:scale-110" />
                                <span className="flex-1 text-left truncate">{label.name}</span>
                                {label.messagesUnread ? (
                                  <motion.span
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">
                                    {label.messagesUnread}
                                  </motion.span>
                                ) : null}
                              </motion.button>
                            )
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </>
                )}
              </div>
            </ScrollArea>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Email List */}
        <ResizablePanel id="inbox-list" order={2} defaultSize={35} minSize={25}>
          <div className="h-full rounded-lg border flex flex-col bg-background/50">
            {/* Header */}
            <div className="p-4 border-b space-y-3 shrink-0">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">
                  {SYSTEM_LABELS.find((l) => l.id === selectedLabel)?.name ||
                    labels.find((l) => l.id === selectedLabel)?.name ||
                    'Emails'}
                </h2>
                <Button variant="ghost" size="icon" onClick={loadEmails} disabled={loading} aria-label="Refresh">
                  <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
                </Button>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search emails..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Email List */}
            <div className="flex-1 min-h-0 overflow-hidden">
              <ScrollArea className="h-full w-full">
                {error ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center space-y-3 max-w-md px-4">
                      <Mail className="h-12 w-12 mx-auto text-destructive" />
                      <div>
                        <p className="text-sm font-medium text-destructive mb-1">Failed to load emails</p>
                        <p className="text-xs text-muted-foreground">{error}</p>
                      </div>
                      {error.includes('re-authenticate') ? (
                        <Button size="sm" onClick={handleReauthenticate} disabled={reauthenticating} className="mt-2">
                          {reauthenticating ? (
                            <>
                              <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
                              Re-authenticating...
                            </>
                          ) : (
                            'Re-authenticate Account'
                          )}
                        </Button>
                      ) : (
                        <SettingsDialog
                          trigger={
                            <Button size="sm" variant="outline">
                              Open Settings
                            </Button>
                          }
                        />
                      )}
                    </div>
                  </div>
                ) : loading && emails.length === 0 ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : emails.length === 0 ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center space-y-2">
                      <Mail className="h-12 w-12 mx-auto text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">No emails found</p>
                    </div>
                  </div>
                ) : (
                  <div className="divide-y divide-border/50">
                    <AnimatePresence mode="popLayout">
                      {emails.map((email, idx) => (
                        <motion.button
                          key={email.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          transition={{
                            duration: 0.2,
                            delay: idx * 0.02,
                            layout: { duration: 0.2 },
                          }}
                          layout
                          onClick={() => setSelectedEmail(email)}
                          className={cn(
                            'w-full px-4 py-3.5 text-left transition-all duration-200 min-w-0 group relative',
                            selectedEmail?.id === email.id
                              ? 'bg-secondary/80 shadow-sm'
                              : 'hover:bg-secondary/30 hover:shadow-sm',
                            email.isUnread && 'bg-primary/5',
                            email.isStarred && 'bg-yellow-500/5 border-l-2 border-yellow-400',
                          )}>
                          <div className="flex items-start gap-3 min-w-0">
                            <div className="flex-1 min-w-0 space-y-1.5">
                              <div className="flex items-center gap-2">
                                <span
                                  className={cn(
                                    'truncate transition-colors',
                                    email.isUnread
                                      ? 'text-sm font-semibold text-foreground'
                                      : 'text-sm font-medium text-foreground/90',
                                  )}>
                                  {email.from}
                                </span>
                                {email.isStarred && (
                                  <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: 'spring', stiffness: 500, damping: 25 }}>
                                    <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400 shrink-0 drop-shadow-sm" />
                                  </motion.div>
                                )}
                                {email.attachments && email.attachments.length > 0 && (
                                  <Paperclip className="h-3 w-3 text-muted-foreground shrink-0 opacity-60" />
                                )}
                              </div>
                              <p
                                className={cn(
                                  'truncate transition-colors',
                                  email.isUnread
                                    ? 'text-sm font-semibold text-foreground'
                                    : 'text-sm font-medium text-foreground/80',
                                )}>
                                {email.subject}
                              </p>
                              {email.snippet && (
                                <p className="text-xs text-muted-foreground/80 truncate leading-relaxed">
                                  {email.snippet}
                                </p>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground shrink-0 pt-0.5 font-medium">
                              {format(email.date, 'MMM d')}
                            </div>
                          </div>
                          {selectedEmail?.id === email.id && (
                            <motion.div
                              layoutId="selectedEmail"
                              className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full"
                              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                            />
                          )}
                        </motion.button>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
        </ResizablePanel>

        {/* Email Detail */}
        {selectedEmail && (
          <>
            <ResizableHandle withHandle />
            <ResizablePanel id="inbox-detail" order={3} defaultSize={45} minSize={30}>
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2 }}
                className="h-full rounded-lg border flex flex-col overflow-hidden bg-background">
                {/* Email Header */}
                <div className="p-5 border-b space-y-3 shrink-0 bg-gradient-to-b from-background to-background/95">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <motion.h3
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-xl font-bold mb-3 text-foreground">
                        {selectedEmail.subject}
                      </motion.h3>
                      <div className="text-sm space-y-2">
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.15 }}
                          className="flex items-center gap-2">
                          <span className="text-muted-foreground font-medium min-w-[3rem]">From:</span>
                          <span className="text-foreground font-semibold truncate">{selectedEmail.from}</span>
                        </motion.div>
                        {selectedEmail.to && selectedEmail.to.length > 0 && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="flex items-center gap-2">
                            <span className="text-muted-foreground font-medium min-w-[3rem]">To:</span>
                            <span className="text-foreground/90 truncate">
                              {selectedEmail.to.map((r) => r.name || r.email).join(', ')}
                            </span>
                          </motion.div>
                        )}
                        {selectedEmail.cc && selectedEmail.cc.length > 0 && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.25 }}
                            className="flex items-center gap-2">
                            <span className="text-muted-foreground font-medium min-w-[3rem]">Cc:</span>
                            <span className="text-foreground/90 truncate">
                              {selectedEmail.cc.map((r) => r.name || r.email).join(', ')}
                            </span>
                          </motion.div>
                        )}
                        {selectedEmail.bcc && selectedEmail.bcc.length > 0 && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.3 }}
                            className="flex items-center gap-2">
                            <span className="text-muted-foreground font-medium min-w-[3rem]">Bcc:</span>
                            <span className="text-foreground/90 truncate">
                              {selectedEmail.bcc.map((r) => r.name || r.email).join(', ')}
                            </span>
                          </motion.div>
                        )}
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.35 }}
                          className="text-muted-foreground">
                          {format(selectedEmail.date, 'PPpp')}
                        </motion.div>
                      </div>
                    </div>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button variant="ghost" size="icon" onClick={() => setSelectedEmail(null)} aria-label="Close">
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </motion.div>
                  </div>
                </div>

                {/* Email Body */}
                <ScrollArea className="flex-1">
                  <div className="p-4 space-y-4">
                    {/* Attachments */}
                    {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="border rounded-lg p-4 space-y-3 bg-gradient-to-br from-secondary/30 to-secondary/10">
                        <div className="flex items-center gap-2 text-sm font-semibold">
                          <Paperclip className="h-4 w-4 text-primary" />
                          <span>
                            {selectedEmail.attachments.length} attachment
                            {selectedEmail.attachments.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {selectedEmail.attachments.map((attachment, idx) => {
                            const isImage = attachment.mimeType.startsWith('image/')
                            const fileExtension = getEffectiveExtension(attachment.filename) || ''

                            return (
                              <motion.div
                                key={idx}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.1 + idx * 0.05 }}
                                whileHover={{ scale: 1.02 }}
                                className="group relative overflow-hidden rounded-lg border bg-background/50 hover:bg-background hover:shadow-md transition-all duration-200 cursor-pointer">
                                {isImage ? (
                                  <div className="aspect-square bg-muted flex items-center justify-center">
                                    <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </div>
                                ) : (
                                  <div className="aspect-square bg-muted/50 flex flex-col items-center justify-center p-3">
                                    <File className="h-8 w-8 text-muted-foreground/50 mb-1" />
                                    <span className="text-[10px] font-mono text-muted-foreground uppercase">
                                      {fileExtension}
                                    </span>
                                  </div>
                                )}
                                <div className="p-2 space-y-1">
                                  <p className="text-xs font-medium truncate">{attachment.filename}</p>
                                  <p className="text-[10px] text-muted-foreground">
                                    {(attachment.size / 1024).toFixed(1)} KB
                                  </p>
                                </div>
                              </motion.div>
                            )
                          })}
                        </div>
                      </motion.div>
                    )}

                    {/* Knowledge Synthesis */}
                    <EmailKnowledgeSynthesis
                      email={selectedEmail}
                      onEntityCreated={(entityType, entityName) => {
                        console.log(`[InboxApp] Entity created: ${entityType} - ${entityName}`)
                      }}
                    />

                    {/* Full Email Body */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="prose prose-sm dark:prose-invert max-w-none">
                      {selectedEmail.body ? (
                        (() => {
                          // Check if body is HTML (contains HTML tags)
                          const isHTML = /<[a-z][\s\S]*>/i.test(selectedEmail.body)
                          if (isHTML) {
                            return (
                              <div
                                className="email-body-html text-sm wrap-break-word"
                                style={{
                                  wordBreak: 'break-word',
                                  lineHeight: '1.6',
                                  color: 'hsl(var(--foreground))',
                                }}
                                dangerouslySetInnerHTML={{
                                  __html: selectedEmail.body
                                    .replace(/<style[^>]*>.*?<\/style>/gi, '') // Remove inline styles that might conflict
                                    .replace(/style="[^"]*"/gi, '') // Remove style attributes
                                    .replace(/<script[^>]*>.*?<\/script>/gi, ''), // Remove scripts for security
                                }}
                              />
                            )
                          } else {
                            return (
                              <p className="text-sm whitespace-pre-wrap wrap-break-word leading-relaxed">
                                {selectedEmail.body}
                              </p>
                            )
                          }
                        })()
                      ) : (
                        <p className="text-sm whitespace-pre-wrap wrap-break-word leading-relaxed">
                          {selectedEmail.snippet}
                        </p>
                      )}
                    </motion.div>
                  </div>
                </ScrollArea>
              </motion.div>
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
    </div>
  )
}
