import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireApiUser, leadScope } from '@/lib/session'
import { validateLeadFields, ONBOARDING_SUB_STAGE_LABELS, type OnboardingSubStage } from '@/lib/types'
import { readJsonBody } from '@/lib/http'
import { applyStageChange, resolveOpsAssignment } from '@/lib/leadStage'

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
    select: { stage: true, wonAt: true, onboardedAt: true, onboardingSubStage: true, pendingSubStatus: true },
  })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isStageChange = body.stage !== undefined && body.stage !== existing.stage
  const isPendingSubStatusChange =
    body.pendingSubStatus !== undefined && body.pendingSubStatus !== existing.pendingSubStatus

  // Top-level stage / pending-sub-status changes always require a remark and
  // go through the shared applyStageChange (also used by the bulk route,
  // Kanban, and the lead detail form) — never combined with plain field
  // edits in the same request (the dialogs that trigger this send only
  // {stage or pendingSubStatus, remark}).
  if (isStageChange || isPendingSubStatusChange) {
    const remark = typeof body.remark === 'string' ? body.remark.trim() : ''
    if (!remark) {
      return NextResponse.json({ error: 'A remark is required when changing stage or pending status' }, { status: 400 })
    }

    let assignedOps: { id: string; name: string } | undefined
    if (body.stage === 'onboarding' && existing.stage !== 'onboarding') {
      const assignedOpsId = typeof body.assignedOpsId === 'string' ? body.assignedOpsId : ''
      if (!assignedOpsId) {
        return NextResponse.json({ error: 'An operations person must be assigned to move a lead to Onboarding' }, { status: 400 })
      }
      const resolved = await resolveOpsAssignment(assignedOpsId)
      if (!resolved) {
        return NextResponse.json({ error: 'assignedOpsId must be an active operations user' }, { status: 400 })
      }
      assignedOps = resolved
    }

    const lead = await applyStageChange(
      id,
      existing,
      {
        stage: body.stage,
        pendingSubStatus: body.pendingSubStatus,
        remark,
        assignedOpsId: assignedOps?.id,
        assignedOpsName: assignedOps?.name,
      },
      user,
    )
    return NextResponse.json({ lead })
  }

  // Onboarding's own sub-pipeline progression — unchanged, unrelated to the
  // stage/pending-sub-status flow above. Direct onboardingSubStage edits come
  // from components/leads/OnboardingProgressPanel.tsx while stage stays
  // 'onboarding'; no remark required for these.
  const nextSubStage: string | null | undefined = body.onboardingSubStage !== undefined ? body.onboardingSubStage : undefined

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
      ...(nextSubStage !== undefined && { onboardingSubStage: nextSubStage }),
      ...(nextOnboardedAt !== undefined && { onboardedAt: nextOnboardedAt }),
      ...(body.estimatedVolume !== undefined && { estimatedVolume: Number(body.estimatedVolume) }),
      ...(body.ownerName !== undefined && { ownerName: body.ownerName }),
      ...(body.effort !== undefined && { effort: body.effort }),
      ...(body.quality !== undefined && { quality: body.quality }),
      ...(body.type !== undefined && { type: body.type }),
      ...(body.expectedCloseDate !== undefined && {
        expectedCloseDate: body.expectedCloseDate ? new Date(body.expectedCloseDate) : null,
      }),
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