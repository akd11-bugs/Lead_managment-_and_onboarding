import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { leadScope } from '@/lib/session'
import { getRepSessionUser } from '@/lib/repSession'
import { STAGES, PENDING_SUB_STATUSES, type Stage, type PendingSubStatus } from '@/lib/types'
import { readJsonBody } from '@/lib/http'
import { applyStageChange } from '@/lib/leadStage'
import { checkRateLimit } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getRepSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const lead = await prisma.lead.findFirst({
    where: { id, ...leadScope(user) },
    include: { activities: { orderBy: { date: 'desc' }, take: 20 } },
  })
  if (!lead) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ lead })
}

// Stage / pending-sub-status only, same shared applyStageChange the
// dashboard uses — a remark is required exactly like it is there. Full field
// edits stay on the dashboard's PATCH /api/leads/[id].
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getRepSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rateLimit = checkRateLimit(`rep-lead-patch:${user.id}`, 60, 15 * 60 * 1000)
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many requests — try again shortly' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } },
    )
  }

  const { id } = await params
  const body = await readJsonBody(req)
  if (body instanceof NextResponse) return body

  const nextStage = body?.stage
  if (nextStage !== undefined && (typeof nextStage !== 'string' || !STAGES.includes(nextStage as Stage))) {
    return NextResponse.json({ error: `Invalid stage: ${nextStage}` }, { status: 400 })
  }
  const nextPendingSubStatus = body?.pendingSubStatus
  if (
    nextPendingSubStatus !== undefined &&
    (typeof nextPendingSubStatus !== 'string' || !PENDING_SUB_STATUSES.includes(nextPendingSubStatus as PendingSubStatus))
  ) {
    return NextResponse.json({ error: `Invalid pendingSubStatus: ${nextPendingSubStatus}` }, { status: 400 })
  }
  if (nextStage === undefined && nextPendingSubStatus === undefined) {
    return NextResponse.json({ error: 'stage or pendingSubStatus is required' }, { status: 400 })
  }
  const remark = typeof body?.remark === 'string' ? body.remark.trim() : ''
  if (!remark) {
    return NextResponse.json({ error: 'A remark is required when changing stage or pending status' }, { status: 400 })
  }

  const existing = await prisma.lead.findFirst({
    where: { id, ...leadScope(user) },
    select: { stage: true, wonAt: true, onboardedAt: true, onboardingSubStage: true },
  })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const lead = await applyStageChange(
    id,
    existing,
    { stage: nextStage as Stage | undefined, pendingSubStatus: nextPendingSubStatus as PendingSubStatus | undefined, remark },
    { name: user.name },
  )
  return NextResponse.json({ lead })
}
