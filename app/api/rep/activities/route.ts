import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { leadScope } from '@/lib/session'
import { getRepSessionUser } from '@/lib/repSession'
import { readJsonBody } from '@/lib/http'
import { checkRateLimit } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const user = await getRepSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rateLimit = checkRateLimit(`rep-activity:${user.id}`, 60, 15 * 60 * 1000)
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many requests — try again shortly' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } },
    )
  }

  const body = await readJsonBody(req)
  if (body instanceof NextResponse) return body
  if (!body.leadId) return NextResponse.json({ error: 'leadId required' }, { status: 400 })

  const lead = await prisma.lead.findFirst({ where: { id: body.leadId, ...leadScope(user) }, select: { id: true } })
  if (!lead) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const activity = await prisma.activity.create({
    data: {
      leadId: body.leadId,
      type: body.type ?? 'note',
      description: String(body.description ?? ''),
      // Always the verified rep-session user — never trust a client-supplied name.
      authorName: user.name,
    },
  })

  await prisma.lead.update({
    where: { id: body.leadId },
    data: { lastActivityAt: activity.date },
  })

  return NextResponse.json({ activity })
}
