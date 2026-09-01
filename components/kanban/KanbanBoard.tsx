'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { KanbanColumn } from './KanbanColumn'
import { LeadCard } from './LeadCard'
import { LeadDetailDialog } from '@/components/leads/LeadDetailDialog'
import { StageChangeDialog, type StageChangeTarget } from '@/components/leads/StageChangeDialog'
import type { Lead, Stage } from '@/lib/types'
import { STAGES } from '@/lib/types'

interface KanbanBoardProps {
  initialLeads: Lead[]
}

export function KanbanBoard({ initialLeads }: KanbanBoardProps) {
  const router = useRouter()
  const [leads, setLeads] = useState<Lead[]>(initialLeads)
  const [activeLead, setActiveLead] = useState<Lead | null>(null)
  const [detailLead, setDetailLead] = useState<Lead | null>(null)
  const [stageChange, setStageChange] = useState<{ leadId: string; target: StageChangeTarget } | null>(null)

  function applyUpdatedLead(updated: Lead) {
    setLeads((prev) => prev.map((l) => (l.id === updated.id ? { ...l, ...updated } : l)))
    // Keeps other pages (Dashboard, Leads table) from serving a stale cached
    // view the next time they're navigated to — the board itself already
    // reflects the change via local state above, no reload needed here.
    router.refresh()
  }

  useEffect(() => {
    setLeads(initialLeads)
  }, [initialLeads])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const leadsByStage = useMemo(() => {
    const map = new Map<Stage, Lead[]>()
    for (const stage of STAGES) {
      map.set(stage, [])
    }
    for (const lead of leads) {
      const list = map.get(lead.stage as Stage)
      if (list) list.push(lead)
    }
    // Sort by position
    for (const list of map.values()) {
      list.sort((a, b) => a.position - b.position)
    }
    return map
  }, [leads])

  function handleDragStart(e: DragStartEvent) {
    const lead = leads.find((l) => l.id === e.active.id)
    if (lead) setActiveLead(lead)
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveLead(null)
    if (!e.over) return

    const leadId = e.active.id as string
    const overId = e.over.id as string
    const overData = e.over.data.current as { type?: string; stage?: Stage } | undefined

    // Dropping on the column's empty area gives us the stage directly.
    // Dropping on top of another card doesn't — resolve via that card's own stage.
    const targetStage =
      overData?.type === 'column' ? overData.stage : (leads.find((l) => l.id === overId)?.stage as Stage | undefined)

    if (!targetStage) return
    const lead = leads.find((l) => l.id === leadId)
    if (!lead || lead.stage === targetStage) return

    // No optimistic move and no direct PATCH here — a remark is required for
    // every stage change, so this just opens the same dialog the detail form
    // uses. The card only actually moves once that's confirmed (onDone).
    setStageChange({ leadId, target: { kind: 'stage', stage: targetStage } })
  }

  return (
    <>
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="kanban-scroll overflow-x-auto pb-4">
          <div className="flex gap-3 min-w-max">
            {STAGES.map((stage) => {
              const stageLeads = leadsByStage.get(stage) ?? []
              return (
                <SortableContext key={stage} items={stageLeads.map((l) => l.id)} strategy={verticalListSortingStrategy}>
                  <KanbanColumn stage={stage} leads={stageLeads} onCardClick={setDetailLead} />
                </SortableContext>
              )
            })}
          </div>
        </div>
        <DragOverlay>
          {activeLead ? (
            <div className="rotate-1 opacity-90">
              <LeadCard lead={activeLead} onClick={() => {}} isDragging />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {detailLead && (
        <LeadDetailDialog
          leadId={detailLead.id}
          open={!!detailLead}
          onOpenChange={(open) => !open && setDetailLead(null)}
          onLeadUpdated={applyUpdatedLead}
        />
      )}

      {stageChange && (
        <StageChangeDialog
          leadId={stageChange.leadId}
          open
          onOpenChange={(open) => !open && setStageChange(null)}
          target={stageChange.target}
          onDone={applyUpdatedLead}
        />
      )}
    </>
  )
}