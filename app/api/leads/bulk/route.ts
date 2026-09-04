import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireApiUser, leadScope, isAdmin } from '@/lib/session'
import { validateLeadFields, PENDING_SUB_STATUSES, type PendingSubStatus } from '@/lib/types'
import { readJsonBody } from '@/lib/http'
import { applyStageChange, resolveOpsAssignment } from '@/lib/leadStage'

export const dynamic = 'force-dynamic'

export async function PATCH(req: Request) {
  const user = await requireApiUser()
  if (user instanceof NextResponse) return user

  const body = await readJsonBody(req)
  if (body instanceof NextResponse) return body
  const leadIds: string[] = Array.isArray(body.leadIds) ? body.leadIds.filter((id: unknown) => typeof id === 'string') : []
  const action = body.action

  if (leadIds.length === 0) return NextResponse.json({ error: 'leadIds is required' }, { status: 400 })
  if (action !== 'reassign' && action !== 'stage') {
    return NextResponse.json({ error: 'action must be "reassign" or "stage"' }, { status: 400 })
  }
  if (action === 'reassign' && !isAdmin(user)) {
    return NextResponse.json({ error: 'Only admins can reassign leads' }, { status: 403 })
  }

  // Only ever touch leads within this user's scope, even if the request asked
  // for more — silently drop out-of-scope ids rather than fail the batch.
  const inScope = await prisma.lead.findMany({
    where: { id: { in: leadIds }, ...leadScope(user) },
    select: { id: true },
  })
  const scopedIds = inScope.map((l) => l.id)
  if (scopedIds.length === 0) {
    return NextResponse.json({ error: 'None of the selected leads are in your scope' }, { status: 403 })
  }

  if (action === 'stage') {
    const validationError = validateLeadFields({ stage: body.stage, pendingSubStatus: body.pendingSubStatus })
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 })
    const remark = typeof body.remark === 'string' ? body.remark.trim() : ''
    if (!remark) {
      return NextResponse.json({ error: 'A remark is required when changing stage' }, { status: 400 })
    }
    const pendingSubStatus =
      body.pendingSubStatus != null && (PENDING_SUB_STATUSES as string[]).includes(body.pendingSubStatus)
        ? (body.pendingSubStatus as PendingSubStatus)
        : undefined

    const scopedLeads = await prisma.lead.findMany({
      where: { id: { in: scopedIds } },
      select: { id: true, stage: true, wonAt: true, onboardedAt: true, onboardingSubStage: true, pendingSubStatus: true },
    })

    let assignedOps: { id: string; name: string } | undefined
    if (body.stage === 'onboarding' && scopedLeads.some((l) => l.stage !== 'onboarding')) {
      const assignedOpsId = typeof body.assignedOpsId === 'string' ? body.assignedOpsId : ''
      if (!assignedOpsId) {
        return NextResponse.json({ error: 'An operations person must be assigned to move leads to Onboarding' }, { status: 400 })
      }
      const resolved = await resolveOpsAssignment(assignedOpsId)
      if (!resolved) {
        return NextResponse.json({ error: 'assignedOpsId must be an active operations user' }, { status: 400 })
      }
      assignedOps = resolved
    }

    // Sequential, not Promise.all — applyStageChange does a read-then-write
    // per lead (workflow rules, activity log); running these concurrently
    // risks interleaved writes for no real speed benefit at bulk-action scale.
    for (const lead of scopedLeads) {
      await applyStageChange(
        lead.id,
        lead,
        { stage: body.stage, pendingSubStatus, remark, assignedOpsId: assignedOps?.id, assignedOpsName: assignedOps?.name },
        user,
      )
    }

    return NextResponse.json({
      updated: scopedLeads.length,
      requested: leadIds.length,
      skipped: leadIds.length - scopedIds.length,
    })
  }

  const ownerId = String(body.ownerId ?? '')
  if (!ownerId) return NextResponse.json({ error: 'ownerId is required' }, { status: 400 })
  const targetUser = await prisma.user.findUnique({ where: { id: ownerId }, select: { id: true, name: true, isActive: true } })
  if (!targetUser || !targetUser.isActive) {
    return NextResponse.json({ error: 'Target owner must be an active user' }, { status: 400 })
  }
  const result = await prisma.lead.updateMany({
    where: { id: { in: scopedIds } },
    data: { ownerId: targetUser.id, ownerName: targetUser.name },
  })

  return NextResponse.json({
    updated: result.count,
    requested: leadIds.length,
    skipped: leadIds.length - scopedIds.length,
  })
}
