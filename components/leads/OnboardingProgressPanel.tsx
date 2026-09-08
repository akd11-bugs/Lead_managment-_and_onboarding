'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Circle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { onboardingProgressPercent } from '@/lib/types'
import { usePipelineConfig } from '@/lib/hooks/usePipelineConfig'

export function OnboardingProgressPanel({
  leadId,
  subStage,
}: {
  leadId: string
  subStage: string | null
}) {
  const router = useRouter()
  const [current, setCurrent] = useState(subStage)
  const [saving, setSaving] = useState<string | null>(null)
  const { onboardingSteps, finalOnboardingStepKey, loading } = usePipelineConfig()

  const stepKeys = onboardingSteps.map((s) => s.key)
  const currentIdx = current ? stepKeys.indexOf(current) : -1
  const percent = onboardingProgressPercent(current, stepKeys)

  async function setStage(next: string) {
    setSaving(next)
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ onboardingSubStage: next }),
      })
      if (res.ok) {
        setCurrent(next)
        router.refresh()
      }
    } finally {
      setSaving(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between text-sm mb-1.5">
          <span className="font-medium">Onboarding progress</span>
          <span className="text-muted-foreground tabular-nums">{percent}%</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      <div className="space-y-2">
        {onboardingSteps.map((s, i) => {
          const isFinal = s.key === finalOnboardingStepKey
          const done = i < currentIdx || (i === currentIdx && isFinal)
          const isCurrent = i === currentIdx && !isFinal
          return (
            <button
              key={s.key}
              onClick={() => setStage(s.key)}
              disabled={saving !== null}
              className={cn(
                'flex w-full items-center gap-3 rounded-md border px-3 py-2.5 text-left text-sm transition-colors',
                done && 'border-emerald-300 bg-emerald-50 dark:bg-emerald-950/20',
                isCurrent && 'border-blue-300 bg-blue-50 dark:bg-blue-950/20',
                !done && !isCurrent && 'hover:bg-accent'
              )}
            >
              {saving === s.key ? (
                <Loader2 className="h-4 w-4 animate-spin shrink-0" />
              ) : done ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
              <span className={done ? 'font-medium' : ''}>{s.label}</span>
              {isCurrent && <span className="ml-auto text-xs text-blue-600">In progress</span>}
            </button>
          )
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        Click a step to move this lead there. Operations will take over managing these steps once that access rolls out.
      </p>
    </div>
  )
}
