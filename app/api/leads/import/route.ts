import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { SOURCES, LEAD_TYPES, BUSINESS_TYPES, isValidWebsite, type LeadSource, type LeadType, type BusinessType } from '@/lib/types'
import { requireApiUser } from '@/lib/session'
import { readJsonBody } from '@/lib/http'

export const dynamic = 'force-dynamic'

interface ImportRow {
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

export async function POST(req: Request) {
  const user = await requireApiUser()
  if (user instanceof NextResponse) return user
  const body = await readJsonBody(req)
  if (body instanceof NextResponse) return body
  const rows: unknown[] = Array.isArray(body?.rows) ? body.rows : []

  if (rows.length === 0) {
    return NextResponse.json({ error: 'rows must be a non-empty array' }, { status: 400 })
  }
  if (rows.length > 2000) {
    return NextResponse.json({ error: 'Max 2000 rows per import' }, { status: 400 })
  }

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
    // A stray string/number/null entry (malformed client payload) would
    // otherwise throw when we read `row.company` etc. below — skip it
    // like any other invalid row instead.
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

  // Dedupe against existing leads (case-insensitive email/company match) and
  // within the batch itself — the import route has no other guard against
  // the same company/email entering the pipeline twice.
  const emails = [...new Set(toCreate.filter((r) => r.email).map((r) => r.email.toLowerCase()))]
  const companies = [...new Set(toCreate.map((r) => r.company.toLowerCase()))]
  const existing = await prisma.lead.findMany({
    where: {
      OR: [
        ...(emails.length ? [{ email: { in: emails, mode: 'insensitive' as const } }] : []),
        { company: { in: companies, mode: 'insensitive' as const } },
      ],
    },
    select: { email: true, company: true },
  })
  const existingEmails = new Set(existing.filter((e) => e.email).map((e) => e.email.toLowerCase()))
  const existingCompanies = new Set(existing.map((e) => e.company.toLowerCase()))
  const seenEmails = new Set<string>()
  const seenCompanies = new Set<string>()

  const finalRows = toCreate.filter((r) => {
    const email = r.email.toLowerCase()
    const company = r.company.toLowerCase()
    if ((email && existingEmails.has(email)) || existingCompanies.has(company)) {
      skipped.push({ row: r.row, reason: `Duplicate of an existing lead: ${r.company}` })
      return false
    }
    if ((email && seenEmails.has(email)) || seenCompanies.has(company)) {
      skipped.push({ row: r.row, reason: `Duplicate within this file: ${r.company}` })
      return false
    }
    if (email) seenEmails.add(email)
    seenCompanies.add(company)
    return true
  })

  if (finalRows.length > 0) {
    await prisma.lead.createMany({
      data: finalRows.map(({ row: _row, ...r }) => ({ ...r, stage: 'new', ownerId: user.id, ownerName: user.name })),
    })
  }

  skipped.sort((a, b) => a.row - b.row)
  return NextResponse.json({ created: finalRows.length, skipped })
}
