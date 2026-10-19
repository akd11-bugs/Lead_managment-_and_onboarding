'use client'

import { useEffect, useRef, useState } from 'react'
import { SURFACES } from './RealAppShowcase'

// Attio-style pinned product tour, built on GSAP ScrollTrigger. Each
// surface is its OWN pinned block, stacked in normal document flow — not a
// shared fixed-height stage every panel has to be cropped or shrunk to fit.
// A block's content renders at its real, natural height (no compact mode,
// no hardcoded chart height); scrolling through that block's own extra
// height keeps its content pinned on screen until the block's true end is
// reached, then it releases into the next block. A tall block (the full
// dashboard: alert banner, 4 KPI tiles, chart, activity feed) naturally
// gets more scroll distance than a short one (the lead summary) because
// each block's scroll budget comes from measuring its own content.
//
// The page's StickyCta ("Still on a spreadsheet?") bar stays — it is NOT
// removed — and its real rendered height is reserved as bottom margin in
// every block's available-height math, with a small buffer on top, so
// content never sits behind it. Reserved unconditionally (not only when
// currently shown), since the bar can toggle visible while a block is
// mid-scroll.
//
// All 4 triggers are built together, ONCE, from a single coordinating
// effect — not 4 independent self-rebuilding ScrollTriggers each watching
// its own ResizeObserver. That per-block version had a real, reproducible
// bug: GSAP's own pin can itself alter the pinned content's measured
// layout, which can retrigger that same block's ResizeObserver, which
// killed and recreated ITS trigger while scroll was actively between its
// start/end — with 4 of these running independently and no shared
// ScrollTrigger.refresh() afterward, two triggers could end up with
// inconsistent pin state at once, rendering two panels' content stacked on
// top of each other (confirmed via screenshots: "Every lead's full story"
// and "Stages that match how you sell" both visible, overlapping, at the
// same position). Building all 4 from one measurement pass, with a single
// debounced rebuild-everything-then-refresh on resize, removes that race.
//
// The rail's active index is read from each trigger's `isActive` on every
// onUpdate (same cadence as the pin), not GSAP's discrete onEnter/
// onEnterBack events — those only fire once per threshold crossing, which
// visibly lagged the rail behind the actual pinned content during fast
// scrolling.
//
// ScrollTrigger is told about Lenis (the page's smooth-scroll) in
// SmoothScroll.tsx — required so the two don't fight over scroll position.

const NAV_HEIGHT = 80
// Small deliberate buffer on top of StickyCta's real measured height (the
// user's own "h+1 or h+2" instruction) — content should never sit flush
// against the bar.
const STICKY_CTA_BUFFER = 20

function getStickyCtaHeight(): number {
  const el = document.querySelector('.fixed.inset-x-0.bottom-0')
  return el ? el.getBoundingClientRect().height : 0
}

