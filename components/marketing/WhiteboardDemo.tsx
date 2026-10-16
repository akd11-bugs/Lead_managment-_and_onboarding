'use client'

import { useEffect, useRef, useState } from 'react'

// Animated recreation of the collaborative whiteboard, rendered as live DOM
// rather than a screenshot. Two reasons: the product screenshots carry the
// previous tenant's branding and a real account name (this is sold white
// label), and a still image can't show the one thing the feature is actually
// about — other people's cursors moving while you work.
//
// Everything is CSS transforms on a handful of nodes, no canvas and no
// library. The cursors follow fixed elliptical paths, so there's no physics
// to tick and no per-frame layout.

type Stage = { key: string; label: string; count: number; value: string; done?: boolean }

const STAGES: Stage[] = [
  { key: 'new', label: 'NEW', count: 4, value: '₹96,000 value' },
  { key: 'pending', label: 'PENDING', count: 3, value: '₹1.3L value' },
  { key: 'proposal', label: 'PROPOSAL', count: 2, value: '₹1.6L value' },
  { key: 'onboarding', label: 'ONBOARDING', count: 2, value: '₹1.8L value', done: true },
]

// Each collaborator orbits its own ellipse at its own rate, offset so they
// never bunch up. Percentages keep the paths responsive.
const PEERS = [
  { name: 'Priya', color: '#5b8cff', cx: 34, cy: 46, rx: 20, ry: 16, period: 17, phase: 0 },
  { name: 'Arjun', color: '#2ecc9b', cx: 66, cy: 52, rx: 17, ry: 13, period: 23, phase: 2.1 },
  { name: 'Sam', color: '#f0a44a', cx: 50, cy: 40, rx: 26, ry: 10, period: 29, phase: 4.3 },
]

export function WhiteboardDemo() {
  const ref = useRef<HTMLDivElement>(null)
  const [live, setLive] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    // Only animate while on screen — this sits well below the fold.
    const io = new IntersectionObserver(([e]) => setLive(e.isIntersecting), { threshold: 0.2 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] shadow-2xl shadow-black/60"
    >
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
        <span className="ml-2 font-mono text-[11px] text-white/35">steadfast.app/whiteboard</span>
      </div>

      <div className="flex items-center gap-1.5 border-b border-white/10 px-4 py-2 text-[11px] text-white/45">
        {['Select', 'Pan', 'Note', 'Box', 'Circle', 'Arrow'].map((t, i) => (
          <span
            key={t}
            className={`rounded px-2 py-1 ${i === 0 ? 'bg-white/10 text-white/80' : ''}`}
          >
            {t}
          </span>
        ))}
        <span className="ml-auto flex -space-x-1.5">
          {PEERS.map((p) => (
            <span
              key={p.name}
              title={p.name}
              className="grid h-5 w-5 place-items-center rounded-full border border-[#0b0d14] text-[9px] font-semibold text-[#07080c]"
              style={{ background: p.color }}
            >
              {p.name[0]}
            </span>
          ))}
        </span>
      </div>

      {/* Dotted board. aspect-ratio keeps the cursor paths proportional. */}
      <div
        className="relative aspect-[16/9] w-full"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.09) 1px, transparent 1px)',
          backgroundSize: '22px 22px',
        }}
      >
        <div className="absolute inset-0 flex items-center justify-center gap-[2.5%] px-[5%]">
          {STAGES.map((s, i) => (
            <div key={s.key} className="flex items-center gap-[2.5%]">
              <div
                className={`rounded-lg border px-[4%] py-[3%] text-center ${
                  s.done ? 'border-[#2ecc9b]/40 bg-[#2ecc9b]/[0.07]' : 'border-white/12 bg-white/[0.04]'
                }`}
                style={{ minWidth: '19%' }}
              >
                <div className="text-[9px] tracking-[0.12em] text-white/45 sm:text-[10px]">{s.label}</div>
                <div
                  className={`mt-1 text-xl font-semibold sm:text-2xl ${s.done ? 'text-[#2ecc9b]' : 'text-white'}`}
                >
                  {s.count}
                </div>
                <div className="mt-0.5 text-[9px] text-white/40 sm:text-[10px]">{s.value}</div>
              </div>
              {i < STAGES.length - 1 && (
                <svg width="28" height="8" viewBox="0 0 28 8" aria-hidden="true" className="shrink-0 opacity-40">
                  <path d="M0 4h20M20 4l-4-3M20 4l-4 3" stroke="white" strokeWidth="1" fill="none" />
                </svg>
              )}
            </div>
          ))}
        </div>

        {PEERS.map((p) => (
          <Cursor key={p.name} peer={p} live={live} />
        ))}
      </div>

      <div className="border-t border-white/10 px-4 py-2 text-[11px] text-white/35">
        Shared with your whole org, cursors and who&apos;s editing update live.
      </div>
    </div>
  )
}

function Cursor({ peer, live }: { peer: (typeof PEERS)[number]; live: boolean }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el || !live) return
    let raf = 0
    const start = performance.now()

    const tick = (now: number) => {
      const t = (now - start) / 1000
      const a = peer.phase + (t / peer.period) * Math.PI * 2
      const x = peer.cx + Math.cos(a) * peer.rx
      const y = peer.cy + Math.sin(a) * peer.ry
      el.style.left = `${x}%`
      el.style.top = `${y}%`
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [live, peer])

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none absolute transition-opacity duration-500"
      style={{
        left: `${peer.cx + peer.rx}%`,
        top: `${peer.cy}%`,
        opacity: live ? 1 : 0,
        // Transform-only movement: never triggers layout.
        willChange: 'left, top',
      }}
    >
      <svg width="16" height="18" viewBox="0 0 16 18" fill="none" className="drop-shadow">
        <path d="M1 1l5.5 15 2.2-6.3 6.3-2.2z" fill={peer.color} stroke="#07080c" strokeWidth="1.2" />
      </svg>
      <span
        className="ml-3 inline-block -translate-y-1 rounded px-1.5 py-0.5 text-[10px] font-medium text-[#07080c]"
        style={{ background: peer.color }}
      >
        {peer.name}
      </span>
    </div>
  )
}
