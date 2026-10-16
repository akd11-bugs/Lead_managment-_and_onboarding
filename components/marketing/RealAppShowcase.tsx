'use client'

import { StatTile, CurrencyTile } from '@/components/dashboard/StatTile'
import { PipelineFunnel } from '@/components/dashboard/PipelineFunnel'
import { ActivityFeedView, type ActivityItem } from '@/components/dashboard/ActivityFeed'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BRAND_NAME } from '@/lib/branding'

// The product surfaces, rendered with the REAL dashboard components
// (StatTile, CurrencyTile, PipelineFunnel, ActivityFeedView) rather than
// hand-written lookalikes. A restyle of the product now shows up here
// automatically instead of drifting.
//
// Data is fixed and fictional: these render on a public page with no session
// and no database. Every name is invented — none is a real customer.

const ACTIVITY: ActivityItem[] = [
  { id: 'a1', type: 'call', description: 'Asked for a revised quote by Friday', date: new Date(Date.now() - 2 * 864e5).toISOString(), authorName: 'Priya', leadName: 'Ardent Studio', leadId: 'demo' },
  { id: 'a2', type: 'email', description: 'Proposal sent (PDF)', date: new Date(Date.now() - 4 * 864e5).toISOString(), authorName: 'Arjun', leadName: 'Northwind Traders', leadId: 'demo' },
  { id: 'a3', type: 'meeting', description: 'Budget approved, moving to onboarding', date: new Date(Date.now() - 6 * 864e5).toISOString(), authorName: 'Sam', leadName: 'Cedarline Supply', leadId: 'demo' },
  { id: 'a4', type: 'note', description: 'Prefers a call before 6pm', date: new Date(Date.now() - 7 * 864e5).toISOString(), authorName: 'Priya', leadName: 'Lumen Retail Co', leadId: 'demo' },
]

// PipelineFunnel renders every BOARD_COLUMN, so each needs a figure or the
// chart shows empty bars at zero.
export const FUNNEL_DATA = [
  { stage: 'new', count: 4, value: 96_000 },
  { stage: 'pending_ours', count: 3, value: 130_000 },
  { stage: 'pending_merchant', count: 2, value: 74_000 },
  { stage: 'pending_psp', count: 1, value: 38_000 },
  { stage: 'proposal', count: 2, value: 160_000 },
  { stage: 'onboarding', count: 2, value: 180_000 },
  { stage: 'not_interested', count: 1, value: 22_000 },
]

/** Chrome that frames a surface as a browser window, as in the product. */
export function Frame({ path, children }: { path: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.09] bg-[#0b0d14] shadow-2xl shadow-black/40">
      <div className="flex items-center gap-2 border-b border-white/[0.07] px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
        <span className="ml-2 font-mono text-[11px] text-white/35">{path}</span>
      </div>
      {/* The product's own light surface, sitting inside the dark page. */}
      <div className="bg-background p-5 text-foreground">{children}</div>
    </div>
  )
}

export function DashboardSurface() {
  return (
    <Frame path="/dashboard">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <CurrencyTile label="Open pipeline" value={383_000} hint="9 open leads" />
        <StatTile label="Total leads" value={11} hint="2 won · 0 lost" />
        <StatTile label="Won this month" value={2} hint="₹1.8L" trend={{ direction: 'up', text: 'up from last month' }} />
        <StatTile label="Conversion" value="18%" hint="2 / 11 won" />
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <PipelineFunnel data={FUNNEL_DATA} />
        <ActivityFeedView items={ACTIVITY} live={false} interactive={false} />
      </div>
    </Frame>
  )
}

export function PipelineSurface() {
  const columns = [
    { label: 'New', leads: [{ name: 'Downbeat Organics', value: '₹58,000', tone: 'outline' as const, badge: 'New' }] },
    { label: 'Pending', leads: [
      { name: 'Northwind Traders', value: '₹92,000', tone: 'secondary' as const, badge: 'Pending' },
      { name: 'TechFlow Solutions', value: '₹43,000', tone: 'secondary' as const, badge: 'Pending' },
    ] },
    { label: 'Proposal', leads: [
      { name: 'Cedarline Supply', value: '₹64,000', tone: 'default' as const, badge: 'Proposal' },
      { name: 'Lumen Retail Co', value: '₹77,000', tone: 'default' as const, badge: 'Proposal' },
    ] },
    { label: 'Onboarding', leads: [{ name: 'Ardent Studio', value: '₹1,12,000', tone: 'default' as const, badge: 'Onboarding' }] },
  ]
  return (
    <Frame path="/pipeline">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {columns.map(col => (
          <div key={col.label} className="min-w-0">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">{col.label}</span>
              <span className="text-xs tabular-nums text-muted-foreground">{col.leads.length}</span>
            </div>
            <div className="space-y-2">
              {col.leads.map(l => (
                <Card key={l.name} className="border-muted">
                  <CardContent className="p-3">
                    <p className="truncate text-sm font-medium">{l.name}</p>
                    <div className="mt-1.5 flex items-center justify-between gap-2">
                      <span className="text-xs tabular-nums text-muted-foreground">{l.value}</span>
                      <Badge variant={l.tone} className="shrink-0 text-[10px]">{l.badge}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
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
        <ActivityFeedView items={ACTIVITY.slice(0, 3)} live={false} interactive={false} />
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

export const SURFACES = [
  { id: 'dashboard', title: 'Your pipeline, at a glance.', render: () => <DashboardSurface /> },
  { id: 'pipeline', title: 'Stages that match how you sell.', render: () => <PipelineSurface /> },
  { id: 'lead', title: "Every lead's full story.", render: () => <LeadSurface /> },
  { id: 'whiteboard', title: 'A funnel your team can draw on.', render: () => <WhiteboardSurface /> },
]
