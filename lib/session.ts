import { redirect } from 'next/navigation'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export interface SessionUser {
  id: string
  name: string
  email: string
  role: string
  orgId: string
  // Self + every descendant org (materialized-path rollup) for admin/operations;
  // just [orgId] for everyone else. Resolved once per request below so
  // leadScope() itself can stay a plain synchronous object builder.
  visibleOrgIds: string[]
}

export async function resolveVisibleOrgIds(orgId: string, role: string): Promise<string[]> {
  if (role !== 'admin' && role !== 'operations') return [orgId]
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT o.id FROM "Organization" o
    JOIN "Organization" self ON self.id = ${orgId}
    WHERE o.path LIKE self.path || '%'
  `
  return rows.map((r) => r.id)
}

async function hydrate(user: { id: string; name: string; email: string; role: string; orgId: string }): Promise<SessionUser> {
  const visibleOrgIds = await resolveVisibleOrgIds(user.orgId, user.role)
  return { ...user, visibleOrgIds }
}

// For Server Components/pages — sends anonymous visitors to /login.
export async function requireUser(): Promise<SessionUser> {
  const session = await auth()
  if (!session?.user) redirect('/login')
  return hydrate(session.user as SessionUser)
}

// For Route Handlers — a redirect would break `res.json()` on the client, so
// this returns a 401 instead. Callers must check `instanceof NextResponse`
// and return it directly.
export async function requireApiUser(): Promise<SessionUser | NextResponse> {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return hydrate(session.user as SessionUser)
}

export function isAdmin(user: SessionUser) {
  return user.role === 'admin'
}

export function isOperations(user: SessionUser) {
  return user.role === 'operations'
}

// True for a first-time Google sign-in with no role assigned yet — blocked
// from the app entirely (see proxy.ts) until an admin approves them.
export function isPending(user: SessionUser) {
  return user.role === 'pending'
}

// Admin/Operations see every lead in their org tree (self + descendant orgs
// via visibleOrgIds); Sales sees only leads they own, within their own org.
// The orgId filter applies to every role — it's the tenant boundary, never
// bypassed by role. Spread this into any `prisma.lead.findMany`/`findUnique`
// where clause.
export function leadScope(user: SessionUser) {
  return isAdmin(user) || isOperations(user)
    ? { orgId: { in: user.visibleOrgIds } }
    : { orgId: { in: user.visibleOrgIds }, ownerId: user.id }
}

// Where a role lands right after login / when hitting "/" directly.
export function roleHome(user: SessionUser) {
  return isOperations(user) ? '/onboarding' : '/'
}
