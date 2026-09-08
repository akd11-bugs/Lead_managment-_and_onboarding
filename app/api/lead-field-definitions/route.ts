import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireApiUser, isAdmin } from '@/lib/session'
import { readJsonBody } from '@/lib/http'

export const dynamic = 'force-dynamic'

const FIELD_TYPES = ['text', 'number', 'date', 'select']

export async function GET() {
  const user = await requireApiUser()
  if (user instanceof NextResponse) return user
  const fields = await prisma.leadFieldDefinition.findMany({
    where: { orgId: user.orgId },
    orderBy: { position: 'asc' },
  })
  return NextResponse.json({
    fields: fields.map((f) => ({ ...f, options: f.options ? JSON.parse(f.options) : null })),
  })
}

// Admin-only. `key` is generated here and never editable afterward — values
// on existing leads are stored keyed by it in Lead.customFieldsJson, so
// renaming the key would orphan data (label is the editable display name).
export async function POST(req: Request) {
  const user = await requireApiUser()
  if (user instanceof NextResponse) return user
  if (!isAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await readJsonBody(req)
  if (body instanceof NextResponse) return body
  const label = String(body.label ?? '').trim()
  if (!label) return NextResponse.json({ error: 'label is required' }, { status: 400 })
  if (!FIELD_TYPES.includes(body.type)) {
    return NextResponse.json({ error: `type must be one of: ${FIELD_TYPES.join(', ')}` }, { status: 400 })
  }
  if (body.type === 'select' && (!Array.isArray(body.options) || body.options.length === 0)) {
    return NextResponse.json({ error: 'options is required (a non-empty array) for type "select"' }, { status: 400 })
  }

  const key = `${label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')}_${Math.random().toString(36).slice(2, 6)}`

  const existing = await prisma.leadFieldDefinition.findMany({ where: { orgId: user.orgId }, select: { position: true } })
  const maxPosition = existing.reduce((max, f) => Math.max(max, f.position), -1)

  const field = await prisma.leadFieldDefinition.create({
    data: {
      orgId: user.orgId,
      key,
      label,
      type: body.type,
      options: body.type === 'select' ? JSON.stringify(body.options.map(String)) : null,
      required: !!body.required,
      position: maxPosition + 1,
    },
  })
  return NextResponse.json({ field: { ...field, options: field.options ? JSON.parse(field.options) : null } })
}
