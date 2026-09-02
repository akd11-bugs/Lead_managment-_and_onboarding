// Shared types for LRM_blu
// Mirrors Prisma models but stays UI-friendly (Date objects, enums).

// New → Pending (whoever's turn it is to act) → Onboarding (won) or Not
// Interested (lost, reason required). Replaces a longer Contacted/Follow Up/
// Qualified/Proposal/Lost pipeline that didn't match how leads actually move
// — most of a lead's life is spent waiting on someone, and only two outcomes
// matter in the end.
export type Stage = 'new' | 'pending' | 'onboarding' | 'not_interested'

export type LeadSource = 'website' | 'referral' | 'linkedin' | 'cold_outreach' | 'event' | 'other'

// 'onboarding_step' and 'stage_change' are written server-side only (never
// user-selectable in the manual activity form):
// - 'onboarding_step' — app/api/leads/[id]/route.ts, on every
//   onboardingSubStage change. Its description always ends with
//   `(<subStageValue>)`, e.g. "(final_onboarded)" — the Reports page's
//   "Onboarded" metric filters on that exact suffix, so keep both in sync if
//   this format ever changes.
// - 'stage_change' — lib/leadStage.ts, on every stage or pendingSubStatus
//   change. Its description is exactly the remark the user typed (the "what
//   happened on this call" note), and doubles as the required reason when
//   the new stage is 'not_interested'.
export type ActivityType = 'call' | 'email' | 'meeting' | 'note' | 'onboarding_step' | 'stage_change'

export type QualityLevel = 'low' | 'medium' | 'high'

export type LeadType = 'partner' | 'merchant'

export type BusinessType = 'b2b' | 'b2c'

// Only meaningful when stage === 'pending'. Freely switchable in either
// direction (not a sequential checklist) — it just records whose turn it is
// to act next.
export type PendingSubStatus = 'pending_ours' | 'pending_merchant' | 'pending_psp'

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
  wonAt: Date | string | null
  onboardedAt: Date | string | null
  expectedCloseDate: Date | string | null
  pendingSubStatus: PendingSubStatus | null
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
export const STAGES: Stage[] = ['new', 'pending', 'onboarding', 'not_interested']

export const STAGE_LABELS: Record<Stage, string> = {
  new: 'New',
  pending: 'Pending',
  onboarding: 'Onboarding',
  not_interested: 'Not Interested',
}

