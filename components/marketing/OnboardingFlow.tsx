'use client'

import { useEffect, useRef, useState } from 'react'
import { BRAND_NAME } from '@/lib/branding'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PipelineFunnel } from '@/components/dashboard/PipelineFunnel'
import { FUNNEL_DATA } from './RealAppShowcase'

// Scroll-advanced onboarding sequence, in the spirit of redstone.software's
// numbered process section: the active step lights up as you scroll through
// the block, with a connecting rail that fills behind it.
//
// Driven by one IntersectionObserver per step rather than a scroll handler —
// no per-frame work, and the browser does the intersection maths off the
// main thread.

type Step = {
  n: string
  title: string
  body: string
  // Rendered inside the step's preview pane.
  preview: React.ReactNode
}

export function OnboardingFlow() {
  const [active, setActive] = useState(0)
  const stepRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    const els = stepRefs.current.filter(Boolean) as HTMLDivElement[]
    if (!els.length) return

    const io = new IntersectionObserver(
      (entries) => {
        // Pick the entry nearest the viewport's vertical centre, so one step
        // is always "current" even when two are partly visible.
        const visible = entries.filter((e) => e.isIntersecting)
        if (!visible.length) return
        const mid = window.innerHeight / 2
        let best = visible[0]
        let bestDist = Infinity
        for (const e of visible) {
          const r = e.boundingClientRect
          const d = Math.abs(r.top + r.height / 2 - mid)
          if (d < bestDist) {
            bestDist = d
            best = e
          }
        }
        const idx = els.indexOf(best.target as HTMLDivElement)
        if (idx >= 0) setActive(idx)
      },
      { rootMargin: '-25% 0px -25% 0px', threshold: [0, 0.5, 1] },
    )

    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])

  return (
    <div className="mx-auto max-w-6xl px-6">
      <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr]">
        {/* Steps rail */}
        <div className="relative">
          {/* Track + fill. The fill height is driven by the active index so
              it reads as progress rather than decoration. */}
          <div className="absolute bottom-2 left-[17px] top-2 w-px bg-white/10" aria-hidden="true">
            <div
              className="w-px bg-[#5b8cff] transition-[height] duration-500 ease-out"
              style={{ height: `${(active / Math.max(STEPS.length - 1, 1)) * 100}%` }}
            />
          </div>

          <ol className="space-y-10">
            {STEPS.map((s, i) => {
              const isActive = i === active
              const isPast = i < active
              return (
                <li key={s.n}>
                  <div
                    ref={(el) => {
                      stepRefs.current[i] = el
                    }}
                    className="flex gap-5"
                  >
                    {/* Plain numeral. The stamp treatment was dropped: it
                        was decoration competing with the step content. */}
                    <span
                      className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full font-mono text-[11px] font-semibold transition-colors duration-300 ${
                        isActive
                          ? 'bg-[#5b8cff] text-[#07080c]'
                          : isPast
                            ? 'bg-[#5b8cff]/20 text-[#5b8cff]'
                            : 'bg-white/[0.06] text-white/35'
                      }`}
                    >
                      {s.n}
                    </span>
                    <div className="min-w-0">
                      <h3
                        className={`text-lg font-semibold transition-colors duration-300 ${
                          isActive ? 'text-white' : 'text-white/45'
                        }`}
                      >
                        {s.title}
                      </h3>
                      <p
                        className={`mt-2 text-sm leading-relaxed transition-colors duration-300 ${
                          isActive ? 'text-white/60' : 'text-white/30'
                        }`}
                      >
                        {s.body}
                      </p>
                      {/* Preview inline on narrow screens, where the sticky
                          pane beside it is hidden. */}
                      <div className="mt-4 lg:hidden">{s.preview}</div>
                    </div>
                  </div>
                </li>
              )
            })}
          </ol>
        </div>

        {/* Sticky preview pane, desktop only. */}
        <div className="hidden lg:block">
          <div className="sticky top-28">
            <div className="relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] p-5 shadow-2xl shadow-black/50">
              {STEPS.map((s, i) => (
                <div
                  key={s.n}
                  className="transition-opacity duration-400"
                  style={{
                    opacity: i === active ? 1 : 0,
                    // Stack every panel in the same grid cell so the frame
                    // height is the tallest panel and never jumps on change.
                    gridArea: '1 / 1',
                    display: 'grid',
                  }}
                  aria-hidden={i !== active}
                >
                  {s.preview}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---- Step previews -------------------------------------------------------

// Renders the product's own Card and Button rather than a hand-drawn
// approximation of the signup screen, so a restyle reaches this too.
function GoogleSignIn() {
  return (
    <div className="grid place-items-center py-6">
      <div className="w-full max-w-[280px] rounded-lg bg-background p-5 text-center text-foreground">
        <p className="text-sm font-semibold">Join {BRAND_NAME}</p>
        <p className="mt-1 text-xs text-muted-foreground">Create your account to get started.</p>
        <Button className="mt-4 w-full" size="sm">
          Sign up with Google
        </Button>
        <p className="mt-2.5 text-[11px] text-muted-foreground">No credit card. No new password.</p>
      </div>
    </div>
  )
}

// The paste-to-fill demo: raw pasted text on the left, extracted fields
// appearing on the right. The staggered animation is CSS-only and loops, so
// it reads as "the model is working" without a video file.
function PasteToFill() {
  const fields = [
    { k: 'Company', v: 'Ardent Studio' },
    { k: 'Contact', v: 'Meera Raghavan' },
    { k: 'Email', v: 'meera@ardent.studio' },
    { k: 'Phone', v: '+91 98200 11234' },
  ]
  return (
    <div className="space-y-3 py-2">
      <div className="rounded-md border border-white/10 bg-white/[0.02] p-3">
        <div className="text-[9px] uppercase tracking-wide text-white/30">Pasted</div>
        <p className="mt-1.5 font-mono text-[10px] leading-relaxed text-white/50">
          Hi, following up from the call. Meera Raghavan at Ardent Studio,
          meera@ardent.studio, +91 98200 11234. Wants a quote by Friday.
        </p>
      </div>
      <div className="space-y-1.5">
        {fields.map((f, i) => (
          <div
            key={f.k}
            className="flex items-center justify-between rounded-md border border-[#2ecc9b]/25 bg-[#2ecc9b]/[0.07] px-2.5 py-1.5"
            style={{ animation: `extract-in 500ms ease-out ${i * 160}ms both` }}
          >
            <span className="text-[9px] text-white/40">{f.k}</span>
            <span className="text-[10px] font-medium text-white/85">{f.v}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function InviteTeam() {
  const people = [
    { n: 'You', r: 'Admin', c: '#5b8cff' },
    { n: 'Priya', r: 'Sales', c: '#2ecc9b' },
    { n: 'Arjun', r: 'Sales', c: '#f0a44a' },
  ]
  return (
    <div className="space-y-2 py-4">
      {people.map((p, i) => (
        <div
          key={p.n}
          className="flex items-center gap-3 rounded-md border border-white/10 bg-white/[0.02] px-3 py-2.5"
          style={{ animation: `extract-in 500ms ease-out ${i * 180}ms both` }}
        >
          <span
            className="grid h-6 w-6 place-items-center rounded-full text-[9px] font-semibold text-[#07080c]"
            style={{ background: p.c }}
          >
            {p.n[0]}
          </span>
          <span className="text-[10px] text-white/80">{p.n}</span>
          <Badge variant="outline" className="ml-auto text-[9px]">{p.r}</Badge>
        </div>
      ))}
      <div className="pt-1 text-center text-[9px] text-white/30">Invite by email, they land in your org.</div>
    </div>
  )
}

// The real PipelineFunnel from the dashboard, not a drawn stand-in.
function RunPipeline() {
  return (
    <div className="rounded-md bg-background p-3 text-foreground">
      <PipelineFunnel data={FUNNEL_DATA} />
    </div>
  )
}

const STEPS: Step[] = [
  {
    n: '01',
    title: 'Sign in with Google',
    body: 'No password to choose, no credit card, no setup call. Google already proved it’s you, your workspace exists the moment you land.',
    preview: <GoogleSignIn />,
  },
  {
    n: '02',
    title: 'Paste your first lead',
    body: 'Drop in a forwarded email or a note from a call. The on-device model pulls out company, contact, email and phone before you’ve opened a form.',
    preview: <PasteToFill />,
  },
  {
    n: '03',
    title: 'Bring your team in',
    body: 'Invite by email. Everyone lands in your org with a role, sales see their own leads, admins see everything.',
    preview: <InviteTeam />,
  },
  {
    n: '04',
    title: 'Run your pipeline',
    body: 'Drag deals through stages that match how you sell. Stale leads flag themselves after 21 days of silence.',
    preview: <RunPipeline />,
  },
]
