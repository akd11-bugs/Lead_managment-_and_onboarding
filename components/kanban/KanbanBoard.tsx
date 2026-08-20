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
import type { Lead, Stage } from '@/lib/types'
import { STAGES, STAGE_LABELS } from '@/lib/types'

interface KanbanBoardProps {
  initialLeads: Lead[]
}

export function KanbanBoard({ initialLeads }: KanbanBoardProps) {
  const router = useRouter()
  const [leads, setLeads] = useState<Lead[]>(initialLeads)
  const [activeLead, setActiveLead] = useState<Lead | null>(null)
  const [detailLead, setDetailLead] = useState<Lead | null>(null)

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

  async function handleDragEnd(e: DragEndEvent) {
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

    // Optimistic update
    const sourceStage = lead.stage as Stage
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, stage: targetStage } : l))
    )

    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ stage: targetStage }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Failed to move lead')
      }
      // Update lastActivityAt indirectly by adding an activity — the server
      // attributes it to the real logged-in user.
      await fetch('/api/activities', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          leadId,
          type: 'note',
          description: `Stage changed: ${STAGE_LABELS[sourceStage]} → ${STAGE_LABELS[targetStage]}`,
        }),
      })
      router.refresh()
    } catch {
      // Revert on failure
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, stage: sourceStage } : l))
      )
    }
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
        />
      )}
    </>
  )
}