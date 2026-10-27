'use client'

import { useRef } from 'react'
import { motion, useScroll, useTransform, type MotionValue } from 'motion/react'

// Word-by-word scroll reveal: the paragraph dims to near-invisible and each
// word lights up as it passes through the viewport. Built on motion's
// useScroll rather than GSAP/ScrollTrigger — motion is already a dependency
// and MIT-licensed, so a second animation library would add weight and a
// licensing question for anyone this product is sold to.
//
// Each word gets its own slice of the scroll range, so the reveal reads
// left-to-right as you scroll rather than fading in as a block.

export function ScrollWordReveal({
  children,
  className,
}: {
  children: string
  className?: string
}) {
  const ref = useRef<HTMLParagraphElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    // Starts when the paragraph's top reaches 85% down the viewport and
    // finishes once it has risen to the middle — the text is fully lit well
    // before it leaves the screen, so nobody reads a half-dim sentence.
    offset: ['start 0.85', 'start 0.35'],
  })

  const words = children.split(' ')

  return (
    <p ref={ref} className={className}>
      {words.map((word, i) => (
        <Word key={`${word}-${i}`} progress={scrollYProgress} range={[i / words.length, (i + 1) / words.length]}>
          {word}
        </Word>
      ))}
    </p>
  )
}

function Word({
  children,
  progress,
  range,
}: {
  children: string
  progress: MotionValue<number>
  range: [number, number]
}) {
  // 0.15 measured as a real contrast failure against the dark page (a
  // design-review tool caught it, and it's correct: a visitor who never
  // scrolls past this point, or any static capture of the page, sees
  // unread words as effectively invisible rather than just dim). 0.55
  // keeps the same lit/unlit contrast the reveal is built around while
  // staying legible on its own.
  const opacity = useTransform(progress, range, [0.55, 1])
  return (
    <>
      {/* The trailing space is outside the animated span so the browser can
          still break lines normally. */}
      <motion.span style={{ opacity }}>{children}</motion.span>{' '}
    </>
  )
}

// Scroll-linked scale/fade for a block — the Neutomni-style "rise into place"
// used for the hero product frame. Reduced motion is handled by motion itself
// for transitions, but scroll-linked values bypass that, so this checks the
// query and returns a static style when the user has asked for less motion.
export function ScrollRise({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start 0.95', 'start 0.55'],
  })

  const scale = useTransform(scrollYProgress, [0, 1], [0.96, 1])
  const opacity = useTransform(scrollYProgress, [0, 1], [0.4, 1])

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{ scale, opacity }}
      // Snap to the final state when the OS asks for reduced motion.
      initial={false}
    >
      {children}
    </motion.div>
  )
}
