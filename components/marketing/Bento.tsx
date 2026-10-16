import { cn } from '@/lib/utils'

// Shared bento primitives for the marketing page: a grid of unequal cells,
// reused across Bridge, Agent native and Why it's free so the whole page
// reads as one consistent layout instead of three different list styles.

export function BentoGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('grid grid-cols-1 gap-3 md:grid-cols-6', className)}>
      {children}
    </div>
  )
}

export function BentoCell({
  children,
  className,
  span,
}: {
  children: React.ReactNode
  className?: string
  /** Column span out of 6, from md up. Omit for a cell that just takes 2 (a third of the row). */
  span?: 2 | 3 | 4 | 6
}) {
  const spanClass = {
    2: 'md:col-span-2',
    3: 'md:col-span-3',
    4: 'md:col-span-4',
    6: 'md:col-span-6',
  }[span ?? 2]

  return (
    <div
      className={cn(
        'rounded-xl border border-white/[0.09] bg-white/[0.03] p-7 transition-colors duration-300 hover:border-white/[0.16] hover:bg-white/[0.045]',
        spanClass,
        className,
      )}
    >
      {children}
    </div>
  )
}
