'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { BRAND_NAME } from '@/lib/branding'

// Appears once the hero is gone and hides again at the footer CTA, so the
// page never shows two competing calls to action at once.
//
// Starts hidden and is revealed by scroll, which is safe here (unlike the
// copy reveals) because this is pure chrome: if JS never runs, the visitor
// simply gets the nav and footer CTAs they already had.

export function StickyCta() {
  const [show, setShow] = useState(false)
  const frame = useRef(0)

  useEffect(() => {
    const onScroll = () => {
      cancelAnimationFrame(frame.current)
      frame.current = requestAnimationFrame(() => {
        const y = window.scrollY
        const doc = document.documentElement
        const nearEnd = y + window.innerHeight > doc.scrollHeight - 900
        setShow(y > window.innerHeight * 0.9 && !nearEnd)
      })
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(frame.current)
    }
  }, [])

  return (
    <div
      aria-hidden={!show}
      className={`fixed inset-x-0 bottom-0 z-40 transition-all duration-300 ${
        show ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0'
      }`}
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="mx-auto mb-4 flex max-w-3xl flex-wrap items-center justify-between gap-3 rounded-full border border-white/12 bg-[#0b0d14]/92 px-5 py-3 shadow-2xl shadow-black/50 backdrop-blur-xl sm:mx-auto sm:px-6">
        <p className="min-w-0 text-sm text-white/70">
          <span className="font-medium text-white">Still on a spreadsheet?</span>{' '}
          <span className="hidden sm:inline">Bring it across in a paste.</span>
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/login"
            className="hidden rounded-full px-3 py-2 text-sm text-white/60 transition-colors hover:text-white sm:block"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="rounded-full bg-white px-4 py-2 text-sm font-medium text-[#07080c] transition-transform hover:scale-[1.03] active:scale-[0.98]"
          >
            Start free
            <span className="sr-only"> with {BRAND_NAME}</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
