import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireApiUser } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser()
  if (user instanceof NextResponse) return user
  const { id } = await params
  // orgId as well as userId: userId alone pins the tenant only because a
  // User belongs to exactly one org today. Relying on that transitively
  // means this guard silently weakens if that ever changes.
  const view = await prisma.savedView.findFirst({
    where: { id, userId: user.id, orgId: user.orgId },
    select: { id: true },
  })
  if (!view) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await prisma.savedView.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
