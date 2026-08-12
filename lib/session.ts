import { redirect } from 'next/navigation'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

export interface SessionUser {
  id: string
  name: string
  email: string
  role: string
}

// For Server Components/pages — sends anonymous visitors to /login.
export async function requireUser(): Promise<SessionUser> {
  const session = await auth()
  if (!session?.user) redirect('/login')
  return session.user as SessionUser
}

// For Route Handlers — a redirect would break `res.json()` on the client, so
// this returns a 401 instead. Callers must check `instanceof NextResponse`
// and return it directly.
export async function requireApiUser(): Promise<SessionUser | NextResponse> {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return session.user as SessionUser
}

export function isAdmin(user: SessionUser) {
  return user.role === 'admin'
}

export function isOperations(user: SessionUser) {
  return user.role === 'operations'
}

// Admin sees the whole portfolio; Sales sees only leads they own; Operations
// sees every lead too (they manage onboarding across all reps' merchants).
// Spread this into any `prisma.lead.findMany`/`findUnique` where clause.
export function leadScope(user: SessionUser) {
  return isAdmin(user) || isOperations(user) ? {} : { ownerId: user.id }
}

// Where a role lands right after login / when hitting "/" directly.
export function roleHome(user: SessionUser) {
  return isOperations(user) ? '/onboarding' : '/'
}
