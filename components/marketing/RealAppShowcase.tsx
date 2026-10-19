'use client'

import { useEffect, useRef, useState } from 'react'
import { StatTile, CurrencyTile } from '@/components/dashboard/StatTile'
import { ActivityFeedView, type ActivityItem } from '@/components/dashboard/ActivityFeed'
import { AlertBanner } from '@/components/dashboard/AlertBanner'
import { RepPerformance, type RepPerformanceRow } from '@/components/dashboard/RepPerformance'
import { SourceROI, type SourceROIRow } from '@/components/dashboard/SourceROI'
import { BDSummary, type BDSummaryData } from '@/components/dashboard/BDSummary'
import { GettingStartedCard } from '@/components/dashboard/GettingStartedCard'
import { DataTable } from '@/components/shared/DataTable'
import { getCompanyColumns, type CompanyRow } from '@/lib/tableColumns'
import { CalendarMonth, type CalendarDay } from '@/components/calendar/CalendarMonth'
import { AuditLogTable, type AuditLogRow } from '@/components/settings/AuditLogTable'
import type { Alert } from '@/lib/alerts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BRAND_NAME } from '@/lib/branding'
import { Frame } from './Frame'
import { DraggablePipelineSurface } from './DraggablePipelineSurface'
import { GenericPipelineChart } from './GenericPipelineChart'
import { Reveal } from './Reveal'

// The product surfaces, rendered with the REAL dashboard components
// (StatTile, CurrencyTile, ActivityFeedView) rather than hand-written
// lookalikes. A restyle of the product now shows up here automatically
// instead of drifting. The one exception is the pipeline chart: the real
// PipelineFunnel always renders the product's fintech-only pending
// sub-stages (our side / merchant / PSP), so every pipeline chart on this
// page uses GenericPipelineChart instead, off the generic Stage enum.
//
// Data is fixed and fictional: these render on a public page with no session
// and no database. Every name is invented — none is a real customer.

export const ACTIVITY_DEMO: ActivityItem[] = [
  { id: 'a1', type: 'call', description: 'Asked for a revised quote by Friday', date: new Date(Date.now() - 2 * 864e5).toISOString(), authorName: 'Priya', leadName: 'Ardent Studio', leadId: 'demo' },
  { id: 'a2', type: 'email', description: 'Proposal sent (PDF)', date: new Date(Date.now() - 4 * 864e5).toISOString(), authorName: 'Arjun', leadName: 'Northwind Traders', leadId: 'demo' },
  { id: 'a3', type: 'meeting', description: 'Budget approved, moving to onboarding', date: new Date(Date.now() - 6 * 864e5).toISOString(), authorName: 'Sam', leadName: 'Cedarline Supply', leadId: 'demo' },
  { id: 'a4', type: 'note', description: 'Prefers a call before 6pm', date: new Date(Date.now() - 7 * 864e5).toISOString(), authorName: 'Priya', leadName: 'Lumen Retail Co', leadId: 'demo' },
]

// Generic, industry-agnostic stage data for GenericPipelineChart — the real
// top-level Stage enum, not the fintech-only pending sub-statuses above.
export const GENERIC_STAGE_DATA = [
  { stage: 'new' as const, count: 5, value: 112_000 },
  { stage: 'pending' as const, count: 4, value: 148_000 },
  { stage: 'proposal' as const, count: 2, value: 160_000 },
  { stage: 'onboarding' as const, count: 2, value: 180_000 },
  { stage: 'not_interested' as const, count: 1, value: 22_000 },
]

const ALERTS: Alert[] = [
  { skillId: 'pipeline-hygiene-audit', skillName: 'Pipeline hygiene audit', reason: '3 leads have had no activity for 21 days', metric: '3 stale', severity: 'medium' },
  { skillId: 'follow-up-cadence', skillName: 'Follow-up cadence', reason: 'Two proposals are past their promised reply date', metric: '2 overdue', severity: 'high' },
]

export const REPS_DEMO: RepPerformanceRow[] = [
  { ownerName: 'Priya', openValue: 186_000, totalLeads: 5, winRate: 40 },
  { ownerName: 'Arjun', openValue: 122_000, totalLeads: 4, winRate: 25 },
  { ownerName: 'Sam', openValue: 75_000, totalLeads: 2, winRate: -1 },
]

export const SOURCES_DEMO: SourceROIRow[] = [
  { source: 'referral', value: 164_000, count: 4, winRate: 50 },
  { source: 'website', value: 118_000, count: 3, winRate: 33 },
  { source: 'linkedin', value: 64_000, count: 2, winRate: -1 },
  { source: 'event', value: 37_000, count: 2, winRate: 0 },
]

