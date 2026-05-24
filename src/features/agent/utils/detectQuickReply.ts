/**
 * detectQuickReplyOptions - Parse assistant messages for question patterns
 *
 * Detects when the agent asks a question with enumerable options and extracts
 * them as quick-reply choices. Returns null if no actionable question is found.
 */

export interface QuickReplyOption {
  label: string
  value: string
  description?: string
}

export interface DetectedQuickReply {
  question: string
  options: QuickReplyOption[]
}

/**
 * Attempt to extract quick-reply options from an assistant message.
 *
 * Patterns detected:
 * 1. Message ends with `?` and contains a numbered list (1. Option / 2. Option)
 * 2. Message ends with `?` and contains a bulleted list (- Option / * Option)
 * 3. Message contains "For example:" or "such as:" followed by items
 */
export function detectQuickReplyOptions(content: string): DetectedQuickReply | null {
  if (!content || content.length < 20) return null

  const trimmed = content.trim()
  const lines = trimmed.split('\n').map((l) => l.trim()).filter(Boolean)

  // The message must END with a question (last meaningful line).
  // This filters out status reports that happen to contain a '?' earlier.
  const lastLine = lines[lines.length - 1] || ''
  if (!lastLine.endsWith('?')) return null

  // Skip if the message looks like a status report / summary
  if (looksLikeStatusReport(trimmed)) return null

  // Try numbered list: "1. Option\n2. Option\n3. Option"
  const numberedItems = extractNumberedList(trimmed)
  if (numberedItems.length >= 2 && numberedItems.length <= 6 && !looksLikeInfoList(numberedItems)) {
    return { question: lastLine, options: numberedItems.map(parseOption) }
  }

  // Try bulleted list: "- Option\n- Option" or "* Option\n* Option"
  const bulletItems = extractBulletList(trimmed)
  if (bulletItems.length >= 2 && bulletItems.length <= 6 && !looksLikeInfoList(bulletItems)) {
    return { question: lastLine, options: bulletItems.map(parseOption) }
  }

  // Try "For example:" pattern with comma-separated or line-separated items
  const exampleItems = extractExampleItems(trimmed)
  if (exampleItems.length >= 2 && exampleItems.length <= 6 && !looksLikeInfoList(exampleItems)) {
    return { question: lastLine, options: exampleItems.map(parseOption) }
  }

  return null
}

/** Detect status-report / summary messages that shouldn't become suggestions */
function looksLikeStatusReport(text: string): boolean {
  const lower = text.toLowerCase()
  const statusPhrases = [
    'current status', 'here\'s what', 'here is what', 'summary:',
    'status:', 'everything is', 'all set', 'is running', 'is live',
    'is active', 'is healthy', 'successfully', 'completed',
    'here are the results', 'here\'s a summary', 'here is a summary',
  ]
  return statusPhrases.some((phrase) => lower.includes(phrase))
}

/** Detect list items that are informational (status, descriptions) not actionable choices */
function looksLikeInfoList(items: string[]): boolean {
  const infoPatterns = [
    /\b(running|listening|active|healthy|returning|started|stopped|installed|configured)\b/i,
    /\b(port|process|response|server|status|version|localhost)\b.*:/i,
    /\b(http \d{3}|200 ok|404|500)\b/i,
  ]
  const infoCount = items.filter((item) =>
    infoPatterns.some((pattern) => pattern.test(item))
  ).length
  // If most items look informational, skip
  return infoCount > items.length / 2
}

export function cleanLabel(label: string): string {
  if (!label) return ""
  return label
    .replace(/\*\*(.*?)\*\*/g, '$1') // Strip all bold markers
    .replace(/__(.*?)__/g, '$1') // Strip all italics markers
    .replace(/^["'`]|["'`]$/g, '') // Strip outer quotes
    .replace(/:\s*$/, '') // Strip trailing colon
    .replace(/\s*\(\d+:\d+\)\s*$/, '') // Strip timestamp artifacts like (00:43)
    .replace(/^\d+\.\s*/, '') // Strip leading numbers
    .replace(/^[-*•]\s*/, '') // Strip leading bullet points
    .replace(/\\/g, '') // Strip escape characters
    .trim()
}

function parseOption(item: string): QuickReplyOption {
  const rawCleaned = item.replace(/^\d+\.\s*/, '').replace(/^[-*•]\s*/, '').trim()

  if (rawCleaned.includes(':')) {
    const parts = rawCleaned.split(/:\s+/)
    const labelPart = parts[0]
    const descPart = parts.slice(1).join(': ')
    return {
      label: cleanLabel(labelPart),
      value: cleanLabel(rawCleaned), // Use full cleaned text as value
      description: cleanLabel(descPart)
    }
  }

  const cleaned = cleanLabel(rawCleaned)
  return { label: cleaned, value: cleaned }
}

function extractNumberedList(text: string): string[] {
  const matches = text.match(/^\s*\d+[.)]\s+(.+)$/gm)
  if (!matches) return []
  return matches
    .map((m) => m.replace(/^\s*\d+[.)]\s+/, '').trim())
    .filter((s) => s.length > 0 && s.length < 120)
}

function extractBulletList(text: string): string[] {
  const matches = text.match(/^\s*[-*•]\s+(.+)$/gm)
  if (!matches) return []
  return matches
    .map((m) => m.replace(/^\s*[-*•]\s+/, '').trim())
    .filter((s) => s.length > 0 && s.length < 120)
    // Filter out items that look like instructions rather than options
    .filter((s) => !s.startsWith('Use ') && !s.startsWith('Do ') && !s.startsWith('For '))
}

function extractExampleItems(text: string): string[] {
  // Match "For example:" or "such as:" followed by items
  const exampleMatch = text.match(/(?:for example|such as|e\.g\.|options include|suggested next steps)[:\s]+(.+)/i)
  if (!exampleMatch) return []

  const itemsStr = exampleMatch[1]
  // Try comma-separated
  const commaItems = itemsStr.split(/,\s*(?:or\s+)?/)
  if (commaItems.length >= 2) return commaItems.filter((s) => s.length > 0 && s.length < 120)

  return []
}
