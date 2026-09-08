import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireApiUser, isAdmin } from '@/lib/session'
import { readJsonBody } from '@/lib/http'

export const dynamic = 'force-dynamic'

const FIELD_TYPES = ['text', 'number', 'date', 'select']

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser()
  if (user instanceof NextResponse) return user
  if (!isAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params

  const existing = await prisma.leadFieldDefinition.findFirst({ where: { id, orgId: user.orgId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await readJsonBody(req)
  if (body instanceof NextResponse) return body
  if (body.key !== undefined) {
    return NextResponse.json({ error: 'key cannot be changed after creation — existing lead values are stored under it' }, { status: 400 })
  }
  if (body.type !== undefined && !FIELD_TYPES.includes(body.type)) {
    return NextResponse.json({ error: `type must be one of: ${FIELD_TYPES.join(', ')}` }, { status: 400 })
  }

  const field = await prisma.leadFieldDefinition.update({
    where: { id },
    data: {
      ...(body.label !== undefined && { label: String(body.label).trim() }),
      ...(body.type !== undefined && { type: body.type }),
      ...(body.options !== undefined && { options: body.options ? JSON.stringify(body.options.map(String)) : null }),
      ...(body.required !== undefined && { required: !!body.required }),
      ...(body.position !== undefined && { position: Number(body.position) }),
    },
  })
  return NextResponse.json({ field: { ...field, options: field.options ? JSON.parse(field.options) : null } })
}

// Leaves any orphaned key in existing leads' customFieldsJson in place —
// harmless, since it's only ever rendered by looking up the (now-deleted)
// definition, never displayed on its own. No cleanup migration needed.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser()
  if (user instanceof NextResponse) return user
  if (!isAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params

  const existing = await prisma.leadFieldDefinition.findFirst({ where: { id, orgId: user.orgId }, select: { id: true } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.leadFieldDefinition.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
