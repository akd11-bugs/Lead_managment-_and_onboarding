'use client'

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
      <AlertBanner alerts={ALERTS} />
      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <CurrencyTile label="Open pipeline" value={383_000} hint="9 open leads" />
        <StatTile label="Total leads" value={11} hint="2 won · 0 lost" />
        <StatTile label="Won this month" value={2} hint="₹1.8L" trend={{ direction: 'up', text: 'up from last month' }} />
        <StatTile label="Conversion" value="18%" hint="2 / 11 won" />
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Pipeline by stage</CardTitle>
          </CardHeader>
          <CardContent>
            <GenericPipelineChart data={GENERIC_STAGE_DATA} />
          </CardContent>
        </Card>
        <ActivityFeedView items={ACTIVITY_DEMO} live={false} interactive={false} />
      </div>
      {!compact && (
        <>
          <div className="mt-3">
            <BDSummary data={BD} />
          </div>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <RepPerformance rows={REPS_DEMO} />
            <SourceROI rows={SOURCES_DEMO} />
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
        <div>
          <h3 className="text-lg font-semibold tracking-tight">Ardent Studio</h3>
          <p className="text-sm text-muted-foreground">Meera Raghavan · Referral</p>
        </div>
        <div className="flex gap-1.5">
          {['New', 'Pending', 'Proposal', 'Onboarding'].map((s, i) => (
            <div key={s} className="flex-1">
              <div className={`h-1.5 rounded-full ${i < 3 ? 'bg-blue-500' : 'bg-muted'}`} />
              <p className="mt-1.5 text-[11px] text-muted-foreground">{s}</p>
            </div>
          ))}
        </div>
        <ActivityFeedView items={ACTIVITY_DEMO.slice(0, 3)} live={false} interactive={false} />
      </div>
    </Frame>
  )
}

export function WhiteboardSurface() {
  const cols = [
    { label: 'NEW', n: 4, v: '₹96,000' },
    { label: 'PENDING', n: 3, v: '₹1.3L' },
    { label: 'PROPOSAL', n: 2, v: '₹1.6L' },
    { label: 'ONBOARDING', n: 2, v: '₹1.8L' },
  ]
  return (
    <Frame path="/whiteboard">
      <Card className="border-muted">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Funnel · live from your pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {cols.map((c, i) => (
              <div key={c.label} className="flex items-center gap-2">
                <div className="min-w-[88px] rounded-md border border-muted p-3 text-center">
                  <p className="text-[10px] tracking-wide text-muted-foreground">{c.label}</p>
                  <p className="mt-0.5 text-xl font-semibold tabular-nums">{c.n}</p>
                  <p className="text-[10px] text-muted-foreground">{c.v}</p>
                </div>
                {i < cols.length - 1 && <span className="text-muted-foreground">→</span>}
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Shared with your whole {BRAND_NAME} org. Cursors update live.
          </p>
        </CardContent>
      </Card>
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
  { id: 'dashboard', title: 'Your pipeline, at a glance.', render: () => <DashboardSurface /> },
  { id: 'pipeline', title: 'Stages that match how you sell.', render: () => <DraggablePipelineSurface /> },
  { id: 'lead', title: "Every lead's full story.", render: () => <LeadSurface /> },
  { id: 'whiteboard', title: 'A funnel your team can draw on.', render: () => <WhiteboardSurface /> },
]
