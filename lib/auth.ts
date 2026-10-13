import { createNeonAuth } from '@neondatabase/auth/next/server'

// Single Neon Auth instance — identity/session only. Our own `role`/`orgId`/
// `isActive`/pending-approval business logic lives in lib/session.ts, which
// maps a Neon Auth identity onto our own `User` table by email (see
// resolveAppUser there). Safe to import from Edge middleware (proxy.ts) too —
// unlike the old setup, this has no Prisma/bcrypt dependency at all.
export const neonAuth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL!,
  cookies: {
    secret: process.env.NEON_AUTH_COOKIE_SECRET!,
  },
})

export type CreateNeonAuthIdentityResult =
  | { ok: true }
  | { ok: false; reason: 'not_configured' | 'signup_failed'; message: string }

/**
 * Creates a credential identity directly against Neon Auth's REST API,
 * bypassing the `neonAuth` instance above. Two call sites need this instead
 * of `neonAuth.signUp.email()`: scripts/create-admin.ts (a standalone CLI
 * script with no Next.js request context for `neonAuth` to attach cookies
 * to) and app/api/users/route.ts (an admin creating another user — using
 * `neonAuth` there would attach the *new* user's session cookie to the
 * admin's own response). A plain out-of-band fetch sidesteps both problems.
 *
 * Neon Auth requires an Origin header (or an absolute callbackURL), checked
 * against this project's trusted origins — pass the real request's origin
 * when there is one, or a trusted fallback (e.g. ADMIN_ORIGIN) when there
 * isn't.
 */
export async function createNeonAuthIdentity(input: {
  email: string
  password: string
  name: string
  origin: string
}): Promise<CreateNeonAuthIdentityResult> {
  const neonAuthBaseUrl = process.env.NEON_AUTH_BASE_URL
  if (!neonAuthBaseUrl) {
    return { ok: false, reason: 'not_configured', message: 'Server misconfigured: NEON_AUTH_BASE_URL is not set' }
  }

  const res = await fetch(`${neonAuthBaseUrl}/sign-up/email`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: input.origin },
    body: JSON.stringify({ email: input.email, password: input.password, name: input.name }),
  })
  if (res.ok) return { ok: true }

  const detail = await res.json().catch(() => null)
  return {
    ok: false,
    reason: 'signup_failed',
    message: detail?.message || 'Could not create the login for this user — try again',
  }
}

export type SignUpNeonAuthAccountResult = { ok: true } | { ok: false; message: string }

/**
 * Thin wrapper around `neonAuth.signUp.email()` with a consistent fallback
 * error message — shared by the two self-serve account-creation routes
 * (app/api/signup/complete, app/api/invites/redeem). Each of those claims
 * its own token/invite before calling this, and rolls that claim back if it
 * fails, so the claim/release logic stays in the route, not here.
 */
export async function signUpNeonAuthAccount(input: {
  email: string
  password: string
  name: string
}): Promise<SignUpNeonAuthAccountResult> {
  const { error } = await neonAuth.signUp.email(input)
  if (error) return { ok: false, message: error.message || 'Could not create your account — try again' }
  return { ok: true }
}
