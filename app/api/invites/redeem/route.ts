import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import { logAudit } from '@/lib/audit'
import { readJsonBody } from '@/lib/http'

export const dynamic = 'force-dynamic'

// Public route — no requireApiUser(). Anyone with a valid, still-pending
// invite code can redeem it into a real account. Excluded from proxy.ts's
// auth wall (see the matcher there).
export async function POST(req: Request) {
  const body = await readJsonBody(req)
  if (body instanceof NextResponse) return body
  const code = String(body.code ?? '').trim()
  const email = String(body.email ?? '').trim().toLowerCase()
  const password = String(body.password ?? '')

  if (!code || !email || !password) {
    return NextResponse.json({ error: 'code, email, and password are required' }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  }

  const existingUser = await prisma.user.findUnique({ where: { email } })
  if (existingUser) {
    return NextResponse.json({ error: 'That email is already registered — log in instead' }, { status: 409 })
  }

  const passwordHash = await bcrypt.hash(password, 10)

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Atomically claim the invite — closes the race where two requests
      // redeem the same code at once.
      const claim = await tx.invite.updateMany({
        where: { code, status: 'pending' },
        data: { status: 'redeemed', redeemedAt: new Date() },
      })
      if (claim.count !== 1) return null

      const invite = await tx.invite.findUnique({ where: { code } })
      if (!invite) return null

      const user = await tx.user.create({
        data: { name: invite.name, email, passwordHash, role: invite.role, isActive: true },
      })
      await tx.invite.update({ where: { id: invite.id }, data: { redeemedByUserId: user.id } })

      return { user, invite }
    })

    if (!result) {
      return NextResponse.json({ error: 'Invalid or already-used invite code' }, { status: 410 })
    }

    await logAudit({
      action: 'invite_redeemed',
      actorUserId: result.user.id,
      targetUserId: result.user.id,
      targetInviteId: result.invite.id,
      metadata: { email },
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'That email is already registered — log in instead' }, { status: 409 })
  }
}
