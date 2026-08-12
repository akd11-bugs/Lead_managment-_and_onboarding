'use client'

import { parseMarkdown } from '@/lib/skills/parsers'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export function ReportRenderer({ markdown }: { markdown: string }) {
  const { sections } = parseMarkdown(markdown)

  return (
    <div className="space-y-4">
      {sections.length === 0 && (
        <Card>
          <CardContent className="p-5 text-sm text-muted-foreground">No content.</CardContent>
        </Card>
      )}
      {sections.map((sec, i) => {
        switch (sec.kind) {
          case 'h': {
            const cls = cn(
              sec.level === 1 && 'text-2xl font-semibold tracking-tight',
              sec.level === 2 && 'text-lg font-semibold mt-6',
              sec.level === 3 && 'text-base font-semibold mt-4',
              sec.level === 4 && 'text-sm font-semibold mt-2'
            )
            return <h2 key={i} className={cls}>{sec.text}</h2>
          }
          case 'p':
            return (
              <p key={i} className="text-sm leading-relaxed whitespace-pre-line">
                {sec.text}
              </p>
            )
          case 'code':
            return (
              <pre
                key={i}
                className="overflow-x-auto rounded-md border bg-muted/40 p-4 text-xs font-mono"
              >
                <code>{sec.text}</code>
              </pre>
            )
          case 'blockquote':
            return (
              <blockquote
                key={i}
                className="border-l-2 border-muted-foreground/40 pl-4 italic text-sm text-muted-foreground"
              >
                {sec.text}
              </blockquote>
            )
          case 'hr':
            return <hr key={i} className="my-6 border-border" />
          case 'list': {
            const ListTag = sec.ordered ? 'ol' : 'ul'
            return (
              <ListTag
                key={i}
                className={cn(
                  'text-sm space-y-1 pl-6',
                  sec.ordered ? 'list-decimal' : 'list-disc'
                )}
              >
                {sec.items.map((it, j) => (
                  <li key={j} className="leading-relaxed">
                    {renderInline(it)}
                  </li>
                ))}
              </ListTag>
            )
          }
          case 'table':
            return (
              <div key={i} className="overflow-x-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr>
                      {sec.headers.map((h, j) => (
                        <th
                          key={j}
                          className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {sec.rows.map((row, ri) => (
                      <tr key={ri}>
                        {row.map((cell, ci) => (
                          <td key={ci} className="px-3 py-2 align-top whitespace-pre-line">
                            {renderInline(cell)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          default:
            return null
        }
      })}
    </div>
  )
}

// Render **bold**, *italic*, `code`, and [link](url) inline.
function renderInline(text: string): React.ReactNode {
  // Split by backticks first, then bold/italic/code
  const parts: React.ReactNode[] = []
  const codeRe = /`([^`]+)`/g
  let lastIdx = 0
  let m: RegExpExecArray | null
  let key = 0
  while ((m = codeRe.exec(text))) {
    if (m.index > lastIdx) parts.push(renderBold(text.slice(lastIdx, m.index), key++))
    parts.push(
      <code key={key++} className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
        {m[1]}
      </code>
    )
    lastIdx = m.index + m[0].length
  }
  if (lastIdx < text.length) parts.push(renderBold(text.slice(lastIdx), key++))
  return <>{parts}</>
}

function renderBold(text: string, keyBase: number): React.ReactNode {
  const parts: React.ReactNode[] = []
  const re = /\*\*([^*]+)\*\*/g
  let lastIdx = 0
  let m: RegExpExecArray | null
  let k = keyBase
  while ((m = re.exec(text))) {
    if (m.index > lastIdx) parts.push(text.slice(lastIdx, m.index))
    parts.push(<strong key={k++}>{m[1]}</strong>)
    lastIdx = m.index + m[0].length
  }
  if (lastIdx < text.length) parts.push(text.slice(lastIdx))
  return <>{parts}</>
}