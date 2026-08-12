// Shared types for LRM_blu
// Mirrors Prisma models but stays UI-friendly (Date objects, enums).

export type Stage = 'new' | 'contacted' | 'follow_up' | 'qualified' | 'proposal' | 'onboarding' | 'lost'

export type LeadSource = 'website' | 'referral' | 'linkedin' | 'cold_outreach' | 'event' | 'other'

export type ActivityType = 'call' | 'email' | 'meeting' | 'note'

export type QualityLevel = 'low' | 'medium' | 'high'

export type LeadType = 'partner' | 'merchant'

export type BusinessType = 'b2b' | 'b2c'

export type ProposalSubStage = 'commercial_agreed' | 'agreement_shared' | 'agreement_done'

// Won leads go straight into onboarding — there is no separate "Won" resting
// state. Operated by the sales team for now; ops-team access comes later.
export type OnboardingSubStage = 'document_submission' | 'document_verification' | 'psp_verification' | 'final_onboarded'

export interface Lead {
  id: string
  poc: string | null
  company: string
  email: string
  phone: string | null
  website: string | null
  industry: string | null
  businessType: BusinessType | null
  source: LeadSource
  stage: Stage
  estimatedVolume: number
  ownerId: string
  ownerName: string
  effort: QualityLevel
  quality: QualityLevel
  type: LeadType
  onboardedAt: Date | string | null
  expectedCloseDate: Date | string | null
  proposalSubStage: ProposalSubStage | null
  onboardingSubStage: OnboardingSubStage | null
  painPoints: string
  whatTheyWant: string
  notes: string
  position: number
  createdAt: Date | string
  updatedAt: Date | string
  lastActivityAt: Date | string | null
  activities?: Activity[]
  skillRuns?: SkillRun[]
}

export interface Activity {
  id: string
  leadId: string
  type: ActivityType
  description: string
  authorName: string
  date: Date | string
}

export type TaskSource = 'manual' | 'alert' | 'sequence'

export interface Task {
  id: string
  leadId: string | null
  leadCompany?: string | null
  title: string
  dueDate: Date | string | null
  done: boolean
  source: TaskSource
  ownerId: string | null
  createdAt: Date | string
}

export interface SkillRun {
  id: string
  skillId: string
  skillName: string
  scope: string
  runnerType: 'script' | 'llm'
  inputJson: string
  outputMarkdown: string
  outputStructured: string | null
  leadId: string | null
  createdAt: Date | string
}

// UI metadata for stages
export const STAGES: Stage[] = ['new', 'contacted', 'follow_up', 'qualified', 'proposal', 'onboarding', 'lost']

export const STAGE_LABELS: Record<Stage, string> = {
  new: 'New',
  contacted: 'Contacted',
  follow_up: 'Follow Up',
  qualified: 'Qualified',
  proposal: 'Proposal',
  onboarding: 'Onboarding',
  lost: 'Lost',
}

export const STAGE_DESCRIPTIONS: Record<Stage, string> = {
  new: 'Just captured, not yet contacted',
  contacted: 'First outreach done, awaiting reply',
  follow_up: 'Needs second touch — nurture / qualify',
  qualified: 'Budget, authority, need, timing confirmed',
  proposal: 'Quote or SOW sent',
  onboarding: 'Closed-won — document & PSP verification in progress',
  lost: 'Closed-lost',
}

export const SOURCE_LABELS: Record<LeadSource, string> = {
  website: 'Website',
  referral: 'Referral',
  linkedin: 'LinkedIn',
  cold_outreach: 'Cold Outreach',
  event: 'Event',
  other: 'Other',
}

export const SOURCES: LeadSource[] = ['website', 'referral', 'linkedin', 'cold_outreach', 'event', 'other']

export const QUALITY_LEVELS: QualityLevel[] = ['low', 'medium', 'high']

export const QUALITY_LABELS: Record<QualityLevel, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
}

// Higher number sorts first when sorting "best first"
export const QUALITY_RANK: Record<QualityLevel, number> = {
  low: 0,
  medium: 1,
  high: 2,
}

export const LEAD_TYPES: LeadType[] = ['partner', 'merchant']

export const LEAD_TYPE_LABELS: Record<LeadType, string> = {
  partner: 'Partner',
  merchant: 'Merchant',
}

export const BUSINESS_TYPES: BusinessType[] = ['b2b', 'b2c']

export const BUSINESS_TYPE_LABELS: Record<BusinessType, string> = {
  b2b: 'B2B',
  b2c: 'B2C',
}

// Only meaningful when stage === 'proposal'
export const PROPOSAL_SUB_STAGES: ProposalSubStage[] = ['commercial_agreed', 'agreement_shared', 'agreement_done']

export const PROPOSAL_SUB_STAGE_LABELS: Record<ProposalSubStage, string> = {
  commercial_agreed: 'Commercial agreed',
  agreement_shared: 'Agreement shared',
  agreement_done: 'Agreement done',
}

// Only meaningful when stage === 'onboarding'. Reaching 'final_onboarded' is
// what sets Lead.onboardedAt.
export const ONBOARDING_SUB_STAGES: OnboardingSubStage[] = [
  'document_submission',
  'document_verification',
  'psp_verification',
  'final_onboarded',
]

export const ONBOARDING_SUB_STAGE_LABELS: Record<OnboardingSubStage, string> = {
  document_submission: 'Document submission',
  document_verification: 'Document verification',
  psp_verification: 'PSP verification',
  final_onboarded: 'Final onboarded',
}

// Validates enum-like Lead fields present in a request body against the
// arrays above. Returns an error message, or null if everything present is
// valid. Fields absent from the body are left untouched (PATCH semantics).
export function validateLeadFields(body: Record<string, unknown>): string | null {
  if (body.stage !== undefined && !STAGES.includes(body.stage as Stage)) return `Invalid stage: ${body.stage}`
  if (body.source !== undefined && !SOURCES.includes(body.source as LeadSource)) return `Invalid source: ${body.source}`
  if (body.type !== undefined && !LEAD_TYPES.includes(body.type as LeadType)) return `Invalid type: ${body.type}`
  if (body.quality !== undefined && !QUALITY_LEVELS.includes(body.quality as QualityLevel)) return `Invalid quality: ${body.quality}`
  if (body.effort !== undefined && !QUALITY_LEVELS.includes(body.effort as QualityLevel)) return `Invalid effort: ${body.effort}`
  if (body.businessType != null && !BUSINESS_TYPES.includes(body.businessType as BusinessType)) return `Invalid businessType: ${body.businessType}`
  if (body.proposalSubStage != null && !PROPOSAL_SUB_STAGES.includes(body.proposalSubStage as ProposalSubStage)) return `Invalid proposalSubStage: ${body.proposalSubStage}`
  if (body.onboardingSubStage != null && !ONBOARDING_SUB_STAGES.includes(body.onboardingSubStage as OnboardingSubStage)) return `Invalid onboardingSubStage: ${body.onboardingSubStage}`
  return null
}

// 1-indexed step out of ONBOARDING_SUB_STAGES.length, as a whole percentage.
export function onboardingProgressPercent(subStage: OnboardingSubStage | null): number {
  if (!subStage) return 0
  const idx = ONBOARDING_SUB_STAGES.indexOf(subStage)
  if (idx === -1) return 0
  return Math.round(((idx + 1) / ONBOARDING_SUB_STAGES.length) * 100)
}