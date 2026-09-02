import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import { logAudit } from '@/lib/audit'

const MAX_FAILED_ATTEMPTS = 5
const LOCKOUT_MS = 15 * 60 * 1000

export type RepLoginResult =
  | { ok: true; userId: string }
  | { ok: false; status: 401 | 423; error: string }

// Separate lockout counters from the real dashboard password (User.pinHash /
// pinFailedAttempts / pinLockedUntil) — a rep locked out of the PIN form
// shouldn't lock their dashboard login, or vice versa.
//
// Identified by name (not email) — User.name has no unique constraint, so a
// duplicate name is treated as a failed login rather than silently picking
// one of the matches; an admin should rename one of them if this ever fires.
export async function verifyRepLogin(name: string, pin: string): Promise<RepLoginResult> {
  const normalizedName = name.trim()
  const matches = await prisma.user.findMany({
    where: { name: { equals: normalizedName, mode: 'insensitive' } },
  })
  const user = matches.length === 1 ? matches[0] : null

  if (!user || !user.isActive || !user.pinHash) {
    const reason = matches.length > 1 ? 'ambiguous_name' : 'no_pin_set'
    await logAudit({ action: 'rep_login_failed', metadata: { name: normalizedName, reason } })
    return { ok: false, status: 401, error: 'Invalid name or PIN' }
  }

  if (user.pinLockedUntil && user.pinLockedUntil > new Date()) {
    await logAudit({ action: 'rep_login_locked', targetUserId: user.id, metadata: { name: normalizedName } })
    return { ok: false, status: 423, error: 'Too many attempts — try again in 15 minutes' }
  }

  const valid = await bcrypt.compare(pin, user.pinHash)
  if (!valid) {
    const attempts = user.pinFailedAttempts + 1
    const lockingNow = attempts >= MAX_FAILED_ATTEMPTS
    await prisma.user.update({
      where: { id: user.id },
      data: {
        pinFailedAttempts: attempts,
        pinLockedUntil: lockingNow ? new Date(Date.now() + LOCKOUT_MS) : user.pinLockedUntil,
      },
    })
    await logAudit({
      action: lockingNow ? 'rep_login_locked' : 'rep_login_failed',
      targetUserId: user.id,
      metadata: { name: normalizedName, attempts },
    })
    return {
      ok: false,
      status: lockingNow ? 423 : 401,
      error: lockingNow ? 'Too many attempts — try again in 15 minutes' : 'Invalid name or PIN',
    }
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { pinFailedAttempts: 0, pinLockedUntil: null },
  })
  await logAudit({ action: 'rep_login_success', actorUserId: user.id, targetUserId: user.id, metadata: { name: normalizedName } })

  return { ok: true, userId: user.id }
}
