import Link from 'next/link'
import KineticGrid from './KineticGrid'
import { ScrollWordReveal } from './ScrollReveal'
import { SmoothScroll } from './SmoothScroll'
import { OnboardingFlow } from './OnboardingFlow'
import { Reveal, RevealOnMount } from './Reveal'
import { OrgLogo } from '@/components/branding/OrgLogo'
import { BRAND_NAME } from '@/lib/branding'
import { AgentTerminal } from './AgentSection'
import { FeatureCarousel } from './FeatureCarousel'
import { BridgeSection } from './BridgeSection'
import { StickyCta } from './StickyCta'
import { HorizontalTour } from './HorizontalTour'
import { BentoGrid, BentoCell } from './Bento'
import { GoogleLogo } from './GoogleLogo'
import HalftoneWordmarkFooter from '@/components/ui/halftone-wordmark-footer'

// Public marketing page, shown at "/" only when there's no session (see
// app/page.tsx). Screenshots are real product captures from a seeded
// workspace, not illustrations.
//
// KineticGrid is the page's persistent background (fixed full-viewport
// canvas, our own ground color passed through via backgroundColor so it
// matches the rest of the page rather than the component's own default).
// Scoped deliberately: every section below keeps its own opaque background
// unchanged, so the grid is visible in the gaps between sections (padding,
// empty margins) rather than requiring every card/section on the page to
// go transparent — a much larger, riskier change than what was asked for.
export function LandingPage() {
  return (
    <KineticGrid backgroundColor="#07080c" className="marketing-square text-white antialiased">
      <SmoothScroll />
      <StickyCta />
      <Nav />
      <Hero />

      <Section id="tour">
        <HorizontalTour />
      </Section>

      <Bridge />
      <AgentSection />
      <EverythingElse />

      <Manifesto />
      <HowItWorks />
      <Privacy />
      <Footer />
    </KineticGrid>
  )
}

// No hairline border between sections (house-style no-hairline rule) —
// the padding alone is the section break. Was py-32/py-40 (128px/160px
// each side — 256-320px of pure gap between any two adjacent sections,
// stacked across 7 sections down the page) — cut roughly in half so
// there's still a clear break between sections without that much dead
// space accumulating down the whole page.
function Section({ children, id }: { children: React.ReactNode; id?: string }) {
  return (
    <section id={id} className="py-16 sm:py-20">
      {children}
    </section>
  )
}

// No eyebrow label above the heading (house-style no-eyebrow rule) — each
// call site below folds what the eyebrow used to say into the heading or
// supporting sentence instead of a separate small-caps tag.
function SectionHead({ title, body }: { title: string; body?: string }) {
  return (
    <div className="mx-auto max-w-7xl px-6">
      <h2 className="max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h2>
      {body && <p className="mt-6 max-w-xl leading-relaxed text-white/55">{body}</p>}
    </div>
  )
}

