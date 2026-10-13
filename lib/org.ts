import { prisma } from '@/lib/db'
import type { Organization } from '@prisma/client'
import { findOrCreateCompany, findOrCreatePerson } from '@/lib/company'

// Creates a brand-new, fully isolated company org — used by self-serve
// signup (a founding admin creating their own company) and the
// create-admin bootstrap script. There is no "default" or "root" org
// concept: every org is its own flat tenant from the start.
export async function createOrganization(name: string): Promise<Organization> {
  return prisma.organization.create({ data: { name } })
}

const SAMPLE_LEADS = [
  {
    company: 'Northwind Traders',
    person: 'Priya Shah',
    email: 'priya@example.com',
    stage: 'new',
    source: 'referral',
    estimatedVolume: 25000,
    notes: 'Sample lead — this is what a fresh inbound lead looks like. Delete me once you add real ones.',
  },
  {
    company: 'Lumen Retail Co',
    person: 'Marcus Webb',
    email: 'marcus@example.com',
    stage: 'pending',
    source: 'website',
    estimatedVolume: 48000,
    notes: 'Sample lead — sitting in Pending, waiting on a reply.',
  },
  {
    company: 'Solstice Apparel',
    person: 'Dana Kim',
    email: 'dana@example.com',
    stage: 'proposal',
    source: 'linkedin',
    estimatedVolume: 90000,
    notes: 'Sample lead — proposal sent, tracking toward close.',
  },
] as const

// Seeds a handful of clearly-labeled example leads for every brand-new org,
// so the dashboard is never a wall of zeros on day one. Called explicitly
// from the self-serve org-creation routes (not from createOrganization
// itself) — the create-admin bootstrap script and tests create orgs too,
// and shouldn't get fake data mixed into a real deployment or a mock.
export async function seedSampleLeads(orgId: string): Promise<void> {
  for (const sample of SAMPLE_LEADS) {
    const company = await findOrCreateCompany(orgId, sample.company)
    const person = await findOrCreatePerson(orgId, company.id, sample.person, { email: sample.email })
    await prisma.lead.create({
      data: {
        orgId,
        companyId: company.id,
        personId: person.id,
        email: sample.email,
        source: sample.source,
        stage: sample.stage,
        estimatedVolume: sample.estimatedVolume,
        notes: sample.notes,
      },
    })
  }
}

// Domains that can't meaningfully identify "a company" — two strangers who
// both happen to use Gmail are not colleagues. A personal-email domain
// always means "create your own org," never a join-request match, however
// many other bluSwap users happen to share that same free provider.
const PERSONAL_EMAIL_DOMAINS = new Set([
  'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com',
  'aol.com', 'protonmail.com', 'live.com', 'msn.com',
])

export function isPersonalEmailDomain(domain: string): boolean {
  return PERSONAL_EMAIL_DOMAINS.has(domain.toLowerCase())
}

// Finds an existing org to offer joining, based purely on email domain —
// reuses data that already exists (no new Organization.domain column).
// Returns null for a personal-email domain or when nobody at that domain
// has an account yet, in which case the caller should offer to create a
// brand-new org instead.
export async function findOrgByEmailDomain(email: string): Promise<Organization | null> {
  const domain = email.split('@')[1]?.toLowerCase()
  if (!domain || isPersonalEmailDomain(domain)) return null

  const match = await prisma.user.findFirst({
    where: { email: { endsWith: `@${domain}` }, isActive: true },
    select: { orgId: true },
  })
  if (!match) return null
  return prisma.organization.findUnique({ where: { id: match.orgId } })
}

// Every org that exists — used by the two platform-level routes that
// operate across all companies rather than one caller's own org (the daily
// activity report cron, which sends each org its own report, and the
// external reports API, a static-API-key-authenticated aggregate view).
export async function getAllOrgIds(): Promise<string[]> {
  const orgs = await prisma.organization.findMany({ select: { id: true } })
  return orgs.map((o) => o.id)
}
