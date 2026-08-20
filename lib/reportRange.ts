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
