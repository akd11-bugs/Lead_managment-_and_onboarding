import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { SOURCES, LEAD_TYPES, BUSINESS_TYPES, type LeadSource, type LeadType, type BusinessType } from '@/lib/types'
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
      poc: poc || null,
      company,
      email,
      phone: row.phone ? String(row.phone).trim() : null,
      website: row.website ? String(row.website).trim() : null,
      industry: row.industry ? String(row.industry).trim() : null,
      businessType: normalizeBusinessType(row.businessType),
      source: normalizeSource(row.source),
      type: normalizeType(row.type),
      estimatedVolume: Number(row.estimatedVolume) || 0,
      notes: row.notes ? String(row.notes).trim() : '',
    })
  })

  if (toCreate.length > 0) {
    await prisma.lead.createMany({
      data: toCreate.map((r) => ({ ...r, stage: 'new', ownerId: user.id, ownerName: user.name })),
    })
  }

  return NextResponse.json({ created: toCreate.length, skipped })
}
