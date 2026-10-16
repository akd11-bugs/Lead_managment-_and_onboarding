'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { WhiteboardDemo } from './WhiteboardDemo'
import { AppFrame, DashboardMock, PipelineMock, LeadsMock, LeadProfileMock } from './AppMock'

// Replaces what used to be four near-identical alternating screenshot
// sections. Same four surfaces, one frame: the repetition was the problem,
// not the content. Auto-advances until the visitor takes over, then stops for
// good rather than yanking the panel out from under them.
//
// Every panel is live DOM — no product screenshots. The captures carried the
// previous tenant's wordmark and a real account name in the pixels, which
// can't be rebranded for a white-label sale, and couldn't animate.

type Panel = {
  id: string
  tab: string
  nav: string
  title: string
  body: string
  render: () => React.ReactNode
}

const PANELS: Panel[] = [
  {
    id: 'pipeline',
    tab: 'Pipeline',
    nav: 'Pipeline',
    title: 'A pipeline that matches how you actually sell.',
    body: 'Drag deals through stages your team already uses. Stale leads get flagged automatically after 21 days of silence, nothing quietly goes cold.',
    render: () => <PipelineMock />,
  },
  {
    id: 'lead',
    tab: 'Lead profile',
    nav: 'Leads',
    title: "Every lead's full story, on one screen.",
    body: 'Stage progress, contact details, and a complete activity trail, calls, emails, notes, all in one place. Nothing lives in someone’s inbox or a separate spreadsheet.',
    render: () => <LeadProfileMock />,
  },
  {
    id: 'leads',
    tab: 'Leads table',
    nav: 'Leads',
    title: 'Every lead, sortable and filterable.',
    body: 'Search by company, contact, or source. Sort by value, stage, or last activity. Nothing hidden behind five clicks.',
    render: () => <LeadsMock />,
  },
  {
    id: 'whiteboard',
    tab: 'Whiteboard',
    nav: 'Whiteboard',
    title: 'Sketch a funnel. Watch your team work on it.',
    body: 'A shared whiteboard for your team, sticky notes, shapes, a funnel that reads your actual pipeline data live. Cursors and who’s editing update in real time.',
    render: () => <WhiteboardDemo />,
  },
]

const ADVANCE_MS = 7000

export function ProductDemo() {
  const [active, setActive] = useState(0)
  const [auto, setAuto] = useState(true)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!auto) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    // Only cycle while the demo is actually on screen.
    let timer: ReturnType<typeof setInterval> | null = null
    const stop = () => {
      if (timer) clearInterval(timer)
      timer = null
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !timer) {
          timer = setInterval(() => setActive((i) => (i + 1) % PANELS.length), ADVANCE_MS)
        } else if (!e.isIntersecting) {
          stop()
        }
      },
      { threshold: 0.3 },
    )
    if (rootRef.current) io.observe(rootRef.current)
    return () => {
      stop()
      io.disconnect()
    }
  }, [auto])

  const pick = (i: number) => {
    setActive(i)
    setAuto(false)
  }

  const panel = PANELS[active]

  return (
    <div ref={rootRef} className="mx-auto max-w-6xl px-6">
      <div role="tablist" aria-label="Product tour" className="flex flex-wrap gap-2">
        {PANELS.map((p, i) => (
          <button
            key={p.id}
            role="tab"
            id={`demo-tab-${p.id}`}
            aria-selected={i === active}
            aria-controls={`demo-panel-${p.id}`}
            onClick={() => pick(i)}
            className={`relative rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              i === active ? 'text-white' : 'text-white/55 hover:text-white/85'
            }`}
          >
            {i === active && (
              <motion.span
                layoutId="demo-pill"
                className="absolute inset-0 rounded-full border border-white/15 bg-white/10"
                transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              />
            )}
            <span className="relative z-10">{p.tab}</span>
          </button>
        ))}
      </div>

      <div className="mt-8 grid items-center gap-10 lg:grid-cols-[0.8fr_1.2fr]">
        <div
          role="tabpanel"
          id={`demo-panel-${panel.id}`}
          aria-labelledby={`demo-tab-${panel.id}`}
          className="min-h-[190px]"
        >
          {/* `initial={false}` so the first render (including SSR) paints the
              panel already visible, otherwise this copy is blank without JS. */}
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={panel.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            >
              <h3 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">{panel.title}</h3>
              <p className="mt-4 max-w-md leading-relaxed text-white/60">{panel.body}</p>
            </motion.div>
          </AnimatePresence>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={panel.id}
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.995 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            {panel.id === 'whiteboard' ? (
              panel.render()
            ) : (
              <AppFrame active={panel.nav}>{panel.render()}</AppFrame>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
