'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { LeadFieldOption } from '@/lib/hooks/usePipelineConfig'

// Shared by NewLeadDialog and LeadDetailDialog — renders one input per the
// org's LeadFieldDefinition rows (see app/api/lead-field-definitions),
// reading/writing a plain `{ [key]: value }` object the caller merges into
// its create/patch payload as `customFields`.
export function CustomFieldsSection({
  fields,
  values,
  onChange,
  disabled,
}: {
  fields: LeadFieldOption[]
  values: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
  disabled?: boolean
}) {
  if (fields.length === 0) return null

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-muted-foreground">Custom fields</p>
      <div className="grid grid-cols-2 gap-3">
        {fields.map((f) => (
          <div key={f.id} className="space-y-1.5">
            <Label className="text-xs">
              {f.label}
              {f.required && <span className="text-rose-500"> *</span>}
            </Label>
            {f.type === 'select' ? (
              <Select
                value={values[f.key] != null ? String(values[f.key]) : undefined}
                onValueChange={(v) => onChange(f.key, v)}
                disabled={disabled}
              >
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Not set" />
                </SelectTrigger>
                <SelectContent>
                  {(f.options ?? []).map((o) => (
                    <SelectItem key={o} value={o}>
                      {o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                className="h-8"
                type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
                value={values[f.key] != null ? String(values[f.key]) : ''}
                onChange={(e) => onChange(f.key, f.type === 'number' ? Number(e.target.value) : e.target.value)}
                disabled={disabled}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
