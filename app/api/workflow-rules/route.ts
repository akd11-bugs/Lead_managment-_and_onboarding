import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireApiUser } from '@/lib/session'
import { readJsonBody } from '@/lib/http'

export const dynamic = 'force-dynamic'

const TRIGGER_TYPES = ['stage_changed']
const ACTION_TYPES = ['create_task', 'send_email']

function serialize(rule: { id: string; name: string; triggerType: string; triggerConfig: string; actionType: string; actionConfig: string; active: boolean; createdAt: Date }) {
  return {
    id: rule.id,
    name: rule.name,
    triggerType: rule.triggerType,
    triggerConfig: JSON.parse(rule.triggerConfig),
    actionType: rule.actionType,
    actionConfig: JSON.parse(rule.actionConfig),
    active: rule.active,
    createdAt: rule.createdAt,
  }
}

export async function GET() {
  const user = await requireApiUser()
  if (user instanceof NextResponse) return user
  const rules = await prisma.workflowRule.findMany({
    where: { ownerId: user.id },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({ rules: rules.map(serialize) })
}

export async function POST(req: Request) {
  const user = await requireApiUser()
  if (user instanceof NextResponse) return user
  const body = await readJsonBody(req)
  if (body instanceof NextResponse) return body

  const name = String(body.name ?? '').trim()
  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 })
  if (!TRIGGER_TYPES.includes(body.triggerType)) {
    return NextResponse.json({ error: `triggerType must be one of: ${TRIGGER_TYPES.join(', ')}` }, { status: 400 })
  }
  if (!ACTION_TYPES.includes(body.actionType)) {
    return NextResponse.json({ error: `actionType must be one of: ${ACTION_TYPES.join(', ')}` }, { status: 400 })
  }
  if (typeof body.triggerConfig !== 'object' || typeof body.actionConfig !== 'object') {
    return NextResponse.json({ error: 'triggerConfig and actionConfig must be objects' }, { status: 400 })
  }

  const rule = await prisma.workflowRule.create({
    data: {
      name,
      triggerType: body.triggerType,
      triggerConfig: JSON.stringify(body.triggerConfig),
      actionType: body.actionType,
      actionConfig: JSON.stringify(body.actionConfig),
      ownerId: user.id,
    },
  })
  return NextResponse.json({ rule: serialize(rule) })
}
