import { FileSpreadsheet, GitBranch, CheckCircle2 } from 'lucide-react'
import { BentoGrid, BentoCell } from './Bento'

// The positioning section. The product is not pitched as a better CRM; it is
// pitched as the stage between a spreadsheet and a CRM, with the agent layer
// as the reason the move is survivable at all.
//
// Bento, not three equal columns: the middle step ("where we sit") is the
// actual pitch, so it leads on its own wide row; "where you are" and
// "where you go" are the bookends and share the row beneath it.

const STAGES = [
  {
    icon: GitBranch,
    where: 'Where we sit',
    title: 'Structure, without the migration',
    body: 'Stages, owners and a trail. No three-month rollout.',
    span: 6 as const,
    wide: true,
  },
  {
    icon: FileSpreadsheet,
    where: 'Where you are',
    title: 'A spreadsheet that works',
    body: 'Fast, familiar, and with no memory of what was promised.',
    span: 3 as const,
    wide: false,
  },
  {
    icon: CheckCircle2,
    where: 'Where you go',
    title: 'Ready for the real thing',
    body: 'Export clean and move. Lock-in is not the product.',
    span: 3 as const,
    wide: false,
  },
]

export function BridgeSection() {
  return (
    <div className="mx-auto max-w-7xl px-6">
      <BentoGrid>
        {STAGES.map((s) => (
          <BentoCell key={s.title} span={s.span}>
            <div className={s.wide ? 'flex items-center gap-8' : ''}>
              <div className={s.wide ? 'shrink-0' : ''}>
                {/* No decorative 01/02/03 numbering (position in the row
                    already shows order) and no mono/tracked-caps label —
                    plain sentence-case text in the sans typeface. */}
                <div className="flex items-center gap-3">
                  <s.icon className="h-5 w-5 text-white/35" strokeWidth={1.75} aria-hidden="true" />
                  <span className="text-sm text-white/35">{s.where}</span>
                </div>
                <h3 className="mt-5 text-lg font-semibold tracking-tight text-white sm:text-xl">{s.title}</h3>
              </div>
              <p className={s.wide ? 'mt-0 max-w-sm text-sm leading-relaxed text-white/55' : 'mt-2.5 text-sm leading-relaxed text-white/55'}>
                {s.body}
              </p>
            </div>
          </BentoCell>
        ))}
      </BentoGrid>
    </div>
  )
}
