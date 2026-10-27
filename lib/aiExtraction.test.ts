import { describe, expect, it } from 'vitest'
import { extractLinks } from '@/lib/aiExtraction'

// extractLinks runs over raw OCR text from a scanned business card — a
// wrong classification here means a LinkedIn profile gets buried in
// "other links" (or worse, a card's email provider gets surfaced as if it
// were a found website), so the real failure modes get tests rather than
// trust.
describe('extractLinks', () => {
  it('classifies a LinkedIn profile URL into linkedin', () => {
    const result = extractLinks('Jane Doe\nlinkedin.com/in/janedoe\nAcme Inc')
    expect(result.linkedin).toBe('linkedin.com/in/janedoe')
    expect(result.other).toEqual([])
  })

  it('classifies a LinkedIn company URL into linkedin too', () => {
    const result = extractLinks('https://www.linkedin.com/company/acme')
    expect(result.linkedin).toBe('https://www.linkedin.com/company/acme')
  })

  it('puts a non-LinkedIn URL into other, not website', () => {
    const result = extractLinks('Jane Doe\nwww.acme.com\nCEO')
    expect(result.linkedin).toBeUndefined()
    expect(result.other).toEqual(['www.acme.com'])
  })

  it('finds multiple distinct links on one card', () => {
    const result = extractLinks('acme.com\nlinkedin.com/in/jane\nacme-portfolio.net')
    expect(result.linkedin).toBe('linkedin.com/in/jane')
    expect(result.other).toEqual(['acme.com', 'acme-portfolio.net'])
  })

  it('never surfaces an email address domain as a found link', () => {
    const result = extractLinks('Jane Doe\njane@acme.com\nCEO, Acme Inc')
    expect(result.other).toEqual([])
    expect(result.linkedin).toBeUndefined()
  })

  it('still finds a real link alongside an email on the same card', () => {
    const result = extractLinks('jane@acme.com\nwww.acme.com')
    expect(result.other).toEqual(['www.acme.com'])
  })

  it('dedupes a link that appears twice', () => {
    const result = extractLinks('acme.com — see more at acme.com')
    expect(result.other).toEqual(['acme.com'])
  })

  it('strips trailing punctuation from running card text', () => {
    const result = extractLinks('Visit acme.com, or call us.')
    expect(result.other).toEqual(['acme.com'])
  })

  it('returns an empty result for text with no links', () => {
    const result = extractLinks('Jane Doe\nCEO\n555-0142')
    expect(result.linkedin).toBeUndefined()
    expect(result.other).toEqual([])
  })

  it('returns an empty result for empty/whitespace input', () => {
    expect(extractLinks('').other).toEqual([])
    expect(extractLinks('   ').other).toEqual([])
  })
})
