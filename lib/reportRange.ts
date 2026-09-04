import { formatDate } from '@/lib/utils'

export type RangeKey = 'today' | 'week' | 'month'

export const RANGE_LABELS: Record<RangeKey, string> = { today: 'Today', week: 'This week', month: 'This month' }

export function parseRangeKey(value: string | undefined): RangeKey {
  return value === 'today' || value === 'month' ? value : 'week'
}

export function getRange(range: RangeKey): { start: Date; end: Date; label: string } {
  const now = new Date()
  if (range === 'today') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
    return { start, end, label: formatDate(start) }
  }
  if (range === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
    return { start, end, label: `${formatDate(start)} – ${formatDate(end)}` }
  }
  // week: Monday-start calendar week containing today
  const day = now.getDay() // 0 = Sunday
  const diffToMonday = day === 0 ? -6 : 1 - day
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday)
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6, 23, 59, 59, 999)
  return { start, end, label: `${formatDate(start)} – ${formatDate(end)}` }
}

export interface TrendBucket {
  start: Date
  end: Date
  label: string
}

// Trailing Monday-start weeks, oldest first, ending with the current
// (in-progress) week.
export function getWeeklyBuckets(count: number): TrendBucket[] {
  const { start: currentWeekStart } = getRange('week')
  const buckets: TrendBucket[] = []
  for (let i = count - 1; i >= 0; i--) {
    const start = new Date(currentWeekStart.getFullYear(), currentWeekStart.getMonth(), currentWeekStart.getDate() - i * 7)
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6, 23, 59, 59, 999)
    buckets.push({ start, end, label: formatDate(start) })
  }
  return buckets
}

// Trailing calendar months, oldest first, ending with the current
// (in-progress) month.
export function getMonthlyBuckets(count: number): TrendBucket[] {
  const now = new Date()
  const buckets: TrendBucket[] = []
  for (let i = count - 1; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999)
    buckets.push({ start, end, label: start.toLocaleDateString('en-US', { month: 'short' }) })
  }
  return buckets
}

// Trailing calendar days, oldest first, ending with today — independent of
// the page's own range picker, same convention as the weekly/monthly trend
// buckets above.
export function getDailyBuckets(count: number): TrendBucket[] {
  const now = new Date()
  const buckets: TrendBucket[] = []
  for (let i = count - 1; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 23, 59, 59, 999)
    buckets.push({ start, end, label: start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) })
  }
  return buckets
}