export function HorizontalTour() {
  const [active, setActive] = useState(0)
  const wrapperRefs = useRef<(HTMLDivElement | null)[]>([])
  const contentRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let cancelled = false
    let triggers: { kill: () => void }[] = []
    let rebuildTimer: ReturnType<typeof setTimeout> | null = null

    Promise.all([import('gsap'), import('gsap/ScrollTrigger')]).then(([{ default: gsap }, { ScrollTrigger }]) => {
      if (cancelled) return
      gsap.registerPlugin(ScrollTrigger)

      function buildAll() {
        triggers.forEach((t) => t.kill())
        triggers = []

        const slot = window.innerHeight - NAV_HEIGHT - getStickyCtaHeight() - STICKY_CTA_BUFFER

        SURFACES.forEach((_, i) => {
          const wrapper = wrapperRefs.current[i]
          const content = contentRefs.current[i]
          if (!wrapper || !content) return

          // Extra scroll room so the content's own full height has time to
          // scroll by while pinned, plus a fixed release buffer so the
          // handoff to the next block doesn't feel instant even for a
          // short panel already shorter than one viewport slot.
          const extra = Math.max(content.offsetHeight - slot, 0) + 200
          const trigger = ScrollTrigger.create({
            trigger: wrapper,
            start: `top ${NAV_HEIGHT}px`,
            end: `+=${extra}`,
            pin: content,
            pinSpacing: true,
            onUpdate: (self) => {
              if (self.isActive) setActive(i)
            },
          })
          triggers.push(trigger)
        })

        ScrollTrigger.refresh()
      }

      buildAll()

      // One shared, debounced rebuild — a real window resize (or content
      // height genuinely settling after fonts/images load) is the only
      // thing that should trigger this, not each block reacting to its own
      // pin's side effects on its own layout.
      function scheduleRebuild() {
        if (rebuildTimer) clearTimeout(rebuildTimer)
        rebuildTimer = setTimeout(buildAll, 200)
      }

      const ro = new ResizeObserver(scheduleRebuild)
      contentRefs.current.forEach((el) => el && ro.observe(el))
      window.addEventListener('resize', scheduleRebuild)

      return () => {
        ro.disconnect()
        window.removeEventListener('resize', scheduleRebuild)
        if (rebuildTimer) clearTimeout(rebuildTimer)
      }
    })

    return () => {
      cancelled = true
      triggers.forEach((t) => t.kill())
    }
  }, [])

  function goTo(i: number) {
    const el = wrapperRefs.current[i]
    if (!el) return
    const top = el.getBoundingClientRect().top + window.scrollY - NAV_HEIGHT
    window.scrollTo({ top, behavior: 'smooth' })
  }

  return (
    <div className="mx-auto max-w-7xl px-6">
      {/* A single bordered panel, not floating cards in empty page space —
          rail and content both sit flush inside it with a hairline divider
          between them (border-r on the rail column), matching the Full-
          Bleed Hairline Rule the rest of the page already follows
          (DESIGN.md) and the Attio reference's own partitioned layout: no
          dead margin around a centered card, the panel itself IS the
          structure. No rounded corners / overflow-hidden here: clipping to
          a radius needs overflow-hidden on this wrapper, which silently
          breaks position:sticky for the rail nested inside it — same root
          cause already found and fixed once this session in KineticGrid's
          wrapper, since overflow other than visible changes which ancestor
          becomes the sticky containing block. Square corners read fine
          here anyway — it's a full-bleed grid panel, not a floating card,
          and every other full-bleed hairline on this page (Section's own
          border-t) is also unrounded. */}
      <div className="grid border border-white/[0.09] lg:grid-cols-[240px_1fr]">
        {/* Label rail — every surface name always visible, sticky for the
            whole tour, fill line tracks which panel is actually pinned. */}
        <div className="hidden border-white/[0.07] bg-white/[0.02] lg:block lg:border-r">
          <div className="sticky px-6 py-8" style={{ top: NAV_HEIGHT }}>
            <div className="relative">
              <div className="absolute bottom-2 left-0 top-2 w-px bg-white/10" aria-hidden="true">
                <div
                  className="w-px bg-[#5b8cff] transition-[height] duration-300 ease-out"
                  style={{ height: `${(active / Math.max(SURFACES.length - 1, 1)) * 100}%` }}
                />
              </div>
              <div className="divide-y divide-white/[0.07]">
                {SURFACES.map((s, i) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => goTo(i)}
                    className={`-ml-px block w-full border-l-2 py-3 pl-5 text-left text-sm transition-colors duration-300 ${
                      i === active ? 'border-[#5b8cff] font-medium text-white' : 'border-transparent text-white/40 hover:text-white/70'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* One pinned block per surface, stacked in normal flow, each full-
            bleed within the content column (no card border/radius of its
            own — the outer panel already draws that edge) and separated by
            a hairline rather than a gap, so there's no empty strip between
            one panel's end and the next one's start. */}
        <div className="divide-y divide-white/[0.07]">
          {SURFACES.map((s, i) => (
            <div
              key={s.id}
              ref={(el) => {
                wrapperRefs.current[i] = el
              }}
              className="relative"
            >
              <div
                ref={(el) => {
                  contentRefs.current[i] = el
                }}
                className="bg-[#07080c] px-6 py-8 sm:px-10 sm:py-10"
              >
                <span className="mb-3 block font-mono text-xs uppercase tracking-[0.18em] text-[#5b8cff] lg:hidden">
                  {s.label}
                </span>
                <h3 className="mb-6 text-2xl font-semibold tracking-tight sm:text-3xl">{s.title}</h3>
                {s.render()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
