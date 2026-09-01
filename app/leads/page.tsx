import Link from 'next/link'
import { X } from 'lucide-react'
import { prisma } from '@/lib/db'
import { LeadsTable } from '@/components/leads/LeadsTable'
import { requireUser, leadScope, isAdmin } from '@/lib/session'
import { STAGE_LABELS, SOURCE_LABELS, type Stage, type LeadSource } from '@/lib/types'
import { getRange, parseRangeKey, RANGE_LABELS, type RangeKey } from '@/lib/reportRange'

export const dynamic = 'force-dynamic'

const FILTERS: Record<string, { where: Record<string, unknown>; label: string }> = (() => {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
  return {
    'partners-onboarded': {
      where: { type: 'partner', wonAt: { gte: monthStart, lte: monthEnd } },
      label: 'Partners onboarded this month',
    },
    'merchants-onboarded': {
      where: { type: 'merchant', wonAt: { gte: monthStart, lte: monthEnd } },
      label: 'Merchants onboarded this month',
    },
    'expected-to-onboard': {
      where: { wonAt: null, expectedCloseDate: { gte: monthStart, lte: monthEnd } },
      label: 'Expected to onboard by month end',
    },
    'open-pipeline': {
      where: { stage: { notIn: ['onboarding', 'not_interested'] } },
      label: 'Open pipeline',
    },
    'won-this-month': {
      where: { wonAt: { gte: monthStart, lte: monthEnd } },
      label: 'Won this month',
    },
    won: {
      where: { stage: 'onboarding' },
      label: 'Won',
    },
    closed: {
      where: { stage: { in: ['onboarding', 'not_interested'] } },
      label: 'Closed (won or not interested)',
    },
  }
})()

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{
    filter?: string
    owner?: string
    source?: string
    stage?: string
    q?: string
    metric?: string
    range?: string
  }>
}) {
  const user = await requireUser()
  const { filter, owner, source, stage, q, metric, range: rawRange } = await searchParams
  const matched = filter ? FILTERS[filter] : undefined

  // Period-scoped drill-down from Reports — e.g. "leads created this week" —
  // distinct from the static, always-current-month FILTERS above.
  const range: RangeKey | null = metric ? parseRangeKey(rawRange) : null
  const periodBounds = range ? getRange(range) : null
  const periodWhere =
    metric === 'created' && periodBounds
      ? { createdAt: { gte: periodBounds.start, lte: periodBounds.end } }
      : metric === 'onboarded' && periodBounds
        ? { wonAt: { gte: periodBounds.start, lte: periodBounds.end } }
        : {}

  const labels: string[] = []
  if (matched) labels.push(matched.label)
  if (metric && range) {
    labels.push(`${metric === 'created' ? 'Leads created' : 'Onboarded'} · ${RANGE_LABELS[range]}`)
  }
  if (owner) labels.push(`Owner: ${owner}`)
  if (source) labels.push(`Source: ${SOURCE_LABELS[source as LeadSource] ?? source}`)
  if (stage) labels.push(`Stage: ${STAGE_LABELS[stage as Stage] ?? stage}`)

  const leads = await prisma.lead.findMany({
    where: {
      ...leadScope(user),
      ...(matched?.where as object),
      ...periodWhere,
      ...(owner ? { ownerName: owner } : {}),
      ...(source ? { source } : {}),
      ...(stage ? { stage } : {}),
    },
    orderBy: { updatedAt: 'desc' },
  })

  const admin = isAdmin(user)
  const owners = admin
    ? await prisma.user.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: 'asc' } })
    : []

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Leads</h1>
        <p className="text-sm text-muted-foreground">All leads across all stages. Click a row for details.</p>
      </div>
      {labels.length > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-md border bg-accent/40 px-3 py-2 text-sm">
          <span>
            Showing: <strong>{labels.join(' · ')}</strong> · {leads.length} lead{leads.length === 1 ? '' : 's'}
          </span>
          <Link href="/leads" className="flex items-center gap-1 text-blue-600 hover:underline">
            <X className="h-3.5 w-3.5" />
            Clear filter
          </Link>
        </div>
      )}
      <LeadsTable initialLeads={leads as any} initialQuery={q} canReassign={admin} ownerOptions={owners} />
    </div>
  )
}