export const COMPANIES_DEMO: CompanyRow[] = [
  { id: 'c1', name: 'Ardent Studio', industry: 'Fashion', businessType: null, website: 'ardent.studio', createdAt: new Date(Date.now() - 12 * 864e5), _count: { leads: 2, people: 3 } },
  { id: 'c2', name: 'Northwind Traders', industry: 'F&B', businessType: null, website: 'northwind.com', createdAt: new Date(Date.now() - 20 * 864e5), _count: { leads: 1, people: 2 } },
  { id: 'c3', name: 'Cedarline Supply', industry: 'Wholesale', businessType: null, website: null, createdAt: new Date(Date.now() - 30 * 864e5), _count: { leads: 1, people: 1 } },
]

export const CALENDAR_DEMO: CalendarDay[] = (() => {
  const today = new Date()
  const days: CalendarDay[] = []
  for (let i = -2; i <= 4; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() + i)
    const isToday = i === 0
    days.push({
      date: d.toISOString().slice(0, 10),
      label: String(d.getDate()),
      isCurrentMonth: true,
      isToday,
      tasks: isToday
        ? [{ id: 't1', title: 'Call Ardent Studio', done: false, leadId: null, leadCompany: 'Ardent Studio' }]
        : i === 2
          ? [{ id: 't2', title: 'Send proposal', done: false, leadId: null, leadCompany: 'Northwind Traders' }]
          : [],
    })
  }
  return days
})()

export const AUDIT_DEMO: AuditLogRow[] = [
  { id: 'l1', createdAt: new Date(Date.now() - 1 * 3600e3), action: 'login_success', actorName: 'Priya', targetLabel: null },
  { id: 'l2', createdAt: new Date(Date.now() - 5 * 3600e3), action: 'invite_redeemed', actorName: 'Arjun', targetLabel: null },
  { id: 'l3', createdAt: new Date(Date.now() - 26 * 3600e3), action: 'user_role_changed', actorName: 'You', targetLabel: 'Priya' },
]

const BD: BDSummaryData = {
  partnersOnboarded: 2,
  merchantsOnboarded: 4,
  expectedCount: 3,
  expectedVolume: 240_000,
  byOwner: [
    { ownerName: 'Priya', partnersOnboarded: 1, merchantsOnboarded: 3, expectedCount: 2, expectedVolume: 160_000 },
    { ownerName: 'Arjun', partnersOnboarded: 1, merchantsOnboarded: 1, expectedCount: 1, expectedVolume: 80_000 },
  ],
}

// The whole dashboard, in the order app/page.tsx renders it: alerts, tiles,
// funnel + activity, then the BD/rep/source panels. Every one of these is
// the component the product uses, not a drawing of it — except the funnel:
// PipelineFunnel always renders the product's fintech-only pending
// sub-stages (our side / merchant / PSP), which don't belong on a public
// page pitching this to any industry, so this uses the generic Stage chart
// instead (same one as the "Run your pipeline" onboarding step).
export function DashboardSurface({ compact = false }: { compact?: boolean }) {
  return (
    <Frame path="/dashboard">
      <Reveal y={12} force>
        <AlertBanner alerts={ALERTS} />
      </Reveal>
      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          <CurrencyTile key="open" label="Open pipeline" value={383_000} hint="9 open leads" />,
          <StatTile key="total" label="Total leads" value={11} hint="2 won · 0 lost" />,
          <StatTile key="won" label="Won this month" value={2} hint="₹1.8L" trend={{ direction: 'up', text: 'up from last month' }} />,
          <StatTile key="conv" label="Conversion" value="18%" hint="2 / 11 won" />,
        ].map((tile, i) => (
          <Reveal key={tile.key} delay={0.05 + i * 0.05} y={12} force>
            {tile}
          </Reveal>
        ))}
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <Reveal delay={0.25} y={16} force>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Pipeline by stage</CardTitle>
            </CardHeader>
            <CardContent>
              <GenericPipelineChart data={GENERIC_STAGE_DATA} />
            </CardContent>
          </Card>
        </Reveal>
        <Reveal delay={0.3} y={16} force>
          <ActivityFeedView items={ACTIVITY_DEMO} live={false} interactive={false} />
        </Reveal>
      </div>
      {!compact && (
        <>
          <Reveal delay={0.35} y={16} className="mt-3" force>
            <BDSummary data={BD} />
          </Reveal>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <Reveal delay={0.4} y={16} force>
              <RepPerformance rows={REPS_DEMO} />
            </Reveal>
            <Reveal delay={0.4} y={16} force>
              <SourceROI rows={SOURCES_DEMO} />
            </Reveal>
          </div>
        </>
      )}
    </Frame>
  )
}

