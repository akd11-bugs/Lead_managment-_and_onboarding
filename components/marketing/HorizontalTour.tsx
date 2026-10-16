'use client'

import { useEffect, useRef, useState } from 'react'
import { SURFACES } from './RealAppShowcase'

// Horizontal product tour: the section pins while the page scrolls, and the
// surfaces slide sideways. No tabs to click.
//
// Only above `lg`. On a phone this pattern fights native touch scrolling and
// is a reliable source of jank, so narrow viewports get the same surfaces
// stacked vertically instead. That is a deliberate downgrade, not a fallback
// that happens to work.

export function HorizontalTour() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const [progress, setProgress] = useState(0)
  const [enabled, setEnabled] = useState(false)
  const frame = useRef(0)

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')
    const decide = () => setEnabled(mq.matches && !reduce.matches)
    decide()
    mq.addEventListener('change', decide)
    reduce.addEventListener('change', decide)
    return () => {
      mq.removeEventListener('change', decide)
      reduce.removeEventListener('change', decide)
    }
  }, [])

  useEffect(() => {
    if (!enabled) return
    const el = sectionRef.current
    if (!el) return

    const onScroll = () => {
      cancelAnimationFrame(frame.current)
      frame.current = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect()
        // Scrollable distance is the section height minus one viewport: that
        // is exactly how far the sticky child travels.
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

  // Stacked, non-pinned version: phones, and anyone on reduced motion.
  if (!enabled) {
    return (
      <div className="mx-auto max-w-6xl space-y-16 px-6">
        {SURFACES.map(s => (
          <div key={s.id}>
            <h3 className="mb-5 text-2xl font-semibold tracking-tight">{s.title}</h3>
            {s.render()}
          </div>
        ))}
      </div>
    )
  }

  const n = SURFACES.length
  // Which surface is centred right now, for the caption and the progress dots.
  const index = Math.min(n - 1, Math.round(progress * (n - 1)))

  return (
    <div ref={sectionRef} style={{ height: `${n * 100}vh` }}>
      <div className="sticky top-0 flex h-screen flex-col justify-center overflow-hidden">
        <div className="mx-auto w-full max-w-6xl px-6">
          <h3 className="mb-6 h-9 text-2xl font-semibold tracking-tight transition-opacity duration-300">
            {SURFACES[index].title}
          </h3>
        </div>

        <div
          className="flex will-change-transform"
          style={{
            // Travel one full track width minus one panel, so the last panel
            // lands centred rather than scrolled past.
            transform: `translate3d(${-progress * (n - 1) * 100}vw, 0, 0)`,
            transition: 'transform 120ms linear',
          }}
        >
          {SURFACES.map(s => (
            <div key={s.id} className="w-screen shrink-0 px-6">
              <div className="mx-auto max-w-5xl">{s.render()}</div>
            </div>
          ))}
        </div>

        <div className="mx-auto mt-8 flex max-w-6xl gap-1.5 px-6">
          {SURFACES.map((s, i) => (
            <span
              key={s.id}
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
