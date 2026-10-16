/** Chrome that frames a surface as a browser window, as in the product. */
export function Frame({ path, children }: { path: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.09] bg-[#0b0d14] shadow-2xl shadow-black/40">
      <div className="flex items-center gap-2 border-b border-white/[0.07] px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
        <span className="ml-2 font-mono text-[11px] text-white/35">{path}</span>
      </div>
      {/* The product's own light surface, sitting inside the dark page. */}
      <div className="bg-background p-5 text-foreground">{children}</div>
    </div>
  )
}