export function LeadSurface() {
  return (
    <Frame path="/leads/ardent-studio">
      <div className="space-y-4">
        <Reveal y={12} force>
          <h3 className="text-lg font-semibold tracking-tight">Ardent Studio</h3>
          <p className="text-sm text-muted-foreground">Meera Raghavan · Referral</p>
        </Reveal>
        <div className="flex gap-1.5">
          {['New', 'Pending', 'Proposal', 'Onboarding'].map((s, i) => (
            <Reveal key={s} delay={0.1 + i * 0.06} y={10} className="flex-1" force>
              <div className={`h-1.5 rounded-full ${i < 3 ? 'bg-blue-500' : 'bg-muted'}`} />
              <p className="mt-1.5 text-[11px] text-muted-foreground">{s}</p>
            </Reveal>
          ))}
        </div>
        <Reveal delay={0.35} y={14} force>
          <ActivityFeedView items={ACTIVITY_DEMO.slice(0, 3)} live={false} interactive={false} />
        </Reveal>
      </div>
    </Frame>
  )
}

// A real draggable whiteboard, not a diagram of one — same spirit as
// DraggablePipelineSurface. No pipeline funnel sits on it by default (the
// real /whiteboard page doesn't seed one either, see
// app/api/whiteboard/elements/route.ts): just sticky notes, a loose
// connector and a scribble, scattered the way an actual working board
// looks, not a tidy auto-generated layout. State is local to this demo —
// nothing persists or touches the real whiteboard API.
const NOTE_TONE: Record<string, string> = {
  yellow: 'bg-amber-200 text-amber-950 border-amber-400',
  pink: 'bg-pink-200 text-pink-950 border-pink-400',
  green: 'bg-emerald-200 text-emerald-950 border-emerald-400',
  blue: 'bg-sky-200 text-sky-950 border-sky-400',
}

interface DemoNote {
  id: string
  x: number
  y: number
  rotate: number
  tone: keyof typeof NOTE_TONE
  text: string
  by?: string
  byColor?: string
}

const INITIAL_NOTES: DemoNote[] = [
  { id: 'n1', x: 24, y: 28, rotate: -4, tone: 'yellow', text: 'Call back Ardent Studio Thu', by: 'Priya', byColor: '#2fcf7a' },
  { id: 'n2', x: 168, y: 10, rotate: 3, tone: 'pink', text: 'Ask about budget sign-off' },
  { id: 'n3', x: 108, y: 118, rotate: -2, tone: 'green', text: 'Send updated proposal', by: 'Arjun', byColor: '#f0ff3d' },
  { id: 'n4', x: 256, y: 96, rotate: 5, tone: 'blue', text: "Loop in their ops lead" },
]

