import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireApiUser } from '@/lib/session'
import { readJsonBody } from '@/lib/http'

export const dynamic = 'force-dynamic'

const VIEW_TYPES = ['leads', 'companies']

export async function GET(req: Request) {
  const user = await requireApiUser()
  if (user instanceof NextResponse) return user
  const url = new URL(req.url)
  const viewType = url.searchParams.get('type') ?? 'leads'
  const views = await prisma.savedView.findMany({
    where: { orgId: user.orgId, userId: user.id, viewType },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({
    views: views.map((v) => ({ id: v.id, name: v.name, filters: JSON.parse(v.filtersJson), createdAt: v.createdAt })),
  })
}

export async function POST(req: Request) {
  const user = await requireApiUser()
  if (user instanceof NextResponse) return user
  const body = await readJsonBody(req)
  if (body instanceof NextResponse) return body
  const name = String(body.name ?? '').trim()
  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 })
  if (typeof body.filters !== 'object' || body.filters === null) {
    return NextResponse.json({ error: 'filters must be an object' }, { status: 400 })
  }
  const viewType = VIEW_TYPES.includes(body.viewType) ? body.viewType : 'leads'
  const view = await prisma.savedView.create({
    data: { orgId: user.orgId, userId: user.id, name, viewType, filtersJson: JSON.stringify(body.filters) },
  })
  return NextResponse.json({ view: { id: view.id, name: view.name, filters: body.filters, createdAt: view.createdAt } })
}
