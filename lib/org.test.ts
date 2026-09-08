import { beforeEach, describe, expect, it, vi } from 'vitest'

const createMock = vi.fn()
const updateMock = vi.fn()
const findFirstMock = vi.fn()
const findUniqueMock = vi.fn()

vi.mock('@/lib/db', () => ({
  prisma: {
    organization: {
      create: (...args: unknown[]) => createMock(...args),
      update: (...args: unknown[]) => updateMock(...args),
      findFirst: (...args: unknown[]) => findFirstMock(...args),
      findUnique: (...args: unknown[]) => findUniqueMock(...args),
    },
  },
}))

const { createRootOrganization, createChildOrganization, getDefaultOrgId } = await import('@/lib/org')

beforeEach(() => {
  createMock.mockReset()
  updateMock.mockReset()
  findFirstMock.mockReset()
  findUniqueMock.mockReset()
})

describe('createRootOrganization', () => {
  it('creates with parentOrgId null and stamps its own path with a trailing slash', async () => {
    createMock.mockResolvedValue({ id: 'root-1', name: 'Acme', parentOrgId: null, path: '/' })
    updateMock.mockResolvedValue({ id: 'root-1', name: 'Acme', parentOrgId: null, path: '/root-1/' })

    await createRootOrganization('Acme')

    expect(createMock).toHaveBeenCalledWith({ data: { name: 'Acme', parentOrgId: null, path: '/' } })
    expect(updateMock).toHaveBeenCalledWith({ where: { id: 'root-1' }, data: { path: '/root-1/' } })
  })
})

describe('createChildOrganization', () => {
  it('builds the child path by appending the child id to the parent\'s existing path', async () => {
    findUniqueMock.mockResolvedValue({ path: '/root-1/' })
    createMock.mockResolvedValue({ id: 'child-2', name: 'Division', parentOrgId: 'root-1', path: '' })
    updateMock.mockResolvedValue({ id: 'child-2', name: 'Division', parentOrgId: 'root-1', path: '/root-1/child-2/' })

    await createChildOrganization('root-1', 'Division')

    expect(updateMock).toHaveBeenCalledWith({ where: { id: 'child-2' }, data: { path: '/root-1/child-2/' } })
  })

  it('throws instead of silently creating an orphaned org when the parent does not exist', async () => {
    findUniqueMock.mockResolvedValue(null)
    await expect(createChildOrganization('missing-parent', 'X')).rejects.toThrow(/not found/)
    expect(createMock).not.toHaveBeenCalled()
  })

  it('a grandchild path prefix-matches under its grandparent, not just its direct parent (path LIKE correctness)', async () => {
    findUniqueMock.mockResolvedValue({ path: '/root-1/child-2/' })
    createMock.mockResolvedValue({ id: 'grandchild-3', name: 'Team', parentOrgId: 'child-2', path: '' })
    updateMock.mockResolvedValue({})

    await createChildOrganization('child-2', 'Team')

    const grandchildPath = updateMock.mock.calls[0][0].data.path
    expect(grandchildPath).toBe('/root-1/child-2/grandchild-3/')
    expect(grandchildPath.startsWith('/root-1/')).toBe(true)
  })
})

describe('getDefaultOrgId', () => {
  it('returns the oldest root org (parentOrgId null)', async () => {
    findFirstMock.mockResolvedValue({ id: 'root-1' })
    const id = await getDefaultOrgId()
    expect(id).toBe('root-1')
    expect(findFirstMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { parentOrgId: null }, orderBy: { createdAt: 'asc' } })
    )
  })

  it('throws a clear error instead of returning undefined when no root org exists yet', async () => {
    findFirstMock.mockResolvedValue(null)
    await expect(getDefaultOrgId()).rejects.toThrow(/backfill/)
  })
})
