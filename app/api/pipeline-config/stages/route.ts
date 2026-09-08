import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireApiUser, isAdmin } from '@/lib/session'
import { readJsonBody } from '@/lib/http'
import { getStageDefinitions } from '@/lib/pipelineConfig'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await requireApiUser()
  if (user instanceof NextResponse) return user
  const stages = await getStageDefinitions(user.orgId)
  return NextResponse.json({ stages })
}

// Admin-only — adds a custom (isCore: false) stage, a purely decorative extra
// Kanban column with no automation attached. Core stages are seeded once by
// getStageDefinitions() and never created through this route.
export async function POST(req: Request) {
  const user = await requireApiUser()
  if (user instanceof NextResponse) return user
  if (!isAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await readJsonBody(req)
  if (body instanceof NextResponse) return body
  const label = String(body.label ?? '').trim()
  if (!label) return NextResponse.json({ error: 'label is required' }, { status: 400 })

  const key = `custom_${label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')}_${Math.random().toString(36).slice(2, 6)}`

  const existing = await getStageDefinitions(user.orgId)
  const maxPosition = existing.reduce((max, s) => Math.max(max, s.position), -1)

  const stage = await prisma.stageDefinition.create({
    data: {
      orgId: user.orgId,
      key,
      label,
      description: typeof body.description === 'string' ? body.description : null,
      color: typeof body.color === 'string' ? body.color : null,
      position: maxPosition + 1,
      isCore: false,
    },
  })
  return NextResponse.json({ stage })
}
