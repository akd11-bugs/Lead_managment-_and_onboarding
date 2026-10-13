import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { logAudit } from '@/lib/audit'
import { readJsonBody } from '@/lib/http'
import { isValidEmail } from '@/lib/types'
import { checkRateLimit, getClientIp } from '@/lib/rateLimit'
import { signUpNeonAuthAccount } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// Public route — no requireApiUser(). Anyone with a valid, still-pending
// invite code can redeem it into a real account. Excluded from proxy.ts's
// auth wall (see the matcher there). The code itself has ~48 bits of entropy
// (see app/api/invites/route.ts) so isn't practically brute-forceable today,
// but there was previously nothing at all rate-limiting guesses against it —
// this is defense-in-depth in case that entropy is ever reduced.
export async function POST(req: Request) {
  const ip = getClientIp(req)
  const rateLimit = checkRateLimit(`invite-redeem:${ip}`, 20, 15 * 60 * 1000)
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many attempts — try again later' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } },
    )
  }

  const body = await readJsonBody(req)
  if (body instanceof NextResponse) return body
  const code = String(body.code ?? '').trim()
  const email = String(body.email ?? '').trim().toLowerCase()
  const password = String(body.password ?? '')

  if (!code || !email || !password) {
    return NextResponse.json({ error: 'code, email, and password are required' }, { status: 400 })
  }
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: 'A valid email is required' }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  }

  const existingUser = await prisma.user.findUnique({ where: { email } })
  if (existingUser) {
    return NextResponse.json({ error: 'That email is already registered — log in instead' }, { status: 409 })
  }

  const found = await prisma.invite.findUnique({ where: { code } })
  if (!found || found.status !== 'pending') {
    return NextResponse.json({ error: 'Invalid or already-used invite code' }, { status: 410 })
  }

  // Claims the invite atomically (closes the race where two requests redeem
  // the same code at once) — unless it's a reusable link, which is
  // deliberately never consumed; it stays "pending" for the next person
  // until an admin revokes it. The actual account — the Neon Auth
  // credential identity, then our own User row — is created below, outside
  // any transaction, since signUp is a network call.
  let invite: { id: string; orgId: string; name: string | null; role: string; isReusable: boolean }
  if (found.isReusable) {
    invite = found
  } else {
    try {
      const claimed = await prisma.$transaction(async (tx) => {
        const claim = await tx.invite.updateMany({
          where: { code, status: 'pending' },
          data: { status: 'redeemed', redeemedAt: new Date() },
        })
        if (claim.count !== 1) return null
        return tx.invite.findUnique({ where: { code } })
      })
      if (!claimed) {
        return NextResponse.json({ error: 'Invalid or already-used invite code' }, { status: 410 })
      }
      invite = claimed
    } catch {
      return NextResponse.json({ error: 'Invalid or already-used invite code' }, { status: 410 })
    }
  }

  // A reusable link doesn't name anyone in advance — the redeemer supplies
  // their own name. A regular, one-person invite already has it.
  const redeemerName = invite.isReusable ? String(body.name ?? '').trim() : invite.name
  if (!redeemerName) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }

  // Creates the actual credential identity in Neon Auth — /login's
  // email/password sign-in checks against this, not our own passwordHash
  // column (kept null from here on; Neon Auth owns password verification).
  const signUp = await signUpNeonAuthAccount({ email, password, name: redeemerName })
  if (!signUp.ok) {
    // The invite was already atomically claimed above, but no account got
    // created — release it back to 'pending' so the same code can be
    // retried instead of being silently burned. (A no-op for a reusable
    // link, which was never flipped to begin with.)
    if (!invite.isReusable) {
      await prisma.invite.update({ where: { id: invite.id }, data: { status: 'pending', redeemedAt: null } })
    }
    return NextResponse.json({ error: signUp.message }, { status: 409 })
  }

  const user = await prisma.user.create({
    data: { orgId: invite.orgId, name: redeemerName, email, passwordHash: null, role: invite.role, isActive: true },
  })
  // For a reusable link, this only ever reflects the most recent redeemer —
  // the full history of everyone who's used it lives in the audit log
  // below, not this single-value pointer.
  await prisma.invite.update({ where: { id: invite.id }, data: { redeemedByUserId: user.id } })

  await logAudit({
    action: 'invite_redeemed',
    actorUserId: user.id,
    targetUserId: user.id,
    targetInviteId: invite.id,
    metadata: { email },
  })

  return NextResponse.json({ ok: true })
}
