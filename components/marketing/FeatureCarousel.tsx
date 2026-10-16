'use client'

import { useEffect, useRef, useState } from 'react'
import { Kanban, BarChart3, Plug, KeyRound, Building2, Calendar, ShieldCheck } from 'lucide-react'
import { GenericPipelineChart } from './GenericPipelineChart'
import { SourceROI } from '@/components/dashboard/SourceROI'
import { ActivityFeedView } from '@/components/dashboard/ActivityFeed'
import { RepPerformance } from '@/components/dashboard/RepPerformance'
import {
  GENERIC_STAGE_DATA,
  ACTIVITY_DEMO,
  REPS_DEMO,
  SOURCES_DEMO,
  CompaniesSurface,
  CalendarSurface,
  AuditLogSurface,
} from './RealAppShowcase'

// "Everything else" as a pinned scroll carousel, same mechanism as
// HorizontalTour: the section pins while the page scrolls, and one big card
// fades/slides into the next. This covers every remaining feature inside a
// fixed amount of page height instead of a long static list, and every card
// carries the actual product component, not an icon tile.

type Card = {
  id: string
  Icon: React.ElementType
  name: string
  description: string
  render: () => React.ReactNode
}

const CARDS: Card[] = [
  {
    id: 'pipeline',
    Icon: Kanban,
    name: 'Pipeline',
    description: 'Stages your team already uses.',
    render: () => (
      <div className="rounded-lg bg-background p-4 text-foreground">
        <GenericPipelineChart data={GENERIC_STAGE_DATA} />
      </div>
    ),
  },
  {
    id: 'reports',
    Icon: BarChart3,
    name: 'Reports',
    description: 'Pipeline, conversion, source ROI. Exportable.',
    render: () => (
      <div className="rounded-lg bg-background p-4 text-foreground">
        <SourceROI rows={SOURCES_DEMO} />
      </div>
    ),
  },
  {
    id: 'agent-api',
    Icon: Plug,
    name: 'Agent API',
    description: 'Six tools over MCP. Every call lands here, on the real activity log.',
    render: () => (
      <div className="rounded-lg bg-background p-4 text-foreground">
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
      <div className="rounded-lg bg-background p-4 text-foreground">
        <RepPerformance rows={REPS_DEMO} />
      </div>
    ),
  },
  {
    id: 'companies',
    Icon: Building2,
    name: 'Companies',
    description: 'One record per company, every lead and contact linked to it.',
    render: () => <CompaniesSurface />,
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

export function FeatureCarousel() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const [progress, setProgress] = useState(0)
  const [enabled, setEnabled] = useState(false)
  const frame = useRef(0)

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')
    const decide = () => setEnabled(!reduce.matches)
    decide()
    reduce.addEventListener('change', decide)
    return () => reduce.removeEventListener('change', decide)
  }, [])

  useEffect(() => {
    if (!enabled) return
    const el = sectionRef.current
    if (!el) return

    const onScroll = () => {
      cancelAnimationFrame(frame.current)
      frame.current = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect()
        const total = el.offsetHeight - window.innerHeight
        if (total <= 0) return
        const p = Math.min(1, Math.max(0, -rect.top / total))
        setProgress(p)
      })
    }

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      cancelAnimationFrame(frame.current)
    }
  }, [enabled])

  // Stacked fallback: reduced motion, or JS hasn't run yet (this is also
  // what search engines and no-JS visitors see).
  if (!enabled) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 px-6">
        {CARDS.map((c) => (
          <CardFrame key={c.id} card={c} active />
        ))}
      </div>
    )
  }

  const n = CARDS.length
  const index = Math.min(n - 1, Math.floor(progress * n))

  return (
    <div ref={sectionRef} style={{ height: `${n * 70}vh` }}>
      <div className="sticky top-24 mx-auto max-w-4xl px-6">
        <div className="relative" style={{ height: '26rem' }}>
          {CARDS.map((c, i) => {
            const offset = i - index
            return (
              <div
                key={c.id}
                className="absolute inset-0 transition-all duration-500 ease-out"
                style={{
                  gridArea: '1 / 1',
                  transform: `translateY(${offset * 24}px) scale(${offset === 0 ? 1 : 0.94})`,
                  opacity: offset === 0 ? 1 : offset < 0 ? 0 : 0.0,
                  zIndex: n - Math.abs(offset),
                  pointerEvents: offset === 0 ? 'auto' : 'none',
                }}
              >
                <CardFrame card={c} active={offset === 0} />
              </div>
            )
          })}
        </div>

        <div className="mt-8 flex gap-1.5">
          {CARDS.map((c, i) => (
            <span
              key={c.id}
              className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                i === index ? 'bg-[#5b8cff]' : 'bg-white/12'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function CardFrame({ card, active }: { card: Card; active: boolean }) {
  const { Icon } = card
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-white/[0.09] bg-[#0b0d14] shadow-2xl shadow-black/40">
      <div className="flex items-center gap-3 border-b border-white/[0.07] px-6 py-4">
        <Icon className="h-5 w-5 text-[#5b8cff]" strokeWidth={1.6} />
        <div>
          <h3 className="text-base font-semibold text-white">{card.name}</h3>
          <p className="text-xs text-white/50">{card.description}</p>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-5">{active ? card.render() : null}</div>
    </div>
  )
}
