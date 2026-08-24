import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireApiUser } from '@/lib/session'
import { readJsonBody } from '@/lib/http'

export const dynamic = 'force-dynamic'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser()
  if (user instanceof NextResponse) return user
  const { id } = await params
  const body = await readJsonBody(req)
  if (body instanceof NextResponse) return body

  const existing = await prisma.workflowRule.findFirst({ where: { id, ownerId: user.id }, select: { id: true } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (typeof body.active !== 'boolean') {
    return NextResponse.json({ error: 'active (boolean) is required' }, { status: 400 })
  }
  const rule = await prisma.workflowRule.update({ where: { id }, data: { active: body.active } })
  return NextResponse.json({ rule: { id: rule.id, active: rule.active } })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser()
  if (user instanceof NextResponse) return user
  const { id } = await params
  const existing = await prisma.workflowRule.findFirst({ where: { id, ownerId: user.id }, select: { id: true } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await prisma.workflowRule.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
