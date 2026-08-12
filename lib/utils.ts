import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow } from 'date-fns'

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

export function formatDate(date: Date | string): string {
  return format(new Date(date), 'MMM d, yyyy')
}

export function formatDateTime(date: Date | string): string {
  return format(new Date(date), 'MMM d, h:mm a')
}

export function formatRelative(date: Date | string | null): string {
  if (!date) return 'never'
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}