import Link from 'next/link'
import { HeroCanvas } from './HeroCanvas'
import { ProductDemo } from './ProductDemo'
import { AppFrame, DashboardMock } from './AppMock'
import { ScrollWordReveal } from './ScrollReveal'
import { SmoothScroll } from './SmoothScroll'
import { OnboardingFlow } from './OnboardingFlow'
import { Reveal, RevealOnMount } from './Reveal'
import { OrgLogo } from '@/components/branding/OrgLogo'
import { BRAND_NAME } from '@/lib/branding'
import { AgentTerminal } from './AgentSection'
import { FeatureGrid } from './FeatureGrid'
import { BridgeSection } from './BridgeSection'
import { StickyCta } from './StickyCta'
import { Stamp, GlyphS, GlyphGraph, GlyphShield, GlyphSync } from './Stamp'

// Public marketing page, shown at "/" only when there's no session (see
// app/page.tsx). Screenshots are real product captures from a seeded
// workspace, not illustrations.
export function LandingPage() {
  return (
    <div className="min-h-screen bg-[#07080c] text-white antialiased">
      <SmoothScroll />
      <StickyCta />
      <Nav />
      <Hero />

      <Section>
        <Reveal>
          <SectionHead
            eyebrow="Product tour"
            title="Everything an agent needs a surface for."
            body="Every screen here is the real product. Each one is also an API your agent can call."
          />
        </Reveal>
        <Reveal delay={0.1} className="mt-12">
          <ProductDemo />
        </Reveal>
      </Section>

      <Bridge />
      <AgentSection />
      <EverythingElse />

      <Manifesto />
      <HowItWorks />
      <Privacy />
      <FinalCta />
      <Footer />
    </div>
  )
}

function Section({ children, id }: { children: React.ReactNode; id?: string }) {
  return (
    <section id={id} className="border-t border-white/[0.07] py-24">
      {children}
    </section>
  )
}

function SectionHead({ eyebrow, title, body }: { eyebrow: string; title: string; body?: string }) {
  return (
    <div className="mx-auto max-w-6xl px-6">
      <span className="font-mono text-xs uppercase tracking-[0.18em] text-[#5b8cff]">{eyebrow}</span>
      <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h2>
      {body && <p className="mt-4 max-w-xl leading-relaxed text-white/55">{body}</p>}
    </div>
  )
}

function Nav() {
  return (
    <nav className="sticky top-0 z-30 border-b border-white/[0.07] bg-[#07080c]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <span className="flex items-center gap-2.5 font-semibold tracking-tight">
          <OrgLogo org={{ name: BRAND_NAME }} size={24} />
          {BRAND_NAME}
        </span>
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="rounded-full px-4 py-2 text-sm text-white/65 transition-colors hover:text-white"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="rounded-full bg-white px-4 py-2 text-sm font-medium text-[#07080c] transition-transform hover:scale-[1.03] active:scale-[0.98]"
          >
            Start free
          </Link>
        </div>
      </div>
    </nav>
  )
}

