import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { leadScope } from '@/lib/session'
import { getRepSessionUser } from '@/lib/repSession'
import { STAGES, type Stage } from '@/lib/types'
import { readJsonBody } from '@/lib/http'
import { applyStageChange } from '@/lib/leadStage'

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

// Stage-only — reps change stage and add remarks here, nothing else. Full
// field edits stay on the dashboard's PATCH /api/leads/[id].
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getRepSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const body = await readJsonBody(req)
  if (body instanceof NextResponse) return body

  const nextStage = body?.stage
  if (typeof nextStage !== 'string' || !STAGES.includes(nextStage as Stage)) {
    return NextResponse.json({ error: `Invalid stage: ${nextStage}` }, { status: 400 })
  }

  const existing = await prisma.lead.findFirst({
    where: { id, ...leadScope(user) },
    select: { stage: true, onboardedAt: true, onboardingSubStage: true },
  })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const lead = await applyStageChange(id, existing, nextStage, { name: user.name })
  return NextResponse.json({ lead })
}
