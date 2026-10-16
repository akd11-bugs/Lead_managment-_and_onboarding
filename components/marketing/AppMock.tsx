'use client'

import { useEffect, useRef, useState } from 'react'

// Live DOM recreations of the product surfaces, replacing the PNG captures.
// The screenshots carried the previous tenant's wordmark and a real account
// name baked into the pixels, which doesn't survive a white-label sale — and
// a still frame can't animate. These are stylised but structurally faithful,
// and every label is a prop, so rebranding is a string change.
//
// `BRAND` is the one place the product name appears.
const BRAND = 'Steadfast'

const NAV = ['Dashboard', 'Pipeline', 'Leads', 'Companies', 'Tasks', 'Whiteboard', 'Reports']

export function AppFrame({
  active,
  children,
}: {
  active: string
  children: React.ReactNode
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-[#0b0d14] shadow-2xl shadow-black/60">
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
        <span className="ml-2 font-mono text-[11px] text-white/35">
          {BRAND.toLowerCase()}.app/{active.toLowerCase()}
        </span>
      </div>
      {/* min-height rather than a fixed ratio: the panels differ in height and
          a locked 16:9 leaves a dead band under the shorter ones. */}
      <div className="flex min-h-[260px] sm:min-h-[300px]">
        <aside className="hidden w-[22%] shrink-0 border-r border-white/[0.07] p-3 sm:block">
          <div className="px-1.5 pb-3 text-[11px] font-semibold tracking-tight text-white/90">{BRAND}</div>
          <div className="space-y-0.5">
            {NAV.map((n) => (
              <div
                key={n}
                className={`truncate rounded px-1.5 py-[5px] text-[10px] ${
                  n === active ? 'bg-white/10 text-white' : 'text-white/40'
                }`}
              >
                {n}
              </div>
            ))}
          </div>
        </aside>
        <div className="min-w-0 flex-1 overflow-hidden p-3 sm:p-4">{children}</div>
      </div>
    </div>
  )
}

// Counts up when scrolled into view. A static number can't convey "your
// pipeline is moving"; this is the cheapest motion that does.
function useCountUp(target: number, live: boolean, ms = 1100) {
  // `progress` stays null until an animation frame runs, so the rendered
  // value falls back to the final number — correct before JS, under reduced
  // motion, and off screen alike.
  const [progress, setProgress] = useState<number | null>(null)

  useEffect(() => {
    if (!live) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const p = Math.min((now - start) / ms, 1)
      setProgress(p)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [live, ms])

  if (progress === null) return target
  // easeOutCubic — fast start, settles rather than stopping dead.
  return Math.round(target * (1 - Math.pow(1 - progress, 3)))
}

export function useInView<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.2 })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return { ref, inView }
}

