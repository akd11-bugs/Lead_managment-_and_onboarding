import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireApiUser, isAdmin } from '@/lib/session'
import { readJsonBody } from '@/lib/http'
import { getOnboardingStepDefinitions } from '@/lib/pipelineConfig'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await requireApiUser()
  if (user instanceof NextResponse) return user
  const steps = await getOnboardingStepDefinitions(user.orgId)
  return NextResponse.json({ steps })
}

// Admin-only — inserts a new intermediate step immediately before the locked
// "final" step (isCore: true), shifting the final step's position by one so
// it always stays last. See lib/pipelineConfig.ts for why the final step is
// special (drives Lead.onboardedAt).
export async function POST(req: Request) {
  const user = await requireApiUser()
  if (user instanceof NextResponse) return user
  if (!isAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await readJsonBody(req)
  if (body instanceof NextResponse) return body
  const label = String(body.label ?? '').trim()
  if (!label) return NextResponse.json({ error: 'label is required' }, { status: 400 })

  const existing = await getOnboardingStepDefinitions(user.orgId)
  const finalStep = existing.find((s) => s.isCore)
  if (!finalStep) {
    return NextResponse.json({ error: 'No final onboarding step configured — this should not happen' }, { status: 500 })
  }

  const key = `custom_${label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')}_${Math.random().toString(36).slice(2, 6)}`

  const [step] = await prisma.$transaction([
    prisma.onboardingStepDefinition.create({
      data: { orgId: user.orgId, key, label, position: finalStep.position, isCore: false },
    }),
    prisma.onboardingStepDefinition.update({
      where: { id: finalStep.id },
      data: { position: finalStep.position + 1 },
    }),
  ])
  return NextResponse.json({ step })
}
