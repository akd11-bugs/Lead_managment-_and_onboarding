import { prisma } from '@/lib/db'
import type { StageDefinition, OnboardingStepDefinition } from '@prisma/client'
import { STAGES, STAGE_LABELS, STAGE_DESCRIPTIONS, ONBOARDING_SUB_STAGES, ONBOARDING_SUB_STAGE_LABELS } from '@/lib/types'

// Seeds an org's StageDefinition rows from lib/types.ts's built-in STAGES the
// first time they're read, then returns the ordered list. All 5 seeded rows
// are `isCore: true` — their key/position are locked (enforced by the API
// route, not here) because lib/leadStage.ts, lib/alerts.ts, and
// lib/reportsData.ts branch on these literal string values; only
// label/description/color are meant to be admin-editable after seeding.
export async function getStageDefinitions(orgId: string): Promise<StageDefinition[]> {
  const existing = await prisma.stageDefinition.findMany({ where: { orgId }, orderBy: { position: 'asc' } })
  if (existing.length > 0) return existing

  await prisma.stageDefinition.createMany({
    data: STAGES.map((key, position) => ({
      orgId,
      key,
      label: STAGE_LABELS[key],
      description: STAGE_DESCRIPTIONS[key],
      position,
      isCore: true,
    })),
  })
  return prisma.stageDefinition.findMany({ where: { orgId }, orderBy: { position: 'asc' } })
}

// Same seed-on-first-read pattern for the onboarding sub-pipeline. Only the
// *last* seeded row (today's literal 'final_onboarded') is `isCore: true` —
// it's the one lib/leadStage.ts checks to set onboardedAt, and the one
// lib/reportsData.ts's Activity-description convention `(<key>)` depends on.
// The 3 intermediate steps are fully admin add/remove/reorder/rename-able
// from the moment they're seeded.
export async function getOnboardingStepDefinitions(orgId: string): Promise<OnboardingStepDefinition[]> {
  const existing = await prisma.onboardingStepDefinition.findMany({ where: { orgId }, orderBy: { position: 'asc' } })
  if (existing.length > 0) return existing

  await prisma.onboardingStepDefinition.createMany({
    data: ONBOARDING_SUB_STAGES.map((key, position) => ({
      orgId,
      key,
      label: ONBOARDING_SUB_STAGE_LABELS[key],
      position,
      isCore: position === ONBOARDING_SUB_STAGES.length - 1,
    })),
  })
  return prisma.onboardingStepDefinition.findMany({ where: { orgId }, orderBy: { position: 'asc' } })
}
