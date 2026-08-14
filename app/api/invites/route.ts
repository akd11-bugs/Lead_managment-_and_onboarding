import crypto from 'crypto'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireApiUser, isAdmin } from '@/lib/session'
import { logAudit } from '@/lib/audit'
import { readJsonBody } from '@/lib/http'

export const dynamic = 'force-dynamic'

const ROLES = ['admin', 'sales', 'operations']

function generateCode() {
  return crypto.randomBytes(6).toString('base64url')
}

export async function GET() {
  const user = await requireApiUser()
  if (user instanceof NextResponse) return user
  if (!isAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const invites = await prisma.invite.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json({ invites })
}

export async function POST(req: Request) {
  const user = await requireApiUser()
  if (user instanceof NextResponse) return user
  if (!isAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await readJsonBody(req)
  if (body instanceof NextResponse) return body
  const name = String(body.name ?? '').trim()
  const role = ROLES.includes(body.role) ? body.role : 'sales'
  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

  let invite = null
  for (let attempt = 0; attempt < 3 && !invite; attempt++) {
    try {
      invite = await prisma.invite.create({
        data: { name, role, code: generateCode(), createdById: user.id },
      })
    } catch (err: unknown) {
      const isUniqueViolation = (err as { code?: string })?.code === 'P2002'
      if (!isUniqueViolation || attempt === 2) throw err
    }
  }
  if (!invite) return NextResponse.json({ error: 'Failed to generate a unique code, try again' }, { status: 500 })

  await logAudit({ action: 'invite_created', actorUserId: user.id, targetInviteId: invite.id, metadata: { name, role } })

  return NextResponse.json({ invite })
}
