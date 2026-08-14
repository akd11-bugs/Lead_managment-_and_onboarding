import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireApiUser, isAdmin } from '@/lib/session'
import { logAudit } from '@/lib/audit'
import { readJsonBody } from '@/lib/http'

export const dynamic = 'force-dynamic'

const ROLES = ['admin', 'sales', 'operations']

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser()
  if (user instanceof NextResponse) return user
  if (!isAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  if (id === user.id) return NextResponse.json({ error: "You can't change your own account here" }, { status: 400 })

  const existing = await prisma.user.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await readJsonBody(req)
  if (body instanceof NextResponse) return body
  const nextRole = body.role !== undefined && ROLES.includes(body.role) ? body.role : undefined
  const nextIsActive = typeof body.isActive === 'boolean' ? body.isActive : undefined

  const reactivating = nextIsActive === true && !existing.isActive

  const updated = await prisma.user.update({
    where: { id },
    data: {
      ...(nextRole !== undefined && { role: nextRole }),
      ...(nextIsActive !== undefined && { isActive: nextIsActive }),
      ...(reactivating && { failedLoginAttempts: 0, lockedUntil: null }),
    },
  })

  if (nextRole !== undefined && nextRole !== existing.role) {
    await logAudit({
      action: 'user_role_changed',
      actorUserId: user.id,
      targetUserId: id,
      metadata: { from: existing.role, to: nextRole },
    })
  }
  if (nextIsActive !== undefined && nextIsActive !== existing.isActive) {
    await logAudit({
      action: nextIsActive ? 'user_activated' : 'user_deactivated',
      actorUserId: user.id,
      targetUserId: id,
    })
  }

  return NextResponse.json({
    user: { id: updated.id, name: updated.name, email: updated.email, role: updated.role, isActive: updated.isActive, createdAt: updated.createdAt },
  })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser()
  if (user instanceof NextResponse) return user
  if (!isAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  if (id === user.id) return NextResponse.json({ error: "You can't delete your own account" }, { status: 400 })

  const existing = await prisma.user.findUnique({ where: { id }, select: { id: true } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.user.delete({ where: { id } })
  await logAudit({ action: 'user_deleted', actorUserId: user.id, targetUserId: id })

  return NextResponse.json({ ok: true })
}
