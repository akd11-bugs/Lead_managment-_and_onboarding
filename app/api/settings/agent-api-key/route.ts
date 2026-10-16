import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireApiUser, isAdmin } from '@/lib/session'
import { generateRandomToken } from '@/lib/crypto'
import { logAudit } from '@/lib/audit'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await requireApiUser()
  if (user instanceof NextResponse) return user
  if (!isAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const org = await prisma.organization.findUnique({ where: { id: user.orgId }, select: { agentApiKey: true } })
  return NextResponse.json({ agentApiKey: org?.agentApiKey ?? null })
}

// Generates (or regenerates) this org's key for the agent-facing write API
// (app/api/agent/v1/*) — regenerating immediately invalidates the previous
// key, same as rotating any other credential.
export async function POST() {
  const user = await requireApiUser()
  if (user instanceof NextResponse) return user
  if (!isAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const agentApiKey = generateRandomToken(32)
  await prisma.organization.update({ where: { id: user.orgId }, data: { agentApiKey } })
  await logAudit({ action: 'agent_api_key_generated', actorUserId: user.id, metadata: { orgId: user.orgId } })

  return NextResponse.json({ agentApiKey })
}

export async function DELETE() {
  const user = await requireApiUser()
  if (user instanceof NextResponse) return user
  if (!isAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await prisma.organization.update({ where: { id: user.orgId }, data: { agentApiKey: null } })
  await logAudit({ action: 'agent_api_key_revoked', actorUserId: user.id, metadata: { orgId: user.orgId } })

  return NextResponse.json({ ok: true })
}
