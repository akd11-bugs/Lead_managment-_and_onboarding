import { prisma } from '@/lib/db'
import { SOURCES, LEAD_TYPES, BUSINESS_TYPES, isValidWebsite, type LeadSource, type LeadType, type BusinessType } from '@/lib/types'
import { normalizeCompanyName, findOrCreateCompany, findOrCreatePerson } from '@/lib/company'

export interface ImportRow {
  poc?: string
  company?: string
  email?: string
  phone?: string
  website?: string
  industry?: string
  businessType?: string
  source?: string
  type?: string
  estimatedVolume?: string | number
  notes?: string
}

export interface ImportOwner {
  id: string
  name: string
}

export interface ImportResult {
  created: number
  skipped: { row: number; reason: string }[]
}

function normalizeSource(value: string | undefined): LeadSource {
  const v = (value ?? '').trim().toLowerCase().replace(/\s+/g, '_')
  return (SOURCES as string[]).includes(v) ? (v as LeadSource) : 'other'
}

function normalizeType(value: string | undefined): LeadType {
  const v = (value ?? '').trim().toLowerCase()
  return (LEAD_TYPES as string[]).includes(v) ? (v as LeadType) : 'merchant'
}

function normalizeBusinessType(value: string | undefined): BusinessType | null {
  const v = (value ?? '').trim().toLowerCase()
  return (BUSINESS_TYPES as string[]).includes(v) ? (v as BusinessType) : null
}

// Shared by the CSV import route and the Google Sheets sync cron route — both
// end up with the same shape of loosely-typed rows and need identical
// validation/dedupe/create behavior so they can never quietly drift apart.
export async function importLeadRows(rows: unknown[], owner: ImportOwner, orgId: string): Promise<ImportResult> {
  const skipped: { row: number; reason: string }[] = []
  const toCreate: {
    row: number
    poc: string | null
    company: string
    email: string
    phone: string | null
    website: string | null
    industry: string | null
    businessType: BusinessType | null
    source: LeadSource
    type: LeadType
    estimatedVolume: number
    notes: string
  }[] = []

  rows.forEach((rawRow, i) => {
    // A stray string/number/null entry (malformed payload) would otherwise
    // throw when we read `row.company` etc. below — skip it like any other
    // invalid row instead.
    if (typeof rawRow !== 'object' || rawRow === null) {
      skipped.push({ row: i + 1, reason: 'Row is not a valid object' })
      return
    }
    const row = rawRow as ImportRow
    const poc = String(row.poc ?? '').trim()
    const company = String(row.company ?? '').trim()
    const email = String(row.email ?? '').trim()
    if (!company) {
      skipped.push({ row: i + 1, reason: 'Missing required company' })
      return
    }
    // Email is optional at import time — can be filled in later on the lead.
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      skipped.push({ row: i + 1, reason: `Invalid email: ${email}` })
      return
    }
    toCreate.push({
      row: i + 1,
      poc: poc || null,
      company,
      email,
      phone: row.phone ? String(row.phone).trim() : null,
      // A mismapped column (e.g. a page title instead of a URL) shouldn't
      // fail the whole row — just drop it, same as a missing email.
      website: row.website && isValidWebsite(String(row.website)) ? String(row.website).trim() : null,
      industry: row.industry ? String(row.industry).trim() : null,
      businessType: normalizeBusinessType(row.businessType),
      source: normalizeSource(row.source),
      type: normalizeType(row.type),
      estimatedVolume: Number(row.estimatedVolume) || 0,
      notes: row.notes ? String(row.notes).trim() : '',
    })
  })

  // Resolve each distinct company name in the batch to a real Company row
  // once (shared across however many rows reference it), not per-row.
  const companyNames = [...new Set(toCreate.map((r) => r.company))]
  const companiesByNormalizedName = new Map<string, { id: string; name: string }>()
  for (const name of companyNames) {
    const company = await findOrCreateCompany(orgId, name)
    companiesByNormalizedName.set(normalizeCompanyName(name), company)
  }

  const resolvedRows = toCreate.map((r) => ({ ...r, companyId: companiesByNormalizedName.get(normalizeCompanyName(r.company))!.id }))

  // Dedupe: same company is normal (many leads can share one company) — a
  // duplicate is an email match, or the same Person (by name) already
  // existing at that same company, either in the DB or earlier in this file.
  const emails = [...new Set(resolvedRows.filter((r) => r.email).map((r) => r.email.toLowerCase()))]
  const companyIds = [...new Set(resolvedRows.map((r) => r.companyId))]

  const existingLeads = emails.length
    ? await prisma.lead.findMany({ where: { orgId, email: { in: emails, mode: 'insensitive' } }, select: { email: true } })
    : []
  const existingEmails = new Set(existingLeads.map((e) => e.email.toLowerCase()))

  const existingPeople = await prisma.person.findMany({ where: { orgId, companyId: { in: companyIds } }, select: { companyId: true, name: true } })
  const existingPersonKeys = new Set(existingPeople.map((p) => `${p.companyId}::${p.name.toLowerCase()}`))

  const seenEmails = new Set<string>()
  const seenPersonKeys = new Set<string>()

  const finalRows = resolvedRows.filter((r) => {
    const email = r.email.toLowerCase()
    const personKey = r.poc ? `${r.companyId}::${r.poc.toLowerCase()}` : null

    if (email && existingEmails.has(email)) {
      skipped.push({ row: r.row, reason: `Duplicate of an existing lead: ${r.email}` })
      return false
    }
    if (personKey && existingPersonKeys.has(personKey)) {
      skipped.push({ row: r.row, reason: `Duplicate of an existing contact: ${r.poc} at ${r.company}` })
      return false
    }
    if (email && seenEmails.has(email)) {
      skipped.push({ row: r.row, reason: `Duplicate within this file: ${r.email}` })
      return false
    }
    if (personKey && seenPersonKeys.has(personKey)) {
      skipped.push({ row: r.row, reason: `Duplicate within this file: ${r.poc} at ${r.company}` })
      return false
    }
    if (email) seenEmails.add(email)
    if (personKey) seenPersonKeys.add(personKey)
    return true
  })

  if (finalRows.length > 0) {
    // One row at a time (not createMany) — each new Person must be
    // find-or-created, which createMany can't do inline.
    for (const r of finalRows) {
      const { row: _row, company: _companyName, poc, companyId, ...rest } = r
      const person = poc ? await findOrCreatePerson(orgId, companyId, poc) : null
      await prisma.lead.create({
        data: {
          ...rest,
          orgId,
          stage: 'new',
          ownerId: owner.id,
          ownerName: owner.name,
          companyId,
          personId: person?.id ?? null,
        },
      })
    }
  }

  skipped.sort((a, b) => a.row - b.row)
  return { created: finalRows.length, skipped }
}
