'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Trash2, Plus, Copy } from 'lucide-react'
import { STAGES, STAGE_LABELS, type Stage } from '@/lib/types'

type ActionType = 'create_task' | 'send_email' | 'call_webhook'

interface WorkflowRule {
  id: string
  name: string
  triggerConfig: { toStage: string }
  actionType: ActionType
  actionConfig: Record<string, unknown>
  active: boolean
}

// One entry per action type instead of a matching three-way if/else chain
// repeated at every call site (the Select options list, the rule-list
// description, the create-form's config builder, and its validity check) —
// adding a 4th action type only means adding a row here.
const ACTION_TYPE_META: Record<ActionType, { label: string; describe: (config: Record<string, unknown>) => string }> = {
  create_task: { label: 'Create a task', describe: (c) => `create task "${c.title}"` },
  send_email: { label: 'Send an email', describe: (c) => `send email "${c.subject}"` },
  call_webhook: { label: 'Call a webhook', describe: (c) => `call webhook ${c.url}` },
}

function describeRule(rule: WorkflowRule): string {
  const stageLabel = STAGE_LABELS[rule.triggerConfig.toStage as Stage] ?? rule.triggerConfig.toStage
  return `When stage changes to ${stageLabel} → ${ACTION_TYPE_META[rule.actionType].describe(rule.actionConfig)}`
}

export function WorkflowRulesCard() {
  const [rules, setRules] = useState<WorkflowRule[]>([])
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [toStage, setToStage] = useState<Stage>('pending')
  const [actionType, setActionType] = useState<ActionType>('create_task')
  const [taskTitle, setTaskTitle] = useState('')
  const [dueInDays, setDueInDays] = useState('2')
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [emailTo, setEmailTo] = useState<'lead' | 'owner'>('lead')
  const [webhookUrl, setWebhookUrl] = useState('')
  const [newSigningSecret, setNewSigningSecret] = useState<string | null>(null)

  // Same reasoning as ACTION_TYPE_META above, but these two depend on the
  // form's current state, so they're built per-render inside the component
  // instead of living at module scope.
  const actionForms: Record<ActionType, { buildConfig: () => Record<string, unknown>; isValid: boolean }> = {
    create_task: {
      buildConfig: () => ({ title: taskTitle, dueInDays: Number(dueInDays) || undefined }),
      isValid: !!taskTitle.trim(),
    },
    send_email: {
      buildConfig: () => ({ subject: emailSubject, body: emailBody, to: emailTo }),
      isValid: !!(emailSubject.trim() && emailBody.trim()),
    },
    call_webhook: {
      buildConfig: () => ({ url: webhookUrl }),
      isValid: !!webhookUrl.trim(),
    },
  }

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
    setWebhookUrl('')
    setShowForm(false)
    setError(null)
  }

  async function handleCreate() {
    setSaving(true)
    setError(null)
    try {
      const actionConfig = actionForms[actionType].buildConfig()
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
      if (data.signingSecret) setNewSigningSecret(data.signingSecret)
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

  const canSubmit = name.trim() && actionForms[actionType].isValid

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Workflow rules</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          When a lead you own changes stage, automatically create a task, send an email, or call a webhook.
        </p>

        {newSigningSecret && (
          <div className="space-y-1.5 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm dark:border-amber-900 dark:bg-amber-950">
            <p className="font-medium text-amber-900 dark:text-amber-300">
              Signing secret — shown once, copy it now
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate rounded bg-background px-2 py-1 text-xs">{newSigningSecret}</code>
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(newSigningSecret)}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Copy signing secret"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setNewSigningSecret(null)}
                className="text-xs text-muted-foreground underline underline-offset-2"
              >
                Dismiss
              </button>
            </div>
            <p className="text-xs text-amber-800 dark:text-amber-400">
              Use this to verify the <code>x-webhook-signature</code> header (HMAC-SHA256 of the raw request body) on
              requests this rule sends. It won&apos;t be shown again.
            </p>
          </div>
        )}

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
                    {(Object.keys(ACTION_TYPE_META) as ActionType[]).map((type) => (
                      <SelectItem key={type} value={type}>
                        {ACTION_TYPE_META[type].label}
                      </SelectItem>
                    ))}
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
            ) : actionType === 'send_email' ? (
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
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="webhookUrl">Webhook URL</Label>
                <Input
                  id="webhookUrl"
                  type="url"
                  placeholder="https://your-system.example.com/hooks/lead-stage"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  We&apos;ll POST a JSON payload, signed with a secret you&apos;ll get once the rule is created.
                </p>
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
