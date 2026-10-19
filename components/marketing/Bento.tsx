import { cn } from '@/lib/utils'

// Shared bento primitives for the marketing page: a grid of unequal cells,
// reused across Bridge, Agent native and Why it's free so the whole page
// reads as one consistent layout instead of three different list styles.
//
// Abutting cells, not gapped cards: zero gap between cells, each cell keeps
// its own full border, and adjacent 1px borders overlap into what reads as
// one shared grid line — the lattice look from the OMA Operator reference
// (full-width hairlines at every boundary), rather than independent
// floating cards with visible space between them. A negative margin on the
// outer grid compensates for the border each edge cell still draws, so the
// whole lattice lines up flush with the rest of the section's content
// instead of sitting 1px further in.

export function BentoGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    // ml-px/mt-px cancels the first row/column's own -ml-px/-mt-px (each
    // cell pulls left/up by 1px to merge borders with its neighbor), so the
    // grid's own outer edge lines up with the rest of the section instead
    // of sitting 1px further in/up than everything else on the page.
    <div className={cn('ml-px mt-px grid grid-cols-1 md:grid-cols-6', className)}>
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
        // -mt/-ml pull each cell's top/left border to overlap the
        // previous row/column's bottom/right border, so two adjacent 1px
        // hairlines read as one line instead of a visibly doubled edge.
        'border border-white/[0.09] bg-white/[0.03] p-7 -ml-px -mt-px transition-colors duration-300 hover:relative hover:z-10 hover:border-white/[0.16] hover:bg-white/[0.045]',
        spanClass,
        className,
      )}
    >
      {children}
    </div>
  )
}
