import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireApiUser, isAdmin } from '@/lib/session'
import { readJsonBody } from '@/lib/http'
import { createNeonAuthIdentity } from '@/lib/auth'
import { logAudit } from '@/lib/audit'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await requireApiUser()
  if (user instanceof NextResponse) return user
  if (!isAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const users = await prisma.user.findMany({
    where: { orgId: { in: user.visibleOrgIds } },
    orderBy: { createdAt: 'asc' },
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true, orgId: true },
  })
  return NextResponse.json({ users })
}

export async function POST(req: Request) {
  const user = await requireApiUser()
  if (user instanceof NextResponse) return user
  if (!isAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await readJsonBody(req)
  if (body instanceof NextResponse) return body
  const name = String(body.name ?? '').trim()
  const email = String(body.email ?? '').trim().toLowerCase()
  const password = String(body.password ?? '')
  const role = ['admin', 'sales', 'operations'].includes(body.role) ? body.role : 'sales'

  if (!name || !email || !password) {
    return NextResponse.json({ error: 'name, email, and password are required' }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return NextResponse.json({ error: 'Email already in use' }, { status: 409 })

  // See lib/auth.ts's createNeonAuthIdentity doc comment for why this can't
  // just use the `neonAuth` instance here. The request's own origin is
  // already trusted, since the admin reached this route through the app.
  const signUp = await createNeonAuthIdentity({ email, password, name, origin: new URL(req.url).origin })
  if (!signUp.ok) {
    return NextResponse.json({ error: signUp.message }, { status: signUp.reason === 'not_configured' ? 500 : 409 })
  }

  const created = await prisma.user.create({
    data: { orgId: user.orgId, name, email, passwordHash: null, role },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  })
  await logAudit({ action: 'user_created', actorUserId: user.id, targetUserId: created.id, metadata: { email, role } })
  return NextResponse.json({ user: created })
}
