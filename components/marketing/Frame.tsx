/** Chrome that frames a surface as a browser window, as in the product. */
export function Frame({ path, children }: { path: string; children: React.ReactNode }) {
  // No static border/shadow on this resting panel (house-style rule) — a
  // flat fill does the same job. The path label is now the normal sans
  // typeface, not mono — it's a caption, not literal code.
  return (
    <div className="overflow-hidden rounded-xl bg-[#0b0d14]">
      <div className="flex items-center gap-2 border-b border-white/[0.07] px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
        <span className="ml-2 text-[11px] text-white/35">{path}</span>
      </div>
      {/* The product's own light surface, sitting inside the dark page —
          pinned to light regardless of the marketing page's own theme
          (next-themes' `light` class scopes --background/--foreground/
          etc. for everything inside it), since the real dashboard this
          previews is shown here as a fixed reference screenshot, not
          something that should flip with the visitor's theme choice. */}
      <div className="light bg-background p-5 text-foreground">{children}</div>
    </div>
  )
}
