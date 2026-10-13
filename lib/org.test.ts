import { beforeEach, describe, expect, it, vi } from 'vitest'

const createMock = vi.fn()

vi.mock('@/lib/db', () => ({
  prisma: {
    organization: {
      create: (...args: unknown[]) => createMock(...args),
    },
  },
}))

const { createOrganization } = await import('@/lib/org')

beforeEach(() => {
  createMock.mockReset()
})

describe('createOrganization', () => {
  it('creates a flat org with just a name — no parent/path concept', async () => {
    createMock.mockResolvedValue({ id: 'org-1', name: 'Acme' })

    const org = await createOrganization('Acme')

    expect(createMock).toHaveBeenCalledWith({ data: { name: 'Acme' } })
    expect(org).toEqual({ id: 'org-1', name: 'Acme' })
  })
})
