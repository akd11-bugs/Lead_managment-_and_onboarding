import { beforeEach, describe, expect, it, vi } from 'vitest'

const findManyMock = vi.fn()

vi.mock('@/lib/db', () => ({
  prisma: { leadFieldDefinition: { findMany: (...args: unknown[]) => findManyMock(...args) } },
}))

const { resolveIntakeFormFields, parseFieldConfig, FIXED_FIELD_KEYS } = await import('@/lib/intakeFormFields')

const orgId = 'org-1'

beforeEach(() => {
  findManyMock.mockReset()
})

describe('parseFieldConfig', () => {
  it('returns an empty array for "[]"', () => {
    expect(parseFieldConfig('[]')).toEqual([])
  })

  it('parses valid entries and coerces required to a boolean', () => {
    expect(parseFieldConfig(JSON.stringify([{ key: 'company', required: true }, { key: 'email' }]))).toEqual([
      { key: 'company', required: true },
      { key: 'email', required: false },
    ])
  })

  it('returns an empty array for malformed JSON instead of throwing', () => {
    expect(parseFieldConfig('not json')).toEqual([])
  })

  it('drops entries with no string key', () => {
    expect(parseFieldConfig(JSON.stringify([{ required: true }, { key: 123 }]))).toEqual([])
  })
})

describe('resolveIntakeFormFields', () => {
  it('falls back to the exact fixed-field set, in order, for an unconfigured ("[]") form', async () => {
    const fields = await resolveIntakeFormFields(orgId, '[]')
    expect(fields.map((f) => f.key)).toEqual([...FIXED_FIELD_KEYS])
    expect(findManyMock).not.toHaveBeenCalled() // no need to touch LeadFieldDefinition for the fallback path
  })

  it('company and email are always required in the fallback, everything else is not', async () => {
    const fields = await resolveIntakeFormFields(orgId, '[]')
    const byKey = Object.fromEntries(fields.map((f) => [f.key, f.required]))
    expect(byKey.company).toBe(true)
    expect(byKey.email).toBe(true)
    expect(byKey.contactName).toBe(false)
    expect(byKey.phone).toBe(false)
  })

  it('resolves a custom field from the configured list against LeadFieldDefinition', async () => {
    findManyMock.mockResolvedValue([{ key: 'budget', label: 'Budget', type: 'number', options: null }])
    const config = JSON.stringify([
      { key: 'company', required: true },
      { key: 'email', required: true },
      { key: 'budget', required: true },
    ])
    const fields = await resolveIntakeFormFields(orgId, config)
    const budget = fields.find((f) => f.key === 'budget')
    expect(budget).toEqual({ key: 'budget', label: 'Budget', kind: 'custom', inputType: 'number', required: true, options: null })
  })

  it('respects a custom ordering/subset for a configured form', async () => {
    findManyMock.mockResolvedValue([])
    const config = JSON.stringify([
      { key: 'email', required: true },
      { key: 'company', required: true },
      { key: 'notes', required: false },
    ])
    const fields = await resolveIntakeFormFields(orgId, config)
    expect(fields.map((f) => f.key)).toEqual(['email', 'company', 'notes'])
  })

  it('silently drops a configured custom field whose LeadFieldDefinition no longer exists', async () => {
    findManyMock.mockResolvedValue([]) // the field was deleted from Settings since this form was configured
    const config = JSON.stringify([
      { key: 'company', required: true },
      { key: 'email', required: true },
      { key: 'deleted_field', required: true },
    ])
    const fields = await resolveIntakeFormFields(orgId, config)
    expect(fields.map((f) => f.key)).toEqual(['company', 'email'])
  })

  it('prepends company/email if a saved config omitted them entirely', async () => {
    findManyMock.mockResolvedValue([])
    const config = JSON.stringify([{ key: 'notes', required: false }])
    const fields = await resolveIntakeFormFields(orgId, config)
    expect(fields.map((f) => f.key)).toEqual(['company', 'email', 'notes'])
    expect(fields.find((f) => f.key === 'company')?.required).toBe(true)
    expect(fields.find((f) => f.key === 'email')?.required).toBe(true)
  })

  it('forces company/email required even if a saved config explicitly set required: false', async () => {
    findManyMock.mockResolvedValue([])
    const config = JSON.stringify([
      { key: 'company', required: false },
      { key: 'email', required: false },
    ])
    const fields = await resolveIntakeFormFields(orgId, config)
    expect(fields.every((f) => f.required)).toBe(true)
  })
})
