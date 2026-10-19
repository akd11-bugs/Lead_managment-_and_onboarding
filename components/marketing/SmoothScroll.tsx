'use client'

import { useEffect } from 'react'
import type Lenis from 'lenis'

// Lenis smooth scroll, scoped to the marketing page only, wired into GSAP's
// ScrollTrigger (used by HorizontalTour's pinned tour section).
//
// This is the single biggest contributor to the "expensive" feel of sites
// like neutomni.com — their lerp values (0.07 desktop / 0.3 mobile) are
// mirrored here.
//
// ScrollTrigger and Lenis both think they own "scroll position" — without
// wiring them together, ScrollTrigger reads native window.scrollY on its
// own ticker while Lenis is smoothing the visually-rendered position
// somewhere else, so pins jitter and desync from what's on screen. The fix
// (GSAP's documented Lenis integration): Lenis's own 'scroll' event tells
// ScrollTrigger to re-check its triggers, and GSAP's ticker (not a separate
// rAF loop) drives Lenis's raf — one clock for both.
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

    let lenis: Lenis | null = null
    let cancelled = false
    let tickerFn: ((time: number) => void) | null = null

    // Dynamically imported so Lenis/GSAP never land in the shared app
    // bundle — every authenticated page would otherwise pay for them.
    Promise.all([import('lenis'), import('gsap'), import('gsap/ScrollTrigger')])
      .then(([{ default: LenisCtor }, { default: gsap }, { ScrollTrigger }]) => {
        if (cancelled) return
        gsap.registerPlugin(ScrollTrigger)

        const isMobile = window.matchMedia('(max-width: 768px)').matches
        lenis = new LenisCtor({ lerp: isMobile ? 0.3 : 0.07 })

        lenis.on('scroll', ScrollTrigger.update)

        tickerFn = (time: number) => {
          // GSAP's ticker time is in seconds; Lenis wants milliseconds.
          lenis?.raf(time * 1000)
        }
        gsap.ticker.add(tickerFn)
        gsap.ticker.lagSmoothing(0)
      })
      .catch(() => {
        // Smooth scroll is an enhancement; native scrolling is the fallback.
      })

    return () => {
      cancelled = true
      if (tickerFn) {
        import('gsap').then(({ default: gsap }) => gsap.ticker.remove(tickerFn!))
      }
      lenis?.destroy()
    }
  }, [])

  return null
}
