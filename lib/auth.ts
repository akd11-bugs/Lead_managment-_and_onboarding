import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import { authConfig } from '@/lib/auth.config'
import { logAudit } from '@/lib/audit'

const MAX_FAILED_ATTEMPTS = 5
const LOCKOUT_MS = 15 * 60 * 1000

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? '').trim().toLowerCase()
        const password = String(credentials?.password ?? '')
        if (!email || !password) return null

        const user = await prisma.user.findUnique({ where: { email } })
        if (!user) return null

        if (!user.isActive) {
          await logAudit({ action: 'login_failed', targetUserId: user.id, metadata: { email, reason: 'inactive' } })
          return null
        }
        if (user.lockedUntil && user.lockedUntil > new Date()) {
          await logAudit({ action: 'login_locked', targetUserId: user.id, metadata: { email } })
          return null
        }

        const valid = await bcrypt.compare(password, user.passwordHash)
        if (!valid) {
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
            metadata: { email, attempts },
          })
          return null
        }

        await prisma.user.update({
          where: { id: user.id },
          data: { failedLoginAttempts: 0, lockedUntil: null },
        })
        await logAudit({ action: 'login_success', actorUserId: user.id, targetUserId: user.id, metadata: { email } })

        return { id: user.id, name: user.name, email: user.email, role: user.role }
      },
    }),
  ],
})
