import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import { logAudit } from '@/lib/audit'
import { readJsonBody } from '@/lib/http'

export const dynamic = 'force-dynamic'

// Public route — no requireApiUser(). Finishes account creation for a
// signup link requested via /api/signup/request. Excluded from proxy.ts's
// auth wall. Always creates a 'pending' account — an admin must still
// assign a real role from Organisation before the account can do anything.
export async function POST(req: Request) {
  const body = await readJsonBody(req)
  if (body instanceof NextResponse) return body
  const token = String(body.token ?? '').trim()
  const name = String(body.name ?? '').trim()
  const password = String(body.password ?? '')

  if (!token || !name || !password) {
    return NextResponse.json({ error: 'token, name, and password are required' }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  }

  const passwordHash = await bcrypt.hash(password, 10)

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Atomically claim the token — closes the race where two requests
      // complete the same link at once.
      const claim = await tx.signupToken.updateMany({
        where: { token, usedAt: null, expiresAt: { gt: new Date() } },
        data: { usedAt: new Date() },
      })
      if (claim.count !== 1) return null

      const signupToken = await tx.signupToken.findUnique({ where: { token } })
      if (!signupToken) return null

      const existingUser = await tx.user.findUnique({ where: { email: signupToken.email } })
      if (existingUser) return 'already-registered' as const

      const user = await tx.user.create({
        data: { name, email: signupToken.email, passwordHash, role: 'pending', isActive: true },
      })

      return { user }
    })

    if (result === null) {
      return NextResponse.json({ error: 'This link is invalid or has expired' }, { status: 410 })
    }
    if (result === 'already-registered') {
      return NextResponse.json({ error: 'That email is already registered — log in instead' }, { status: 409 })
    }

    await logAudit({
      action: 'signup_pending',
      actorUserId: result.user.id,
      targetUserId: result.user.id,
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'That email is already registered — log in instead' }, { status: 409 })
  }
}
