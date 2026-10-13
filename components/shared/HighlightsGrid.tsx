export interface Highlight {
  label: string
  value: React.ReactNode
  href?: string
}

// A small grid of key-fact cards at the top of a record view — Attio calls
// this "Highlights". Deliberately dumb (just renders what it's given) so the
// same component serves both Lead and Company records with different facts.
export function HighlightsGrid({ items }: { items: Highlight[] }) {
  if (items.length === 0) return null
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-4">
      {items.map((h) => {
        const content = (
          <div className="rounded-md border bg-card p-3">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{h.label}</p>
            <p className="text-sm font-medium mt-0.5 truncate">{h.value}</p>
          </div>
        )
        return h.href ? (
          <a key={h.label} href={h.href} className="hover:border-primary/50 rounded-md transition-colors">
            {content}
          </a>
        ) : (
          <div key={h.label}>{content}</div>
        )
      })}
    </div>
  )
}
