import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { formatDistanceToNow } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

// Indian business shorthand — e.g. ₹1.4Cr, ₹45L — for summary tiles where a
// round figure reads better than the full digit-grouped rupee amount.
export function formatCurrencyCompact(amount: number): string {
  const abs = Math.abs(amount)
  if (abs >= 1_00_00_000) return `₹${(amount / 1_00_00_000).toFixed(abs >= 10_00_00_000 ? 0 : 1)}Cr`
  if (abs >= 1_00_000) return `₹${(amount / 1_00_000).toFixed(abs >= 10_00_000 ? 0 : 1)}L`
  return formatCurrency(amount)
}

// Fixed to IST regardless of the server's own timezone (Render runs in UTC) —
// the whole team is India-based, so timestamps should read in their local time.
const IST = 'Asia/Kolkata'

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('en-US', { timeZone: IST, month: 'short', day: 'numeric', year: 'numeric' }).format(
    new Date(date)
  )
}

export function formatDateTime(date: Date | string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: IST,
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(date))
}

export function formatRelative(date: Date | string | null): string {
  if (!date) return 'never'
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}