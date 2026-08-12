'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Lead } from '@/lib/types'
import { SOURCE_LABELS } from '@/lib/types'
import { formatCurrency, formatRelative, cn } from '@/lib/utils'
import { AlertCircle } from 'lucide-react'

interface LeadCardProps {
  lead: Lead
  onClick: (lead: Lead) => void
  isDragging?: boolean
}

export function LeadCard({ lead, onClick, isDragging }: LeadCardProps) {
  const sortable = useSortable({ id: lead.id })
  const style = isDragging
    ? { opacity: 1 }
    : {
        transform: CSS.Transform.toString(sortable.transform),
        transition: sortable.transition,
      }

  const daysSinceActivity = lead.lastActivityAt
    ? Math.floor((Date.now() - new Date(lead.lastActivityAt).getTime()) / 86400000)
    : 999

  const isStale = daysSinceActivity > 21 && lead.stage !== 'onboarding' && lead.stage !== 'lost'

  return (
    <div
      ref={isDragging ? undefined : sortable.setNodeRef}
      style={style}
      {...(isDragging ? {} : sortable.attributes)}
      {...(isDragging ? {} : sortable.listeners)}
      className={cn(
        'group rounded-md border bg-card shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-pointer touch-none',
        sortable.isDragging && 'opacity-50'
      )}
      onClick={() => !isDragging && onClick(lead)}
    >
      <div className="flex items-start gap-2 p-2.5">
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium leading-tight truncate">{lead.company}</p>
            <p className="text-xs font-semibold tabular-nums text-muted-foreground shrink-0">
              {formatCurrency(lead.estimatedVolume)}
            </p>
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {lead.industry || 'Industry not set'}
            {lead.poc && <span> · {lead.poc}</span>}
          </p>
          <div className="mt-2 flex items-center gap-1.5 flex-wrap">
            <span className="inline-flex items-center rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium">
              {SOURCE_LABELS[lead.source as keyof typeof SOURCE_LABELS] ?? lead.source}
            </span>
            <span className={cn('inline-flex items-center gap-1 text-[10px]', isStale ? 'text-amber-600' : 'text-muted-foreground')}>
              {isStale && <AlertCircle className="h-3 w-3" />}
              {lead.lastActivityAt ? formatRelative(lead.lastActivityAt) : 'no activity'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}