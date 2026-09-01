'use client'

import { useDroppable } from '@dnd-kit/core'
import { LeadCard } from './LeadCard'
import type { Lead, Stage } from '@/lib/types'
import { STAGE_LABELS, STAGE_DESCRIPTIONS } from '@/lib/types'
import { formatCurrency, cn } from '@/lib/utils'

interface KanbanColumnProps {
  stage: Stage
  leads: Lead[]
  onCardClick: (lead: Lead) => void
}

const STAGE_HEX: Record<Stage, string> = {
  new: '#64748b',
  pending: '#f59e0b',
  onboarding: '#10b981',
  not_interested: '#f43f5e',
}

export function KanbanColumn({ stage, leads, onCardClick }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${stage}`,
    data: { type: 'column', stage },
  })

  const totalValue = leads.reduce((sum, l) => sum + l.estimatedVolume, 0)

  // Sub-status breakdown, shown only on the Pending column — this is what
  // makes "pending and its sub-stages" legible on the board, since Pending
  // is a single column rather than three.
  const pendingBreakdown =
    stage === 'pending'
      ? ([
          ['pending_ours', 'Ours'],
          ['pending_merchant', 'Merchant'],
          ['pending_psp', 'PSP'],
        ] as const).map(([key, short]) => ({
          short,
          count: leads.filter((l) => (l.pendingSubStatus ?? 'pending_ours') === key).length,
        }))
      : null

  return (
    <div className="w-72 shrink-0">
      <div className="flex items-center justify-between gap-2 px-1 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="h-2 w-2 rounded-full shrink-0"
            style={{ backgroundColor: STAGE_HEX[stage] }}
          />
          <h3 className="text-sm font-semibold truncate">{STAGE_LABELS[stage]}</h3>
          <span className="text-xs text-muted-foreground">{leads.length}</span>
        </div>
        <span className="text-xs font-medium tabular-nums text-muted-foreground">
          {formatCurrency(totalValue)}
        </span>
      </div>
      <p className="px-1 mb-2 text-[11px] text-muted-foreground line-clamp-1">
        {STAGE_DESCRIPTIONS[stage]}
      </p>
      {pendingBreakdown && (
        <p className="px-1 mb-2 text-[11px] text-muted-foreground">
          {pendingBreakdown.map((b, i) => (
            <span key={b.short}>
              {i > 0 && ' · '}
              {b.count} {b.short}
            </span>
          ))}
        </p>
      )}
      <div
        ref={setNodeRef}
        className={cn(
          'space-y-2 rounded-lg border-2 border-dashed border-muted/50 bg-muted/20 p-2 min-h-[400px] transition-colors',
          isOver && 'border-blue-400 bg-blue-50/50'
        )}
      >
        {leads.length === 0 ? (
          <div className="rounded-md border border-dashed p-6 text-center text-xs text-muted-foreground">
            Drop leads here
          </div>
        ) : (
          leads.map((lead) => <LeadCard key={lead.id} lead={lead} onClick={onCardClick} />)
        )}
      </div>
    </div>
  )
}