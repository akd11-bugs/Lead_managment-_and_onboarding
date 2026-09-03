import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { runSkill } from '@/lib/skills/runner'
import { requireApiUser, leadScope } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const user = await requireApiUser()
  if (user instanceof NextResponse) return user
  let body: any = {}
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { skillId, leadId, userQuestion } = body ?? {}
  if (!skillId) return NextResponse.json({ error: 'skillId required' }, { status: 400 })

  if (leadId) {
    const owned = await prisma.lead.findFirst({ where: { id: leadId, ...leadScope(user) }, select: { id: true } })
    if (!owned) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Load data the skill needs — scoped to what this user is allowed to see
  const leads = await prisma.lead.findMany({
    where: leadScope(user),
    include: { activities: { orderBy: { date: 'desc' } } },
    orderBy: { updatedAt: 'desc' },
  })

  // Determine scope
  const scope: 'portfolio' | 'lead' = leadId ? 'lead' : 'portfolio'

  const result = await runSkill({
    skillId,
    scope,
    leadId,
    leads: leads as any,
    userQuestion,
  })

  if (!result.ok) {
    return NextResponse.json(result, { status: 500 })
  }

  // Persist the run
  try {
    const run = await prisma.skillRun.create({
      data: {
        skillId: result.skillId,
        skillName: result.skillName,
        scope,
        runnerType: result.runnerType,
        inputJson: JSON.stringify({ leadCount: leads.length, leadId, userQuestion }),
        outputMarkdown: result.outputMarkdown,
        outputStructured: result.outputStructured ? JSON.stringify(result.outputStructured) : null,
        leadId: leadId ?? null,
      },
    })
    return NextResponse.json({ ...result, runId: run.id })
  } catch (err) {
    // Persistence failed but skill ran — return the result anyway, without
    // leaking the raw Prisma error (can reveal schema/column details).
    console.error('Failed to persist skill run', err)
    return NextResponse.json({ ...result, persistenceError: 'Failed to save this run to history' })
  }
}