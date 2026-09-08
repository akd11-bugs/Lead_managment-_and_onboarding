import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireApiUser, isAdmin } from '@/lib/session'
import { readJsonBody } from '@/lib/http'
import { createChildOrganization } from '@/lib/org'

export const dynamic = 'force-dynamic'

// Returns every org visible to the caller — self + descendants for an
// admin/operations rollup (see lib/session.ts's visibleOrgIds), just their
// own org for anyone else.
export async function GET() {
  const user = await requireApiUser()
  if (user instanceof NextResponse) return user
  const organizations = await prisma.organization.findMany({
    where: { id: { in: user.visibleOrgIds } },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json({ organizations })
}

// Creates a child org under the caller's own org. Admin-only — mirrors the
// admin-only gate on /api/invites and /api/users. The new org's path is
// computed from the parent's (lib/org.ts), so it immediately participates in
// the parent's rollup visibility.
export async function POST(req: Request) {
  const user = await requireApiUser()
  if (user instanceof NextResponse) return user
  if (!isAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await readJsonBody(req)
  if (body instanceof NextResponse) return body
  const name = String(body.name ?? '').trim()
  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 })

  // Admins can create a child anywhere in their own visible tree (not just
  // directly under their own org), so a root admin can build out multiple
  // levels without needing to be signed into the intermediate org.
  const parentOrgId = typeof body.parentOrgId === 'string' && body.parentOrgId ? body.parentOrgId : user.orgId
  if (!user.visibleOrgIds.includes(parentOrgId)) {
    return NextResponse.json({ error: 'parentOrgId must be within your own organization tree' }, { status: 403 })
  }

  const organization = await createChildOrganization(parentOrgId, name)
  return NextResponse.json({ organization })
}
