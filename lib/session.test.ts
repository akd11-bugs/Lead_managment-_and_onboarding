import { beforeEach, describe, expect, it, vi } from 'vitest'

const queryRawMock = vi.fn()

vi.mock('@/lib/db', () => ({
  prisma: { $queryRaw: (...args: unknown[]) => queryRawMock(...args) },
}))

// lib/session.ts also imports lib/auth for requireUser()/requireApiUser(),
// which pulls in next-auth + its providers — irrelevant to the two pure
// helpers under test here, and next-auth's ESM/CJS resolution doesn't play
// well with vitest's node environment. Stub it out instead of loading it.
vi.mock('@/lib/auth', () => ({ auth: vi.fn() }))

const { resolveVisibleOrgIds, leadScope } = await import('@/lib/session')

function user(overrides: Partial<{ id: string; orgId: string; role: string; visibleOrgIds: string[] }> = {}) {
  return { id: 'u1', name: 'Test', email: 't@x.com', orgId: 'org-leaf', role: 'sales', visibleOrgIds: ['org-leaf'], ...overrides }
}

beforeEach(() => {
  queryRawMock.mockReset()
})

describe('resolveVisibleOrgIds', () => {
  it('returns only the user\'s own org for a sales role, without querying the database', async () => {
    const ids = await resolveVisibleOrgIds('org-leaf', 'sales')
    expect(ids).toEqual(['org-leaf'])
    expect(queryRawMock).not.toHaveBeenCalled()
  })

  it('resolves self + descendants for an admin role via the materialized-path query', async () => {
    queryRawMock.mockResolvedValue([{ id: 'org-parent' }, { id: 'org-child-a' }, { id: 'org-child-b' }])
    const ids = await resolveVisibleOrgIds('org-parent', 'admin')
    expect(ids).toEqual(['org-parent', 'org-child-a', 'org-child-b'])
  })

  it('resolves self + descendants for an operations role too', async () => {
    queryRawMock.mockResolvedValue([{ id: 'org-parent' }, { id: 'org-child-a' }])
    const ids = await resolveVisibleOrgIds('org-parent', 'operations')
    expect(ids).toEqual(['org-parent', 'org-child-a'])
  })

  it('returns just its own org for a leaf org admin with no descendants', async () => {
    queryRawMock.mockResolvedValue([{ id: 'org-leaf' }])
    const ids = await resolveVisibleOrgIds('org-leaf', 'admin')
    expect(ids).toEqual(['org-leaf'])
  })
})

describe('leadScope', () => {
  it('scopes a sales user to their own org and their own ownerId — never role-bypasses the org filter', () => {
    const scope = leadScope(user({ role: 'sales', visibleOrgIds: ['org-leaf'] }))
    expect(scope).toEqual({ orgId: { in: ['org-leaf'] }, ownerId: 'u1' })
  })

  it('scopes an admin to every org in their visible tree, with no ownerId restriction', () => {
    const scope = leadScope(user({ role: 'admin', visibleOrgIds: ['org-parent', 'org-child'] }))
    expect(scope).toEqual({ orgId: { in: ['org-parent', 'org-child'] } })
  })

  it('scopes operations the same rollup way as admin', () => {
    const scope = leadScope(user({ role: 'operations', visibleOrgIds: ['org-parent', 'org-child'] }))
    expect(scope).toEqual({ orgId: { in: ['org-parent', 'org-child'] } })
  })

  it('never returns an unbounded scope — even an admin\'s scope always carries an orgId filter', () => {
    const scope = leadScope(user({ role: 'admin', visibleOrgIds: ['org-parent', 'org-child'] })) as { orgId?: unknown }
    expect(scope.orgId).toBeDefined()
  })
})
