import { prisma } from '@/lib/db'
import { getRange, getWeeklyBuckets, getMonthlyBuckets, type RangeKey, type TrendBucket } from '@/lib/reportRange'
import type { TrendPoint } from '@/components/reports/TrendChart'

const ACTOR_ACTIVITY_TYPES = ['call', 'email', 'meeting', 'note']

export interface ReportsData {
  range: { key: RangeKey; start: Date; end: Date; label: string }
  summary: {
    leadsCreated: number
    wonAndOnboarded: number
    activitiesLogged: number
    onboarded: number
  }
  salesByRep: { name: string; created: number; won: number; activities: number }[]
  operationsOnboarded: { name: string; count: number }[]
  trend: { weekly: TrendPoint[]; monthly: TrendPoint[] }
}

// Single source of truth for every number on /reports — also consumed by the
// external API route, so the two can never drift out of sync with each other.
export async function getReportsData(range: RangeKey): Promise<ReportsData> {
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
  const onboardedActivities = activities.filter(
    (a) => a.type === 'onboarding_step' && a.description.endsWith('(final_onboarded)')
  )

  function bucketTrend(buckets: TrendBucket[]): TrendPoint[] {
    return buckets.map((b) => ({
      label: b.label,
      created: trendLeads.filter((l) => l.createdAt >= b.start && l.createdAt <= b.end).length,
      won: trendLeads.filter((l) => l.wonAt && l.wonAt >= b.start && l.wonAt <= b.end).length,
    }))
  }

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
  const salesByRep = Array.from(repMap.entries())
    .map(([name, d]) => ({ name, ...d }))
    .sort((a, b) => b.created - a.created)

  // Operations — onboarded
  const opsMap = new Map<string, number>()
  for (const a of onboardedActivities) {
    opsMap.set(a.authorName, (opsMap.get(a.authorName) ?? 0) + 1)
  }
  const operationsOnboarded = Array.from(opsMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)

  return {
    range: { key: range, start, end, label },
    summary: {
      leadsCreated: createdLeads.length,
      wonAndOnboarded: wonLeads.length,
      activitiesLogged: actorActivities.length,
      onboarded: onboardedActivities.length,
    },
    salesByRep,
    operationsOnboarded,
    trend: { weekly: bucketTrend(weeklyBuckets), monthly: bucketTrend(monthlyBuckets) },
  }
}
