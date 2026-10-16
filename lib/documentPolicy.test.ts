import { describe, expect, it } from 'vitest'
import { validateDocumentMetadata, carriesContent, CONTENT_FIELDS } from '@/lib/documentPolicy'

const SHA = 'a'.repeat(64)

function valid(overrides: Record<string, unknown> = {}) {
  return {
    kind: 'pan',
    localKey: 'lead1:abc123',
    fileName: 'pan-card.pdf',
    mimeType: 'application/pdf',
    sha256: SHA,
    byteSize: 51200,
    ...overrides,
  }
}

// The product's central privacy claim is that government identity documents
// never reach the server. These tests exist so that claim cannot regress
// silently: if someone adds base64 upload later, this suite fails.
describe('no document content may ever be accepted', () => {
  it.each(CONTENT_FIELDS)('rejects a payload carrying %s', field => {
    const res = validateDocumentMetadata(valid({ [field]: 'JVBERi0xLjQK' }))
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error).toMatch(/metadata only/i)
  })

  it('rejects content even when every other field is valid', () => {
    expect(validateDocumentMetadata(valid({ content: 'x' })).ok).toBe(false)
  })

  it('rejects content that is empty string, null or an object', () => {
    for (const v of ['', null, {}, []]) {
      expect(validateDocumentMetadata(valid({ file: v })).ok).toBe(false)
    }
  })

  it('carriesContent detects each banned field independently', () => {
    for (const f of CONTENT_FIELDS) expect(carriesContent({ [f]: 'x' })).toBe(true)
    expect(carriesContent(valid())).toBe(false)
  })
})

describe('metadata validation', () => {
  it('accepts a well-formed payload', () => {
    const res = validateDocumentMetadata(valid())
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.value.kind).toBe('pan')
      expect(res.value.sha256).toBe(SHA)
      expect(res.value.status).toBe('held')
    }
  })

  it('rejects an unknown kind, so arbitrary categories cannot be invented', () => {
    expect(validateDocumentMetadata(valid({ kind: 'passport' })).ok).toBe(false)
    expect(validateDocumentMetadata(valid({ kind: '' })).ok).toBe(false)
  })

  it('requires a real sha256 digest', () => {
    for (const bad of ['', 'abc', SHA.slice(0, 63), 'g'.repeat(64), '1'.repeat(65)]) {
      expect(validateDocumentMetadata(valid({ sha256: bad })).ok).toBe(false)
    }
  })

  it('normalises an uppercase digest rather than rejecting it', () => {
    const res = validateDocumentMetadata(valid({ sha256: SHA.toUpperCase() }))
    expect(res.ok).toBe(true)
    if (res.ok) expect(res.value.sha256).toBe(SHA)
  })

  it('rejects a negative or non-integer byteSize', () => {
    for (const bad of [-1, 1.5, NaN, 'big']) {
      expect(validateDocumentMetadata(valid({ byteSize: bad })).ok).toBe(false)
    }
  })

  it('accepts a zero-byte file, which is a real upload mistake worth recording', () => {
    expect(validateDocumentMetadata(valid({ byteSize: 0 })).ok).toBe(true)
  })

  it('falls back to held for an unrecognised status rather than trusting it', () => {
    const res = validateDocumentMetadata(valid({ status: 'approved' }))
    expect(res.ok).toBe(true)
    if (res.ok) expect(res.value.status).toBe('held')
  })

  it('truncates overlong strings instead of storing unbounded input', () => {
    const res = validateDocumentMetadata(valid({ fileName: 'x'.repeat(900), label: 'y'.repeat(900) }))
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.value.fileName.length).toBe(255)
      expect(res.value.label.length).toBe(200)
    }
  })
})
