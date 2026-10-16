'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Kanban, Users, Building2, CheckSquare, CalendarDays, BarChart3,
  Sparkles, PenLine, ShieldCheck, KeyRound, Mail, Plug,
} from 'lucide-react'

// Breadth, not depth. The scroll tour above shows four surfaces well but
// caps at four; a visitor who reads only that concludes the product is four
// screens. Every item here maps to a route that exists — if one is removed
// from the app, remove it here rather than letting the page overclaim.
//
// Cards rise and fade as the grid enters the viewport, staggered by position
// so the eye travels across rather than everything appearing at once.

const FEATURES: { icon: typeof Kanban; name: string; body: string }[] = [
  { icon: Kanban, name: 'Pipeline board', body: 'Drag deals through your own stages.' },
  { icon: Users, name: 'Leads & contacts', body: 'Sortable, filterable, searchable.' },
  { icon: Building2, name: 'Companies', body: 'One record per company.' },
  { icon: CheckSquare, name: 'Tasks', body: 'Follow-ups that belong to a lead.' },
  { icon: CalendarDays, name: 'Calendar', body: 'Calls and meetings in one view.' },
  { icon: BarChart3, name: 'Reports', body: 'Pipeline, conversion, activity.' },
  { icon: Sparkles, name: '38 sales skills', body: 'Playbooks against your real pipeline.' },
  { icon: PenLine, name: 'Whiteboard', body: 'A shared canvas with live cursors.' },
  { icon: ShieldCheck, name: 'Audit log', body: 'Who changed what, and when.' },
  { icon: KeyRound, name: 'Rep PIN access', body: 'Field reps log in without email.' },
  { icon: Mail, name: 'Email & onboarding', body: 'Bring your own mailbox.' },
  { icon: Plug, name: 'Agent API', body: 'Six tools over MCP, scoped to a key.' },
]

export function FeatureGrid() {
  const ref = useRef<HTMLDivElement>(null)
  // Server-renders revealed, so the grid is readable with no JS at all. The
  // client hides it only once it has confirmed the grid is still below the
  // fold, then plays it in — the same approach as Reveal.
  const [revealed, setRevealed] = useState(true)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (el.getBoundingClientRect().top < window.innerHeight - 80) return

    setRevealed(false)
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setRevealed(true)
          io.disconnect()
        }
      },
      { threshold: 0.12 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div ref={ref} className="mx-auto max-w-6xl px-6">
      <div className="grid gap-px overflow-hidden rounded-xl border border-white/[0.09] bg-white/[0.07] sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f, i) => {
          const Icon = f.icon
          return (
            <div
              key={f.name}
              className="group bg-[#07080c] p-6 transition-colors hover:bg-white/[0.03]"
              style={{
                opacity: revealed ? 1 : 0,
                transform: revealed ? 'none' : 'translateY(18px)',
                // Stagger by row then column, so the reveal sweeps across the
                // grid instead of firing twelve cards simultaneously.
                transition: `opacity 520ms cubic-bezier(.2,.7,.3,1) ${i * 45}ms, transform 520ms cubic-bezier(.2,.7,.3,1) ${i * 45}ms`,
              }}
            >
              <Icon
                className="h-5 w-5 text-white/35 transition-colors group-hover:text-[#5b8cff]"
                strokeWidth={1.75}
                aria-hidden="true"
              />
              <h3 className="mt-4 text-sm font-semibold text-white">{f.name}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-white/50">{f.body}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
