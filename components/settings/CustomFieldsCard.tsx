'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Plus, Trash2 } from 'lucide-react'

interface FieldRow {
  id: string
  key: string
  label: string
  type: 'text' | 'number' | 'date' | 'select'
  options: string[] | null
  required: boolean
}

type FieldType = FieldRow['type']

const TYPE_LABELS: Record<FieldType, string> = { text: 'Text', number: 'Number', date: 'Date', select: 'Dropdown' }

// Fully admin-owned — unlike pipeline stages/steps, no business logic
// anywhere depends on a custom field, so there's no "core/locked" row here.
export function CustomFieldsCard({ initialFields }: { initialFields: FieldRow[] }) {
  const [fields, setFields] = useState(initialFields)
  const [label, setLabel] = useState('')
  const [type, setType] = useState<FieldType>('text')
  const [optionsText, setOptionsText] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function addField() {
    if (!label.trim()) return
    if (type === 'select' && !optionsText.trim()) {
      setError('Enter at least one option (comma-separated)')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/lead-field-definitions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          label: label.trim(),
          type,
          options: type === 'select' ? optionsText.split(',').map((o) => o.trim()).filter(Boolean) : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to add field')
        return
      }
      setFields((prev) => [...prev, data.field])
      setLabel('')
      setOptionsText('')
    } finally {
      setSaving(false)
    }
  }

  async function removeField(id: string) {
    if (!confirm('Remove this custom field? Existing values on leads are kept but will no longer be shown.')) return
    const res = await fetch(`/api/lead-field-definitions/${id}`, { method: 'DELETE' })
    if (res.ok) setFields((prev) => prev.filter((f) => f.id !== id))
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Custom lead fields</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          {fields.map((f) => (
            <div key={f.id} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm">
              <div className="min-w-0">
                <p className="font-medium truncate">{f.label}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {TYPE_LABELS[f.type]}
                  {f.type === 'select' && f.options ? ` — ${f.options.join(', ')}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {f.required && (
                  <Badge variant="outline" className="text-[10px]">
                    required
                  </Badge>
                )}
                <Button size="icon" variant="ghost" className="h-7 w-7 text-rose-600 hover:text-rose-700" onClick={() => removeField(f.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
          {fields.length === 0 && <p className="text-sm text-muted-foreground">No custom fields yet.</p>}
        </div>

        <div className="rounded-md border p-3 space-y-2">
          <p className="text-sm font-medium flex items-center gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Add a field
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Label</Label>
              <Input className="h-8" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Annual Revenue" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as FieldType)}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(TYPE_LABELS) as FieldType[]).map((t) => (
                    <SelectItem key={t} value={t}>
                      {TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {type === 'select' && (
            <div className="space-y-1">
              <Label className="text-xs">Options (comma-separated)</Label>
              <Input className="h-8" value={optionsText} onChange={(e) => setOptionsText(e.target.value)} placeholder="Gold, Silver, Bronze" />
            </div>
          )}
          {error && <p className="text-xs text-rose-600">{error}</p>}
          <div className="flex justify-end">
            <Button size="sm" onClick={addField} disabled={saving || !label.trim()}>
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Add field
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
