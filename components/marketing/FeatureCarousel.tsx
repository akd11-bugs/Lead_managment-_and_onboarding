'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { Kanban, BarChart3, Plug, KeyRound, Building2, Calendar, ShieldCheck, ChevronLeft, ChevronRight } from 'lucide-react'
import { GenericPipelineChart } from './GenericPipelineChart'
import { ActivityFeedView } from '@/components/dashboard/ActivityFeed'
import { RepPerformance } from '@/components/dashboard/RepPerformance'
import { CalendarMonth } from '@/components/calendar/CalendarMonth'
import { AuditLogTable } from '@/components/settings/AuditLogTable'
import { GENERIC_STAGE_DATA, ACTIVITY_DEMO, REPS_DEMO, CALENDAR_DEMO, AUDIT_DEMO } from './RealAppShowcase'

// "Everything else," as an auto-rotating carousel: one card at a time,
// advancing on a timer and looping back to the first after the last, with
// arrows and dots for manual control. Pauses on hover/focus and under
// prefers-reduced-motion so it never fights a visitor reading a card. This
// replaces both the earlier scroll-pinned version (ghosting/dead-space
// bugs) and a later plain-grid version — a single auto-advancing card is
// what was actually asked for here.

type Card = {
  id: string
  Icon: React.ElementType
  name: string
  description: string
} & ({ render: () => React.ReactNode; image?: never } | { image: string; render?: never })

const CARDS: Card[] = [
  {
    id: 'pipeline',
    Icon: Kanban,
    name: 'Pipeline',
    description: 'Stages your team already uses.',
    // No rounded-lg/p-4/Frame chrome here — CardFrame below is the only
    // card surface. Each render-type card used to wrap itself in its own
    // nested card (a bare .light bg-background box for some, Frame.tsx's
    // full browser-window chrome — border + title bar + its own padding —
    // for others), which left a visible gap of plain dark card background
    // around an inset panel instead of the content reaching the card's
    // edges the way a real screenshot (Reports, Companies) does. .light
    // still pins --background/--foreground to the app's real light-theme
    // values regardless of the marketing page's own theme state; it's now
    // applied once, to the scroll wrapper in CardFrame, not per-card.
    render: () => <GenericPipelineChart data={GENERIC_STAGE_DATA} />,
  },
  {
    id: 'reports',
    Icon: BarChart3,
    name: 'Reports',
    description: 'Pipeline, conversion, source ROI. Exportable.',
    image: '/marketing/reports-screenshot.png',
  },
  {
    id: 'agent-api',
    Icon: Plug,
    name: 'Agent API',
    description: 'Six tools over MCP. Every call lands here, on the real activity log.',
    // Sliced to 3, same as RealAppShowcase.tsx's own narrower usage of this
    // data — the full 4-item list runs into this card's bottom gradient
    // overlay with a hard-edged cutoff instead of fading out cleanly.
    render: () => <ActivityFeedView items={ACTIVITY_DEMO.slice(0, 3)} live={false} interactive={false} />,
  },
  {
    id: 'rep-access',
    Icon: KeyRound,
    name: 'Rep access',
    description: 'Field reps log in with a PIN, no email needed.',
    render: () => <RepPerformance rows={REPS_DEMO} />,
  },
  {
    id: 'companies',
    Icon: Building2,
    name: 'Companies',
    description: 'One record per company, every lead and contact linked to it.',
    image: '/marketing/companies-screenshot.png',
  },
  {
    id: 'calendar',
    Icon: Calendar,
    name: 'Calendar',
    description: 'Every task with a due date, in one view.',
    render: () => <CalendarMonth days={CALENDAR_DEMO} />,
  },
  {
    id: 'audit-log',
    Icon: ShieldCheck,
    name: 'Audit log',
    description: 'Every login and role change, kept for the admin who needs it.',
    render: () => <AuditLogTable rows={AUDIT_DEMO} />,
  },
]

