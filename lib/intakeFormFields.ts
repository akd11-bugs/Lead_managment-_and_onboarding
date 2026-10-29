import { prisma } from '@/lib/db'

// The six fields IntakeForm.tsx has always hardcoded — kept as the single
// source of truth for their keys/labels/input type, so both the admin
// field-picker and the public form render the exact same fixed set rather
// than two hand-maintained lists drifting apart.
export const FIXED_FIELD_KEYS = ['company', 'contactName', 'email', 'phone', 'industry', 'notes'] as const
export type FixedFieldKey = (typeof FIXED_FIELD_KEYS)[number]

export const FIXED_FIELD_META: Record<FixedFieldKey, { label: string; inputType: 'text' | 'email' | 'textarea' }> = {
  company: { label: 'Company name', inputType: 'text' },
  contactName: { label: 'Your name', inputType: 'text' },
  email: { label: 'Email', inputType: 'email' },
  phone: { label: 'Phone', inputType: 'text' },
  industry: { label: 'Industry', inputType: 'text' },
  notes: { label: "Anything else you'd like to share?", inputType: 'textarea' },
}

// company + email are the two fields submitPublicLeadIntake cannot create a
// Lead without — forced required and forced present regardless of what an
// admin's fieldConfigJson says, so a misconfigured form can never silently
// break lead creation.
const ALWAYS_REQUIRED: readonly string[] = ['company', 'email']

export interface IntakeFormFieldConfigEntry {
  key: string
  required: boolean
}

export interface ResolvedIntakeField {
  key: string
  label: string
  kind: 'fixed' | 'custom'
  inputType: 'text' | 'email' | 'textarea' | 'number' | 'date' | 'select'
  required: boolean
  options: string[] | null
}

export function parseFieldConfig(json: string): IntakeFormFieldConfigEntry[] {
  try {
    const parsed = JSON.parse(json)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((e): e is IntakeFormFieldConfigEntry => typeof e?.key === 'string')
      .map((e) => ({ key: e.key, required: !!e.required }))
  } catch {
    return []
  }
}

// Turns a form's stored fieldConfigJson into the actual ordered list of
// fields to render/validate — "[]" (an unconfigured form, including every
// form created before this feature existed) falls back to exactly today's
// hardcoded fixed-set behavior, so no backfill migration is needed for
// existing forms.
export async function resolveIntakeFormFields(orgId: string, fieldConfigJson: string): Promise<ResolvedIntakeField[]> {
  const config = parseFieldConfig(fieldConfigJson)

  if (config.length === 0) {
    return FIXED_FIELD_KEYS.map((key) => ({
      key,
      label: FIXED_FIELD_META[key].label,
      kind: 'fixed',
      inputType: FIXED_FIELD_META[key].inputType,
      required: ALWAYS_REQUIRED.includes(key),
      options: null,
    }))
  }

  const customDefs = await prisma.leadFieldDefinition.findMany({ where: { orgId } })
  const customByKey = new Map(customDefs.map((d) => [d.key, d]))

  const resolved: ResolvedIntakeField[] = []
  for (const entry of config) {
    if ((FIXED_FIELD_KEYS as readonly string[]).includes(entry.key)) {
      const key = entry.key as FixedFieldKey
      resolved.push({
        key,
        label: FIXED_FIELD_META[key].label,
        kind: 'fixed',
        inputType: FIXED_FIELD_META[key].inputType,
        required: ALWAYS_REQUIRED.includes(key) || entry.required,
        options: null,
      })
      continue
    }
    const def = customByKey.get(entry.key)
    if (!def) continue // field was deleted from Settings since this form was configured — drop it silently
    resolved.push({
      key: def.key,
      label: def.label,
      kind: 'custom',
      inputType: def.type as 'text' | 'number' | 'date' | 'select',
      required: entry.required,
      options: def.options ? (JSON.parse(def.options) as string[]) : null,
    })
  }

  // company/email must always be creatable even if an admin's saved config
  // dropped them entirely (e.g. by editing fieldConfigJson through some
  // future bulk-edit path, or a bug in the picker UI) — prepend any missing
  // ones, in ALWAYS_REQUIRED's own order (built back-to-front with unshift,
  // so iterate it reversed — forward iteration would land them reversed:
  // "email" unshifted after "company" ends up before it).
  for (const key of [...ALWAYS_REQUIRED].reverse()) {
    if (!resolved.some((f) => f.key === key)) {
      const fixedKey = key as FixedFieldKey
      resolved.unshift({ key, label: FIXED_FIELD_META[fixedKey].label, kind: 'fixed', inputType: FIXED_FIELD_META[fixedKey].inputType, required: true, options: null })
    }
  }

  return resolved
}
