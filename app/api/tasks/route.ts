import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireApiUser, isAdmin, isOperations } from '@/lib/session'
import { readJsonBody } from '@/lib/http'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const user = await requireApiUser()
  if (user instanceof NextResponse) return user
  const url = new URL(req.url)
  const leadId = url.searchParams.get('leadId')
  const tasks = await prisma.task.findMany({
    where: {
      orgId: { in: user.visibleOrgIds },
      ...(isAdmin(user) || isOperations(user) ? {} : { ownerId: user.id }),
      ...(leadId ? { leadId } : {}),
    },
    orderBy: [{ done: 'asc' }, { dueDate: 'asc' }],
    include: { lead: { select: { company: { select: { name: true } } } } },
  })
  return NextResponse.json({
    tasks: tasks.map((t) => ({ ...t, leadCompany: t.lead?.company?.name ?? null, lead: undefined })),
  })
}

export async function POST(req: Request) {
  const user = await requireApiUser()
  if (user instanceof NextResponse) return user
  const body = await readJsonBody(req)
  if (body instanceof NextResponse) return body
  const title = String(body.title ?? '').trim()
  if (!title) return NextResponse.json({ error: 'title is required' }, { status: 400 })

  const leadId = body.leadId || null
  if (leadId) {
    const owned = await prisma.lead.findFirst({
      where: { id: leadId, orgId: { in: user.visibleOrgIds }, ...(isAdmin(user) || isOperations(user) ? {} : { ownerId: user.id }) },
      select: { id: true },
    })
    if (!owned) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  }

  const task = await prisma.task.create({
    data: {
      orgId: user.orgId,
      leadId,
      title,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      source: body.source === 'alert' ? 'alert' : 'manual',
      ownerId: user.id,
    },
  })
  return NextResponse.json({ task })
}
