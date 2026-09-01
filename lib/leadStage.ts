import type { Lead } from '@prisma/client'
import { prisma } from '@/lib/db'
import { type OnboardingSubStage, type PendingSubStatus, type Stage } from '@/lib/types'
import { evaluateStageRules } from '@/lib/workflow'

export interface StageChangeActor {
  name: string
}

export interface StageChangeInput {
  stage?: Stage
  pendingSubStatus?: PendingSubStatus
  // Required, non-empty — the "what happened on this call" note. Becomes the
  // Activity description verbatim, and doubles as the required reason when
  // stage is 'not_interested'. Callers must validate this before calling in
  // (this function trusts it, so a 400 for an empty remark happens earlier,
  // at the route, where it can be returned to the client properly).
  remark: string
}

type ExistingLead = Pick<Lead, 'stage' | 'wonAt' | 'onboardedAt' | 'onboardingSubStage'>

// The stage / pendingSubStatus transition core shared by every entry point
// (the dashboard's PATCH /api/leads/[id], the bulk PATCH, Kanban drag, the
// lead detail form) so wonAt / onboardingSubStage / pendingSubStatus /
// workflow-rule behavior can never drift between them the way bulk actions
// used to (see app/api/leads/bulk/route.ts history — it had its own thinner
// copy that silently skipped wonAt and workflow rules).
//
// Only handles the top-level stage and the pending sub-status. Onboarding's
// own sub-pipeline (onboardingSubStage progressing past its auto-seeded
// first step) is a separate, unchanged flow — see
// components/leads/OnboardingProgressPanel.tsx, which PATCHes
// onboardingSubStage directly.
export async function applyStageChange(
  leadId: string,
  existing: ExistingLead,
  input: StageChangeInput,
  actor: StageChangeActor,
): Promise<Lead> {
  const nextStage = input.stage
  const enteringOnboarding = nextStage === 'onboarding' && existing.stage !== 'onboarding'
  const leavingOnboarding = nextStage !== undefined && nextStage !== 'onboarding' && existing.stage === 'onboarding'
  const enteringPending = nextStage === 'pending' && existing.stage !== 'pending'
  const leavingPending = nextStage !== undefined && nextStage !== 'pending' && existing.stage === 'pending'

  // wonAt marks the moment a lead enters onboarding — distinct from
  // onboardedAt (set later, once the onboarding sub-pipeline finishes).
  const nextWonAt = enteringOnboarding ? new Date() : leavingOnboarding ? null : undefined

  const nextOnboardingSubStage: OnboardingSubStage | null | undefined = enteringOnboarding
    ? 'document_submission'
    : leavingOnboarding
      ? null
      : undefined

  // Entering onboarding always starts fresh (not yet onboarded); leaving it
  // clears onboardedAt too. This function never sets onboardingSubStage to
  // 'final_onboarded' itself — that only happens via direct progression
  // through OnboardingProgressPanel, handled separately in the PATCH route.
  const nextOnboardedAt = nextOnboardingSubStage !== undefined ? null : undefined

  // Entering pending with no explicit sub-status defaults to "our side" —
  // whoever picks it up first can immediately correct it. Leaving pending
  // clears it; an explicit value always wins.
  const nextPendingSubStatus: PendingSubStatus | null | undefined =
    input.pendingSubStatus !== undefined
      ? input.pendingSubStatus
      : enteringPending
        ? 'pending_ours'
        : leavingPending
          ? null
          : undefined

  const data: Record<string, unknown> = { lastActivityAt: new Date() }
  if (nextStage !== undefined) data.stage = nextStage
  if (nextPendingSubStatus !== undefined) data.pendingSubStatus = nextPendingSubStatus
  if (nextOnboardingSubStage !== undefined) data.onboardingSubStage = nextOnboardingSubStage
  if (nextOnboardedAt !== undefined) data.onboardedAt = nextOnboardedAt
  if (nextWonAt !== undefined) data.wonAt = nextWonAt

  const lead = await prisma.lead.update({ where: { id: leadId }, data })

  await prisma.activity.create({
    data: {
      leadId,
      type: 'stage_change',
      description: input.remark.trim(),
      authorName: actor.name,
    },
  })

  if (nextStage !== undefined && nextStage !== existing.stage) {
    // Best-effort — a broken workflow rule (e.g. bad email config) shouldn't
    // fail the lead update that already succeeded.
    evaluateStageRules(lead, nextStage).catch((err) => console.error('evaluateStageRules failed', err))
  }

  return lead
}
