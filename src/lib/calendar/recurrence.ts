/**
 * Recurrence Utilities
 * Parse and display RRULE recurrence patterns
 */

// Days of the week mapping
const DAYS_MAP: Record<string, string> = {
  SU: 'Sunday',
  MO: 'Monday',
  TU: 'Tuesday',
  WE: 'Wednesday',
  TH: 'Thursday',
  FR: 'Friday',
  SA: 'Saturday',
}

const DAYS_SHORT: Record<string, string> = {
  SU: 'Sun',
  MO: 'Mon',
  TU: 'Tue',
  WE: 'Wed',
  TH: 'Thu',
  FR: 'Fri',
  SA: 'Sat',
}

// Month mapping
const MONTHS: string[] = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

// Ordinal suffix helper
function getOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

export interface ParsedRecurrence {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'
  interval: number
  byDay?: string[]
  byMonthDay?: number[]
  byMonth?: number[]
  count?: number
  until?: Date
  bySetPos?: number
}

/**
 * Parse an RRULE string into structured data
 */
export function parseRRule(rrule: string): ParsedRecurrence | null {
  if (!rrule) return null

  // Handle multiple lines (RRULE may include EXDATE, etc.)
  const ruleLine = rrule.split('\n').find((l) => l.startsWith('RRULE:') || l.startsWith('FREQ='))
  if (!ruleLine) return null

  const ruleStr = ruleLine.replace('RRULE:', '')
  const parts = ruleStr.split(';')
  const parsed: Partial<ParsedRecurrence> = {}

  for (const part of parts) {
    const [key, value] = part.split('=')
    switch (key) {
      case 'FREQ':
        parsed.frequency = value.toLowerCase() as ParsedRecurrence['frequency']
        break
      case 'INTERVAL':
        parsed.interval = parseInt(value, 10)
        break
      case 'BYDAY':
        parsed.byDay = value.split(',')
        break
      case 'BYMONTHDAY':
        parsed.byMonthDay = value.split(',').map((n) => parseInt(n, 10))
        break
      case 'BYMONTH':
        parsed.byMonth = value.split(',').map((n) => parseInt(n, 10))
        break
      case 'COUNT':
        parsed.count = parseInt(value, 10)
        break
      case 'UNTIL':
        // Parse RRULE date format: YYYYMMDD or YYYYMMDDTHHmmssZ
        const year = parseInt(value.slice(0, 4), 10)
        const month = parseInt(value.slice(4, 6), 10) - 1
        const day = parseInt(value.slice(6, 8), 10)
        parsed.until = new Date(year, month, day)
        break
      case 'BYSETPOS':
        parsed.bySetPos = parseInt(value, 10)
        break
    }
  }

  if (!parsed.frequency) return null

  return {
    frequency: parsed.frequency,
    interval: parsed.interval || 1,
    byDay: parsed.byDay,
    byMonthDay: parsed.byMonthDay,
    byMonth: parsed.byMonth,
    count: parsed.count,
    until: parsed.until,
    bySetPos: parsed.bySetPos,
  }
}

/**
 * Convert parsed recurrence to human-readable string
 */
export function formatRecurrence(parsed: ParsedRecurrence): string {
  const { frequency, interval, byDay, byMonthDay, byMonth, count, until, bySetPos } = parsed
  const parts: string[] = []

  // Frequency with interval
  if (interval === 1) {
    switch (frequency) {
      case 'daily':
        parts.push('Daily')
        break
      case 'weekly':
        parts.push('Weekly')
        break
      case 'monthly':
        parts.push('Monthly')
        break
      case 'yearly':
        parts.push('Yearly')
        break
    }
  } else {
    switch (frequency) {
      case 'daily':
        parts.push(`Every ${interval} days`)
        break
      case 'weekly':
        parts.push(`Every ${interval} weeks`)
        break
      case 'monthly':
        parts.push(`Every ${interval} months`)
        break
      case 'yearly':
        parts.push(`Every ${interval} years`)
        break
    }
  }

  // Day specification for weekly
  if (frequency === 'weekly' && byDay && byDay.length > 0) {
    if (byDay.length === 5 && !byDay.includes('SA') && !byDay.includes('SU')) {
      parts.push('on weekdays')
    } else if (byDay.length === 2 && byDay.includes('SA') && byDay.includes('SU')) {
      parts.push('on weekends')
    } else if (byDay.length === 7) {
      // Every day - don't add anything
    } else {
      const dayNames = byDay.map((d) => {
        // Handle cases like "1MO" (first Monday)
        const match = d.match(/^(-?\d)?([A-Z]{2})$/)
        if (match) {
          return DAYS_SHORT[match[2]] || d
        }
        return DAYS_SHORT[d] || d
      })
      parts.push(`on ${dayNames.join(', ')}`)
    }
  }

  // Monthly with specific day
  if (frequency === 'monthly') {
    if (byMonthDay && byMonthDay.length > 0) {
      const days = byMonthDay.map((d) => getOrdinal(d))
      parts.push(`on the ${days.join(', ')}`)
    } else if (byDay && byDay.length > 0 && bySetPos !== undefined) {
      const posWord = bySetPos === -1 ? 'last' : getOrdinal(bySetPos)
      const dayName = DAYS_MAP[byDay[0].replace(/^-?\d/, '')] || byDay[0]
      parts.push(`on the ${posWord} ${dayName}`)
    } else if (byDay && byDay.length > 0) {
      // Parse "2TU" as "second Tuesday"
      const dayParts = byDay.map((d) => {
        const match = d.match(/^(-?\d)?([A-Z]{2})$/)
        if (match && match[1]) {
          const pos = parseInt(match[1], 10)
          const posWord = pos === -1 ? 'last' : getOrdinal(pos)
          const dayName = DAYS_MAP[match[2]] || match[2]
          return `${posWord} ${dayName}`
        }
        return DAYS_MAP[d] || d
      })
      parts.push(`on the ${dayParts.join(', ')}`)
    }
  }

  // Yearly with month
  if (frequency === 'yearly' && byMonth && byMonth.length > 0) {
    const monthNames = byMonth.map((m) => MONTHS[m - 1])
    parts.push(`in ${monthNames.join(', ')}`)

    if (byMonthDay && byMonthDay.length > 0) {
      const days = byMonthDay.map((d) => getOrdinal(d))
      parts.push(`on the ${days.join(', ')}`)
    }
  }

  // End condition
  if (until) {
    parts.push(`until ${until.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`)
  } else if (count) {
    parts.push(`(${count} times)`)
  }

  return parts.join(' ')
}

/**
 * Parse RRULE and return human-readable string
 */
export function rruleToText(rrule: string | undefined): string | null {
  if (!rrule) return null
  const parsed = parseRRule(rrule)
  if (!parsed) return null
  return formatRecurrence(parsed)
}

/**
 * Check if an event is recurring
 */
export function isRecurring(recurrence: string | undefined): boolean {
  return !!recurrence && recurrence.includes('FREQ=')
}

/**
 * Get recurrence frequency for display
 */
export function getRecurrenceFrequency(recurrence: string | undefined): string | null {
  if (!recurrence) return null
  const parsed = parseRRule(recurrence)
  if (!parsed) return null

  if (parsed.interval === 1) {
    return parsed.frequency.charAt(0).toUpperCase() + parsed.frequency.slice(1)
  }

  return `Every ${parsed.interval} ${parsed.frequency.replace('ly', '')}s`
}
