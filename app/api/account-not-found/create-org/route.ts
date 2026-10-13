import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { neonAuth } from '@/lib/auth'
import { createOrganization, seedSampleLeads } from '@/lib/org'
import { readJsonBody } from '@/lib/http'
import { logAudit } from '@/lib/audit'

export const dynamic = 'force-dynamic'

// The Google-sign-in counterpart to app/api/signup/complete/route.ts —
// that route is for the email+password path and needs a SignupToken because
// typing an email into a form proves nothing. Here, the caller already has
// a verified Neon Auth session (a completed Google OAuth round-trip), which
// already proves they own that email address, so there's no token step —
// this just creates the org + the matching founding-admin User row.
export async function POST(req: Request) {
  const { data } = await neonAuth.getSession()
  if (!data?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const email = data.user.email.trim().toLowerCase()

  const existingUser = await prisma.user.findUnique({ where: { email } })
  if (existingUser) return NextResponse.json({ error: 'That email already has an account — log in instead' }, { status: 409 })

  const body = await readJsonBody(req)
  if (body instanceof NextResponse) return body
  const companyName = String(body.companyName ?? '').trim()
  if (!companyName) return NextResponse.json({ error: 'companyName is required' }, { status: 400 })

  const org = await createOrganization(companyName)
  const user = await prisma.user.create({
    data: { orgId: org.id, name: data.user.name || email, email, passwordHash: null, role: 'admin', isActive: true },
  })
  await seedSampleLeads(org.id)

  await logAudit({ action: 'org_created', actorUserId: user.id, targetUserId: user.id, metadata: { orgId: org.id, companyName, via: 'google' } })

  return NextResponse.json({ ok: true })
}
