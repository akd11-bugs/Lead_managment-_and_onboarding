// The 30 B2B lead-generation skills. Source of truth for the in-app catalog.
// Two skills (pipeline-hygiene-audit, spam-folder-check) have Python helpers —
// runnerType: 'script'. The rest run via Claude (runnerType: 'llm').

export type SkillCategory = 'inbound' | 'paid' | 'outbound' | 'sales' | 'diagnostic'
export type SkillScope = 'portfolio' | 'lead' | 'email' | 'sequence' | 'account'
export type SkillRunnerType = 'script' | 'llm'
export type SkillOutputType = 'table' | 'list' | 'narrative' | 'checklist' | 'funnel'

export interface SkillEntry {
  id: string
  name: string
  description: string
  category: SkillCategory
  scope: SkillScope
  runnerType: SkillRunnerType
  outputType: SkillOutputType
  icon: string // lucide icon name
  /** Auto-suggest this skill when the condition holds. All conditions evaluated client-side. */
  alertWhen?: {
    metric:
      | 'staleLeadsCount'        // number of leads with no activity past N days
      | 'lostLeadsCount'         // leads in 'lost' stage
      | 'qualifiedLeadsNoActivity' // qualified/proposal leads with no recent activity
      | 'followUpNeeded'         // leads in contacted/follow_up with no recent activity
      | 'always'                 // always show on dashboard
    daysWindow?: number
  }
}

