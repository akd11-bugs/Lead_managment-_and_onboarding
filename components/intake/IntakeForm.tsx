'use client'

import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { CheckCircle2, Loader2 } from 'lucide-react'

export function IntakeForm({ slug }: { slug: string }) {
  const [company, setCompany] = useState('')
  const [contactName, setContactName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [industry, setIndustry] = useState('')
  const [notes, setNotes] = useState('')
  // Honeypot — hidden from real users via CSS, never shown or focused. A
  // genuine visitor's browser never populates this; a bot filling every
  // input it finds does. Submitted to the API, which treats a non-empty
  // value as a silent no-op (see lib/publicLeadIntake.ts).
  const [website_url, setWebsiteUrl] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/intake/${slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company, contactName, email, phone, industry, notes, website_url }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong. Please try again.')
        return
      }
      setDone(true)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-lg border p-8 text-center">
        <CheckCircle2 className="h-10 w-10 text-primary" />
        <p className="text-base font-medium">Thanks — we'll be in touch.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto flex max-w-md flex-col gap-4 rounded-lg border p-6">
      <div className="grid gap-1.5">
        <Label htmlFor="company">Company name</Label>
        <Input id="company" value={company} onChange={(e) => setCompany(e.target.value)} required />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="contactName">Your name</Label>
        <Input id="contactName" value={contactName} onChange={(e) => setContactName(e.target.value)} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="phone">Phone</Label>
        <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="industry">Industry</Label>
        <Input id="industry" value={industry} onChange={(e) => setIndustry(e.target.value)} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="notes">Anything else you'd like to share?</Label>
        <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
      </div>

      {/* Honeypot field — visually hidden, kept in the tab order's reach but
          off-screen rather than display:none (some bots skip display:none
          fields specifically), never labeled so no real user notices it. */}
      <div className="absolute left-[-9999px]" aria-hidden="true">
        <label htmlFor="website_url">Leave this field blank</label>
        <input
          id="website_url"
          name="website_url"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={website_url}
          onChange={(e) => setWebsiteUrl(e.target.value)}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={submitting}>
        {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Submit
      </Button>
    </form>
  )
}
