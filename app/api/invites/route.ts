import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireApiUser, isAdmin } from '@/lib/session'
import { logAudit } from '@/lib/audit'
import { readJsonBody } from '@/lib/http'
import { generateRandomToken } from '@/lib/crypto'

export const dynamic = 'force-dynamic'

const ROLES = ['admin', 'sales', 'operations']

export async function GET() {
  const user = await requireApiUser()
  if (user instanceof NextResponse) return user
  if (!isAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const invites = await prisma.invite.findMany({
    where: { orgId: { in: user.visibleOrgIds } },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({ invites })
}

export async function POST(req: Request) {
  const user = await requireApiUser()
  if (user instanceof NextResponse) return user
  if (!isAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await readJsonBody(req)
  if (body instanceof NextResponse) return body
  const isReusable = body.isReusable === true
  const name = String(body.name ?? '').trim()
  const role = ROLES.includes(body.role) ? body.role : 'sales'
  // A reusable link isn't naming one person in advance — only a one-person
  // invite requires a name up front.
  if (!isReusable && !name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

  let invite = null
  for (let attempt = 0; attempt < 3 && !invite; attempt++) {
    try {
      invite = await prisma.invite.create({
        data: { orgId: user.orgId, name: name || null, role, isReusable, code: generateRandomToken(6), createdById: user.id },
      })
    } catch (err: unknown) {
      const isUniqueViolation = (err as { code?: string })?.code === 'P2002'
      if (!isUniqueViolation || attempt === 2) throw err
    }
  }
  if (!invite) return NextResponse.json({ error: 'Failed to generate a unique code, try again' }, { status: 500 })

  await logAudit({ action: 'invite_created', actorUserId: user.id, targetInviteId: invite.id, metadata: { name, role, isReusable } })

  return NextResponse.json({ invite })
}
