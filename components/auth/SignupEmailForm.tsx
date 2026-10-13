'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Loader2, MailCheck } from 'lucide-react'

export function SignupEmailForm() {
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  async function requestLink() {
    setError(null)
    setSaving(true)
    try {
      const res = await fetch('/api/signup/request', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to send the link')
        return
      }
      setSent(true)
    } finally {
      setSaving(false)
    }
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-2 py-4 text-center text-sm text-muted-foreground">
        <MailCheck className="h-8 w-8 text-emerald-600" />
        <p>Sent to {email}. The link expires in 30 minutes.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && requestLink()}
        />
      </div>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <Button className="w-full" variant="outline" onClick={requestLink} disabled={saving || !email}>
        {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        Send me a signup link
      </Button>
    </div>
  )
}
