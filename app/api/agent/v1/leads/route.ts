import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAgentOrg } from '@/lib/agentAuth'
import { readJsonBody } from '@/lib/http'
import { validateLeadFields } from '@/lib/types'
import { getStageDefinitions } from '@/lib/pipelineConfig'
import { findOrCreateCompany, findOrCreatePerson, findPossibleDuplicatePerson } from '@/lib/company'
import { writeBackLeadToSheet } from '@/lib/googleSheetWriteback'

export const dynamic = 'force-dynamic'

function serializeLead(lead: {
  id: string
  stage: string
  source: string
  estimatedVolume: number
  email: string
  phone: string | null
  notes: string
  ownerName: string
  company: { name: string } | null
  person: { name: string } | null
}) {
  return {
    id: lead.id,
    company: lead.company?.name ?? null,
    poc: lead.person?.name ?? null,
    email: lead.email,
    phone: lead.phone,
    stage: lead.stage,
    source: lead.source,
    estimatedVolume: lead.estimatedVolume,
    notes: lead.notes,
    owner: lead.ownerName,
  }
}

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 200

// Agent-facing read: org-wide (an agent key isn't any one rep, so there's no
// per-owner restriction the way a human rep's own session has) — optional
// ?q= matches company name, contact name, or email; optional ?stage=.
//
// Cursor-paginated: without this an agent simply cannot see lead 51, which
// silently caps what it knows about the org. The cursor is a lead id and
// paging is keyset-style (`cursor` + `skip: 1`) rather than offset-based, so
// inserting a lead mid-scan doesn't shift the window and duplicate rows.
export async function GET(req: Request) {
  const agentOrg = await requireAgentOrg(req)
  if (agentOrg instanceof NextResponse) return agentOrg

  const url = new URL(req.url)
  const q = url.searchParams.get('q')?.trim()
  const stage = url.searchParams.get('stage')?.trim()
  const cursor = url.searchParams.get('cursor')?.trim() || undefined

  const rawLimit = Number(url.searchParams.get('limit'))
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(Math.floor(rawLimit), MAX_LIMIT) : DEFAULT_LIMIT

  const leads = await prisma.lead.findMany({
    where: {
      orgId: agentOrg.orgId,
      ...(stage ? { stage } : {}),
      ...(q
        ? {
            OR: [
              { email: { contains: q, mode: 'insensitive' } },
              { company: { name: { contains: q, mode: 'insensitive' } } },
              { person: { name: { contains: q, mode: 'insensitive' } } },
            ],
          }
        : {}),
    },
    include: { company: true, person: true },
    // createdAt alone isn't unique, so two leads created in the same tick
    // could straddle a page boundary; id breaks the tie deterministically.
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    // Fetch one extra to know whether another page exists without a count().
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  })

  const hasMore = leads.length > limit
  const page = hasMore ? leads.slice(0, limit) : leads

  return NextResponse.json({
    leads: page.map(serializeLead),
    nextCursor: hasMore ? page[page.length - 1].id : null,
  })
}

// Agent-facing create — same find-or-create company/person path and
// duplicate checks as the human-facing POST /api/leads, so an agent can
// never create a messier record than a person could through the UI.
// Requires ownerEmail (a real, active user in this org) since Lead.ownerId
// is a required field with no "unassigned" sentinel to fall back to — an
// agent isn't a user, so it must say who this lead belongs to.
export async function POST(req: Request) {
  const agentOrg = await requireAgentOrg(req)
  if (agentOrg instanceof NextResponse) return agentOrg

  const body = await readJsonBody(req)
  if (body instanceof NextResponse) return body
  if ((!body.company && !body.companyId) || !body.email) {
    return NextResponse.json({ error: 'company and email are required' }, { status: 400 })
  }
  if (!body.ownerEmail) {
    return NextResponse.json({ error: 'ownerEmail is required — which rep should this lead belong to?' }, { status: 400 })
  }
  const owner = await prisma.user.findFirst({
    where: { orgId: agentOrg.orgId, email: { equals: String(body.ownerEmail), mode: 'insensitive' }, isActive: true },
    select: { id: true, name: true },
  })
  if (!owner) return NextResponse.json({ error: `ownerEmail "${body.ownerEmail}" does not match an active user in this org` }, { status: 400 })

  const stageDefs = await getStageDefinitions(agentOrg.orgId)
  const validationError = validateLeadFields(body, { validStageKeys: stageDefs.map((s) => s.key) })
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 })

  const company = body.companyId
    ? await prisma.company.findFirst({ where: { id: body.companyId, orgId: agentOrg.orgId } })
    : await findOrCreateCompany(agentOrg.orgId, body.company)
  if (!company) return NextResponse.json({ error: 'companyId does not match an existing company in your org' }, { status: 400 })

  if (body.force !== true) {
    const emailDuplicate = await prisma.lead.findFirst({
      where: { orgId: agentOrg.orgId, email: { equals: body.email, mode: 'insensitive' } },
      select: { id: true, email: true, company: { select: { name: true } } },
    })
    if (emailDuplicate) {
      return NextResponse.json(
        { error: `Possible duplicate: "${emailDuplicate.company.name}" (${emailDuplicate.email}) already exists`, duplicate: emailDuplicate },
        { status: 409 },
      )
    }
    const duplicatePerson = await findPossibleDuplicatePerson(agentOrg.orgId, company.id, body.poc, body.email)
    if (duplicatePerson) {
      return NextResponse.json(
        { error: `Possible duplicate: "${duplicatePerson.name}" at "${company.name}" already exists`, duplicate: { id: duplicatePerson.id, companyName: company.name, email: duplicatePerson.email } },
        { status: 409 },
      )
    }
  }

  const person = body.poc?.trim() ? await findOrCreatePerson(agentOrg.orgId, company.id, body.poc) : null

  const lead = await prisma.lead.create({
    data: {
      orgId: agentOrg.orgId,
      companyId: company.id,
      personId: person?.id ?? null,
      email: body.email,
      phone: body.phone ?? null,
      source: body.source ?? 'other',
      stage: body.stage ?? 'new',
      estimatedVolume: Number(body.estimatedVolume ?? 0),
      ownerId: owner.id,
      ownerName: owner.name,
      type: body.type ?? 'merchant',
      notes: body.notes ?? '',
    },
    include: { company: true, person: true },
  })

  await writeBackLeadToSheet(agentOrg.orgId, {
    company: company.name,
    contactName: person?.name ?? null,
    email: lead.email,
    phone: lead.phone,
    website: null,
    industry: null,
    businessType: null,
    source: lead.source,
    type: lead.type,
    estimatedVolume: lead.estimatedVolume,
    notes: lead.notes,
  })

  return NextResponse.json({ lead: serializeLead(lead) }, { status: 201 })
}
