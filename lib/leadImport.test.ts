import { beforeEach, describe, expect, it, vi } from 'vitest'

const leadFindManyMock = vi.fn()
const leadCreateMock = vi.fn()
const companyFindUniqueMock = vi.fn()
const companyCreateMock = vi.fn()
const personFindFirstMock = vi.fn()
const personFindManyMock = vi.fn()
const personCreateMock = vi.fn()

vi.mock('@/lib/db', () => ({
  prisma: {
    lead: {
      findMany: (...args: unknown[]) => leadFindManyMock(...args),
      create: (...args: unknown[]) => leadCreateMock(...args),
    },
    company: {
      findUnique: (...args: unknown[]) => companyFindUniqueMock(...args),
      create: (...args: unknown[]) => companyCreateMock(...args),
    },
    person: {
      findFirst: (...args: unknown[]) => personFindFirstMock(...args),
      findMany: (...args: unknown[]) => personFindManyMock(...args),
      create: (...args: unknown[]) => personCreateMock(...args),
    },
  },
}))

const { importLeadRows } = await import('@/lib/leadImport')

const owner = { id: 'owner-1', name: 'Jane Rep' }
const orgId = 'org-1'

beforeEach(() => {
  leadFindManyMock.mockReset()
  leadCreateMock.mockReset()
  companyFindUniqueMock.mockReset()
  companyCreateMock.mockReset()
  personFindFirstMock.mockReset()
  personFindManyMock.mockReset()
  personCreateMock.mockReset()

  leadFindManyMock.mockResolvedValue([])
  leadCreateMock.mockResolvedValue({})
  // Stateful fake so repeat find-or-create calls for the same normalized name
  // within one test (e.g. "Acme Corp" then "ACME CORP") resolve to the one
  // company actually created, same as the real DB's unique constraint would.
  const companiesByNormalizedName = new Map<string, { id: string; orgId: string; name: string; normalizedName: string }>()
  companyFindUniqueMock.mockImplementation(({ where }: { where: { orgId_normalizedName: { normalizedName: string } } }) =>
    Promise.resolve(companiesByNormalizedName.get(where.orgId_normalizedName.normalizedName) ?? null),
  )
  companyCreateMock.mockImplementation(({ data }: { data: { orgId: string; name: string; normalizedName: string } }) => {
    const company = { id: `company-${data.normalizedName}`, ...data }
    companiesByNormalizedName.set(data.normalizedName, company)
    return Promise.resolve(company)
  })
  personFindFirstMock.mockResolvedValue(null)
  personFindManyMock.mockResolvedValue([])
  personCreateMock.mockImplementation(({ data }: { data: { name: string } }) =>
    Promise.resolve({ id: `person-${data.name.toLowerCase()}`, ...data }),
  )
})

describe('importLeadRows', () => {
  it('skips rows missing a required company', async () => {
    const result = await importLeadRows([{ email: 'a@b.com' }], owner, orgId)
    expect(result.created).toBe(0)
    expect(result.skipped).toEqual([{ row: 1, reason: 'Missing required company' }])
    expect(leadCreateMock).not.toHaveBeenCalled()
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

  it('same company across rows is not a duplicate — only email or an existing contact at that company is', async () => {
    const result = await importLeadRows(
      [
        { company: 'Acme Corp', poc: 'Jane Doe', email: 'jane@acme.com' },
        { company: 'ACME CORP', poc: 'John Smith', email: 'john@acme.com' },
      ],
      owner,
      orgId,
    )
    expect(result.created).toBe(2)
    expect(result.skipped).toHaveLength(0)
    // Both rows normalize to the same company — resolved (and created) once, not twice.
    expect(companyCreateMock).toHaveBeenCalledTimes(1)
  })

  it('dedupes against an existing lead by email', async () => {
    leadFindManyMock.mockResolvedValue([{ email: 'existing@acme.com' }])
    const result = await importLeadRows(
      [
        { company: 'Acme Corp', email: 'EXISTING@ACME.COM' },
        { company: 'Fresh Co', email: 'fresh@co.com' },
      ],
      owner,
      orgId,
    )
    expect(result.created).toBe(1)
    expect(result.skipped).toEqual([{ row: 1, reason: 'Duplicate of an existing lead: EXISTING@ACME.COM' }])
  })

  it('dedupes against an existing contact (same name) already at that company', async () => {
    companyFindUniqueMock.mockResolvedValue({ id: 'company-acme', orgId, name: 'Acme', normalizedName: 'acme' })
    personFindManyMock.mockResolvedValue([{ companyId: 'company-acme', name: 'Jane Doe' }])
    const result = await importLeadRows([{ company: 'Acme', poc: 'jane doe' }], owner, orgId)
    expect(result.created).toBe(0)
    expect(result.skipped).toEqual([{ row: 1, reason: 'Duplicate of an existing contact: jane doe at Acme' }])
  })

  it('scopes the existing-lead dedupe lookup to the target org, not the whole table', async () => {
    await importLeadRows([{ company: 'Acme', email: 'a@acme.com' }], owner, orgId)
    expect(leadFindManyMock).toHaveBeenCalledWith(
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
    expect(result.skipped).toEqual([{ row: 2, reason: 'Duplicate within this file: a@acme.com' }])
  })

  it('falls back to defaults for unrecognized source/type/businessType and non-numeric volume, and stamps the target orgId', async () => {
    await importLeadRows(
      [{ company: 'Acme', source: 'made-up-source', type: 'made-up-type', businessType: 'made-up', estimatedVolume: 'lots' }],
      owner,
      orgId
    )
    expect(leadCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        orgId,
        source: 'other',
        type: 'merchant',
        businessType: null,
        estimatedVolume: 0,
        stage: 'new',
        ownerId: owner.id,
        ownerName: owner.name,
      }),
    })
  })

  it('does not call lead.create when every row is skipped', async () => {
    await importLeadRows([{}], owner, orgId)
    expect(leadCreateMock).not.toHaveBeenCalled()
  })
})