export function DashboardMock() {
  const { ref, inView } = useInView<HTMLDivElement>()
  const pipeline = useCountUp(383000, inView)
  const leads = useCountUp(11, inView)
  const rate = useCountUp(18, inView)

  const tiles = [
    { k: 'OPEN PIPELINE', v: `₹${pipeline.toLocaleString('en-IN')}`, s: '9 open leads' },
    { k: 'TOTAL LEADS', v: String(leads), s: '2 won · 0 lost' },
    { k: 'WON THIS MONTH', v: '₹0', s: '0 deals' },
    { k: 'CONVERSION RATE', v: `${rate}%`, s: '2 / 11 won' },
  ]

  return (
    <div ref={ref} className="h-full">
      <div className="text-xs font-semibold text-white sm:text-sm">Dashboard</div>
      <div className="mt-0.5 text-[9px] text-white/40 sm:text-[10px]">
        A diagnostic surface. Alerts fire when your data asks for them.
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.k} className="rounded-md border border-white/[0.09] bg-white/[0.03] p-2">
            <div className="truncate text-[8px] tracking-wide text-white/40">{t.k}</div>
            <div className="mt-1 text-sm font-semibold tabular-nums text-white sm:text-base">{t.v}</div>
            <div className="mt-0.5 truncate text-[8px] text-white/35">{t.s}</div>
          </div>
        ))}
      </div>
      <div className="mt-2.5 rounded-md border border-white/[0.09] bg-white/[0.03] p-2.5">
        <div className="text-[10px] font-medium text-white/85">Getting started</div>
        {['Add your first real lead', 'Invite a teammate', 'Connect a Google Sheet'].map((s, i) => (
          <div key={s} className="mt-1.5 flex items-center gap-1.5 text-[9px] text-white/45">
            <span
              className={`grid h-2.5 w-2.5 place-items-center rounded-full border text-[6px] ${
                i === 0 ? 'border-[#2ecc9b] text-[#2ecc9b]' : 'border-white/25 text-transparent'
              }`}
            >
              ✓
            </span>
            <span className={i === 0 ? 'text-white/55 line-through' : ''}>{s}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const DEALS = [
  { co: 'Northwind Traders', amt: '₹92,000', stage: 'Pending', tone: 'amber' },
  { co: 'Cedarline Supply', amt: '₹64,000', stage: 'Proposal', tone: 'blue' },
  { co: 'Downbeat Organics', amt: '₹58,000', stage: 'New', tone: 'slate' },
  { co: 'Ardent Studio', amt: '₹1,12,000', stage: 'Onboarding', tone: 'green' },
  { co: 'TechFlow Solutions', amt: '₹43,000', stage: 'Pending', tone: 'amber' },
  { co: 'Lumen Retail Co', amt: '₹77,000', stage: 'Proposal', tone: 'blue' },
]

const TONE: Record<string, string> = {
  amber: 'bg-[#f0a44a]/15 text-[#f0a44a]',
  blue: 'bg-[#5b8cff]/15 text-[#5b8cff]',
  green: 'bg-[#2ecc9b]/15 text-[#2ecc9b]',
  slate: 'bg-white/10 text-white/55',
}

const COLUMNS = [
  { key: 'New', items: [DEALS[2]] },
  { key: 'Pending', items: [DEALS[0], DEALS[4]] },
  { key: 'Proposal', items: [DEALS[1], DEALS[5]] },
  { key: 'Onboarding', items: [DEALS[3]] },
]

// One card lifts and settles into the next column on a loop — the board's
// whole point is that deals move, which a static mock never shows.
export function PipelineMock() {
  const { ref, inView } = useInView<HTMLDivElement>()
  const [moved, setMoved] = useState(false)

  useEffect(() => {
    if (!inView) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = setInterval(() => setMoved((m) => !m), 2600)
    return () => clearInterval(id)
  }, [inView])

  return (
    <div ref={ref} className="h-full">
      <div className="text-xs font-semibold text-white sm:text-sm">Pipeline</div>
      <div className="mt-0.5 text-[9px] text-white/40 sm:text-[10px]">
        Drag a lead between columns to change its stage.
      </div>
      <div className="mt-3 grid grid-cols-4 gap-1.5">
        {COLUMNS.map((col, ci) => (
          <div key={col.key} className="min-w-0">
            <div className="mb-1.5 flex items-center justify-between px-0.5">
              <span className="truncate text-[9px] text-white/45">{col.key}</span>
              <span className="text-[9px] text-white/25">{col.items.length}</span>
            </div>
            <div className="space-y-1.5">
              {col.items.map((d) => {
                // The travelling card: hops from Pending to Proposal.
                const travels = d.co === 'Northwind Traders'
                const hop = travels && moved && ci === 1
                return (
                  <div
                    key={d.co}
                    className="rounded border border-white/[0.09] bg-white/[0.04] p-1.5"
                    style={
                      travels
                        ? {
                            transform: hop ? 'translate(105%, 0) rotate(2deg)' : 'none',
                            boxShadow: hop ? '0 8px 18px rgba(0,0,0,0.45)' : 'none',
                            transition: 'transform 900ms cubic-bezier(0.22,1,0.36,1), box-shadow 900ms',
                          }
                        : undefined
                    }
                  >
                    <div className="truncate text-[9px] font-medium text-white/85">{d.co}</div>
                    <div className="mt-1 flex items-center justify-between gap-1">
                      <span className="text-[8px] tabular-nums text-white/45">{d.amt}</span>
                      <span className={`rounded px-1 py-[1px] text-[7px] ${TONE[d.tone]}`}>{d.stage}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function LeadsMock() {
  const { ref, inView } = useInView<HTMLDivElement>()
  return (
    <div ref={ref} className="h-full">
      <div className="text-xs font-semibold text-white sm:text-sm">Leads</div>
      <div className="mt-0.5 text-[9px] text-white/40 sm:text-[10px]">Search, sort and filter every lead.</div>
      <div className="mt-2.5 rounded-md border border-white/[0.09] bg-white/[0.02] px-2 py-1 text-[9px] text-white/30">
        Search leads, companies, POCs…
      </div>
      <div className="mt-2 overflow-hidden rounded-md border border-white/[0.09]">
        <div className="grid grid-cols-[1.6fr_1fr_0.9fr] gap-2 border-b border-white/[0.09] bg-white/[0.03] px-2 py-1.5 text-[8px] tracking-wide text-white/40">
          <span>COMPANY</span>
          <span>VALUE</span>
          <span>STAGE</span>
        </div>
        {DEALS.map((d, i) => (
          <div
            key={d.co}
            className="grid grid-cols-[1.6fr_1fr_0.9fr] items-center gap-2 border-b border-white/[0.06] px-2 py-[7px] last:border-0"
            style={{
              opacity: inView ? 1 : 0,
              transform: inView ? 'none' : 'translateY(6px)',
              transition: `opacity 420ms ease ${i * 70}ms, transform 420ms ease ${i * 70}ms`,
            }}
          >
            <span className="truncate text-[9px] text-white/80">{d.co}</span>
            <span className="text-[9px] tabular-nums text-white/50">{d.amt}</span>
            <span className={`w-fit rounded px-1 py-[1px] text-[7px] ${TONE[d.tone]}`}>{d.stage}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function LeadProfileMock() {
  const { ref, inView } = useInView<HTMLDivElement>()
  const stages = ['New', 'Pending', 'Proposal', 'Onboarding']
  const reached = 2
  return (
    <div ref={ref} className="h-full">
      <div className="text-xs font-semibold text-white sm:text-sm">Ardent Studio</div>
      <div className="mt-0.5 text-[9px] text-white/40 sm:text-[10px]">POC: Meera Raghavan · Referral</div>

      <div className="mt-3 flex items-center gap-1">
        {stages.map((s, i) => (
          <div key={s} className="flex min-w-0 flex-1 items-center gap-1">
            <div className="min-w-0 flex-1">
              <div className="h-1 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-[#5b8cff]"
                  style={{
                    width: inView && i <= reached ? '100%' : '0%',
                    transition: `width 600ms cubic-bezier(0.16,1,0.3,1) ${i * 180}ms`,
                  }}
                />
              </div>
              <div className="mt-1 truncate text-[8px] text-white/40">{s}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 text-[9px] font-medium text-white/70">Activity</div>
      <div className="mt-1.5 space-y-1.5">
        {[
          { t: 'Call logged, asked for revised quote', d: '2d ago' },
          { t: 'Proposal sent (PDF)', d: '4d ago' },
          { t: 'Email reply, budget approved', d: '6d ago' },
        ].map((a, i) => (
          <div
            key={a.t}
            className="flex items-start gap-1.5"
            style={{
              opacity: inView ? 1 : 0,
              transform: inView ? 'none' : 'translateX(-6px)',
              transition: `opacity 420ms ease ${220 + i * 110}ms, transform 420ms ease ${220 + i * 110}ms`,
            }}
          >
            <span className="mt-[5px] h-1 w-1 shrink-0 rounded-full bg-[#5b8cff]" />
            <span className="min-w-0 flex-1 truncate text-[9px] text-white/55">{a.t}</span>
            <span className="shrink-0 text-[8px] text-white/25">{a.d}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
