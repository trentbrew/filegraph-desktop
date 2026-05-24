/**
 * Gmail API Client
 * Handles Gmail API requests with OAuth tokens
 */

import type { GoogleTokens } from './types'

const GMAIL_API_BASE = 'https://gmail.googleapis.com/gmail/v1'

export interface GmailMessage {
  id: string
  threadId: string
  labelIds: string[]
  snippet: string
  payload: {
    partId?: string
    mimeType: string
    filename?: string
    headers: Array<{
      name: string
      value: string
    }>
    body?: {
      attachmentId?: string
      size: number
      data?: string
    }
    parts?: Array<{
      partId: string
      mimeType: string
      filename?: string
      headers: Array<{
        name: string
        value: string
      }>
      body?: {
        attachmentId?: string
        size: number
        data?: string
      }
    }>
  }
  sizeEstimate: number
  historyId: string
  internalDate: string
}

export interface GmailThread {
  id: string
  snippet: string
  historyId: string
  messages: GmailMessage[]
}

export interface GmailLabel {
  id: string
  name: string
  messageListVisibility?: 'show' | 'hide'
  labelListVisibility?: 'labelShow' | 'labelShowIfUnread' | 'labelHide'
  type: 'system' | 'user'
  messagesTotal?: number
  messagesUnread?: number
  threadsTotal?: number
  threadsUnread?: number
  color?: {
    textColor: string
    backgroundColor: string
  }
}

export interface ListMessagesResponse {
  messages: Array<{
    id: string
    threadId: string
  }>
  nextPageToken?: string
  resultSizeEstimate: number
}

export interface ListLabelsResponse {
  labels: GmailLabel[]
}

export interface GmailProfile {
  emailAddress: string
  messagesTotal: number
  threadsTotal: number
  historyId: string
}

export class GmailAPIClient {
  private tokens: GoogleTokens

  constructor(tokens: GoogleTokens) {
    this.tokens = tokens
  }

  private async fetch(endpoint: string, options: RequestInit = {}, retries = 3): Promise<Response> {
    const url = `${GMAIL_API_BASE}${endpoint}`
    const headers = {
      Authorization: `Bearer ${this.tokens.access_token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    }

    for (let attempt = 0; attempt <= retries; attempt++) {
      const response = await fetch(url, {
        ...options,
        headers,
      })

      if (response.ok) {
        return response
      }

      // Handle rate limiting (429) with exponential backoff
      if (response.status === 429 && attempt < retries) {
        const errorData = await response.json().catch(() => ({}))
        const retryAfter = errorData.error?.details?.[0]?.retryDelaySeconds || Math.pow(2, attempt)
        const delayMs = retryAfter * 1000

        console.warn(`Gmail API rate limit hit. Retrying after ${delayMs}ms (attempt ${attempt + 1}/${retries + 1})`)
        await new Promise((resolve) => setTimeout(resolve, delayMs))
        continue
      }

      // For other errors or final attempt, throw
      const error = await response.text()
      throw new Error(`Gmail API error: ${response.status} ${error}`)
    }

    // This should never be reached, but TypeScript needs it
    throw new Error('Gmail API request failed after retries')
  }

  async getProfile(): Promise<GmailProfile> {
    const response = await this.fetch('/users/me/profile')
    return response.json()
  }

  async listLabels(): Promise<GmailLabel[]> {
    const response = await this.fetch('/users/me/labels')
    const data: ListLabelsResponse = await response.json()
    return data.labels
  }

  async listMessages(
    params: {
      labelIds?: string[]
      q?: string
      maxResults?: number
      pageToken?: string
      includeSpamTrash?: boolean
    } = {},
  ): Promise<ListMessagesResponse> {
    const searchParams = new URLSearchParams()

    if (params.labelIds?.length) {
      params.labelIds.forEach((id) => searchParams.append('labelIds', id))
    }
    if (params.q) searchParams.set('q', params.q)
    if (params.maxResults) searchParams.set('maxResults', params.maxResults.toString())
    if (params.pageToken) searchParams.set('pageToken', params.pageToken)
    if (params.includeSpamTrash !== undefined) {
      searchParams.set('includeSpamTrash', params.includeSpamTrash.toString())
    }

    const query = searchParams.toString()
    const endpoint = `/users/me/messages${query ? `?${query}` : ''}`
    const response = await this.fetch(endpoint)
    return response.json()
  }

  async getMessage(messageId: string, format: 'minimal' | 'full' | 'raw' | 'metadata' = 'full'): Promise<GmailMessage> {
    const response = await this.fetch(`/users/me/messages/${messageId}?format=${format}`)
    return response.json()
  }

  async getThread(threadId: string, format: 'minimal' | 'full' | 'metadata' = 'full'): Promise<GmailThread> {
    const response = await this.fetch(`/users/me/threads/${threadId}?format=${format}`)
    return response.json()
  }

  async modifyMessage(
    messageId: string,
    modifications: {
      addLabelIds?: string[]
      removeLabelIds?: string[]
    },
  ): Promise<GmailMessage> {
    const response = await this.fetch(`/users/me/messages/${messageId}/modify`, {
      method: 'POST',
      body: JSON.stringify(modifications),
    })
    return response.json()
  }

  async trashMessage(messageId: string): Promise<GmailMessage> {
    const response = await this.fetch(`/users/me/messages/${messageId}/trash`, {
      method: 'POST',
    })
    return response.json()
  }

  async untrashMessage(messageId: string): Promise<GmailMessage> {
    const response = await this.fetch(`/users/me/messages/${messageId}/untrash`, {
      method: 'POST',
    })
    return response.json()
  }

  async deleteMessage(messageId: string): Promise<void> {
    await this.fetch(`/users/me/messages/${messageId}`, {
      method: 'DELETE',
    })
  }

  async sendMessage(rawMessage: string): Promise<GmailMessage> {
    const response = await this.fetch('/users/me/messages/send', {
      method: 'POST',
      body: JSON.stringify({
        raw: rawMessage,
      }),
    })
    return response.json()
  }

  getHeaderValue(message: GmailMessage, headerName: string): string | undefined {
    return message.payload.headers.find((h) => h.name.toLowerCase() === headerName.toLowerCase())?.value
  }

  getMessageBody(message: GmailMessage): string {
    if (message.payload.body?.data) {
      return this.decodeBase64(message.payload.body.data)
    }

    if (message.payload.parts) {
      for (const part of message.payload.parts) {
        if (part.mimeType === 'text/plain' && part.body?.data) {
          return this.decodeBase64(part.body.data)
        }
      }
      for (const part of message.payload.parts) {
        if (part.mimeType === 'text/html' && part.body?.data) {
          return this.decodeBase64(part.body.data)
        }
      }
    }

    return message.snippet
  }

  private decodeBase64(encoded: string): string {
    const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/')
    return decodeURIComponent(escape(atob(base64)))
  }
}

export function createGmailClient(tokens: GoogleTokens): GmailAPIClient {
  return new GmailAPIClient(tokens)
}
