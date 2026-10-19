import { BentoGrid, BentoCell } from './Bento'

// A 2x2 bento lattice (span=3 of 6 each), filling the section's full
// max-w-7xl width like every other bento section on the page — a single
// max-w-2xl column of 4 equal-weight steps left most of a wide section
// empty on the right with nothing to justify the asymmetry (no step here
// is more important or detailed than another).

type Step = {
  n: string
  title: string
  body: string
}

export function OnboardingFlow() {
  return (
    <div className="mx-auto max-w-7xl px-6">
      <BentoGrid>
        {STEPS.map((s) => (
          <BentoCell key={s.n} span={3} className="flex items-start gap-5">
            <span className="mt-0.5 font-mono text-xs font-semibold text-[#8fb0ff]">{s.n}</span>
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
    n: '01',
    title: 'Sign in with Google',
    body: 'No password, no setup call.',
  },
  {
    n: '02',
    title: 'Paste your first lead',
    body: 'We pull out the details for you.',
  },
  {
    n: '03',
    title: 'Bring your team in',
    body: 'Invite by email, done.',
  },
  {
    n: '04',
    title: 'Run your pipeline',
    body: 'Drag deals through your stages.',
  },
]
