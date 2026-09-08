import { describe, expect, it } from 'vitest'
import { autoMapHeaders, normalizeHeader } from '@/lib/headerMapping'

describe('normalizeHeader', () => {
  it('lowercases, trims, and collapses punctuation to spaces', () => {
    expect(normalizeHeader('  Company Name! ')).toBe('company name')
    expect(normalizeHeader('E-Mail_Address')).toBe('e mail address')
  })
})

describe('autoMapHeaders', () => {
  it('maps exact synonym matches', () => {
    const map = autoMapHeaders(['Company Name', 'Email Address', 'Phone Number'])
    expect(map.company).toBe('Company Name')
    expect(map.email).toBe('Email Address')
    expect(map.phone).toBe('Phone Number')
  })

  it('falls back to fuzzy substring matches for unmapped fields', () => {
    // "Lead Owner Name" isn't an exact synonym for anything, but should not
    // be fuzzily claimed by "poc" either (it contains "name") ahead of an
    // exact match elsewhere — exact matches must win first regardless of order.
    const map = autoMapHeaders(['Companies Name', 'Contact Name'])
    expect(map.company).toBe('Companies Name')
    expect(map.poc).toBe('Contact Name')
  })

  it('never assigns the same column to two fields', () => {
    // "Type" header is an exact synonym for `type`; it must not also be
    // fuzzily grabbed by `businessType` (whose synonyms include "type of business").
    const map = autoMapHeaders(['Type'])
    expect(map.type).toBe('Type')
    expect(map.businessType).toBeNull()
  })

  it('leaves fields null when no header matches', () => {
    const map = autoMapHeaders(['Random Column'])
    expect(map.company).toBeNull()
    expect(map.email).toBeNull()
  })
})
