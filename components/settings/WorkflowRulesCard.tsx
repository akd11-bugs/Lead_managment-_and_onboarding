'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Trash2, Plus } from 'lucide-react'
import { STAGES, STAGE_LABELS, type Stage } from '@/lib/types'

type ActionType = 'create_task' | 'send_email'

interface WorkflowRule {
  id: string
  name: string
  triggerConfig: { toStage: string }
  actionType: ActionType
  actionConfig: Record<string, unknown>
  active: boolean
}

function describeRule(rule: WorkflowRule): string {
  const stageLabel = STAGE_LABELS[rule.triggerConfig.toStage as Stage] ?? rule.triggerConfig.toStage
  const action =
    rule.actionType === 'create_task'
      ? `create task "${rule.actionConfig.title}"`
      : `send email "${rule.actionConfig.subject}"`
  return `When stage changes to ${stageLabel} → ${action}`
}

export function WorkflowRulesCard() {
  const [rules, setRules] = useState<WorkflowRule[]>([])
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [toStage, setToStage] = useState<Stage>('contacted')
  const [actionType, setActionType] = useState<ActionType>('create_task')
  const [taskTitle, setTaskTitle] = useState('')
  const [dueInDays, setDueInDays] = useState('2')
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [emailTo, setEmailTo] = useState<'lead' | 'owner'>('lead')

  function loadRules() {
    fetch('/api/workflow-rules')
      .then((res) => res.json())
      .then((data) => setRules(data.rules ?? []))
  }

  useEffect(loadRules, [])

  function resetForm() {
    setName('')
    setTaskTitle('')
    setDueInDays('2')
    setEmailSubject('')
    setEmailBody('')
    setShowForm(false)
    setError(null)
  }

  async function handleCreate() {
    setSaving(true)
    setError(null)
    try {
      const actionConfig =
        actionType === 'create_task'
          ? { title: taskTitle, dueInDays: Number(dueInDays) || undefined }
          : { subject: emailSubject, body: emailBody, to: emailTo }
      const res = await fetch('/api/workflow-rules', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name,
          triggerType: 'stage_changed',
          triggerConfig: { toStage },
          actionType,
          actionConfig,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Could not create rule')
        return
      }
      setRules((prev) => [data.rule, ...prev])
      resetForm()
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(rule: WorkflowRule) {
    setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, active: !r.active } : r)))
    await fetch(`/api/workflow-rules/${rule.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ active: !rule.active }),
    })
  }

  async function deleteRule(id: string) {
    setRules((prev) => prev.filter((r) => r.id !== id))
    await fetch(`/api/workflow-rules/${id}`, { method: 'DELETE' })
  }

  const canSubmit =
    name.trim() &&
    (actionType === 'create_task' ? taskTitle.trim() : emailSubject.trim() && emailBody.trim())

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Workflow rules</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          When a lead you own changes stage, automatically create a task or send an email.
        </p>

        {rules.length === 0 && !showForm && <p className="text-sm text-muted-foreground">No rules yet.</p>}

        {rules.map((rule) => (
          <div key={rule.id} className="flex items-start justify-between gap-3 rounded-md border px-3 py-2">
            <div className="space-y-1">
              <p className="text-sm font-medium">{rule.name}</p>
              <p className="text-xs text-muted-foreground">{describeRule(rule)}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="cursor-pointer"
                onClick={() => toggleActive(rule)}
              >
                {rule.active ? 'Active' : 'Paused'}
              </Badge>
              <button
                type="button"
                onClick={() => deleteRule(rule.id)}
                className="text-muted-foreground hover:text-destructive"
                aria-label={`Delete rule ${rule.name}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}

        {showForm ? (
          <div className="space-y-3 rounded-md border p-3">
            <div className="space-y-1.5">
              <Label htmlFor="ruleName">Rule name</Label>
              <Input id="ruleName" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Follow up after proposal" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>When stage changes to</Label>
                <Select value={toStage} onValueChange={(v) => setToStage(v as Stage)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STAGES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {STAGE_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Do</Label>
                <Select value={actionType} onValueChange={(v) => setActionType(v as ActionType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="create_task">Create a task</SelectItem>
                    <SelectItem value="send_email">Send an email</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {actionType === 'create_task' ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="taskTitle">Task title</Label>
                  <Input id="taskTitle" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="dueInDays">Due in (days)</Label>
                  <Input id="dueInDays" type="number" min="0" value={dueInDays} onChange={(e) => setDueInDays(e.target.value)} />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="emailSubject">Subject</Label>
                    <Input id="emailSubject" value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Send to</Label>
                    <Select value={emailTo} onValueChange={(v) => setEmailTo(v as 'lead' | 'owner')}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lead">The lead</SelectItem>
                        <SelectItem value="owner">Me</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="emailBody">Body</Label>
                  <Textarea id="emailBody" rows={3} value={emailBody} onChange={(e) => setEmailBody(e.target.value)} />
                </div>
              </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button size="sm" onClick={handleCreate} disabled={saving || !canSubmit}>
                {saving ? 'Creating…' : 'Create rule'}
              </Button>
              <Button size="sm" variant="ghost" onClick={resetForm}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button size="sm" variant="outline" onClick={() => setShowForm(true)}>
            <Plus className="h-3.5 w-3.5" />
            New rule
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