// 1 second per card, GSAP-driven crossfade (fade + small vertical shift on
// both the outgoing and incoming card) rather than the CSS keyframe this
// used at the previous 4.5s pace — a plain remount-triggered CSS animation
// is fine at a slow pace, but a GSAP timeline gives precise control over
// exactly how the swap feels at a much faster 1s cadence (e.g. tuning the
// fade duration independently of the interval, overwriting an in-flight
// tween if the user manually advances mid-transition).
const AUTO_ADVANCE_MS = 1000

export function FeatureCarousel() {
  const n = CARDS.length
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const prevIndex = useRef(0)

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (paused || reduce) return
    timer.current = setInterval(() => {
      setIndex((i) => (i + 1) % n)
    }, AUTO_ADVANCE_MS)
    return () => {
      if (timer.current) clearInterval(timer.current)
    }
  }, [paused, n])

  useEffect(() => {
    if (index === prevIndex.current) return
    prevIndex.current = index
    const el = frameRef.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let cancelled = false
    import('gsap').then(({ default: gsap }) => {
      if (cancelled) return
      gsap.fromTo(el, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out', overwrite: true })
    })
    return () => {
      cancelled = true
    }
  }, [index])

  function go(delta: number) {
    setIndex((i) => (i + delta + n) % n)
  }

  return (
    <div
      className="mx-auto max-w-4xl px-6"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="relative">
        <div ref={frameRef}>
          <CardFrame card={CARDS[index]} />
        </div>

        <button
          type="button"
          onClick={() => go(-1)}
          aria-label="Previous feature"
          className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/15 bg-[#0b0d14] p-2 text-white/70 shadow-lg transition-colors hover:text-white"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => go(1)}
          aria-label="Next feature"
          className="absolute right-0 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/15 bg-[#0b0d14] p-2 text-white/70 shadow-lg transition-colors hover:text-white"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-6 flex items-center justify-center gap-2">
        {CARDS.map((c, i) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={`Show ${c.name}`}
            aria-current={i === index}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === index ? 'w-6 bg-[#5b8cff]' : 'w-1.5 bg-white/20'
            }`}
          />
        ))}
      </div>
    </div>
  )
}

function CardFrame({ card }: { card: Card }) {
  const { Icon } = card

  if (card.image) {
    return (
      <div className="relative h-[26rem] overflow-hidden rounded-xl">
        <Image
          src={card.image}
          alt={`${card.name} in the real app`}
          fill
          sizes="(min-width: 768px) 56rem, 100vw"
          className="object-cover object-top"
        />
        {/* Bottom gradient so the title/description stay legible over
            whatever's in the screenshot, same signature move as Notion's
            own real-in-product-screenshot cards. */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#07080c] via-[#07080c]/80 to-transparent px-6 pb-5 pt-16">
          <div className="flex items-center gap-3">
            <Icon className="h-5 w-5 text-[#5b8cff]" strokeWidth={1.6} />
            <div>
              <h3 className="text-base font-semibold text-white">{card.name}</h3>
              <p className="text-xs text-white/70">{card.description}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Same bottom-gradient-overlay chrome as the image branch above — title/
  // icon/description float over the full-bleed content instead of sitting
  // in their own header bar, so a live-rendered demo card and a real
  // screenshot card read as one consistent card type, not two. .light here
  // (not per-card) pins --background/--foreground to the app's real
  // light-theme values regardless of the marketing page's own theme state,
  // and fills the WHOLE card the way a screenshot's pixels do — no nested
  // rounded-lg/border/title-bar of its own, which previously left a ring of
  // plain dark card background visible around an inset panel.
  return (
    <div className="relative h-[26rem] overflow-hidden rounded-xl">
      <div className="light h-full overflow-auto bg-background p-5 pb-24 text-foreground">{card.render!()}</div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#07080c] via-[#07080c]/80 to-transparent px-6 pb-5 pt-16">
        <div className="flex items-center gap-3">
          <Icon className="h-5 w-5 text-[#5b8cff]" strokeWidth={1.6} />
          <div>
            <h3 className="text-base font-semibold text-white">{card.name}</h3>
            <p className="text-xs text-white/70">{card.description}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
