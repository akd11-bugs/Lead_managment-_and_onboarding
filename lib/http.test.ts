import { describe, expect, it } from 'vitest'
import { safeEqual, readJsonBody } from '@/lib/http'

describe('safeEqual', () => {
  it('returns true for identical strings', () => {
    expect(safeEqual('secret-key', 'secret-key')).toBe(true)
  })

  it('returns false for different strings of the same length', () => {
    expect(safeEqual('secret-key', 'secret-kex')).toBe(false)
  })

  it('returns false (not throws) for different-length strings', () => {
    expect(safeEqual('short', 'a-lot-longer')).toBe(false)
  })

  it('returns false for an empty candidate against a real key', () => {
    expect(safeEqual('', 'secret-key')).toBe(false)
  })
})

describe('readJsonBody', () => {
  it('parses a valid JSON body', async () => {
    const req = new Request('http://x', { method: 'POST', body: JSON.stringify({ a: 1 }) })
    await expect(readJsonBody(req)).resolves.toEqual({ a: 1 })
  })

  it('returns a 400 NextResponse for invalid JSON', async () => {
    const req = new Request('http://x', { method: 'POST', body: '{not json' })
    const result = await readJsonBody(req)
    expect(result).toHaveProperty('status', 400)
  })
})