export const SKILLS: SkillEntry[] = [
  // ============ INBOUND & PAID (1–20) ============
  {
    id: 'icp-reality-check',
    name: 'ICP Reality Check',
    description:
      'Compares your stated ICP against actual closed-won and closed-lost customers. Use when ICP and reality no longer match.',
    category: 'inbound',
    scope: 'portfolio',
    runnerType: 'llm',
    outputType: 'table',
    icon: 'Crosshair',
  },
  {
    id: 'lead-magnet-offer-fit',
    name: 'Lead Magnet Offer Fit',
    description: 'Checks if your free asset matches the buyer stage and real pain.',
    category: 'inbound',
    scope: 'portfolio',
    runnerType: 'llm',
    outputType: 'checklist',
    icon: 'Magnet',
  },
  {
    id: 'ad-to-landing-promise-match',
    name: 'Ad → Landing Promise Match',
    description: 'Verifies that ads, landing page and CTA promise the same thing.',
    category: 'paid',
    scope: 'portfolio',
    runnerType: 'llm',
    outputType: 'table',
    icon: 'Link2',
  },
  {
    id: 'b2b-audience-signal-audit',
    name: 'B2B Audience Signal Audit',
    description: 'Reviews targeting signals: job titles, industries, intent, exclusions.',
    category: 'paid',
    scope: 'portfolio',
    runnerType: 'llm',
    outputType: 'list',
    icon: 'Radar',
  },
  {
    id: 'landing-page-qualification-review',
    name: 'Landing Page Qualification',
    description: 'Diagnoses whether the page attracts the right leads or just more leads.',
    category: 'inbound',
    scope: 'portfolio',
    runnerType: 'llm',
    outputType: 'checklist',
    icon: 'LayoutTemplate',
  },
  {
    id: 'form-friction-finder',
    name: 'Form Friction Finder',
    description: 'Finds fields, steps and UX patterns that kill form completion.',
    category: 'inbound',
    scope: 'portfolio',
    runnerType: 'llm',
    outputType: 'list',
    icon: 'FormInput',
  },
  {
    id: 'lead-scoring-sanity-check',
    name: 'Lead Scoring Sanity Check',
    description: 'Tests scoring rules against real CRM outcomes and sales feedback.',
    category: 'inbound',
    scope: 'portfolio',
    runnerType: 'llm',
    outputType: 'table',
    icon: 'Calculator',
  },
  {
    id: 'crm-lead-source-quality-audit',
    name: 'CRM Lead Source Quality Audit',
    description: 'Ranks lead sources by downstream stage, value and close rate.',
    category: 'diagnostic',
    scope: 'portfolio',
    runnerType: 'llm',
    outputType: 'table',
    icon: 'ChartBar',
    alertWhen: { metric: 'always' },
  },
  {
    id: 'sales-follow-up-speed-audit',
    name: 'Sales Follow-up Speed Audit',
    description: 'Measures response time impact on qualification and conversion.',
    category: 'sales',
    scope: 'portfolio',
    runnerType: 'llm',
    outputType: 'table',
    icon: 'Zap',
    alertWhen: { metric: 'followUpNeeded', daysWindow: 14 },
  },
  {
    id: 'disqualification-reason-miner',
    name: 'Disqualification Reason Miner',
    description: 'Extracts why sales rejects leads and maps it back to targeting or creative.',
    category: 'diagnostic',
    scope: 'portfolio',
    runnerType: 'llm',
    outputType: 'table',
    icon: 'FilterX',
    alertWhen: { metric: 'lostLeadsCount', daysWindow: 90 },
  },
  {
    id: 'lead-to-opportunity-drop-off-review',
    name: 'Lead → Opportunity Drop-off',
    description: 'Finds where qualified leads stall before becoming pipeline.',
    category: 'diagnostic',
    scope: 'portfolio',
    runnerType: 'llm',
    outputType: 'funnel',
    icon: 'TrendingDown',
  },
  {
    id: 'linkedin-ads-lead-quality-audit',
    name: 'LinkedIn Ads Lead Quality',
    description: 'Diagnoses LinkedIn campaign quality using CRM feedback and cost per qualified lead.',
    category: 'paid',
    scope: 'portfolio',
    runnerType: 'llm',
    outputType: 'table',
    icon: 'Linkedin',
  },
  {
    id: 'google-ads-lead-quality-audit',
    name: 'Google Ads Lead Quality',
    description: 'Separates search intent quality from keyword bloat and match-type leaks.',
    category: 'paid',
    scope: 'portfolio',
    runnerType: 'llm',
    outputType: 'table',
    icon: 'Search',
  },
  {
    id: 'meta-ads-lead-quality-audit',
    name: 'Meta Ads Lead Quality',
    description: 'Reviews Meta lead forms and ads for qualification strength and signal fit.',
    category: 'paid',
    scope: 'portfolio',
    runnerType: 'llm',
    outputType: 'table',
    icon: 'Facebook',
  },
  {
    id: 'email-nurture-sequence-review',
    name: 'Email Nurture Sequence Review',
    description: 'Checks follow-up emails for relevance, timing and call-to-action clarity.',
    category: 'inbound',
    scope: 'sequence',
    runnerType: 'llm',
    outputType: 'checklist',
    icon: 'Mail',
  },
  {
    id: 'sdr-handoff-brief-generator',
    name: 'SDR Handoff Brief Generator',
    description:
      'Produces context for sales: source, intent signals, likely objections, next question.',
    category: 'sales',
    scope: 'lead',
    runnerType: 'llm',
    outputType: 'narrative',
    icon: 'Handshake',
  },
  {
    id: 'proposal-win-loss-review',
    name: 'Proposal Win / Loss Review',
    description: 'Learns from won and lost deals to fix upstream targeting and messaging.',
    category: 'sales',
    scope: 'portfolio',
    runnerType: 'llm',
    outputType: 'table',
    icon: 'Trophy',
  },
  {
    id: 'competitor-lead-angle-review',
    name: 'Competitor Lead Angle Review',
    description: 'Reverse-engineers competitor angles you are losing to.',
    category: 'diagnostic',
    scope: 'portfolio',
    runnerType: 'llm',
    outputType: 'narrative',
    icon: 'Swords',
  },
  {
    id: 'weekly-b2b-lead-gen-readout',
    name: 'Weekly B2B Lead Gen Readout',
    description: 'Summarizes facts, hypotheses, next actions and approvals for the week.',
    category: 'diagnostic',
    scope: 'portfolio',
    runnerType: 'llm',
    outputType: 'narrative',
    icon: 'Calendar',
    alertWhen: { metric: 'always' },
  },
  {
    id: 'scale-readiness-check-lead-gen',
    name: 'Scale Readiness Check',
    description: 'Decides if you should add budget or fix qualification and follow-up first.',
    category: 'diagnostic',
    scope: 'portfolio',
    runnerType: 'llm',
    outputType: 'checklist',
    icon: 'Rocket',
  },

  // ============ OUTBOUND & SALES (21–30) ============
  {
    id: 'spam-folder-check',
    name: 'Spam Folder Check',
    description:
      'Checks whether your cold emails are reaching inboxes at all (SPF, DKIM, DMARC). Runs locally — instant.',
    category: 'outbound',
    scope: 'email',
    runnerType: 'script',
    outputType: 'table',
    icon: 'ShieldCheck',
  },
  {
    id: 'what-to-say-to-this-company',
    name: 'What to Say to This Company',
    description: 'Turns one target account into one specific opening angle — or says honestly that there is none.',
    category: 'outbound',
    scope: 'account',
    runnerType: 'llm',
    outputType: 'narrative',
    icon: 'MessageSquare',
  },
  {
    id: 'meeting-prep-five-minutes',
    name: 'Meeting Prep in 5 Minutes',
    description: 'One page before a call: who they are, what to ask, what would disqualify them.',
    category: 'sales',
    scope: 'lead',
    runnerType: 'llm',
    outputType: 'checklist',
    icon: 'Clock',
  },
  {
    id: 'ghosted-after-the-demo',
    name: 'Ghosted After the Demo',
    description:
      'Works out why a good call went silent, and writes the message that might restart it.',
    category: 'sales',
    scope: 'lead',
    runnerType: 'llm',
    outputType: 'narrative',
    icon: 'Ghost',
    alertWhen: { metric: 'qualifiedLeadsNoActivity', daysWindow: 21 },
  },
  {
    id: 'write-the-follow-up',
    name: 'Write the Follow-Up',
    description: 'The next email, built around new information rather than checking in.',
    category: 'outbound',
    scope: 'lead',
    runnerType: 'llm',
    outputType: 'narrative',
    icon: 'Reply',
  },
  {
    id: 'objection-cheat-sheet',
    name: 'Objection Cheat Sheet',
    description: 'One page of objections and answers, built from your own lost deals.',
    category: 'sales',
    scope: 'portfolio',
    runnerType: 'llm',
    outputType: 'table',
    icon: 'ShieldAlert',
  },
  {
    id: 'won-deal-to-case-study',
    name: 'Won Deal → Case Study',
    description: 'Turns a closed-won deal into a draft case study plus the permission email.',
    category: 'sales',
    scope: 'lead',
    runnerType: 'llm',
    outputType: 'narrative',
    icon: 'Award',
  },
  {
    id: 'cold-outbound-sequence-review',
    name: 'Cold Outbound Sequence Review',
    description: 'Says which of list, opener, ask or cadence is killing the sequence.',
    category: 'outbound',
    scope: 'sequence',
    runnerType: 'llm',
    outputType: 'checklist',
    icon: 'ListOrdered',
  },
  {
    id: 'discovery-call-gap-analysis',
    name: 'Discovery Call Gap Analysis',
    description: 'Reads a transcript and finds the question that was never asked.',
    category: 'sales',
    scope: 'lead',
    runnerType: 'llm',
    outputType: 'list',
    icon: 'Mic',
  },
  {
    id: 'pipeline-hygiene-audit',
    name: 'Pipeline Hygiene Audit',
    description:
      'Separates defensible pipeline from decoration before the forecast conversation. Runs locally — instant.',
    category: 'diagnostic',
    scope: 'portfolio',
    runnerType: 'script',
    outputType: 'table',
    icon: 'ClipboardCheck',
    alertWhen: { metric: 'staleLeadsCount', daysWindow: 45 },
  },
]

export const SKILL_CATEGORIES: { id: SkillCategory; label: string; description: string }[] = [
  {
    id: 'inbound',
    label: 'Inbound',
    description: 'Landing pages, lead magnets, forms, scoring, source quality.',
  },
  {
    id: 'paid',
    label: 'Paid Media',
    description: 'LinkedIn, Google, Meta ads quality audits.',
  },
  {
    id: 'outbound',
    label: 'Outbound',
    description: 'Cold email deliverability, sequences, account angles.',
  },
  {
    id: 'sales',
    label: 'Sales',
    description: 'Discovery, follow-up, meetings, ghosted deals, case studies.',
  },
  {
    id: 'diagnostic',
    label: 'Diagnostic',
    description: 'Pipeline hygiene, disqualification, weekly readouts, scale readiness.',
  },
]

export function getSkill(id: string): SkillEntry | undefined {
  return SKILLS.find((s) => s.id === id)
}