function Hero() {
  return (
    <header className="relative isolate overflow-hidden">
      <HeroCanvas />
      {/* Static gradient under the canvas so the hero still reads as designed
          when WebGL is unavailable or reduced-motion is on. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[radial-gradient(90%_70%_at_50%_0%,#16224d_0%,#0a0c14_55%,#07080c_100%)]"
      />
      <div className="relative mx-auto max-w-6xl px-6 pb-20 pt-20 sm:pt-24">
        <RevealOnMount>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.06] px-3.5 py-1.5 text-xs text-white/75 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-[#5b8cff]" />
            Built for the agents you are already using
          </span>
        </RevealOnMount>

        <RevealOnMount delay={0.08}>
          <h1 className="mt-7 max-w-4xl text-5xl font-semibold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
            The step between
            <br />
            a spreadsheet and a CRM.
          </h1>
        </RevealOnMount>

        <RevealOnMount delay={0.16}>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/60">
            You are not ready for Salesforce and you have outgrown the sheet. {BRAND_NAME} is the stage in between:
            structure you can adopt in an afternoon, built so your AI agents can run it with you from day one.
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
              className="rounded-full border border-white/15 px-6 py-3 text-sm font-medium text-white/85 transition-colors hover:bg-white/[0.06] hover:text-white"
            >
              See how it works
            </Link>
          </div>
          <p className="mt-4 text-xs text-white/40">
            No credit card. No migration project. Export everything the day you leave.
          </p>
        </RevealOnMount>

        <RevealOnMount delay={0.3}>
          <div className="mt-12 flex items-center gap-3">
            <Stamp tone="red" filled size={52} label={BRAND_NAME}>
              {GlyphS}
            </Stamp>
            <Stamp tone="navy" size={52} label="Agent ready">
              {GlyphGraph}
            </Stamp>
            <Stamp tone="navy" size={52} label="Your documents stay yours">
              {GlyphShield}
            </Stamp>
            <Stamp tone="red" size={52} label="Export anytime">
              {GlyphSync}
            </Stamp>
            <p className="ml-2 max-w-[15rem] font-mono text-[11px] leading-relaxed text-white/35">
              Agent ready. Documents stay on your machine. Export the day you leave.
            </p>
          </div>
        </RevealOnMount>

        <RevealOnMount delay={0.38}>
          <div className="mt-12">
            <AppFrame active="Dashboard">
              <DashboardMock />
            </AppFrame>
          </div>
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
          title="We are not replacing your CRM. We are getting you ready for one."
          body="Most teams are stuck between a sheet that has stopped scaling and a platform that costs more than the problem. This is the stage in between."
        />
      </Reveal>
      <div className="mt-12">
        <BridgeSection />
      </div>
    </Section>
  )
}

// The agent story. Placed immediately after the product tour: the visitor has
// just seen the surfaces, so "and your AI can drive all of it" lands with
// something concrete to attach to.
function AgentSection() {
  return (
    <Section id="agents">
      <Reveal>
        <SectionHead
          eyebrow="Agent native"
          title="Your agent is a first-class user."
          body="Most CRMs bolted AI on after the fact, so an agent has to click through a UI built for humans. We shipped the tools first. Claude, ChatGPT or your own agent reads and writes your pipeline through a real protocol, scoped to a key you issue and revoke."
        />
      </Reveal>
      <div className="mx-auto mt-12 grid max-w-6xl gap-10 px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
        <Reveal>
          <AgentTerminal />
        </Reveal>
        <Reveal delay={0.1}>
          <ul className="space-y-6">
            {[
              ['Six tools, not a scraper', 'Search, read, create, log activity, move stage, summarise pipeline. A real API, not an agent clicking through your UI.'],
              ['Scoped to one org', 'Every call is filtered to the key’s organisation. An agent key cannot see another tenant’s leads.'],
              ['Revocable in a click', 'Issue a key from Settings, hand it to an agent, revoke it the moment you want it gone.'],
            ].map(([k, v]) => (
              <li key={k}>
                <h3 className="text-sm font-semibold text-white">{k}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-white/55">{v}</p>
              </li>
            ))}
          </ul>
        </Reveal>
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
          body="Not modules to buy separately. All of it, in the free tier, each one reachable by an agent."
        />
      </Reveal>
      <div className="mt-12">
        <FeatureGrid />
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
          body="Four steps, and the longest one is pasting an email."
        />
      </Reveal>
      <div className="mt-14">
        <OnboardingFlow />
      </div>
    </Section>
  )
}

// The local-AI claim is a privacy story, not just a cost story — the original
// page only sold the cost half.
function Privacy() {
  const points = [
    { k: 'On-device extraction', v: 'The model that reads your pasted text runs in your browser. That text is never sent to an AI provider.' },
    { k: 'No per-seat AI fee', v: 'No LLM subscription, no token metering, no usage tier that quietly caps your team.' },
    { k: 'Google sign-in only', v: 'No password for us to store, leak, or make you rotate every ninety days.' },
  ]
  return (
    <Section>
      <Reveal>
        <SectionHead
          eyebrow="Why it's free"
          title="Free because of where the model runs."
          body="Not a trial, not a seat count. The extraction model executes on your machine, so it costs us nothing to give away."
        />
      </Reveal>
      <div className="mx-auto mt-12 max-w-6xl px-6">
        <div className="grid gap-px overflow-hidden rounded-xl border border-white/[0.09] bg-white/[0.07] sm:grid-cols-3">
          {points.map((p, i) => (
            <Reveal key={p.k} delay={i * 0.08} className="bg-[#07080c]">
              <div className="h-full p-6">
                <h3 className="text-sm font-semibold text-white">{p.k}</h3>
                <p className="mt-2.5 text-sm leading-relaxed text-white/55">{p.v}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </Section>
  )
}

function FinalCta() {
  return (
    <section className="relative isolate overflow-hidden border-t border-white/[0.07] py-28 text-center">
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[radial-gradient(70%_120%_at_50%_100%,#16224d_0%,#07080c_70%)]"
      />
      <Reveal>
        <div className="mx-auto max-w-2xl px-6">
          <h2 className="text-4xl font-semibold tracking-tight sm:text-5xl">Stop managing leads. Start running them.</h2>
          <p className="mt-4 text-white/55">Free to start. Google sign-in gets your whole team in under a minute.</p>
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
    <footer className="border-t border-white/[0.07] py-8">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 text-xs text-white/40">
        <span className="flex items-center gap-2 font-medium text-white/70">
          <OrgLogo org={{ name: BRAND_NAME }} size={20} />
          {BRAND_NAME}
        </span>
        <span>© 2026 {BRAND_NAME}</span>
      </div>
    </footer>
  )
}
