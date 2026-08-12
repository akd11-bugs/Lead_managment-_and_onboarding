// Markdown → structured JSON for rendering skill output as tables, lists, etc.
// Keeps the LMS output pretty without re-running the LLM.

export type ParsedSection =
  | { kind: 'h'; level: 1 | 2 | 3 | 4; text: string }
  | { kind: 'p'; text: string }
  | { kind: 'table'; headers: string[]; rows: string[][] }
  | { kind: 'list'; ordered: boolean; items: string[] }
  | { kind: 'code'; lang?: string; text: string }
  | { kind: 'blockquote'; text: string }
  | { kind: 'hr' }

export interface ParsedReport {
  sections: ParsedSection[]
}

export function parseMarkdown(md: string): ParsedReport {
  const lines = md.split('\n')
  const sections: ParsedSection[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Skip empty lines
    if (line.trim() === '') {
      i++
      continue
    }

    // Headings
    const headingMatch = /^(#{1,4})\s+(.*)$/.exec(line)
    if (headingMatch) {
      const level = headingMatch[1].length as 1 | 2 | 3 | 4
      sections.push({ kind: 'h', level, text: headingMatch[2].trim() })
      i++
      continue
    }

    // Horizontal rule
    if (/^---+\s*$/.test(line)) {
      sections.push({ kind: 'hr' })
      i++
      continue
    }

    // Code block
    const codeMatch = /^```(\w*)\s*$/.exec(line)
    if (codeMatch) {
      const lang = codeMatch[1] || undefined
      const buf: string[] = []
      i++
      while (i < lines.length && !/^```\s*$/.test(lines[i])) {
        buf.push(lines[i])
        i++
      }
      i++ // skip closing ```
      sections.push({ kind: 'code', lang, text: buf.join('\n') })
      continue
    }

    // Blockquote
    if (/^>\s?/.test(line)) {
      const buf: string[] = []
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^>\s?/, ''))
        i++
      }
      sections.push({ kind: 'blockquote', text: buf.join('\n') })
      continue
    }

    // Table
    if (/^\|.*\|/.test(line) && i + 1 < lines.length && /^\|[\s:-]+\|/.test(lines[i + 1])) {
      const headers = splitTableRow(lines[i])
      i += 2 // skip header and separator
      const rows: string[][] = []
      while (i < lines.length && /^\|.*\|/.test(lines[i])) {
        rows.push(splitTableRow(lines[i]))
        i++
      }
      sections.push({ kind: 'table', headers, rows })
      continue
    }

    // List
    const unorderedMatch = /^[-*+]\s+(.*)$/.exec(line)
    const orderedMatch = /^\d+\.\s+(.*)$/.exec(line)
    if (unorderedMatch || orderedMatch) {
      const ordered = !!orderedMatch
      const items: string[] = []
      while (
        i < lines.length &&
        ((ordered && /^\d+\.\s+(.*)$/.test(lines[i])) ||
          (!ordered && /^[-*+]\s+(.*)$/.test(lines[i])))
      ) {
        const text = lines[i].replace(/^([-*+]|\d+\.)\s+/, '')
        items.push(text)
        i++
      }
      sections.push({ kind: 'list', ordered, items })
      continue
    }

    // Paragraph (collect until blank line or special block)
    const buf: string[] = [line]
    i++
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^#{1,4}\s/.test(lines[i]) &&
      !/^[-*+]\s+/.test(lines[i]) &&
      !/^\d+\.\s+/.test(lines[i]) &&
      !/^```/.test(lines[i]) &&
      !/^>\s?/.test(lines[i]) &&
      !/^\|.*\|/.test(lines[i])
    ) {
      buf.push(lines[i])
      i++
    }
    sections.push({ kind: 'p', text: buf.join(' ') })
  }

  return { sections }
}

function splitTableRow(line: string): string[] {
  return line
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.trim())
}