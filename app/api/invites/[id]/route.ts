import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireApiUser, isAdmin } from '@/lib/session'
import { logAudit } from '@/lib/audit'

export const dynamic = 'force-dynamic'

export async function PATCH(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser()
  if (user instanceof NextResponse) return user
  if (!isAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params

  const existing = await prisma.invite.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (existing.status !== 'pending') {
    return NextResponse.json({ error: 'Only pending invites can be revoked' }, { status: 400 })
  }

  const invite = await prisma.invite.update({ where: { id }, data: { status: 'revoked' } })
  await logAudit({ action: 'invite_revoked', actorUserId: user.id, targetInviteId: invite.id })

  return NextResponse.json({ invite })
}
