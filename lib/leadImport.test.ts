import { beforeEach, describe, expect, it, vi } from 'vitest'

const findManyMock = vi.fn()
const createManyMock = vi.fn()

vi.mock('@/lib/db', () => ({
  prisma: {
    lead: {
      findMany: (...args: unknown[]) => findManyMock(...args),
      createMany: (...args: unknown[]) => createManyMock(...args),
    },
  },
}))

const { importLeadRows } = await import('@/lib/leadImport')

const owner = { id: 'owner-1', name: 'Jane Rep' }
const orgId = 'org-1'

beforeEach(() => {
  findManyMock.mockReset()
  createManyMock.mockReset()
  findManyMock.mockResolvedValue([])
  createManyMock.mockResolvedValue({ count: 0 })
})

describe('importLeadRows', () => {
  it('skips rows missing a required company', async () => {
    const result = await importLeadRows([{ email: 'a@b.com' }], owner, orgId)
    expect(result.created).toBe(0)
    expect(result.skipped).toEqual([{ row: 1, reason: 'Missing required company' }])
    expect(createManyMock).not.toHaveBeenCalled()
  })

  it('skips rows with an invalid email but keeps rows with no email', async () => {
    const result = await importLeadRows(
      [
        { company: 'Acme', email: 'not-an-email' },
        { company: 'Beta Co' },
      ],
      owner,
      orgId
    )
    expect(result.skipped).toEqual([{ row: 1, reason: 'Invalid email: not-an-email' }])
    expect(result.created).toBe(1)
  })

  it('skips malformed (non-object) rows instead of throwing', async () => {
    const result = await importLeadRows(['not-a-row', 42, null], owner, orgId)
    expect(result.created).toBe(0)
    expect(result.skipped).toHaveLength(3)
    expect(result.skipped.every((s) => s.reason === 'Row is not a valid object')).toBe(true)
  })

  it('dedupes case-insensitively against existing leads by email or company', async () => {
    findManyMock.mockResolvedValue([{ email: 'existing@acme.com', company: 'Acme Corp' }])
    const result = await importLeadRows(
      [
        { company: 'Acme Corp', email: 'EXISTING@ACME.COM' },
        { company: 'ACME CORP', email: 'new@acme.com' },
        { company: 'Fresh Co', email: 'fresh@co.com' },
      ],
      owner,
      orgId
    )
    expect(result.created).toBe(1)
    expect(result.skipped).toHaveLength(2)
    expect(result.skipped.map((s) => s.reason)).toEqual([
      'Duplicate of an existing lead: Acme Corp',
      'Duplicate of an existing lead: ACME CORP',
    ])
  })

  it('scopes the existing-lead dedupe lookup to the target org, not the whole table', async () => {
    await importLeadRows([{ company: 'Acme', email: 'a@acme.com' }], owner, orgId)
    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ orgId }) })
    )
  })

  it('dedupes duplicates within the same import batch', async () => {
    const result = await importLeadRows(
      [{ company: 'Acme', email: 'a@acme.com' }, { company: 'Acme', email: 'a@acme.com' }],
      owner,
      orgId
    )
    expect(result.created).toBe(1)
    expect(result.skipped).toEqual([{ row: 2, reason: 'Duplicate within this file: Acme' }])
  })

  it('falls back to defaults for unrecognized source/type/businessType and non-numeric volume, and stamps the target orgId', async () => {
    await importLeadRows(
      [{ company: 'Acme', source: 'made-up-source', type: 'made-up-type', businessType: 'made-up', estimatedVolume: 'lots' }],
      owner,
      orgId
    )
    expect(createManyMock).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          orgId,
          source: 'other',
          type: 'merchant',
          businessType: null,
          estimatedVolume: 0,
          stage: 'new',
          ownerId: owner.id,
          ownerName: owner.name,
        }),
      ],
    })
  })

  it('does not call createMany when every row is skipped', async () => {
    await importLeadRows([{}], owner, orgId)
    expect(createManyMock).not.toHaveBeenCalled()
  })
})
