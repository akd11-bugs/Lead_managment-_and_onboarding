import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireApiUser } from '@/lib/session'

export const dynamic = 'force-dynamic'

// Any authenticated user can see who's on the operations team — needed by
// whoever is moving a lead to Onboarding (sales, admin) to pick an assignee.
// Deliberately minimal (id + name only, no email/role) unlike the admin-only
// /api/users list.
export async function GET() {
  const user = await requireApiUser()
  if (user instanceof NextResponse) return user
  const operationsUsers = await prisma.user.findMany({
    where: { role: 'operations', isActive: true },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json({ operationsUsers })
}
