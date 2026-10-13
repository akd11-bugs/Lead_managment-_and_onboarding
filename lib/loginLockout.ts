import { prisma } from '@/lib/db'
import { neonAuth } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { checkRateLimit, getClientIpFromHeaders } from '@/lib/rateLimit'

// Kept out of lib/auth.ts on purpose — that file is imported by proxy.ts
// (Edge middleware) and must stay free of Prisma, which can't run there.
// This one is only ever called from the server action in app/login/page.tsx
// (a normal Node.js request), never from the Edge.

const MAX_FAILED_ATTEMPTS = 5
const LOCKOUT_MS = 15 * 60 * 1000
const MAX_ATTEMPTS_PER_IP = 20
const IP_WINDOW_MS = 15 * 60 * 1000

export type SignInResult =
  | { ok: true }
  | { ok: false; status: 401 | 423 | 429; message: string }

/**
 * Wraps neonAuth.signIn.email() with the same per-account lockout pattern
 * already used for rep PIN logins (lib/repAuth.ts's verifyRepLogin) plus an
 * IP-level rate limit, same family as every other login/signup endpoint
 * (lib/rateLimit.ts's callers). Without this, the admin/sales password login
 * had zero brute-force protection of its own — User.failedLoginAttempts /
 * lockedUntil already existed in the schema but nothing ever wrote to them.
 */
export async function signInWithLockout(email: string, password: string): Promise<SignInResult> {
  const normalizedEmail = email.trim().toLowerCase()

  const ip = await getClientIpFromHeaders()
  const ipLimit = checkRateLimit(`login:${ip}`, MAX_ATTEMPTS_PER_IP, IP_WINDOW_MS)
  if (!ipLimit.allowed) {
    return { ok: false, status: 429, message: 'Too many attempts — try again later' }
  }

  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } })

  if (user?.lockedUntil && user.lockedUntil > new Date()) {
    await logAudit({ action: 'login_locked', targetUserId: user.id, metadata: { email: normalizedEmail } })
    return { ok: false, status: 423, message: 'Too many attempts — try again in 15 minutes' }
  }

  const { error } = await neonAuth.signIn.email({ email: normalizedEmail, password })

  if (error) {
    if (user) {
      const attempts = user.failedLoginAttempts + 1
      const lockingNow = attempts >= MAX_FAILED_ATTEMPTS
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: attempts,
          lockedUntil: lockingNow ? new Date(Date.now() + LOCKOUT_MS) : user.lockedUntil,
        },
      })
      await logAudit({
        action: lockingNow ? 'login_locked' : 'login_failed',
        targetUserId: user.id,
        metadata: { email: normalizedEmail, attempts },
      })
      if (lockingNow) return { ok: false, status: 423, message: 'Too many attempts — try again in 15 minutes' }
    }
    return { ok: false, status: 401, message: 'Invalid email or password' }
  }

  if (user) {
    await prisma.user.update({ where: { id: user.id }, data: { failedLoginAttempts: 0, lockedUntil: null } })
    await logAudit({ action: 'login_success', actorUserId: user.id, targetUserId: user.id, metadata: { email: normalizedEmail } })
  }

  return { ok: true }
}
