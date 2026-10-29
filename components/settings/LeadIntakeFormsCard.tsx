'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Copy, Plus, Trash2, Settings2, ChevronUp, ChevronDown, X } from 'lucide-react'
import { SOURCES, SOURCE_LABELS } from '@/lib/types'

interface IntakeForm {
  id: string
  name: string
  slug: string
  enabled: boolean
  defaultOwnerUserId: string
  defaultSource: string
  submissionCount: number
  configuredAt: string
  fieldConfigJson: string
}

interface OrgUser {
  id: string
  name: string
  email: string
}

interface CustomFieldOption {
  key: string
  label: string
}

interface FieldConfigEntry {
  key: string
  required: boolean
}

// Mirrors lib/intakeFormFields.ts's FIXED_FIELD_META — kept in sync by hand
// since one is server-only (reads LeadFieldDefinition) and this is a static
// client-side label list with no reason to round-trip an API call for it.
const FIXED_FIELDS: { key: string; label: string; alwaysRequired: boolean }[] = [
  { key: 'company', label: 'Company name', alwaysRequired: true },
  { key: 'contactName', label: 'Your name', alwaysRequired: false },
  { key: 'email', label: 'Email', alwaysRequired: true },
  { key: 'phone', label: 'Phone', alwaysRequired: false },
  { key: 'industry', label: 'Industry', alwaysRequired: false },
  { key: 'notes', label: "Anything else you'd like to share?", alwaysRequired: false },
]

function parseFieldConfig(json: string): FieldConfigEntry[] {
  try {
    const parsed = JSON.parse(json)
    return Array.isArray(parsed) ? parsed.filter((e) => typeof e?.key === 'string').map((e) => ({ key: e.key, required: !!e.required })) : []
  } catch {
    return []
  }
}

const emptyDraft = { name: '', slug: '', defaultOwnerUserId: '', defaultSource: 'form' }

