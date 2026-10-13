import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireApiUser, isAdmin } from '@/lib/session'
import { readJsonBody } from '@/lib/http'
import { logAudit } from '@/lib/audit'
import { generateRandomToken } from '@/lib/crypto'
import { sendEmail } from '@/lib/email'

export const dynamic = 'force-dynamic'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser()
  if (user instanceof NextResponse) return user
  if (!isAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params

  const existing = await prisma.joinRequest.findFirst({ where: { id, orgId: user.orgId, status: 'pending' } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await readJsonBody(req)
  if (body instanceof NextResponse) return body
  const action = body.action === 'approve' ? 'approve' : body.action === 'reject' ? 'reject' : null
  if (!action) return NextResponse.json({ error: 'action must be "approve" or "reject"' }, { status: 400 })

  if (action === 'reject') {
    await prisma.joinRequest.update({ where: { id }, data: { status: 'rejected' } })
    await logAudit({ action: 'invite_revoked', actorUserId: user.id, metadata: { joinRequestId: id, requesterEmail: existing.requesterEmail } })
    return NextResponse.json({ ok: true })
  }

  // Approving just creates a real, one-person Invite (same path an admin
  // typing a name into the Organisation panel would create) and emails the
  // requester the redeem link — this model never creates the account itself.
  const invite = await prisma.invite.create({
    data: { orgId: user.orgId, name: existing.requesterName, role: 'sales', code: generateRandomToken(6), createdById: user.id },
  })
  await prisma.joinRequest.update({ where: { id }, data: { status: 'approved' } })

  const origin = process.env.ADMIN_ORIGIN || req.headers.get('origin') || ''
  await sendEmail(
    {
      to: existing.requesterEmail,
      subject: `You're in — finish setting up your bluSwap account`,
      body: `Your request to join was approved. Finish setting up your account here:\n\n${origin}/invite/redeem?code=${invite.code}\n\nThis link is just for you — no one else can use it.`,
    },
    user.orgId,
  ).catch(() => {})

  await logAudit({ action: 'invite_created', actorUserId: user.id, targetInviteId: invite.id, metadata: { joinRequestId: id, requesterEmail: existing.requesterEmail } })

  return NextResponse.json({ ok: true })
}
