'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

export default function RedeemInvitePage() {
  const router = useRouter()
  const [form, setForm] = useState({ code: '', email: '', password: '', confirm: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function redeem() {
    setError(null)
    if (form.password !== form.confirm) {
      setError('Passwords do not match')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/invites/redeem', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code: form.code.trim(), email: form.email, password: form.password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to redeem invite')
        return
      }
      router.push('/login?redeemed=1')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Join bluSwap</CardTitle>
          <CardDescription>Enter the invite code your admin gave you, and set your login details.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="code">Invite code</Label>
              <Input
                id="code"
                autoFocus
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="e.g. aB3xQ9zK"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="min 8 characters"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm">Confirm password</Label>
              <Input
                id="confirm"
                type="password"
                value={form.confirm}
                onChange={(e) => setForm({ ...form, confirm: e.target.value })}
              />
            </div>
            {error && <p className="text-sm text-rose-600">{error}</p>}
            <Button
              className="w-full"
              onClick={redeem}
              disabled={saving || !form.code || !form.email || !form.password}
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Create my account
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
