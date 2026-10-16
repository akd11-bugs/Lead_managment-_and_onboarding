import { FileSpreadsheet, GitBranch, CheckCircle2 } from 'lucide-react'

// The positioning section. The product is not pitched as a better CRM; it is
// pitched as the stage between a spreadsheet and a CRM, with the agent layer
// as the reason the move is survivable at all.
//
// Laid out as three stamps on a strip, because the argument is a sequence and
// the sheet's visual language is a row of franked tiles.

const STAGES = [
  {
    icon: FileSpreadsheet,
    where: 'Where you are',
    title: 'A spreadsheet that works',
    body: 'Fast, familiar, and with no memory of what was promised.',
  },
  {
    icon: GitBranch,
    where: 'Where we sit',
    title: 'Structure, without the migration',
    body: 'Stages, owners and a trail. No three-month rollout.',
  },
  {
    icon: CheckCircle2,
    where: 'Where you go',
    title: 'Ready for the real thing',
    body: 'Export clean and move. Lock-in is not the product.',
  },
]

export function BridgeSection() {
  return (
    <div className="mx-auto max-w-6xl px-6">
      <div className="grid gap-px overflow-hidden rounded-xl border border-white/[0.09] bg-white/[0.07] md:grid-cols-3">
        {STAGES.map((s, i) => (
          <div key={s.title} className="relative bg-[#07080c] p-7">
            <div className="flex items-center gap-3">
              <s.icon className="h-5 w-5 text-white/35" strokeWidth={1.75} aria-hidden="true" />
              <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-white/35">
                {String(i + 1).padStart(2, '0')} / {s.where}
              </span>
            </div>
            <h3 className="mt-5 text-lg font-semibold tracking-tight text-white">{s.title}</h3>
            <p className="mt-2.5 text-sm leading-relaxed text-white/55">{s.body}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
