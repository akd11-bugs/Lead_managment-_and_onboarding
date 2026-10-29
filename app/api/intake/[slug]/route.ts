import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { readJsonBody } from '@/lib/http'
import { checkRateLimit, getClientIp } from '@/lib/rateLimit'
import { submitPublicLeadIntake, PublicIntakeValidationError } from '@/lib/publicLeadIntake'

export const dynamic = 'force-dynamic'

// Public, no-auth endpoint — anyone with the link can POST here. Tighter
// than rep-login's 20/15min since this creates data rather than just
// attempting a login; scoped per-slug-per-IP so one spammy form doesn't
// burn another org's quota.
const MAX_SUBMISSIONS_PER_IP = 5
const WINDOW_MS = 15 * 60 * 1000

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const ip = getClientIp(req)

  const rateLimit = checkRateLimit(`intake:${slug}:${ip}`, MAX_SUBMISSIONS_PER_IP, WINDOW_MS)
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many submissions. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } },
    )
  }

  const form = await prisma.orgLeadIntakeForm.findUnique({
    where: { slug },
    select: { id: true, name: true, orgId: true, enabled: true, defaultOwnerUserId: true, defaultSource: true, fieldConfigJson: true },
  })
  if (!form || !form.enabled) {
    return NextResponse.json({ error: 'This form is no longer available.' }, { status: 404 })
  }

  const body = await readJsonBody(req)
  if (body instanceof NextResponse) return body

  try {
    // A honeypot trip (result.silent) gets the same response a real
    // submitter sees — the bot gets no signal that nothing was created.
    await submitPublicLeadIntake(
      form.id,
      form.name,
      form.orgId,
      form.defaultOwnerUserId,
      form.defaultSource,
      form.fieldConfigJson,
      body,
    )
    return NextResponse.json({ ok: true, message: "Thanks — we'll be in touch." }, { status: 201 })
  } catch (err) {
    if (err instanceof PublicIntakeValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    throw err
  }
}
