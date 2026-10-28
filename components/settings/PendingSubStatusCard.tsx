'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Plus, Star, Trash2 } from 'lucide-react'

interface SubStatusRow {
  id: string
  key: string
  label: string
  owner: 'us' | 'external'
  isDefault: boolean
}

// Fully admin add/remove/rename-able — no locked/core row the way pipeline
// stages and the final onboarding step have (see PipelineConfigCard). Every
// business splits "who's turn is it to act" on a pending lead differently —
// not everyone sells through a PSP — so there's no built-in value worth
// protecting here. `owner` drives the dashboard's Ghosted/Follow-up alerts
// generically (lib/alerts.ts); `isDefault` is what a lead entering Pending
// with no explicit sub-status gets assigned (lib/leadStage.ts).
export function PendingSubStatusCard({ initialSubStatuses }: { initialSubStatuses: SubStatusRow[] }) {
  const [subStatuses, setSubStatuses] = useState(initialSubStatuses)
  const [newLabel, setNewLabel] = useState('')
  const [newOwner, setNewOwner] = useState<'us' | 'external'>('external')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function rename(id: string, label: string) {
    setSubStatuses((prev) => prev.map((s) => (s.id === id ? { ...s, label } : s)))
    await fetch(`/api/pipeline-config/pending-sub-statuses/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ label }),
    })
  }

  async function setOwner(id: string, owner: 'us' | 'external') {
    setSubStatuses((prev) => prev.map((s) => (s.id === id ? { ...s, owner } : s)))
    await fetch(`/api/pipeline-config/pending-sub-statuses/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ owner }),
    })
  }

  async function setDefault(id: string) {
    setSubStatuses((prev) => prev.map((s) => ({ ...s, isDefault: s.id === id })))
    await fetch(`/api/pipeline-config/pending-sub-statuses/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ isDefault: true }),
    })
  }

  async function add() {
    if (!newLabel.trim()) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/pipeline-config/pending-sub-statuses', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ label: newLabel.trim(), owner: newOwner }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to add')
        return
      }
      setSubStatuses((prev) => [...prev, data.subStatus])
      setNewLabel('')
    } finally {
      setSaving(false)
    }
  }

  async function remove(id: string) {
    if (!confirm('Remove this pending sub-status? Leads currently using it must be moved first.')) return
    setError(null)
    const res = await fetch(`/api/pipeline-config/pending-sub-statuses/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const data = await res.json().catch(() => null)
      setError(data?.error ?? 'Failed to remove')
      return
    }
    setSubStatuses((prev) => prev.filter((s) => s.id !== id))
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Pending sub-statuses</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Who&apos;s turn it is to act on a lead sitting in Pending — split it however your business actually works
          (not every org sells through a PSP). The starred one is what a lead gets by default when it first enters
          Pending.
        </p>
        <div className="space-y-1.5">
          {subStatuses.map((s) => (
            <div key={s.id} className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm">
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 shrink-0"
                onClick={() => !s.isDefault && setDefault(s.id)}
                aria-label={s.isDefault ? 'Default sub-status' : 'Set as default'}
                disabled={s.isDefault}
              >
                <Star className={s.isDefault ? 'h-3.5 w-3.5 fill-amber-400 text-amber-400' : 'h-3.5 w-3.5 text-muted-foreground'} />
              </Button>
              <Input
                className="h-7 flex-1"
                defaultValue={s.label}
                onBlur={(e) => e.target.value.trim() && e.target.value !== s.label && rename(s.id, e.target.value.trim())}
              />
              <div className="flex shrink-0 gap-1">
                <Badge
                  variant={s.owner === 'us' ? 'default' : 'outline'}
                  className="cursor-pointer text-[10px]"
                  onClick={() => setOwner(s.id, 'us')}
                >
                  Us
                </Badge>
                <Badge
                  variant={s.owner === 'external' ? 'default' : 'outline'}
                  className="cursor-pointer text-[10px]"
                  onClick={() => setOwner(s.id, 'external')}
                >
                  External
                </Badge>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 shrink-0 text-rose-600 hover:text-rose-700"
                onClick={() => remove(s.id)}
                disabled={subStatuses.length <= 1}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
        <div className="flex gap-2 pt-1">
          <Input className="h-8 flex-1" placeholder="New sub-status name" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} />
          <div className="flex shrink-0 gap-1">
            <Badge
              variant={newOwner === 'us' ? 'default' : 'outline'}
              className="cursor-pointer text-[10px]"
              onClick={() => setNewOwner('us')}
            >
              Us
            </Badge>
            <Badge
              variant={newOwner === 'external' ? 'default' : 'outline'}
              className="cursor-pointer text-[10px]"
              onClick={() => setNewOwner('external')}
            >
              External
            </Badge>
          </div>
          <Button size="sm" onClick={add} disabled={saving || !newLabel.trim()}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Add
          </Button>
        </div>
        {error && <p className="text-xs text-rose-600">{error}</p>}
      </CardContent>
    </Card>
  )
}
