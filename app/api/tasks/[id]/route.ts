import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireApiUser, isAdmin, type SessionUser } from '@/lib/session'
import { readJsonBody } from '@/lib/http'

export const dynamic = 'force-dynamic'

async function findOwned(id: string, user: SessionUser) {
  return prisma.task.findFirst({ where: { id, ...(isAdmin(user) ? {} : { ownerId: user.id }) } })
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser()
  if (user instanceof NextResponse) return user
  const { id } = await params
  const existing = await findOwned(id, user)
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await readJsonBody(req)
  if (body instanceof NextResponse) return body
  const task = await prisma.task.update({
    where: { id },
    data: {
      ...(body.done !== undefined && { done: !!body.done }),
      ...(body.title !== undefined && { title: String(body.title).trim() }),
      ...(body.dueDate !== undefined && { dueDate: body.dueDate ? new Date(body.dueDate) : null }),
    },
  })
  return NextResponse.json({ task })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser()
  if (user instanceof NextResponse) return user
  const { id } = await params
  const existing = await findOwned(id, user)
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await prisma.task.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
