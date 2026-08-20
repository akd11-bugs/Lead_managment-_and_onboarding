import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatTile } from '@/components/dashboard/StatTile'
import { cn } from '@/lib/utils'
import { requireUser, isAdmin } from '@/lib/session'
import { prisma } from '@/lib/db'
import { getRange, parseRangeKey, RANGE_LABELS, getWeeklyBuckets, getMonthlyBuckets, type RangeKey } from '@/lib/reportRange'
import { TrendChart, type TrendPoint } from '@/components/reports/TrendChart'

export const dynamic = 'force-dynamic'

const ACTOR_ACTIVITY_TYPES = ['call', 'email', 'meeting', 'note']

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>
}) {
  const user = await requireUser()
  if (!isAdmin(user)) redirect('/')

  const { range: rawRange } = await searchParams
  const range: RangeKey = parseRangeKey(rawRange)
  const { start, end, label } = getRange(range)

  const weeklyBuckets = getWeeklyBuckets(8)
  const monthlyBuckets = getMonthlyBuckets(6)
  const trendStart = monthlyBuckets[0].start // 6 months back always covers the 8-week window too

  const [createdLeads, wonLeads, activities, trendLeads] = await Promise.all([
    prisma.lead.findMany({
      where: { createdAt: { gte: start, lte: end } },
      select: { id: true, ownerName: true },
    }),
    prisma.lead.findMany({
      // Counts as soon as sales marks a lead won (wonAt, set when it enters
      // the 'onboarding' stage) — not onboardedAt, which only lands once ops
      // finishes the sub-pipeline, possibly much later than this period.
      where: { wonAt: { gte: start, lte: end } },
      select: { id: true, ownerName: true },
    }),
    prisma.activity.findMany({
      // Excludes legacy rows logged before activities were attributed to
      // the real session user — those have authorName: 'System' and would
      // otherwise show up as a phantom rep.
      where: { date: { gte: start, lte: end }, authorName: { not: 'System' } },
      select: { type: true, authorName: true, description: true },
    }),
    prisma.lead.findMany({
      where: { OR: [{ createdAt: { gte: trendStart } }, { wonAt: { gte: trendStart } }] },
      select: { createdAt: true, wonAt: true },
    }),
  ])

  const actorActivities = activities.filter((a) => ACTOR_ACTIVITY_TYPES.includes(a.type))

  function bucketTrend(buckets: { start: Date; end: Date; label: string }[]): TrendPoint[] {
    return buckets.map((b) => ({
      label: b.label,
      created: trendLeads.filter((l) => l.createdAt >= b.start && l.createdAt <= b.end).length,
      won: trendLeads.filter((l) => l.wonAt && l.wonAt >= b.start && l.wonAt <= b.end).length,
    }))
  }
  const weeklyTrend = bucketTrend(weeklyBuckets)
  const monthlyTrend = bucketTrend(monthlyBuckets)
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
        <StatTile label="Leads created" value={createdLeads.length} href={`/leads?metric=created&range=${range}`} />
        <StatTile label="Won & onboarded" value={wonLeads.length} href={`/leads?metric=onboarded&range=${range}`} />
        <StatTile
          label="Activities logged"
          value={actorActivities.length}
          hint="calls, emails, meetings, notes"
          href={`/reports/activities?kind=actor&range=${range}`}
        />
        <StatTile
          label="Onboarded"
          value={onboardedActivities.length}
          hint="leads finalized by ops"
          href={`/reports/activities?kind=onboarded&range=${range}`}
        />
      </div>

      <TrendChart weekly={weeklyTrend} monthly={monthlyTrend} />

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
                      <td className="px-4 py-2 text-right tabular-nums">
                        <Link
                          href={`/leads?metric=created&range=${range}&owner=${encodeURIComponent(r.name)}`}
                          className="text-blue-600 hover:underline"
                        >
                          {r.created}
                        </Link>
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        <Link
                          href={`/leads?metric=onboarded&range=${range}&owner=${encodeURIComponent(r.name)}`}
                          className="text-blue-600 hover:underline"
                        >
                          {r.won}
                        </Link>
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        <Link
                          href={`/reports/activities?kind=actor&range=${range}&owner=${encodeURIComponent(r.name)}`}
                          className="text-blue-600 hover:underline"
                        >
                          {r.activities}
                        </Link>
                      </td>
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
                      <td className="px-4 py-2 text-right tabular-nums">
                        <Link
                          href={`/reports/activities?kind=onboarded&range=${range}&owner=${encodeURIComponent(r.name)}`}
                          className="text-blue-600 hover:underline"
                        >
                          {r.count}
                        </Link>
                      </td>
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

function BarTrack({ value, max }: { value: number; max: number }) {
  const pct = Math.max(4, Math.round((value / max) * 100))
  return (
    <div className="h-1.5 w-full max-w-28 rounded-full bg-accent/60 overflow-hidden">
      <div className={cn('h-full rounded-full bg-blue-600')} style={{ width: `${pct}%` }} />
    </div>
  )
}
