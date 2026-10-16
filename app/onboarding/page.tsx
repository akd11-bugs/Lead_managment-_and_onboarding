import { redirect } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/db'
import { requireUser, isAdmin, isOperations, leadScope } from '@/lib/session'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatRelative } from '@/lib/utils'
import { ONBOARDING_SUB_STAGES, ONBOARDING_SUB_STAGE_LABELS, onboardingProgressPercent, type OnboardingSubStage } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function OnboardingQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ all?: string }>
}) {
  const user = await requireUser()
  // This is the ops/admin cross-rep view — Sales already has per-lead
  // progress via the "View more" link on their own leads.
  if (!isAdmin(user) && !isOperations(user)) redirect('/')

  const { all } = await searchParams

  // An operations user sees the merchants assigned to them by default: the
  // sales rep names an ops owner when moving a lead to Onboarding, and this
  // is that person's work queue, not the org's whole backlog. Admins see
  // everything, and ops can opt into the full view with ?all=1.
  const showAll = isAdmin(user) || all === '1'
  const mineOnly = !showAll ? { assignedOpsId: user.id } : {}

  const leads = await prisma.lead.findMany({
    where: { stage: 'onboarding', ...leadScope(user), ...mineOnly },
    orderBy: { updatedAt: 'desc' },
    include: { company: true },
  })

  const bySubStage = new Map<OnboardingSubStage, typeof leads>()
  for (const stage of ONBOARDING_SUB_STAGES) bySubStage.set(stage, [])
  for (const lead of leads) {
    const stage = (lead.onboardingSubStage as OnboardingSubStage) ?? 'document_submission'
    bySubStage.get(stage)?.push(lead)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {showAll ? 'Onboarding queue' : 'Your onboarding queue'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {showAll
              ? 'Every merchant in onboarding, across all reps and operations owners.'
              : `${leads.length} merchant${leads.length === 1 ? '' : 's'} assigned to you, grouped by where they are.`}
          </p>
        </div>
        {!isAdmin(user) && (
          <Link
            href={showAll ? '/onboarding' : '/onboarding?all=1'}
            className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-accent"
          >
            {showAll ? 'Show only mine' : 'Show all'}
          </Link>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        {ONBOARDING_SUB_STAGES.map((stage) => (
          <Card key={stage}>
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {ONBOARDING_SUB_STAGE_LABELS[stage]}
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{bySubStage.get(stage)?.length ?? 0}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {ONBOARDING_SUB_STAGES.map((stage) => (
          <Card key={stage}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{ONBOARDING_SUB_STAGE_LABELS[stage]}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(bySubStage.get(stage) ?? []).length === 0 && (
                <p className="text-xs text-muted-foreground">Nothing here.</p>
              )}
              {(bySubStage.get(stage) ?? []).map((lead) => (
                <Link
                  key={lead.id}
                  href={`/leads/${lead.id}/onboarding`}
                  className="block rounded-md border p-2.5 text-sm hover:bg-accent"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium truncate">{lead.company?.name ?? 'Unknown company'}</span>
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {onboardingProgressPercent(lead.onboardingSubStage as OnboardingSubStage | null)}%
                    </Badge>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                    <span className="truncate">{lead.ownerName}</span>
                    <span className="shrink-0">{formatCurrency(lead.estimatedVolume)}</span>
                  </div>

                  {/* Contact details inline: the ops member's next action is
                      almost always to call or email, and making them open the
                      lead first just to find a number is wasted motion. */}
                  <div className="mt-1.5 space-y-0.5 text-[11px] text-muted-foreground">
                    {lead.email && <p className="truncate">{lead.email}</p>}
                    {lead.phone && <p className="truncate">{lead.phone}</p>}
                    {lead.website && <p className="truncate">{lead.website}</p>}
                  </div>

                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {(() => {
                      const days = Math.floor((Date.now() - lead.updatedAt.getTime()) / 86_400_000)
                      // Surfaces merchants that have gone quiet. The main
                      // pipeline flags stale leads at 21 days; onboarding
                      // should move faster than that, so 7 is the threshold.
                      return days >= 7 ? (
                        <span className="font-medium text-amber-600 dark:text-amber-500">
                          No movement in {days} days
                        </span>
                      ) : (
                        <>Updated {formatRelative(lead.updatedAt)}</>
                      )
                    })()}
                  </p>
                </Link>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
