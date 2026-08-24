import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireApiUser } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser()
  if (user instanceof NextResponse) return user
  const { id } = await params
  const view = await prisma.savedView.findFirst({ where: { id, userId: user.id }, select: { id: true } })
  if (!view) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await prisma.savedView.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
