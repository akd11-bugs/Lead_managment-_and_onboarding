import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import Google from 'next-auth/providers/google'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import { authConfig } from '@/lib/auth.config'
import { logAudit } from '@/lib/audit'

const MAX_FAILED_ATTEMPTS = 5
const LOCKOUT_MS = 15 * 60 * 1000

// .trim() guards against a trailing newline/whitespace sneaking into the env
// var value (e.g. via a copy-paste into a hosting dashboard) — Google rejects
// the client_id outright (invalid_client) if it doesn't match byte-for-byte.
const googleClientId = process.env.GOOGLE_CLIENT_ID?.trim()
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim()
const googleEnabled = !!googleClientId && !!googleClientSecret

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    // Credentials already fully validates isActive/lockout inside authorize()
    // below. Google's profile() (also below) always resolves to a real user
    // row, but doesn't itself deny sign-in — do that check here instead,
    // since `signIn` returning false is the documented way to deny.
    async signIn({ user, account }) {
      if (account?.provider !== 'google') return true
      const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { isActive: true } })
      return dbUser?.isActive !== false
    },
  },
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
        if (!user.passwordHash) {
          // Google-only account — no password was ever set.
          await logAudit({ action: 'login_failed', targetUserId: user.id, metadata: { email, reason: 'no_password_set' } })
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
    ...(googleEnabled
      ? [
          Google({
            clientId: googleClientId,
            clientSecret: googleClientSecret,
            // Maps the Google profile to our own User row instead of NextAuth's
            // default shape — finds-or-creates by email so a first-time Google
            // sign-in lands as a `pending` account (see app/pending/page.tsx
            // and proxy.ts) instead of silently getting default access.
            async profile(profile) {
              const email = String(profile.email ?? '').trim().toLowerCase()
              const existing = await prisma.user.findUnique({ where: { email } })
              if (existing) {
                await logAudit({
                  action: 'login_success',
                  actorUserId: existing.id,
                  targetUserId: existing.id,
                  metadata: { email, provider: 'google' },
                })
                return { id: existing.id, name: existing.name, email: existing.email, role: existing.role }
              }
              const created = await prisma.user.create({
                data: { name: profile.name ?? email, email, passwordHash: null, role: 'pending' },
              })
              await logAudit({ action: 'oauth_signup_pending', targetUserId: created.id, metadata: { email } })
              return { id: created.id, name: created.name, email: created.email, role: created.role }
            },
          }),
        ]
      : []),
  ],
})
