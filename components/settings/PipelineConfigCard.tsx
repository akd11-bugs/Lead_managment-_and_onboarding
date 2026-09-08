'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Lock, Loader2, Plus, Trash2 } from 'lucide-react'

interface DefRow {
  id: string
  key: string
  label: string
  isCore: boolean
}

// Two small admin-editable lists — pipeline stages and onboarding steps.
// Core rows (the built-in stages / the final onboarding step) show a lock
// icon: their key/position can't change (business logic in lib/leadStage.ts
// depends on those literal values), but the label can still be renamed.
// Everything else is fully editable/removable — see lib/pipelineConfig.ts.
export function PipelineConfigCard({
  initialStages,
  initialSteps,
}: {
  initialStages: DefRow[]
  initialSteps: DefRow[]
}) {
  const [stages, setStages] = useState(initialStages)
  const [steps, setSteps] = useState(initialSteps)
  const [newStageLabel, setNewStageLabel] = useState('')
  const [newStepLabel, setNewStepLabel] = useState('')
  const [savingStage, setSavingStage] = useState(false)
  const [savingStep, setSavingStep] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function renameStage(id: string, label: string) {
    setStages((prev) => prev.map((s) => (s.id === id ? { ...s, label } : s)))
    await fetch(`/api/pipeline-config/stages/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ label }),
    })
  }

  async function renameStep(id: string, label: string) {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, label } : s)))
    await fetch(`/api/pipeline-config/onboarding-steps/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ label }),
    })
  }

  async function addStage() {
    if (!newStageLabel.trim()) return
    setSavingStage(true)
    setError(null)
    try {
      const res = await fetch('/api/pipeline-config/stages', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ label: newStageLabel.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to add stage')
        return
      }
      setStages((prev) => [...prev, { id: data.stage.id, key: data.stage.key, label: data.stage.label, isCore: false }])
      setNewStageLabel('')
    } finally {
      setSavingStage(false)
    }
  }

  async function addStep() {
    if (!newStepLabel.trim()) return
    setSavingStep(true)
    setError(null)
    try {
      const res = await fetch('/api/pipeline-config/onboarding-steps', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ label: newStepLabel.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to add step')
        return
      }
      // Insert before the final (isCore) step — matches where the API put it.
      setSteps((prev) => {
        const finalIdx = prev.findIndex((s) => s.isCore)
        const next = [...prev]
        const row = { id: data.step.id, key: data.step.key, label: data.step.label, isCore: false }
        next.splice(finalIdx === -1 ? next.length : finalIdx, 0, row)
        return next
      })
      setNewStepLabel('')
    } finally {
      setSavingStep(false)
    }
  }

  async function removeStage(id: string) {
    if (!confirm('Remove this custom stage? Leads currently in it keep their stage value but the column disappears.')) return
    const res = await fetch(`/api/pipeline-config/stages/${id}`, { method: 'DELETE' })
    if (res.ok) setStages((prev) => prev.filter((s) => s.id !== id))
  }

  async function removeStep(id: string) {
    if (!confirm('Remove this onboarding step?')) return
    const res = await fetch(`/api/pipeline-config/onboarding-steps/${id}`, { method: 'DELETE' })
    if (res.ok) setSteps((prev) => prev.filter((s) => s.id !== id))
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Pipeline configuration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Pipeline stages</p>
          {stages.map((s) => (
            <div key={s.id} className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm">
              {s.isCore ? (
                <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-label="Locked — built-in stage" />
              ) : (
                <span className="w-3.5 shrink-0" />
              )}
              <Input
                className="h-7 flex-1"
                defaultValue={s.label}
                onBlur={(e) => e.target.value.trim() && e.target.value !== s.label && renameStage(s.id, e.target.value.trim())}
              />
              {s.isCore ? (
                <Badge variant="outline" className="text-[10px] shrink-0">
                  built-in
                </Badge>
              ) : (
                <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0 text-rose-600 hover:text-rose-700" onClick={() => removeStage(s.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ))}
          <div className="flex gap-2 pt-1">
            <Input className="h-8" placeholder="New stage name" value={newStageLabel} onChange={(e) => setNewStageLabel(e.target.value)} />
            <Button size="sm" onClick={addStage} disabled={savingStage || !newStageLabel.trim()}>
              {savingStage ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Add
            </Button>
          </div>
        </div>

        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Onboarding queue steps</p>
          {steps.map((s) => (
            <div key={s.id} className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm">
              {s.isCore ? (
                <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-label="Locked — final step" />
              ) : (
                <span className="w-3.5 shrink-0" />
              )}
              <Input
                className="h-7 flex-1"
                defaultValue={s.label}
                onBlur={(e) => e.target.value.trim() && e.target.value !== s.label && renameStep(s.id, e.target.value.trim())}
              />
              {s.isCore ? (
                <Badge variant="outline" className="text-[10px] shrink-0">
                  final step
                </Badge>
              ) : (
                <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0 text-rose-600 hover:text-rose-700" onClick={() => removeStep(s.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ))}
          <div className="flex gap-2 pt-1">
            <Input className="h-8" placeholder="New step name" value={newStepLabel} onChange={(e) => setNewStepLabel(e.target.value)} />
            <Button size="sm" onClick={addStep} disabled={savingStep || !newStepLabel.trim()}>
              {savingStep ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Add
            </Button>
          </div>
        </div>

        {error && <p className="text-xs text-rose-600">{error}</p>}
      </CardContent>
    </Card>
  )
}
