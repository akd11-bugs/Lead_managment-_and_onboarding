import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { leadScope } from '@/lib/session'
import { getRepSessionUser } from '@/lib/repSession'
import { checkRateLimit } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const user = await getRepSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Keyed by rep id, not IP — a leaked/shared rep_session cookie shouldn't
  // be able to scrape this rep's leads without limit.
  const rateLimit = checkRateLimit(`rep-search:${user.id}`, 120, 5 * 60 * 1000)
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many requests — try again shortly' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } },
    )
  }

  const url = new URL(req.url)
  const q = url.searchParams.get('q')?.trim() ?? ''

  // No search yet — show the rep's freshest leads instead of a blank screen,
  // so there's always something to work from.
  if (q.length < 2) {
    const leads = await prisma.lead.findMany({
      where: { ...leadScope(user), stage: 'new' },
      select: { id: true, company: true, poc: true, stage: true, pendingSubStatus: true },
      take: 30,
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ leads, isFresh: true })
  }

  const leads = await prisma.lead.findMany({
    where: {
      ...leadScope(user),
      OR: [
        { company: { contains: q, mode: 'insensitive' } },
        { poc: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
      ],
    },
    select: { id: true, company: true, poc: true, stage: true, pendingSubStatus: true },
    take: 20,
    orderBy: { lastActivityAt: 'desc' },
  })

  return NextResponse.json({ leads, isFresh: false })
}
