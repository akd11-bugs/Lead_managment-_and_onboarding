'use client'

import { useEffect, useRef, useState } from 'react'

// The agent/MCP pitch. This is the capability no competitor at this price
// has, and it was entirely absent from the page: the hero sells "free AI in
// your browser", which is a COST story, while this is a CAPABILITY story.
//
// The transcript below mirrors the real tool surface in lib/mcp/tools.ts —
// the tool names, the stage move and the activity log are the actual calls an
// agent makes, not invented ones. If those tools change, change this too.

type Line =
  | { kind: 'prompt'; text: string }
  | { kind: 'tool'; text: string }
  | { kind: 'ok'; text: string }
  | { kind: 'reply'; text: string }

const SCRIPT: Line[] = [
  { kind: 'prompt', text: 'Ardent Studio just signed. Move them to Won and log the call.' },
  { kind: 'tool', text: 'search_leads  query: "Ardent Studio"' },
  { kind: 'ok', text: '1 match, Ardent Studio · stage: proposal' },
  { kind: 'tool', text: 'move_lead_stage  stage: "won"' },
  { kind: 'ok', text: 'proposal → won' },
  { kind: 'tool', text: 'log_activity  type: "call"' },
  { kind: 'ok', text: 'activity logged' },
  { kind: 'reply', text: 'Done. Ardent Studio is Won and the call is on the timeline.' },
]

// Typing cadence. Prompt lines type character by character; results appear
// whole, the way a real tool result does.
const CHAR_MS = 22
const LINE_PAUSE = 520

// Server-renders the COMPLETED transcript, then animates from the start only
// once the client is running and the element is on screen. If JS never runs
// the visitor still reads the whole exchange, which is the actual pitch —
// an empty terminal frame would sell nothing.
function useTranscript(active: boolean) {
  const [shown, setShown] = useState(SCRIPT.length)
  const [typed, setTyped] = useState(SCRIPT[SCRIPT.length - 1].text)

  useEffect(() => {
    if (!active) return
    // Under reduced motion we simply leave the server-rendered completed
    // transcript in place — no rewind, no animation, nothing to set.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let cancelled = false
    let timer: ReturnType<typeof setTimeout>

    // Rewind to the start and play it out. Deferred a frame so the state
    // change belongs to the timer chain rather than the effect body.
    timer = setTimeout(() => {
      if (cancelled) return
      setShown(0)
      setTyped('')
      run(0)
    }, 0)

    const run = (i: number) => {
      if (cancelled || i >= SCRIPT.length) return
      const line = SCRIPT[i]
      const instant = line.kind === 'ok'

      if (instant) {
        setShown(i + 1)
        setTyped(line.text)
        timer = setTimeout(() => run(i + 1), LINE_PAUSE)
        return
      }

      let c = 0
      const tick = () => {
        if (cancelled) return
        c += 1
        setShown(i + 1)
        setTyped(line.text.slice(0, c))
        if (c < line.text.length) timer = setTimeout(tick, CHAR_MS)
        else timer = setTimeout(() => run(i + 1), LINE_PAUSE)
      }
      tick()
    }

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [active])

  return { shown, typed }
}

export function AgentTerminal() {
  const ref = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(false)
  const { shown, typed } = useTranscript(active)

  // Only run the transcript once it is actually on screen, so the animation
  // isn't already finished by the time the visitor scrolls to it.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setActive(true)
          io.disconnect()
        }
      },
      { threshold: 0.35 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    // No static border/shadow on this resting panel (house-style rule) —
    // a flat fill against the dark page is still a clear surface. The
    // transcript body below stays monospace: it's a real terminal
    // simulation, the one case the house style itself carves out
    // ("real code... monospace is correct there").
    <div ref={ref} className="overflow-hidden rounded-xl bg-[#0b0d14]">
      <div className="flex items-center gap-2 border-b border-white/[0.07] px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
        <span className="ml-2 font-mono text-[11px] text-white/35">your CRM</span>
      </div>

      <div className="space-y-2.5 p-5 font-mono text-[12px] leading-relaxed [overflow-wrap:anywhere] sm:p-6 sm:text-[13px]">
        {SCRIPT.slice(0, shown).map((line, i) => {
          const isLast = i === shown - 1
          const text = isLast ? typed : line.text
          if (!text) return null

          if (line.kind === 'prompt') {
            return (
              <p key={i} className="text-white/85">
                <span className="mr-2 select-none text-[#5b8cff]">›</span>
                {text}
                {isLast && <Caret />}
              </p>
            )
          }
          if (line.kind === 'tool') {
            return (
              <p key={i} className="text-white/45">
                {text}
                {isLast && <Caret />}
              </p>
            )
          }
          if (line.kind === 'ok') {
            return (
              <p key={i} className="text-[#2ecc9b]">
                {text}
              </p>
            )
          }
          return (
            <p key={i} className="pt-1 text-white">
              {text}
              {isLast && <Caret />}
            </p>
          )
        })}
      </div>
    </div>
  )
}

function Caret() {
  return <span className="ml-0.5 inline-block w-[7px] animate-pulse bg-white/70 align-middle">&nbsp;</span>
}
