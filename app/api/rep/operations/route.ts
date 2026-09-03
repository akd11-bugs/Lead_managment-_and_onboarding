import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getRepSessionUser } from '@/lib/repSession'

export const dynamic = 'force-dynamic'

// Rep-session equivalent of /api/users/operations — needed by the /rep form
// to offer an operations-person picker when a rep moves a lead to Onboarding.
export async function GET() {
  const user = await getRepSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const operationsUsers = await prisma.user.findMany({
    where: { role: 'operations', isActive: true },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json({ operationsUsers })
}
