import { beforeEach, describe, expect, it, vi } from 'vitest'

const createMock = vi.fn()
const findUniqueMock = vi.fn()

vi.mock('@/lib/db', () => ({
  prisma: {
    organization: {
      create: (...args: unknown[]) => createMock(...args),
      findUnique: (...args: unknown[]) => findUniqueMock(...args),
    },
  },
}))

const { createOrganization } = await import('@/lib/org')

beforeEach(() => {
  createMock.mockReset()
  findUniqueMock.mockReset().mockResolvedValue(null)
})

describe('createOrganization', () => {
  it('creates a flat org — no parent/path concept', async () => {
    createMock.mockResolvedValue({ id: 'org-1', name: 'Acme', slug: 'acme' })
    const org = await createOrganization('Acme')
    expect(org).toEqual({ id: 'org-1', name: 'Acme', slug: 'acme' })
  })

  // Regression guard: an org created without a slug has no /rep/<slug> page,
  // so its field reps cannot sign in at all. This used to be the case for
  // every newly created org.
  it('always assigns a slug, because /rep/<slug> depends on it', async () => {
    createMock.mockResolvedValue({ id: 'org-1', name: 'Acme', slug: 'acme' })
    await createOrganization('Acme')
    expect(createMock).toHaveBeenCalledWith({ data: { name: 'Acme', slug: 'acme' } })
  })

  it('derives the slug from the company name', async () => {
    createMock.mockResolvedValue({ id: 'org-2' })
    await createOrganization('Northwind Traders, Inc.')
    expect(createMock.mock.calls[0][0].data.slug).toBe('northwind-traders-inc')
  })

  it('picks a free slug when the obvious one is taken', async () => {
    findUniqueMock.mockResolvedValueOnce({ id: 'existing' }).mockResolvedValue(null)
    createMock.mockResolvedValue({ id: 'org-3' })
    await createOrganization('Acme')
    expect(createMock.mock.calls[0][0].data.slug).toBe('acme-2')
  })

  it('retries with a new slug when the unique index rejects the insert', async () => {
    // uniqueOrgSlug checks then inserts, so a concurrent signup can take the
    // slug in between. The index is the real guard; this is the recovery.
    const { Prisma } = await import('@prisma/client')
    const collision = new Prisma.PrismaClientKnownRequestError('dup', {
      code: 'P2002',
      clientVersion: 'test',
      meta: { target: ['slug'] },
    })
    createMock.mockRejectedValueOnce(collision).mockResolvedValue({ id: 'org-4' })
    const org = await createOrganization('Acme')
    expect(createMock).toHaveBeenCalledTimes(2)
    expect(org).toEqual({ id: 'org-4' })
  })

  it('does not swallow an unrelated database error', async () => {
    createMock.mockRejectedValue(new Error('connection lost'))
    await expect(createOrganization('Acme')).rejects.toThrow('connection lost')
  })
})
