import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireApiUser, leadScope } from '@/lib/session'
import { validateLeadFields, ONBOARDING_SUB_STAGE_LABELS, type OnboardingSubStage } from '@/lib/types'
import { readJsonBody } from '@/lib/http'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser()
  if (user instanceof NextResponse) return user
  const { id } = await params
  const lead = await prisma.lead.findFirst({
    where: { id, ...leadScope(user) },
    include: {
      activities: { orderBy: { date: 'desc' } },
      skillRuns: { orderBy: { createdAt: 'desc' }, take: 20 },
    },
  })
  if (!lead) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ lead })
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser()
  if (user instanceof NextResponse) return user
  const { id } = await params
  const body = await readJsonBody(req)
  if (body instanceof NextResponse) return body

  const validationError = validateLeadFields(body)
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 })

  const existing = await prisma.lead.findFirst({
    where: { id, ...leadScope(user) },
    select: { stage: true, wonAt: true, onboardedAt: true, onboardingSubStage: true },
  })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const enteringOnboarding = body.stage === 'onboarding' && existing.stage !== 'onboarding'
  const leavingOnboarding = body.stage !== undefined && body.stage !== 'onboarding' && existing.stage === 'onboarding'

  // wonAt marks the moment sales moves a lead into the onboarding stage —
  // distinct from onboardedAt (set later, once ops finishes the sub-pipeline).
  // Reports/dashboard "won" metrics key off this so they don't have to wait
  // on ops, and don't drift if the lead is edited again afterward.
  const nextWonAt = enteringOnboarding ? new Date() : leavingOnboarding ? null : undefined

  // Winning a deal now means entering the onboarding sub-pipeline, not a
  // resting "Won" state — there's no separate manual "mark onboarded" step;
  // onboardedAt derives from reaching the last sub-stage.
  const nextSubStage: string | null | undefined =
    body.onboardingSubStage !== undefined
      ? body.onboardingSubStage
      : enteringOnboarding
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
    // description always ends with `(<subStageValue>)` — the Reports page's
    // "Onboarded" metric depends on this exact suffix, see lib/types.ts.
    await prisma.activity.create({
      data: {
        leadId: id,
        type: 'onboarding_step',
        description: `Onboarding step: ${fromLabel} → ${toLabel} (${nextSubStage ?? 'none'})`,
        authorName: user.name,
      },
    })
  }

  const lead = await prisma.lead.update({
    where: { id },
    data: {
      ...(body.poc !== undefined && { poc: body.poc }),
      ...(body.company !== undefined && { company: body.company }),
      ...(body.email !== undefined && { email: body.email }),
      ...(body.phone !== undefined && { phone: body.phone }),
      ...(body.website !== undefined && { website: body.website }),
      ...(body.industry !== undefined && { industry: body.industry }),
      ...(body.businessType !== undefined && { businessType: body.businessType }),
      ...(body.painPoints !== undefined && { painPoints: body.painPoints }),
      ...(body.whatTheyWant !== undefined && { whatTheyWant: body.whatTheyWant }),
      ...(body.source !== undefined && { source: body.source }),
      ...(body.stage !== undefined && { stage: body.stage }),
      ...(body.stage !== undefined && body.stage !== 'proposal' && { proposalSubStage: null }),
      ...(nextSubStage !== undefined && { onboardingSubStage: nextSubStage }),
      ...(nextOnboardedAt !== undefined && { onboardedAt: nextOnboardedAt }),
      ...(nextWonAt !== undefined && { wonAt: nextWonAt }),
      ...(body.estimatedVolume !== undefined && { estimatedVolume: Number(body.estimatedVolume) }),
      ...(body.ownerName !== undefined && { ownerName: body.ownerName }),
      ...(body.effort !== undefined && { effort: body.effort }),
      ...(body.quality !== undefined && { quality: body.quality }),
      ...(body.type !== undefined && { type: body.type }),
      ...(body.expectedCloseDate !== undefined && {
        expectedCloseDate: body.expectedCloseDate ? new Date(body.expectedCloseDate) : null,
      }),
      ...(body.proposalSubStage !== undefined && { proposalSubStage: body.proposalSubStage }),
      ...(body.notes !== undefined && { notes: body.notes }),
      ...(body.position !== undefined && { position: Number(body.position) }),
      ...(nextSubStage !== undefined && nextSubStage !== existing.onboardingSubStage && { lastActivityAt: new Date() }),
    },
  })
  return NextResponse.json({ lead })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser()
  if (user instanceof NextResponse) return user
  const { id } = await params
  const existing = await prisma.lead.findFirst({ where: { id, ...leadScope(user) }, select: { id: true } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await prisma.lead.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}