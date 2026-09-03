'use client'

import { useDroppable } from '@dnd-kit/core'
import { LeadCard } from './LeadCard'
import type { Lead, BoardColumnKey } from '@/lib/types'
import { BOARD_COLUMN_LABELS, BOARD_COLUMN_DESCRIPTIONS } from '@/lib/types'
import { formatCurrency, cn } from '@/lib/utils'

interface KanbanColumnProps {
  columnKey: BoardColumnKey
  leads: Lead[]
  onCardClick: (lead: Lead) => void
}

const BOARD_COLUMN_HEX: Record<BoardColumnKey, string> = {
  new: '#64748b',
  pending_ours: '#f59e0b',
  pending_merchant: '#f97316',
  pending_psp: '#eab308',
  proposal: '#8b5cf6',
  onboarding: '#10b981',
  not_interested: '#f43f5e',
}

export function KanbanColumn({ columnKey, leads, onCardClick }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${columnKey}`,
    data: { type: 'column', columnKey },
  })

  const totalValue = leads.reduce((sum, l) => sum + l.estimatedVolume, 0)

  return (
    <div className="w-72 shrink-0">
      <div className="flex items-center justify-between gap-2 px-1 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="h-2 w-2 rounded-full shrink-0"
            style={{ backgroundColor: BOARD_COLUMN_HEX[columnKey] }}
          />
          <h3 className="text-sm font-semibold truncate">{BOARD_COLUMN_LABELS[columnKey]}</h3>
          <span className="text-xs text-muted-foreground">{leads.length}</span>
        </div>
        <span className="text-xs font-medium tabular-nums text-muted-foreground">
          {formatCurrency(totalValue)}
        </span>
      </div>
      <p className="px-1 mb-2 text-[11px] text-muted-foreground line-clamp-1">
        {BOARD_COLUMN_DESCRIPTIONS[columnKey]}
      </p>
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
