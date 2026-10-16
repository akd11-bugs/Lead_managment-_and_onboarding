import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAgentOrg, AGENT_ACTOR_NAME } from '@/lib/agentAuth'
import { readJsonBody } from '@/lib/http'

export const dynamic = 'force-dynamic'

const ACTIVITY_TYPES = ['call', 'email', 'note', 'meeting', 'stage_change'] as const

// Logs a plain activity note on a lead — e.g. a summary of a call the agent
// just made, or an email it sent — without necessarily moving the stage
// (use PATCH .../stage for that, which fires workflow rules; this never
// does). Shows up in the same Activity timeline a human's notes do,
// authored as "AI Agent" so it's never mistaken for a rep's own words.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const agentOrg = await requireAgentOrg(req)
  if (agentOrg instanceof NextResponse) return agentOrg
  const { id } = await params

  const body = await readJsonBody(req)
  if (body instanceof NextResponse) return body
  if (!body.description || !String(body.description).trim()) {
    return NextResponse.json({ error: 'description is required' }, { status: 400 })
  }
  const type = body.type ?? 'note'
  if (!ACTIVITY_TYPES.includes(type)) {
    return NextResponse.json({ error: `type must be one of ${ACTIVITY_TYPES.join(', ')}` }, { status: 400 })
  }

  const lead = await prisma.lead.findFirst({ where: { id, orgId: agentOrg.orgId }, select: { id: true, orgId: true } })
  if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

  const activity = await prisma.activity.create({
    data: {
      orgId: lead.orgId,
      leadId: lead.id,
      type,
      description: String(body.description).trim(),
      authorName: AGENT_ACTOR_NAME,
    },
  })
  await prisma.lead.update({ where: { id: lead.id }, data: { lastActivityAt: new Date() } })

  return NextResponse.json({ activity: { id: activity.id, type: activity.type, description: activity.description, date: activity.date } }, { status: 201 })
}
