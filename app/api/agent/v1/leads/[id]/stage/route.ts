import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAgentOrg, AGENT_ACTOR_NAME } from '@/lib/agentAuth'
import { readJsonBody } from '@/lib/http'
import { validateLeadFields } from '@/lib/types'
import { getStageDefinitions } from '@/lib/pipelineConfig'
import { applyStageChange, resolveOpsAssignment } from '@/lib/leadStage'

export const dynamic = 'force-dynamic'

// Same core as every other stage-change entry point (Kanban drag, the lead
// detail dialog) — applyStageChange() fires the org's configured workflow
// rules exactly as if a human had dragged the card. An agent can move a
// deal's stage, same as a rep; it still cannot bypass the required remark
// or an invalid ops assignment, same validation as everywhere else.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const agentOrg = await requireAgentOrg(req)
  if (agentOrg instanceof NextResponse) return agentOrg
  const { id } = await params

  const body = await readJsonBody(req)
  if (body instanceof NextResponse) return body
  if (!body.remark || !String(body.remark).trim()) {
    return NextResponse.json({ error: 'remark is required — what happened, in one line' }, { status: 400 })
  }

  const lead = await prisma.lead.findFirst({
    where: { id, orgId: agentOrg.orgId },
    include: { company: true, person: true },
  })
  if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

  const stageDefs = await getStageDefinitions(agentOrg.orgId)
  const validationError = validateLeadFields(body, { validStageKeys: stageDefs.map((s) => s.key) })
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 })

  let assignedOpsName: string | undefined
  if (body.assignedOpsId) {
    const ops = await resolveOpsAssignment(String(body.assignedOpsId), [agentOrg.orgId])
    if (!ops) return NextResponse.json({ error: 'assignedOpsId does not match an active operations user in this org' }, { status: 400 })
    assignedOpsName = ops.name
  }

  const updated = await applyStageChange(
    lead.id,
    lead,
    {
      stage: body.stage,
      pendingSubStatus: body.pendingSubStatus,
      remark: String(body.remark),
      assignedOpsId: body.assignedOpsId,
      assignedOpsName,
    },
    { name: AGENT_ACTOR_NAME },
  )
  return NextResponse.json({ lead: { id: updated.id, stage: updated.stage, pendingSubStatus: updated.pendingSubStatus } })
}
