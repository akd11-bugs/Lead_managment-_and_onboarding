import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireApiUser, leadScope, isAdmin } from '@/lib/session'
import { validateLeadFields } from '@/lib/types'
import { readJsonBody } from '@/lib/http'

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

  let data: Record<string, unknown>
  if (action === 'stage') {
    const validationError = validateLeadFields({ stage: body.stage })
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 })
    data = { stage: body.stage, ...(body.stage !== 'proposal' && { proposalSubStage: null }) }
  } else {
    const ownerId = String(body.ownerId ?? '')
    if (!ownerId) return NextResponse.json({ error: 'ownerId is required' }, { status: 400 })
    const targetUser = await prisma.user.findUnique({ where: { id: ownerId }, select: { id: true, name: true, isActive: true } })
    if (!targetUser || !targetUser.isActive) {
      return NextResponse.json({ error: 'Target owner must be an active user' }, { status: 400 })
    }
    data = { ownerId: targetUser.id, ownerName: targetUser.name }
  }

  const result = await prisma.lead.updateMany({ where: { id: { in: scopedIds } }, data })

  return NextResponse.json({
    updated: result.count,
    requested: leadIds.length,
    skipped: leadIds.length - scopedIds.length,
  })
}
