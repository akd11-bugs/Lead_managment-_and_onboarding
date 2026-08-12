// Services are the product surface — a real workflow with skills embedded,
// not a flat catalog of 30 skills. Email (components/services/EmailServicePanel)
// is the original and keeps its own dedicated page since it has a send action
// no other service needs; these six follow the same idea without one.

export interface ServiceDef {
  slug: string
  name: string
  description: string
  leadSkillIds: string[]
  portfolioSkillIds: string[]
}

export const SERVICES: ServiceDef[] = [
  {
    slug: 'lead-capture',
    name: 'Lead Capture',
    description: 'Audit the top of the funnel — landing pages, forms, and ICP fit — before leads even reach a rep.',
    leadSkillIds: [],
    portfolioSkillIds: [
      'icp-reality-check',
      'lead-magnet-offer-fit',
      'landing-page-qualification-review',
      'form-friction-finder',
      'lead-scoring-sanity-check',
    ],
  },
  {
    slug: 'paid-ads',
    name: 'Paid Ads',
    description: 'Check ad-to-landing consistency and lead quality across LinkedIn, Google, and Meta campaigns.',
    leadSkillIds: [],
    portfolioSkillIds: [
      'ad-to-landing-promise-match',
      'b2b-audience-signal-audit',
      'linkedin-ads-lead-quality-audit',
      'google-ads-lead-quality-audit',
      'meta-ads-lead-quality-audit',
    ],
  },
  {
    slug: 'outbound',
    name: 'Outbound / Cold Outreach',
    description: 'Plan what to say to a specific company, and review the cold sequence it slots into.',
    leadSkillIds: ['what-to-say-to-this-company'],
    portfolioSkillIds: ['cold-outbound-sequence-review'],
  },
  {
    slug: 'calls',
    name: 'Calls & Meetings',
    description: 'Prep for a call, debrief after one, and hand off context between reps.',
    leadSkillIds: [
      'meeting-prep-five-minutes',
      'discovery-call-gap-analysis',
      'sdr-handoff-brief-generator',
      'ghosted-after-the-demo',
    ],
    portfolioSkillIds: ['objection-cheat-sheet'],
  },
  {
    slug: 'deals',
    name: 'Deals & Proposals',
    description: 'Learn from how deals actually close, and turn a win into reusable proof.',
    leadSkillIds: ['won-deal-to-case-study'],
    portfolioSkillIds: ['proposal-win-loss-review'],
  },
  {
    slug: 'reports',
    name: 'Pipeline Reports',
    description: 'Portfolio-wide health checks — where leads are leaking, what needs attention this week.',
    leadSkillIds: [],
    portfolioSkillIds: [
      'crm-lead-source-quality-audit',
      'sales-follow-up-speed-audit',
      'disqualification-reason-miner',
      'lead-to-opportunity-drop-off-review',
      'competitor-lead-angle-review',
      'weekly-b2b-lead-gen-readout',
      'scale-readiness-check-lead-gen',
      'pipeline-hygiene-audit',
    ],
  },
]

export function getService(slug: string): ServiceDef | undefined {
  return SERVICES.find((s) => s.slug === slug)
}
