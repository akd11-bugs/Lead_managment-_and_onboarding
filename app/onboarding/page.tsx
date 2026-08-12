import { redirect } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/db'
import { requireUser, isAdmin, isOperations, leadScope } from '@/lib/session'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatRelative } from '@/lib/utils'
import { ONBOARDING_SUB_STAGES, ONBOARDING_SUB_STAGE_LABELS, onboardingProgressPercent, type OnboardingSubStage } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function OnboardingQueuePage() {
  const user = await requireUser()
  // This is the ops/admin cross-rep view — Sales already has per-lead
  // progress via the "View more" link on their own leads.
  if (!isAdmin(user) && !isOperations(user)) redirect('/')

  const leads = await prisma.lead.findMany({
    where: { stage: 'onboarding', ...leadScope(user) },
    orderBy: { updatedAt: 'desc' },
  })

  const bySubStage = new Map<OnboardingSubStage, typeof leads>()
  for (const stage of ONBOARDING_SUB_STAGES) bySubStage.set(stage, [])
  for (const lead of leads) {
    const stage = (lead.onboardingSubStage as OnboardingSubStage) ?? 'document_submission'
    bySubStage.get(stage)?.push(lead)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Onboarding queue</h1>
        <p className="text-sm text-muted-foreground">
          Every merchant that&apos;s closed-won, across all reps, grouped by where they are in onboarding.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        {ONBOARDING_SUB_STAGES.map((stage) => (
          <Card key={stage} className="clay-card">
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
                    <span className="font-medium truncate">{lead.company}</span>
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {onboardingProgressPercent(lead.onboardingSubStage as OnboardingSubStage | null)}%
                    </Badge>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{lead.ownerName}</span>
                    <span>{formatCurrency(lead.estimatedVolume)}</span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Updated {formatRelative(lead.updatedAt)}
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
