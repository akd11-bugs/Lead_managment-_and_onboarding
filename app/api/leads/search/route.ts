import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireApiUser, leadScope } from '@/lib/session'
import { checkRateLimit } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'

// Backs the TopBar's universal search typeahead (People side of the
// Companies/People split) — same contains/insensitive pattern already
// proven in app/api/rep/leads/search/route.ts, promoted here for the main
// dashboard's own search bar instead of inventing a second convention.
export async function GET(req: Request) {
  const user = await requireApiUser()
  if (user instanceof NextResponse) return user

  const rateLimit = checkRateLimit(`lead-search:${user.id}`, 120, 5 * 60 * 1000)
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Too many requests — try again shortly' }, { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } })
  }

  const url = new URL(req.url)
  const q = url.searchParams.get('q')?.trim() ?? ''
  if (q.length < 2) return NextResponse.json({ leads: [] })

  const leads = await prisma.lead.findMany({
    where: {
      ...leadScope(user),
      OR: [
        { company: { is: { name: { contains: q, mode: 'insensitive' } } } },
        { person: { is: { name: { contains: q, mode: 'insensitive' } } } },
        { email: { contains: q, mode: 'insensitive' } },
      ],
    },
    select: { id: true, stage: true, company: { select: { name: true } }, person: { select: { name: true } } },
    take: 8,
    orderBy: { lastActivityAt: 'desc' },
  })
  return NextResponse.json({ leads })
}
