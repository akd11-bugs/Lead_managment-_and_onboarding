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
import { Copy, Plus, Trash2 } from 'lucide-react'
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
}

interface OrgUser {
  id: string
  name: string
  email: string
}

const emptyDraft = { name: '', slug: '', defaultOwnerUserId: '', defaultSource: 'form' }

export function LeadIntakeFormsCard() {
  const [forms, setForms] = useState<IntakeForm[]>([])
  const [users, setUsers] = useState<OrgUser[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [draft, setDraft] = useState(emptyDraft)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [origin, setOrigin] = useState('')

  useEffect(() => {
    setOrigin(window.location.origin)
    Promise.all([
      fetch('/api/settings/lead-intake-forms').then((res) => res.json()),
      fetch('/api/users').then((res) => res.json()),
    ])
      .then(([formsData, usersData]) => {
        setForms(formsData.forms ?? [])
        setUsers(usersData.users ?? [])
      })
      .finally(() => setLoading(false))
  }, [])

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
    </Card>
  )
}
