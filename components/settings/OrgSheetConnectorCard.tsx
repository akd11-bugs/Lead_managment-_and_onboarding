'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CheckCircle2, Copy } from 'lucide-react'

interface OrgSheetConnector {
  sheetId: string
  sheetRange: string
  defaultOwnerUserId: string
  enabled: boolean
  lastSyncedAt: string | null
  configuredAt: string
}

interface OrgUser {
  id: string
  name: string
  email: string
}

export function OrgSheetConnectorCard() {
  const [loading, setLoading] = useState(true)
  const [connector, setConnector] = useState<OrgSheetConnector | null>(null)
  const [serviceAccountEmail, setServiceAccountEmail] = useState<string | null>(null)
  const [users, setUsers] = useState<OrgUser[]>([])
  const [form, setForm] = useState({ sheetId: '', sheetRange: 'Sheet1', defaultOwnerUserId: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/settings/org-sheet-connector').then((res) => res.json()),
      fetch('/api/users').then((res) => res.json()),
    ])
      .then(([connectorData, usersData]) => {
        setConnector(connectorData.connector ?? null)
        setServiceAccountEmail(connectorData.serviceAccountEmail ?? null)
        setUsers(usersData.users ?? [])
        if (connectorData.connector) {
          setForm({
            sheetId: connectorData.connector.sheetId,
            sheetRange: connectorData.connector.sheetRange,
            defaultOwnerUserId: connectorData.connector.defaultOwnerUserId,
          })
        }
      })
      .finally(() => setLoading(false))
  }, [])

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/settings/org-sheet-connector', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Could not save')
        return
      }
      setConnector(data.connector)
      setServiceAccountEmail(data.serviceAccountEmail ?? serviceAccountEmail)
    } finally {
      setSaving(false)
    }
  }

  async function handleRemove() {
    setSaving(true)
    try {
      await fetch('/api/settings/org-sheet-connector', { method: 'DELETE' })
      setConnector(null)
      setForm({ sheetId: '', sheetRange: 'Sheet1', defaultOwnerUserId: '' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Google Sheet lead sync</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Connect your own Google Sheet so new rows sync in automatically — no backend config from us needed. Share
          the sheet below with our sync account, then paste the sheet&apos;s ID. Unmatched rows land on the default owner
          you pick.
        </p>

        {serviceAccountEmail && (
          <div className="space-y-1">
            <Label>Share your sheet with</Label>
            <div className="flex items-center gap-2 rounded-md border px-3 py-2">
              <code className="flex-1 truncate text-xs">{serviceAccountEmail}</code>
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(serviceAccountEmail)}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Copy service account email"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">Give it Viewer access in the sheet&apos;s Share dialog.</p>
          </div>
        )}

        {!loading && connector && (
          <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Connected — {connector.lastSyncedAt ? `last synced ${new Date(connector.lastSyncedAt).toLocaleString()}` : 'not yet synced'}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="sheetId">Sheet ID</Label>
            <Input
              id="sheetId"
              placeholder="from the sheet's URL"
              value={form.sheetId}
              onChange={(e) => setForm({ ...form, sheetId: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sheetRange">Range</Label>
            <Input id="sheetRange" placeholder="Sheet1" value={form.sheetRange} onChange={(e) => setForm({ ...form, sheetRange: e.target.value })} />
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label htmlFor="defaultOwnerUserId">Default owner (unmatched rows)</Label>
            <select
              id="defaultOwnerUserId"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              value={form.defaultOwnerUserId}
              onChange={(e) => setForm({ ...form, defaultOwnerUserId: e.target.value })}
            >
              <option value="">Select a user…</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </select>
          </div>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-2">
          <Button size="sm" onClick={handleSave} disabled={saving || !form.sheetId || !form.defaultOwnerUserId}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
          {connector && (
            <Button size="sm" variant="outline" onClick={handleRemove} disabled={saving}>
              Disconnect
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