// Minimal header: logo left, auth actions right, no nav links — the page
// below is a plain scroll with no in-page anchors to jump to anymore (the
// rail/carousel sections auto-advance or scroll into view on their own),
// so a link row here was just chrome with nothing to point at.
function Nav() {
  return (
    <nav className="sticky top-0 z-40 bg-[#07080c]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
        <span className="flex items-center gap-2.5 font-semibold tracking-tight">
          <OrgLogo org={{ name: BRAND_NAME }} size={24} vendorFallback />
          {BRAND_NAME}
        </span>

        <div className="flex items-center">
          {/* Hidden below sm — at 390px the wordmark + both buttons don't fit in
              one row without the wordmark clipping behind them. "Start free"
              alone is the one action that matters on a narrow screen; sign-in
              is one tap away from there anyway. */}
          <Link
            href="/login"
            className="hidden rounded-full bg-[#161616] px-4 py-2 text-sm text-white/70 transition-colors hover:bg-[#1e1e1e] hover:text-white sm:inline-block"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            aria-label="Start free"
            className="ml-2 flex items-center overflow-hidden rounded-full border border-white/10 bg-white transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <span className="px-4 py-2 text-sm font-medium text-[#07080c]">Start free</span>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center bg-[#5b8cff] text-[#07080c]">
              <span className="inline-block -rotate-45 text-base leading-none">→</span>
            </span>
          </Link>
        </div>
      </div>
    </nav>
  )
}

// Single centered column, Better Stack-inspired copy/CTA structure but
// without a product-preview visual — a 3D-tilted dashboard screenshot was
// tried here and looked bad (flat single-axis rotation, no real depth; the
// crop also cut off before the actual chart), so it was removed rather than
// patched. Theme-aware (light/dark both real here) even though the rest of
// the marketing page below it is still dark-only — marketing-page-wide
// theming is a separate, larger pass; this section alone uses the
// --background/--foreground/--border tokens so it doesn't look broken the
// one time a visitor actually flips the toggle.
function Hero() {
  return (
    // text-white, not text-foreground: this whole page is a committed dark
    // world (every other section below uses literal white/[opacity] and
    // hex colors, never the semantic --foreground token that flips with
    // the signed-in app's light/dark toggle). Hero used to be the one
    // section left on --foreground, so a visitor who'd ever switched the
    // app to light mode got this hero rendered near-black-on-black —
    // match the rest of the page's convention instead of reacting to a
    // toggle this page was never designed to support.
    <header className="relative isolate overflow-hidden text-white">
      {/* pb-16 sm:pb-20 matches Section's own py-16 sm:py-20 rhythm — Hero
          isn't wrapped in Section (it needs its own top spacing, tighter
          than the rest since it's the page's very first thing), but its
          bottom gap into the next section (the pipeline tour) must still
          match the uniform rhythm every other section-to-section gap uses. */}
      <div className="relative mx-auto max-w-7xl px-6 pb-16 pt-20 sm:pb-20 sm:pt-24">
        {/* The eyebrow pill above the headline and the inline pill around
            "step" are both gone — the no-eyebrow/no-pill house rule. Cut to
            4 words (the house style's own research note: studied gallery
            heroes median 5 words / 32 characters) so it genuinely holds to
            two lines at every tested width (1440/768/390) — the previous
            6-word version still wrapped to 3 lines at 1440px because
            "Between a spreadsheet" alone overflowed the line at this size.
            "Built for the agents you are already using" folds into the
            supporting sentence below instead of its own label. */}
        <RevealOnMount delay={0.08}>
          <h1 className="max-w-2xl text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
            Spreadsheet to CRM.
          </h1>
        </RevealOnMount>

        <RevealOnMount delay={0.16}>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/60">
            Outgrown the sheet. Not ready for Salesforce. Built for the agents you&apos;re already using.
          </p>
        </RevealOnMount>

        <RevealOnMount delay={0.24}>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              href="/signup"
              className="group inline-flex items-center gap-2.5 rounded-full bg-white px-6 py-3 text-sm font-medium text-[#07080c] transition-transform hover:scale-[1.03] active:scale-[0.98]"
            >
              <GoogleLogo className="h-4 w-4" />
              Start free
              <span className="ml-0.5 inline-block transition-transform group-hover:translate-x-0.5">→</span>
            </Link>
            <Link
              href="#how-it-works"
              className="rounded-full border border-white/10 px-6 py-3 text-sm font-medium text-white/85 transition-colors hover:bg-white/[0.06] hover:text-white"
            >
              See how it works
            </Link>
          </div>
          <p className="mt-4 text-xs text-white/40">
            No credit card. Export everything the day you leave.
          </p>
        </RevealOnMount>
      </div>
    </header>
  )
}

// The positioning. Placed before the agent section so the visitor knows what
// we claim to be before they are shown how it works.
function Bridge() {
  return (
    <Section id="bridge">
      <Reveal>
        <SectionHead
          title="We are not replacing your CRM."
          body="Where this sits: we are getting you ready for one."
        />
      </Reveal>
      <div className="mt-16">
        <BridgeSection />
      </div>
    </Section>
  )
}

// The agent story. Placed immediately after the product tour: the visitor has
// just seen the surfaces, so "and your AI can drive all of it" lands with
// something concrete to attach to.
function AgentSection() {
  const points = [
    ['Six tools, not a scraper', 'Search, read, create, log activity, move stage, summarise pipeline. A real API, not an agent clicking through your UI.'],
    ['Scoped to one org', 'Every call is filtered to the key’s organisation. An agent key cannot see another tenant’s leads.'],
    ['Revocable in a click', 'Issue a key from Settings, hand it to an agent, revoke it the moment you want it gone.'],
  ]
  return (
    <Section id="agents">
      <Reveal>
        <SectionHead
          title="Your agent is a first-class user."
          body="Agent-native: it reads and writes your pipeline over a real protocol."
        />
      </Reveal>
      <div className="mx-auto mt-16 max-w-7xl px-6">
        <BentoGrid>
          <BentoCell span={4} className="p-0">
            <Reveal className="h-full">
              <AgentTerminal />
            </Reveal>
          </BentoCell>
          <div className="grid grid-cols-1 md:col-span-2">
            {points.map(([k, v], i) => (
              <BentoCell key={k} span={6} className="p-6 first:mt-0">
                <Reveal delay={0.08 + i * 0.06}>
                  <h3 className="text-sm font-semibold text-white">{k}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-white/55">{v}</p>
                </Reveal>
              </BentoCell>
            ))}
          </div>
        </BentoGrid>
      </div>
    </Section>
  )
}

function EverythingElse() {
  return (
    <Section>
      <Reveal>
        <SectionHead
          title="Everything else is already here."
          body="All of it, free."
        />
      </Reveal>
      <div className="mt-16">
        <FeatureCarousel />
      </div>
    </Section>
  )
}

// Scroll-lit statement block. The words brighten as you scroll through them,
// which paces the reading rather than dumping a paragraph on screen.
function Manifesto() {
  return (
    <Section>
      <div className="mx-auto max-w-4xl px-6">
        <ScrollWordReveal className="text-2xl font-medium leading-[1.45] tracking-tight sm:text-3xl sm:leading-[1.4]">
          The honest version: every CRM pitch starts by telling you the spreadsheet was the problem. It was not. The spreadsheet got you here. What it cannot do is remember who promised what, or hand a machine a clean place to write. So we built the smallest thing that can: real stages, real owners, a real trail, and an agent that can read and write all of it. Use it until a bigger system earns your money, then take your data and go.
        </ScrollWordReveal>
      </div>
    </Section>
  )
}

function HowItWorks() {
  return (
    <Section id="how-it-works">
      <Reveal>
        <SectionHead
          title="From signup to a running pipeline."
          body="How it works: the longest step is pasting an email."
        />
      </Reveal>
      <div className="mt-16">
        <OnboardingFlow />
      </div>
    </Section>
  )
}

// The local-AI claim is a privacy story, not just a cost story — the original
// page only sold the cost half.
//
// A narrative list, not icon-topped cards — identical icon+label+caption
// cells in a row is exactly the "icon-topped feature card" tell a
// design-taste review flags. Each point gets its own heading and sentence,
// stacked, no card boundary and no icon.
function Privacy() {
  const points = [
    { k: 'On-device extraction', v: 'Your pasted text never leaves the browser.' },
    { k: 'No per-seat AI fee', v: 'No subscription, no token metering.' },
    { k: 'Google sign-in only', v: 'No password for us to store or leak.' },
  ]
  return (
    <Section>
      <Reveal>
        <SectionHead
          title="Free because of where the model runs."
          body="Why it's free: the model runs on your machine, so it costs us nothing."
        />
      </Reveal>
      <div className="mx-auto mt-16 max-w-7xl px-6">
        {/* A flat tone-step fill per item (same surface language Bento.tsx
            cells use elsewhere on the page), not an outlined box — gives
            the three points real visual weight as one grouped unit
            instead of reading as three disconnected floating captions. */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {points.map((p, i) => (
            <Reveal key={p.k} delay={i * 0.08} className="h-full">
              <div className="h-full bg-white/[0.03] p-6">
                <h3 className="text-base font-semibold text-white">{p.k}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/55">{p.v}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </Section>
  )
}

// The closing CTA — previously its own section with a blue (#0e1430)
// background block; that background is gone and the heading + button now
// sit directly on the page's own ground, right above the footer, as a
// lead-in to it rather than a separate colored block. Plain text/button on
// the page background, no section of its own — the footer's wordmark
// The closing CTA — previously its own section with a blue (#0e1430)
// background block, then a separate section before/after the footer. Now
// rendered via HalftoneWordmarkFooter's own ctaSlot prop, landing in the
// gap it already has between the link/back-to-top row and the wordmark
// art below — inside the same black footer box, between those rows and
// the animation, as asked. The animation's own canvas/rendering code is
// completely untouched; ctaSlot only adds a plain content slot drawn over
// it, the same way .hwf-top/.hwf-rule already are.
function FooterCtaContent() {
  return (
    <Reveal>
      <div className="mx-auto max-w-2xl px-6 pb-6 pt-2 text-center sm:pb-8">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Stop managing. Start running.</h2>
        <Link
          href="/signup"
          className="group mt-5 inline-flex items-center gap-2.5 rounded-full bg-white px-6 py-3 text-sm font-medium text-[#07080c] transition-transform hover:scale-[1.03] active:scale-[0.98]"
        >
          <GoogleLogo className="h-4 w-4" />
          Start free
          <span className="ml-0.5 inline-block transition-transform group-hover:translate-x-0.5">→</span>
        </Link>
      </div>
    </Reveal>
  )
}

function Footer() {
  return (
    <HalftoneWordmarkFooter
      wordmark={BRAND_NAME.toLowerCase()}
      label={BRAND_NAME}
      meta="© 2026 · The step between a spreadsheet and a CRM"
      palette={{ background: '#07080c', ink: '#ededec', warm: '#5b8cff' }}
      ctaSlot={<FooterCtaContent />}
      // Shorter than the previous 620px, and crop raised from the
      // component's own 0.2 default to 0.35 so more of the wordmark's
      // height is cropped below the fold — reads as a visibly smaller,
      // more contained footer overall, not just less empty space above it.
      height="520px"
      crop={0.35}
      // Override the component's own mono-labels default — the rest of the
      // page no longer uses mono as its typeface (house-style no-mono
      // rule), so the footer's tiny uppercase link labels would otherwise
      // be the one remaining mono element on the page.
      monoFamily='"Inter Tight", "Inter Variable", "Inter", "Helvetica Neue", Arial, system-ui, sans-serif'
      columns={[
        {
          title: 'Product',
          links: [
            { label: 'Where this sits', href: '#bridge' },
            { label: 'Agent API', href: '#agents' },
            { label: 'How it works', href: '#how-it-works' },
          ],
        },
        {
          title: 'Account',
          links: [
            { label: 'Sign in', href: '/login' },
            { label: 'Start free', href: '/signup' },
          ],
        },
        {
          title: 'Company',
          links: [{ label: BRAND_NAME }],
        },
      ]}
    />
  )
}
