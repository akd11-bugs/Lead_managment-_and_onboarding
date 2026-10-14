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

  const org = await prisma.organization.findUnique({ where: { id: user.orgId }, select: { reportsApiKey: true } })
  return NextResponse.json({ reportsApiKey: org?.reportsApiKey ?? null })
}

// Generates (or regenerates) this org's own key for GET /api/external/reports
// — scoped so it can only ever return this org's own numbers. Regenerating
// immediately invalidates the previous key, same as rotating any other
// credential.
export async function POST() {
  const user = await requireApiUser()
  if (user instanceof NextResponse) return user
  if (!isAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const reportsApiKey = generateRandomToken(32)
  await prisma.organization.update({ where: { id: user.orgId }, data: { reportsApiKey } })
  await logAudit({ action: 'reports_api_key_generated', actorUserId: user.id, metadata: { orgId: user.orgId } })

  return NextResponse.json({ reportsApiKey })
}

export async function DELETE() {
  const user = await requireApiUser()
  if (user instanceof NextResponse) return user
  if (!isAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await prisma.organization.update({ where: { id: user.orgId }, data: { reportsApiKey: null } })
  await logAudit({ action: 'reports_api_key_revoked', actorUserId: user.id, metadata: { orgId: user.orgId } })

  return NextResponse.json({ ok: true })
}
