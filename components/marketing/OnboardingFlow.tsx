import { BentoGrid, BentoCell } from './Bento'

// A 2x2 bento lattice (span=3 of 6 each), filling the section's full
// max-w-7xl width like every other bento section on the page — a single
// max-w-2xl column of 4 equal-weight steps left most of a wide section
// empty on the right with nothing to justify the asymmetry (no step here
// is more important or detailed than another).

type Step = {
  title: string
  body: string
}

// Order genuinely matters here (sign in, THEN paste a lead, THEN invite a
// team, THEN run the pipeline) — the house style's own exception for a
// real sequence is a real <ol>, but this grid's cells aren't block-level
// list items in the semantic HTML sense (Bento.tsx's cells are plain
// divs), so instead the number is kept as plain text in the normal
// typeface — no mono, no padStart("01"), no drawn badge — which still
// communicates sequence without dressing a digit up as a UI chrome tell.
export function OnboardingFlow() {
  return (
    <div className="mx-auto max-w-7xl px-6">
      <BentoGrid>
        {STEPS.map((s, i) => (
          <BentoCell key={s.title} span={3} className="flex items-start gap-5">
            <span className="mt-0.5 text-lg font-semibold text-white/30 [font-variant-numeric:tabular-nums]">
              {i + 1}
            </span>
            <div>
              <h3 className="text-lg font-semibold text-white">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/55">{s.body}</p>
            </div>
          </BentoCell>
        ))}
      </BentoGrid>
    </div>
  )
}

const STEPS: Step[] = [
  {
    title: 'Sign in with Google',
    body: 'No password, no setup call.',
  },
  {
    title: 'Paste your first lead',
    body: 'We pull out the details for you.',
  },
  {
    title: 'Bring your team in',
    body: 'Invite by email, done.',
  },
  {
    title: 'Run your pipeline',
    body: 'Drag deals through your stages.',
  },
]
