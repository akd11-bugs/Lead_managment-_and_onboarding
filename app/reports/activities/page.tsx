import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Phone, Mail, Calendar, StickyNote, ClipboardCheck, ArrowLeft } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatDateTime } from '@/lib/utils'
import { requireUser, isAdmin } from '@/lib/session'
import { prisma } from '@/lib/db'
import { getRange, parseRangeKey, RANGE_LABELS, type RangeKey } from '@/lib/reportRange'

export const dynamic = 'force-dynamic'

const ACTOR_ACTIVITY_TYPES = ['call', 'email', 'meeting', 'note']

const ICONS: Record<string, React.ReactNode> = {
  call: <Phone className="h-3.5 w-3.5" />,
  email: <Mail className="h-3.5 w-3.5" />,
  meeting: <Calendar className="h-3.5 w-3.5" />,
  note: <StickyNote className="h-3.5 w-3.5" />,
  onboarding_step: <ClipboardCheck className="h-3.5 w-3.5" />,
}

export default async function ReportActivitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string; range?: string; owner?: string }>
}) {
  const user = await requireUser()
  if (!isAdmin(user)) redirect('/')

  const { kind: rawKind, range: rawRange, owner } = await searchParams
  const kind: 'actor' | 'onboarded' = rawKind === 'onboarded' ? 'onboarded' : 'actor'
  const range: RangeKey = parseRangeKey(rawRange)
  const { start, end, label } = getRange(range)

  const activities = await prisma.activity.findMany({
    where: {
      date: { gte: start, lte: end },
      ...(owner ? { authorName: owner } : {}),
      ...(kind === 'actor' ? { type: { in: ACTOR_ACTIVITY_TYPES } } : { type: 'onboarding_step' }),
    },
    orderBy: { date: 'desc' },
    include: { lead: { select: { id: true, company: true } } },
  })

  const items =
    kind === 'onboarded' ? activities.filter((a) => a.description.endsWith('(final_onboarded)')) : activities

  return (
    <div className="space-y-4">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2 mb-1">
          <Link href="/reports">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Reports
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">
          {kind === 'onboarded' ? 'Onboarded' : 'Activities logged'}
        </h1>
        <p className="text-sm text-muted-foreground">
          {label} · {RANGE_LABELS[range].toLowerCase()}
          {owner ? ` · ${owner}` : ''} · {items.length} {items.length === 1 ? 'record' : 'records'}
        </p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            {kind === 'onboarded' ? 'Leads finalized this period' : 'Calls, emails, meetings, and notes this period'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {items.length === 0 && <p className="text-sm text-muted-foreground">No records for this period.</p>}
          {items.map((a) => (
            <Link
              key={a.id}
              href={`/leads/${a.leadId}`}
              className="flex items-start gap-3 rounded-md border p-3 text-sm transition-colors hover:bg-accent/60"
            >
              <div className="mt-0.5 text-muted-foreground">{ICONS[a.type] ?? null}</div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{a.authorName}</span>
                  <span className="text-muted-foreground">on</span>
                  <span className="font-medium">{a.lead.company}</span>
                  <span className="text-xs text-muted-foreground">{formatDateTime(a.date)}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">{a.description}</p>
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
