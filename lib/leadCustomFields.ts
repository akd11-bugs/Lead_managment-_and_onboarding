import { prisma } from '@/lib/db'

// Loosely validates an incoming customFields object against the org's
// LeadFieldDefinition rows (type-checks value shape per field type; doesn't
// enforce `required` here since that's a create-vs-update-dependent rule the
// caller is better placed to decide) and merges it into the lead's existing
// customFieldsJson rather than replacing it outright — a partial update from
// one form shouldn't wipe fields set by another.
export async function mergeCustomFields(
  orgId: string,
  existingJson: string,
  incoming: unknown
): Promise<string> {
  if (typeof incoming !== 'object' || incoming === null || Array.isArray(incoming)) {
    throw new Error('customFields must be an object')
  }
  const definitions = await prisma.leadFieldDefinition.findMany({ where: { orgId } })
  const byKey = new Map(definitions.map((d) => [d.key, d]))

  const existing = JSON.parse(existingJson || '{}') as Record<string, unknown>
  const merged = { ...existing }

  for (const [key, value] of Object.entries(incoming as Record<string, unknown>)) {
    const def = byKey.get(key)
    if (!def) continue // silently drop unknown keys — no definition, nothing to store it against
    if (value === null || value === '') {
      delete merged[key]
      continue
    }
    if (def.type === 'number' && typeof value !== 'number') {
      throw new Error(`"${def.label}" must be a number`)
    }
    if (def.type === 'select') {
      const options = def.options ? (JSON.parse(def.options) as string[]) : []
      if (!options.includes(String(value))) {
        throw new Error(`"${def.label}" must be one of: ${options.join(', ')}`)
      }
    }
    merged[key] = value
  }

  return JSON.stringify(merged)
}
