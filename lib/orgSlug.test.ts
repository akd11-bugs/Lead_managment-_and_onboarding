import { describe, expect, it, vi } from 'vitest'

const findUnique = vi.fn()
vi.mock('@/lib/db', () => ({ prisma: { organization: { findUnique: (...a: unknown[]) => findUnique(...a) } } }))

const { slugify, uniqueOrgSlug } = await import('@/lib/orgSlug')

// The slug is what makes /rep/<slug> resolve to one tenant. A slug that is
// empty, reserved, or duplicated means a customer's field reps cannot sign
// in at all, so the edge cases get tests rather than trust.
describe('slugify', () => {
  it('lowercases and hyphenates a normal company name', () => {
    expect(slugify('Northwind Traders')).toBe('northwind-traders')
    expect(slugify('WTPL')).toBe('wtpl')
  })

  it('strips punctuation rather than emitting it into a URL', () => {
    expect(slugify('Acme, Inc.')).toBe('acme-inc')
    expect(slugify('Smith & Co.')).toBe('smith-co')
    expect(slugify('  Spaced   Out  ')).toBe('spaced-out')
  })

  it('never returns an empty slug, even for unusable input', () => {
    for (const bad of ['', '   ', '!!!', '...', '—', '中文']) {
      expect(slugify(bad)).toBe('org')
    }
  })

  it('caps length and never leaves a trailing hyphen', () => {
    const s = slugify('A'.repeat(60) + ' Corporation')
    expect(s.length).toBeLessThanOrEqual(40)
    expect(s.endsWith('-')).toBe(false)
  })

  it('collapses runs of separators into one hyphen', () => {
    expect(slugify('Foo  ---  Bar')).toBe('foo-bar')
  })
})

describe('uniqueOrgSlug', () => {
  it('returns the plain slug when nothing has taken it', async () => {
    findUnique.mockResolvedValue(null)
    expect(await uniqueOrgSlug('Acme Industries')).toBe('acme-industries')
  })

  it('appends a numeric suffix when the slug is taken', async () => {
    findUnique.mockReset()
    findUnique.mockResolvedValueOnce({ id: 'x' }).mockResolvedValue(null)
    expect(await uniqueOrgSlug('Acme')).toBe('acme-2')
  })

  it('keeps incrementing past several collisions', async () => {
    findUnique.mockReset()
    findUnique
      .mockResolvedValueOnce({ id: 'a' })
      .mockResolvedValueOnce({ id: 'b' })
      .mockResolvedValueOnce({ id: 'c' })
      .mockResolvedValue(null)
    expect(await uniqueOrgSlug('Acme')).toBe('acme-4')
  })

  it('suffixes a reserved word so it cannot shadow a real route', async () => {
    findUnique.mockReset()
    findUnique.mockResolvedValue(null)
    expect(await uniqueOrgSlug('Admin')).toBe('admin-org')
    expect(await uniqueOrgSlug('API')).toBe('api-org')
  })
})
