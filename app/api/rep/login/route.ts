import { NextResponse } from 'next/server'
import { readJsonBody } from '@/lib/http'
import { prisma } from '@/lib/db'
import { verifyRepLogin } from '@/lib/repAuth'
import { setRepSessionCookie } from '@/lib/repSession'
import { checkRateLimit, getClientIp } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'

// On top of the per-account PIN lockout in lib/repAuth.ts — this catches an
// attacker sweeping many different names from one IP, which a per-account
// counter alone can't.
const MAX_ATTEMPTS_PER_IP = 20
const WINDOW_MS = 15 * 60 * 1000

export async function POST(req: Request) {
  const ip = getClientIp(req)
  const rateLimit = checkRateLimit(`rep-login:${ip}`, MAX_ATTEMPTS_PER_IP, WINDOW_MS)
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many attempts — try again later' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } },
    )
  }

  const body = await readJsonBody(req)
  if (body instanceof NextResponse) return body

  const name = String(body?.name ?? '').trim()
  const pin = String(body?.pin ?? '').trim()
  const slug = String(body?.orgSlug ?? '').trim().toLowerCase()
  if (!name || !pin) {
    return NextResponse.json({ error: 'Name and PIN are required' }, { status: 400 })
  }
  if (!slug) {
    return NextResponse.json({ error: 'Open your team\'s own rep link to sign in' }, { status: 400 })
  }

  // Resolve the org from the URL slug. A slug that does not resolve returns
  // the same generic error as a bad PIN: a prober on one org's link must not
  // be able to enumerate which other tenants exist.
  const org = await prisma.organization.findUnique({ where: { slug }, select: { id: true } })
  if (!org) {
    return NextResponse.json({ error: 'Invalid name or PIN' }, { status: 401 })
  }

  const result = await verifyRepLogin(org.id, name, pin)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  await setRepSessionCookie(result.userId)
  return NextResponse.json({ ok: true })
}