export function WhiteboardSurface() {
  const [notes, setNotes] = useState<DemoNote[]>(INITIAL_NOTES)
  const dragRef = useRef<{ id: string; dx: number; dy: number } | null>(null)
  const boardRef = useRef<HTMLDivElement>(null)
  // Notes drop onto the board one at a time as it scrolls into view, rather
  // than all appearing at once — matches the piece-by-piece reveal used
  // elsewhere in this tour (KPI tiles, kanban cards).
  const [revealedCount, setRevealedCount] = useState(0)

  useEffect(() => {
    const el = boardRef.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setRevealedCount(INITIAL_NOTES.length)
      return
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          io.disconnect()
          INITIAL_NOTES.forEach((_, i) => {
            setTimeout(() => setRevealedCount((c) => Math.max(c, i + 1)), i * 140)
          })
        }
      },
      { rootMargin: '-80px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  function onPointerDown(e: React.PointerEvent, note: DemoNote) {
    const board = boardRef.current?.getBoundingClientRect()
    if (!board) return
    dragRef.current = { id: note.id, dx: e.clientX - board.left - note.x, dy: e.clientY - board.top - note.y }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  function onPointerMove(e: React.PointerEvent) {
    const drag = dragRef.current
    const board = boardRef.current?.getBoundingClientRect()
    if (!drag || !board) return
    const x = e.clientX - board.left - drag.dx
    const y = e.clientY - board.top - drag.dy
    setNotes((ns) => ns.map((n) => (n.id === drag.id ? { ...n, x, y } : n)))
  }

  function onPointerUp() {
    dragRef.current = null
  }

  function addNote() {
    const id = `n${Date.now()}`
    const tones = Object.keys(NOTE_TONE) as (keyof typeof NOTE_TONE)[]
    setNotes((ns) => [
      ...ns,
      {
        id,
        x: 40 + Math.random() * 220,
        y: 20 + Math.random() * 100,
        rotate: Math.random() * 8 - 4,
        tone: tones[Math.floor(Math.random() * tones.length)],
        text: 'New note',
      },
    ])
  }

  return (
    <Frame path="/whiteboard">
      <div
        ref={boardRef}
        className="relative h-[260px] overflow-hidden rounded-md bg-[radial-gradient(circle,hsl(var(--border))_1px,transparent_1px)] [background-size:20px_20px]"
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        {/* Loose hand-drawn connector — a wandering path, not a straight arrow. */}
        <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
          <path
            d="M 90 70 C 140 40, 150 110, 200 90 S 250 60, 290 110"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            className="text-foreground/25"
          />
          {/* Scribble accent. */}
          <path
            d="M 300 150 c 6 -10 14 -10 18 0 s 12 10 18 0 s 12 -10 18 0"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            className="text-foreground/20"
          />
        </svg>

        {notes.map((note, i) => (
          <div
            key={note.id}
            className={`absolute w-[120px] cursor-grab select-none rounded-sm border px-2.5 py-2 text-[11px] font-medium leading-snug shadow-md transition-[opacity,transform] duration-500 ease-out active:cursor-grabbing ${NOTE_TONE[note.tone]} ${
              i < INITIAL_NOTES.length && i >= revealedCount ? 'pointer-events-none opacity-0' : 'opacity-100'
            }`}
            style={{
              left: note.x,
              top: note.y,
              transitionDelay: `${i * 140}ms`,
              transform:
                i < INITIAL_NOTES.length && i >= revealedCount
                  ? `rotate(${note.rotate}deg) scale(0.85) translateY(10px)`
                  : `rotate(${note.rotate}deg)`,
            }}
            onPointerDown={(e) => onPointerDown(e, note)}
          >
            {note.by && (
              <span
                className="absolute -top-2 right-1.5 rounded px-1 py-0.5 text-[8px] font-semibold text-white shadow-sm"
                style={{ background: note.byColor }}
              >
                {note.by}
              </span>
            )}
            {note.text}
          </div>
        ))}

        <button
          type="button"
          onClick={addNote}
          className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full border bg-background px-3 py-1.5 text-[11px] font-medium shadow-sm transition-colors hover:bg-accent"
        >
          + Sticky note
        </button>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Drag the notes around. Shared with your whole {BRAND_NAME} org on the real board — cursors update live.
      </p>
    </Frame>
  )
}

export function CompaniesSurface() {
  return (
    <Frame path="/companies">
      <DataTable
        tableId="marketing-companies"
        rows={COMPANIES_DEMO}
        rowKey={(c) => c.id}
        rowHref={() => '/signup'}
        allColumns={getCompanyColumns()}
        visibleColumnKeys={['name', 'industry', 'website', 'leadsCount', 'peopleCount', 'createdAt']}
        calculations={{}}
        onColumnsChange={() => {}}
        onCalculationsChange={() => {}}
      />
    </Frame>
  )
}

export function CalendarSurface() {
  return (
    <Frame path="/calendar">
      <CalendarMonth days={CALENDAR_DEMO} />
    </Frame>
  )
}

export function AuditLogSurface() {
  return (
    <Frame path="/settings/audit-log">
      <AuditLogTable rows={AUDIT_DEMO} />
    </Frame>
  )
}

export const SURFACES = [
  // compact={true} stops after the KPI tiles + "Pipeline by stage" chart —
  // the content this rail item is actually named after — rather than
  // running on through BD Summary/Rep/Source, which made this panel much
  // taller than the other three and pushed the page into a lot of
  // otherwise-empty scroll distance for no extra value.
  { id: 'dashboard', label: 'Pipeline by stage', title: 'Pipeline by stage.', render: () => <DashboardSurface compact /> },
  { id: 'pipeline', label: 'Match how you sell', title: 'Stages that match how you sell.', render: () => <DraggablePipelineSurface /> },
  { id: 'lead', label: "Every lead's story", title: "Every lead's full story.", render: () => <LeadSurface /> },
  { id: 'whiteboard', label: 'Draw it out', title: 'A funnel your team can draw on.', render: () => <WhiteboardSurface /> },
]
