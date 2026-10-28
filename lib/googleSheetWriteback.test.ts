import { describe, expect, it } from 'vitest'
import { buildRow, type WritebackLead } from '@/lib/googleSheetWriteback'

const baseLead: WritebackLead = {
  company: 'Acme Corp',
  contactName: 'Jane Doe',
  email: 'jane@acme.com',
  phone: '555-1234',
  website: 'acme.com',
  industry: 'Retail',
  businessType: 'b2b',
  source: 'event',
  type: 'merchant',
  estimatedVolume: 5000,
  notes: 'Met at the conference booth',
}

describe('buildRow', () => {
  it('places each value under its matching header, regardless of column order', () => {
    const headerRow = ['Contact Name', 'Company Name', 'Email Address', 'Notes']
    const row = buildRow(headerRow, baseLead)
    expect(row).toEqual(['Jane Doe', 'Acme Corp', 'jane@acme.com', 'Met at the conference booth'])
  })

  it('leaves a column blank when no field matches its header', () => {
    const headerRow = ['Company Name', 'Email Address', 'Some Unrelated Column']
    const row = buildRow(headerRow, baseLead)
    expect(row).toEqual(['Acme Corp', 'jane@acme.com', ''])
  })

  it('leaves every column blank when the sheet has no recognizable headers', () => {
    const headerRow = ['Col A', 'Col B']
    const row = buildRow(headerRow, baseLead)
    expect(row).toEqual(['', ''])
  })

  it('writes an empty string for a null optional field rather than "null"', () => {
    const headerRow = ['Company Name', 'Phone Number']
    const row = buildRow(headerRow, { ...baseLead, phone: null })
    expect(row).toEqual(['Acme Corp', ''])
  })

  it('returns a row the same length as the header row', () => {
    const headerRow = ['A', 'B', 'C', 'D', 'E']
    const row = buildRow(headerRow, baseLead)
    expect(row).toHaveLength(5)
  })
})
