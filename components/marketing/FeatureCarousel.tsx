'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { Kanban, BarChart3, Plug, KeyRound, Building2, Calendar, ShieldCheck, ChevronLeft, ChevronRight } from 'lucide-react'
import { GenericPipelineChart } from './GenericPipelineChart'
import { ActivityFeedView } from '@/components/dashboard/ActivityFeed'
import { RepPerformance } from '@/components/dashboard/RepPerformance'
import {
  GENERIC_STAGE_DATA,
  ACTIVITY_DEMO,
  REPS_DEMO,
  CalendarSurface,
  AuditLogSurface,
} from './RealAppShowcase'

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
    render: () => (
      // .light pins --background/--foreground to the app's real light-theme
      // values regardless of the marketing page's own theme state (same
      // idiom as Frame.tsx's product-preview wrapper) — without it, these
      // tokens follow whatever the visitor's site-wide theme happens to be
      // (dark by default), rendering near-black text on a near-transparent
      // dark card instead of a light app-screenshot-style preview.
      <div className="light rounded-lg bg-background p-4 text-foreground">
        <GenericPipelineChart data={GENERIC_STAGE_DATA} />
      </div>
    ),
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
    render: () => (
      <div className="light rounded-lg bg-background p-4 text-foreground">
        <ActivityFeedView items={ACTIVITY_DEMO} live={false} interactive={false} />
      </div>
    ),
  },
  {
    id: 'rep-access',
    Icon: KeyRound,
    name: 'Rep access',
    description: 'Field reps log in with a PIN, no email needed.',
    render: () => (
      <div className="light rounded-lg bg-background p-4 text-foreground">
        <RepPerformance rows={REPS_DEMO} />
      </div>
    ),
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
    render: () => <CalendarSurface />,
  },
  {
    id: 'audit-log',
    Icon: ShieldCheck,
    name: 'Audit log',
    description: 'Every login and role change, kept for the admin who needs it.',
    render: () => <AuditLogSurface />,
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
      <div className="relative h-[26rem] overflow-hidden rounded-xl border border-white/[0.09] shadow-2xl shadow-black/40">
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

  return (
    <div className="flex h-[26rem] flex-col overflow-hidden rounded-xl border border-white/[0.09] bg-[#0b0d14] shadow-2xl shadow-black/40">
      <div className="flex items-center gap-3 border-b border-white/[0.07] px-6 py-4">
        <Icon className="h-5 w-5 text-[#5b8cff]" strokeWidth={1.6} />
        <div>
          <h3 className="text-base font-semibold text-white">{card.name}</h3>
          <p className="text-xs text-white/50">{card.description}</p>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-5">{card.render!()}</div>
    </div>
  )
}