export function LeadIntakeFormsCard() {
  const [forms, setForms] = useState<IntakeForm[]>([])
  const [users, setUsers] = useState<OrgUser[]>([])
  const [customFields, setCustomFields] = useState<CustomFieldOption[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [draft, setDraft] = useState(emptyDraft)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [origin, setOrigin] = useState('')
  const [fieldsForm, setFieldsForm] = useState<IntakeForm | null>(null)
  const [fieldConfig, setFieldConfig] = useState<FieldConfigEntry[]>([])
  const [savingFields, setSavingFields] = useState(false)

  useEffect(() => {
    setOrigin(window.location.origin)
    Promise.all([
      fetch('/api/settings/lead-intake-forms').then((res) => res.json()),
      fetch('/api/users').then((res) => res.json()),
    ])
      .then(([formsData, usersData]) => {
        setForms(formsData.forms ?? [])
        setCustomFields(formsData.customFields ?? [])
        setUsers(usersData.users ?? [])
      })
      .finally(() => setLoading(false))
  }, [])

  const allFields = [
    ...FIXED_FIELDS.map((f) => ({ key: f.key, label: f.label, alwaysRequired: f.alwaysRequired, kind: 'fixed' as const })),
    ...customFields.map((f) => ({ key: f.key, label: f.label, alwaysRequired: false, kind: 'custom' as const })),
  ]

  function openFieldsDialog(form: IntakeForm) {
    const existing = parseFieldConfig(form.fieldConfigJson)
    // "[]" (never configured) defaults to the exact fixed set in its
    // existing order — the same fallback resolveIntakeFormFields applies
    // server-side, so the editor opens already showing what submitters
    // currently see rather than an empty list.
    setFieldConfig(
      existing.length > 0
        ? existing
        : FIXED_FIELDS.map((f) => ({ key: f.key, required: f.alwaysRequired })),
    )
    setFieldsForm(form)
  }

  function addField(key: string) {
    setFieldConfig((prev) => [...prev, { key, required: false }])
  }
  function removeField(key: string) {
    setFieldConfig((prev) => prev.filter((e) => e.key !== key))
  }
  function toggleRequired(key: string) {
    setFieldConfig((prev) => prev.map((e) => (e.key === key ? { ...e, required: !e.required } : e)))
  }
  function moveField(index: number, dir: -1 | 1) {
    setFieldConfig((prev) => {
      const next = [...prev]
      const target = index + dir
      if (target < 0 || target >= next.length) return prev
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  async function saveFieldConfig() {
    if (!fieldsForm) return
    setSavingFields(true)
    try {
      const res = await fetch(`/api/settings/lead-intake-forms/${fieldsForm.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ fieldConfig }),
      })
      if (res.ok) {
        const data = await res.json()
        setForms((prev) => prev.map((f) => (f.id === fieldsForm.id ? data.form : f)))
        setFieldsForm(null)
      }
    } finally {
      setSavingFields(false)
    }
  }

  function openNewDialog() {
    setDraft(emptyDraft)
    setError(null)
    setDialogOpen(true)
  }

  async function handleCreate() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/settings/lead-intake-forms', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(draft),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Could not create form')
        return
      }
      setForms((prev) => [data.form, ...prev])
      setDialogOpen(false)
    } finally {
      setSaving(false)
    }
  }

  async function handleToggle(form: IntakeForm) {
    const res = await fetch(`/api/settings/lead-intake-forms/${form.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ enabled: !form.enabled }),
    })
    if (res.ok) {
      const data = await res.json()
      setForms((prev) => prev.map((f) => (f.id === form.id ? data.form : f)))
    }
  }

  async function handleDelete(form: IntakeForm) {
    if (!confirm(`Delete "${form.name}"? Its link will stop working immediately.`)) return
    const res = await fetch(`/api/settings/lead-intake-forms/${form.id}`, { method: 'DELETE' })
    if (res.ok) setForms((prev) => prev.filter((f) => f.id !== form.id))
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">Lead intake forms</CardTitle>
        <Button size="sm" variant="outline" onClick={openNewDialog}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          New form
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Public links that turn a submission into a lead with zero manual entry — hand one to a partner, print it on
          a flyer, or post it at an event booth. Basic spam protection only (rate limiting + a hidden honeypot field)
          — for abuse at scale, disable the link below and issue a new one.
        </p>

        {!loading && forms.length === 0 && (
          <p className="text-sm text-muted-foreground">No forms yet — create one to get a shareable link.</p>
        )}

        <div className="space-y-2">
          {forms.map((form) => {
            const url = origin ? `${origin}/intake/${form.slug}` : `/intake/${form.slug}`
            const owner = users.find((u) => u.id === form.defaultOwnerUserId)
            return (
              <div key={form.id} className="rounded-md border p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{form.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {SOURCE_LABELS[form.defaultSource as keyof typeof SOURCE_LABELS] ?? form.defaultSource} · owner:{' '}
                      {owner?.name ?? 'unknown'} · {form.submissionCount} submission{form.submissionCount === 1 ? '' : 's'}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant="outline" className="cursor-pointer" onClick={() => handleToggle(form)}>
                      {form.enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                    <button
                      type="button"
                      onClick={() => openFieldsDialog(form)}
                      className="text-muted-foreground hover:text-foreground"
                      aria-label={`Edit fields for ${form.name}`}
                      title="Edit fields"
                    >
                      <Settings2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(form)}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label={`Delete form ${form.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-1.5">
                  <code className="flex-1 truncate text-xs">{url}</code>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(url)}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label="Copy link"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New lead intake form</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="intakeName">Name</Label>
              <Input
                id="intakeName"
                placeholder="e.g. Shopify Unite booth"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="intakeSlug">Link (optional — generated from name otherwise)</Label>
              <Input
                id="intakeSlug"
                placeholder="shopify-unite-2026"
                value={draft.slug}
                onChange={(e) => setDraft({ ...draft, slug: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="intakeOwner">Default owner (new leads go here)</Label>
              <select
                id="intakeOwner"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                value={draft.defaultOwnerUserId}
                onChange={(e) => setDraft({ ...draft, defaultOwnerUserId: e.target.value })}
              >
                <option value="">Select a user…</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="intakeSource">Source</Label>
              <select
                id="intakeSource"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                value={draft.defaultSource}
                onChange={(e) => setDraft({ ...draft, defaultSource: e.target.value })}
              >
                {SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {SOURCE_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button onClick={handleCreate} disabled={saving || !draft.name || !draft.defaultOwnerUserId}>
              {saving ? 'Creating…' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!fieldsForm} onOpenChange={(open) => !open && setFieldsForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fields for {fieldsForm?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Reorder, require, or remove fields on this form. Company and email are always required and always
              shown — they're what turns a submission into a lead.
            </p>
            <div className="space-y-1.5">
              {fieldConfig.map((entry, i) => {
                const def = allFields.find((f) => f.key === entry.key)
                const alwaysRequired = def?.alwaysRequired ?? false
                return (
                  <div key={entry.key} className="flex items-center gap-2 rounded-md border px-2.5 py-1.5">
                    <div className="flex flex-col">
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                        disabled={i === 0}
                        onClick={() => moveField(i, -1)}
                        aria-label="Move up"
                      >
                        <ChevronUp className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                        disabled={i === fieldConfig.length - 1}
                        onClick={() => moveField(i, 1)}
                        aria-label="Move down"
                      >
                        <ChevronDown className="h-3 w-3" />
                      </button>
                    </div>
                    <span className="flex-1 truncate text-sm">{def?.label ?? entry.key}</span>
                    <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={entry.required || alwaysRequired}
                        disabled={alwaysRequired}
                        onChange={() => toggleRequired(entry.key)}
                      />
                      Required
                    </label>
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-destructive disabled:opacity-30"
                      disabled={alwaysRequired}
                      onClick={() => removeField(entry.key)}
                      aria-label={`Remove ${def?.label ?? entry.key}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )
              })}
            </div>

            {allFields.filter((f) => !fieldConfig.some((e) => e.key === f.key)).length > 0 && (
              <div className="space-y-1.5 border-t pt-3">
                <p className="text-xs font-medium text-muted-foreground">Add a field</p>
                <div className="flex flex-wrap gap-1.5">
                  {allFields
                    .filter((f) => !fieldConfig.some((e) => e.key === f.key))
                    .map((f) => (
                      <Button key={f.key} size="sm" variant="outline" className="h-7 text-xs" onClick={() => addField(f.key)}>
                        <Plus className="mr-1 h-3 w-3" />
                        {f.label}
                      </Button>
                    ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={saveFieldConfig} disabled={savingFields}>
              {savingFields ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
