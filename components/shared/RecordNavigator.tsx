import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft, ChevronUp, ChevronDown } from 'lucide-react'

// The Attio-style "1 of 34 in …" breadcrumb — back to the list, step through
// siblings in the same order the list itself used. Scoped to full-page
// records only (not the Kanban modal, which has no single well-defined list
// since cards are grouped by column) — see the record-page UI plan.
export function RecordNavigator({
  backHref,
  backLabel,
  prevHref,
  nextHref,
  index,
  total,
  listLabel,
}: {
  backHref: string
  backLabel: string
  prevHref: string | null
  nextHref: string | null
  index: number
  total: number
  listLabel: string
}) {
  return (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="icon" asChild>
        <Link href={backHref} aria-label={backLabel}>
          <ArrowLeft className="h-4 w-4" />
        </Link>
      </Button>
      <div className="flex items-center rounded-md border">
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-r-none" disabled={!prevHref} asChild={!!prevHref}>
          {prevHref ? (
            <Link href={prevHref} aria-label="Previous record">
              <ChevronUp className="h-3.5 w-3.5" />
            </Link>
          ) : (
            <ChevronUp className="h-3.5 w-3.5" />
          )}
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-l-none border-l" disabled={!nextHref} asChild={!!nextHref}>
          {nextHref ? (
            <Link href={nextHref} aria-label="Next record">
              <ChevronDown className="h-3.5 w-3.5" />
            </Link>
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>
      <span className="text-xs text-muted-foreground">
        {index} of {total} in {listLabel}
      </span>
    </div>
  )
}
