import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import { requireApiUser, isAdmin } from '@/lib/session'
import { logAudit } from '@/lib/audit'
import { readJsonBody } from '@/lib/http'

export const dynamic = 'force-dynamic'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser()
  if (user instanceof NextResponse) return user
  if (!isAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params

  const existing = await prisma.user.findUnique({ where: { id }, select: { id: true } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await readJsonBody(req)
  if (body instanceof NextResponse) return body
  const pin = String(body?.pin ?? '')
  if (!/^\d{6}$/.test(pin)) {
    return NextResponse.json({ error: 'PIN must be exactly 6 digits' }, { status: 400 })
  }

  const pinHash = await bcrypt.hash(pin, 10)
  await prisma.user.update({
    where: { id },
    data: { pinHash, pinFailedAttempts: 0, pinLockedUntil: null },
  })
  await logAudit({ action: 'user_pin_reset', actorUserId: user.id, targetUserId: id })

  return NextResponse.json({ ok: true })
}
