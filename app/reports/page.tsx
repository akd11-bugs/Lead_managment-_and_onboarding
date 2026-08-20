import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatTile } from '@/components/dashboard/StatTile'
import { cn } from '@/lib/utils'
import { requireUser, isAdmin } from '@/lib/session'
import { parseRangeKey, RANGE_LABELS, type RangeKey } from '@/lib/reportRange'
import { getReportsData } from '@/lib/reportsData'
import { TrendChart } from '@/components/reports/TrendChart'

export const dynamic = 'force-dynamic'

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>
}) {
  const user = await requireUser()
  if (!isAdmin(user)) redirect('/')

  const { range: rawRange } = await searchParams
  const range: RangeKey = parseRangeKey(rawRange)
  const { summary, salesByRep: repRows, operationsOnboarded: opsRows, trend, range: rangeInfo } = await getReportsData(range)
  const { label } = rangeInfo

  const maxCreated = Math.max(1, ...repRows.map((r) => r.created))
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
        <StatTile label="Leads created" value={summary.leadsCreated} href={`/leads?metric=created&range=${range}`} />
        <StatTile label="Won & onboarded" value={summary.wonAndOnboarded} href={`/leads?metric=onboarded&range=${range}`} />
        <StatTile
          label="Activities logged"
          value={summary.activitiesLogged}
          hint="calls, emails, meetings, notes"
          href={`/reports/activities?kind=actor&range=${range}`}
        />
        <StatTile
          label="Onboarded"
          value={summary.onboarded}
          hint="leads finalized by ops"
          href={`/reports/activities?kind=onboarded&range=${range}`}
        />
      </div>

      <TrendChart weekly={trend.weekly} monthly={trend.monthly} />

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
