'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Loader2 } from 'lucide-react'
import { STAGE_LABELS, PENDING_SUB_STATUS_LABELS, type Lead, type Stage, type PendingSubStatus } from '@/lib/types'

// The one path every stage / pending-sub-status change goes through —
// reachable from a Kanban drag, a Kanban card's sub-status control, or the
// lead detail form's Stage select — so there's exactly one implementation of
// "change a lead's state," always producing an Activity row, never silent.
export type StageChangeTarget =
  | { kind: 'stage'; stage: Stage }
  | { kind: 'pendingSubStatus'; pendingSubStatus: PendingSubStatus }

export function StageChangeDialog({
  leadId,
  open,
  onOpenChange,
  target,
  onDone,
}: {
  leadId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  target: StageChangeTarget
  onDone: (lead: Lead) => void
}) {
  const [remark, setRemark] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isNotInterested = target.kind === 'stage' && target.stage === 'not_interested'
  const heading =
    target.kind === 'stage' ? `Move to ${STAGE_LABELS[target.stage]}` : `Waiting on: ${PENDING_SUB_STATUS_LABELS[target.pendingSubStatus]}`
  const remarkLabel = isNotInterested ? 'Reason for marking Not Interested' : 'What happened?'

  async function confirm() {
    const trimmed = remark.trim()
    if (!trimmed) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ...(target.kind === 'stage' ? { stage: target.stage } : { pendingSubStatus: target.pendingSubStatus }),
          remark: trimmed,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to save')
        return
      }
      setRemark('')
      onDone(data.lead)
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) setRemark('')
        onOpenChange(o)
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{heading}</DialogTitle>
          <DialogDescription>
            {isNotInterested
              ? 'A reason is required so the team knows why this lead was lost.'
              : 'A short remark is required so the next follow-up has context — this is logged to the activity timeline.'}
          </DialogDescription>
        </DialogHeader>
        <Textarea
          autoFocus
          rows={4}
          placeholder={isNotInterested ? "e.g. \"Not interested, already using a competitor's product\"" : 'e.g. "Called, asked to follow up next week"'}
          value={remark}
          onChange={(e) => setRemark(e.target.value)}
        />
        {error && <p className="text-xs text-rose-600">{error}</p>}
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={confirm} disabled={saving || !remark.trim()}>
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
