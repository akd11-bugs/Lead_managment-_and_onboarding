'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CheckCircle2 } from 'lucide-react'

interface OrgEmailConfig {
  smtpHost: string
  smtpPort: number
  smtpSecure: boolean
  smtpUser: string
  fromAddress: string
  fromName: string | null
  configuredAt: string
}

export function OrgEmailSettingsCard() {
  const [loading, setLoading] = useState(true)
  const [config, setConfig] = useState<OrgEmailConfig | null>(null)
  const [form, setForm] = useState({ smtpHost: '', smtpPort: '587', smtpSecure: true, smtpUser: '', smtpPass: '', fromAddress: '', fromName: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/settings/org-email')
      .then((res) => res.json())
      .then((data) => {
        setConfig(data.config ?? null)
        if (data.config) {
          setForm((f) => ({
            ...f,
            smtpHost: data.config.smtpHost,
            smtpPort: String(data.config.smtpPort),
            smtpSecure: data.config.smtpSecure,
            smtpUser: data.config.smtpUser,
            fromAddress: data.config.fromAddress,
            fromName: data.config.fromName ?? '',
          }))
        }
      })
      .finally(() => setLoading(false))
  }, [])

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/settings/org-email', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...form, smtpPort: Number(form.smtpPort) }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Could not save')
        return
      }
      setConfig(data.config)
      setForm((f) => ({ ...f, smtpPass: '' }))
    } finally {
      setSaving(false)
    }
  }

  async function handleRemove() {
    setSaving(true)
    try {
      await fetch('/api/settings/org-email', { method: 'DELETE' })
      setConfig(null)
      setForm({ smtpHost: '', smtpPort: '587', smtpSecure: true, smtpUser: '', smtpPass: '', fromAddress: '', fromName: '' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Organization mailbox</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Bring your own SMTP so emails from this org (daily reports, signup/invite links, workflow rules with no
          per-rep mailbox configured) send from your own domain instead of the shared app mailbox.
        </p>
        {!loading && config && (
          <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Configured — sending as {config.fromAddress} via {config.smtpHost}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="smtpHost">SMTP host</Label>
            <Input id="smtpHost" placeholder="smtp.yourdomain.com" value={form.smtpHost} onChange={(e) => setForm({ ...form, smtpHost: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="smtpPort">Port</Label>
            <Input id="smtpPort" type="number" placeholder="587" value={form.smtpPort} onChange={(e) => setForm({ ...form, smtpPort: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="smtpUser">SMTP username</Label>
            <Input id="smtpUser" value={form.smtpUser} onChange={(e) => setForm({ ...form, smtpUser: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="smtpPass">SMTP password</Label>
            <Input
              id="smtpPass"
              type="password"
              autoComplete="off"
              placeholder={config ? 'unchanged — leave blank to keep' : 'required'}
              value={form.smtpPass}
              onChange={(e) => setForm({ ...form, smtpPass: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fromAddress">From address</Label>
            <Input id="fromAddress" type="email" placeholder="noreply@yourdomain.com" value={form.fromAddress} onChange={(e) => setForm({ ...form, fromAddress: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fromName">From name (optional)</Label>
            <Input id="fromName" placeholder="Your Company" value={form.fromName} onChange={(e) => setForm({ ...form, fromName: e.target.value })} />
          </div>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-2">
          <Button size="sm" onClick={handleSave} disabled={saving || !form.smtpHost || !form.smtpPort || !form.smtpUser || !form.fromAddress}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
          {config && (
            <Button size="sm" variant="outline" onClick={handleRemove} disabled={saving}>
              Remove
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
