'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Send, Loader2, CheckCircle2 } from 'lucide-react'

// Pass `key={leadId}` at every call site — switching leads should give this a
// fresh instance (cleared form, no stale nudge) rather than an effect syncing
// state on prop change.
export function EmailComposer({
  leadId,
  leadEmail,
  isNewStage,
  onSent,
  onMarkContacted,
}: {
  leadId: string
  leadEmail: string
  isNewStage: boolean
  onSent?: () => void
  onMarkContacted?: () => Promise<void> | void
}) {
  const [emailForm, setEmailForm] = useState({ subject: '', body: '' })
  const [sendingEmail, setSendingEmail] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [justSentEmail, setJustSentEmail] = useState(false)
  const [markingContacted, setMarkingContacted] = useState(false)

  async function sendLeadEmail() {
    if (!emailForm.subject || !emailForm.body) return
    setSendingEmail(true)
    setEmailError(null)
    try {
      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ leadId, subject: emailForm.subject, body: emailForm.body }),
      })
      const data = await res.json()
      if (!res.ok) {
        setEmailError(data.error ?? 'Failed to send email')
        return
      }
      setEmailForm({ subject: '', body: '' })
      if (isNewStage) setJustSentEmail(true)
      onSent?.()
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : String(err))
    } finally {
      setSendingEmail(false)
    }
  }

  async function markContacted() {
    if (!onMarkContacted) return
    setMarkingContacted(true)
    try {
      await onMarkContacted()
      setJustSentEmail(false)
    } finally {
      setMarkingContacted(false)
    }
  }

  return (
    <div className="space-y-3">
      {justSentEmail && isNewStage && (
        <div className="flex items-center gap-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span className="flex-1">Email sent — mark this lead as Contacted?</span>
          <Button size="sm" onClick={markContacted} disabled={markingContacted}>
            Mark as Contacted
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setJustSentEmail(false)}>
            Not now
          </Button>
        </div>
      )}

      <div className="rounded-md border p-3 space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Send className="h-3.5 w-3.5 text-muted-foreground" />
          Send an email
          <span className="text-xs text-muted-foreground font-normal ml-auto">to {leadEmail}</span>
        </div>
        {isNewStage && (
          <p className="text-xs text-muted-foreground">
            This lead hasn&apos;t been contacted yet — sending an email is the first touch.
          </p>
        )}
        <Input
          placeholder="Subject"
          value={emailForm.subject}
          onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
        />
        <Textarea
          placeholder="Write your message…"
          rows={4}
          value={emailForm.body}
          onChange={(e) => setEmailForm({ ...emailForm, body: e.target.value })}
        />
        {emailError && <p className="text-xs text-rose-600">{emailError}</p>}
        <div className="flex justify-end">
          <Button size="sm" onClick={sendLeadEmail} disabled={!emailForm.subject || !emailForm.body || sendingEmail}>
            {sendingEmail ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            Send
          </Button>
        </div>
      </div>
    </div>
  )
}
