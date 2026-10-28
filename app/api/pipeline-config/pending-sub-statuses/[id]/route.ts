import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireApiUser, isAdmin } from '@/lib/session'
import { readJsonBody } from '@/lib/http'

export const dynamic = 'force-dynamic'

// Admin-only. label/owner are freely editable on any row — there is no
// locked/core row the way StageDefinition/OnboardingStepDefinition have.
// Setting isDefault: true on this row atomically clears it on every other
// row in the same org — exactly one default must exist at a time (what
// lib/leadStage.ts assigns on entering 'pending' with no explicit value),
// so this can never be "unset" directly, only reassigned to a different row.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser()
  if (user instanceof NextResponse) return user
  if (!isAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params

  const existing = await prisma.pendingSubStatusDefinition.findFirst({ where: { id, orgId: user.orgId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await readJsonBody(req)
  if (body instanceof NextResponse) return body

  if (body.owner !== undefined && body.owner !== 'us' && body.owner !== 'external') {
    return NextResponse.json({ error: 'owner must be "us" or "external"' }, { status: 400 })
  }

  if (body.isDefault === true) {
    await prisma.$transaction([
      prisma.pendingSubStatusDefinition.updateMany({
        where: { orgId: user.orgId, id: { not: id } },
        data: { isDefault: false },
      }),
      prisma.pendingSubStatusDefinition.update({ where: { id }, data: { isDefault: true } }),
    ])
  } else if (body.isDefault === false && existing.isDefault) {
    return NextResponse.json({ error: 'Set a different sub-status as the default instead of unsetting this one' }, { status: 400 })
  }

  const subStatus = await prisma.pendingSubStatusDefinition.update({
    where: { id },
    data: {
      ...(body.label !== undefined && { label: String(body.label).trim() }),
      ...(body.owner !== undefined && { owner: body.owner }),
    },
  })
  return NextResponse.json({ subStatus })
}

// Blocked if any lead in this org currently has this sub-status (same
// "reassign first, then delete" safety pattern as custom lead fields — see
// app/api/lead-field-definitions/[id]/route.ts), or if it's the org's only
// remaining sub-status (the Pending stage must always have somewhere for a
// lead to land).
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser()
  if (user instanceof NextResponse) return user
  if (!isAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params

  const existing = await prisma.pendingSubStatusDefinition.findFirst({ where: { id, orgId: user.orgId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const otherCount = await prisma.pendingSubStatusDefinition.count({ where: { orgId: user.orgId, id: { not: id } } })
  if (otherCount === 0) {
    return NextResponse.json({ error: 'At least one pending sub-status must remain' }, { status: 400 })
  }

  const inUseCount = await prisma.lead.count({ where: { orgId: user.orgId, pendingSubStatus: existing.key } })
  if (inUseCount > 0) {
    return NextResponse.json(
      { error: `${inUseCount} lead(s) currently use this sub-status — move them first` },
      { status: 400 },
    )
  }

  if (existing.isDefault) {
    return NextResponse.json({ error: 'Set a different sub-status as the default before deleting this one' }, { status: 400 })
  }

  await prisma.pendingSubStatusDefinition.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
