'use client'

import { useState } from 'react'
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  closestCenter,
  type DragEndEvent,
} from '@dnd-kit/core'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Frame } from './Frame'

// A real drag-and-drop demo of the Kanban board, not a static mockup —
// built with the same @dnd-kit primitives the product's own KanbanBoard
// uses, just without the fetch-on-drop (there's no lead to update here).
// Only New / Pending / Proposal are draggable, per the brief; Onboarding
// is the resting place and stays fixed so the demo has a destination.

type DealTone = 'outline' | 'secondary' | 'default'

interface Deal {
  id: string
  name: string
  value: string
  tone: DealTone
}

type ColumnKey = 'new' | 'pending' | 'proposal' | 'onboarding'

const COLUMN_LABELS: Record<ColumnKey, string> = {
  new: 'New',
  pending: 'Pending',
  proposal: 'Proposal',
  onboarding: 'Onboarding',
}

const DRAGGABLE_COLUMNS: ColumnKey[] = ['new', 'pending', 'proposal']
const ALL_COLUMNS: ColumnKey[] = ['new', 'pending', 'proposal', 'onboarding']

const INITIAL: Record<ColumnKey, Deal[]> = {
  new: [{ id: 'd1', name: 'Downbeat Organics', value: '₹58,000', tone: 'outline' }],
  pending: [
    { id: 'd2', name: 'Northwind Traders', value: '₹92,000', tone: 'secondary' },
    { id: 'd3', name: 'TechFlow Solutions', value: '₹43,000', tone: 'secondary' },
  ],
  proposal: [
    { id: 'd4', name: 'Cedarline Supply', value: '₹64,000', tone: 'default' },
    { id: 'd5', name: 'Lumen Retail Co', value: '₹77,000', tone: 'default' },
  ],
  onboarding: [{ id: 'd6', name: 'Ardent Studio', value: '₹1,12,000', tone: 'default' }],
}

export function DraggablePipelineSurface() {
  const [columns, setColumns] = useState(INITIAL)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  function findColumn(dealId: string): ColumnKey | undefined {
    return ALL_COLUMNS.find((c) => columns[c].some((d) => d.id === dealId))
  }

  function handleDragEnd(e: DragEndEvent) {
    if (!e.over) return
    const dealId = e.active.id as string
    const from = findColumn(dealId)
    const to = e.over.id as ColumnKey
    if (!from || from === to || !DRAGGABLE_COLUMNS.includes(from)) return

    setColumns((prev) => {
      const deal = prev[from].find((d) => d.id === dealId)
      if (!deal) return prev
      return {
        ...prev,
        [from]: prev[from].filter((d) => d.id !== dealId),
        [to]: [...prev[to], deal],
      }
    })
  }

  return (
    <Frame path="/pipeline">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {ALL_COLUMNS.map((col) => (
            <Column key={col} id={col} label={COLUMN_LABELS[col]} deals={columns[col]} draggable={DRAGGABLE_COLUMNS.includes(col)} />
          ))}
        </div>
      </DndContext>
      <p className="mt-3 text-center text-[11px] text-muted-foreground">
        Try it: drag a deal between New, Pending and Proposal.
      </p>
    </Frame>
  )
}

function Column({ id, label, deals, draggable }: { id: ColumnKey; label: string; deals: Deal[]; draggable: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div ref={setNodeRef} className={cn('min-w-0 rounded-md p-1 transition-colors', isOver && 'bg-accent/50')}>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className="text-xs tabular-nums text-muted-foreground">{deals.length}</span>
      </div>
      <div className="space-y-2">
        {deals.map((d) => (
          <DealCard key={d.id} deal={d} label={label} draggable={draggable} />
        ))}
      </div>
    </div>
  )
}

function DealCard({ deal, label, draggable }: { deal: Deal; label: string; draggable: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: deal.id, disabled: !draggable })
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 20 }
    : undefined

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...(draggable ? { ...attributes, ...listeners } : {})}
      className={cn('border-muted', draggable && 'cursor-grab touch-none active:cursor-grabbing', isDragging && 'opacity-50 shadow-lg')}
    >
      <CardContent className="p-3">
        <p className="truncate text-sm font-medium">{deal.name}</p>
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <span className="text-xs tabular-nums text-muted-foreground">{deal.value}</span>
          <Badge variant={deal.tone} className="shrink-0 text-[10px]">{label}</Badge>
        </div>
      </CardContent>
    </Card>
  )
}
