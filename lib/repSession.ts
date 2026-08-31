import crypto from 'crypto'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'
import type { SessionUser } from '@/lib/session'

const COOKIE_NAME = 'rep_session'
const MAX_AGE_SECONDS = 10 * 60 * 60 // 10h

function secret() {
  const s = process.env.REP_SESSION_SECRET
  if (!s) throw new Error('REP_SESSION_SECRET is not set')
  return s
}

function sign(payload: string) {
  return crypto.createHmac('sha256', secret()).update(payload).digest('hex')
}

// Token shape: "<userId>.<expiryMs>.<hmac>" — kept out of NextAuth entirely
// (separate cookie, separate secret, separate path) so a real dashboard
// session never grants rep access and vice versa.
function makeToken(userId: string, expiresAt: number) {
  const payload = `${userId}.${expiresAt}`
  return `${payload}.${sign(payload)}`
}

function verifyToken(token: string): { userId: string; expiresAt: number } | null {
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [userId, expiresAtRaw, mac] = parts
  const payload = `${userId}.${expiresAtRaw}`
  const expected = sign(payload)
  const a = Buffer.from(mac)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null
  const expiresAt = Number(expiresAtRaw)
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return null
  return { userId, expiresAt }
}

export async function setRepSessionCookie(userId: string) {
  const expiresAt = Date.now() + MAX_AGE_SECONDS * 1000
  const store = await cookies()
  store.set(COOKIE_NAME, makeToken(userId, expiresAt), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/rep',
    maxAge: MAX_AGE_SECONDS,
  })
}

export async function clearRepSessionCookie() {
  const store = await cookies()
  store.delete({ name: COOKIE_NAME, path: '/rep' })
}

// Re-reads the User row fresh on every call — a deactivated account or a
// role change is rejected on its very next request, not just once the token
// naturally expires. Returns a plain SessionUser so it plugs directly into
// the existing leadScope()/isAdmin()/isOperations() helpers unmodified.
export async function getRepSessionUser(): Promise<SessionUser | null> {
  const store = await cookies()
  const token = store.get(COOKIE_NAME)?.value
  if (!token) return null
  const verified = verifyToken(token)
  if (!verified) return null

  const user = await prisma.user.findUnique({
    where: { id: verified.userId },
    select: { id: true, name: true, email: true, role: true, isActive: true, pinHash: true },
  })
  if (!user || !user.isActive || !user.pinHash) return null

  return { id: user.id, name: user.name, email: user.email, role: user.role }
}
