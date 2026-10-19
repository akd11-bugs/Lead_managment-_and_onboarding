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
import { ShieldCheck, Wallet, KeyRound } from 'lucide-react'
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
      <FinalCta />
      <Footer />
    </KineticGrid>
  )
}

function Section({ children, id }: { children: React.ReactNode; id?: string }) {
  return (
    <section id={id} className="border-t border-white/[0.07] py-32 sm:py-40">
      {children}
    </section>
  )
}

function SectionHead({ eyebrow, title, body }: { eyebrow: string; title: string; body?: string }) {
  return (
    <div className="mx-auto max-w-7xl px-6">
      <span className="font-mono text-xs uppercase tracking-[0.18em] text-[#5b8cff]">{eyebrow}</span>
      <h2 className="mt-5 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h2>
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
          <Link
            href="/login"
            className="rounded-full bg-[#161616] px-4 py-2 text-sm text-white/70 transition-colors hover:bg-[#1e1e1e] hover:text-white"
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
      {/* pb-32 sm:pb-40 matches Section's own py-32 sm:py-40 rhythm — Hero
          isn't wrapped in Section (it needs its own top spacing, tighter
          than the rest since it's the page's very first thing), but its
          bottom gap into the next section (the pipeline tour) must still
          match the uniform rhythm every other section-to-section gap uses. */}
      <div className="relative mx-auto max-w-7xl px-6 pb-32 pt-20 sm:pb-40 sm:pt-24">
        <RevealOnMount>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3.5 py-1.5 text-xs text-white/75 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-[#5b8cff]" />
            Built for the agents you are already using
          </span>
        </RevealOnMount>

        <RevealOnMount delay={0.08}>
          <h1 className="mt-7 max-w-4xl text-5xl font-semibold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
            The{' '}
            <span className="inline-flex items-center gap-2 rounded-full bg-[#5b8cff]/15 px-4 py-1 align-middle text-[#5b8cff] dark:text-[#8fb0ff]">
              <span className="h-2.5 w-2.5 rounded-full bg-[#5b8cff]" />
              step
            </span>{' '}
            between
            <br />
            a spreadsheet and a CRM.
          </h1>
        </RevealOnMount>

        <RevealOnMount delay={0.16}>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/60">
            Outgrown the sheet. Not ready for Salesforce. Start here.
          </p>
        </RevealOnMount>

        <RevealOnMount delay={0.24}>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              href="/signup"
              className="group rounded-full bg-white px-6 py-3 text-sm font-medium text-[#07080c] transition-transform hover:scale-[1.03] active:scale-[0.98]"
            >
              Start free with Google
              <span className="ml-1.5 inline-block transition-transform group-hover:translate-x-0.5">→</span>
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
          eyebrow="Where this sits"
          title="We are not replacing your CRM."
          body="We are getting you ready for one."
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
          eyebrow="Agent native"
          title="Your agent is a first-class user."
          body="Your agent reads and writes your pipeline over a real protocol."
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
          eyebrow="Everything else"
          title="The rest of it is already here."
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
        <span className="font-mono text-xs uppercase tracking-[0.18em] text-[#5b8cff]">The honest version</span>
        <ScrollWordReveal className="mt-6 text-2xl font-medium leading-[1.45] tracking-tight sm:text-3xl sm:leading-[1.4]">
          Every CRM pitch starts by telling you the spreadsheet was the problem. It was not. The spreadsheet got you here. What it cannot do is remember who promised what, or hand a machine a clean place to write. So we built the smallest thing that can: real stages, real owners, a real trail, and an agent that can read and write all of it. Use it until a bigger system earns your money, then take your data and go.
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
          eyebrow="How it works"
          title="From signup to a running pipeline."
          body="The longest step is pasting an email."
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
function Privacy() {
  const points = [
    { Icon: ShieldCheck, k: 'On-device extraction', v: 'Your pasted text never leaves the browser.', span: 2 as const },
    { Icon: Wallet, k: 'No per-seat AI fee', v: 'No subscription, no token metering.', span: 2 as const },
    { Icon: KeyRound, k: 'Google sign-in only', v: 'No password for us to store or leak.', span: 2 as const },
  ]
  return (
    <Section>
      <Reveal>
        <SectionHead
          eyebrow="Why it's free"
          title="Free because of where the model runs."
          body="The model runs on your machine, so it costs us nothing."
        />
      </Reveal>
      <div className="mx-auto mt-16 max-w-7xl px-6">
        <BentoGrid>
          {points.map((p, i) => (
            <BentoCell key={p.k} span={p.span}>
              <Reveal delay={i * 0.08}>
                <p.Icon className="h-5 w-5 text-[#5b8cff]" strokeWidth={1.75} aria-hidden="true" />
                <h3 className="mt-4 text-sm font-semibold text-white">{p.k}</h3>
                <p className="mt-2.5 text-sm leading-relaxed text-white/55">{p.v}</p>
              </Reveal>
            </BentoCell>
          ))}
        </BentoGrid>
      </div>
    </Section>
  )
}

function FinalCta() {
  return (
    <section className="relative isolate overflow-hidden border-t border-white/[0.07] py-32 sm:py-40 text-center">
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[radial-gradient(70%_120%_at_50%_100%,#16224d_0%,#07080c_70%)]"
      />
      <Reveal>
        <div className="mx-auto max-w-2xl px-6">
          <h2 className="text-4xl font-semibold tracking-tight sm:text-5xl">Stop managing leads. Start running them.</h2>
          <p className="mt-4 text-white/55">Free to start.</p>
          <Link
            href="/signup"
            className="group mt-9 inline-block rounded-full bg-white px-7 py-3.5 text-sm font-medium text-[#07080c] transition-transform hover:scale-[1.03] active:scale-[0.98]"
          >
            Start free with Google
            <span className="ml-1.5 inline-block transition-transform group-hover:translate-x-0.5">→</span>
          </Link>
        </div>
      </Reveal>
    </section>
  )
}

function Footer() {
  return (
    <HalftoneWordmarkFooter
      wordmark={BRAND_NAME.toLowerCase()}
      label={BRAND_NAME}
      meta="© 2026 · The step between a spreadsheet and a CRM"
      palette={{ background: '#07080c', ink: '#ededec', warm: '#5b8cff' }}
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