export const STAGE_DESCRIPTIONS: Record<Stage, string> = {
  new: 'Just captured, not yet contacted',
  pending: 'Being worked — waiting on us, the merchant, or the PSP',
  onboarding: 'Closed-won — document & PSP verification in progress',
  not_interested: 'Closed-lost, with a stated reason',
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

// Only meaningful when stage === 'pending'. Not sequential — any value can
// switch to any other.
export const PENDING_SUB_STATUSES: PendingSubStatus[] = ['pending_ours', 'pending_merchant', 'pending_psp']

export const PENDING_SUB_STATUS_LABELS: Record<PendingSubStatus, string> = {
  pending_ours: 'Pending — our side',
  pending_merchant: 'Pending — merchant side',
  pending_psp: 'Pending — PSP side',
}

// A "board column" is the actual unit Kanban, the Leads filter, and every
// stage-picking dropdown work in — it's `Stage` with 'pending' expanded into
// its three sub-statuses (which is why a PendingSubStatus value is also a
// valid BoardColumnKey; the string sets don't overlap with the other
// stages). This is a pure UI/selection concept — the database only ever
// stores `stage` + `pendingSubStatus` separately.
export type BoardColumnKey = 'new' | PendingSubStatus | 'onboarding' | 'not_interested'

export const BOARD_COLUMNS: BoardColumnKey[] = [
  'new',
  'pending_ours',
  'pending_merchant',
  'pending_psp',
  'onboarding',
  'not_interested',
]

export const BOARD_COLUMN_LABELS: Record<BoardColumnKey, string> = {
  new: 'New',
  pending_ours: 'Pending — Our Side',
  pending_merchant: 'Pending — Merchant',
  pending_psp: 'Pending — PSP',
  onboarding: 'Onboarding',
  not_interested: 'Not Interested',
}

export const BOARD_COLUMN_DESCRIPTIONS: Record<BoardColumnKey, string> = {
  new: 'Just captured, not yet contacted',
  pending_ours: 'Our turn to follow up',
  pending_merchant: 'Waiting on the merchant to act',
  pending_psp: 'Waiting on the PSP to act',
  onboarding: 'Closed-won — document & PSP verification in progress',
  not_interested: 'Closed-lost, with a stated reason',
}

// Where a lead currently sits, expanded to sub-column granularity.
export function boardColumnFor(lead: { stage: string; pendingSubStatus?: string | null }): BoardColumnKey {
  if (lead.stage === 'pending') {
    return (lead.pendingSubStatus as BoardColumnKey) || 'pending_ours'
  }
  return lead.stage as BoardColumnKey
}

// Reverse mapping — what to PATCH to move a lead into this column. Always
// includes `stage` (harmless if unchanged) so a single call can move a lead
// from any column to any other, including New straight into a specific
// pending sub-status, in one request.
export function boardColumnToInput(column: BoardColumnKey): { stage: Stage; pendingSubStatus?: PendingSubStatus } {
  if ((PENDING_SUB_STATUSES as string[]).includes(column)) {
    return { stage: 'pending', pendingSubStatus: column as PendingSubStatus }
  }
  return { stage: column as Stage }
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

// Permissive domain/URL shape check — rejects whitespace-containing strings
// (e.g. a page title mistakenly landing in this field) while accepting bare
// domains and full URLs.
const WEBSITE_PATTERN = /^(https?:\/\/)?[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)+([/?#]\S*)?$/

export function isValidWebsite(value: string): boolean {
  return WEBSITE_PATTERN.test(value.trim())
}

// Deliberately simple (no full RFC 5322 parsing) — this is a sanity check
// against garbage input, not a mailbox-existence guarantee.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim())
}

// A ceiling on free-text fields — not tuned precisely, just enough to stop
// a multi-megabyte string from ever reaching the database on a field that
// should only ever hold a name, a note, or a phone number.
const FIELD_MAX_LENGTHS: Record<string, number> = {
  company: 200,
  poc: 200,
  email: 254,
  phone: 40,
  website: 500,
  industry: 100,
  ownerName: 200,
  notes: 10000,
  painPoints: 5000,
  whatTheyWant: 5000,
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
  if (body.pendingSubStatus != null && !PENDING_SUB_STATUSES.includes(body.pendingSubStatus as PendingSubStatus)) return `Invalid pendingSubStatus: ${body.pendingSubStatus}`
  if (body.onboardingSubStage != null && !ONBOARDING_SUB_STAGES.includes(body.onboardingSubStage as OnboardingSubStage)) return `Invalid onboardingSubStage: ${body.onboardingSubStage}`
  if (body.estimatedVolume !== undefined && !Number.isFinite(Number(body.estimatedVolume))) {
    return `Invalid estimatedVolume: ${body.estimatedVolume}`
  }
  if (body.website != null && body.website !== '' && !isValidWebsite(String(body.website))) {
    return `Invalid website: ${body.website}`
  }
  if (body.email != null && body.email !== '' && !isValidEmail(String(body.email))) {
    return `Invalid email: ${body.email}`
  }
  for (const [field, max] of Object.entries(FIELD_MAX_LENGTHS)) {
    const value = body[field]
    if (typeof value === 'string' && value.length > max) {
      return `${field} is too long (max ${max} characters)`
    }
  }
  return null
}

// 1-indexed step out of ONBOARDING_SUB_STAGES.length, as a whole percentage.
export function onboardingProgressPercent(subStage: OnboardingSubStage | null): number {
  if (!subStage) return 0
  const idx = ONBOARDING_SUB_STAGES.indexOf(subStage)
  if (idx === -1) return 0
  return Math.round(((idx + 1) / ONBOARDING_SUB_STAGES.length) * 100)
}