'use client'

import { useEffect, useState } from 'react'
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
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import { boardColumnToInput, type Lead, type BoardColumnKey } from '@/lib/types'

interface OperationsUser {
  id: string
  name: string
}

// The one path every stage / pending-sub-status change goes through —
// reachable from a Kanban drag or the lead detail form's Stage select — so
// there's exactly one implementation of "change a lead's state," always
// producing an Activity row, never silent. `target` is a board column (New /
// Pending — Our Side / Pending — Merchant / Pending — PSP / Onboarding / Not
// Interested), which folds stage + pendingSubStatus into one selection.
export function StageChangeDialog({
  leadId,
  open,
  onOpenChange,
  target,
  targetLabel,
  onDone,
}: {
  leadId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  target: BoardColumnKey
  targetLabel: string
  onDone: (lead: Lead) => void
}) {
  const [remark, setRemark] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scheduleMeeting, setScheduleMeeting] = useState(false)
  const [meetingDate, setMeetingDate] = useState('')

  const isNotInterested = target === 'not_interested'
  const isOnboarding = target === 'onboarding'
  const heading = `Move to ${targetLabel}`

  const [operationsUsers, setOperationsUsers] = useState<OperationsUser[]>([])
  const [assignedOpsId, setAssignedOpsId] = useState('')

  useEffect(() => {
    if (!open || !isOnboarding) return
    fetch('/api/users/operations')
      .then((r) => r.json())
      .then((data) => setOperationsUsers(data.operationsUsers ?? []))
  }, [open, isOnboarding])

  async function confirm() {
    const trimmed = remark.trim()
    if (!trimmed) return
    if (isOnboarding && !assignedOpsId) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ...boardColumnToInput(target),
          remark: trimmed,
          ...(isOnboarding && { assignedOpsId }),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to save')
        return
      }

      // Best-effort — the stage change already succeeded and shouldn't be
      // rolled back or blocked just because the follow-up task failed to save.
      if (scheduleMeeting && meetingDate) {
        fetch('/api/tasks', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ leadId, title: 'Follow-up meeting', dueDate: meetingDate }),
        }).catch(() => {})
      }

      setRemark('')
      setAssignedOpsId('')
      setScheduleMeeting(false)
      setMeetingDate('')
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
        if (!o) {
          setRemark('')
          setAssignedOpsId('')
          setScheduleMeeting(false)
          setMeetingDate('')
        }
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
        {isOnboarding && (
          <div className="space-y-1.5">
            <Label className="text-xs">Assign to operations</Label>
            <Select value={assignedOpsId} onValueChange={setAssignedOpsId}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Choose who handles onboarding" />
              </SelectTrigger>
              <SelectContent>
                {operationsUsers.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {operationsUsers.length === 0 && (
              <p className="text-xs text-muted-foreground">No active operations users yet — add one under Settings.</p>
            )}
          </div>
        )}
        <Textarea
          autoFocus
          rows={4}
          placeholder={isNotInterested ? "e.g. \"Not interested, already using a competitor's product\"" : 'e.g. "Called, asked to follow up next week"'}
          value={remark}
          onChange={(e) => setRemark(e.target.value)}
        />
        <div className="space-y-1.5">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-input"
              checked={scheduleMeeting}
              onChange={(e) => setScheduleMeeting(e.target.checked)}
            />
            Schedule a follow-up meeting
          </label>
          {scheduleMeeting && (
            <Input
              type="date"
              className="h-9"
              value={meetingDate}
              onChange={(e) => setMeetingDate(e.target.value)}
            />
          )}
        </div>
        {error && <p className="text-xs text-rose-600">{error}</p>}
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={confirm}
            disabled={saving || !remark.trim() || (isOnboarding && !assignedOpsId) || (scheduleMeeting && !meetingDate)}
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
