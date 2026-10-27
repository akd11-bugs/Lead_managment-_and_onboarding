import { cn } from '@/lib/utils'

// Shared bento primitives for the marketing page: a grid of unequal cells,
// reused across Bridge, Agent native and Why it's free so the whole page
// reads as one consistent layout instead of three different list styles.
//
// Flat surfaces with a gap between them, not a hairline lattice — the
// previous version joined every cell's 1px border into a continuous grid
// of lines (an OMA Operator-style lattice), which is exactly the kind of
// "outlined box" / "thin rule" tell a design-taste review flags. A small
// gap plus one flat tone step is the replacement: cells still read as
// related, separate surfaces without a drawn line anywhere.

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
        'bg-white/[0.03] p-7 transition-colors duration-300 hover:bg-white/[0.045]',
        spanClass,
        className,
      )}
    >
      {children}
    </div>
  )
}
