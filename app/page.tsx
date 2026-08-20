import { prisma } from '@/lib/db'
import { computeAlerts } from '@/lib/alerts'
import { StatTile, CurrencyTile } from '@/components/dashboard/StatTile'
import { AlertBanner } from '@/components/dashboard/AlertBanner'
import { ActivityFeed } from '@/components/dashboard/ActivityFeed'
import { PipelineFunnel } from '@/components/dashboard/PipelineFunnel'
import { RepPerformance, type RepPerformanceRow } from '@/components/dashboard/RepPerformance'
import { SourceROI, type SourceROIRow } from '@/components/dashboard/SourceROI'
import { BDSummary, type BDSummaryData } from '@/components/dashboard/BDSummary'
import { Users, DollarSign, Target, TrendingUp, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import type { LeadSource } from '@/lib/types'
import { redirect } from 'next/navigation'
import { requireUser, leadScope, isOperations } from '@/lib/session'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const user = await requireUser()
  if (isOperations(user)) redirect('/onboarding')
  const leads = await prisma.lead.findMany({
    where: leadScope(user),
    orderBy: { updatedAt: 'desc' },
  })

  const alerts = computeAlerts(leads as any)

  const totalLeads = leads.length
  const wonThisMonth = leads.filter((l) => {
    if (l.stage !== 'onboarding') return false
    const d = new Date(l.updatedAt)
    const now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })
  const openPipelineValue = leads
    .filter((l) => l.stage !== 'onboarding' && l.stage !== 'lost')
    .reduce((sum, l) => sum + l.estimatedVolume, 0)
  const wonValueThisMonth = wonThisMonth.reduce((sum, l) => sum + l.estimatedVolume, 0)
  const closedWon = leads.filter((l) => l.stage === 'onboarding').length
  const closedLost = leads.filter((l) => l.stage === 'lost').length
  // Counts as soon as sales marks a lead won (stage === 'onboarding'), not
  // only once ops finishes the sub-pipeline and onboardedAt is set.
  const conversionRate = totalLeads > 0 ? Math.round((closedWon / totalLeads) * 100) : 0

  // Pipeline by stage
  const byStage = new Map<string, { count: number; value: number }>()
  for (const lead of leads) {
    const cur = byStage.get(lead.stage) ?? { count: 0, value: 0 }
    cur.count++
    cur.value += lead.estimatedVolume
    byStage.set(lead.stage, cur)
  }
  const funnelData = Array.from(byStage.entries()).map(([stage, d]) => ({
    stage: stage as any,
    count: d.count,
    value: d.value,
  }))

  // Rep performance — open pipeline value + win rate per owner
  const byOwner = new Map<string, { openValue: number; totalLeads: number; won: number; lost: number }>()
  for (const lead of leads) {
    const cur = byOwner.get(lead.ownerName) ?? { openValue: 0, totalLeads: 0, won: 0, lost: 0 }
    cur.totalLeads++
    if (lead.stage !== 'onboarding' && lead.stage !== 'lost') cur.openValue += lead.estimatedVolume
    if (lead.stage === 'onboarding') cur.won++
    if (lead.stage === 'lost') cur.lost++
    byOwner.set(lead.ownerName, cur)
  }
  const repPerformance: RepPerformanceRow[] = Array.from(byOwner.entries())
    .map(([ownerName, d]) => ({
      ownerName,
      openValue: d.openValue,
      totalLeads: d.totalLeads,
      winRate: d.won + d.lost > 0 ? Math.round((d.won / (d.won + d.lost)) * 100) : -1,
    }))
    .sort((a, b) => b.openValue - a.openValue)

  // Source ROI — total value + win rate per lead source
  const bySource = new Map<LeadSource, { value: number; count: number; won: number; lost: number }>()
  for (const lead of leads) {
    const source = lead.source as LeadSource
    const cur = bySource.get(source) ?? { value: 0, count: 0, won: 0, lost: 0 }
    cur.value += lead.estimatedVolume
    cur.count++
    if (lead.stage === 'onboarding') cur.won++
    if (lead.stage === 'lost') cur.lost++
    bySource.set(source, cur)
  }
  const sourceROI: SourceROIRow[] = Array.from(bySource.entries())
    .map(([source, d]) => ({
      source,
      value: d.value,
      count: d.count,
      winRate: d.won + d.lost > 0 ? Math.round((d.won / (d.won + d.lost)) * 100) : -1,
    }))
    .sort((a, b) => b.value - a.value)

  // BD summary — partners/merchants onboarded this month, and what's forecast
  // to close by month end. Mirrors the manual WhatsApp BD report format.
  const today = new Date()
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999)
  const inCurrentMonth = (d: Date | null) => !!d && d >= monthStart && d <= monthEnd

  function bdMetricsFor(rows: typeof leads) {
    const partnersOnboarded = rows.filter((l) => l.type === 'partner' && inCurrentMonth(l.onboardedAt)).length
    const merchantsOnboarded = rows.filter((l) => l.type === 'merchant' && inCurrentMonth(l.onboardedAt)).length
    const expected = rows.filter((l) => !l.onboardedAt && inCurrentMonth(l.expectedCloseDate))
    return {
      partnersOnboarded,
      merchantsOnboarded,
      expectedCount: expected.length,
      expectedVolume: expected.reduce((sum, l) => sum + l.estimatedVolume, 0),
    }
  }

  const bdSummary: BDSummaryData = {
    ...bdMetricsFor(leads),
    byOwner: Array.from(new Set(leads.map((l) => l.ownerName))).map((ownerName) => ({
      ownerName,
      ...bdMetricsFor(leads.filter((l) => l.ownerName === ownerName)),
    })),
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            A diagnostic surface. Skill alerts fire when your data asks for them.
          </p>
        </div>
        <Link href="/services">
          <Button variant="outline" size="sm">
            <Sparkles className="h-4 w-4" />
            Browse all services
          </Button>
        </Link>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <CurrencyTile
          label="Open pipeline"
          value={openPipelineValue}
          hint={`${leads.filter((l) => l.stage !== 'onboarding' && l.stage !== 'lost').length} open leads`}
          icon={<DollarSign className="h-4 w-4" />}
          href="/leads?filter=open-pipeline"
        />
        <StatTile
          label="Total leads"
          value={totalLeads}
          hint={`${closedWon} won · ${closedLost} lost`}
          icon={<Users className="h-4 w-4" />}
          href="/leads"
        />
        <CurrencyTile
          label="Won this month"
          value={wonValueThisMonth}
          hint={`${wonThisMonth.length} deals`}
          icon={<TrendingUp className="h-4 w-4" />}
          href="/leads?filter=won-this-month"
        />
        <StatTile
          label="Conversion rate"
          value={`${conversionRate}%`}
          hint={`${closedWon} / ${totalLeads} won`}
          icon={<Target className="h-4 w-4" />}
          href="/leads?filter=won"
        />
      </div>

      {/* BD summary */}
      <BDSummary data={bdSummary} />

      {/* Skill alerts */}
      <AlertBanner alerts={alerts} />

      {/* Pipeline + activity */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <PipelineFunnel data={funnelData} />
        </div>
        <ActivityFeed limit={8} />
      </div>

      {/* Analytics */}
      <div className="grid gap-6 lg:grid-cols-2">
        <RepPerformance rows={repPerformance} />
        <SourceROI rows={sourceROI} />
      </div>
    </div>
  )
}