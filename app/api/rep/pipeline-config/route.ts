import { NextResponse } from 'next/server'
import { getRepSessionUser } from '@/lib/repSession'
import { getStageDefinitions, getOnboardingStepDefinitions } from '@/lib/pipelineConfig'

export const dynamic = 'force-dynamic'

// Rep-session equivalent of GET /api/pipeline-config/stages +
// /api/pipeline-config/onboarding-steps — needed by RepForm's Stage select
// (usePipelineConfig() calls those admin-only routes, which 401/redirect a
// rep session and leave the dropdown empty). Read-only, so one combined
// response is enough; reps never create/rename stages.
export async function GET() {
  const user = await getRepSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [stages, onboardingSteps] = await Promise.all([
    getStageDefinitions(user.orgId),
    getOnboardingStepDefinitions(user.orgId),
  ])
  return NextResponse.json({ stages, steps: onboardingSteps })
}
