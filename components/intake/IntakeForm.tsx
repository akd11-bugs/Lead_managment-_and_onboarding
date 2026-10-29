'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { CheckCircle2, Loader2 } from 'lucide-react'

interface IntakeField {
  key: string
  label: string
  kind: 'fixed' | 'custom'
  inputType: 'text' | 'email' | 'textarea' | 'number' | 'date' | 'select'
  required: boolean
  options: string[] | null
}

// Which of the fixed values go straight at the top level of the submit
// payload vs into customFields — matches lib/publicLeadIntake.ts's
// PublicIntakeSubmission shape exactly.
const FIXED_KEYS = new Set(['company', 'contactName', 'email', 'phone', 'industry', 'notes'])

export function IntakeForm({ slug }: { slug: string }) {
  const [fields, setFields] = useState<IntakeField[] | null>(null)
  const [values, setValues] = useState<Record<string, string>>({})
  // Honeypot — hidden from real users via CSS, never shown or focused. A
  // genuine visitor's browser never populates this; a bot filling every
  // input it finds does. Submitted to the API, which treats a non-empty
  // value as a silent no-op (see lib/publicLeadIntake.ts).
  const [website_url, setWebsiteUrl] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    fetch(`/api/intake/${slug}/fields`)
      .then((res) => res.json())
      .then((data) => setFields(data.fields ?? []))
      .catch(() => setFields([]))
  }, [slug])

  function setValue(key: string, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const customFields: Record<string, string> = {}
      const payload: Record<string, unknown> = { website_url }
      for (const field of fields ?? []) {
        const value = values[field.key] ?? ''
        if (FIXED_KEYS.has(field.key)) {
          payload[field.key] = value
        } else {
          customFields[field.key] = value
        }
      }
      payload.customFields = customFields

      const res = await fetch(`/api/intake/${slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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

  if (fields === null) {
    return (
      <div className="mx-auto flex max-w-md items-center justify-center gap-2 rounded-lg border p-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading form…
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto flex max-w-md flex-col gap-4 rounded-lg border p-6">
      {fields.map((field) => (
        <div key={field.key} className="grid gap-1.5">
          <Label htmlFor={field.key}>
            {field.label}
            {field.required && <span className="text-destructive"> *</span>}
          </Label>
          {field.inputType === 'textarea' ? (
            <Textarea
              id={field.key}
              value={values[field.key] ?? ''}
              onChange={(e) => setValue(field.key, e.target.value)}
              rows={3}
              required={field.required}
            />
          ) : field.inputType === 'select' ? (
            <select
              id={field.key}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              value={values[field.key] ?? ''}
              onChange={(e) => setValue(field.key, e.target.value)}
              required={field.required}
            >
              <option value="">Select…</option>
              {(field.options ?? []).map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          ) : (
            <Input
              id={field.key}
              type={field.inputType === 'email' ? 'email' : field.inputType === 'number' ? 'number' : field.inputType === 'date' ? 'date' : 'text'}
              value={values[field.key] ?? ''}
              onChange={(e) => setValue(field.key, e.target.value)}
              required={field.required}
            />
          )}
        </div>
      ))}

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
