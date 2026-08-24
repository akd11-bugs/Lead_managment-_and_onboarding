import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireApiUser } from '@/lib/session'
import { readJsonBody } from '@/lib/http'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await requireApiUser()
  if (user instanceof NextResponse) return user
  const views = await prisma.savedView.findMany({
    where: { userId: user.id },
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
  const view = await prisma.savedView.create({
    data: { userId: user.id, name, filtersJson: JSON.stringify(body.filters) },
  })
  return NextResponse.json({ view: { id: view.id, name: view.name, filters: body.filters, createdAt: view.createdAt } })
}
