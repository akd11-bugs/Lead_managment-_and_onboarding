'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2 } from 'lucide-react'

export function LeadDiscoveryEditor({
  leadId,
  initialPainPoints,
  initialWhatTheyWant,
  initialNotes,
}: {
  leadId: string
  initialPainPoints: string
  initialWhatTheyWant: string
  initialNotes: string
}) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)

  async function patch(field: string, value: string) {
    setSaving(true)
    try {
      await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      })
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Discovery & notes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Pain points</Label>
            <Textarea
              rows={3}
              placeholder="What's hurting them today?"
              defaultValue={initialPainPoints}
              onBlur={(e) => {
                if (e.target.value !== initialPainPoints) patch('painPoints', e.target.value)
              }}
              disabled={saving}
            />
          </div>
          <div className="space-y-1.5">
            <Label>What they want</Label>
            <Textarea
              rows={3}
              placeholder="What are they actually asking for?"
              defaultValue={initialWhatTheyWant}
              onBlur={(e) => {
                if (e.target.value !== initialWhatTheyWant) patch('whatTheyWant', e.target.value)
              }}
              disabled={saving}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Notes</Label>
          <Textarea
            rows={4}
            placeholder="Rationale, company background, anything worth remembering…"
            defaultValue={initialNotes}
            onBlur={(e) => {
              if (e.target.value !== initialNotes) patch('notes', e.target.value)
            }}
            disabled={saving}
          />
        </div>
      </CardContent>
    </Card>
  )
}
