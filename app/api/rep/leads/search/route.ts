import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { leadScope } from '@/lib/session'
import { getRepSessionUser } from '@/lib/repSession'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const user = await getRepSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const q = url.searchParams.get('q')?.trim() ?? ''
  if (q.length < 2) return NextResponse.json({ leads: [] })

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

  return NextResponse.json({ leads })
}
