import { beforeEach, describe, expect, it, vi } from 'vitest'

const findManyMock = vi.fn()

vi.mock('@/lib/db', () => ({
  prisma: { leadFieldDefinition: { findMany: (...args: unknown[]) => findManyMock(...args) } },
}))

const { mergeCustomFields } = await import('@/lib/leadCustomFields')

const orgId = 'org-1'

beforeEach(() => {
  findManyMock.mockReset()
})

describe('mergeCustomFields', () => {
  it('merges into existing values rather than replacing them', async () => {
    findManyMock.mockResolvedValue([{ key: 'budget', label: 'Budget', type: 'number', options: null }])
    const result = await mergeCustomFields(orgId, JSON.stringify({ other_field: 'kept' }), { budget: 500 })
    expect(JSON.parse(result)).toEqual({ other_field: 'kept', budget: 500 })
  })

  it('silently drops keys with no matching field definition', async () => {
    findManyMock.mockResolvedValue([])
    const result = await mergeCustomFields(orgId, '{}', { unknown_key: 'x' })
    expect(JSON.parse(result)).toEqual({})
  })

  it('rejects a non-numeric value for a "number" field', async () => {
    findManyMock.mockResolvedValue([{ key: 'budget', label: 'Budget', type: 'number', options: null }])
    await expect(mergeCustomFields(orgId, '{}', { budget: 'not-a-number' })).rejects.toThrow(/Budget/)
  })

  it('rejects a value not in the option list for a "select" field', async () => {
    findManyMock.mockResolvedValue([
      { key: 'tier', label: 'Tier', type: 'select', options: JSON.stringify(['gold', 'silver']) },
    ])
    await expect(mergeCustomFields(orgId, '{}', { tier: 'bronze' })).rejects.toThrow(/Tier/)
  })

  it('accepts a valid option value for a "select" field', async () => {
    findManyMock.mockResolvedValue([
      { key: 'tier', label: 'Tier', type: 'select', options: JSON.stringify(['gold', 'silver']) },
    ])
    const result = await mergeCustomFields(orgId, '{}', { tier: 'gold' })
    expect(JSON.parse(result)).toEqual({ tier: 'gold' })
  })

  it('removes a key when its value is set to null or empty string', async () => {
    findManyMock.mockResolvedValue([{ key: 'budget', label: 'Budget', type: 'number', options: null }])
    const result = await mergeCustomFields(orgId, JSON.stringify({ budget: 500 }), { budget: null })
    expect(JSON.parse(result)).toEqual({})
  })

  it('rejects a non-object payload', async () => {
    findManyMock.mockResolvedValue([])
    await expect(mergeCustomFields(orgId, '{}', 'not-an-object')).rejects.toThrow(/object/)
    await expect(mergeCustomFields(orgId, '{}', null)).rejects.toThrow(/object/)
    await expect(mergeCustomFields(orgId, '{}', ['array'])).rejects.toThrow(/object/)
  })
})
