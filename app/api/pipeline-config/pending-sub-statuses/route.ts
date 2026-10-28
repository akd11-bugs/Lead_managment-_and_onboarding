import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireApiUser, isAdmin } from '@/lib/session'
import { readJsonBody } from '@/lib/http'
import { getPendingSubStatusDefinitions } from '@/lib/pipelineConfig'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await requireApiUser()
  if (user instanceof NextResponse) return user
  const subStatuses = await getPendingSubStatusDefinitions(user.orgId)
  return NextResponse.json({ subStatuses })
}

// Admin-only. No locked/final row to insert before (unlike onboarding
// steps) — a new sub-status just appends at the end. `isDefault` is never
// settable here; toggling which row is the org's default goes through
// PATCH /[id] (see that route for why it has to be exclusive).
export async function POST(req: Request) {
  const user = await requireApiUser()
  if (user instanceof NextResponse) return user
  if (!isAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await readJsonBody(req)
  if (body instanceof NextResponse) return body
  const label = String(body.label ?? '').trim()
  const owner = body.owner === 'us' || body.owner === 'external' ? body.owner : null
  if (!label) return NextResponse.json({ error: 'label is required' }, { status: 400 })
  if (!owner) return NextResponse.json({ error: 'owner must be "us" or "external"' }, { status: 400 })

  const existing = await getPendingSubStatusDefinitions(user.orgId)
  const nextPosition = existing.length > 0 ? Math.max(...existing.map((s) => s.position)) + 1 : 0

  const key = `custom_${label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')}_${Math.random().toString(36).slice(2, 6)}`

  const subStatus = await prisma.pendingSubStatusDefinition.create({
    data: { orgId: user.orgId, key, label, owner, position: nextPosition, isDefault: existing.length === 0 },
  })
  return NextResponse.json({ subStatus })
}
