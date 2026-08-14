import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn, formatDate } from '@/lib/utils'
import { requireUser, isAdmin } from '@/lib/session'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

type RangeKey = 'today' | 'week' | 'month'

function getRange(range: RangeKey): { start: Date; end: Date; label: string } {
  const now = new Date()
  if (range === 'today') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
    return { start, end, label: formatDate(start) }
  }
  if (range === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
    return { start, end, label: `${formatDate(start)} – ${formatDate(end)}` }
  }
  // week: Monday-start calendar week containing today
  const day = now.getDay() // 0 = Sunday
  const diffToMonday = day === 0 ? -6 : 1 - day
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday)
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6, 23, 59, 59, 999)
  return { start, end, label: `${formatDate(start)} – ${formatDate(end)}` }
}

const RANGE_LABELS: Record<RangeKey, string> = { today: 'Today', week: 'This week', month: 'This month' }

const ACTOR_ACTIVITY_TYPES = ['call', 'email', 'meeting', 'note']

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>
}) {
  const user = await requireUser()
  if (!isAdmin(user)) redirect('/')

  const { range: rawRange } = await searchParams
  const range: RangeKey = rawRange === 'today' || rawRange === 'month' ? rawRange : 'week'
  const { start, end, label } = getRange(range)

  const [createdLeads, wonLeads, activities] = await Promise.all([
    prisma.lead.findMany({
      where: { createdAt: { gte: start, lte: end } },
      select: { id: true, ownerName: true },
    }),
    prisma.lead.findMany({
      where: { onboardedAt: { gte: start, lte: end } },
      select: { id: true, ownerName: true },
    }),
    prisma.activity.findMany({
      where: { date: { gte: start, lte: end } },
      select: { type: true, authorName: true, description: true },
    }),
  ])

  const actorActivities = activities.filter((a) => ACTOR_ACTIVITY_TYPES.includes(a.type))
  const onboardedActivities = activities.filter(
    (a) => a.type === 'onboarding_step' && a.description.endsWith('(final_onboarded)')
  )

  // Sales — by rep
  const repMap = new Map<string, { created: number; won: number; activities: number }>()
  for (const l of createdLeads) {
    const row = repMap.get(l.ownerName) ?? { created: 0, won: 0, activities: 0 }
    row.created++
    repMap.set(l.ownerName, row)
  }
  for (const l of wonLeads) {
    const row = repMap.get(l.ownerName) ?? { created: 0, won: 0, activities: 0 }
    row.won++
    repMap.set(l.ownerName, row)
  }
  for (const a of actorActivities) {
    const row = repMap.get(a.authorName) ?? { created: 0, won: 0, activities: 0 }
    row.activities++
    repMap.set(a.authorName, row)
  }
  const repRows = Array.from(repMap.entries())
    .map(([name, d]) => ({ name, ...d }))
    .sort((a, b) => b.created - a.created)
  const maxCreated = Math.max(1, ...repRows.map((r) => r.created))

  // Operations — onboarded
  const opsMap = new Map<string, number>()
  for (const a of onboardedActivities) {
    opsMap.set(a.authorName, (opsMap.get(a.authorName) ?? 0) + 1)
  }
  const opsRows = Array.from(opsMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
  const maxOnboarded = Math.max(1, ...opsRows.map((r) => r.count))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Admin · Reports</p>
          <h1 className="text-2xl font-semibold tracking-tight">Team performance</h1>
          <p className="text-sm text-muted-foreground">
            {label} · {RANGE_LABELS[range].toLowerCase()} · all leads, org-wide
          </p>
        </div>
        <div className="inline-flex rounded-md border bg-muted/40 p-1 gap-0.5">
          {(Object.keys(RANGE_LABELS) as RangeKey[]).map((r) => (
            <Link key={r} href={`/reports?range=${r}`}>
              <Button size="sm" variant={r === range ? 'default' : 'ghost'} className="h-7 px-3 text-xs">
                {RANGE_LABELS[r]}
              </Button>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Leads created" value={createdLeads.length} />
        <StatTile label="Won & onboarded" value={wonLeads.length} />
        <StatTile label="Activities logged" value={actorActivities.length} sub="calls, emails, meetings, notes" />
        <StatTile label="Onboarded" value={onboardedActivities.length} sub="leads finalized by ops" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2 items-start">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Sales — by rep</CardTitle>
            <p className="text-xs text-muted-foreground">Leads created, won, and activities logged this period</p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase tracking-wide">
                  <tr className="text-left">
                    <th className="px-4 py-2 font-medium">Rep</th>
                    <th className="px-4 py-2 font-medium text-right">Created</th>
                    <th className="px-4 py-2 font-medium text-right">Won</th>
                    <th className="px-4 py-2 font-medium text-right">Activities</th>
                    <th className="px-4 py-2 font-medium">Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {repRows.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                        No activity this period.
                      </td>
                    </tr>
                  )}
                  {repRows.map((r) => (
                    <tr key={r.name}>
                      <td className="px-4 py-2 font-medium">{r.name}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{r.created}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{r.won}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{r.activities}</td>
                      <td className="px-4 py-2">
                        <BarTrack value={r.created} max={maxCreated} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Operations — onboarded</CardTitle>
            <p className="text-xs text-muted-foreground">Leads each ops member finalized this period</p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase tracking-wide">
                  <tr className="text-left">
                    <th className="px-4 py-2 font-medium">Ops member</th>
                    <th className="px-4 py-2 font-medium text-right">Onboarded</th>
                    <th className="px-4 py-2 font-medium">Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {opsRows.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                        No leads finalized this period.
                      </td>
                    </tr>
                  )}
                  {opsRows.map((r) => (
                    <tr key={r.name}>
                      <td className="px-4 py-2 font-medium">{r.name}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{r.count}</td>
                      <td className="px-4 py-2">
                        <BarTrack value={r.count} max={maxOnboarded} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function StatTile({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="rounded-md border bg-card px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1.5 text-2xl font-semibold tabular-nums">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </div>
  )
}

function BarTrack({ value, max }: { value: number; max: number }) {
  const pct = Math.max(4, Math.round((value / max) * 100))
  return (
    <div className="h-1.5 w-full max-w-28 rounded-full bg-accent/60 overflow-hidden">
      <div className={cn('h-full rounded-full bg-blue-600')} style={{ width: `${pct}%` }} />
    </div>
  )
}
