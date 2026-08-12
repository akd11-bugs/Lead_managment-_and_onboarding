'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Send, Loader2, CheckCircle2 } from 'lucide-react'

// For recipients who aren't a lead in the system — no leadId, so nothing gets
// logged as an Activity. Compare to EmailComposer, which is always lead-scoped.
export function CustomEmailComposer() {
  const [to, setTo] = useState('')
  const [form, setForm] = useState({ subject: '', body: '' })
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  async function send() {
    if (!to || !form.subject || !form.body) return
    setSending(true)
    setError(null)
    setSent(false)
    try {
      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ to, subject: form.subject, body: form.body }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to send email')
        return
      }
      setForm({ subject: '', body: '' })
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="rounded-md border p-3 space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Send className="h-3.5 w-3.5 text-muted-foreground" />
        Send to a custom address
      </div>
      <p className="text-xs text-muted-foreground">
        For anyone who isn&apos;t a lead in the system yet — this won&apos;t be logged on any lead&apos;s activity timeline.
      </p>
      <Input type="email" placeholder="someone@example.com" value={to} onChange={(e) => setTo(e.target.value)} />
      <Input
        placeholder="Subject"
        value={form.subject}
        onChange={(e) => setForm({ ...form, subject: e.target.value })}
      />
      <Textarea
        placeholder="Write your message…"
        rows={4}
        value={form.body}
        onChange={(e) => setForm({ ...form, body: e.target.value })}
      />
      {error && <p className="text-xs text-rose-600">{error}</p>}
      {sent && (
        <p className="flex items-center gap-1.5 text-xs text-emerald-600">
          <CheckCircle2 className="h-3.5 w-3.5" /> Sent to {to}
        </p>
      )}
      <div className="flex justify-end">
        <Button size="sm" onClick={send} disabled={!to || !form.subject || !form.body || sending}>
          {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          Send
        </Button>
      </div>
    </div>
  )
}
