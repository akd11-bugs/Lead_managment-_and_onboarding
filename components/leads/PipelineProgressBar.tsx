import { CheckCircle2, UserCog } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PIPELINE_CHECKPOINTS, pipelineCheckpointIndex, type OnboardingSubStage, type Stage } from '@/lib/types'

const CHECKPOINT_LABELS: Record<(typeof PIPELINE_CHECKPOINTS)[number], string> = {
  new: 'New',
  pending: 'Pending',
  proposal: 'Proposal',
  onboarding: 'Onboarding',
  onboarded: 'Onboarded',
}

// The whole-funnel view: New → Pending → Onboarding → Onboarded, plus who
// from Operations is handling it once it's in Onboarding. Distinct from
// OnboardingProgressPanel, which only covers the fine-grained steps inside
// Onboarding itself.
export function PipelineProgressBar({
  stage,
  onboardingSubStage,
  assignedOpsName,
}: {
  stage: Stage
  onboardingSubStage: OnboardingSubStage | null
  assignedOpsName: string | null
}) {
  if (stage === 'not_interested') {
    return (
      <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-400">
        Not Interested — see the activity timeline for the reason.
      </div>
    )
  }

  const reachedIndex = pipelineCheckpointIndex({ stage, onboardingSubStage })

  return (
    <div className="space-y-2">
      <div className="flex items-center">
        {PIPELINE_CHECKPOINTS.map((checkpoint, i) => {
          const done = i <= reachedIndex
          const isLast = i === PIPELINE_CHECKPOINTS.length - 1
          return (
            <div key={checkpoint} className={cn('flex items-center', !isLast && 'flex-1')}>
              <div className="flex flex-col items-center gap-1">
                <div
                  className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-full border-2 text-[10px] font-medium transition-colors',
                    done
                      ? 'border-emerald-500 bg-emerald-500 text-white'
                      : 'border-muted-foreground/30 text-muted-foreground',
                  )}
                >
                  {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
                </div>
                <span className={cn('text-[10px] whitespace-nowrap', done ? 'font-medium text-foreground' : 'text-muted-foreground')}>
                  {CHECKPOINT_LABELS[checkpoint]}
                </span>
              </div>
              {!isLast && (
                <div className={cn('mx-1.5 h-0.5 flex-1 rounded-full', i < reachedIndex ? 'bg-emerald-500' : 'bg-muted')} />
              )}
            </div>
          )
        })}
      </div>
      {stage === 'onboarding' && (
        <div className="flex items-center gap-1.5 text-xs">
          <UserCog className="h-3.5 w-3.5 text-muted-foreground" />
          {assignedOpsName ? (
            <span>
              Assigned to <span className="font-medium">{assignedOpsName}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">No operations person assigned yet</span>
          )}
        </div>
      )}
    </div>
  )
}
