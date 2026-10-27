import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { neonAuth } from '@/lib/auth'
import { requireApiUser, isAdmin } from '@/lib/session'
import { readJsonBody } from '@/lib/http'
import { sendEmail } from '@/lib/email'
import { checkRateLimit, getClientIp } from '@/lib/rateLimit'
import { findOrgByEmailDomain } from '@/lib/org'

export const dynamic = 'force-dynamic'

// Admin-facing list — same auth/scoping convention as every other
// admin-only list in this app (e.g. app/api/invites/route.ts).
export async function GET() {
  const user = await requireApiUser()
  if (user instanceof NextResponse) return user
  if (!isAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const requests = await prisma.joinRequest.findMany({
    where: { orgId: user.orgId, status: 'pending' },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({ requests })
}

// Called from the "smart" app/account-not-found/page.tsx for a Google
// identity whose email domain matched an existing org. Deliberately does
// NOT use requireApiUser() — the caller has a verified Neon Auth session
// but no Steadfast User row yet (that's the whole point of this route). The
// requester's email comes from that session, never from the request body,
// so nobody can file a request claiming to be someone else's address.
export async function POST(req: Request) {
  const ip = getClientIp(req)
  const rateLimit = checkRateLimit(`join-request:${ip}`, 5, 60 * 60 * 1000)
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Too many attempts — try again later' }, { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } })
  }

  const { data } = await neonAuth.getSession()
  if (!data?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const requesterEmail = data.user.email.trim().toLowerCase()

  const existingUser = await prisma.user.findUnique({ where: { email: requesterEmail } })
  if (existingUser) return NextResponse.json({ error: 'That email already has an account — log in instead' }, { status: 409 })

  const body = await readJsonBody(req)
  if (body instanceof NextResponse) return body
  const orgId = String(body.orgId ?? '').trim()
  const requesterName = String(body.name ?? data.user.name ?? '').trim() || requesterEmail
  if (!orgId) return NextResponse.json({ error: 'orgId is required' }, { status: 400 })

  // Re-derive the org from the requester's OWN verified email domain — the
  // client-supplied orgId is never trusted as proof of a domain match on its
  // own (findOrgByEmailDomain is otherwise only used by account-not-found's
  // page component to pick which button to show, which is UI only, not
  // enforcement).
  const matchedOrg = await findOrgByEmailDomain(requesterEmail)
  if (!matchedOrg || matchedOrg.id !== orgId) {
    return NextResponse.json({ error: 'That organization no longer exists' }, { status: 404 })
  }
  const org = matchedOrg

  // Don't pile up duplicate pending requests from the same person clicking twice.
  const existingRequest = await prisma.joinRequest.findFirst({ where: { orgId, requesterEmail, status: 'pending' } })
  if (existingRequest) return NextResponse.json({ request: existingRequest })

  const joinRequest = await prisma.joinRequest.create({
    data: { orgId, requesterName, requesterEmail },
  })

  const admins = await prisma.user.findMany({ where: { orgId, role: 'admin', isActive: true }, select: { email: true } })
  await Promise.all(
    admins.map((admin) =>
      sendEmail(
        {
          to: admin.email,
          subject: `${requesterName} wants to join your Steadfast workspace`,
          body: `${requesterName} (${requesterEmail}) signed in with an email at your company's domain and asked to join ${org.name} on Steadfast.\n\nApprove or decline from Settings → Organisation.`,
        },
        orgId,
      ).catch(() => {}), // best-effort — a failed notification shouldn't fail the request itself
    ),
  )

  return NextResponse.json({ request: joinRequest })
}
