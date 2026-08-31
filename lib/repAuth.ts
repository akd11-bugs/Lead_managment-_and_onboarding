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
export async function verifyRepLogin(email: string, pin: string): Promise<RepLoginResult> {
  const normalizedEmail = email.trim().toLowerCase()
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } })

  if (!user || !user.isActive || !user.pinHash) {
    await logAudit({ action: 'rep_login_failed', metadata: { email: normalizedEmail, reason: 'no_pin_set' } })
    return { ok: false, status: 401, error: 'Invalid email or PIN' }
  }

  if (user.pinLockedUntil && user.pinLockedUntil > new Date()) {
    await logAudit({ action: 'rep_login_locked', targetUserId: user.id, metadata: { email: normalizedEmail } })
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
      metadata: { email: normalizedEmail, attempts },
    })
    return {
      ok: false,
      status: lockingNow ? 423 : 401,
      error: lockingNow ? 'Too many attempts — try again in 15 minutes' : 'Invalid email or PIN',
    }
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { pinFailedAttempts: 0, pinLockedUntil: null },
  })
  await logAudit({ action: 'rep_login_success', actorUserId: user.id, targetUserId: user.id, metadata: { email: normalizedEmail } })

  return { ok: true, userId: user.id }
}
