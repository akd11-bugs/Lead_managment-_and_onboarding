import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireApiUser } from '@/lib/session'
import { readJsonBody } from '@/lib/http'

export const dynamic = 'force-dynamic'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser()
  if (user instanceof NextResponse) return user
  const { id } = await params

  const existing = await prisma.whiteboardElement.findFirst({ where: { id, orgId: user.orgId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await readJsonBody(req)
  if (body instanceof NextResponse) return body

  // Same split as POST: known columns update directly, everything else
  // merges into dataJson (so e.g. patching just {reactions} doesn't need
  // to know or resend an arrow's x2/y2).
  const { x, y, w, h, color, text, ...rest } = body
  const mergedData = { ...JSON.parse(existing.dataJson), ...rest }

  const el = await prisma.whiteboardElement.update({
    where: { id },
    data: {
      ...(typeof x === 'number' && { x }),
      ...(typeof y === 'number' && { y }),
      ...(w !== undefined && { w: typeof w === 'number' ? w : null }),
      ...(h !== undefined && { h: typeof h === 'number' ? h : null }),
      ...(color !== undefined && { color }),
      ...(text !== undefined && { text }),
      dataJson: JSON.stringify(mergedData),
    },
  })

  return NextResponse.json({
    element: {
      id: el.id, type: el.type, x: el.x, y: el.y, w: el.w, h: el.h, color: el.color, text: el.text,
      ...JSON.parse(el.dataJson),
    },
  })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser()
  if (user instanceof NextResponse) return user
  const { id } = await params

  const existing = await prisma.whiteboardElement.findFirst({ where: { id, orgId: user.orgId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.whiteboardElement.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
