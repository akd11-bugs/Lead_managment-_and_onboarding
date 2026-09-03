'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Loader2, MailCheck } from 'lucide-react'

export default function SignupPage() {
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Join bluSwap</CardTitle>
          <CardDescription>
            {sent
              ? 'Check your inbox for a link to finish creating your account.'
              : "Enter your email and we'll send you a link to set up your account."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="flex flex-col items-center gap-2 py-4 text-center text-sm text-muted-foreground">
              <MailCheck className="h-8 w-8 text-emerald-600" />
              <p>Sent to {email}. The link expires in 30 minutes.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && requestLink()}
                />
              </div>
              {error && <p className="text-sm text-rose-600">{error}</p>}
              <Button className="w-full" onClick={requestLink} disabled={saving || !email}>
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Send me a signup link
              </Button>
            </div>
          )}
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="underline underline-offset-2">
              Log in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
