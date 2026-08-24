'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CheckCircle2 } from 'lucide-react'

export function EmailSettingsCard() {
  const [loading, setLoading] = useState(true)
  const [configured, setConfigured] = useState(false)
  const [currentAddress, setCurrentAddress] = useState<string | null>(null)
  const [emailFromAddress, setEmailFromAddress] = useState('')
  const [appPassword, setAppPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/settings/email')
      .then((res) => res.json())
      .then((data) => {
        setConfigured(!!data.configured)
        setCurrentAddress(data.emailFromAddress ?? null)
      })
      .finally(() => setLoading(false))
  }, [])

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/settings/email', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ emailFromAddress, appPassword }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Could not save')
        return
      }
      setConfigured(true)
      setCurrentAddress(data.emailFromAddress)
      setAppPassword('')
    } finally {
      setSaving(false)
    }
  }

  async function handleRemove() {
    setSaving(true)
    try {
      await fetch('/api/settings/email', { method: 'DELETE' })
      setConfigured(false)
      setCurrentAddress(null)
      setEmailFromAddress('')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Your email</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Configure a Gmail app password so emails sent by workflow rules (and future automated sends) come from your
          own address instead of the shared mailbox.
        </p>
        {!loading && configured && (
          <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Configured for {currentAddress}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="emailFromAddress">Gmail address</Label>
            <Input
              id="emailFromAddress"
              type="email"
              placeholder={currentAddress ?? 'you@gmail.com'}
              value={emailFromAddress}
              onChange={(e) => setEmailFromAddress(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="appPassword">App password</Label>
            <Input
              id="appPassword"
              type="password"
              autoComplete="off"
              placeholder="16-character app password"
              value={appPassword}
              onChange={(e) => setAppPassword(e.target.value)}
            />
          </div>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-2">
          <Button size="sm" onClick={handleSave} disabled={saving || !emailFromAddress || !appPassword}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
          {configured && (
            <Button size="sm" variant="outline" onClick={handleRemove} disabled={saving}>
              Remove
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
