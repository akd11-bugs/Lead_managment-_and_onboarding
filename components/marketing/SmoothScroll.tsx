'use client'

import { useEffect } from 'react'

// Lenis smooth scroll, scoped to the marketing page only.
//
// This is the single biggest contributor to the "expensive" feel of sites
// like neutomni.com — their lerp values (0.07 desktop / 0.3 mobile) are
// mirrored here. Lenis is MIT with zero dependencies; the heavier GSAP +
// ScrollTrigger stack those sites also run is deliberately not used, since
// motion already covers the reveals.
//
// Deliberately NOT applied app-wide: hijacking scroll inside a CRM makes
// long tables and the kanban board feel laggy and breaks scroll-into-view
// behaviour. Marketing page only, mounted by LandingPage.
export function SmoothScroll() {
  useEffect(() => {
    // Respect the OS setting: smooth scroll is exactly the kind of motion
    // people disable it for, and Lenis would otherwise override native
    // scrolling entirely.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let lenis: { raf: (t: number) => void; destroy: () => void } | null = null
    let raf = 0
    let cancelled = false

    // Dynamically imported so Lenis never lands in the shared app bundle —
    // every authenticated page would otherwise pay for it.
    import('lenis')
      .then(({ default: Lenis }) => {
        if (cancelled) return
        const isMobile = window.matchMedia('(max-width: 768px)').matches
        lenis = new Lenis({ lerp: isMobile ? 0.3 : 0.07 })

        const loop = (time: number) => {
          lenis?.raf(time)
          raf = requestAnimationFrame(loop)
        }
        raf = requestAnimationFrame(loop)
      })
      .catch(() => {
        // Smooth scroll is an enhancement; native scrolling is the fallback.
      })

    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      lenis?.destroy()
    }
  }, [])

  return null
}
