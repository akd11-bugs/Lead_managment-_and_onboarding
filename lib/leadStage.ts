import { prisma } from '@/lib/db'
import { ONBOARDING_SUB_STAGE_LABELS, type OnboardingSubStage } from '@/lib/types'
import { evaluateStageRules } from '@/lib/workflow'

export interface StageChangeActor {
  name: string
}

// The stage-transition core shared by the dashboard's PATCH /api/leads/[id]
// and the rep form's PATCH /api/rep/leads/[id] — kept as one function so the
// two surfaces can never drift on wonAt/onboardingSubStage/workflow-rule
// behavior. Only handles a `stage`-only change; field edits stay in the
// dashboard route.
export async function applyStageChange(
  leadId: string,
  existing: { stage: string; onboardedAt: Date | null; onboardingSubStage: string | null },
  nextStage: string,
  actor: StageChangeActor,
) {
  const enteringOnboarding = nextStage === 'onboarding' && existing.stage !== 'onboarding'
  const leavingOnboarding = nextStage !== 'onboarding' && existing.stage === 'onboarding'

  const nextWonAt = enteringOnboarding ? new Date() : leavingOnboarding ? null : undefined

  const nextSubStage: string | null | undefined = enteringOnboarding
    ? 'document_submission'
    : leavingOnboarding
      ? null
      : undefined

  const nextOnboardedAt =
    nextSubStage === 'final_onboarded'
      ? (existing.onboardedAt ?? new Date())
      : nextSubStage !== undefined
        ? null
        : undefined

  if (nextSubStage !== undefined && nextSubStage !== existing.onboardingSubStage) {
    const fromLabel = existing.onboardingSubStage
      ? ONBOARDING_SUB_STAGE_LABELS[existing.onboardingSubStage as OnboardingSubStage]
      : 'Started'
    const toLabel = nextSubStage ? ONBOARDING_SUB_STAGE_LABELS[nextSubStage as OnboardingSubStage] : 'Removed from onboarding'
    await prisma.activity.create({
      data: {
        leadId,
        type: 'onboarding_step',
        description: `Onboarding step: ${fromLabel} → ${toLabel} (${nextSubStage ?? 'none'})`,
        authorName: actor.name,
      },
    })
  }

  const lead = await prisma.lead.update({
    where: { id: leadId },
    data: {
      stage: nextStage,
      ...(nextStage !== 'proposal' && { proposalSubStage: null }),
      ...(nextSubStage !== undefined && { onboardingSubStage: nextSubStage }),
      ...(nextOnboardedAt !== undefined && { onboardedAt: nextOnboardedAt }),
      ...(nextWonAt !== undefined && { wonAt: nextWonAt }),
      ...(nextSubStage !== undefined && nextSubStage !== existing.onboardingSubStage && { lastActivityAt: new Date() }),
    },
  })

  if (nextStage !== existing.stage) {
    // Best-effort — a broken workflow rule (e.g. bad email config) shouldn't
    // fail the lead update that already succeeded.
    evaluateStageRules(lead, nextStage).catch((err) => console.error('evaluateStageRules failed', err))
  }

  return lead
}
