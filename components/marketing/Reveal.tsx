'use client'

import { useEffect, useRef, useState } from 'react'

// Reveal wrappers for the marketing page.
//
// Deliberately NOT motion's `initial={{opacity:0}}`: that renders opacity:0
// into the server HTML, so if JS is blocked, slow, or disabled the marketing
// copy is permanently invisible. Here the server always emits visible markup.
// Scroll reveals hide only after the client confirms the element is still
// off-screen; the above-the-fold variant animates purely in CSS, so it never
// depends on a state update landing at all.

export function Reveal({
  children,
  delay = 0,
  y = 24,
  className,
  force,
}: {
  children: React.ReactNode
  delay?: number
  y?: number
  className?: string
  /** Skip the "already on screen, don't bother animating" bailout — still
   * waits for its own IntersectionObserver to fire, just never short-
   * circuits because the element happened to already be laid out in the
   * viewport at mount time. For a Reveal nested inside another Reveal's
   * cascade (e.g. a KPI tile inside a dashboard panel): a child's bounding
   * rect reads as "on screen" the instant its parent is mounted — the
   * parent occupies that layout space immediately, opacity aside — so
   * without `force` every nested Reveal bails out and the whole cascade
   * renders at opacity:1 from first paint, with no stagger at all. */
  force?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    // Already on screen — leave it alone rather than hiding it to fade it in.
    if (!force && el.getBoundingClientRect().top < window.innerHeight - 80) return

    setHidden(true)
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setHidden(false)
          io.disconnect()
        }
      },
      { rootMargin: '-80px' },
    )
    io.observe(el)
    // Safety net: if the observer never fires, reveal anyway.
    const t = setTimeout(() => setHidden(false), 2000)
    return () => {
      io.disconnect()
      clearTimeout(t)
    }
  }, [force])

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: hidden ? 0 : 1,
        transform: hidden ? `translateY(${y}px)` : 'none',
        transition: `opacity 600ms cubic-bezier(0.16,1,0.3,1) ${delay}s, transform 600ms cubic-bezier(0.16,1,0.3,1) ${delay}s`,
      }}
    >
      {children}
    </div>
  )
}

// Above-the-fold variant: a pure CSS entrance animation. No state, no effect,
// no observer — the keyframe starts hidden and ends visible, so the final
// painted state is correct even if JS never runs past hydration.
export function RevealOnMount({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode
  delay?: number
  className?: string
}) {
  return (
    <div className={className} style={{ animationDelay: `${delay}s` }} data-reveal-mount>
      {children}
    </div>
  )
}
